import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * 通用 API Handler 封装
 * - 统一处理允许的 HTTP 方法
 * - 自动捕获异常并返回 JSON
 */
export function withApiHandler(
  allowedMethods: ('GET' | 'POST' | 'PUT' | 'DELETE')[],
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      // 检查请求方法
      if (!allowedMethods.includes(req.method as any)) {
        res.setHeader('Allow', allowedMethods);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
      }

      // 执行具体逻辑
      await handler(req, res);
    } catch (error) {
      console.error("API Handler Error:", error);

      if (!res.writableEnded) {
        let message = "Unknown server error";
        if (error instanceof Error) {
          message = error.message;
        }
        res.status(500).json({ error: "Internal Server Error", details: message });
      }
    }
  };
}
