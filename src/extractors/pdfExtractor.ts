import fs from 'fs';
import fetch from 'node-fetch';
import pdfParse from 'pdf-parse';
import { fixLigatures, logSuspiciousGlyphs } from '../utils/textUtils';
import { ContentItem } from '../types/contentItem';

interface PDFConfig {
  chunkSize?: number;
}

export async function extractFromPdf(
  filePath: string,
  config: PDFConfig = {}
): Promise<ContentItem[]> {
  const { chunkSize = 0 } = config;
  let fileBuffer: Buffer;
  let source_url: string;

  if (filePath.startsWith('http')) {
    const response = await fetch(filePath);
    if (!response.ok) throw new Error(`Failed to fetch remote PDF: ${filePath}`);
    fileBuffer = await response.buffer();
    source_url = filePath;
  } else {
    fileBuffer = fs.readFileSync(filePath);
    source_url = 'from local';
  }

  const { text } = await pdfParse(fileBuffer);
  const lines = text.split('\n').map(line => line.trim());

  const isToCEntry = (line: string) =>
    /^Ch(?:apter)?\s+\d+\.?\s+.+\.+\s+\d{1,3}$/.test(line);
  const tocIndex = lines.findIndex(isToCEntry);
  const filteredLines = tocIndex !== -1 ? lines.slice(tocIndex + 15) : lines;

  const chapters: ContentItem[] = [];
  const seenChapters = new Set<string>();
  const seenGlyphs = new Set<string>();
  let currentTitle = '';
  let buffer: string[] = [];

  const isChapterHeader = (line: string) => /^CHAPTER\s+\d+/i.test(line);
  const extractChapterNumber = (line: string): string | null => {
    const match = line.match(/^CHAPTER\s+(\d+)/i);
    return match ? match[1] : null;
  };

  for (const line of filteredLines) {
    if (isChapterHeader(line)) {
      const chapterNum = extractChapterNumber(line);
      if (!chapterNum || seenChapters.has(chapterNum)) continue;

      if (buffer.length > 10 && currentTitle) {
        const rawBody = buffer.join('\n').trim();
        const fixed = fixLigatures(rawBody);
        logSuspiciousGlyphs(fixed, seenGlyphs);
        chapters.push({
          title: currentTitle,
          content: fixed,
          content_type: 'book',
          source_url
        });
      }

      seenChapters.add(chapterNum);
      currentTitle = line;
      buffer = [];
    } else {
      if (/^CHAPTER\s+\d+\s+▸/i.test(line)) continue;
      buffer.push(line);
    }
  }

  if (currentTitle && buffer.length > 0) {
    const rawBody = buffer.join('\n').trim();
    const fixed = fixLigatures(rawBody);
    logSuspiciousGlyphs(fixed, seenGlyphs);
    chapters.push({
      title: currentTitle,
      content: fixed,
      content_type: 'book',
      source_url
    });
  }

  return chunkSize > 0 ? chapters.slice(0, chunkSize) : chapters;
}
