// 文件: services/mundaneGossipService.ts
import * as character from '../core/characterSheet.js';
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
    console.log('[mundaneGossipService] 正在获取微博热搜...'); // 添加日志

    const trends = await fetchWeiboNewsLogic();

    if (!trends || trends.length === 0) {
        console.log('[mundaneGossipService] 微博热搜数据为空。'); // 添加日志
        return "哼，今天微博没啥新鲜事，人类的八卦果然经不起本道仙的法眼。";
    }

    console.log(`[mundaneGossipService] 成功获取 ${trends.length} 条微博热搜。`); // 添加日志

    // 【逻辑升级】将热搜数据交给大模型，让它来总结和点评
    const trendsForLLM = trends.slice(0, 10).map(item => item.title);

    const userPrompt = `
# 任务
请以尧金的口吻，完成以下两件事：
1.  将这些热搜整合成一段通顺的、叙事性的“今日要闻总结”，不要简单罗列。
2.  在总结后，选择其中一个或两个最荒谬、最无聊的事件，附上你有趣的点评。点评要言简意赅，一针见血。

# 原始热搜列表
${JSON.stringify(trendsForLLM)}

# 你的总结与点评：
`;
    // 直接返回大模型生成的完整回复
    return await callLLMForComment(userPrompt);
}


async function getDoubanMovies(): Promise<string> {
    console.log('[mundaneGossipService] 正在获取豆瓣电影榜单...'); // 添加日志

    const movies = await fetchDoubanMoviesLogic();

    if (!movies || movies.length === 0) {
        console.log('[mundaneGossipService] 豆瓣电影数据为空。'); // 添加日志
        return "哼，最近的电影都无聊透顶，本道仙都懒得看。";
    }

    console.log(`[mundaneGossipService] 成功获取 ${movies.length} 部豆瓣电影。`); // 添加日志

    // 【逻辑升级】让大模型直接根据榜单进行总结和点评
    const moviesForLLM = movies.slice(0, 5).map((movie: any) => `《${movie.title}》 评分：${movie.score}`);
    const userPrompt = `
# 任务
请以尧金的口吻，完成以下两件事：
1.  将这些电影整合成一段通顺的、叙事性的“近期电影速报”，不要简单罗列，并适当评价它们的整体水平。
2.  在总结之后，选择其中一两部你觉得最值得吐槽或最无趣的电影，附上你有趣、独特的点评。

# 原始电影列表
${JSON.stringify(moviesForLLM)}

# 你的总结与点评：
`;
    return await callLLMForComment(userPrompt);
}


async function getFantasyStory(): Promise<string> {
    console.log('[mundaneGossipService] 正在获取小道仙的幻想故事。'); // 添加日志
    const story = fantasyStories[Math.floor(Math.random() * fantasyStories.length)];
    console.log('[mundaneGossipService] 成功获取幻想故事。'); // 添加日志
    return story.content;
}


async function callLLMForComment(userPrompt: string): Promise<string> {
    const systemPrompt = `你是${character.persona.name}，${character.persona.description}
你的语言和行为必须严格遵守以下规则：
- 核心人设: ${character.persona.description}
- 亲密度规则: ${character.persona.intimacyRules}
- 你的说话方式是现代的，不要使用古风或文言文。
`;
    console.log('[mundaneGossipService] 正在调用大模型生成评论...'); // 添加日志
    try {
        const response = await getLLMResponse(systemPrompt, userPrompt);
        console.log('[mundaneGossipService] 成功获取大模型响应。'); // 添加日志
        return response;
    } catch (error) {
        console.error('[mundaneGossipService] 大模型调用失败:', error); // 添加日志
        throw error;
    }
}


export async function handleMundaneGossip(intent: string): Promise<string> {
    console.log(`[mundaneGossipService] 意图分发：${intent}`); // 添加日志
    switch (intent) {
        case '俗世趣闻_新鲜事':
            return getWeiboTrends();
        case '俗世趣闻_上映新片':
            return getDoubanMovies();
        case '俗世趣闻_小道仙的幻想':
            return getFantasyStory();
        default:
            console.log(`[mundaneGossipService] 意图未识别，返回默认响应。`); // 添加日志
            return "哼，你的问题超出了本道仙的业务范围，换个问题吧。";
    }
}
