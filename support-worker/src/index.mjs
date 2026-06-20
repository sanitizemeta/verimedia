// VeriMedia support form backend (Cloudflare Worker + Resend).
// Receives the contact form POST from verimedia.xyz/support/ and emails it to
// the support inbox. No third-party form service. No data stored.
//
// Endpoints:
//   POST /submit   { name, email, message, topic, website(honeypot) } -> emails support
//   GET  /         health check
//
// Secrets (wrangler secret put): RESEND_API_KEY, SUPPORT_TO
// Vars (wrangler.toml): SUPPORT_FROM, ALLOWED_ORIGIN

const MAX = { name: 120, email: 200, topic: 80, message: 5000 };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return cors(request, env, new Response(null, { status: 204 }));
    if (request.method === 'GET' && url.pathname === '/') return new Response('ok');
    if (request.method !== 'POST' || url.pathname !== '/submit') return new Response('Not found', { status: 404 });

    const json = (body, status = 200) =>
      cors(request, env, new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

    let data;
    try { data = await request.json(); } catch { return json({ ok: false, error: 'bad_request' }, 400); }

    // Honeypot: real users never fill this hidden field.
    if (data.website) return json({ ok: true });

    const name = String(data.name || '').trim().slice(0, MAX.name);
    const email = String(data.email || '').trim().slice(0, MAX.email);
    const topic = String(data.topic || 'General').trim().slice(0, MAX.topic);
    const message = String(data.message || '').trim().slice(0, MAX.message);

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, error: 'invalid_email' }, 400);
    if (message.length < 5) return json({ ok: false, error: 'empty_message' }, 400);

    if (!env.RESEND_API_KEY || !env.SUPPORT_TO || !env.SUPPORT_FROM) {
      return json({ ok: false, error: 'server_misconfigured' }, 500);
    }

    const safe = (s) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    const html = `<h2>New support message</h2>
      <p><strong>Topic:</strong> ${safe(topic)}</p>
      <p><strong>From:</strong> ${safe(name) || '(no name)'} &lt;${safe(email)}&gt;</p>
      <hr/>
      <p style="white-space:pre-wrap">${safe(message)}</p>`;

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: env.SUPPORT_FROM,
          to: env.SUPPORT_TO,
          reply_to: email,
          subject: `Support: ${topic} from ${name || email}`,
          html,
          text: `Topic: ${topic}\nFrom: ${name} <${email}>\n\n${message}`,
        }),
      });
      if (!res.ok) return json({ ok: false, error: 'send_failed' }, 502);
    } catch {
      return json({ ok: false, error: 'send_failed' }, 502);
    }
    return json({ ok: true });
  },
};

function cors(request, env, response) {
  const allow = env.ALLOWED_ORIGIN || 'https://verimedia.xyz';
  const origin = request.headers.get('Origin') || '';
  const list = allow.split(',').map((s) => s.trim());
  response.headers.set('Access-Control-Allow-Origin', list.includes(origin) ? origin : list[0]);
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  response.headers.set('Vary', 'Origin');
  return response;
}
