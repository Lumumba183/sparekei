// Same-origin proxy for Clerk Frontend API (CommonJS - safe regardless of package.json type)
const TARGET = 'https://clerk.id.sparekei.com';
const PROXY_URL = 'https://sparekei.com/__clerk';

module.exports = async function handler(req, res) {
  try {
    const u = new URL(req.url, 'https://sparekei.com');
    const path = u.pathname.replace(/^\/api\/clerk-proxy/, '') || '/';
    const target = TARGET + path + u.search;

    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (['host', 'connection', 'content-length', 'transfer-encoding'].includes(k)) continue;
      headers[k] = v;
    }
    headers['host'] = 'clerk.id.sparekei.com';
    headers['clerk-proxy-url'] = PROXY_URL;
    headers['x-forwarded-host'] = 'sparekei.com';
    headers['x-forwarded-proto'] = 'https';
    headers['x-forwarded-for'] = req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || '';

    let body;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      if (chunks.length) body = Buffer.concat(chunks);
    }

    const r = await fetch(target, { method: req.method, headers, body });
    res.status(r.status);
    r.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (['transfer-encoding', 'content-encoding', 'connection'].includes(k)) return;
      res.setHeader(k, value);
    });
    const buf = Buffer.from(await r.arrayBuffer());
    res.send(buf);
  } catch (e) {
    res.status(502).json({ error: 'proxy failed', detail: String((e && e.message) || e) });
  }
};
