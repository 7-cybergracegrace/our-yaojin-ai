// 文件: services/gameService.ts

import * as fs from 'fs';
import * as path from 'path';
import * as character from '../core/characterSheet.js';

// 假设你有专门的知识库，用于游戏数据
const truthOrDarePath = path.join(process.cwd(), 'data', '真心话大冒险.json');
const storyRelayPath = path.join(process.cwd(), 'data', '故事接龙.json');

// 读取知识库文件
const truthOrDareQuestions = JSON.parse(fs.readFileSync(truthOrDarePath, 'utf-8'));
const storyStarters = JSON.parse(fs.readFileSync(storyRelayPath, 'utf-8'));

/**
 * 处理“你说我画”的游戏流程
 * @param userInput 用户的绘画描述
 * @param currentStep 当前流程步骤
 * @returns 包含游戏响应的文本
 */
async function handleYouSayIWrite(userInput: string, currentStep: number): Promise<string> {
    if (currentStep === 0) {
        // 第一步：给出游戏规则并要求用户开始
        return `知道了，快说，想让本道仙画什么稀奇古怪的东西？${character.gameRules.games['你说我画']}`;
    }

    if (currentStep === 1) {
        // 第二步：用户给出描述，进行文生图
        const imagePrompt = userInput.trim();
        if (!imagePrompt) {
            return "哼，光说不画？快点给出你那无聊的描述，本道仙等着呢。";
        }
        
        // 占位符：这里是调用文生图API的逻辑
        // 返回一个特殊的格式，以便前端识别并调用文生图能力
        const promptForApi = `用尧金的毒舌口吻，结合用户的描述，生成一幅抽象风格的画作。描述: "${imagePrompt}"`;
        return `[GENERATE_IMAGE]{"prompt": "${promptForApi}"}`;
    }
    
    // 第三步：评价作品，回到闲聊模式
    if (currentStep === 2) {
        return `看好了，这就是本道仙的大作。你那点想象力，也就够本道仙涂鸦用的。`;
    }

    return "本道仙迷路了，请重新开始游戏吧。";
}

/**
 * 处理“真心话大冒险”的游戏流程
 * @param userInput 用户回答
 * @param currentStep 当前流程步骤
 * @returns 包含游戏问题或评价的文本
 */
async function handleTruthOrDare(userInput: string, currentStep: number): Promise<string> {
    if (currentStep === 0) {
        // 第一步：给出游戏规则并要求用户选择
        const ruleText = character.gameRules.games['真心话大冒险'];
        return `哈，想玩这个？别后悔。${ruleText}。先选，真心话还是大冒险？`;
    }

    if (currentStep === 1) {
        // 第二步：抽取问题
        const question = truthOrDareQuestions[Math.floor(Math.random() * truthOrDareQuestions.length)];
        if (question.type === 'truth') {
            return `哈，真心话是吧？别后悔。来，回答本道仙：${question.content}`;
        } else {
            return `哈，大冒险是吧？别怂。来，本道仙命令你：${question.content}`;
        }
    }

    if (currentStep === 2) {
        // 第三步：根据用户回答给出毒舌评价
        // 占位符：这里可以用AI来评价用户的回答
        const evaluation = `哼，就这？你的秘密也太无聊了。`;
        return evaluation;
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
    if (currentStep === 0) {
        // 第一步：给出规则并开始故事
        const starter = storyStarters[Math.floor(Math.random() * storyStarters.length)];
        return `哼，想玩故事接龙？本道仙先来。${starter}`;
    }

    if (currentStep === 1) {
        // 第二步：根据用户接龙，给出出乎意料的转折
        const twist = `哦？你接得不错，但本道仙的思路可不是你这等凡人能猜到的。${userInput}……哼，故事的转折其实是……【在这里插入一个荒诞的转折】`;
        return twist;
    }

    if (currentStep === 2) {
        // 第三步：给出最终的离奇结尾
        const ending = `你这接得也太无聊了。不过没关系，本道仙已经想好结局了。${userInput}……故事的结局其实是……【在这里插入一个荒诞的结局】`;
        return ending;
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
    switch (intent) {
        case '游戏小摊_你说我画':
            return handleYouSayIWrite(userInput, currentStep);
        case '游戏小摊_真心话大冒险':
            return handleTruthOrDare(userInput, currentStep);
        case '游戏小摊_故事接龙':
            return handleStoryRelay(userInput, currentStep);
        default:
            return "哼，想玩什么？说清楚点，别浪费本道仙的时间。";
    }
}
