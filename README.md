# Content Extraction

A TypeScript-based CLI tool for extracting structured content from PDF files and blog URLs. Designed for reliability, clarity, and extensibility in content ingestion pipelines.

## Features

📄 PDF parsing with chapter segmentation and ligature fixes
🌐 Blog scraping using Axios (static) and Puppeteer (dynamic fallback)
🧹 Clean Markdown conversion and HTML sanitization
🗂️ Structured JSON output for ingestion or indexing

## Setup Instructions

### Clone Repository

```bash
git clone https://github.com/Nihar-Metla/cs.git
cd cs
```

### Install Dependencies

```bash
npm install
```

## Usage

Run the extractor via npm script:

```bash
npm run extract -- <input_path_or_url>
```

### Examples

#### Extract from Local PDF

```bash
npm run extract -- ./books/sample.pdf
```

#### Extract from Remote PDF

```bash
npm run extract -- https://example.com/book.pdf
```

#### Extract from Blog URL

```bash
npm run extract -- https://interviewing.io/blog/stop-trying-to-make-recruiters-think-or-why-your-resume-is-bad-and-how-to-fix-it
```

ℹ️ The 
 ensures CLI arguments are passed correctly through npm scripts.
