import { extractFromBlog } from "./extractors/blogExtractor";
import { extractFromPdf } from "./extractors/pdfExtractor";
import { isURL } from "./utils/isURL";
import { writeOutput } from "./utils/writeOutput";
import { downloadFile } from "./utils/downloadFile";

import path from "path";

const input = process.argv[2];

if (!input) {
  console.error("Please provide a blog URL or file path (local or remote).");
  process.exit(1);
}

async function main() {
  try {
    let contentItems = [];

    if (isURL(input)) {
      const urlLower = input.toLowerCase();

      if (urlLower.endsWith(".pdf")) {
        console.log(`📥 Downloading remote PDF: ${input}`);
        const downloadedPath = await downloadFile(input);
        contentItems = await extractFromPdf(downloadedPath);
      } else {
        const item = await extractFromBlog(input);
        contentItems = [item];
      }
    } else {
      const ext = path.extname(input).toLowerCase();
      if (ext === ".pdf") {
        contentItems = await extractFromPdf(input);
      } else {
        console.error(`Unsupported file type: ${ext}`);
        process.exit(1);
      }
    }

    await writeOutput('team id here',contentItems);
    console.log("Extraction complete! Markdown content saved.");
  } catch (err) {
    console.error("Error during extraction:", err);
  }
}

main();
