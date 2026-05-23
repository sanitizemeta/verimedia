const fs = require('fs');
const path = require('path');

const root = process.cwd();
const pages = fs.readdirSync(root).filter((f) => f.endsWith('.html'));
const localePages = ['es/index.html', 'fr/index.html', 'de/index.html'].filter((f) => fs.existsSync(path.join(root, f)));
const files = [...pages, ...localePages];

const report = [];

for (const rel of files) {
  const html = fs.readFileSync(path.join(root, rel), 'utf8');
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const types = [];
  for (const b of blocks) {
    try {
      const parsed = JSON.parse(b[1].trim());
      if (Array.isArray(parsed)) {
        for (const item of parsed) if (item && item['@type']) types.push(item['@type']);
      } else if (parsed && parsed['@type']) {
        types.push(parsed['@type']);
      }
    } catch {
      types.push('INVALID_JSON');
    }
  }
  report.push({ file: rel, blocks: blocks.length, types });
}

const outDir = path.join(root, 'growth', 'reports');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'schema-manifest.json');
fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), report }, null, 2));
console.log(`Wrote ${outPath}`);
