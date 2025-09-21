import type { VercelRequest, VercelResponse } from '@vercel/node';
// 核心修复：在导入路径的末尾添加 .js 后缀
import { fetchWeiboNewsLogic } from '../lib/weibo.js';

// 这个文件现在非常简洁，只作为 API 的入口
export default async function handler(_req: VercelRequest, res: VercelResponse) {
    try {
        // 直接调用导入的逻辑函数
        const finalTrends = await fetchWeiboNewsLogic();
        res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
        res.status(200).json(finalTrends);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        console.error(`后端服务(/weibo)出错: ${errorMessage}`);
        res.status(500).json({ error: `后端服务出错: ${errorMessage}` });
    }
}
