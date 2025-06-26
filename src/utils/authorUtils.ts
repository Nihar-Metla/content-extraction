// utils/authorUtils.ts
export function extractAuthor(document: Document): string {
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

    // First try structured metadata
    for (const sel of selectors) {
        const el = document.querySelector(sel);
        const value = el?.getAttribute('content') || el?.textContent;
        if (value?.trim()) {
            return value.trim();
        }
    }

    // Fallback: Look for author patterns in text
    const header = document.querySelector('h1');
    const article = document.querySelector('article');

    // Combine nearby text contexts
    const contextText = [
        header?.textContent || '',
        article?.textContent || '',
        document.body.textContent || ''
    ].join('\n').slice(0, 3000);

    // Enhanced pattern matching
    const authorPatterns = [
        /\b(by|By)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+(?:writes|wrote|posted)/i,
        /(?<=\bAuthor:\s)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
        /(?<=\bWritten\sby\s)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i
    ];

    for (const pattern of authorPatterns) {
        const match = contextText.match(pattern);
        if (match?.[1]) {
            return match[1].trim();
        }
    }

    // Debug logging
    if (!header) console.warn('No h1 element found');
    if (!article) console.warn('No article element found');
    console.warn('🕵️ Author not found via DOM or inline text');
    console.warn('🔍 Examined text:', contextText.slice(0, 500));
    console.log('🔍 Examining author elements:', {
        'meta[name="author"]': document.querySelector('meta[name="author"]')?.outerHTML,
        'h1 + .author': document.querySelector('h1 + .author')?.outerHTML,
        'nearby text': contextText.slice(0, 200)
    });

    return '';
}