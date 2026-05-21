# VeriMedia - Project Architecture & Technical Context

## Overview
VeriMedia is a 100% client-side privacy tool that removes sensitive metadata (GPS, EXIF, etc.) from images and PDFs, while injecting creator identity, copyright, and AI opt-out indicators.

## Tech Stack
- **Frontend:** Vanilla HTML/CSS/JS (Vite build system)
- **UI Theme:** "Cosmic Cyberpunk" (Dark navy `#090D19`, Cyan `#06B6D4`, Emerald `#10B981`)
- **Metadata Engine:** `piexifjs` (for JPEG EXIF injection), `exifreader` (for analysis), `pdf-lib` (for PDF sanitization).
- **Batch Processing:** `jszip` (dynamically imported for Pro users)
- **Deployment:** Cloudflare Pages (Frontend) & Cloudflare Workers (Backend validation)

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

## Key Features & Constraints
- **File Processing Limit:** 25MB per file (client-side memory constraint).
- **Free Tier:** Single file processing only. No creator identity injection.
- **Pro Tier:** Unlocked via valid license key. Enables batch processing (up to 100 files via ZIP), identity injection, Google Licensable Badge schema, and multi-device support (up to 3).
- **AI Opt-Out:** Supports injecting `ai:opt-out=true` into image descriptions.
