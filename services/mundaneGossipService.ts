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
    console.log('[mundaneGossipService] 正在获取微博热搜...');
    const trends = await fetchWeiboNewsLogic();
    if (!trends || trends.length === 0) {
        console.log('[mundaneGossipService] 微博热搜数据为空。');
        return "哼，今天微博没啥新鲜事，人类的八卦果然经不起本道仙的法眼。";
    }
    console.log(`[mundaneGossipService] 成功获取 ${trends.length} 条微博热搜。`);
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
    return await callLLMForComment(userPrompt);
}

async function getDoubanMovies(): Promise<string> {
    console.log('[mundaneGossipService] 正在获取豆瓣电影榜单...');
    const movies = await fetchDoubanMoviesLogic();
    if (!movies || movies.length === 0) {
        console.log('[mundaneGossipService] 豆瓣电影数据为空。');
        return "哼，最近的电影都无聊透顶，本道仙都懒得看。";
    }
    console.log(`[mundaneGossipService] 成功获取 ${movies.length} 部豆瓣电影。`);
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
    console.log('[mundaneGossipService] 正在获取小道仙的幻想故事。');
    const story = fantasyStories[Math.floor(Math.random() * fantasyStories.length)];
    console.log('[mundaneGossipService] 成功获取幻想故事。');
    return story.content;
}

// 修改: 使用 character 模块中的数据来构建 prompt
async function callLLMForComment(userPrompt: string): Promise<string> {
    const systemPrompt = `你是${character.persona.name}，${character.persona.description}
你的语言和行为必须严格遵守以下规则：
- 核心人设: ${character.persona.description}
- 亲密度规则: ${character.persona.intimacyRules}
- 你的说话方式是现代的，不要使用古风或文言文。
`;
    console.log('[mundaneGossipService] 正在调用大模型生成评论...');
    try {
        const response = await getLLMResponse(systemPrompt, userPrompt);
        console.log('[mundaneGossipService] 成功获取大模型响应。');
        return response;
    } catch (error) {
        console.error('[mundaneGossipService] 大模型调用失败:', error);
        throw error;
    }
}

export async function handleMundaneGossip(intent: string): Promise<string> {
    console.log(`[mundaneGossipService] 意图分发：${intent}`);
    switch (intent) {
        case '俗世趣闻_新鲜事':
            return getWeiboTrends();
        case '俗世趣闻_上映新片':
            return getDoubanMovies();
        case '俗世趣闻_小道仙的幻想':
            return getFantasyStory();
        default:
            console.log(`[mundaneGossipService] 意图未识别，返回默认响应。`);
            return "你的问题超出了本道仙的业务范围，换个问题吧。";
    }
}
