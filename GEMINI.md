# VeriMedia - Project Architecture & Technical Context

## Overview
VeriMedia is a 100% client-side privacy tool that removes sensitive metadata (GPS, EXIF, etc.) from images and PDFs, while injecting creator identity, copyright, and AI training opt-out tags. It is designed for high performance (sub-100ms processing) and maximum privacy.

## Core Mandates
- **Zero-Server Policy:** No media files must ever be uploaded to a server. All sanitization must happen in the user's browser using `engine.ts`.
- **Performance Threshold:** Core engine must maintain sub-100ms processing. JPEG identity injection must be performed at the byte-level (XMP APP1) to avoid expensive string conversions or slow frontend libraries.
- **AIO/GEO/SEO First:** Maintain **Elite 100/100 Search & AI Rating**.
  - **Meta Descriptions:** Keep between 70-160 characters for Bing compliance.
  - **Text Density:** Maintain visible "Semantic Context" blocks for crawlers to prevent "Thin Content" flags.
  - **Language ID:** Always include `<meta http-equiv="content-language">` and correctly synced `rel="alternate"` headers.
- **Premium Aesthetic:** Maintain the "Cosmic Cyberpunk" (Glassmorphism) theme with **Lucide SVG icons**. **Emojis are strictly prohibited** in the core UI and translation strings.
- **Conversion Discipline:** The "Interactive Sandbox" and "Try Sample" triggers are high-priority conversion anchors. Keep them above the fold.

## High-Impact Features
- **Neural Privacy Shield:** Intelligent metadata stripping for Images (JPEG, PNG, WebP, HEIC) and PDFs.
- **Forensic Audit Details:** Granular view of specific tags removed and identity markers added per file.
- **AI Training Shield:** Standardized `ai:opt-out=true` binary tag injection.
- **E-E-A-T Signer:** Google Licensable Badge support via automated IPTC/XMP metadata embedding.
- **Multi-Lingual (i18n):** 100% localized for EN, ES, FR, and DE with AI-aware URL routing (`?lang=`) and dynamic document titles/meta tags.
- **Global Social Proof:** Real-time sanitization counter linked to Cloudflare Workers KV.
- **Sitemap Elite:** Multi-language `hreflang` support integrated directly into `sitemap.xml` with zero-whitespace formatting for GSC compatibility.

## Specialized Agent Skills
- **search-optimization:** (Local) Custom framework to rate and optimize the site for Generative AI search (SGE/Gemini/Bing). Run `node search-optimization/scripts/rate_site.cjs` to verify.
- **skill-fetcher:** CTO-level researcher for identifying top-tier open-source tools.

## Tech Stack
- **Frontend:** Vanilla JS (ES Modules) + Vite.
- **Styling:** Vanilla CSS (Cyberpunk/Glassmorphism).
- **Backend (Licensing):** Cloudflare Workers + Workers KV + Paddle Billing v2.
- **Core Engine:** `exifr`, `pdf-lib`, `cbor-x`. (`piexifjs` maintained as legacy fallback but bypassed for high-speed JPEG injection).

## Critical Technical Paths
- **Worker Endpoints:**
  - `POST /validate`: License key verification with 3-device locking.
  - `GET /stats`: Fetch global sanitization count.
  - `POST /increment-stats`: Update global count (accepts `{ amount: n }`).
  - `POST /webhook`: Paddle-to-KV automated activation.
- **SEO Sync:** `src/main.js` -> `applyTranslations()` must always update `document.documentElement.lang`, `meta[name="description"]`, localized `JSON-LD`, and call `lucide.createIcons()`.

## Visual Standards
- **Hover Transitions:** Use `translateY(-2px)` on cards. Ensure parent `overflow: visible !important` to prevent shadow/clipping bugs.
- **Icons:** Use `<i data-lucide="..."></i>` placeholders. Colors: Emerald (Success), Cyan (Action), Rose (Danger/Removal).
