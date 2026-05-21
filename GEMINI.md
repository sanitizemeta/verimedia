# VeriMedia - Project Architecture & Technical Context

## Overview
VeriMedia is a 100% client-side privacy tool that removes sensitive metadata (GPS, EXIF, etc.) from images and PDFs, while injecting creator identity, copyright, and AI opt-out indicators.

## Tech Stack
- **Frontend:** Vanilla HTML/CSS/JS (Vite 5 build system)
- **UI Theme:** "Cosmic Cyberpunk" (Dark navy `#090D19`, Cyan `#06B6D4`, Emerald `#10B981`)
- **Metadata Engine:** `piexifjs` (JPEG), `exifr` (analysis), `pdf-lib` (PDF), `heic2any` (HEIC support), `cbor-x` (CBOR/C2PA).
- **Batch Processing:** `jszip` (dynamically imported for Pro users)
- **Deployment:** Cloudflare Pages (Frontend) & Cloudflare Workers (Backend validation)
- **Localization:** Custom zero-dependency i18n engine using local JSON bundles (EN, ES, FR).

## Licensing & Payment Architecture (Paddle Billing v2)
The application uses a hybrid client/edge architecture for secure, automated licensing.

### 1. Paddle Integration (Frontend)
- **Library:** Paddle.js v2 (Overlay mode)
- **Product Model:** Single Lifetime Deal ($19). Quantity is restricted to 1 via Paddle Dashboard settings.
- **Client Token:** `live_2f19b88294a235307e74e44f820`
- **Price ID:** `pri_01ks3bgn6zyh2bsvqk438c3dcv`
- **Critical Implementation Detail:** The `eventCallback` MUST be placed inside `Paddle.Initialize()`, not inside `Paddle.Checkout.open()`.
- **Auto-Activation:** On `checkout.completed`, the frontend extracts `event.data.transaction_id` and polls the CF Worker to verify the key. `successUrl` must be omitted to prevent premature page reloads that kill the polling script.

### 2. License Validation (Cloudflare Worker)
- **Location:** `cf-worker/license-validator.js`
- **Database:** Cloudflare KV (`LICENSE_KEYS` namespace).
- **Format:** Keys are Paddle Transaction IDs (`TXN_...`). Values are JSON objects tracking status and devices: `{ status: 'active', device_ids: [], purchase_date: '...' }`
- **Endpoints:**
  - `POST /validate`: Called by the browser. Verifies the key and enforces a **3-device limit** by tracking unique browser-generated `device_id`s.
  - `POST /webhook`: Called by Paddle. Listens for `transaction.completed` or `transaction.paid`, validates the HMAC-SHA256 signature using `PADDLE_WEBHOOK_SECRET`, and idempotently registers the key in KV.

## Core Capabilities
- **Neural Privacy Shield:** Intelligent metadata stripping for Images (JPEG, PNG, WebP, HEIC) and PDFs.
- **Forensic PDF Scrubbing:** 'Nuke and Pave' strategy that physically overwrites metadata streams with empty data to prevent forensic recovery/carving.
- **AI Opt-Out Injection:** Standardized `ai:opt-out=true` embedding recognized by major model crawlers (GPTBot, ClaudeBot).
- **Creator Identity (Pro):** Custom Author, Copyright, and License URL (Google Licensable Badge) injection across all supported formats.
- **Whitelabel (Pro):** Pro-exclusive toggle to remove all VeriMedia branding from file metadata, replacing 'Software' tags with 'Original Content Engine'.
- **Multi-Lingual (i18n):** 100% localized interface for English (EN), Spanish (ES), and French (FR) with persistent real-time language switching.
- **Profile Portability:** Export/Import creator settings via secure JSON (license keys excluded for security).
- **SEO/AIO Optimized:** High-density semantic data and Schema.org integration (HowTo, SoftwareApplication, Organization) for Google AI Mode (Gemini/SGE).

## Specialized Agent Skills
- **skill-fetcher:** A custom, project-agnostic "Smart CTO" skill that autonomously researches and evaluating top-tier FREE and OPEN-SOURCE tools based on adoption metrics (Stars, Downloads).

## Tech Stack
- **Frontend:** Vanilla HTML/CSS/JS (Vite 5 build system).
- **Localization:** Custom zero-dependency i18n engine using local JSON bundles.
- **UI Theme:** "Cosmic Cyberpunk" (Glassmorphism, Neon Cyan/Emerald, Dark Space background).
- **Metadata Engine:** `piexifjs` (JPEG), `pdf-lib` (PDF), Custom surgical byte injection (PNG/WebP).
- **Security:** 100% Client-side. Local processing via WebWorkers and ArrayBuffers. No serverside storage.
- **Licensing:** Paddle.js v2 + Cloudflare Workers/KV (3-device hardware locking).

## Critical Implementation Details
- **Branding Logic:** Free users get "VeriMedia Verified Creator" branding. Pro users can toggle "Whitelabel" to remove it.
- **Global Modals:** Profile and Payment modals must be present on every page (`index`, `privacy`, `terms`, `refund`) to ensure consistent functional access.
- **Form Safety:** All profile/license buttons must use `e.preventDefault()` to prevent accidental form-triggered page refreshes.
- **C2PA Awareness:** The engine detects and handles C2PA manifests for content provenance verification.
