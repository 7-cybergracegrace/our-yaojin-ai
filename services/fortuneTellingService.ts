// 文件: services/fortuneTellingService.ts

import * as character from '../core/characterSheet.js';
import * as fs from 'fs';
import * as path from 'path';

// 为塔罗牌数据定义一个清晰的类型
interface TarotCard {
    name: string;
    meaning: string;
}

const tarotCardPath = path.join(process.cwd(), 'data', 'tarot_cards.json');
const tarotCards: TarotCard[] = JSON.parse(fs.readFileSync(tarotCardPath, 'utf-8'));

type GuidanceFlowKey = keyof typeof character.guidanceFlows;

async function getDailyHoroscope(zodiacSign: string): Promise<string> {
     const validSigns = ["白羊座", "金牛座", "双子座", "巨蟹座", "狮子座", "处女座", "天秤座", "天蝎座", "射手座", "摩羯座", "水瓶座", "双鱼座"];
     if (!validSigns.includes(zodiacSign)) {
         return `你这星座不对劲啊，报个正经的。`;
     }
     const result = character.guidanceFlows.daily_horoscope?.steps?.[2]?.config?.generation_rules?.example;
    if (!result) {
        return "今日星象紊乱，本道仙暂时算不出来，明日再来吧。";
    }
     const finalAnswer = result.replace('输入: 狮子座\n输出: ', '').replace('狮子座', zodiacSign);
     return finalAnswer;
}

async function getTarotReading(userTrouble: string): Promise<string> {
    const card1 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    const card2 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    const card3 = tarotCards[Math.floor(Math.random() * tarotCards.length)];

    const prompt = `
# 角色
你是一个骄傲、毒舌但内心关怀凡人的道仙，名为尧金。

# 任务
为一个凡人解读塔罗牌。不要仅仅罗列牌意，要将三张牌的含义（过去、现在、未来）与TA的困惑有机地结合起来，给出一个连贯、完整且带有你独特风格的解读。解读要先分析，最后给出一个明确的指引或结论。

# 凡人的困惑
"${userTrouble}"

# 抽到的牌面
- 过去: ${card1.name} - ${card1.meaning}
- 现在: ${card2.name} - ${card2.meaning}
- 未来: ${card3.name} - ${card3.meaning}

# 你的解读：
`;

    const interpretation = await callLLMForComment(prompt); 
    return interpretation;
}

async function getFatedRomance(userInput: string): Promise<string> {
     const result = character.guidanceFlows.destined_romance?.steps?.[2]?.config?.generation_rules?.example;
    if (!result) {
        return "今日姻缘线被遮蔽了，看不清，改日再来。";
    }
     const finalAnswer = result.replace('输入: 1995年X月X日X时\n输出: ', '').replace('1995年X月X日X时', userInput);
     return finalAnswer;
}

async function getCareerCompass(userInput: string): Promise<string> {
     const result = character.guidanceFlows.career_compass?.steps?.[2]?.config?.generation_rules?.example;
    if (!result) {
        return "今日事业运势如雾里看花，看不真切。";
    }
     const finalAnswer = result.replace('输入: 1992年X月X日X时\n输出: ', '').replace('1992年X月X日X时', userInput);
     return finalAnswer;
}

async function getKarmaReading(target: string): Promise<string> {
    const card1 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    const card2 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    const card3 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    const card4 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    
    const prompt = `
# 角色
你是一个骄傲、毒舌但内心关怀凡人的道仙，名为尧金。

# 任务
为一个凡人窥探其与他人之间的“因果”。不要仅仅罗列牌意，要将四张牌揭示的线索，与“${target}”这个对象结合起来，给出一个连贯、神秘且带有你独特风格的解读。你的解读应该是警告性质的，劝告凡人不要过多纠缠。

# 抽到的牌面
[${card1.name}]、[${card2.name}]、[${card3.name}]、[${card4.name}]。

# 你的解读 (关于凡人与 ${target} 之间纠缠的结论):
`;
    
    return await callLLMForComment(prompt);
}

async function getComprehensiveReading(): Promise<string> {
     return `哼，看过你的命盘了。你这人啊，最大的问题就是想太多，做太少。\n你的事业线和感情线都纠缠不清，根源在于你自身。\n本道仙的指引：别再问东问西，从今天起，先做好一件小事，坚持一个月，你的命运自然会有所改变。`;
}

export async function handleFortuneTelling(
     intent: string,
     userInput: string,
     currentStep: number = 0
): Promise<string> {
     const rawFlowKey = intent.replace('仙人指路_', '');
     const flowKey = rawFlowKey as GuidanceFlowKey;
     const flowConfig = character.guidanceFlows[flowKey];

     if (!flowConfig) {
         if (rawFlowKey === '窥探因果') {
             return getKarmaReading(userInput);
         }
         if (rawFlowKey === '综合占卜') {
             return getComprehensiveReading();
         }
         return "哼，你的问题超出了本道仙的业务范围，换个问题吧。";
     }
    
     if (currentStep === 0) {
         return flowConfig.steps?.[0]?.config?.message ?? "你想算点什么？";
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

async function callLLMForComment(_prompt: string): Promise<string> {
     // TODO: 你需要自己实现这个函数，将 prompt 发送给大模型
     // 并返回大模型的回复。可以参考 api/chat.ts 里的 streamApiCall 函数来实现。
     return `（这里是大模型根据你的高级指令生成的毒舌解读）\n\n[调试信息: 原始指令已收到]`;
}
