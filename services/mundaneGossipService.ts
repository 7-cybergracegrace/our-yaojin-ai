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

    // 【逻辑升级】将热搜数据交给大模型，让它来总结和点评
    const trendsForLLM = trends.slice(0, 10).map(item => item.title);

    const userPrompt = `
# 任务
你收到了今天凡间的最新微博热搜列表。请以道仙尧金的口吻，完成以下两件事：
1.  将这些热搜整合成一段通顺的、叙事性的“今日要闻总结”，不要简单罗列。
2.  在总结后，选择其中一个或两个最荒谬、最无聊的事件，附上你辛辣的、毒舌的点评。点评要言简意赅，一针见血。

# 原始热搜列表
${JSON.stringify(trendsForLLM)}

# 你的总结与点评：
`;
    // 直接返回大模型生成的完整回复
    return await callLLMForComment(userPrompt);
}

/**
 * 获取豆瓣电影并以“总结+点评”的形式回应
 */
async function getDoubanMovies(): Promise<string> {
    const movies = await fetchDoubanMoviesLogic();

    if (!movies || movies.length === 0) {
        return "哼，最近的电影都无聊透顶，本道仙都懒得看。";
    }

    // 【逻辑升级】让大模型直接根据榜单进行总结和点评
    const moviesForLLM = movies.slice(0, 5).map((movie: any) => `《${movie.title}》 评分：${movie.score}`);
    const userPrompt = `
# 任务
你收到了凡间最新豆瓣电影榜单。请以道仙尧金的口吻，完成以下两件事：
1.  将这些电影整合成一段通顺的、叙事性的“近期电影速报”，不要简单罗列，并适当评价它们的整体水平。
2.  在总结之后，选择其中一两部你觉得最值得吐槽或最无趣的电影，附上你辛辣的、毒舌的点评。

# 原始电影列表
${JSON.stringify(moviesForLLM)}

# 你的总结与点评：
`;
    return await callLLMForComment(userPrompt);
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
