import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { withApiHandler } from '../lib/apiHandler';

// 从环境变量中获取API密钥
const API_KEY = process.env.GEMINI_API_KEY;

// 初始化 Gemini 客户端
if (!API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable not found.');
}

const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
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

export default withApiHandler(['POST'], async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  const { prompt } = req.body;

  if (!prompt) {
    res.status(400).json({ error: 'Missing `prompt` in the request body.' });
    return;
  }

  try {
    const result = await model.generateContentStream(prompt);

    // 设置流式响应头
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    });

    for await (const chunk of result.stream) {
      if (chunk.promptFeedback?.blockReason) {
        const blockReason = chunk.promptFeedback.blockReason;
        console.warn(`Stream blocked due to: ${blockReason}`);
        res.write(JSON.stringify({ error: `Request was blocked due to ${blockReason}.` }) + '\n');
        break;
      }

      const text = chunk.text();
      if (text) {
        res.write(JSON.stringify({ text }) + '\n');
      }
    }

    res.end();
  } catch (error) {
    console.error('Failed to call Gemini API:', error);

    if (!res.writableEnded) {
      let errorMessage = 'An unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      res.status(500).json({ error: 'Failed to call Gemini API', details: errorMessage });
    }
  }
});


