const fs = require('fs');
const path = require('path');
const { rootPath } = require('./_utils.cjs');

const pages = [
  'index.html',
  'ai-opt-out-metadata.html',
  'remove-exif-from-photos.html',
  'remove-pdf-metadata.html',
  'privacy.html',
  'terms.html',
  'refund.html',
];

function extractJsonLd(html) {
  return [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1].trim())
    .filter(Boolean);
}

function collectTypes(block) {
  const types = [];
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node['@type']) {
      if (Array.isArray(node['@type'])) node['@type'].forEach((t) => types.push(String(t)));
      else types.push(String(node['@type']));
    }
    Object.values(node).forEach(visit);
  };
  visit(block);
  return types;
}

function main() {
  const missing = [];
  const report = [];
  for (const p of pages) {
    const full = rootPath(p);
    if (!fs.existsSync(full)) {
      missing.push(`${p}: file missing`);
      continue;
    }
    const html = fs.readFileSync(full, 'utf8');
    const blocks = extractJsonLd(html);
    if (!blocks.length) {
      missing.push(`${p}: no JSON-LD`);
      continue;
    }
    const types = new Set();
    for (const b of blocks) {
      try {
        const parsed = JSON.parse(b);
        collectTypes(parsed).forEach((t) => types.add(t));
      } catch (err) {
        missing.push(`${p}: invalid JSON-LD`);
      }
    }
    report.push({ page: p, types: [...types].sort() });
  }

  console.log('Schema Coverage Report');
  report.forEach((r) => {
    console.log(`- ${r.page}: ${r.types.join(', ') || '(none)'}`);
  });

  if (missing.length) {
    console.log('\nIssues:');
    missing.forEach((m) => console.log(`- ${m}`));
    process.exit(1);
  }
}

main();
