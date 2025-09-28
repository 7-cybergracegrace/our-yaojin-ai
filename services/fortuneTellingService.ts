// 文件: services/fortuneTellingService.ts

import * as character from '../core/characterSheet.js';
import * as fs from 'fs';
import * as path from 'path';
import { getLLMResponse } from '../lib/llm.js';

// --- 类型定义 ---
interface TarotCard {
    name: string;
    meaning: string;
}

interface MessageConfig {
    message: string;
}

interface GenerationRules {
    content_points: string[];
    example: string;
}

interface GenerationConfig {
    generation_rules: GenerationRules;
}

type StepConfig = MessageConfig | GenerationConfig;

const tarotCardPath = path.join(process.cwd(), 'data', 'tarot_cards.json');
const tarotCards: TarotCard[] = JSON.parse(fs.readFileSync(tarotCardPath, 'utf-8'));

type GuidanceFlowKey = keyof typeof character.guidanceFlows;

function mapIntentToFlowKey(intent: string): GuidanceFlowKey | undefined {
    const map: { [key: string]: GuidanceFlowKey } = {
        '仙人指路_今日运势': 'daily_horoscope',
        '仙人指路_塔罗启示': 'tarot_reading',
        '仙人指路_正缘桃花': 'destined_romance',
        '仙人指路_事业罗盘': 'career_compass',
        '仙人指路_窥探因果': 'karma_reading',
        '仙人指路_综合占卜': 'comprehensive_reading',
    };
    return map[intent];
}

// --- 工具函数：抽取随机牌 ---
function drawCards(count: number): TarotCard[] {
    return Array.from({ length: count }, () =>
        tarotCards[Math.floor(Math.random() * tarotCards.length)]
    );
}

// --- 塔罗解读 ---
async function getTarotReading(userTrouble: string): Promise<string> {
    console.log(`[FortuneTellingService] 开始进行塔罗牌解读，用户困惑: "${userTrouble}"`);
    const [card1, card2, card3] = drawCards(3);
    console.log(`[FortuneTellingService] 抽到的牌面：${card1.name}, ${card2.name}, ${card3.name}`);

    const userPrompt = `
# 任务
为一个凡人解读塔罗牌。不要仅仅罗列牌意，要将三张牌的含义（过去、现在、未来）与TA的困惑有机地结合起来，给出一个连贯、完整且带有你独特风格的解读。
# 凡人的困惑: "${userTrouble}"
# 抽到的牌面
- 过去: ${card1.name} - ${card1.meaning}
- 现在: ${card2.name} - ${card2.meaning}
- 未来: ${card3.name} - ${card3.meaning}
# 你的解读：`;
    return await callLLMForComment(userPrompt);
}

// --- 因果解读 ---
async function getKarmaReading(target: string): Promise<string> {
    console.log(`[FortuneTellingService] 开始窥探因果，目标: "${target}"`);
    const [card1, card2, card3, card4] = drawCards(4);
    console.log(`[FortuneTellingService] 抽到的牌面：${card1.name}, ${card2.name}, ${card3.name}, ${card4.name}`);
    
    const userPrompt = `
# 任务
为一个凡人窥探其与他人之间的“因果”。不要仅仅罗列牌意，要将四张牌揭示的线索，与“${target}”这个对象结合起来，给出一个连贯、神秘且带有你独特风格的解读。你的解读应该是警告性质的，劝告凡人不要过多纠缠。
# 抽到的牌面: [${card1.name}]、[${card2.name}]、[${card3.name}]、[${card4.name}]。
# 你的解读 (关于凡人与 ${target} 之间纠缠的结论):`;
    return await callLLMForComment(userPrompt);
}

// --- 大模型调用 ---
async function callLLMForComment(userPrompt: string): Promise<string> {
    console.log('[FortuneTellingService] 正在调用大模型生成评论...');
    const systemPrompt = `你是${character.persona.name}，${character.persona.description}
你的语言和行为必须严格遵守以下规则：
- 核心人设: ${character.persona.description}
- 亲密度规则: ${character.persona.intimacyRules}
- 你的说话方式是现代的，不要使用古风或文言文。
`;
    try {
        const response = await getLLMResponse(systemPrompt, userPrompt);
        console.log('[FortuneTellingService] 成功获取大模型响应。');
        return response;
    } catch (error) {
        console.error('[FortuneTellingService] 大模型调用失败:', error);
        throw error;
    }
}

// --- 主流程 ---
export async function handleFortuneTelling(
    intent: string,
    userInput: string,
    currentStep: number = 0
): Promise<string> {
    console.log(`[FortuneTellingService] 开始处理意图: ${intent}, 当前步骤: ${currentStep}`);
    const flowKey = mapIntentToFlowKey(intent);
    const flowConfig = flowKey ? character.guidanceFlows[flowKey] : undefined;

    if (!flowConfig) {
        console.warn(`[FortuneTellingService] 未找到匹配的流程配置：${intent}`);
        return "哼，你的问题超出了本道仙的业务范围，换个问题吧。";
    }

    if (currentStep === 1) {
        console.log(`[FortuneTellingService] 进入步骤 1，返回引导信息。`);
        const step1Config = flowConfig.steps?.[0]?.config as StepConfig;
        if (step1Config && 'message' in step1Config) {
            return step1Config.message;
        }
    }
    
    if (currentStep === 2) {
        console.log(`[FortuneTellingService] 进入步骤 2，处理用户输入并连续执行步骤 3。`);

        // 🔮 特殊 intent：直接触发专属占卜（等价于 step2+step3 一起走）
        if (intent === '仙人指路_塔罗启示') {
            return await getTarotReading(userInput);
        }
        if (intent === '仙人指路_窥探因果') {
            return await getKarmaReading(userInput);
        }

        // 👉 其它 intent 按照通用流程 step2 + step3
        let responseText = '';
        const step2Config = flowConfig.steps?.[1]?.config as StepConfig;
        if (step2Config && 'message' in step2Config) {
            responseText += step2Config.message.replace('{userInput}', userInput);
        }

        const step3Config = flowConfig.steps?.[2]?.config as StepConfig;
        if (step3Config) {
            if ('generation_rules' in step3Config) {
                const rules = step3Config.generation_rules;
                const prompt = `
# 任务
根据用户的输入和以下规则，生成一段占卜结果。
# 用户输入: "${userInput}"
# 生成规则: ${rules.content_points.join('; ')}
# 参考示例: ${rules.example}
# 你的解读:`;
                try {
                    const finalResult = await callLLMForComment(prompt);
                    responseText += '\n\n' + finalResult;
                    console.log(`[FortuneTellingService] 成功连续获取步骤2和3的响应。`);
                } catch (error) {
                    console.error('[FortuneTellingService] 连续执行大模型调用失败:', error);
                    responseText += '\n\n' + '哼，掐算天机时出了点岔子，稍后再说。';
                }
            } else if ('message' in step3Config) {
                responseText += '\n\n' + step3Config.message;
            } else {
                console.warn(`[FortuneTellingService] 步骤3配置无效：缺少'generation_rules'或'message'。`);
            }
        } else {
            console.warn(`[FortuneTellingService] 未找到步骤3配置。`);
        }
        
        return responseText;
    }
    
    console.warn(`[FortuneTellingService] 未匹配到任何步骤。`);
    return "本道仙暂时无法解析，请稍后再试。";
}
