// 文件: services/mundaneGossipService.ts

import * as fs from 'fs';
import * as path from 'path';
import { fetchWeiboNewsLogic } from '../lib/weibo.js'; // 假设这个文件用于获取微博数据
import { fetchDoubanMoviesLogic } from '../lib/douban.js'; // 假设这个文件用于获取豆瓣数据
// 【TS6133 错误修正】移除了未使用的 'character' 导入
// import * as character from '../core/characterSheet.js'; 

// 假设你有专门的知识库，用于幻想故事
const fantasyStoryPath = path.join(process.cwd(), 'data', '小道仙的幻想.json');
const fantasyStories = JSON.parse(fs.readFileSync(fantasyStoryPath, 'utf-8'));

/**
 * 获取并评论微博热搜榜
 * @returns 包含热搜评论的文本
 */
async function getWeiboTrends(): Promise<string> {
    const trends = await fetchWeiboNewsLogic(); // 调用lib/weibo.js中的函数
    
    if (!trends || trends.length === 0) {
        return "哼，今天微博没啥新鲜事，人类的八卦果然经不起本道仙的法眼。";
    }

    const formattedTrends = trends.map((item: any, index: number) => `【${index + 1}】${item.title}`).join('\n');
    
    // 占位符：用大模型根据热搜列表进行毒舌评论
    const prompt = `你是一个骄傲毒舌的道仙，名为尧金。请以嘲讽的口吻，点评以下微博热搜：\n${formattedTrends}`;
    const comment = await callLLMForComment(prompt); // 假设有一个调用大模型的函数
    
    return comment;
}

/**
 * 获取并评论豆瓣电影榜单
 * @returns 包含电影评论的文本
 */
async function getDoubanMovies(): Promise<string> {
    const movies = await fetchDoubanMoviesLogic(); // 调用lib/douban.js中的函数
    
    if (!movies || movies.length === 0) {
        return "哼，最近的电影都无聊透顶，本道仙都懒得看。";
    }

    const formattedMovies = movies.map((movie: any, index: number) => `【${index + 1}】《${movie.title}》- 评分: ${movie.score}`).join('\n');

    // 占位符：用大模型根据电影列表进行毒舌评论
    const prompt = `你是一个骄傲毒舌的道仙，名为尧金。请以不屑的口吻，点评以下豆瓣电影榜单：\n${formattedMovies}`;
    const comment = await callLLMForComment(prompt);

    return comment;
}

/**
 * 分享一个随机的幻想故事
 * @returns 包含幻想故事的文本
 */
async function getFantasyStory(): Promise<string> {
    const story = fantasyStories[Math.floor(Math.random() * fantasyStories.length)];
    return `哼，想听本道仙的幻想？听好了，我给你讲个故事……\n\n${story.content}`;
}

/**
 * 占位符：调用大模型生成评论
 * @param prompt 大模型的提示词
 * @returns 大模型的回复
 */
// 【TS6133 错误修正】在未使用的参数 'prompt' 前加上下划线 '_'
async function callLLMForComment(_prompt: string): Promise<string> {
    // 假设你有能力调用外部AI API，这里是占位符
    // 你需要自己实现这个函数，将 prompt 发送给大模型
    // 并返回大模型的回复
    return `（这里是大模型的毒舌评论）`;
}

/**
 * 处理“俗世趣闻”模块的主函数
 * @param intent 具体的意图，如 '俗世趣闻_新鲜事'
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
