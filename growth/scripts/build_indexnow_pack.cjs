const fs = require('fs');
const path = require('path');

const root = process.cwd();
const outDir = path.join(root, 'growth', 'reports');
const outFile = path.join(outDir, 'indexnow-submit-2026-06-10.md');

const urls = [
  'https://verimedia.xyz/image-converter/',
  'https://verimedia.xyz/refund/',
  'https://verimedia.xyz/privacy/',
  'https://verimedia.xyz/terms/',
];

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const lines = [
  '# IndexNow Submission Pack - 2026-06-10',
  '',
  'Submit these changed indexable URLs after deployment.',
  '',
  '## URLs',
  '',
  ...urls.map((url) => `- ${url}`),
  '',
  '## Ahrefs Source',
  '',
  'Issue: Pages to submit to IndexNow',
  'Crawl: 2026-06-10T12:50:50Z',
  '',
];

fs.writeFileSync(outFile, lines.join('\n'));
console.log(`Wrote ${outFile}`);
