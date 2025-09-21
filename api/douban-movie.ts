import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { load } from 'cheerio';

interface Movie {
  title: string;
  url: string;
  score: string;
  pic: string;
}

const DOUBAN_URL = 'https://movie.douban.com/chart';
const DOUBAN_COOKIE = process.env.DOUBAN_COOKIE;

// Corrected the function signature to the standard Vercel handler format
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  if (!DOUBAN_COOKIE) {
    // Used 'res' to send the response
    return res.status(500).json({ error: 'DOUBAN_COOKIE environment variable is not configured.' });
  }

  try {
    const { data } = await axios.get(DOUBAN_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
        'Cookie': DOUBAN_COOKIE,
      },
    });

    const $ = load(data);
    const movies: Movie[] = [];

    // Your cheerio parsing logic remains the same
    $('div.article div.indent table').each((_, element) => {
      const title = $(element).find('div.pl2 a').text().trim().split('/')[0].trim();
      const url = $(element).find('div.pl2 a').attr('href') || '';
      const score = $(element).find('.rating_nums').text().trim();
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
    
    // Slicing to get only the top 10 movies
    const top10Movies = movies.slice(0, 10);

    // Set Cache-Control header to cache the response for 1 hour on the CDN
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');
    
    // Used 'res' to send the successful response
    res.status(200).json(top10Movies);

  } catch (error: unknown) {
    console.error('Error fetching or parsing Douban data:', error);
    let errorMessage = 'Failed to fetch Douban movie data.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Used 'res' to send the error response
    res.status(500).json({ error: errorMessage });
  }
}

