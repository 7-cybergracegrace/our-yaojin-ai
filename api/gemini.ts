import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler } from '../lib/apiHandler.js';

// 从环境变量中获取中转站API密钥
const API_URL = 'https://api.bltcy.ai';
const API_KEY = process.env.BLTCY_API_KEY;

// 确保 API Key 已配置
if (!API_KEY) {
    throw new Error('BLTCY_API_KEY environment variable not found.');
}

export default withApiHandler(['POST'], async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    const { prompt } = req.body;

    if (!prompt) {
        res.status(400).json({ error: 'Missing `prompt` in the request body.' });
        return;
    }

    try {
        const response = await fetch(`${API_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json',
                'User-Agent': 'DMXAPI/1.0.0 (https://api.bltcy.ai)'
            },
            body: JSON.stringify({
                model: "gemini-2.5-flash",
                messages: [{ role: "user", content: prompt }],
                stream: true
            }),
        });

        if (!response.ok || !response.body) {
            let errorDetails = await response.text();
            try {
                const errorJson = JSON.parse(errorDetails);
                errorDetails = errorJson.error?.message || errorDetails;
            } catch (e) {
                // 如果不是 JSON 错误，则使用原始文本
            }
            throw new Error(`API request failed with status ${response.status}: ${errorDetails}`);
        }

        // 设置流式响应头
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'Cache-Control': 'no-cache',
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const cleanedLine = line.startsWith('data: ') ? line.substring(6) : line;
                        if (cleanedLine === '[DONE]') {
                            break;
                        }

                        const chunk = JSON.parse(cleanedLine);
                        const textDelta = chunk.choices?.[0]?.delta?.content;
                        if (textDelta) {
                            res.write(JSON.stringify({ text: textDelta }) + '\n');
                        }
                    } catch (e) {
                        console.error("Failed to parse stream chunk:", line);
                    }
                }
            }
        }

        res.end();
    } catch (error) {
        console.error('Failed to call API:', error);

        if (!res.writableEnded) {
            let errorMessage = 'An unknown error occurred';
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            res.status(500).json({ error: 'Failed to call the API', details: errorMessage });
        }
    }
});


