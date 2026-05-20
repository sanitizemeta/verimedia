/**
 * VeriMedia License Validator — Cloudflare Worker
 *
 * TWO endpoints on this single worker:
 *
 *   POST /validate  — called by the browser to check a license key
 *   POST /webhook   — called by Paddle when a purchase completes (auto-adds key to KV)
 *
 * ════════════════════════════════════════════════════════════════
 * HOW IT WORKS END-TO-END (fully automated):
 * ════════════════════════════════════════════════════════════════
 *
 *  1. Customer pays on Paddle checkout
 *  2. Paddle fires a webhook → https://verimedia-license.sanitizemeta.workers.dev/webhook
 *  3. Worker verifies the webhook signature (using your PADDLE_WEBHOOK_SECRET)
 *  4. Worker writes  transaction_id → "active"  into Workers KV
 *  5. Paddle automatically emails the customer their receipt
 *     (the receipt contains the Transaction ID — this becomes their license key)
 *  6. Customer opens verimedia.xyz, clicks "Activate License"
 *  7. Browser POSTs the transaction ID to /validate
 *  8. Worker does a KV lookup → returns { valid: true }
 *  9. App unlocks Creator Pro — done!
 *
 * ════════════════════════════════════════════════════════════════
 * ONE-TIME SETUP (you only do this once)
 * ════════════════════════════════════════════════════════════════
 *
 * STEP 1 — Set your Paddle Webhook Secret as a Worker secret:
 *   In Paddle Dashboard → Notifications → click your notification destination
 *   → copy the "Secret key" shown there
 *   Then run: wrangler secret put PADDLE_WEBHOOK_SECRET
 *   Paste the secret when prompted.
 *
 * STEP 2 — Set up the Paddle Webhook in Paddle Dashboard:
 *   Paddle Dashboard → Notifications → New Destination
 *   URL: https://verimedia-license.sanitizemeta.workers.dev/webhook
 *   Events: check "transaction.completed"
 *   Save → copy the "Secret key" → use it in STEP 1
 *
 * STEP 3 — (Optional) Add custom domain so users never see workers.dev:
 *   Cloudflare Dashboard → Workers & Pages → verimedia-license
 *   → Settings → Domains & Routes → Add Custom Domain
 *   Type: license.verimedia.xyz
 *   Then update src/main.js → LICENSE_VALIDATE_URL to https://license.verimedia.xyz/validate
 *
 * STEP 4 — Re-deploy after setting secrets:
 *   wrangler deploy
 */

// ── HMAC-SHA256 verification using Web Crypto (native in CF Workers) ──────────
async function verifyPaddleSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;

  try {
    // Paddle signature header format: "ts=1234567890;h1=abc123..."
    const parts = Object.fromEntries(
      signatureHeader.split(';').map(p => p.split('=').map((v, i) => i > 0 ? p.slice(p.indexOf('=') + 1) : v)).map(([k, v]) => [k, v])
    );

    const ts = signatureHeader.match(/ts=(\d+)/)?.[1];
    const h1 = signatureHeader.match(/h1=([a-f0-9]+)/)?.[1];
    if (!ts || !h1) return false;

    // Replay attack protection: reject webhooks older than 5 minutes
    const webhookAge = Date.now() / 1000 - parseInt(ts, 10);
    if (webhookAge > 300) return false;

    // Signed payload = "timestamp:rawBody"
    const signedPayload = `${ts}:${rawBody}`;

    // Import the secret as a HMAC-SHA256 key
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Compute expected signature
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    const expectedHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Timing-safe comparison
    if (expectedHex.length !== h1.length) return false;
    let diff = 0;
    for (let i = 0; i < expectedHex.length; i++) {
      diff |= expectedHex.charCodeAt(i) ^ h1.charCodeAt(i);
    }
    return diff === 0;

  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
}

// ── Main fetch handler ────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    // ── CORS: restrict to verimedia.xyz (+ localhost for dev) ──────────────
    const allowedOrigin = env.CORS_ORIGIN || 'https://verimedia.xyz';
    const origin = request.headers.get('Origin') || '';
    const isAllowedOrigin = origin === allowedOrigin || origin.startsWith('http://localhost');

    const corsHeaders = {
      'Access-Control-Allow-Origin':  isAllowedOrigin ? origin : allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age':       '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ── Route: POST /validate ─────────────────────────────────────────────
    if (url.pathname === '/validate') {
      return handleValidate(request, env, corsHeaders);
    }

    // ── Route: POST /webhook (no CORS needed — Paddle calls this directly) ─
    if (url.pathname === '/webhook') {
      return handleWebhook(request, env);
    }

    return new Response('Not found', { status: 404 });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// /validate — browser calls this to check a license key
// ─────────────────────────────────────────────────────────────────────────────
async function handleValidate(request, env, corsHeaders) {
  if (request.method !== 'POST') {
    return json({ valid: false, error: 'Method not allowed' }, 405, corsHeaders);
  }

  let licenseKey, deviceId;
  try {
    const body = await request.json();
    licenseKey = (body.license_key || '').trim().toUpperCase();
    deviceId   = (body.device_id || '').trim();
  } catch {
    return json({ valid: false, error: 'Invalid request body' }, 400, corsHeaders);
  }

  if (!licenseKey || licenseKey.length < 6) {
    return json({ valid: false, error: 'No valid license key provided' }, 400, corsHeaders);
  }

  try {
    const kvData = await env.LICENSE_KEYS.get(licenseKey);

    if (!kvData) {
      return json({ valid: false, error: 'License key not found. Double-check your purchase email from Paddle.' }, 200, corsHeaders);
    }

    // Parse the license data (support both old 'active' string and new JSON format)
    let license = { status: 'active', device_ids: [] };
    try {
      if (kvData !== 'active' && kvData !== 'revoked') {
        license = JSON.parse(kvData);
      } else {
        license.status = kvData;
      }
    } catch { /* fallback to default */ }

    if (license.status === 'revoked') {
      return json({ valid: false, error: 'This license has been revoked. Contact support@verimedia.xyz.' }, 200, corsHeaders);
    }

    // ── Device Limit Logic (3 Devices Max) ──────────────────────────────────
    if (deviceId) {
      if (!license.device_ids.includes(deviceId)) {
        if (license.device_ids.length >= 3) {
          return json({ 
            valid: false, 
            error: 'Device limit reached. This license is already active on 3 other devices. Contact support to reset.' 
          }, 200, corsHeaders);
        }
        // Register new device
        license.device_ids.push(deviceId);
        await env.LICENSE_KEYS.put(licenseKey, JSON.stringify(license));
      }
    }

    return json({ valid: true }, 200, corsHeaders);

  } catch (err) {
    console.error('KV lookup error:', err.message);
    return json({ valid: false, error: 'Validation service temporarily unavailable.' }, 502, corsHeaders);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// /webhook — Paddle calls this automatically when a purchase completes
// ─────────────────────────────────────────────────────────────────────────────
async function handleWebhook(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get('Paddle-Signature') || '';
  const webhookSecret = env.PADDLE_WEBHOOK_SECRET;

  if (webhookSecret) {
    const isValid = await verifyPaddleSignature(rawBody, signatureHeader, webhookSecret);
    if (!isValid) return new Response('Unauthorized', { status: 401 });
  }

  let event;
  try { event = JSON.parse(rawBody); } catch { return new Response('Invalid JSON', { status: 400 }); }

  const eventType = event.event_type || event.eventType;

  if (eventType === 'transaction.completed') {
    const transactionId = event.data?.id;
    if (!transactionId) return new Response('OK', { status: 200 });

    const licenseKey = transactionId.toUpperCase();

    try {
      const existing = await env.LICENSE_KEYS.get(licenseKey);
      if (!existing) {
        // Initializing with JSON format
        await env.LICENSE_KEYS.put(licenseKey, JSON.stringify({
          status: 'active',
          device_ids: [],
          purchase_date: new Date().toISOString()
        }));
      }
    } catch (err) {
      return new Response('Internal error', { status: 500 });
    }
  }

  return new Response('OK', { status: 200 });
}

// ── Helper ────────────────────────────────────────────────────────────────────
function json(data, status, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
