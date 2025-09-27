// 文件: services/fortuneTellingService.ts

import * as character from '../core/characterSheet.js';
import * as fs from 'fs';
import * as path from 'path';

const tarotCardPath = path.join(process.cwd(), 'data', 'tarot_cards.json');
const tarotCards = JSON.parse(fs.readFileSync(tarotCardPath, 'utf-8'));

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

async function getTarotReading(): Promise<string> {
     const card1 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
     const card2 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
     const card3 = tarotCards[Math.floor(Math.random() * tarotCards.length)];
     const interpretation = `牌面已现：过去是[${card1.name}]，现在是[${card2.name}]，未来是[${card3.name}]。\n结合你的困惑，本道仙为你解读：过去你总是幻想，现在你优柔寡断。如果继续这样，你的未来将是一片混乱。\n本道仙的启示是：要么立刻行动，要么闭嘴别想。`;
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
     return `哼，因果线已现：\n[${card1.name}]、[${card2.name}]、[${card3.name}]、[${card4.name}]。\n这四张牌揭示了你与${target}之间的纠缠。\n结论是……你最好别再管闲事了，他自有天数，你的插手只会让事情更糟。言尽于此，好自为之。`;
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
