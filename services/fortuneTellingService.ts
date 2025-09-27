// 文件: services/fortuneTellingService.ts

import * as character from '../core/characterSheet.js';
import * as fs from 'fs';
import * as path from 'path';

// 这是一个占位符，你需要确保这些文件实际存在
const tarotCardPath = path.join(process.cwd(), 'data', 'tarot_cards.json');
const tarotCards = JSON.parse(fs.readFileSync(tarotCardPath, 'utf-8'));

// 【类型修正】为了解决 TS7053 (没有索引签名) 的问题，我们明确告诉 TypeScript
// flowKey 的类型必须是 character.guidanceFlows 对象中已存在的键之一。
type GuidanceFlowKey = keyof typeof character.guidanceFlows;


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

    // 【代码健壮性修正】为了解决 TS2532 (对象可能为 'undefined')，这里使用了可选链 (?.)
    // 即使中间某个属性（如 steps）不存在，代码也不会在运行时报错，而是会安全地返回 undefined。
    const result = character.guidanceFlows.daily_horoscope?.steps?.[2]?.config?.generation_rules?.example;

    // 【代码健壮性修正】增加了对 result 是否存在的判断
    if (!result) {
        return "今日星象紊乱，本道仙暂时算不出来，明日再来吧。";
    }

    const finalAnswer = result.replace('输入: 狮子座\n输出: ', '').replace('狮子座', zodiacSign);
    return finalAnswer;
}

/**
 * 提供塔罗牌启示
 * 【函数签名修正】移除了未使用的参数 userTrouble，以解决 TS6133 错误。
 * @returns 包含塔罗牌解读的文本
 */
async function getTarotReading(): Promise<string> {
    const card1 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    const card2 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    const card3 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    const interpretation = `牌面已现：过去是[${card1.name}]，现在是[${card2.name}]，未来是[${card3.name}]。
    结合你的困惑，本道仙为你解读：过去你总是幻想，现在你优柔寡断。如果继续这样，你的未来将是一片混乱。
    本道仙的启示是：要么立刻行动，要么闭嘴别想。`;
    return interpretation;
}

/**
 * 提供正缘桃花解析
 * 【函数签名修正】移除了未使用的参数 birthInfo，以解决 TS6133 错误。
 * @param userInput 用户提供的生辰八字
 * @returns 包含正缘解析的文本
 */
async function getFatedRomance(userInput: string): Promise<string> {
    // 【代码健壮性修正】同样使用了可选链 (?.) 来确保访问安全
    const result = character.guidanceFlows.destined_romance?.steps?.[2]?.config?.generation_rules?.example;
    
    if (!result) {
        return "今日姻缘线被遮蔽了，看不清，改日再来。";
    }

    const finalAnswer = result.replace('输入: 1995年X月X日X时\n输出: ', '').replace('1995年X月X日X时', userInput);
    return finalAnswer;
}

/**
 * 提供事业罗盘解析
 * 【函数签名修正】移除了未使用的参数 birthInfo，以解决 TS6133 错误。
 * @param userInput 用户提供的生辰八字
 * @returns 包含事业解析的文本
 */
async function getCareerCompass(userInput: string): Promise<string> {
    // 【代码健壮性修正】同样使用了可选链 (?.) 来确保访问安全
    const result = character.guidanceFlows.career_compass?.steps?.[2]?.config?.generation_rules?.example;

    if (!result) {
        return "今日事业运势如雾里看花，看不真切。";
    }

    const finalAnswer = result.replace('输入: 1992年X月X日X时\n输出: ', '').replace('1992年X月X日X时', userInput);
    return finalAnswer;
}

/**
 * 窥探他人因果的解析
 * @param target 用户希望窥探的对象
 * @returns 包含因果解读的文本
 */
async function getKarmaReading(target: string): Promise<string> {
    const card1 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    const card2 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    const card3 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    const card4 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    
    return `哼，因果线已现：
    [${card1.name}]、[${card2.name}]、[${card3.name}]、[${card4.name}]。
    这四张牌揭示了你与${target}之间的纠缠。
    结论是……你最好别再管闲事了，他自有天数，你的插手只会让事情更糟。言尽于此，好自为之。`;
}

/**
 * 综合占卜的解析
 * 【函数签名修正】移除了未使用的参数 birthInfo，以解决 TS6133 错误。
 * @returns 包含综合命盘解析的文本
 */
async function getComprehensiveReading(): Promise<string> {
    return `哼，看过你的命盘了。你这人啊，最大的问题就是想太多，做太少。
    你的事业线和感情线都纠缠不清，根源在于你自身。
    本道仙的指引：别再问东问西，从今天起，先做好一件小事，坚持一个月，你的命运自然会有所改变。`;
}


/**
 * 处理“仙人指路”模块的主函数
 * @param intent 具体意图
 * @param userInput 用户输入
 * 【函数签名修正】移除了未使用的参数 context，以解决 TS6133 错误。
 * @param currentStep 当前流程步骤 (来自前端)
 * @returns 最终的回复文本
 */
export async function handleFortuneTelling(
    intent: string,
    userInput: string,
    currentStep: number = 0
): Promise<string> {
    // 【类型修正】通过类型断言 (as)，将动态字符串 flowKey 与我们上面定义的 GuidanceFlowKey 类型关联起来
    // 这样 TypeScript 就知道 flowKey 是 guidanceFlows 上的一个合法键，从而解决了 TS7053 错误。
    const flowKey = intent.replace('仙人指路_', '') as GuidanceFlowKey;
    const flowConfig = character.guidanceFlows[flowKey];

    if (!flowConfig) {
        // 如果意图是新加入的，但没有流程配置，直接进入下一步处理
        if (flowKey === '窥探因果') {
             return getKarmaReading(userInput);
        }
        if (flowKey === '综合占卜') {
            // 【逻辑修正】这里的函数调用不需要参数了
            return getComprehensiveReading();
        }
        return "哼，你的问题超出了本道仙的业务范围，换个问题吧。";
    }
    
    // 【代码健壮性修正】flowConfig 存在，但 steps 数组可能为空或不够长，增加判断
    if (currentStep === 0) {
        return flowConfig.steps?.[0]?.config?.message ?? "你想算点什么？"; // 使用空值合并运算符提供默认值
    }

    if (currentStep === 1) {
        const responseMessage = flowConfig.steps?.[1]?.config?.message ?? "收到，让本道仙看看... ({userInput})";
        const processedMessage = responseMessage.replace('{userInput}', userInput);
        return processedMessage;
    }
    
    if (currentStep === 2) {
        switch (intent) {
            case '仙人指路_今日运势':
                return getDailyHoroscope(userInput);
            case '仙人指路_塔罗启示':
                // 【逻辑修正】这里的函数调用不需要参数了
                return getTarotReading();
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
