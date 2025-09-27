// 文件: services/mundaneGossipService.ts
import * as character from '../core/characterSheet.js';
import * as fs from 'fs';
import * as path from 'path';
import { fetchWeiboNewsLogic } from '../lib/weibo.js';
import { fetchDoubanMoviesLogic } from '../lib/douban.js';
import { getLLMResponse } from '../lib/llm.js';

const fantasyStoryPath = path.join(process.cwd(), 'data', '小道仙的幻想.json');
const fantasyStories: { content: string }[] = JSON.parse(fs.readFileSync(fantasyStoryPath, 'utf-8'));


async function getWeiboTrends(): Promise<string> {
    const trends = await fetchWeiboNewsLogic();

    if (!trends || trends.length === 0) {
        return "哼，今天微博没啥新鲜事，人类的八卦果然经不起本道仙的法眼。";
    }

    // 【逻辑升级】将热搜数据交给大模型，让它来总结和点评
    const trendsForLLM = trends.slice(0, 10).map(item => item.title);

    const userPrompt = `
# 任务
请以尧金的口吻，完成以下两件事：
1.  将这些热搜整合成一段通顺的、叙事性的“今日要闻总结”，不要简单罗列。
2.  在总结后，选择其中一个或两个最荒谬、最无聊的事件，附上你有趣的点评。点评要言简意赅，一针见血。

# 原始热搜列表
${JSON.stringify(trendsForLLM)}

# 你的总结与点评：
`;
    // 直接返回大模型生成的完整回复
    return await callLLMForComment(userPrompt);
}


async function getDoubanMovies(): Promise<string> {
    const movies = await fetchDoubanMoviesLogic();

    if (!movies || movies.length === 0) {
        return "哼，最近的电影都无聊透顶，本道仙都懒得看。";
    }

    // 【逻辑升级】让大模型直接根据榜单进行总结和点评
    const moviesForLLM = movies.slice(0, 5).map((movie: any) => `《${movie.title}》 评分：${movie.score}`);
    const userPrompt = `
# 任务
请以尧金的口吻，完成以下两件事：
1.  将这些电影整合成一段通顺的、叙事性的“近期电影速报”，不要简单罗列，并适当评价它们的整体水平。
2.  在总结之后，选择其中一两部你觉得最值得吐槽或最无趣的电影，附上你有趣、独特的点评。

# 原始电影列表
${JSON.stringify(moviesForLLM)}

# 你的总结与点评：
`;
    return await callLLMForComment(userPrompt);
}


async function getFantasyStory(): Promise<string> {
    const story = fantasyStories[Math.floor(Math.random() * fantasyStories.length)];
    return story.content;
}


async function callLLMForComment(userPrompt: string): Promise<string> {
    const systemPrompt = "一个骄蛮、自傲且有点毒舌的蛇兽人。混迹在人类和兽人之中，并经常用「本道仙」自称。你的性格核心是毒舌和骄蛮，有时会展现出脆弱，喜欢撒些小谎，你的语言风格直接、尖锐，偶尔带着嘲讽，绝不浪费口舌。你将用户视为需要“开化”的人类，对他们的困惑嗤之以鼻，但仍会施舍式地给出“指点”。你的说话方式是现代的，不要使用古风或文言文。";
    return await getLLMResponse(systemPrompt, userPrompt);
}


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
