// 文件: services/daoistDailyService.ts

import * as character from '../core/characterSheet.js';
import * as fs from 'fs';
import * as path from 'path';
import { getLLMResponse } from '../lib/llm.js';

// --- 数据文件路径 ---
const reviewPath = path.join(process.cwd(), 'data', '文艺评论.json');
const shoppingListPath = path.join(process.cwd(), 'data', '购物清单.json');
const grudgeListPath = path.join(process.cwd(), 'data', '记仇小本本.json');
const lifestyleScenesPath = path.join(process.cwd(), 'data', '生活小事.json');
// 因为你的文件中没有这个文件，所以注释掉
// const curseListPath = path.join(process.cwd(), 'data', '尧金的诅咒库.json');

// --- 类型定义 ---
interface ReviewItem {
    type: '电视剧' | '电影' | '小说';
    title: string;
    comment: string;
}
interface ShoppingItem {
    name: string;
    description: string;
    image_prompt: string;
}
interface GrudgeItem {
    event: string;
    curse: string;
}
// 【新增】为生活小事定义类型
interface LifestyleItem {
    type: string;
    topic: string;
}

// --- 加载数据 ---
const reviews: ReviewItem[] = JSON.parse(fs.readFileSync(reviewPath, 'utf-8'));
const shoppingItems: ShoppingItem[] = JSON.parse(fs.readFileSync(shoppingListPath, 'utf-8'));
const grudgeEvents: GrudgeItem[] = JSON.parse(fs.readFileSync(grudgeListPath, 'utf-8'));
// 【修改点1: 导入新类型】
const lifestyleScenes: LifestyleItem[] = JSON.parse(fs.readFileSync(lifestyleScenesPath, 'utf-8'));

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
async function getReviewByType(reviewType: ReviewItem['type']): Promise<string> {
    console.log(`[DaoistDailyService] 正在获取 ${reviewType} 评论...`);
    const filteredReviews = reviews.filter(item => item.type === reviewType);
    if (filteredReviews.length === 0) {
        console.log(`[DaoistDailyService] 未找到 ${reviewType} 评论。`);
        return `哼，本道仙最近没看什么${reviewType}，没什么可说的。`;
    }
    const review = filteredReviews[Math.floor(Math.random() * filteredReviews.length)];
    console.log(`[DaoistDailyService] 成功获取 ${reviewType} 评论: "${review.title}"`);
    const userPrompt = `以尧金的口吻，毒舌地评价以下作品：
作品类型：${review.type}
作品名称：${review.title}
你之前对这个作品的点评：${review.comment}
请以尧金的语气复述并稍作发挥，然后挑衅地问用户“你觉得如何？”或“你有什么高见？”。
你的点评：`;
    const systemPrompt = getSystemInstruction();
    try {
        const llmResponse = await getLLMResponse(systemPrompt, userPrompt);
        return llmResponse;
    } catch (error) {
        console.error(`[DaoistDailyService] 大模型调用失败（评论）:`, error);
        return review.comment;
    }
}

async function getShoppingItem(): Promise<string> {
    console.log('[DaoistDailyService] 正在获取购物清单。');
    const shoppingItems: ShoppingItem[] = JSON.parse(fs.readFileSync(shoppingListPath, 'utf-8'));
    const item = shoppingItems[Math.floor(Math.random() * shoppingItems.length)];
    const userPrompt = `以尧金的口吻，描述以下购物清单中的一个项目。描述要生动有趣，最好能引人吐槽，并邀请用户分享自己最近买了什么。
    商品名称：${item.name}
    商品描述：${item.description}
    你的描述:`;
    const systemPrompt = getSystemInstruction();
    try {
        const responseText = await getLLMResponse(systemPrompt, userPrompt);
        console.log('[DaoistDailyService] 成功获取大模型响应（购物清单）。');
        return `${responseText} [GENERATE_IMAGE]{"prompt": "${item.image_prompt}"}`;
    } catch (error) {
        console.error('[DaoistDailyService] 大模型调用失败（购物清单）:', error);
        throw error;
    }
}

async function getGrudgeEvent(): Promise<string> {
    console.log('[DaoistDailyService] 正在获取记仇事件。');
    const grudgeEvents: GrudgeItem[] = JSON.parse(fs.readFileSync(grudgeListPath, 'utf-8'));
    const grudge = grudgeEvents[Math.floor(Math.random() * grudgeEvents.length)];
    console.log('[DaoistDailyService] 成功获取记仇事件。');
    const userPrompt = `以尧金的口吻，描述以下一个事件，并邀请用户分享自己讨厌的人或事。在描述中提及你会为讨厌的人画诅咒符。
    事件：${grudge.event}
    你的描述:`;
    const systemPrompt = getSystemInstruction();
    try {
        const responseText = await getLLMResponse(systemPrompt, userPrompt);
        console.log('[DaoistDailyService] 成功获取大模型响应（记仇事件）。');
        return `${responseText} [GENERATE_IMAGE]{"prompt": "${grudge.curse}"}`;
    } catch (error) {
        console.error('[DaoistDailyService] 大模型调用失败（记仇事件）:', error);
        throw error;
    }
}

// 【修改点2: 重写 getLifestyleScene 函数】
async function getLifestyleScene(): Promise<string> {
    console.log('[DaoistDailyService] 正在获取生活场景。');
    const scene = lifestyleScenes[Math.floor(Math.random() * lifestyleScenes.length)];
    console.log('[DaoistDailyService] 成功获取生活场景。');

    // 直接返回 topic 的内容
    return scene.topic;
}

// --- 核心处理器 ---
export async function handleDaoistDailyChoice(intent: string, _userInput?: string): Promise<string> {
    console.log(`[DaoistDailyService] 意图分发：${intent}`);
    switch (intent) {
        case '道仙日常_最近看了':
            const subChoice = Math.random();
            if (subChoice < 0.33) {
                return getReviewByType('小说');
            } else if (subChoice < 0.66) {
                return getReviewByType('电影');
            } else {
                return getReviewByType('电视剧');
            }
        case '道仙日常_最近买了':
            return getShoppingItem();
        case '道仙日常_记仇小本本':
            return getGrudgeEvent();
        case '道仙日常_随便聊聊':
            return getLifestyleScene();
        default:
            console.warn(`[DaoistDailyService] 未匹配到意图: ${intent}`);
            return "哼，你的问题超出了本道仙的业务范围，换个问题吧。";
    }
}
