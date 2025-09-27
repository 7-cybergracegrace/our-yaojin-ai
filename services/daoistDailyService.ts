// 文件: services/daoistDailyService.ts

import * as character from '../core/characterSheet.js';
import * as fs from 'fs';
import * as path from 'path';
import { getLLMResponse } from '../lib/llm.js';

// --- 数据文件路径 (修改后) ---
const reviewPath = path.join(process.cwd(), 'data', '文艺评论.json');
const shoppingListPath = path.join(process.cwd(), 'data', '购物清单.json');
const grudgeListPath = path.join(process.cwd(), 'data', '记仇小本本.json');
const lifestyleScenesPath = path.join(process.cwd(), 'data', '生活小事.json');

// --- 加载数据 ---
const reviews: { content: string }[] = JSON.parse(fs.readFileSync(reviewPath, 'utf-8'));
const shoppingItems: { content: string }[] = JSON.parse(fs.readFileSync(shoppingListPath, 'utf-8'));
const grudgeEvents: { content: string }[] = JSON.parse(fs.readFileSync(grudgeListPath, 'utf-8'));
const lifestyleScenes: { content: string }[] = JSON.parse(fs.readFileSync(lifestyleScenesPath, 'utf-8'));

// --- 辅助函数：生成系统指令 ---
const getSystemInstruction = (): string => {
    return `你是${character.persona.name}，${character.persona.description}
你的语言和行为必须严格遵守以下规则：
- 核心人设: ${character.persona.description}
- 亲密度规则: ${character.persona.intimacyRules}
- 你的说话方式是现代的，不要使用古风或文言文。
`;
};

// --- 具体处理逻辑 ---
async function getReview(): Promise<string> {
    console.log('[DaoistDailyService] 正在获取文艺评论...');
    const review = reviews[Math.floor(Math.random() * reviews.length)];
    console.log('[DaoistDailyService] 成功获取文艺评论。');
    return review.content;
}

async function getShoppingItem(): Promise<string> {
    console.log('[DaoistDailyService] 正在获取购物清单。');
    const item = shoppingItems[Math.floor(Math.random() * shoppingItems.length)];
    const userPrompt = `以尧金的口吻，描述以下购物清单中的一个项目。描述要生动有趣，最好能引人吐槽，并邀请用户分享自己最近买了什么。
    项目：${item.content}
    你的描述:`;
    const systemPrompt = getSystemInstruction();
    try {
        const response = await getLLMResponse(systemPrompt, userPrompt);
        console.log('[DaoistDailyService] 成功获取大模型响应（购物清单）。');
        return response;
    } catch (error) {
        console.error('[DaoistDailyService] 大模型调用失败（购物清单）:', error);
        throw error;
    }
}

async function getGrudgeEvent(): Promise<string> {
    console.log('[DaoistDailyService] 正在获取记仇事件。');
    const grudge = grudgeEvents[Math.floor(Math.random() * grudgeEvents.length)];
    const userPrompt = `以尧金的口吻，描述以下一个事件，并邀请用户分享自己讨厌的人或事。在描述中提及你会为讨厌的人画诅咒符。
    事件：${grudge.content}
    你的描述:`;
    const systemPrompt = getSystemInstruction();
    try {
        const response = await getLLMResponse(systemPrompt, userPrompt);
        console.log('[DaoistDailyService] 成功获取大模型响应（记仇事件）。');
        return response;
    } catch (error) {
        console.error('[DaoistDailyService] 大模型调用失败（记仇事件）:', error);
        throw error;
    }
}

async function getLifestyleScene(): Promise<string> {
    console.log('[DaoistDailyService] 正在获取生活场景。');
    const scene = lifestyleScenes[Math.floor(Math.random() * lifestyleScenes.length)];
    console.log('[DaoistDailyService] 成功获取生活场景。');
    return scene.content;
}

// 由于缺少诅咒库文件，这个函数暂时无法使用
// async function getCurse(): Promise<string> {
//     console.log('[DaoistDailyService] 正在获取诅咒符。');
//     const curse = curses[Math.floor(Math.random() * curses.length)];
//     console.log('[DaoistDailyService] 成功获取诅咒符。');
//     return curse.content;
// }

// --- 核心处理器 ---
export async function handleDaoistDailyChoice(intent: string, userInput?: string): Promise<string> {
    console.log(`[DaoistDailyService] 意图分发：${intent}`);
    switch (intent) {
        case '道仙日常_最近看了':
            return getReview();
        case '道仙日常_最近买了':
            return getShoppingItem();
        case '道仙日常_记仇小本本':
            return getGrudgeEvent();
        case '道仙日常_随便聊聊':
            return getLifestyleScene();
        // 因为缺少诅咒库文件，暂时移除这个 case
        // case '道仙日常_诅咒符':
        //     return getCurse();
        default:
            console.warn(`[DaoistDailyService] 未匹配到意图: ${intent}`);
            return "哼，你的问题超出了本道仙的业务范围，换个问题吧。";
    }
}
