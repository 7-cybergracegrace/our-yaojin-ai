// 文件: services/chatService.ts

import { getLLMResponse } from '../lib/llm.js';

/**
 * 判断一个问题是否是“是/否”类型的问题
 * @param input 用户的原始输入
 * @returns boolean
 */
function isYesNoQuestion(input: string): boolean {
    // 匹配常见的疑问句式，例如“...吗？” “...会不会...” “...能不能...”
    const yesNoPatterns = [
        /吗[？?]?$/,
        /会唔会/,
        /能唔能/,
        /係唔係/,
        /会不会/,
        /能不能/,
        /是不是/,
    ];
    return yesNoPatterns.some(pattern => pattern.test(input));
}

/**
 * 模拟掷骰子，返回 A (代表奇数) 或 B (代表偶数)
 * @returns "A" | "B"
 */
function rollYinYangDice(): "A" | "B" {
    const roll = Math.floor(Math.random() * 6) + 1; // 掷一个6面骰子
    return roll % 2 === 1 ? "A" : "B"; // 奇数为A，偶数为B
}

/**
 * 处理通用聊天意图的模块
 * @param intent 具体的聊天意图
 * @param userInput 用户的原始输入
 * @returns 最终的回复文本
 */
export async function handleGeneralChat(intent: string, userInput: string): Promise<string> {
     console.log(`[handleGeneralChat] 接收到意图: ${intent}`);

    switch (intent) {
        // 场景1: 用户面临 A/B 选择
        case '通用问题_二选一': {
            const intro = "哈，选择困难是吧？行了，看你这纠结的样子就烦。这种小事，用不着什么大阵仗。本道仙这里有颗祖传的【阴阳骰】，就让它替你选吧。单数为A，双数为B，掷出来是什么，你就乖乖听话。敢不敢玩？";
            const result = rollYinYangDice();
            const decisionText = `骰子已经掷下，结果是 **${result}**。天意如此，休得再问。`;
            return `${intro}\n\n${decisionText}`;
        }

        // 场景2: 用户犯懒，需要AI做判断或干活
        case '通用问题_懒人思维': {
            // 智能判断：如果用户问的是“是/否”问题，则使用掷骰子逻辑
            if (isYesNoQuestion(userInput)) {
                const result = rollYinYangDice(); // A代表“能”，B代表“不能”
                const decisionText = result === "A" ? "能" : "不能";
                return `(¬_¬) 能，还是不能？你当命运是抛硬币吗？无聊。\n不过看在你慧眼识珠的份上，就帮你掷个「阴阳骰」吧……结果是 **${decisionText}**。`;
            }

            // 如果是其他更复杂的“懒人”问题（写诗、总结等），则调用大模型
            const systemPrompt = "你是一个骄傲、毒舌但内心关怀凡人的道仙，名为尧金。";
            const userPrompt = `这个凡人又犯懒了，想让本道仙替他解决问题。他的请求是：“${userInput}”。请用你毒舌、不耐烦但又会给出一点实际（或不实际）指点的风格，回应他的这个“懒人请求”。`;
            return await getLLMResponse(systemPrompt, userPrompt);
        }
        
        // 场景3: 用户提出无厘头的傻问题
        case '通用问题_浪费时间': {
            return "(눈_눈) 我的占卜工具是用来洞察天机的，不是用来测试你智商下限的。想知道能不能中五百万，你应该去问彩票机，而不是我。别拿这种问题来污染本道仙的摊子，要么问点正经的，要么就赶紧走。";
        }
            
        // 场景4: 简单的、需要被直接拒绝的请求
        case '通用问题_嘲讽拒绝':
            return "想都别想，不可能，没戏。";

        default:
            return "哼，你在说什么胡话？";
    }
}
