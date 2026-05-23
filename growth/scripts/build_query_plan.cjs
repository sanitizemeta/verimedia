const fs = require('fs');
const { rootPath } = require('./_utils.cjs');

function normalizeCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const header = normalizeCsvLine(lines[0]).map((h) => h.toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = normalizeCsvLine(lines[i]);
    const row = {};
    header.forEach((h, idx) => {
      row[h] = cols[idx] || '';
    });
    rows.push(row);
  }
  return rows;
}

function asNum(v) {
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function main() {
  const inPath = process.argv[2] || rootPath('growth', 'data', 'gsc_queries.csv');
  if (!fs.existsSync(inPath)) {
    console.log(`Missing input CSV: ${inPath}`);
    console.log('Expected columns: query,clicks,impressions,ctr,position');
    process.exit(1);
  }
  const rows = parseCsv(fs.readFileSync(inPath, 'utf8'));
  const normalized = rows.map((r) => {
    const query = r.query || r['top queries'] || '';
    const clicks = asNum(r.clicks);
    const impressions = asNum(r.impressions);
    const ctr = r.ctr ? Number(String(r.ctr).replace('%', '')) : (impressions ? (clicks / impressions) * 100 : 0);
    const position = asNum(r.position);
    // High impressions + low CTR = best day-1 click opportunity
    const score = impressions * Math.max(0, 5 - ctr) * (position > 0 ? Math.max(1, 20 - position) : 1);
    return { query, clicks, impressions, ctr, position, score };
  }).filter((r) => r.query);

  normalized.sort((a, b) => b.score - a.score);
  const top = normalized.slice(0, 20);

  console.log('Top Query Opportunities (high impression, low CTR):');
  top.forEach((r, i) => {
    console.log(`${i + 1}. ${r.query} | imp=${r.impressions} ctr=${r.ctr.toFixed(2)}% pos=${r.position || '-'} clicks=${r.clicks}`);
  });
}

main();
