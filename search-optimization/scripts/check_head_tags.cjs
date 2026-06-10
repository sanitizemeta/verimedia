const fs = require('fs');
const path = require('path');

const root = process.cwd();
const skipDirs = new Set(['node_modules', '.git', 'dist', 'skill-fetcher']);
const maxDescriptionLength = 160;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

function has(html, pattern) {
  return pattern.test(html);
}

const failures = [];
for (const file of walk(root)) {
  const rel = path.relative(root, file);
  if (/(^|\/)404\.html$/.test(rel) || rel === path.join('image-converter', 'success', 'index.html')) {
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');
  const description = html.match(/<meta\s+name=(["'])description\1\s+content=(["'])(.*?)\2\s*\/?>/i)?.[3] || '';
  const canonical = html.match(/<link\s+rel=(["'])canonical\1\s+href=(["'])(.*?)\2\s*\/?>/i)?.[3] || '';
  const isFragment = !html.includes('<html');

  if (isFragment) continue;
  if (!description) failures.push(`${rel}: missing meta description`);
  if (description.length > maxDescriptionLength) failures.push(`${rel}: meta description is ${description.length} chars`);
  if (!canonical) failures.push(`${rel}: missing canonical`);
  if (!has(html, /<meta\s+property=["']og:title["']/i)) failures.push(`${rel}: missing og:title`);
  if (!has(html, /<meta\s+property=["']og:description["']/i)) failures.push(`${rel}: missing og:description`);
  if (!has(html, /<meta\s+property=["']og:image["']/i)) failures.push(`${rel}: missing og:image`);
  if (!has(html, /<link\s+rel=["']icon["']/i)) failures.push(`${rel}: missing favicon icon`);
  if (!has(html, /<link\s+rel=["']apple-touch-icon["']/i)) failures.push(`${rel}: missing apple-touch-icon`);
}

if (failures.length) {
  console.error(`Head tag check failed (${failures.length} issues):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('head-tags-ok');
