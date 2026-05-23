# VeriMedia Growth Operations (Living Document)

This document is the day-to-day operating manual for SEO/AIO/GEO + conversion execution.

## Goals

- Day 1: get indexed pages and first visitors.
- Month 1: target first 10 conversions.

## Pricing & Limits (Current)

- `Free`: 1 file/batch, 5MB/file, no paid license.
- `Plus ($9.99 one-time)`: 100 files/batch, 25MB/file, 1 device license.
- `Pro ($19 one-time)`: unlimited batch, 100MB/file, whitelabel, 3 device license.

## Core URLs

- `https://verimedia.xyz/`
- `https://verimedia.xyz/ai-opt-out-metadata`
- `https://verimedia.xyz/remove-exif-from-photos`
- `https://verimedia.xyz/remove-pdf-metadata`
- `https://verimedia.xyz/knowledge`
- `https://verimedia.xyz/privacy`
- `https://verimedia.xyz/terms`
- `https://verimedia.xyz/refund`

## Daily Checklist (Do Every Day)

1. Run quality gate before touching production:
   - `npm run seo:check`
2. Run no-API growth pack:
   - `npm run growth:noapi-pack`
3. Check indexing status manually in:
   - Google Search Console
   - Bing Webmaster Tools
   - Ahrefs Site Audit issues diff (latest crawl vs previous crawl)
4. Check search performance manually:
   - Impressions
   - Clicks
   - CTR
   - Top pages
5. Review funnel event summary from browser:
   - Open site in browser
   - Open DevTools Console
   - Run: `window.VerimediaGrowth.getEventSummary()`
6. Export local events at end of day:
   - Run: `window.VerimediaGrowth.exportEventsJson()`
   - Save exported file in `growth/reports/` for tracking history.
7. Re-request indexing for changed URLs in both GSC and Bing.

## How To Do Funnel Baseline (Step 1)

Use this event sequence:

- `upload_started`
- `file_processed`
- `pricing_opened`
- `checkout_started`
- `purchase_success`

### Process

1. In console, run:
   - `window.VerimediaGrowth.getEventSummary()`
2. Record counts in a daily table (date + 5 event counts).
3. Calculate stage conversion rates:
   - `file_processed / upload_started`
   - `pricing_opened / file_processed`
   - `checkout_started / pricing_opened`
   - `purchase_success / checkout_started`

### Minimum baseline period

- Use at least 3-7 days of data before major redesign decisions.

## How To Find/Fix Biggest Leak (Step 2)

Identify the largest drop between adjacent funnel stages.

### If drop is `upload_started -> file_processed`

- Improve upload clarity and processing feedback.
- Reduce unsupported file friction.
- Ensure errors are explicit and actionable.

### If drop is `file_processed -> pricing_opened`

- Strengthen post-success value messaging.
- Add clearer upgrade prompt after successful file processing.
- Emphasize AI opt-out + ownership bundle value.

### If drop is `pricing_opened -> checkout_started`

- Tighten pricing card trust cues.
- Make license activation explanation clearer.
- Reduce uncertainty around one-time payment.

### If drop is `checkout_started -> purchase_success`

- Check checkout flow quality and copy.
- Remove extra friction around payment and license steps.
- Verify no UI interruptions around Paddle flow.

## URL Indexing Checklist

Use generated checklist:

- `growth/reports/manual-indexing-checklist.md`

Regenerate anytime sitemap changes:

- `npm run growth:index-pack`

## Technical SEO Audit Triage (Daily)

When Ahrefs reports errors/warnings:

1. Fix in this order:
   - 4xx/broken internal links
   - Canonical-to-redirect
   - Hreflang errors
   - Orphan pages
   - Low word count on indexable pages
2. After fixes:
   - `npm run build`
   - push to `main`
   - request indexing for changed URLs in GSC/Bing
3. Re-crawl in Ahrefs and compare issue deltas.

## Recent Fix Log (2026-05-24)

- Canonicals moved to extensionless 200 URLs (removed `.html` canonical redirects).
- Sitemap and internal links updated to extensionless URLs.
- Removed broken external references in `knowledge`.
- Removed broken Cloudflare email-protection crawl path source from policy pages.
- Simplified hreflang sets to avoid non-canonical/incomplete group errors.
- Added internal link to `knowledge` from homepage footer (orphan fix).
- Expanded `knowledge` content above low-word threshold.

## Content/SEO Operations

### Every 2-3 days

1. Pick 1 page with impressions but weak CTR.
2. Improve only:
   - Title
   - Meta description
   - First paragraph
3. Re-request indexing for that page in GSC/Bing.

### Weekly

1. Add or refresh one high-intent section/page.
2. Regenerate schema manifest:
   - `npm run growth:schema-manifest`
3. Check `growth/reports/schema-manifest.json` for drift.

## Release Checklist

Before pushing:

1. `npm run seo:check`
2. `npm run build`
3. Validate key pages load:
   - Home
   - AI Opt-Out page
   - EXIF page
   - PDF page
4. Commit and push.

## Current Guardrails

- Avoid thin, low-value page spam.
- Keep AI opt-out protection as primary positioning.
- Keep metadata cleanup as secondary proof/supporting capability.
- Prefer focused, high-quality updates over volume.

## Notes Log (append below)

Use this section daily:

- Date:
- Indexing status:
- Ahrefs issue counts (errors/warnings):
- Top page by impressions:
- Top page by clicks:
- Funnel counts:
- Biggest leak:
- Change shipped:
- Next action:
