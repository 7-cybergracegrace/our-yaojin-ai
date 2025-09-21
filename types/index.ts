// types/index.ts

export interface Message {
    id: string;
    sender: 'user' | 'bot' | 'notification';
    text: string;
    image?: string;
    imageBase64?: string;
    imageMimeType?: string;
    isLoading?: boolean;
    quickReplies?: string[];
    intimacy?: IntimacyLevel;
    notificationContent?: string;
    errorType?: 'rate_limit' | 'safety' | 'server' | 'unknown';
    // --- 核心修复：在这里添加新的属性 ---
    generatedImageBase64?: string; 
}

export interface IntimacyLevel {
    level: number;
    name: string;
    min: number;
    progress: number;
}

export interface User {
    username: string;
    email: string;
    isGuest?: boolean;
}

export type Flow = 'default' | 'chat' | 'guidance' | 'game' | 'news' | 'daily';


