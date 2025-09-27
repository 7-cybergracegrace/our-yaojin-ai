// 文件: services/fortuneTellingService.ts

import * as character from '../core/characterSheet.js';
import * as fs from 'fs';
import * as path from 'path';
// 1. 导入我们真正的大模型调用函数
import { getLLMResponse } from '../lib/llm.js';

interface TarotCard {
    name: string;
    meaning: string;
}

const tarotCardPath = path.join(process.cwd(), 'data', 'tarot_cards.json');
const tarotCards: TarotCard[] = JSON.parse(fs.readFileSync(tarotCardPath, 'utf-8'));

type GuidanceFlowKey = keyof typeof character.guidanceFlows;

/**
 * 专门处理塔罗牌解读的函数，包含核心的“抽牌”逻辑
 */
async function getTarotReading(userTrouble: string): Promise<string> {
    const card1 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    const card2 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    const card3 = tarotCards[Math.floor(Math.random() * tarotCards.length)];

    const userPrompt = `
# 任务
为一个凡人解读塔罗牌。不要仅仅罗列牌意，要将三张牌的含义（过去、现在、未来）与TA的困惑有机地结合起来，给出一个连贯、完整且带有你独特风格的解读。

# 凡人的困惑
"${userTrouble}"

# 抽到的牌面
- 过去: ${card1.name} - ${card1.meaning}
- 现在: ${card2.name} - ${card2.meaning}
- 未来: ${card3.name} - ${card3.meaning}

# 你的解读：
`;
    return await callLLMForComment(userPrompt);
}

/**
 * 专门处理窥探因果的函数，包含核心的“抽牌”逻辑
 */
async function getKarmaReading(target: string): Promise<string> {
    const card1 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    const card2 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    const card3 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    const card4 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    
    const userPrompt = `
# 任务
为一个人类窥探其与他人之间的“因果”。不要仅仅罗列牌意，要将四张牌揭示的线索，与“${target}”这个对象结合起来，给出一个连贯、神秘且带有你独特风格的解读。你的解读应该是警告性质的，劝告凡人不要过多纠缠。

# 抽到的牌面
[${card1.name}]、[${card2.name}]、[${card3.name}]、[${card4.name}]。

# 你的解读 (关于人类与 ${target} 之间纠缠的结论):
`;
    return await callLLMForComment(userPrompt);
}

/**
 * 主函数，负责调度所有“仙人指路”的流程（已大幅优化）
 */
export async function handleFortuneTelling(
     intent: string,
     userInput: string,
     currentStep: number = 0
): Promise<string> {
     const flowKey = intent.replace('仙人指路_', '') as GuidanceFlowKey;
     const flowConfig = character.guidanceFlows[flowKey];

     if (!flowConfig) {
         return "哼，你的问题超出了本道仙的业务范围，换个问题吧。";
     }
    
     if (currentStep === 0 || currentStep === 1) {
         const stepConfig = flowConfig.steps?.[currentStep]?.config;
        if (!stepConfig?.message) return "本道仙不知该说什么了。";
         return stepConfig.message.replace('{userInput}', userInput);
     }
     
     if (currentStep === 2) {
        // 对于需要特殊处理的意图（比如抽牌），在这里进行分发
        switch(flowKey) {
            case 'tarot_reading':
                return getTarotReading(userInput);
            case 'karma_reading':
                return getKarmaReading(userInput);
            default:
                // 对于其他所有标准流程，执行通用逻辑
                const stepConfig = flowConfig.steps?.[2]?.config;
                
                // 如果配置了 generation_rules，就调用大模型
                if (stepConfig?.generation_rules) {
                    const rules = stepConfig.generation_rules;
                    const prompt = `
# 任务
根据用户的输入和以下规则，生成一段占卜结果。
# 用户输入: "${userInput}"
# 生成规则: ${rules.content_points.join('; ')}
# 参考示例: ${rules.example}
# 你的解读:`;
                    return await callLLMForComment(prompt);
                }

                // 如果只配置了 message，就直接返回
                if (stepConfig?.message) {
                    return stepConfig.message;
                }

                return "本道仙暂时无法解析，请稍后再试。";
        }
     }

     return "本道仙迷路了，请重新开始吧。";
}

/**
 * 统一的、接入了真实大模型的调用函数
 * @param userPrompt 发给大模型的具体指令
 * @returns 大模型的回复
 */
async function callLLMForComment(userPrompt: string): Promise<string> {
    const systemPrompt = "你是一个骄傲、毒舌但内心关怀人类的蛇兽人，喜欢自称“本道仙”，名为尧金。";
    return await getLLMResponse(systemPrompt, userPrompt);
}
