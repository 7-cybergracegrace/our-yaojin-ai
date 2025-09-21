import type { VercelRequest, VercelResponse } from '@vercel/node';
// 确保所有需要的模块都从 @google/generative-ai 中正确导入
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// 从环境变量中获取API密钥
const API_KEY = process.env.GEMINI_API_KEY;

// 将初始化代码放在 handler 外部以提高性能
// 如果在启动时没有密钥，抛出错误以便快速发现问题
if (!API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable not found.');
}

const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
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
    // 只允许 POST 请求
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { prompt } = req.body;

    // 确保请求体中包含 prompt
    if (!prompt) {
        return res.status(400).json({ error: 'Missing `prompt` in the request body.' });
    }

    try {
        // 使用流式传输以获得更好的用户体验
        const result = await model.generateContentStream(prompt);

        // 设置流式响应头
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'Cache-Control': 'no-cache',
        });

        // 迭代返回的数据块并写入响应
        for await (const chunk of result.stream) {
            // 检查是否有因安全设置等原因导致的中断
            if (chunk.promptFeedback?.blockReason) {
                const blockReason = chunk.promptFeedback.blockReason;
                console.warn(`Stream blocked due to: ${blockReason}`);
                // 发送一个包含错误信息的JSON对象
                res.write(JSON.stringify({ error: `Request was blocked due to ${blockReason}.` }) + '\n');
                break; // 停止发送更多内容
            }
            
            const text = chunk.text();
            // 将每个数据块作为独立的JSON对象字符串发送
            res.write(JSON.stringify({ text }) + '\n');
        }

        // 结束响应流
        res.end();

    } catch (error) {
        console.error('Failed to call Gemini API:', error);
        
        // 确保在流式响应出错时不会再尝试发送JSON
        if (!res.writableEnded) {
            let errorMessage = 'An unknown error occurred';
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            res.status(500).json({ error: 'Failed to call Gemini API', details: errorMessage });
        }
    }
}
