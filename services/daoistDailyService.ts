// 文件: services/daoistDailyService.ts

import * as fs from 'fs';
import * as path from 'path';

/**
 * 根据不同的意图，读取对应的数据文件并返回一条随机内容。
 * @param intent '道仙日常'的具体意图
 * @returns 从对应文件中随机抽取的一段文本
 */
function getRandomItemForIntent(intent: string): string {
    // 创建一个意图到文件名的映射
    const intentToFileMap: { [key: string]: string } = {
        '道仙日常_最近看了': '文艺评论.json',
        '道仙日常_最近买了': '购物清单.json',
        '道仙日常_记仇小本本': '记仇小本本.json',
        '道仙日常_随便聊聊': '生活小事.json' // '随便聊聊'我们让它从'生活小事'里选
    };

    // 从意图中提取关键词，例如从 '道仙日常_最近看了' 提取 '最近看了'
    const key = intent.split('_')[1];
    
    // 找到对应的文件名
    const fileName = intentToFileMap[intent];

    if (!fileName) {
        return "哼，这事儿本道仙还没想好怎么说。";
    }

    try {
        const filePath = path.join(process.cwd(), 'data', fileName);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data: { content: string }[] = JSON.parse(fileContent);

        if (data.length === 0) {
            return `哼，关于${key}，本道仙今天没什么想说的。`;
        }

        // 从数据中随机抽取一条
        const randomItem = data[Math.floor(Math.random() * data.length)];
        return randomItem.content;

    } catch (error) {
        console.error(`Error reading or parsing file for intent ${intent}:`, error);
        // 如果文件读取失败或格式错误，返回一个统一的错误信息
        return `哼，关于${key}的记忆有点模糊，本道仙想不起来了。`;
    }
}

/**
 * 处理“道仙日常”模块的主函数
 * @param intent ওয়ার্ম intent
 * @returns 最终的回复文本
 */
export async function handleDaoistDailyChoice(intent: string): Promise<string> {
    return getRandomItemForIntent(intent);
}
