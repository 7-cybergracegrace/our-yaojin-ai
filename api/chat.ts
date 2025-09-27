// 仅导入前端所需的类型和工具函数
// 【修正】移除了未使用的 'character', 'getDaoistDailyIntro', 'handleDaoistDailyChoice' 导入
import { Message, IntimacyLevel, Flow } from '../types/index.js';

// --- 新增：用于调用 /api/chat 的函数 ---
// 这个函数处理流式响应，需要一个回调函数 (onChunk) 来处理收到的每一段数据
export async function streamChatResponse(
    payload: {
        text: string;
        imageBase64: string | null;
        history: Message[];
        intimacy: IntimacyLevel;
        userName: string;
        // 【修正】移除了后端未使用的 currentFlow 参数
    },
    onChunk: (chunk: any) => void, // 回调函数，用于处理数据块
    onError: (error: Error) => void // 错误处理函数
) {
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok || !response.body) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // 保留不完整的行

            for (const line of lines) {
                if (line.trim()) {
                    try {
                        onChunk(JSON.parse(line));
                    } catch (e) {
                        console.error("Failed to parse stream chunk:", line);
                    }
                }
            }
        }

    } catch (error) {
        console.error("Chat API request error:", error);
        onError(error instanceof Error ? error : new Error('Unknown chat error'));
    }
}


// --- 新增：用于调用 /api/gemini 的函数 ---
export async function streamGeminiResponse(
    prompt: string,
    onChunk: (chunk: { text?: string; error?: string }) => void,
    onError: (error: Error) => void
) {
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        });

        if (!response.ok || !response.body) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim()) {
                    try {
                        onChunk(JSON.parse(line));
                    } catch (e) {
                        console.error("Failed to parse stream chunk:", line);
                    }
                }
            }
        }
    } catch (error) {
        console.error("Gemini API request error:", error);
        onError(error instanceof Error ? error : new Error('Unknown Gemini API error'));
    }
}


// 这个函数是前端处理文件逻辑，现在已添加正确的导出关键字
export const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (reader.result) { resolve(reader.result as string); }
            else { reject(new Error("Failed to read file as Data URL")); }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// 已修复
export async function getWeiboNewsFromBackend(): Promise<any[] | null> {
    try {
        const response = await fetch('/api/getWeiboNews', {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Failed to fetch Weibo news from backend API');
        return await response.json();
    } catch (error) {
        console.error("Failed to get Weibo news:", error);
        return null;
    }
}

// 已修复
export async function getDoubanMoviesFromBackend(): Promise<any[] | null> {
    try {
        const response = await fetch('/api/douban-movie', {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Failed to fetch Douban movie info from backend API');
        return await response.json();
    } catch (error) {
        console.error("Failed to get movie info:", error);
        return null;
    }
}
