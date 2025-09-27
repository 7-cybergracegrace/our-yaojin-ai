// 文件: services/mundaneGossipService.ts

import * as fs from 'fs';
import * as path from 'path';
import { fetchWeiboNewsLogic } from '../lib/weibo.js'; 
import { fetchDoubanMoviesLogic } from '../lib/douban.js';
import { getLLMResponse } from '../lib/llm.js';

const fantasyStoryPath = path.join(process.cwd(), 'data', '小道仙的幻想.json');
const fantasyStories: { content: string }[] = JSON.parse(fs.readFileSync(fantasyStoryPath, 'utf-8'));

/**
 * 获取并评论微博热搜榜
 * @returns 包含热搜列表和评论的文本
 */
async function getWeiboTrends(): Promise<string> {
    const trends = await fetchWeiboNewsLogic(); 
    
    if (!trends || trends.length === 0) {
        return "哼，今天微博没啥新鲜事，人类的八卦果然经不起本道仙的法眼。";
    }

    const formattedTrends = trends.slice(0, 10).map((item: any, index: number) => `${index + 1}. ${item.title}`).join('\n');
    
    const userPrompt = `点评一下今天的这些凡间热搜，要毒舌、要一针见血：\n${formattedTrends}`;
    const comment = await callLLMForComment(userPrompt);
    
     const finalResponse = `哼，今天的凡间热搜不过是这些罢了：\n\n${formattedTrends}\n\n${comment}`;
     return finalResponse;
}

/**
 * 获取并评论豆瓣电影榜单
 * @returns 包含电影列表和评论的文本
 */
async function getDoubanMovies(): Promise<string> {
    const movies = await fetchDoubanMoviesLogic();
    
    if (!movies || movies.length === 0) {
        return "哼，最近的电影都无聊透顶，本道仙都懒得看。";
    }

    const formattedMovies = movies.slice(0, 5).map((movie: any) => `- 《${movie.title}》，评分 ${movie.score}`).join('\n');

    const userPrompt = `点评一下最近凡间的这些电影，要不屑一顾、要显得你品味很高：\n${formattedMovies}`;
    const comment = await callLLMForComment(userPrompt);

     const finalResponse = `凡人最近就捣鼓出这些电影么，让本道仙瞧瞧：\n\n${formattedMovies}\n\n${comment}`;
     return finalResponse;
}

/**
 * 分享一个随机的幻想故事 (已按要求修改)
 * @returns 包含幻想故事的文本
 */
async function getFantasyStory(): Promise<string> {
    const story = fantasyStories[Math.floor(Math.random() * fantasyStories.length)];
    return story.content; // 直接返回故事内容
}

/**
 * 调用大模型生成评论 (已升级)
 * @param userPrompt 用户的具体问题或指令
 * @returns 大模型的回复
 */
async function callLLMForComment(userPrompt: string): Promise<string> {
    const systemPrompt = "你是一个骄傲、毒舌但内心关怀人类的蛇兽人，喜欢自称“本道仙”，名为尧金。你的回答必须简洁、有力、符合你的人设。";
    return await getLLMResponse(systemPrompt, userPrompt);
}

/**
 * 处理“俗世趣闻”模块的主函数
 * @param intent 具体的意图
 * @returns 最终的回复文本
 */
export async function handleMundaneGossip(intent: string): Promise<string> {
    switch (intent) {
        case '俗世趣闻_新鲜事':
            return getWeiboTrends();
        case '俗世趣闻_上映新片':
            return getDoubanMovies();
        case '俗世趣闻_小道仙的幻想':
            return getFantasyStory();
        default:
            return "哼，你的问题超出了本道仙的业务范围，换个问题吧。";
    }
}
