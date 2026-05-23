const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function rootPath(...parts) {
  return path.join(process.cwd(), ...parts);
}

function loadGrowthConfig() {
  const candidates = [
    rootPath('growth', 'config.json'),
    rootPath('growth', 'config.example.json'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return readJson(c);
  }
  throw new Error('Missing growth config. Create growth/config.json from growth/config.example.json');
}

function parseSitemapUrls(sitemapXml) {
  return [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

module.exports = {
  readJson,
  rootPath,
  loadGrowthConfig,
  parseSitemapUrls,
};
