import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler } from '../lib/apiHandler.js';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// === 初始化 Gemini ===
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) throw new Error('GEMINI_API_KEY environment variable not found.');
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ],
});

export default withApiHandler(['POST'], async (req: VercelRequest, res: VercelResponse) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Missing `prompt` in the request body.' });
  }

  const result = await model.generateContentStream(prompt);

  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Transfer-Encoding': 'chunked',
    'Cache-Control': 'no-cache',
  });

  for await (const chunk of result.stream) {
    if (chunk.promptFeedback?.blockReason) {
      res.write(JSON.stringify({ error: `Request was blocked due to ${chunk.promptFeedback.blockReason}` }) + '\n');
      break;
    }
    const text = chunk.text();
    if (text) {
      res.write(JSON.stringify({ text }) + '\n');
    }
  }

  res.end();
});

