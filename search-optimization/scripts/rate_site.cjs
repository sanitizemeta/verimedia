const fs = require('fs');
const path = require('path');

/**
 * 📊 VeriMedia Search & AIO Rater
 * Rates the website based on technical SEO, AIO (AI Optimization), and GEO signals.
 */

const filesToAudit = ['index.html', 'privacy.html', 'terms.html', 'refund.html'];
const rootDir = process.cwd();

function rateFile(filePath) {
  const fullPath = path.join(rootDir, filePath);
  if (!fs.existsSync(fullPath)) return null;

  const content = fs.readFileSync(fullPath, 'utf8');
  let score = 0;
  let total = 0;
  const findings = [];

  const checks = [
    { name: 'Title Tag', reg: /<title>.*<\/title>/i, weight: 10 },
    { name: 'Meta Description', reg: /<meta name="description" content="[^"]+"/, weight: 10 },
    { name: 'Canonical Tag', reg: /<link rel="canonical"/, weight: 5 },
    { name: 'Hreflang Tags', reg: /hreflang="[a-z]{2}"/, weight: 15 },
    { name: 'OpenGraph Tags', reg: /property="og:/, weight: 5 },
    { name: 'JSON-LD Structured Data', reg: /type="application\/ld\+json"/, weight: 20 },
    { name: 'Viewport Meta', reg: /name="viewport"/, weight: 5 },
    { name: 'Alt Text on Images', reg: /<img[^>]+alt="[^"]*"/, weight: 5 },
    { name: 'Semantic H1', reg: /<h1/, weight: 10 },
    { name: 'AI Opt-Out / robots.txt mention', reg: /ai-access\.json|ai:opt-out|GPTBot/, weight: 15 }
  ];

  checks.forEach(check => {
    total += check.weight;
    if (check.reg.test(content)) {
      score += check.weight;
    } else {
      findings.push(`Missing: ${check.name}`);
    }
  });

  return { filePath, score, total, percentage: Math.round((score / total) * 100), findings };
}

console.log('--- VeriMedia Search & AIO Audit Report ---');
let globalScore = 0;
let fileCount = 0;

filesToAudit.forEach(f => {
  const result = rateFile(f);
  if (result) {
    console.log(`\n📄 File: ${result.filePath}`);
    console.log(`   Score: ${result.percentage}% (${result.score}/${result.total})`);
    if (result.findings.length > 0) {
      console.log(`   Points for Improvement: ${result.findings.join(', ')}`);
    }
    globalScore += result.percentage;
    fileCount++;
  }
});

const finalRating = Math.round(globalScore / fileCount);
console.log('\n===========================================');
console.log(`🚀 OVERALL SITE RATING: ${finalRating}/100`);
console.log('===========================================');

if (finalRating < 70) {
  console.log('⚠️ Status: SUB-OPTIMAL. Optimization recommended.');
} else if (finalRating < 90) {
  console.log('✅ Status: GOOD. Minor tweaks could reach Elite status.');
} else {
  console.log('🔥 Status: ELITE. Site is highly optimized for AI & Search.');
}
