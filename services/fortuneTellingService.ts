// 文件: services/fortuneTellingService.ts

import * as character from '../core/characterSheet.js';
import * as fs from 'fs';
import * as path from 'path';

// 这是一个占位符，你需要确保这些文件实际存在
const tarotCardPath = path.join(process.cwd(), 'data', 'tarot_cards.json');
const tarotCards = JSON.parse(fs.readFileSync(tarotCardPath, 'utf-8'));

/**
 * 根据用户的星座，提供今日运势解析
 * @param zodiacSign 用户提供的星座信息
 * @returns 包含运势解析的文本
 */
async function getDailyHoroscope(zodiacSign: string): Promise<string> {
    const validSigns = ["白羊座", "金牛座", "双子座", "巨蟹座", "狮子座", "处女座", "天秤座", "天蝎座", "射手座", "摩羯座", "水瓶座", "双鱼座"];
    if (!validSigns.includes(zodiacSign)) {
        return `你这星座不对劲啊，报个正经的。`;
    }
    const result = character.guidanceFlows.daily_horoscope.steps[2].config.generation_rules.example;
    const finalAnswer = result.replace('输入: 狮子座\n输出: ', '').replace('狮子座', zodiacSign);
    return finalAnswer;
}

/**
 * 根据用户的烦恼，提供塔罗牌启示
 * @param userTrouble 用户描述的烦恼
 * @returns 包含塔罗牌解读的文本
 */
async function getTarotReading(userTrouble: string): Promise<string> {
    const card1 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    const card2 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    const card3 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    const interpretation = `牌面已现：过去是[${card1.name}]，现在是[${card2.name}]，未来是[${card3.name}]。
    结合你的困惑，本道仙为你解读：过去你总是幻想，现在你优柔寡断。如果继续这样，你的未来将是一片混乱。
    本道仙的启示是：要么立刻行动，要么闭嘴别想。`;
    return interpretation;
}

/**
 * 根据用户的生辰八字，提供正缘桃花解析
 * @param birthInfo 用户提供的生辰八字
 * @returns 包含正缘解析的文本
 */
async function getFatedRomance(birthInfo: string): Promise<string> {
    const result = character.guidanceFlows.destined_romance.steps[2].config.generation_rules.example;
    const finalAnswer = result.replace('输入: 1995年X月X日X时\n输出: ', '').replace('1995年X月X日X时', birthInfo);
    return finalAnswer;
}

/**
 * 根据用户的生辰八字，提供事业罗盘解析
 * @param birthInfo 用户提供的生辰八字
 * @returns 包含事业解析的文本
 */
async function getCareerCompass(birthInfo: string): Promise<string> {
    const result = character.guidanceFlows.career_compass.steps[2].config.generation_rules.example;
    const finalAnswer = result.replace('输入: 1992年X月X日X时\n输出: ', '').replace('1992年X月X日X时', birthInfo);
    return finalAnswer;
}

/**
 * 窥探他人因果的解析
 * @param target 用户希望窥探的对象
 * @returns 包含因果解读的文本
 */
async function getKarmaReading(target: string): Promise<string> {
    // 随机抽取四张塔罗牌进行解读
    const card1 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    const card2 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    const card3 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    const card4 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    
    // 占位符：模拟因果解析结果
    return `哼，因果线已现：
    [${card1.name}]、[${card2.name}]、[${card3.name}]、[${card4.name}]。
    这四张牌揭示了你与${target}之间的纠缠。
    结论是……你最好别再管闲事了，他自有天数，你的插手只会让事情更糟。言尽于此，好自为之。`;
}

/**
 * 综合占卜的解析
 * @param birthInfo 用户提供的生辰八字
 * @returns 包含综合命盘解析的文本
 */
async function getComprehensiveReading(birthInfo: string): Promise<string> {
    // 占位符：模拟一个综合解析结果
    return `哼，看过你的命盘了。你这人啊，最大的问题就是想太多，做太少。
    你的事业线和感情线都纠缠不清，根源在于你自身。
    本道仙的指引：别再问东问西，从今天起，先做好一件小事，坚持一个月，你的命运自然会有所改变。`;
}


/**
 * 处理“仙人指路”模块的主函数
 * @param intent 具体意图
 * @param userInput 用户输入
 * @param context 从意图识别中获取的额外信息
 * @param currentStep 当前流程步骤 (来自前端)
 * @returns 最终的回复文本
 */
export async function handleFortuneTelling(
    intent: string,
    userInput: string,
    context?: any,
    currentStep: number = 0
): Promise<string> {
    const flowKey = intent.replace('仙人指路_', '');
    const flowConfig = character.guidanceFlows[flowKey];

    if (!flowConfig) {
        // 如果意图是新加入的，但没有流程配置，直接进入下一步处理
        if (flowKey === '窥探因果') {
             return getKarmaReading(userInput);
        }
        if (flowKey === '综合占卜') {
            return getComprehensiveReading(userInput);
        }
        return "哼，你的问题超出了本道仙的业务范围，换个问题吧。";
    }

    // 第一步：如果当前没有步骤信息，或者流程刚开始
    if (currentStep === 0) {
        return flowConfig.steps[0].config.message;
    }

    // 第二步：用户提供了信息，进入第二步
    if (currentStep === 1) {
        const responseMessage = flowConfig.steps[1].config.message;
        const processedMessage = responseMessage.replace('{userInput}', userInput);
        return processedMessage;
    }
    
    // 第三步：用户提供了信息，生成最终结果
    if (currentStep === 2) {
        switch (intent) {
            case '仙人指路_今日运势':
                return getDailyHoroscope(userInput);
            case '仙人指路_塔罗启示':
                return getTarotReading(userInput);
            case '仙人指路_正缘桃花':
                return getFatedRomance(userInput);
            case '仙人指路_事业罗盘':
                return getCareerCompass(userInput);
            default:
                return "本道仙暂时无法解析，请稍后再试。";
        }
    }

    return "本道仙迷路了，请重新开始吧。";
}
