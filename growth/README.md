# Day-1 Growth Automation Stack (No-API Mode)

This folder provides a no-API implementation for day-1 SEO/AIO launch operations:

1. Manual indexing pack generation from sitemap
2. First-party local analytics event instrumentation (in-browser)
3. Schema JSON-LD manifest generation
4. Local entity knowledge pack for GEO/AIO pages
5. Local citation/source page for trust context

## Commands

- `npm run seo:check`  
  Blocks release on high-severity SEO/AIO issues.

- `npm run seo:report`  
  JSON report for CI artifacts.

- `npm run growth:index-pack`  
  Generates `growth/reports/manual-indexing-checklist.md` from sitemap URLs.

- `npm run growth:schema-manifest`  
  Generates `growth/reports/schema-manifest.json` with JSON-LD coverage by page.

- `npm run growth:noapi-pack`  
  Runs SEO quality gate + indexing pack + schema manifest in one command.

- `npm run growth:schema-check`  
  Verifies JSON-LD presence/parseability/types on core pages.

- `npm run growth:query-plan -- growth/data/gsc_queries.csv`  
  Prioritizes query opportunities from exported Search Console CSV.

## No-API Indexing Workflow

1. Run `npm run growth:index-pack`.
2. Open `growth/reports/manual-indexing-checklist.md`.
3. Submit URLs manually in Google Search Console and Bing Webmaster.
4. Track completion in checklist.

## Search Console Notes

Google does not provide a generic "submit URL" API for all pages.
Use Search Console UI for request indexing, and use exports for diagnostics.

Recommended loop:

1. Export query performance weekly.
2. Run `growth:query-plan`.
3. Update page titles/intros/CTAs for top opportunities.
