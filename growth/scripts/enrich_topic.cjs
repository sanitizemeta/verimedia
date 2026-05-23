const fs = require('fs');
const { rootPath } = require('./_utils.cjs');

async function getWikiSummary(topic) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'VeriMediaGrowthBot/1.0' } });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    title: data.title,
    extract: data.extract,
    pageUrl: data.content_urls?.desktop?.page || '',
    wikidataId: data.wikibase_item || '',
  };
}

async function getOpenAlexWorks(topic) {
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(topic)}&per-page=5`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).map((r) => ({
    title: r.title,
    year: r.publication_year,
    citedBy: r.cited_by_count,
    url: r.primary_location?.landing_page_url || r.id,
  }));
}

async function getCrossrefWorks(topic) {
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(topic)}&rows=5&sort=relevance`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.message?.items || []).map((r) => ({
    title: Array.isArray(r.title) ? r.title[0] : '',
    year: r.published?.['date-parts']?.[0]?.[0] || '',
    doi: r.DOI ? `https://doi.org/${r.DOI}` : '',
  }));
}

function toMarkdown(topic, wiki, openalex, crossref) {
  const lines = [];
  lines.push(`# Topic Enrichment: ${topic}`);
  lines.push('');
  lines.push('## Wikipedia/Wikidata');
  if (wiki) {
    lines.push(`- Title: ${wiki.title}`);
    lines.push(`- Wikidata ID: ${wiki.wikidataId || 'N/A'}`);
    lines.push(`- URL: ${wiki.pageUrl || 'N/A'}`);
    lines.push(`- Summary: ${wiki.extract || 'N/A'}`);
  } else {
    lines.push('- No Wikipedia summary found');
  }
  lines.push('');
  lines.push('## OpenAlex References');
  if (openalex.length) {
    openalex.forEach((w, idx) => {
      lines.push(`${idx + 1}. ${w.title} (${w.year || 'n/a'}) citedBy=${w.citedBy || 0} ${w.url || ''}`.trim());
    });
  } else {
    lines.push('- No OpenAlex results');
  }
  lines.push('');
  lines.push('## Crossref References');
  if (crossref.length) {
    crossref.forEach((w, idx) => {
      lines.push(`${idx + 1}. ${w.title || 'Untitled'} (${w.year || 'n/a'}) ${w.doi || ''}`.trim());
    });
  } else {
    lines.push('- No Crossref results');
  }
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const topic = process.argv.slice(2).join(' ').trim();
  if (!topic) {
    console.error('Usage: npm run growth:enrich-topic -- "ai opt out metadata"');
    process.exit(1);
  }

  const [wiki, openalex, crossref] = await Promise.all([
    getWikiSummary(topic),
    getOpenAlexWorks(topic),
    getCrossrefWorks(topic),
  ]);

  const md = toMarkdown(topic, wiki, openalex, crossref);
  const outDir = rootPath('growth', 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const outPath = rootPath('growth', 'out', `enrichment-${slug || 'topic'}.md`);
  fs.writeFileSync(outPath, md);
  console.log(`Saved: ${outPath}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
