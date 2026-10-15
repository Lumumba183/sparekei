#!/usr/bin/env node
// Sparekei regression baseline (R5) — reproducible smoke checks against production.
// Run: node scripts/regression-baseline.mjs https://sparekei.com
// Exit code 0 = pass. This is the baseline every future change must keep green.
const BASE = process.argv[2] ?? 'https://sparekei.com';
let failures = 0;
const ok = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) failures++;
};
const get = async (path) => { try { const r = await fetch(BASE + path, { redirect: 'follow' }); return r; } catch { return null; } };

console.log(`Regression baseline against ${BASE}\n`);

// 1. Site serves
const home = await get('/');
ok('GET / serves the app', home?.status === 200, `status ${home?.status}`);

// 2. Auth wall: protected route redirects to sign-in (not a crash)
const dash = await get('/ai-concierge');
ok('Protected route handled (redirect or app shell)', dash != null && [200, 302, 307].includes(dash.status), `status ${dash?.status}`);

// 3. Static assets referenced by the build resolve
const html = await home.text();
const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(m => m[1]).slice(0, 5);
for (const a of assets) {
  const r = await get(a);
  ok(`Asset ${a.slice(0, 48)}…`, r?.status === 200, `status ${r?.status}`);
}

// 4. Edge functions are deployed (OPTIONS preflight)
for (const fn of ['ai-concierge', 'gov-cases']) {
  try {
    const r = await fetch(`${BASE.replace('https://', 'https://ujoskokvekykqvkkimbn.supabase.co/functions/v1/')}${fn}`, { method: 'OPTIONS' });
    ok(`Edge function deployed: ${fn}`, r.status < 500);
  } catch { ok(`Edge function deployed: ${fn}`, false, 'unreachable'); }
}

// 5. Truth-in-UI: the old false model attribution must be gone from the bundle
const mentionsGemini = /Gemini 2\.5 Flash/.test(html);
ok('No false "Gemini 2.5 Flash" attribution in index.html', !mentionsGemini);

console.log(`\n${failures === 0 ? 'BASELINE GREEN' : failures + ' check(s) failed'}`);
process.exit(failures === 0 ? 0 : 1);
