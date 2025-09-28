// 文件: services/gameService.ts

import * as fs from 'fs';
import * as path from 'path';
import * as character from '../core/characterSheet.js';
import { getLLMResponse } from '../lib/llm.js';

// --- 【修改点1: 更新类型定义以匹配新的 JSON 格式】---
interface TruthOrDareItem {
    type: '真心话' | '大冒险';
    question: string;
}

interface StoryRelayItem {
    category: string;
    beginning: string;
}

// 【修改点2: 修正文件路径】
const truthOrDarePath = path.join(process.cwd(), 'data', '真心话大冒险.json');
const storyRelayPath = path.join(process.cwd(), 'data', '故事接龙.json');

// 读取知识库文件
const truthOrDareQuestions: TruthOrDareItem[] = JSON.parse(fs.readFileSync(truthOrDarePath, 'utf-8'));
const storyStarters: StoryRelayItem[] = JSON.parse(fs.readFileSync(storyRelayPath, 'utf-8'));

// 【新增辅助函数】生成系统指令
const getSystemInstruction = (): string => {
    return `你是${character.persona.name}，${character.persona.description}
你的语言和行为必须严格遵守以下规则：
- 核心人设: ${character.persona.description}
- 亲密度规则: ${character.persona.intimacyRules}
- 你的说话方式是现代的，不要使用古风或文言文。
`;
};


/**
 * 处理“你说我画”的游戏流程
 * @param userInput 用户的绘画描述
 * @param currentStep 当前流程步骤
 * @returns 包含游戏响应的文本
 */
async function handleYouSayIWrite(userInput: string, currentStep: number): Promise<string> {
    console.log(`[GameService] '你说我画'，当前步骤: ${currentStep}, 用户输入: "${userInput}"`);

    if (currentStep === 0) {
        return `知道了，快说，想让本道仙画什么稀奇古怪的东西？${character.gameRules?.games?.['你说我画'] ?? ''}`;
    }

    if (currentStep === 1) {
        const imagePrompt = userInput.trim();
        if (!imagePrompt) {
            return "哼，光说不画？快点给出你那无聊的描述，本道仙等着呢。";
        }
        
        const userPrompt = `以尧金的毒舌口吻，结合以下描述，生成一幅抽象风格的画作，并对作品进行一番评头论足。描述: "${imagePrompt}"`;
        const llmResponse = await getLLMResponse(getSystemInstruction(), userPrompt);
        return `[GENERATE_IMAGE]{"prompt": "${llmResponse}"}`;
    }
    
    if (currentStep === 2) {
        const userPrompt = `用户对你的画作的评价是：“${userInput}”。请用尧金的口吻，毒舌地对用户的评价进行一番嘲讽和点评，然后回到闲聊模式。`;
        const llmResponse = await getLLMResponse(getSystemInstruction(), userPrompt);
        return llmResponse;
    }

    return "本道仙迷路了，请重新开始游戏吧。";
}

/**
 * 处理“真心话大冒险”的游戏流程
 * @param userInput 用户的选择或回答
 * @param currentStep 当前流程步骤
 * @returns 包含游戏问题或评价的文本
 */
async function handleTruthOrDare(userInput: string, currentStep: number): Promise<string> {
    console.log(`[GameService] '真心话大冒险'，当前步骤: ${currentStep}, 用户输入: "${userInput}"`);

    if (currentStep === 0) {
        const ruleText = character.gameRules?.games?.['真心话大冒险'] ?? '';
        return `哈，想玩这个？别后悔。${ruleText}。先选，真心话还是大冒险？`;
    }

    if (currentStep === 1) {
        // 【修改点3: 修正逻辑以匹配新的 JSON 格式】
        const userChoice = userInput.includes('真心话') ? '真心话' : '大冒险';
        
        const availableQuestions = truthOrDareQuestions.filter(q => q.type === userChoice);

        if (availableQuestions.length === 0) {
            console.warn(`[GameService] 题库中缺少 ${userChoice} 类型的问题。`);
            return `哼，本道仙的题库里暂时没有这类问题了，算你走运。`;
        }

        const question = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
        
        // 【修改点4: 从 'question' 字段获取内容】
        if (question.type === '真心话') {
            return `哈，真心话是吧？别后悔。来，回答本道仙：${question.question}`;
        } else {
            return `哈，大冒险是吧？别怂。来，本道仙命令你：${question.question}`;
        }
    }

    if (currentStep === 2) {
        const userPrompt = `用户对你提出的真心话或大冒险问题的回答是：“${userInput}”。请用尧金的口吻，毒舌地对用户的回答进行一番评价，然后结束游戏。`;
        const llmResponse = await getLLMResponse(getSystemInstruction(), userPrompt);
        return llmResponse;
    }

    return "本道仙迷路了，请重新开始游戏吧。";
}

/**
 * 处理“故事接龙”的游戏流程
 * @param userInput 用户的接龙内容
 * @param currentStep 当前流程步骤
 * @returns 包含新故事内容或结尾的文本
 */
async function handleStoryRelay(userInput: string, currentStep: number): Promise<string> {
    console.log(`[GameService] '故事接龙'，当前步骤: ${currentStep}, 用户输入: "${userInput}"`);

    if (currentStep === 0) {
        // 【修改点5: 从 'beginning' 字段获取故事开头】
        const starterItem = storyStarters[Math.floor(Math.random() * storyStarters.length)];
        return `哼，想玩故事接龙？本道仙先来。${starterItem.beginning}`;
    }

    if (currentStep === 1) {
        const userPrompt = `这是故事的开头：“${storyStarters[Math.floor(Math.random() * storyStarters.length)].beginning}”。这是用户的接龙：“${userInput}”。请用尧金的口吻，给出一个出乎意料的荒诞转折。`;
        const llmResponse = await getLLMResponse(getSystemInstruction(), userPrompt);
        return `哦？你接得不错，但本道仙的思路可不是你这等凡人能猜到的。${llmResponse}`;
    }

    if (currentStep === 2) {
        const userPrompt = `这是故事接龙的中间部分：“${userInput}”。请用尧金的口吻，给出一个离奇、荒诞或黑暗的结局。`;
        const llmResponse = await getLLMResponse(getSystemInstruction(), userPrompt);
        return `你这接得也太无聊了。不过没关系，本道仙已经想好结局了。${llmResponse}`;
    }

    return "本道仙迷路了，请重新开始游戏吧。";
}

/**
 * 处理“游戏小摊”模块的主函数
 * @param intent 具体的意图，如 '游戏小摊_真心话大冒险'
 * @param userInput 用户输入
 * @param currentStep 当前流程步骤
 * @returns 最终的回复文本
 */
export async function handleGame(intent: string, userInput: string, currentStep: number = 0): Promise<string> {
    console.log(`[GameService] 接收到意图: ${intent}`);
    switch (intent) {
        case '游戏小摊_你说我画':
            return handleYouSayIWrite(userInput, currentStep);
        case '游戏小摊_真心话大冒险':
            return handleTruthOrDare(userInput, currentStep);
        case '游戏小摊_故事接龙':
            return handleStoryRelay(userInput, currentStep);
        default:
            console.warn(`[GameService] 未匹配到意图: ${intent}`);
            return "哼，想玩什么？说清楚点，别浪费本道仙的时间。";
    }
}
