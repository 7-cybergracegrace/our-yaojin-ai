// 文件: api/chat.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import * as path from 'path';
import { withApiHandler } from '../lib/apiHandler.js';
import { handleDaoistDailyChoice } from '../services/daoistDailyService.js';
import { handleFortuneTelling } from '../services/fortuneTellingService.js';
import { handleGame } from '../services/gameService.js';
import { handleMundaneGossip } from '../services/mundaneGossipService.js';
import { handleGeneralChat } from '../services/chatService.js'; // 新增
import { Message, IntimacyLevel, Flow } from '../types/index.js';
import * as character from '../core/characterSheet.js';

const API_URL = 'https://api.bltcy.ai';
const API_KEY = process.env.BLTCY_API_KEY;

if (!API_KEY) {
    throw new Error('BLTCY_API_KEY environment variable is not configured.');
}

// --- 通用 API 调用 ---
async function streamApiCall(
    path: string,
    payload: any
): Promise<Response> {
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

// --- 意图识别和分流 ---
// 动态读取意图识别规则库
const trainingCorpusPath = path.join(process.cwd(), 'data', 'training_corpus.json');
const trainingData = JSON.parse(fs.readFileSync(trainingCorpusPath, 'utf-8'));

async function runTriage(userInput: string, userName: string, intimacy: IntimacyLevel): Promise<{ intent: string, context?: any }> {
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

// --- 主逻辑 ---
async function* sendMessageStream(
    userInput: string,
    imageBase64: string | null,
    history: Message[],
    intimacy: IntimacyLevel,
    userName: string,
    triageResult: { intent: string, context?: any },
    currentStep?: number
): AsyncGenerator<Partial<Message>> {
    const { intent, context } = triageResult;

    // ==== 图片解析分支 (高优先级) ====
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
            responseText = await handleMundaneGossip(intent, userInput);
            break;
        case '道仙日常_最近看了':
        case '道仙日常_最近买了':
        case '道仙日常_记仇小本本':
        case '道仙日常_随便聊聊':
            responseText = handleDaoistDailyChoice(intent);
            break;
        case '游戏小摊_你说我画':
        case '游戏小摊_真心话大冒险':
        case '游戏小摊_故事接龙':
            responseText = await handleGame(intent, userInput);
            break;
        case '仙人指路_今日运势':
        case '仙人指路_塔罗启示':
        case '仙人指路_正缘桃花':
        case '仙人指路_事业罗盘':
        case '仙人指路_窥探因果':
            responseText = await handleFortuneTelling(intent, userInput, context);
            break;
        case '直接聊天_二选一':
        case '直接聊天_懒人思维':
        case '直接聊天_嘲讽拒绝':
            responseText = await handleGeneralChat(intent, userInput);
            break;
        default: // 情感类和闲聊
            const systemInstruction = getSystemInstruction(intimacy, userName, 'chat', 0);
            const apiMessages = convertToApiMessages(history, systemInstruction, userInput, null);
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
const getSystemInstruction = (intimacy: IntimacyLevel, userName: string, flow: Flow, currentStep: number): string => {
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
    text: string,
    imageBase64: string | null
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
export default withApiHandler(['POST'], async (req: VercelRequest, res: VercelResponse) => {
    const { text, imageBase64, history, intimacy, userName, currentStep } = req.body;
    if (!text && !imageBase64) {
        res.status(400).json({ error: 'Text or image is required' });
        return;
    }

    // 意图分流
    const triageResult = await runTriage(text, userName, intimacy);
    console.log(`[API] 分流结果:`, triageResult.intent);

    res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
    });

    let chunkIdx = 0;
    for await (const chunk of sendMessageStream(text, imageBase64, history, intimacy, userName, triageResult, currentStep)) {
        res.write(JSON.stringify({ ...chunk, flow: triageResult.intent }) + '\n');
        chunkIdx++;
    }
    res.end();
});
