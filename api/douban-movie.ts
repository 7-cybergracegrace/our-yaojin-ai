import type { VercelRequest, VercelResponse } from '@vercel/node';
// 核心修复：在导入路径的末尾添加 .js 后缀
import { fetchDoubanMoviesLogic } from '../lib/douban.js';

// 这个文件现在只负责处理请求和响应
export default async function handler(_req: VercelRequest, res: VercelResponse) {
    try {
        // 直接调用核心逻辑
        const top10Movies = await fetchDoubanMoviesLogic();
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');
        res.status(200).json(top10Movies);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '获取豆瓣电影数据失败。';
        console.error('获取或解析豆瓣数据时出错:', error);
        res.status(500).json({ error: errorMessage });
    }
}
