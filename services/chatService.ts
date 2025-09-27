// 文件: services/chatService.ts

import { Message, IntimacyLevel, Flow } from '../types/index.js';
import * as character from '../core/characterSheet.js';

/**
 * 处理“直接聊天”相关的特殊意图
 * @param intent 具体的意图
 * @param userInput 用户输入
 * @returns 回应文本
 */
export async function handleGeneralChat(intent: string, userInput: string): Promise<string> {
    switch (intent) {
        case '直接聊天_二选一':
            const choiceResult = Math.random() > 0.5 ? 'A' : 'B';
            // 改进后的AI回应
            return `瞧你那点出息，连个选择都搞不定。本道仙这里有颗祖传的【阴阳骰】，单数为A，双数为B。掷出什么，便是天命。敢不敢赌一把？`;

        case '直接聊天_懒人思维':
            const lazyResult = Math.random() > 0.5 ? '双' : '单';
            // 改进后的AI回应
            return `哼，能还是不能？命运是你一句‘是不是’就能决定的吗？不过看你问得这么直接，本道仙也懒得绕圈子。给你个痛快——我这就抛个「阴阳骰」，单数过，双数不过。别再问这么无聊的问题了，行不行全靠你自己。`;

        case '直接聊天_嘲讽拒绝':
            // 改进后的AI回应
            return `哼，洞察天机是本道仙的本职，替你测试智商可不在业务范围。要中五百万，你该去问彩票机，而不是我这小小的占卜摊。别拿这种问题来浪费我时间，要么问点正经的，要么就赶紧走，别挡着别人财路。`;

        default:
            return `...`; // 留作备用，或者抛出错误
    }
}
