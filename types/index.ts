// 定义聊天记录中单条消息的结构
export interface Message {
    sender: 'user' | 'assistant';
    text: string;
    imageBase64?: string | null;
    imageMimeType?: string | null;
    isLoading?: boolean;
    errorType?: 'rate_limit' | 'safety' | 'server' | 'unknown' | null;
    flow?: Flow; // 用于追踪该消息属于哪个对话流程
}

// 定义用户与AI之间的亲密度等级结构
export interface IntimacyLevel {
    level: number;      // 例如: 1, 2, 3...
    name: string;       // 例如: "初识", "知己"
    progress: number;   // 例如: 75 (代表 75%)
}

// 定义所有可能的对话流程或模式
export type Flow = 'chat' | 'guidance' | 'game' | 'news' | 'daily';

