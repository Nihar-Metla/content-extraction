import axios from 'axios';
import { JSDOM } from 'jsdom';
import puppeteer from 'puppeteer';
import { Readability } from '@mozilla/readability';
import { htmlToMarkdown } from '../utils/markdownUtils';
import { ContentItem } from '../types/contentItem';
import { extractAuthor } from '../utils/authorUtils';


function extractMainContent(document: Document): string | null {
  const selectors = [
    'article', 'main', '.post-content', '.entry-content', '.blog-post',
    '.postBody', '.blog-post-content', '.prose', '[class*="content"]', '[class*="body"]'
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el?.textContent?.length && el.textContent.trim().length > 200) {
      return el.innerHTML;
    }
  }

  return null;
}

async function tryAxiosFirst(url: string): Promise<ContentItem | null> {
    try {
        const res = await axios.get(url);
        const dom = new JSDOM(res.data);
        const document = dom.window.document;

        console.log('🔍 1. Initial DOM state:', {
            'meta[name="author"]': document.querySelector('meta[name="author"]')?.outerHTML,
            'h1 + .author': document.querySelector('h1 + .author')?.outerHTML,
            'document.title': document.title
        });

        const author = extractAuthor(document);
        console.log('🔍 2. Extracted author:', author);

        const title = document.querySelector('h1')?.textContent?.trim() || 
                     document.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() || 
                     document.title || 'Untitled';

        const contentHtml = extractMainContent(document);
        if (!contentHtml) return null;

        console.log('🔍 3. Before markdown conversion:', {
            'contentHtml': contentHtml.slice(0, 200),
            'author': author
        });

        const result: ContentItem = {
            title,
            content: htmlToMarkdown(contentHtml),
            content_type: "blog",
            source_url: url,
            author
        };

        console.log('🔍 4. Final result:', {
            'title': result.title,
            'author': result.author,
            'content length': result.content.length
        });

        return result;
    } catch (err: any) {
        console.warn(`Axios failed for ${url}: ${err.message || err}.`);
        return null;
    }
}
async function tryWithPuppeteer(url: string): Promise<ContentItem> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
        
        // Extract author first, including schema.org data
        const author = await page.evaluate(() => {
            // First try structured metadata
            const selectors = [
                'meta[name="author"]',
                'meta[property="article:author"]',
                '[itemprop="author"]',
                '[rel="author"]',
                '.author',
                '.byline',
                '.post-author',
                '[class*="author"]',
                '[class*="Author"]',
                '[class*="byline"]'
            ];

            let author = '';
            // Check schema.org data first
            const schemaData = document.querySelector('script[type="application/ld+json"]');
            if (schemaData && schemaData.textContent) {
                try {
                    const schema = JSON.parse(schemaData.textContent);
                    console.log('🔍 Schema data:', schema);
                    // Handle array of authors
                    if (schema.author && Array.isArray(schema.author)) {
                        author = schema.author[0].name;
                        console.log('🔍 Found author in schema:', author);
                    } else if (schema.author && schema.author.name) {
                        author = schema.author.name;
                        console.log('🔍 Found author in schema:', author);
                    }
                } catch (e) {
                    console.warn('🔍 Error parsing schema data:', e);
                }
            }

            // Fallback to other selectors if no schema author found
            if (!author) {
                for (const sel of selectors) {
                    const el = document.querySelector(sel);
                    const value = el?.getAttribute('content') || el?.textContent;
                    if (value?.trim()) {
                        author = value.trim();
                        console.log('🔍 Found author in fallback:', author);
                        break;
                    }
                }
            }

            // Fallback: Search near h1 and article
            if (!author) {
                const header = document.querySelector('h1');
                const article = document.querySelector('article');
                
                const contextText = [
                    header?.textContent || '',
                    article?.textContent || '',
                    document.body.textContent || ''
                ].join('\\n').slice(0, 3000);

                const authorPatterns = [
                    /\b(by|By)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
                    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+(?:writes|wrote|posted)/i,
                    /(?<=\bAuthor:\s)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
                    /(?<=\bWritten\sby\s)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i
                ];

                for (const pattern of authorPatterns) {
                    const match = contextText.match(pattern);
                    if (match?.[1]) {
                        author = match[1].trim();
                        console.log('🔍 Found author in patterns:', author);
                        break;
                    }
                }
            }

            return {
                author: author,
                html: document.documentElement.outerHTML
            };
        });

        console.log('🔍 3. Author and HTML after page evaluation:', author);
        

        // Now use Readability for content
        await page.addScriptTag({ path: require.resolve('@mozilla/readability/Readability.js') });
        const extractedData = await page.evaluate(({html}) => {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const reader = new (window as any).Readability(doc);
            const article = reader.parse();

            return {
                title: article.title,
                contentHtml: article.content
            };
        }, {html: author.html});

        console.log('🔍 4. Author before final return:', author.author);

        if (!extractedData.contentHtml || extractedData.contentHtml.length < 200) {
            throw new Error('Readability failed to extract usable content.');
        }
        

        return {
            title: extractedData.title,
            content: htmlToMarkdown(extractedData.contentHtml),
            content_type: 'blog',
            source_url: url,
            author: author.author
        };
    } finally {
        await browser.close();
    }
}

export async function extractFromBlog(url: string): Promise<ContentItem> {
  const sanitizedUrl = url.split('#')[0];
  const result = await tryAxiosFirst(sanitizedUrl);
  if (result) {
    console.log('✅ Extracted using Axios + content selectors');
    return result;
  }

  console.warn('⚠️ Falling back to Puppeteer with Readability.js');
  try {
    return await tryWithPuppeteer(sanitizedUrl);
  } catch (err: any) {
    console.error(`❌ Failed to extract blog content from ${url}: ${err.message || err}`);
    throw err;
  }
}
