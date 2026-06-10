const fs = require('fs');
const path = require('path');
const { rootPath, loadGrowthConfig } = require('./_utils.cjs');

const DEFAULT_KEY = '5f68c5d4b4484f299e1f43d962f6c32e';
const DEFAULT_HOST = 'verimedia.xyz';
const DEFAULT_REPORT = rootPath('growth', 'reports', 'indexnow-submit-2026-06-10.md');

function readUrls(reportPath) {
  const markdown = fs.readFileSync(reportPath, 'utf8');
  return [...markdown.matchAll(/^- (https:\/\/[^\s]+)$/gm)].map((match) => match[1]);
}

async function main() {
  const cfg = loadGrowthConfig();
  const indexnow = cfg?.indexnow || {};
  const key = process.env.INDEXNOW_KEY || indexnow.key || DEFAULT_KEY;
  const host = indexnow.host || DEFAULT_HOST;
  const keyLocation = indexnow.keyLocation || `https://${host}/${key}.txt`;
  const reportPath = process.env.INDEXNOW_REPORT
    ? path.resolve(process.env.INDEXNOW_REPORT)
    : DEFAULT_REPORT;
  const urls = readUrls(reportPath);

  if (!key) {
    throw new Error('Missing IndexNow key. Set growth/config.json -> indexnow.key or INDEXNOW_KEY.');
  }
  if (!urls.length) {
    throw new Error(`No URLs found in ${reportPath}. Run npm run growth:indexnow-pack first.`);
  }

  const payload = {
    host,
    key,
    keyLocation,
    urlList: urls,
  };

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`IndexNow submission failed (${res.status}): ${body}`);
  }

  console.log(`Submitted ${urls.length} URLs to IndexNow for ${host}`);
  console.log(urls.join('\n'));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
