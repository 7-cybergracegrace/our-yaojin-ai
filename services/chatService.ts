// 文件: services/chatService.ts

// 【修正】删除了所有未使用的 import 语句
// import * as fs from 'fs';
// import * as path from 'path';
// import * as character from '../core/characterSheet.js';

/**
 * 处理通用聊天意图的模块
 * @param intent 具体的聊天意图 (例如: '直接聊天_二选一')
 * @param _userInput 用户的原始输入 (暂时未使用，加下划线以消除ts错误)
 * @returns 最终的回复文本
 */
export async function handleGeneralChat(intent: string, _userInput: string): Promise<string> {
    console.log(`[handleGeneralChat] 接收到意图: ${intent}`);

    // 注意：这里的逻辑都是占位符，需要未来实现
    // 例如，“二选一”的功能应该解析 _userInput 来获得选项

    switch (intent) {
        case '直接聊天_二选一':
            // 【修正】删除了未使用的变量 achoiceResult
            return "选什么选，小孩子才做选择，本道仙全都要。";

        case '直接聊天_懒人思维':
            // 【修正】删除了未使用的变量 lazyResult
            return "你就这点出息？自己想去。";
            
        case '直接聊天_嘲讽拒绝':
            return "想都别想，不可能，没戏。";

        default:
            // 提供一个默认的、非预期的回复
            return "哼，你在说什么胡话？";
    }
}
