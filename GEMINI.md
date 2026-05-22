# VeriMedia - Project Architecture & Technical Context

## Overview
VeriMedia is a 100% client-side privacy tool that removes sensitive metadata (GPS, EXIF, etc.) from images and PDFs, while injecting creator identity, copyright, and AI training opt-out tags. It is designed for high performance (sub-100ms processing) and maximum privacy.

## Core Mandates
- **Zero-Server Policy:** No media files must ever be uploaded to a server. All sanitization must happen in the user's browser using `engine.ts`.
- **AIO/GEO First:** The codebase must maintain its **Elite 100/100 Search & AI Rating**. Any content changes must preserve high-density technical keywords and localized JSON-LD schemas.
- **Conversion Discipline:** The "Interactive Sandbox" and "Try Sample" triggers are high-priority conversion anchors. Keep them above the fold.
- **Premium Aesthetic:** Maintain the "Cosmic Cyberpunk" (Glassmorphism) theme with Lucide SVG icons. No emojis in the core UI.

## High-Impact Features
- **Neural Privacy Shield:** Intelligent metadata stripping for Images (JPEG, PNG, WebP, HEIC) and PDFs.
- **AI Training Shield:** Standardized `ai:opt-out=true` binary tag injection.
- **E-E-A-T Signer:** Google Licensable Badge support via automated IPTC/XMP metadata embedding.
- **Multi-Lingual (i18n):** 100% localized for EN, ES, and FR with AI-aware URL routing (`?lang=`) and dynamic document titles/meta tags.
- **Global Social Proof:** Real-time sanitization counter linked to Cloudflare Workers KV.
- **Sitemap Elite:** Multi-language `hreflang` support integrated directly into `sitemap.xml`.

## Specialized Agent Skills
- **search-optimization:** (Local) Custom framework to rate and optimize the site for Generative AI search (SGE/Gemini). Run `node search-optimization/scripts/rate_site.cjs` to verify.
- **skill-fetcher:** CTO-level researcher for identifying top-tier open-source tools.

## Tech Stack
- **Frontend:** Vanilla JS (ES Modules) + Vite.
- **Styling:** Vanilla CSS (Cyberpunk/Glassmorphism).
- **Backend (Licensing):** Cloudflare Workers + Workers KV + Paddle Billing v2.
- **Core Engine:** `exifr`, `pdf-lib`, `piexifjs`, `cbor-x`.

## Critical Technical Paths
- **Worker Endpoints:**
  - `POST /validate`: License key verification with 3-device locking.
  - `GET /stats`: Fetch global sanitization count.
  - `POST /increment-stats`: Update global count (accepts `{ amount: n }`).
  - `POST /webhook`: Paddle-to-KV automated activation.
- **SEO Sync:** `src/main.js` -> `applyTranslations()` must always update `document.documentElement.lang`, `meta[name="description"]`, and localized `JSON-LD`.

## Visual Standards
- **Hover Transitions:** Use `translateY(-2px)` to prevent vertical clipping.
- **Overflow:** Parent containers (`main`, `section`) must use `overflow: visible` to accommodate glowing card shadows.
- **Icons:** Use SVG only (Lucide style). Default color: `var(--accent-cyan)`.
