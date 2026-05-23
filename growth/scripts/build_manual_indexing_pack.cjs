const fs = require('fs');
const path = require('path');

const root = process.cwd();
const sitemapPath = path.join(root, 'public', 'sitemap.xml');
const outDir = path.join(root, 'growth', 'reports');
const outFile = path.join(outDir, 'manual-indexing-checklist.md');

function extractUrls(xml) {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1].trim());
}

if (!fs.existsSync(sitemapPath)) {
  console.error('Missing public/sitemap.xml');
  process.exit(1);
}

const xml = fs.readFileSync(sitemapPath, 'utf8');
const urls = extractUrls(xml);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const lines = [];
lines.push('# Manual Indexing Pack');
lines.push('');
lines.push('Generated from `public/sitemap.xml`.');
lines.push('');
lines.push('## Google Search Console');
lines.push('1. Open URL Inspection.');
lines.push('2. Paste URL.');
lines.push('3. Click Request Indexing.');
lines.push('');
lines.push('## Bing Webmaster');
lines.push('1. Use URL Inspection and Submit URL.');
lines.push('2. Repeat for priority pages first.');
lines.push('');
lines.push('## Priority URLs');
for (const url of urls) {
  lines.push(`- [ ] ${url}`);
}

fs.writeFileSync(outFile, lines.join('\n'));
console.log(`Wrote ${outFile}`);
