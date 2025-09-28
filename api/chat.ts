import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import * as path from 'path';

import { handleDaoistDailyChoice } from '../services/daoistDailyService.js';
import { handleFortuneTelling } from '../services/fortuneTellingService.js';
import { handleGame } from '../services/gameService.js';
import { handleMundaneGossip } from '../services/mundaneGossipService.js';
import { handleGeneralChat } from '../services/chatService.js';

import { Message, IntimacyLevel } from '../types/index.js';
import * as character from '../core/characterSheet.js';

// --- 配置常量 ---
const API_URL = 'https://api.bltcy.ai';
const API_KEY = process.env.BLTCY_API_KEY;

if (!API_KEY) {
  throw new Error('BLTCY_API_KEY environment variable is not configured.');
}

// --- 通用 API 调用 ---
async function streamApiCall(path: string, payload: any): Promise<Response> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
        'User-Agent': 'DMXAPI/1.0.0 (https://api.bltcy.ai)'
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    return response;
  } catch (err) {
    console.error(`[streamApiCall] 调用异常:`, err);
    throw err;
  }
}

// --- 意图识别引擎 ---
const trainingCorpusPath = path.join(process.cwd(), 'data', 'training_corpus.json');
const trainingData = JSON.parse(fs.readFileSync(trainingCorpusPath, 'utf-8'));

async function runTriage(userInput: string): Promise<{ intent: string, context?: any }> {
  const triagePrompt = `
# 指令
你是一个对话分流助手。你的任务是根据用户的输入，严格匹配以下规则中的一种，并仅输出与该情况对应的JSON对象。不得有任何额外文字、解释或代码块。

# 意图识别规则
请严格按照以下JSON数组中的规则进行判断：
\`\`\`json
${JSON.stringify(trainingData, null, 2)}
\`\`\`

# 用户输入
"${userInput}"

# 你的输出 (必须是以下JSON对象之一):
{ "intent": "匹配到的意图名称", "context": "可能存在的实体或额外信息" }
`;
  try {
    const response = await streamApiCall('/v1/chat/completions', {
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: triagePrompt }],
      stream: false,
    });
    const result = await response.json();
    const responseText = result.choices?.[0]?.message?.content?.trim();
    if (responseText) {
      const cleaned = responseText.replace(/^\s*```(?:json)?\s*([\s\S]*?)\s*```$/i, '$1').trim();
      const triageResult = JSON.parse(cleaned);
      if (triageResult && typeof triageResult === 'object' && triageResult.intent) {
        return triageResult;
      }
    }
  } catch (e) {
    console.error(`[runTriage] 意图分流失败:`, e);
  }
  return { intent: '闲聊' };
}

// --- 意图映射函数 ---
function mapClickedIntent(module: string, option: string): string | null {
    const intentMap: { [key: string]: string } = {
        'news_新鲜事': '俗世趣闻_新鲜事',
        'news_上映新片': '俗世趣闻_上映新片',
        'news_小道仙的幻想': '俗世趣闻_小道仙的幻想',
        'guidance_今日运势': '仙人指路_今日运势',
        'guidance_塔罗启示': '仙人指路_塔罗启示',
        'guidance_正缘桃花': '仙人指路_正缘桃花',
        'guidance_事业罗盘': '仙人指路_事业罗盘',
        'guidance_窥探因果': '仙人指路_窥探因果',
        'guidance_综合占卜': '仙人指路_综合占卜',
        'daily_最近看了...': '道仙日常_最近看了',
        'daily_最近买了...': '道仙日常_最近买了',
        'daily_我的记仇小本本': '道仙日常_记仇小本本',
        'daily_随便聊聊…': '道仙日常_随便聊聊',
        'game_你说我画': '游戏小摊_你说我画',
        'game_真心话大冒险': '游戏小摊_真心话大冒险',
        'game_故事接龙': '游戏小摊_故事接龙',
    };

    const key = `${module}_${option}`;
    return intentMap[key] || null;
}

// --- 主逻辑与核心路由器 ---
async function* sendMessageStream(
  userInput: string,
  imageBase64: string | null,
  history: Message[],
  intimacy: IntimacyLevel,
  userName: string,
  triageResult: { intent: string, context?: any },
  step: number
): AsyncGenerator<Partial<Message>> {
  const { intent } = triageResult;

  // ==== 图片解析分支 (最高优先级) ====
  if (imageBase64) {
    yield { text: "本道仙正为你凝视这张图片...", isLoading: true };
    const response = await streamApiCall('/v1/images/analysis', {
      model: "gemini-2.5-flash",
      image: imageBase64,
      prompt: "请用道仙的风格，分析并评论这张图片内容。",
    });
    const result = await response.json();
    const analysisText = result?.data?.[0]?.content || "图片解析失败，请稍后重试。";
    yield { text: analysisText, isLoading: false };
    return;
  }

  // ==== 意图分发 ====
  let responseText: string | null = null;
  switch (intent) {
    case '俗世趣闻_新鲜事':
    case '俗世趣闻_上映新片':
    case '俗世趣闻_小道仙的幻想':
      responseText = await handleMundaneGossip(intent);
      break;
    case '道仙日常_最近看了':
    case '道仙日常_最近买了':
    case '道仙日常_记仇小本本':
    case '道仙日常_随便聊聊':
      responseText = await handleDaoistDailyChoice(intent);
      break;
    case '游戏小摊_你说我画':
    case '游戏小摊_真心话大冒险':
    case '游戏小摊_故事接龙':
      responseText = await handleGame(intent, userInput, step);
      break;
    case '仙人指路_今日运势':
    case '仙人指路_塔罗启示':
    case '仙人指路_正缘桃花':
    case '仙人指路_事业罗盘':
    case '仙人指路_窥探因果':
    case '仙人指路_综合占卜':
      responseText = await handleFortuneTelling(intent, userInput, step);
      break;
    case '通用问题_二选一':
    case '通用问题_懒人思维':
    case '通用问题_嘲讽拒绝':
    case '通用问题_浪费时间':
      responseText = await handleGeneralChat(intent, userInput);
      break;
    default: // 情感类和闲聊
      const systemInstruction = getSystemInstruction(intimacy, userName);
      const apiMessages = convertToApiMessages(history, systemInstruction, userInput);
      const response = await streamApiCall('/v1/chat/completions', {
        model: 'gemini-2.5-flash',
        messages: apiMessages,
        stream: true,
      });
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        while (buffer.includes('\n')) {
          let idx = buffer.indexOf('\n');
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.startsWith('data: ')) {
            const dataLine = line.slice(6).trim();
            if (dataLine === '[DONE]') break;
            const data = JSON.parse(dataLine);
            const textDelta = data.choices?.[0]?.delta?.content || '';
            if (textDelta) {
              yield { text: textDelta, isLoading: true };
            }
          }
        }
      }
      break;
  }

  if (responseText) {
    yield { text: responseText, isLoading: false };
  }

  yield { isLoading: false };
}

// --- 辅助: 构造 system 指令 ---
const getSystemInstruction = (intimacy: IntimacyLevel, userName: string): string => {
  let instruction = `你是${character.persona.name}，${character.persona.description}
你的语言和行为必须严格遵守以下规则：
- 核心人设: ${character.persona.description}
- 亲密度规则: ${character.persona.intimacyRules}
- 当前用户信息:
  - 用户昵称：${userName}
  - 你们的亲密度等级：${intimacy.level} (${intimacy.name})
  - 亲密度进度：${intimacy.progress}%
`;
  return instruction;
};

// --- 修正版消息格式构造 ---
const convertToApiMessages = (
  history: Message[],
  systemInstruction: string,
  text: string
) => {
  const apiMessages: any[] = [{ role: 'system', content: systemInstruction }];
  history.forEach(msg => {
    if (msg.text) {
      const role = msg.sender === 'user' ? 'user' : 'assistant';
      apiMessages.push({ role, content: msg.text });
    }
  });
  if (text) {
    apiMessages.push({ role: 'user', content: text });
  }
  return apiMessages;
};

// Vercel/Next.js 路由处理器
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    const { text, imageBase64, history, intimacy, userName, currentStep, clickedModule, clickedOption, currentFlow } = req.body;
    
    console.log('[API] 接收到请求，模块:', clickedModule, '选项:', clickedOption, '文本:', text);

    if (!text && !imageBase64 && !clickedModule) {
        res.status(400).json({ error: 'Text, image, or module selection is required' });
        return;
    }
    
    let triageResult = { intent: '闲聊' };
    let step = currentStep || 0;

    if (clickedModule && clickedOption) {
        const mappedIntent = mapClickedIntent(clickedModule, clickedOption);
        if (mappedIntent) {
            triageResult.intent = mappedIntent;
            step = 1;
            console.log(`[API] 检测到点击事件，映射意图为: ${triageResult.intent}, 步骤: ${step}`);
        } else {
            console.warn(`[API] 意图映射失败：${clickedModule}_${clickedOption}`);
        }
    // 【核心修改】这里才是处理流程的逻辑
    // 当 currentFlow 不是 default 并且没有点击任何按钮时，说明是用户输入了文本
    } else if (currentFlow !== 'default' && !clickedModule) {
        // 我们需要找到上一个流程的意图
        const flowModule = currentFlow;
        const flowOption = '占卜'; // 或者你可以用一个更通用的词
        const mappedIntent = mapClickedIntent(flowModule, flowOption);
        if (mappedIntent) {
            triageResult.intent = mappedIntent;
            step += 1;
            console.log(`[API] 正在进行流程，意图为: ${triageResult.intent}, 步骤: ${step}`);
        } else {
            // 如果无法映射，就退回到闲聊
            console.warn(`[API] 无法从当前流程和输入中映射意图，退回到闲聊。流程: ${currentFlow}, 输入: ${text}`);
            triageResult.intent = '闲聊';
        }
    } else {
        triageResult = await runTriage(text);
        console.log(`[API] 文本分流结果:`, triageResult.intent);
    }

    res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
    });

    for await (const chunk of sendMessageStream(text, imageBase64, history, intimacy, userName, triageResult, step)) {
        res.write(JSON.stringify(chunk) + '\n');
    }
    res.end();
}
