import { extractFromBlog } from './blogExtractor';
import { extractFromPdf } from './pdfExtractor';

export async function extractContent(input: string): Promise<any> {
  if (input.startsWith('http')) {
    return await extractFromBlog(input);
  } else if (input.endsWith('.pdf')) {
    return await extractFromPdf(input);
  }
  throw new Error('Unsupported input format');
}
