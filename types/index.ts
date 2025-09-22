export interface Message {
    id?: string;
    sender: 'user' | 'model' | 'notification';
    text: string;
    image?: string;
    imageBase64?: string;
    generatedImageUrl?: string;
    generatedImageBase64?: string;
    imageMimeType?: string;
    isLoading?: boolean;
    quickReplies?: string[];
    intimacy?: IntimacyLevel;
    notificationContent?: string;
    errorType?: 'rate_limit' | 'safety' | 'server' | 'unknown';
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


export interface DailyChoice {
    choice: string;
    result: string;
}

// 假设的 TriageRule 类型
export interface TriageRule {
    action: string;
    keywords: string[];
}


