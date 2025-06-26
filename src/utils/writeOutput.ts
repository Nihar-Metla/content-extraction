import fs from 'fs';
import path from 'path';
import { ContentItem } from '../types/contentItem';

export function writeOutput(
  team_id: string,
  items: ContentItem[],
  outputDir = 'output'
) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Determine base name
  const firstItem = items[0];
  let baseName = 'output';

  if (firstItem.title) {
    baseName = firstItem.title.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '');
  } else if (firstItem.source_url) {
    const urlParts = firstItem.source_url.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    baseName = lastPart.split('.')[0] || 'output';
  }

  const outputPath = path.join(outputDir, `${baseName}.json`);

  const result = {
    team_id,
    items,
  };

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`Output written to ${outputPath}`);
}
