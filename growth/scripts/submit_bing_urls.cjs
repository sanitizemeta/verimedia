const fs = require('fs');
const { rootPath, loadGrowthConfig, parseSitemapUrls } = require('./_utils.cjs');

async function main() {
  const cfg = loadGrowthConfig();
  const apiKey = cfg?.bing?.apiKey;
  const siteUrl = cfg?.bing?.siteUrl || cfg?.siteUrl;
  if (!apiKey || apiKey.includes('YOUR_BING_API_KEY')) {
    throw new Error('Set growth/config.json -> bing.apiKey before running Bing URL submission.');
  }
  if (!siteUrl) {
    throw new Error('Missing siteUrl in growth config.');
  }

  const sitemapPath = rootPath('public', 'sitemap.xml');
  const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
  const urls = parseSitemapUrls(sitemapXml).filter((u) => u.startsWith(siteUrl));
  if (!urls.length) {
    throw new Error('No URLs found in sitemap for configured siteUrl.');
  }

  const endpoint = `https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlbatch?apikey=${encodeURIComponent(apiKey)}`;
  const payload = {
    siteUrl,
    urlList: urls,
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Bing submission failed (${res.status}): ${body}`);
  }

  const out = await res.text();
  console.log(`Submitted ${urls.length} URLs to Bing for ${siteUrl}`);
  console.log(out);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
