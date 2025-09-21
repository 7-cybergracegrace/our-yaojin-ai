import axios from 'axios';
import { load } from 'cheerio';

// 定义电影对象的数据结构
interface Movie {
    title: string;
    url: string;
    score: string;
    pic: string;
}

const DOUBAN_URL = 'https://movie.douban.com/chart';
const DOUBAN_COOKIE = process.env.DOUBAN_COOKIE;

// 导出的核心逻辑函数
export async function fetchDoubanMoviesLogic(): Promise<Movie[]> {
    if (!DOUBAN_COOKIE) {
        console.error('DOUBAN_COOKIE 环境变量未配置。');
        throw new Error('DOUBAN_COOKIE 环境变量未配置。');
    }

    const { data } = await axios.get(DOUBAN_URL, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
            'Cookie': DOUBAN_COOKIE,
        },
    });

    const $ = load(data);
    const movies: Movie[] = [];

    $('div.article div.indent table').each((_, element) => {
        const title = $(element).find('div.pl2 a').text().trim().split('/')[0].trim();
        const url = $(element).find('div.pl2 a').attr('href') || '';
        const score = $(element).find('.rating_nums').text().trim();
        // 修正图片选择器
        const pic = $(element).find('a.nbg img').attr('src') || '';

        if (title && url) {
            movies.push({
                title,
                url,
                score,
                pic,
            });
        }
    });

    // 返回排名前10的电影
    return movies.slice(0, 10);
}

