// 这个文件不处理API请求，只导出核心的业务逻辑函数

// 从环境变量中安全地读取Cookie
const WEIBO_COOKIE = process.env.WEIBO_COOKIE;
const WEIBO_API_URL = 'https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot';

// 定义一个接口来描述返回的数据结构，增强代码可读性
interface TrendItem {
    title: string;
    url: string;
}

export async function fetchWeiboNewsLogic(): Promise<TrendItem[]> {
    if (!WEIBO_COOKIE) {
        console.error('后端服务尚未配置微博Cookie');
        throw new Error('后端服务尚未配置微博Cookie');
    }

    const response = await fetch(WEIBO_API_URL, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Version/108.0.0.0 Safari/537.36',
            'Cookie': WEIBO_COOKIE,
        }
    });

    if (!response.ok) {
        throw new Error(`请求微博官方API失败: ${response.status}`);
    }

    const data = await response.json();
    const cardGroup = data?.data?.cards?.[0]?.card_group;

    if (!Array.isArray(cardGroup)) {
        console.error('微博API返回数据结构异常或Cookie失效:', data);
        throw new Error('微博API返回数据结构异常或Cookie失效');
    }

    // 处理并返回最终的热搜数据
    const finalTrends = cardGroup
        .filter((item: any) => item.desc)
        .slice(0, 10)
        .map((item: any) => ({
            title: item.desc,
            url: `https://m.s.weibo.com/weibo?q=${encodeURIComponent(`#${item.desc}#`)}`
        }));
    
    return finalTrends;
}

