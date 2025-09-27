// 文件: lib/llm.ts

const API_URL = 'https://api.bltcy.ai';
const API_KEY = process.env.BLTCY_API_KEY;

/**
 * 一个通用的、非流式的函数，用于调用大模型API并获取回复
 * @param systemPrompt 系统的角色设定指令
 * @param userPrompt 用户的具体问题或指令
 * @returns 大模型生成的文本回复
 */
export async function getLLMResponse(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!API_KEY) {
        console.error('BLTCY_API_KEY is not configured.');
        return "哼，本道仙今日法力受阻，无法回应你的请求。";
    }

    try {
        const response = await fetch(`${API_URL}/vV1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gemini-2.5-flash',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                stream: false,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`API request failed with status ${response.status}: ${errorBody}`);
            return "天机混乱，本道仙算不出来。";
        }

        const result = await response.json();
        return result.choices?.[0]?.message?.content?.trim() || "天机不可泄露，换个问题吧。";

    } catch (error) {
        console.error("LLM API call error:", error);
        return "唉，本道仙今日元神不稳，无法思考。";
    }
}
