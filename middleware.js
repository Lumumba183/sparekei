// Same-origin Clerk proxy (Edge Middleware, official zero-config location).
// Runs only for /__clerk/* requests; everything else passes through untouched.
const TARGET = 'https://clerk.id.sparekei.com';
const PROXY_URL = 'https://sparekei.com/__clerk';

export default async function middleware(req) {
  const u = new URL(req.url);
  if (!u.pathname.startsWith('/__clerk')) return; // pass through to app
  const path = u.pathname.replace(/^\/__clerk/, '') + u.search;
  const headers = new Headers(req.headers);
  headers.set('host', 'clerk.id.sparekei.com');
  headers.set('clerk-proxy-url', PROXY_URL);
  headers.set('x-forwarded-host', u.host);
  headers.set('x-forwarded-proto', 'https');
  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') body = await req.text();
  const r = await fetch(TARGET + path, { method: req.method, headers, body });
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: r.headers });
}

export const config = { matcher: '/__clerk/:path*' };
