import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// 从环境变量中获取API密钥。
const API_KEY = process.env.GEMINI_API_KEY;

// 1. 优化：将初始化代码放在 handler 外部
// 这利用了 Serverless 函数的“热启动”特性，避免每次请求都重新创建实例，提高性能。
if (!API_KEY) {
    // 在构建或冷启动时快速失败，如果密钥不存在。
    throw new Error('GEMINI_API_KEY environment variable not found.');
}
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    // 建议配置安全设置，以减少因安全问题导致的响应中断
    safetySettings: [
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
    ],
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // 只允许 POST 请求。
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: 'Only POST requests are supported.' });
    }

    // 2. 优化：将 API Key 检查移入 handler 内部
    // 这样如果密钥在运行时丢失，会返回一个标准的JSON错误，而不是让整个函数崩溃。
    if (!API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const { prompt } = req.body;

    // 确保请求体中包含 prompt。
    if (!prompt) {
        return res.status(400).json({ error: 'Missing `prompt` in the request body.' });
    }

    try {
        // 3. 核心优化：使用流式传输 (Streaming)
        const result = await model.generateContentStream(prompt);

        // 设置流式响应头
        res.writeHead(200, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'Cache-Control': 'no-cache',
        });

        // 迭代返回的数据块并写入响应
        for await (const chunk of result.stream) {
            // 检查是否有因安全设置等原因导致的中断
            if (chunk.promptFeedback?.blockReason) {
                const blockReason = chunk.promptFeedback.blockReason;
                console.warn(`Stream blocked due to: ${blockReason}`);
                res.write(JSON.stringify({ error: `Request was blocked due to ${blockReason}.` }));
                break; // 停止发送更多内容
            }
            
            const text = chunk.text();
            // 将每个数据块作为独立的JSON字符串发送，方便前端解析
            res.write(JSON.stringify({ text }) + '\n');
        }

        // 结束响应流
        res.end();

    } catch (error) {
        console.error('Failed to call Gemini API:', error);
        
        // 确保在流式响应出错时不会再尝试设置状态码
        if (!res.writableEnded) {
            let errorMessage = 'An unknown error occurred';
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            res.status(500).json({ error: 'Failed to call Gemini API', details: errorMessage });
        }
    }
}
```eof

### 总结一下优化点：

1.  **性能提升**：将 `GoogleGenerativeAI` 和 `getGenerativeModel` 的初始化放在 `handler` 函数外部。这样 Vercel 就可以在函数“热启动”时复用它们，响应更快。
2.  **更健壮的密钥处理**：在 `handler` 内部也增加了一次密钥检查，这样即使运行时环境变量出现问题，也能给前端返回一个清晰的错误信息，而不是让整个服务崩溃。
3.  **核心体验升级 (流式传输)**：代码现在使用 `generateContentStream` 来处理响应。前端不再需要等待漫长的“加载中”，而是可以即时看到逐字生成的回答，体验大幅提升。
4.  **更详细的安全反馈**：在流式传输中增加了对 `promptFeedback` 的检查，如果内容因为安全策略被阻止，可以给前端更明确的提示。