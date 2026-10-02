// Auth-flow debugger v2: fetch + XHR interception, navigation with stacks,
// full-reload detection, click logging, Clerk state. Filter console: [authflow]
const TAG = '[authflow]';
function log(...args: any[]) { console.log(TAG, ...args); }

export function installAuthFlowDebug() {
  const w = window as any;
  if (w.__authflowInstalled) return;
  w.__authflowInstalled = true;

  // 0) detect full page reloads (the current suspect)
  window.addEventListener('beforeunload', (e) => {
    log('!! PAGE RELOAD/UNLOAD triggered ||', (new Error().stack || '').split('\n').slice(1, 6).join(' <- '));
  });

  // 0b) log every button click (sequence reconstruction)
  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    log('CLICK on', (t.tagName || '?') + (t.textContent ? ` "${(t.textContent || '').trim().slice(0, 40)}"` : ''));
  }, true);

  // 1) fetch interceptor
  const ofetch = window.fetch.bind(window);
  window.fetch = (async (input: any, init: any = {}) => {
    const url: string = typeof input === 'string' ? input : (input?.url ?? '');
    const interesting = url.includes('clerk') || url.includes('supabase.co');
    const method = (init?.method || input?.method || 'GET').toUpperCase();
    if (!interesting) return ofetch(input, init);
    log(`-> fetch ${method} ${url.slice(0, 120)}`);
    try {
      const res = await ofetch(input, init);
      res.clone().text().then((body: string) => {
        log(`<- fetch ${res.status} ${method} ${url.split('?')[0].slice(-50)} :: ${body.slice(0, 300)}`);
      }).catch(() => log(`<- fetch ${res.status} (body unreadable)`));
      return res;
    } catch (e: any) {
      log(`!! FETCH FAILED ${method} ${url.slice(0, 90)} :: ${e?.message}`);
      throw e;
    }
  }) as typeof fetch;

  // 2) XHR interceptor (clerk-js may use XHR, not fetch)
  const OX = XMLHttpRequest.prototype;
  const oopen = OX.open, osend = OX.send;
  OX.open = function (m: string, u: string | URL) {
    (this as any).__af_url = String(u); (this as any).__af_m = m;
    return oopen.apply(this, arguments as any);
  } as any;
  OX.send = function () {
    const u = (this as any).__af_url || '';
    if (u.includes('clerk') || u.includes('supabase.co')) {
      log(`-> XHR ${(this as any).__af_m} ${u.slice(0, 120)}`);
      this.addEventListener('load', () => {
        log(`<- XHR ${this.status} ${String(u).split('?')[0].slice(-50)} :: ${String(this.responseText || '').slice(0, 300)}`);
      });
      this.addEventListener('error', () => log(`!! XHR FAILED ${String(u).slice(0, 90)}`));
    }
    return osend.apply(this, arguments as any);
  } as any;

  // 3) navigation tracker with stack
  const wrap = (fn: any, name: string) =>
    function (this: any, ...args: any[]) {
      const target = args[2] ?? args[0];
      const stack = (new Error().stack || '').split('\n').slice(2, 6).join(' <- ');
      log(`NAV ${name} -> ${String(target).slice(0, 90)} || ${stack}`);
      return fn.apply(this, args);
    };
  history.pushState = wrap(history.pushState, 'pushState');
  history.replaceState = wrap(history.replaceState, 'replaceState');
  window.addEventListener('hashchange', () => log('NAV hashchange ->', location.href));
  window.addEventListener('popstate', () => log('NAV popstate ->', location.href));

  // 4) uncaught errors / rejections
  window.addEventListener('error', (e) => log('UNCAUGHT:', e.message, `${e.filename}:${e.lineno}`));
  window.addEventListener('unhandledrejection', (e: any) =>
    log('REJECTION:', String(e?.reason?.message || e?.reason).slice(0, 300)));

  // 5) Clerk state
  setTimeout(() => {
    if (w.Clerk) {
      log('Clerk loaded. session=', !!w.Clerk.session, 'user=', !!w.Clerk.user);
      try {
        w.Clerk.addListener((s: any) => {
          log('Clerk state: session=', !!s?.session, 'user=', !!s?.user,
              'signIn=', s?.signIn?.status ?? null, 'signUp=', s?.signUp?.status ?? null);
        });
      } catch (e) { log('listener failed', e); }
    } else log('window.Clerk NOT present after 3s');
  }, 3000);

  log('v2 installed. Attempt login; copy every line tagged', TAG);
}
