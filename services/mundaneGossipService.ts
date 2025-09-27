// 文件: services/mundaneGossipService.ts

import * as fs from 'fs';
import * as path from 'path';
import { fetchWeiboNewsLogic } from '../lib/weibo.js'; 
import { fetchDoubanMoviesLogic } from '../lib/douban.js';
import { getLLMResponse } from '../lib/llm.js';

const fantasyStoryPath = path.join(process.cwd(), 'data', '小道仙的幻想.json');
const fantasyStories: { content: string }[] = JSON.parse(fs.readFileSync(fantasyStoryPath, 'utf-8'));

/**
 * 获取并以“总结+点评”的形式回应微博热搜
 */
async function getWeiboTrends(): Promise<string> {
    const trends = await fetchWeiboNewsLogic(); 
    
    if (!trends || trends.length === 0) {
        return "哼，今天微博没啥新鲜事，人类的八卦果然经不起本道仙的法眼。";
    }

    // 【逻辑升级】我们将原始的热搜数据直接交给大模型，让它来总结和点评
     const trendsForLLM = trends.slice(0, 10).map(item => item.title);
    
     const userPrompt = `
# 任务
你收到了今天凡间的最新微博热搜列表。请完成以下两件事：
1.  用你作为道仙的、略带不屑的口吻，将这些热搜整合成一段通顺的、叙事性的“今日要闻总结”，而不是简单地罗列出来。
2.  在总结之后，附上你对其中一两个最荒谬或最无聊事件的毒舌点评。

# 原始热搜列表
${JSON.stringify(trendsForLLM)}

# 你的总结与点评：
`;
     // 直接返回大模型生成的完整回复
     return await callLLMForComment(userPrompt);
}

/**
 * 获取豆瓣电影并以“罗列+引导”的形式回应
 */
async function getDoubanMovies(): Promise<string> {
    const movies = await fetchDoubanMoviesLogic();
    
    if (!movies || movies.length === 0) {
        return "哼，最近的电影都无聊透顶，本道仙都懒得看。";
    }

    const formattedMovies = movies.slice(0, 5).map((movie: any) => `- 《${movie.title}》，评分 ${movie.score}`).join('\n');

    // 【逻辑升级】在话术结尾增加引导性问题
     const finalResponse = `凡人最近就捣鼓出这些电影么，让本道仙瞧瞧：\n\n${formattedMovies}\n\n哼，有哪部是你想让本道仙为你深入锐评一番的？`;
     return finalResponse;
}

/**
 * 分享一个随机的幻想故事
 */
async function getFantasyStory(): Promise<string> {
    const story = fantasyStories[Math.floor(Math.random() * fantasyStories.length)];
    return story.content;
}

/**
 * 调用大模型生成评论
 */
async function callLLMForComment(userPrompt: string): Promise<string> {
    const systemPrompt = "你是一个骄傲、毒舌但内心关怀凡人的道仙，名为尧金。你的回答必须简洁、有力、符合你的人设。";
    return await getLLMResponse(systemPrompt, userPrompt);
}

/**
 * 处理“俗世趣闻”模块的主函数
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
