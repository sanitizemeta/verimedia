// VeriForms - self-hosted form backend for verimedia.xyz pages.
// POST /f/{formId} with JSON or form-encoded fields; submissions are emailed
// via Resend to the product inbox. No accounts, no stored submissions.
//
// Spam control: hidden honeypot field (_gotcha), per-IP rate limit via KV,
// per-form origin allowlist, size caps. Failures return generic errors so
// bots learn nothing.

const FORMS = {
  'shotglow-feedback': {
    to: 'shotglow@verimedia.xyz',
    subject: 'Shotglow feedback',
  },
  'verimedia-contact': {
    to: 'shotglow@verimedia.xyz',
    subject: 'VeriMedia contact',
  },
};

const ALLOWED_ORIGINS = [
  'https://verimedia.xyz',
  'https://www.verimedia.xyz',
  'http://localhost:5173',
];

const RATE_LIMIT = 5; // submissions per IP per form per hour
const MAX_FIELDS = 20;
const MAX_FIELD_LEN = 5000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const originOk = ALLOWED_ORIGINS.includes(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin, originOk) });
    }

    const match = url.pathname.match(/^\/f\/([a-z0-9-]+)$/);
    if (request.method !== 'POST' || !match) {
      return new Response('Not found', { status: 404 });
    }

    const form = FORMS[match[1]];
    if (!form || !originOk) {
      return json(origin, originOk, { ok: false, error: 'rejected' }, 403);
    }

    // Parse JSON or form-encoded bodies (plain <form> posts work without JS).
    let fields;
    try {
      const ct = request.headers.get('Content-Type') || '';
      if (ct.includes('application/json')) {
        fields = await request.json();
      } else {
        fields = Object.fromEntries((await request.formData()).entries());
      }
    } catch (_) {
      return json(origin, originOk, { ok: false, error: 'bad_request' }, 400);
    }

    // Honeypot: bots fill every field. Pretend success so they move on.
    if (fields._gotcha) {
      return json(origin, originOk, { ok: true });
    }
    delete fields._gotcha;

    const entries = Object.entries(fields)
      .filter(([, v]) => typeof v === 'string' && v.trim())
      .slice(0, MAX_FIELDS)
      .map(([k, v]) => [k, String(v).slice(0, MAX_FIELD_LEN)]);
    if (!entries.length) {
      return json(origin, originOk, { ok: false, error: 'empty' }, 400);
    }

    // Per-IP rate limit (KV TTL is the window; minimum TTL is 60s).
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rlKey = `rl:${match[1]}:${ip}`;
    const count = Number(await env.RATE.get(rlKey)) || 0;
    if (count >= RATE_LIMIT) {
      return json(origin, originOk, { ok: false, error: 'rate_limited' }, 429);
    }
    await env.RATE.put(rlKey, String(count + 1), { expirationTtl: 3600 });

    const replyTo = entries.find(([k]) => k.toLowerCase() === 'email')?.[1];
    const sent = await sendEmail(env, form, entries, replyTo, ip);
    return json(origin, originOk, sent ? { ok: true } : { ok: false, error: 'send_failed' }, sent ? 200 : 502);
  },
};

function cors(origin, ok) {
  return {
    'Access-Control-Allow-Origin': ok ? origin : 'https://verimedia.xyz',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(origin, ok, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin, ok), 'Content-Type': 'application/json' },
  });
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function sendEmail(env, form, entries, replyTo, ip) {
  const rows = entries.map(([k, v]) =>
    `<tr><td style="padding:8px 12px;border:1px solid #262626;font-weight:700;color:#7EC47E;vertical-align:top;white-space:nowrap;">${esc(k)}</td><td style="padding:8px 12px;border:1px solid #262626;color:#e8e4de;white-space:pre-wrap;">${esc(v)}</td></tr>`
  ).join('');
  const html = `
  <div style="margin:0;padding:24px 12px;background:#060606;font-family:'Courier New',monospace;">
    <div style="max-width:560px;margin:0 auto;">
      <p style="margin:0 0 12px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#7EC47E;">VeriForms submission</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:13px;background:#141414;">${rows}</table>
      <p style="margin:12px 0 0;font-size:11px;color:#7a756d;">From IP ${esc(ip)} &middot; reply goes to the sender when they left an email.</p>
    </div>
  </div>`;
  const text = entries.map(([k, v]) => `${k}: ${v}`).join('\n');
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'VeriForms <forms@verimedia.xyz>',
        to: [form.to],
        ...(replyTo && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo) ? { reply_to: replyTo } : {}),
        subject: form.subject,
        html,
        text,
      }),
    });
    return res.ok;
  } catch (_) {
    return false;
  }
}
