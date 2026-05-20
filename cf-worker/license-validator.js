/**
 * VeriMedia License Validator — Cloudflare Worker
 *
 * ARCHITECTURE:
 *   Browser → POST /validate { license_key }
 *   Worker  → checks Workers KV store → { valid: true/false }
 *   KV is populated by your Paddle webhook endpoint (see webhook notes below)
 *
 * ════════════════════════════════════════════════════════════════
 * ONE-TIME SETUP (do this once, takes ~10 minutes)
 * ════════════════════════════════════════════════════════════════
 *
 * STEP 1 — Install Wrangler (Cloudflare's CLI, free)
 *   npm install -g wrangler
 *   wrangler login
 *
 * STEP 2 — Create a KV namespace to store license keys
 *   cd cf-worker
 *   wrangler kv:namespace create "LICENSE_KEYS"
 *   → Copy the returned `id` and paste it in wrangler.toml
 *
 * STEP 3 — Deploy the worker
 *   wrangler deploy
 *   → Note your worker URL: https://verimedia-license.YOUR.workers.dev
 *   → Paste it into src/main.js → LICENSE_VALIDATE_URL
 *
 * STEP 4 — Set CORS_ORIGIN secret (your live domain)
 *   wrangler secret put CORS_ORIGIN
 *   → Type: https://verimedia.xyz  (and press Enter)
 *
 * ════════════════════════════════════════════════════════════════
 * ADDING LICENSE KEYS (when a customer buys)
 * ════════════════════════════════════════════════════════════════
 *
 * Since you're on Paddle Billing (no built-in license keys), here's the flow:
 *
 * OPTION A — Manual (easiest for < 100 customers):
 *   After each purchase, go to your Paddle Dashboard → Transactions
 *   Copy the transaction ID (e.g. txn_01abc123)
 *   Use that as the license key you email the customer, then add it to KV:
 *     wrangler kv:key put --namespace-id=YOUR_KV_ID "txn_01abc123" "active"
 *
 * OPTION B — Automated via Paddle Webhook (recommended):
 *   1. In Paddle Dashboard → Notifications → New Notification
 *   2. Point it at a webhook URL (a second small worker or serverless function)
 *   3. On `transaction.completed` event, write the key to KV:
 *      await env.LICENSE_KEYS.put(transaction.id, 'active');
 *   4. Email the customer their transaction ID as their license key
 *      (Paddle does this automatically via their email templates)
 *
 * OPTION C — Use a third-party license manager like Keygen.sh or Cryptlex
 *   These integrate with Paddle Billing webhooks and handle license
 *   generation, seat management, and activation automatically.
 *   Keygen has a generous free tier for indie developers.
 */

export default {
  async fetch(request, env) {

    // ── CORS headers ──────────────────────────────────────────────────────────
    const allowedOrigin = env.CORS_ORIGIN || 'https://verimedia.xyz';
    const origin = request.headers.get('Origin') || '';

    const corsHeaders = {
      'Access-Control-Allow-Origin': (origin === allowedOrigin || origin.includes('localhost'))
        ? origin
        : allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return json({ valid: false, error: 'Method not allowed' }, 405, corsHeaders);
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    let licenseKey;
    try {
      const body = await request.json();
      licenseKey = (body.license_key || '').trim().toUpperCase();
    } catch {
      return json({ valid: false, error: 'Invalid request body' }, 400, corsHeaders);
    }

    if (!licenseKey || licenseKey.length < 8) {
      return json({ valid: false, error: 'No valid license key provided' }, 400, corsHeaders);
    }

    // ── KV lookup: is this key active? ───────────────────────────────────────
    try {
      const status = await env.LICENSE_KEYS.get(licenseKey);

      if (status === 'active') {
        return json({ valid: true }, 200, corsHeaders);
      } else if (status === 'revoked') {
        return json({ valid: false, error: 'This license has been revoked. Contact support@verimedia.xyz.' }, 200, corsHeaders);
      } else {
        // Not found in KV — key doesn't exist or was never activated
        return json({ valid: false, error: 'License key not found. Double-check your purchase email.' }, 200, corsHeaders);
      }
    } catch (err) {
      console.error('KV lookup error:', err.message);
      return json({ valid: false, error: 'Validation service temporarily unavailable. Try again.' }, 502, corsHeaders);
    }
  }
};

// ── Helper ────────────────────────────────────────────────────────────────────
function json(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
