import axios from 'axios';
import { JSDOM } from 'jsdom';
import puppeteer from 'puppeteer';
import { Readability } from '@mozilla/readability';
import { htmlToMarkdown } from '../utils/markdownUtils';
import { ContentItem } from '../types/contentItem';

async function tryAxiosFirst(url: string): Promise<ContentItem | null> {
  try {
    const res = await axios.get(url);
    const dom = new JSDOM(res.data);
    const document = dom.window.document;

    const title = document.querySelector('h1')?.textContent?.trim() ||
                  document.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() ||
                  document.title ||
                  'Untitled';

    const mainContentElement = document.querySelector('article, main, .post-content, .entry-content, .blog-post');

    if (!mainContentElement || mainContentElement.textContent?.trim().length === 0) {
      console.warn('Axios found main element but it was empty or not substantial. Triggering fallback.');
      return null;
    }

    const contentHtml = mainContentElement.innerHTML;
    if (contentHtml.length < 200) {
      console.warn('Axios extracted content too short. Triggering fallback.');
      return null;
    }

    const author =
      document.querySelector('meta[name="author"]')?.getAttribute('content')?.trim() ||
      document.querySelector('.author, .byline, .post-author')?.textContent?.trim() ||
      '';

    return {
      title,
      content: htmlToMarkdown(contentHtml),
      content_type: 'blog',
      source_url: url,
      author,
    };
  } catch (err: any) {
    console.warn(`Axios failed for ${url}: ${err.message || err}. Triggering fallback.`);
    return null;
  }
}

async function tryWithPuppeteer(url: string): Promise<ContentItem> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

    await page.addScriptTag({ path: require.resolve('@mozilla/readability/Readability.js') });

    const extractedData = await page.evaluate(() => {
      const doc = document.cloneNode(true) as Document;
      const reader = new (window as any).Readability(doc);
      const article = reader.parse();

      const author =
        document.querySelector('meta[name="author"]')?.getAttribute('content')?.trim() ||
        document.querySelector('.author, .byline, .post-author')?.textContent?.trim() ||
        '';

      if (article) {
        return {
          title: article.title,
          contentHtml: article.content,
          author,
        };
      }

      const fallbackTitle = document.querySelector('h1')?.textContent?.trim() ||
                            document.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() ||
                            document.title ||
                            'Untitled';

      const fallbackSelectors = ['article', 'main', '.blog-post-content', '.post-content', '.entry-content', '.blog-post', '.prose'];
      let fallbackContentHtml = '';

      for (const sel of fallbackSelectors) {
        const element = document.querySelector(sel);
        if (element && element.textContent && element.textContent.trim().length > 200) {
          fallbackContentHtml = element.innerHTML;
          break;
        }
      }

      return {
        title: fallbackTitle,
        contentHtml: fallbackContentHtml,
        author,
      };
    });

    if (!extractedData.contentHtml || extractedData.contentHtml.trim().length < 200) {
      throw new Error('Puppeteer and Readability.js failed to extract substantial content.');
    }

    return {
      title: extractedData.title,
      content: htmlToMarkdown(extractedData.contentHtml),
      content_type: 'blog',
      source_url: url,
      author: extractedData.author,
    };

  } finally {
    await browser.close();
  }
}

export async function extractFromBlog(url: string): Promise<ContentItem> {
  const result = await tryAxiosFirst(url);
  if (result) {
    console.log('Extracted using Axios');
    return result;
  }

  console.warn('Axios failed — falling back to Puppeteer (using Readability.js)');
  try {
    return await tryWithPuppeteer(url);
  } catch (error: any) {
    if (error instanceof Error) {
      console.error(`Error during Puppeteer extraction: ${error.message}`);
    } else {
      console.error(`An unknown error occurred during Puppeteer extraction:`, error);
    }
    throw error;
  }
}