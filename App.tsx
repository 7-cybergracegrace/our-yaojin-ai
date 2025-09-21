import React, { useState, useEffect, useRef, useCallback } from 'react';

// ===================================================================================
// 1. 类型定义 (原 types/index.ts)
// ===================================================================================
interface Message {
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
}

interface IntimacyLevel {
    level: number;
    name: string;
    min: number;
    progress: number;
}

interface User {
    username: string;
    email: string;
    isGuest?: boolean;
}

type Flow = 'default' | 'guidance' | 'game' | 'news' | 'daily';


// ===================================================================================
// 2. 服务逻辑 (原 services/*.ts)
// ===================================================================================

// --- authService.ts ---
const getCurrentUser = (): User | null => {
    const userJson = localStorage.getItem('currentUser_YaoJin');
    return userJson ? JSON.parse(userJson) : null;
};

const logout = () => {
    localStorage.removeItem('currentUser_YaoJin');
};

// --- geminiService.ts ---
const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (reader.result) { resolve(reader.result as string); }
            else { reject(new Error("Failed to read file as Data URL")); }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// --- 核心修复：将模拟代码替换为真实的后端 fetch 调用 ---
async function streamChatResponse(
    payload: {
        text: string;
        imageBase64: string | null;
        history: Message[];
        intimacy: IntimacyLevel;
        userName: string;
        currentFlow: Flow;
    },
    onChunk: (chunk: any) => void,
    onError: (error: Error) => void
) {
    try {
        // 使用 POST 方法调用后端的 /api/chat
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok || !response.body) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim()) {
                    try { onChunk(JSON.parse(line)); }
                    catch (e) { console.error("Failed to parse stream chunk:", line); }
                }
            }
        }
    } catch (error) {
        console.error("Chat API request error:", error);
        onError(error instanceof Error ? error : new Error('Unknown chat error'));
    }
}


// ===================================================================================
// 3. UI 组件 (原 components/*.tsx)
// ===================================================================================

const Header: React.FC<{
    intimacy: IntimacyLevel;
    onClearHistory: () => void;
    onNewConversation: () => void;
    currentUser: User | null;
    userAvatar: string | null;
    onAvatarChangeClick: () => void;
    onLoginClick: () => void;
    onLogout: () => void;
}> = ({ intimacy, currentUser, userAvatar, onLoginClick, onLogout, onNewConversation }) => (
    <header className="bg-gray-800 text-white p-4 flex justify-between items-center shadow-md">
        <div>
            <h1 className="text-xl font-bold">尧金</h1>
            <p className="text-sm opacity-80">{intimacy.name} ({intimacy.progress}%)</p>
        </div>
        <div className="flex items-center gap-4">
             <button onClick={onNewConversation} className="text-sm hover:text-yellow-400">新对话</button>
            {currentUser ? (
                <>
                    <img src={userAvatar || undefined} alt="avatar" className="w-10 h-10 rounded-full" />
                    <span>{currentUser.username}</span>
                    <button onClick={onLogout} className="text-sm hover:text-yellow-400">登出</button>
                </>
            ) : (
                <button onClick={onLoginClick} className="text-sm hover:text-yellow-400">登录</button>
            )}
        </div>
    </header>
);

const ChatMessage: React.FC<{
    message: Message;
    userAvatar: string | null;
    isLastMessage: boolean;
    onQuickReply: (text: string) => void;
    onDeleteMessage: (id: string) => void;
}> = ({ message }) => (
    <div className={`flex my-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div className={`p-3 rounded-lg max-w-lg ${message.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-white'}`}>
            {message.isLoading ? <div className="animate-pulse">...</div> : <p>{message.text}</p>}
            {message.image && <img src={message.image} alt="uploaded content" className="mt-2 rounded-lg max-h-60" />}
        </div>
    </div>
);

const ChatInput: React.FC<{
    onSend: (text: string, imageFile: File | null) => void;
    isLoading: boolean;
}> = ({ onSend, isLoading }) => {
    const [text, setText] = useState('');
    const handleSend = () => {
        if (text.trim()) {
            onSend(text, null);
            setText('');
        }
    };
    return (
        <div className="p-4 bg-gray-800 flex items-center">
            <input 
                type="text" 
                className="flex-grow p-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                value={text} 
                onChange={(e) => setText(e.target.value)} 
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="输入消息..."
            />
            <button onClick={handleSend} disabled={isLoading} className="ml-4 px-4 py-2 bg-yellow-500 text-gray-900 rounded-lg font-semibold disabled:bg-gray-600">
                {isLoading ? '...' : '发送'}
            </button>
        </div>
    );
};

// Placeholder for other components to avoid breaking the app
const GuidePrompts: React.FC<any> = () => <div className="my-4 p-4 bg-gray-800 rounded-lg text-center text-white">引导提示</div>;
const AuthModal: React.FC<any> = ({onClose, onLoginSuccess, onStartGuestSession}) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
        <div className="bg-gray-800 p-8 rounded-lg text-white">
            <h2 className="text-xl mb-4">登录</h2>
            <button onClick={() => onLoginSuccess({username: '已登录用户', email: 'user@example.com'})} className="bg-blue-500 px-4 py-2 rounded w-full mb-2">登录</button>
            <button onClick={onStartGuestSession} className="bg-gray-600 px-4 py-2 rounded w-full mb-2">游客模式</button>
            <button onClick={onClose} className="text-sm mt-4">关闭</button>
        </div>
    </div>
);
const NotificationMessage: React.FC<any> = ({ message }) => <div className="text-center text-gray-400 text-sm my-2">{message}</div>;
const ConfirmationModal: React.FC<any> = ({ isOpen, onClose, onConfirm, title, message }) => isOpen ? (
     <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
        <div className="bg-gray-800 p-8 rounded-lg text-white">
            <h2 className="text-xl mb-4">{title}</h2>
            <p className="mb-4">{message}</p>
            <button onClick={onConfirm} className="bg-red-500 px-4 py-2 rounded mr-2">确认</button>
            <button onClick={onClose} className="bg-gray-600 px-4 py-2 rounded">取消</button>
        </div>
    </div>
) : null;
const AvatarSelectionModal: React.FC<any> = ({ isOpen, onClose }) => isOpen ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
        <div className="bg-gray-800 p-8 rounded-lg text-white">
            <h2 className="text-xl mb-4">选择头像</h2>
            <p>头像选择功能</p>
            <button onClick={onClose} className="text-sm mt-4">关闭</button>
        </div>
    </div>
) : null;


// ===================================================================================
// 4. 主应用组件 (原 App.tsx)
// ===================================================================================

const INTIMACY_LEVELS = [
    { level: 1, name: '渡劫道友', min: 0 },
    { level: 2, name: '有缘人', min: 21 },
    { level: 3, name: '道仙常客', min: 41 },
    { level: 4, name: '道仙金主', min: 61 },
    { level: 5, name: '尧金的主人', min: 81 },
];

const GUEST_USER: User = { username: '临时道友', email: 'guest_session', isGuest: true };

const getIntimacyFromProgress = (progress: number): IntimacyLevel => {
    const currentLevel = INTIMACY_LEVELS.slice().reverse().find(l => progress >= l.min) || INTIMACY_LEVELS[0];
    return { ...currentLevel, progress: Math.min(progress, 100) };
};

const INITIAL_MESSAGE: Message = {
    id: '0',
    sender: 'bot',
    text: '世界是一场巨大的赌局，人人都想赢，但很少有人看得清牌面。我，尧金，勉强能看到几张。不过，天机......本道仙只说给有缘人听。',
};

const DEFAULT_USER_AVATAR = '/default-user-avatar.png';


const App: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCooldown, setIsCooldown] = useState(false);
    const [cooldownDuration, setCooldownDuration] = useState(2000);
    const cooldownTimeoutRef = useRef<number | null>(null);
    const [userAvatar, setUserAvatar] = useState<string | null>(DEFAULT_USER_AVATAR);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isNewConversationModalOpen, setIsNewConversationModalOpen] = useState(false);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const [intimacyProgress, setIntimacyProgress] = useState(0);
    const [activeFlow, setActiveFlow] = useState<Flow>('default');

    const chatEndRef = useRef<HTMLDivElement>(null);
    const currentIntimacy = getIntimacyFromProgress(intimacyProgress);
    const userName = currentUser?.username || '道友';

    useEffect(() => {
        const user = getCurrentUser();
        if (user) {
            setCurrentUser(user);
        }
    }, []);

    useEffect(() => {
        return () => {
            if (cooldownTimeoutRef.current) {
                clearTimeout(cooldownTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        try {
            if (currentUser) {
                const userScope = currentUser.isGuest ? '_GUEST' : `_${currentUser.email}`;
                const savedMessages = localStorage.getItem(`chatHistory_YaoJin${userScope}`);
                const savedIntimacy = localStorage.getItem(`intimacy_YaoJin${userScope}`);
                const savedUserAvatar = localStorage.getItem(`userAvatar_YaoJin${userScope}`);

                setMessages(savedMessages ? JSON.parse(savedMessages) : [INITIAL_MESSAGE]);
                setIntimacyProgress(savedIntimacy ? JSON.parse(savedIntimacy) : 0);
                setUserAvatar(savedUserAvatar ? JSON.parse(savedUserAvatar) : DEFAULT_USER_AVATAR);
                setActiveFlow('default');
            } else {
                setMessages([INITIAL_MESSAGE]);
                setIntimacyProgress(0);
                setUserAvatar(DEFAULT_USER_AVATAR);
                setActiveFlow('default');
            }
        } catch (error) {
            console.error("Failed to load from local storage", error);
            setMessages([INITIAL_MESSAGE]);
        }
    }, [currentUser]);

    useEffect(() => {
        try {
            if (currentUser && activeFlow === 'default') {
                const userScope = currentUser.isGuest ? '_GUEST' : `_${currentUser.email}`;
                const messagesToSave = messages.filter(m => m.sender !== 'notification');
                if (messagesToSave.length > 0) {
                      localStorage.setItem(`chatHistory_YaoJin${userScope}`, JSON.stringify(messagesToSave));
                }
                localStorage.setItem(`intimacy_YaoJin${userScope}`, JSON.stringify(intimacyProgress));
                if (userAvatar) {
                    localStorage.setItem(`userAvatar_YaoJin${userScope}`, JSON.stringify(userAvatar));
                }
            }
        } catch (error) {
             console.error("Failed to save to local storage", error);
        }
    }, [messages, intimacyProgress, userAvatar, currentUser, activeFlow]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    const prevIntimacyLevel = useRef(currentIntimacy.level);
    useEffect(() => {
        const newLevelData = getIntimacyFromProgress(intimacyProgress);
        if (newLevelData.level > prevIntimacyLevel.current && prevIntimacyLevel.current > 0) {
            const notificationMessage: Message = {
                id: `notification-${Date.now()}`,
                sender: 'notification',
                text: '',
                notificationContent: `与尧金的亲密度已提升至: ${newLevelData.level}级 - ${newLevelData.name}`,
            };
            setMessages(prev => [...prev, notificationMessage]);
        }
        prevIntimacyLevel.current = newLevelData.level;
    }, [intimacyProgress]);

    const handleSend = useCallback(async (text: string, imageFile: File | null) => {
        if (!currentUser) {
            setIsAuthModalOpen(true);
            return;
        }
        if ((!text.trim() && !imageFile) || isLoading || isCooldown) return;

        setIsLoading(true);
        setIsCooldown(true);

        let imageBase64Data: string | undefined;
        if (imageFile) {
            try {
                const dataUrl = await fileToBase64(imageFile);
                imageBase64Data = dataUrl.split(',')[1];
            } catch (error) {
                console.error("Error reading image file:", error);
                setIsLoading(false);
                setIsCooldown(false);
                return;
            }
        }

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            sender: 'user',
            text: text,
            image: imageFile ? URL.createObjectURL(imageFile) : undefined,
        };

        const botMessageId = `bot-${Date.now()}`;
        setMessages(prev => [...prev, userMessage, { id: botMessageId, sender: 'bot', text: '', isLoading: true }]);

        let rateLimitErrorOccurred = false;

        await streamChatResponse(
            {
                text,
                imageBase64: imageBase64Data || null,
                history: messages.filter(m => m.id !== '0' && m.sender !== 'notification'),
                intimacy: currentIntimacy,
                userName,
                currentFlow: activeFlow,
            },
            (chunk) => { // onChunk callback
                setMessages(prev => prev.map(m => {
                    if (m.id === botMessageId) {
                        const updatedText = m.text + (chunk.text || '');
                        if (chunk.isLoading === false) {
                            if (chunk.errorType === 'rate_limit') rateLimitErrorOccurred = true;
                            return { ...m, text: updatedText, isLoading: false, errorType: chunk.errorType };
                        }
                        return { ...m, text: updatedText, isLoading: true };
                    }
                    return m;
                }));
            },
            (error) => { // onError callback
                console.error('Error sending message:', error);
                const errorMessage: Message = {
                    id: botMessageId,
                    sender: 'bot',
                    text: '哎呀，本道仙的传讯术法出了点小岔子，稍后再试吧。',
                    isLoading: false,
                };
                setMessages(prev => prev.map(m => m.id === botMessageId ? errorMessage : m));
            }
        );

        setIsLoading(false);

        if (!rateLimitErrorOccurred) {
            setIntimacyProgress(prev => Math.min(prev + Math.floor(Math.random() * 3) + 1, 100));
            setCooldownDuration(prev => Math.max(prev - 1000, 2000));
        } else {
            setCooldownDuration(prev => Math.min(prev + 2000, 10000));
        }

        if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);
        cooldownTimeoutRef.current = window.setTimeout(() => {
            setIsCooldown(false);
        }, cooldownDuration);

    }, [messages, isLoading, isCooldown, currentUser, currentIntimacy, userName, cooldownDuration, activeFlow]);
    
    const handlePromptClick = (intro: { text: string; replies: string[] }, flowId: Flow) => {
        setActiveFlow(flowId);
        const botMessage: Message = {
            id: `bot-flow-start-${Date.now()}`,
            sender: 'bot',
            text: intro.text,
            quickReplies: intro.replies,
        };
        setMessages([botMessage]);
    };

    const handleDeleteMessage = useCallback((id: string) => {
        setMessages(prev => prev.filter(m => m.id !== id));
    }, []);

    const handleNewConversation = () => {
        setIsNewConversationModalOpen(true);
    };

    const handleConfirmNewConversation = () => {
        if(currentUser) {
            const userScope = currentUser.isGuest ? '_GUEST' : `_${currentUser.email}`;
            const savedMessages = localStorage.getItem(`chatHistory_YaoJin${userScope}`);
            setMessages(savedMessages ? JSON.parse(savedMessages) : [INITIAL_MESSAGE]);
        } else {
             setMessages([INITIAL_MESSAGE]);
        }
        setActiveFlow('default');
        setIsNewConversationModalOpen(false);
    };

    const handleClearHistory = () => {
        if (currentUser) {
            const userScope = currentUser.isGuest ? '_GUEST' : `_${currentUser.email}`;
            localStorage.removeItem(`chatHistory_YaoJin${userScope}`);
            localStorage.removeItem(`intimacy_YaoJin${userScope}`);
            localStorage.removeItem(`userAvatar_YaoJin${userScope}`);
        }
        setMessages([INITIAL_MESSAGE]);
        setIntimacyProgress(0);
        setUserAvatar(DEFAULT_USER_AVATAR);
        setActiveFlow('default');
        if(currentUser?.isGuest) {
            setCurrentUser(null);
        }
    };

    const handleAvatarChange = (file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            setUserAvatar(reader.result as string);
        };
        reader.readAsDataURL(file);
        setIsAvatarModalOpen(false);
    };

    const handleLoginSuccess = (user: User) => {
        setCurrentUser(user);
        setIsAuthModalOpen(false);
    };

    const handleLogout = () => {
        logout();
        setCurrentUser(null);
    };

    const handleStartGuest = () => {
        setCurrentUser(GUEST_USER);
        setIsAuthModalOpen(false);
    };

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white">
            <Header
                intimacy={currentIntimacy}
                onClearHistory={handleClearHistory}
                onNewConversation={handleNewConversation}
                currentUser={currentUser}
                userAvatar={userAvatar}
                onAvatarChangeClick={() => setIsAvatarModalOpen(true)}
                onLoginClick={() => setIsAuthModalOpen(true)}
                onLogout={handleLogout}
            />
            <main className="flex-grow overflow-y-auto p-4">
                <div className="max-w-4xl mx-auto">
                    
                    {messages.map((message, index) =>
                        message.sender === 'notification' ? (
                            <NotificationMessage key={message.id} message={message.notificationContent || ''} />
                        ) : (
                            <ChatMessage
                                key={message.id}
                                message={message}
                                userAvatar={userAvatar}
                                isLastMessage={index === messages.length - 1}
                                onQuickReply={(text) => handleSend(text, null)}
                                onDeleteMessage={handleDeleteMessage}
                            />
                        )
                    )}
                    
                    {activeFlow === 'default' && messages.length <= 1 && (
                        <div className="guide-prompts-animation">
                            <GuidePrompts onPromptClick={handlePromptClick} />
                        </div>
                    )}
                    
                    <div ref={chatEndRef} />
                </div>
            </main>
            <ChatInput onSend={handleSend} isLoading={isLoading || isCooldown} />
            {isAuthModalOpen && (
                <AuthModal
                    onClose={() => setIsAuthModalOpen(false)}
                    onLoginSuccess={handleLoginSuccess}
                    onStartGuestSession={handleStartGuest}
                />
            )}
            {isNewConversationModalOpen && (
                <ConfirmationModal
                    isOpen={isNewConversationModalOpen}
                    onClose={() => setIsNewConversationModalOpen(false)}
                    onConfirm={handleConfirmNewConversation}
                    title="结束当前对话？"
                    message="这将清除当前临时对话并返回主聊天记录。确定要继续吗？"
                />
            )}
            {isAvatarModalOpen && (
                <AvatarSelectionModal
                    isOpen={isAvatarModalOpen}
                    onClose={() => setIsAvatarModalOpen(false)}
                    onUpload={handleAvatarChange}
                    onSelectPreset={() => {}}
                />
            )}
        </div>
    );
};

export default App;

