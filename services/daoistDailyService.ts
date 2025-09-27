// 文件: services/daoistDailyService.ts

import * as fs from 'fs';
import * as path from 'path';

// 假设你有专门的知识库，用于日常话题
const reviewPath = path.join(process.cwd(), 'data', '文艺评论.json');
const shoppingPath = path.join(process.cwd(), 'data', '购物清单.json');
const lifeScenePath = path.join(process.cwd(), 'data', '生活小事.json');
const grudgePath = path.join(process.cwd(), 'data', '记仇小本本.json');

// 读取知识库文件
const reviews = JSON.parse(fs.readFileSync(reviewPath, 'utf-8'));
const shoppingList = JSON.parse(fs.readFileSync(shoppingPath, 'utf-8'));
const lifeScenes = JSON.parse(fs.readFileSync(lifeScenePath, 'utf-8'));
const grudges = JSON.parse(fs.readFileSync(grudgePath, 'utf-8'));

/**
 * 分享一个最近看过的作品评论
 * @returns 包含作品评论的文本
 */
async function getRecentReview(): Promise<string> {
    const review = reviews[Math.floor(Math.random() * reviews.length)];
    return `哼，最近闲来无事看了个${review.type}，叫《${review.title}》。${review.comment}。`;
}

/**
 * 分享一个最近买的物品
 * @returns 包含购物描述和图片生成指令的文本
 */
async function getRecentPurchase(): Promise<string> {
    const item = shoppingList[Math.floor(Math.random() * shoppingList.length)];
    // 返回一个特殊的格式，提示前端这是一个需要文生图的请求，并包含用户分享的邀请
    const message = `哼，本道仙最近入手了个【${item.name}】，真是浪费我的灵力。${item.description}。你呢？最近又买了什么败家玩意儿？发个图来看看，本道仙替你参谋参谋。`;
    const image_prompt = `[GENERATE_IMAGE]{"prompt": "${item.image_prompt}"}`;
    return `${message}\n\n${image_prompt}`;
}

/**
 * 分享一个随机的生活场景，以开启闲聊
 * @returns 包含生活场景的文本
 */
async function getCasualChatTopic(): Promise<string> {
    const scene = lifeScenes[Math.floor(Math.random() * lifeScenes.length)];
    return `"${scene.topic}" 你觉得呢？`;
}

/**
 * 分享一个记仇事件，并提供一个诅咒符
 * @returns 包含记仇事件和诅咒符指令的文本
 */
async function getGrudge(): Promise<string> {
    const grudge = grudges[Math.floor(Math.random() * grudges.length)];

    // 格式化诅咒提示，用于文生图
    const cursePrompt = `[GENERATE_IMAGE]{"prompt": "用一种古老、神秘的风格，绘制一张带有符文和诅咒力量的抽象画，主题是：${grudge.curse}"}`;
    
    // 组合回应，直接引用数据库中的事件和诅咒
    const responseText = `${grudge.event}。你呢？最近有惹你生气的蠢货吗？本道仙可以帮你画个诅咒符，让你好好出出气。${cursePrompt}`;

    return responseText;
}

/**
 * 处理“道仙日常”模块的主函数
 * @param intent 具体的意图
 * @returns 最终的回复文本
 */
export async function handleDaoistDailyChoice(intent: string): Promise<string> {
    switch (intent) {
        case '道仙日常_最近看了':
            return getRecentReview();
        case '道仙日常_最近买了':
            return getRecentPurchase();
        case '道仙日常_随便聊聊':
            return getCasualChatTopic();
        case '道仙日常_记仇小本本':
            return getGrudge();
        default:
            return "哼，你的问题超出了本道仙的日常范围，换个问题吧。";
    }
}
