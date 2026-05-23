const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * 📊 VeriMedia SEO + AIO Quality Evaluator (v2)
 *
 * This is a deterministic static evaluator for:
 * - Technical SEO correctness
 * - AIO answerability structure
 * - Cross-page consistency
 * - Duplicate/thin content risk heuristics
 *
 * It is stronger than regex-only checks, but still a static audit
 * (it does not replace Search Console, logs, or live crawler testing).
 */

const rootDir = process.cwd();
const domain = 'https://verimedia.xyz';
const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const failOnArg = args.find((a) => a.startsWith('--fail-on=')) || null;
const failOn = failOnArg ? failOnArg.split('=')[1] : null;
const primaryFiles = [
  'index.html',
  'privacy.html',
  'terms.html',
  'refund.html',
  'es/index.html',
  'fr/index.html',
  'de/index.html',
];

function readFileSafe(relPath) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf8');
}

function decodeEntities(str) {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(html) {
  const noScript = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
  const txt = noScript.replace(/<[^>]+>/g, ' ');
  return decodeEntities(txt).replace(/\s+/g, ' ').trim();
}

function extractAttr(tag, attr) {
  const re = new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, 'i');
  const m = tag.match(re);
  return m ? m[1].trim() : null;
}

function extractMeta(html, attrName, attrValue, targetAttr = 'content') {
  const re = new RegExp(`<meta[^>]*${attrName}\\s*=\\s*["']${attrValue}["'][^>]*>`, 'i');
  const tag = html.match(re)?.[0];
  return tag ? extractAttr(tag, targetAttr) : null;
}

function extractLinkRel(html, relValue) {
  const out = [];
  const re = /<link\b[^>]*>/gi;
  const tags = html.match(re) || [];
  for (const tag of tags) {
    const rel = extractAttr(tag, 'rel');
    if (!rel) continue;
    if (rel.toLowerCase() === relValue.toLowerCase()) out.push(tag);
  }
  return out;
}

function extractCanonical(html) {
  const tags = extractLinkRel(html, 'canonical');
  if (!tags.length) return null;
  return extractAttr(tags[0], 'href');
}

function extractHreflangs(html) {
  const tags = extractLinkRel(html, 'alternate');
  const out = {};
  for (const tag of tags) {
    const lang = extractAttr(tag, 'hreflang');
    const href = extractAttr(tag, 'href');
    if (lang && href) out[lang.toLowerCase()] = href;
  }
  return out;
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].trim() : null;
}

function extractHeadings(html) {
  const h1 = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => stripTags(m[1]));
  const h2 = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => stripTags(m[1]));
  return { h1, h2 };
}

function extractJsonLdBlocks(html) {
  return [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1].trim())
    .filter(Boolean);
}

function extractAllLinks(html) {
  const links = [];
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    links.push(m[1].trim());
  }
  return links;
}

function extractImages(html) {
  const images = [];
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    images.push({
      src: extractAttr(tag, 'src'),
      alt: extractAttr(tag, 'alt'),
    });
  }
  return images;
}

function toRelFromUrl(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (!url.startsWith(domain)) return null;
    const u = new URL(url);
    return u.pathname === '/' ? 'index.html' : u.pathname.replace(/^\//, '');
  }
  if (url.startsWith('/')) return url === '/' ? 'index.html' : url.replace(/^\//, '');
  return url;
}

function fileExistsForPublicRef(url) {
  const rel = toRelFromUrl(url);
  if (!rel) return true;
  const p1 = path.join(rootDir, rel);
  const p2 = path.join(rootDir, 'public', rel);
  return fs.existsSync(p1) || fs.existsSync(p2);
}

function hashText(s) {
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
}

function ratePage(relPath, html, globalCtx) {
  const findings = [];
  let score = 0;
  const total = 100;
  const text = stripTags(html);
  const wordCount = text ? text.split(/\s+/).length : 0;
  const title = extractTitle(html);
  const metaDesc = extractMeta(html, 'name', 'description');
  const viewport = extractMeta(html, 'name', 'viewport');
  const canonical = extractCanonical(html);
  const hreflangs = extractHreflangs(html);
  const ogTitle = extractMeta(html, 'property', 'og:title');
  const ogDesc = extractMeta(html, 'property', 'og:description');
  const ogUrl = extractMeta(html, 'property', 'og:url');
  const ogImage = extractMeta(html, 'property', 'og:image');
  const { h1, h2 } = extractHeadings(html);
  const jsonLdBlocks = extractJsonLdBlocks(html);
  const images = extractImages(html);
  const links = extractAllLinks(html);

  // 1) Technical SEO (40)
  let tScore = 0;

  if (title && title.length >= 25 && title.length <= 65) tScore += 8;
  else findings.push('Title missing or length outside 25-65 chars');

  if (metaDesc && metaDesc.length >= 70 && metaDesc.length <= 170) tScore += 8;
  else findings.push('Meta description missing or length outside 70-170 chars');

  if (viewport && /width=device-width/i.test(viewport)) tScore += 4;
  else findings.push('Viewport meta missing or non-standard');

  if (canonical) {
    tScore += 6;
    if (!canonical.startsWith(domain)) findings.push('Canonical is not on primary domain');
  } else {
    findings.push('Canonical missing');
  }

  const requiredLangs = ['en', 'es', 'fr', 'de', 'x-default'];
  let hasAllLangs = true;
  for (const lang of requiredLangs) {
    if (!hreflangs[lang]) hasAllLangs = false;
  }
  if (hasAllLangs) tScore += 6;
  else findings.push('Incomplete hreflang set (expected en/es/fr/de/x-default)');

  if (ogTitle && ogDesc && ogUrl && ogImage) tScore += 8;
  else findings.push('OpenGraph tags incomplete');

  score += tScore;

  // 2) AIO answerability and structure (25)
  let aScore = 0;
  if (h1.length === 1) aScore += 7;
  else findings.push(`Expected exactly 1 H1, found ${h1.length}`);

  if (h2.length >= 2) aScore += 5;
  else findings.push('Low heading depth: add clear H2 sections');

  if (wordCount >= 250) aScore += 6;
  else findings.push(`Content may be thin (${wordCount} words)`);

  const hasFaqSignals = /frequently asked questions|faq/i.test(text) || /@type"\s*:\s*"FAQPage"/i.test(html);
  const hasHowToSignals = /step|how to|guide/i.test(text) || /@type"\s*:\s*"HowTo"/i.test(html);
  if (hasFaqSignals || hasHowToSignals) aScore += 4;
  else findings.push('No explicit FAQ/HowTo style answer blocks detected');

  if (links.some((l) => l.includes('#') || l.endsWith('.html') || l.startsWith('/'))) aScore += 3;
  else findings.push('Weak internal linking structure');

  score += aScore;

  // 3) Structured data quality (15)
  let sScore = 0;
  if (jsonLdBlocks.length > 0) {
    sScore += 6;
    let parseOk = 0;
    let typed = 0;
    for (const block of jsonLdBlocks) {
      try {
        const json = JSON.parse(block);
        parseOk += 1;
        if (Array.isArray(json)) {
          if (json.some((x) => x && x['@type'])) typed += 1;
        } else if (json && json['@type']) {
          typed += 1;
        }
      } catch (err) {
        findings.push('Invalid JSON-LD block (JSON parse failed)');
      }
    }
    if (parseOk > 0) sScore += 5;
    if (typed > 0) sScore += 4;
    else findings.push('JSON-LD has no @type payload');
  } else {
    findings.push('No JSON-LD detected');
  }
  score += sScore;

  // 4) Integrity checks (20)
  let iScore = 0;

  const missingAlt = images.filter((img) => img.src && (!img.alt || !img.alt.trim())).length;
  if (missingAlt === 0) iScore += 5;
  else findings.push(`${missingAlt} image(s) missing alt text`);

  if (ogImage && fileExistsForPublicRef(ogImage)) iScore += 5;
  else findings.push('og:image points to missing file');

  if (canonical && fileExistsForPublicRef(canonical)) iScore += 4;
  else findings.push('Canonical target does not resolve to a local route/file');

  // Duplicate-risk heuristic by body text hash
  const textKey = hashText(text.toLowerCase().replace(/\d+/g, ''));
  if (!globalCtx.textHashes[textKey]) {
    globalCtx.textHashes[textKey] = [relPath];
    iScore += 6;
  } else {
    globalCtx.textHashes[textKey].push(relPath);
    findings.push('High duplicate-content risk: body text is near-identical to another page');
  }

  score += iScore;

  // Normalize
  if (score < 0) score = 0;
  if (score > total) score = total;

  return {
    relPath,
    score,
    total,
    percentage: Math.round((score / total) * 100),
    findings,
    stats: { wordCount, h1Count: h1.length, h2Count: h2.length, canonical, ogImage },
  };
}

function findingSeverity(message) {
  const m = message.toLowerCase();
  if (
    m.includes('canonical missing') ||
    m.includes('openGraph tags incomplete'.toLowerCase()) ||
    m.includes('invalid json-ld') ||
    m.includes('no json-ld detected') ||
    m.includes('og:image points to missing file') ||
    m.includes('expected exactly 1 h1')
  ) return 'high';

  if (
    m.includes('incomplete hreflang') ||
    m.includes('title missing') ||
    m.includes('meta description missing') ||
    m.includes('content may be thin') ||
    m.includes('canonical target does not resolve')
  ) return 'medium';

  return 'low';
}

function summarizeSeverities(pageResults, siteFindings) {
  const sev = { critical: 0, high: 0, medium: 0, low: 0 };
  const detailed = [];

  for (const page of pageResults) {
    for (const f of page.findings) {
      const s = findingSeverity(f);
      sev[s] += 1;
      detailed.push({ scope: 'page', page: page.relPath, severity: s, message: f });
    }
  }

  for (const f of siteFindings) {
    const s = findingSeverity(f);
    sev[s] += 1;
    detailed.push({ scope: 'site', page: null, severity: s, message: f });
  }

  return { sev, detailed };
}

function rateSite() {
  const robots = readFileSafe('public/robots.txt') || '';
  const sitemap = readFileSafe('public/sitemap.xml') || '';
  const aiAccess = readFileSafe('public/ai-access.json') || '';
  const llms = readFileSafe('public/llms.txt') || '';

  const globalCtx = { textHashes: {} };
  const pageResults = [];

  for (const relPath of primaryFiles) {
    const html = readFileSafe(relPath);
    if (!html) continue;
    pageResults.push(ratePage(relPath, html, globalCtx));
  }

  let globalScore = 0;
  for (const r of pageResults) globalScore += r.percentage;
  const baseScore = pageResults.length ? Math.round(globalScore / pageResults.length) : 0;

  const siteFindings = [];
  let siteBonus = 0;

  if (/Sitemap:\s*https:\/\/verimedia\.xyz\/sitemap\.xml/i.test(robots)) siteBonus += 2;
  else siteFindings.push('robots.txt missing sitemap reference');

  if (/User-agent:\s*\*/i.test(robots) && /Allow:\s*\//i.test(robots)) siteBonus += 2;
  else siteFindings.push('robots.txt crawl policy may be too restrictive');

  if (/gptbot|claudebot|perplexitybot/i.test(robots)) siteBonus += 1;
  else siteFindings.push('robots.txt missing explicit AI crawler directives');

  if (/<loc>https:\/\/verimedia\.xyz\/es\/<\/loc>/i.test(sitemap) &&
      /<loc>https:\/\/verimedia\.xyz\/fr\/<\/loc>/i.test(sitemap) &&
      /<loc>https:\/\/verimedia\.xyz\/de\/<\/loc>/i.test(sitemap)) {
    siteBonus += 2;
  } else {
    siteFindings.push('sitemap.xml missing localized route entries');
  }

  if (aiAccess) {
    try {
      const parsed = JSON.parse(aiAccess);
      if (parsed && parsed.policy && parsed.policy.crawlers) siteBonus += 1;
      else siteFindings.push('ai-access.json exists but has weak structure');
    } catch (err) {
      siteFindings.push('ai-access.json is invalid JSON');
    }
  } else {
    siteFindings.push('ai-access.json not found');
  }

  if (/^#\s+VeriMedia\.xyz/m.test(llms)) siteBonus += 1;
  else siteFindings.push('llms.txt missing or low quality');

  const overall = Math.max(0, Math.min(100, baseScore + siteBonus));

  const { sev, detailed } = summarizeSeverities(pageResults, siteFindings);
  return { pageResults, overall, baseScore, siteBonus, siteFindings, severities: sev, detailedFindings: detailed };
}

function printReport() {
  const { pageResults, overall, baseScore, siteBonus, siteFindings, severities, detailedFindings } = rateSite();

  if (jsonMode) {
    const output = {
      generatedAt: new Date().toISOString(),
      overall,
      baseScore,
      siteBonus,
      severities,
      pages: pageResults,
      siteFindings,
      findings: detailedFindings
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log('--- VeriMedia SEO + AIO Quality Report (v2) ---');
    for (const r of pageResults) {
      console.log(`\nFile: ${r.relPath}`);
      console.log(`  Score: ${r.percentage}% (${r.score}/${r.total})`);
      console.log(`  Stats: words=${r.stats.wordCount}, h1=${r.stats.h1Count}, h2=${r.stats.h2Count}`);
      if (r.findings.length) {
        console.log('  Findings:');
        for (const f of r.findings) console.log(`   - ${f}`);
      }
    }

    console.log('\nSite-Level Signals:');
    console.log(`  Base score: ${baseScore}`);
    console.log(`  Site bonus: +${siteBonus}`);
    if (siteFindings.length) {
      for (const f of siteFindings) console.log(`   - ${f}`);
    } else {
      console.log('   - No major site-level gaps detected');
    }

    console.log('\nSeverity Summary:');
    console.log(`  critical=${severities.critical} high=${severities.high} medium=${severities.medium} low=${severities.low}`);

    console.log('\n===========================================');
    console.log(`OVERALL SITE RATING: ${overall}/100`);
    console.log('===========================================');

    if (overall < 70) {
      console.log('Status: SUB-OPTIMAL. Priority fixes required.');
    } else if (overall < 90) {
      console.log('Status: GOOD. Improve quality/content depth and consistency.');
    } else {
      console.log('Status: ELITE. Strong technical + AIO baseline.');
    }
  }

  if (failOn) {
    const order = ['low', 'medium', 'high', 'critical'];
    if (!order.includes(failOn)) {
      console.error(`Invalid --fail-on value: ${failOn}. Use one of: ${order.join(', ')}`);
      process.exit(2);
    }
    const thresholdIndex = order.indexOf(failOn);
    let shouldFail = false;
    for (let i = thresholdIndex; i < order.length; i++) {
      if (severities[order[i]] > 0) {
        shouldFail = true;
        break;
      }
    }
    if (shouldFail) {
      if (!jsonMode) {
        console.error(`\nQuality gate failed: issues at or above "${failOn}" detected.`);
      }
      process.exit(1);
    }
  }
}

printReport();
