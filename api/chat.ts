import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler } from '../lib/apiHandler.js';
import { handleDaoistDailyChoice } from '../services/daoistDailyService.js';
import { Message, IntimacyLevel, Flow } from '../types/index.js';
import { fetchWeiboNewsLogic } from '../lib/weibo.js';
import { fetchDoubanMoviesLogic } from '../lib/douban.js';
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
    const start = Date.now();
    console.log(`[${new Date().toISOString()}] [streamApiCall] 开始调用: ${API_URL}${path} payload:`, payload);
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

        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] [streamApiCall] 响应完成: ${API_URL}${path} 耗时: ${duration}ms, 状态码: ${response.status}`);

        if (!response.ok) {
            let errorData = await response.text();
            try {
                errorData = JSON.parse(errorData).error?.message || errorData;
            } catch (e) {}
            console.error(`[${new Date().toISOString()}] [streamApiCall] API请求失败 ${API_URL}${path} 状态码: ${response.status} 错误信息:`, errorData);
            throw new Error(`API request failed with status ${response.status}: ${errorData}`);
        }
        return response;
    } catch (err) {
        console.error(`[${new Date().toISOString()}] [streamApiCall] 调用异常: ${API_URL}${path}`, err);
        throw err;
    }
}

// --- 分流 ---
async function runTriage(userInput: string, userName: string, intimacy: IntimacyLevel): Promise<{ action: 'CONTINUE_CHAT' | 'guidance' | 'game' | 'news' | 'daily' | 'REJECT_AND_TERMINATE' }> {
    console.log(`[${new Date().toISOString()}] [runTriage] 开始分流: userInput="${userInput}", userName="${userName}", intimacy=`, intimacy);
    const triagePrompt = `
# 指令
你是一个对话分流助手。你的任务是根据用户的输入，严格匹配以下七种情况中的一种，并仅输出与该情况对应的JSON对象。不得有任何额外文字、解释或代码块。
# 当前用户信息
- 昵称: ${userName}
- 亲密度: ${intimacy.level}
# 分流规则
\`\`\`json
${JSON.stringify(character.triageRules, null, 2)}
\`\`\`
# 用户输入
"${userInput}"
# 你的输出 (必须是以下JSON对象之一):
`;

    try {
        const start = Date.now();
        const response = await streamApiCall('/v1/chat/completions', {
            model: 'gemini-2.5-flash',
            messages: [{ role: 'user', content: triagePrompt }],
            stream: false,
        });
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] [runTriage] triage API调用完成, 耗时: ${duration}ms`);
        const result = await response.json();
        const responseText = result.choices?.[0]?.message?.content?.trim();

        if (responseText) {
            const cleaned = responseText.replace(/^\s*```(?:json)?\s*([\s\S]*?)\s*```$/i, '$1').trim();
            const triageAction = JSON.parse(cleaned);

            if (triageAction && typeof triageAction === 'object' && Object.keys(triageAction).length === 1) {
                const actionKey = Object.keys(triageAction)[0];
                if (Object.keys(character.triageRules).includes(actionKey)) {
                    const finalResult = { action: actionKey as any };
                    console.log(`[${new Date().toISOString()}] [runTriage] triage解析结果:`, finalResult);
                    return finalResult;
                }
            }
            console.log(`[${new Date().toISOString()}] [runTriage] triage解析结果格式异常，返回默认值:`, triageAction);
            return { action: 'CONTINUE_CHAT' };
        }
    } catch (e) {
        console.error(`[${new Date().toISOString()}] [runTriage] 意图分流失败:`, e);
    }
    return { action: 'CONTINUE_CHAT' };
}

// --- 主逻辑 ---
async function* sendMessageStream(
    text: string,
    imageBase64: string | null,
    history: Message[],
    intimacy: IntimacyLevel,
    userName: string,
    flow: Flow,
    currentStep?: number
): AsyncGenerator<Partial<Message>> {
    console.log(`[${new Date().toISOString()}] [sendMessageStream] 进入，对话text="${text}", flow="${flow}", currentStep=${currentStep}`);
    try {
        let systemInstruction = getSystemInstruction(intimacy, userName, flow, currentStep ?? 0);
        let externalContext: string | null = null;
        let finalPrompt = text;

        if (flow === 'game' && text.toLowerCase().includes('画')) {
            yield { text: "收到，本道仙这就为你挥毫挥毫...", isLoading: true };
            const imagePrompt = `大师级的奇幻数字艺术，充满细节，描绘一个场景：${text.replace(/画/g, '')}`;
            try {
                const start = Date.now();
                const response = await streamApiCall('/v1/images/generations', {
                    model: "gemini-2.0-flash-preview-image-generation",
                    prompt: imagePrompt,
                    n: 1,
                    size: "1024x1024"
                });
                const duration = Date.now() - start;
                const result = await response.json();
                const generatedImageUrl = result.data?.[0]?.url;
                if (generatedImageUrl) {
                    yield { text: "本道仙的大作，你看如何？", generatedImageUrl, isLoading: false };
                } else {
                    yield { text: "哎呀，今日灵感枯竭，没画出来。换个描述试试？", isLoading: false };
                }
            } catch (imageError) {
                yield { text: "图片生成失败，可能是网络或API问题。请稍后重试。", isLoading: false };
            }
            return;
        }

        if (flow === 'news') {
            if (text.includes('新鲜事')) {
                systemInstruction += `\n${character.newsTopic.subTopics['新鲜事']}`;
                const newsData = await fetchWeiboNewsLogic();
                if (newsData && newsData.length > 0) {
                    const formattedTrends = newsData.map((item, index) => `[${index + 1}] ${item.title}`).join('\n');
                    externalContext = `以下是微博热搜榜的新鲜事：\n\n${formattedTrends}`;
                }
            } else if (text.includes('上映新片')) {
                systemInstruction += `\n${character.newsTopic.subTopics['上映新片']}`;
                const movieData = await fetchDoubanMoviesLogic();
                if (movieData && movieData.length > 0) {
                    const formattedMovies = movieData.map((movie, index) => `[${index + 1}] 《${movie.title}》- 评分: ${movie.score}`).join('\n');
                    externalContext = `本道仙刚瞅了一眼，最近上映的电影倒是有点意思，这几部你看过吗？\n\n${formattedMovies}`;
                }
            } else if (text.includes('小道仙的幻想')) {
                systemInstruction += `\n${character.newsTopic.subTopics['小道仙的幻想']}`;
            }
        }
        if (externalContext) {
            systemInstruction += `\n\n**请你基于以下外部参考资料，与用户展开对话**:\n${externalContext}`;
        }

        // --- 修正版消息格式 ---
        const apiMessages = convertToApiMessages(history, systemInstruction, finalPrompt, imageBase64);
        console.log(`[${new Date().toISOString()}] [sendMessageStream] 开始chat流API调用, apiMessages=`, apiMessages);
        const start = Date.now();
        const response = await streamApiCall('/v1/chat/completions', {
            model: 'gemini-2.5-flash',
            messages: apiMessages,
            stream: true,
        });
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] [sendMessageStream] chat流API响应, 耗时: ${duration}ms`);

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        const MAX_DURATION = 30000;
        const startTime = Date.now();

        while (true) {
            if (Date.now() - startTime > MAX_DURATION) {
                yield { text: 'AI接口响应超时，请稍后重试。', isLoading: false, errorType: 'server' };
                break;
            }
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            while (buffer.includes('\n')) {
                let idx = buffer.indexOf('\n');
                let line = buffer.slice(0, idx);
                buffer = buffer.slice(idx + 1);
                if (!line.trim()) continue;
                if (line.startsWith('data: ')) {
                    const dataLine = line.slice(6).trim();
                    if (dataLine === '[DONE]') break;
                    try {
                        const data = JSON.parse(dataLine);
                        const textDelta = data.choices?.[0]?.delta?.content || '';
                        if (textDelta) {
                            yield { text: textDelta, isLoading: true };
                        }
                    } catch (e) {
                        buffer = line + '\n' + buffer;
                        break;
                    }
                }
            }
        }
        yield { isLoading: false };
    } catch (error) {
        let errorType: 'rate_limit' | 'safety' | 'server' | 'unknown' = 'server';
        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes('safety')) errorType = 'safety';
            else if (message.includes('quota') || message.includes('rate limit') || message.includes('429')) errorType = 'rate_limit';
            else if (message.includes('server error') || message.includes('500') || message.includes('503')) errorType = 'server';
            else errorType = 'unknown';
        }
        yield { text: '', errorType: errorType, isLoading: false };
    }
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
- 图片处理: 当用户发送图片时，你需要能识别、评论图片内容。
`;

    instruction += "\n\n---";
    switch (flow) {
        case 'guidance':
            instruction += `\n**当前模式：仙人指路**\n`;
            if (currentStep === 1) {
                const guidanceFlowConfig = character.guidanceFlows.daily_horoscope;
                instruction += `
你正在执行一个占卜流程。
用户输入: ${guidanceFlowConfig.steps[0].config.message}
你的任务是：根据用户输入，回复话术索取信息。`;
            } else if (currentStep === 2) {
                // 其它步骤可在此补充
            }
            break;
        case 'game':
            instruction += `\n**当前模式：游戏小摊**\n${character.gameRules.introduction}
- 特殊能力指令: 你可以通过输出特定格式的文本来调用特殊能力: 掷骰子: \`[DICE]{...}\`, 快速回复: \`[QUICKREPLIES]{...}\`, 文生图: \`[GENERATE_IMAGE]{...}\`。
### 游戏规则文档 ###
**你说我画:** ${character.gameRules.games['你说我画']}
**故事接龙:** ${character.gameRules.games['故事接龙']}
**真心话大冒险:** ${character.gameRules.games['真心话大冒险']}`;
            break;
        case 'news':
            instruction += `\n**当前模式：俗世趣闻**\n${character.newsTopic.introduction}`;
            break;
        case 'daily':
            instruction += `\n**当前模式：道仙日常**\n${character.dailyTopic.introduction}`;
            break;
        default:
            instruction += "\n**当前模式：闲聊**\n这是你们的默认相处模式。自由发挥，根据用户的话题进行回应，自然地展现你的性格和能力。";
            break;
    }
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

export default withApiHandler(['POST'], async (req: VercelRequest, res: VercelResponse) => {
    const reqStart = Date.now();
    console.log(`[${new Date().toISOString()}] [API] 请求开始: body=`, req.body);
    const { text, imageBase64, history, intimacy, userName, currentFlow, currentStep } = req.body;
    if (!text && !imageBase64) {
        res.status(400).json({ error: 'Text or image is required' });
        return;
    }

    let finalFlow: Flow = currentFlow;
    if (typeof currentStep === "undefined" || currentStep === 0) {
        const triageResult = await runTriage(text, userName, intimacy);
        if (triageResult.action && triageResult.action !== 'CONTINUE_CHAT') {
            finalFlow = triageResult.action;
        } else {
            finalFlow = 'chat';
        }
    }
    if (!finalFlow) finalFlow = 'default';
    console.log(`[${new Date().toISOString()}] [API] 分流结果:`, finalFlow, '当前步骤:', currentStep);

    res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
    });

    if (finalFlow === 'daily' && currentStep > 0) {
        const staticResponse = handleDaoistDailyChoice(text);
        res.write(JSON.stringify({ text: staticResponse, isLoading: false, flow: 'daily' }) + '\n');
        res.end();
        return;
    }

    let chunkIdx = 0;
    for await (const chunk of sendMessageStream(text, imageBase64, history, intimacy, userName, finalFlow, currentStep)) {
        res.write(JSON.stringify({ ...chunk, flow: finalFlow }) + '\n');
        chunkIdx++;
    }
    res.end();
    const reqDuration = Date.now() - reqStart;
    console.log(`[${new Date().toISOString()}] [API] 请求结束，耗时: ${reqDuration}ms`);
});
