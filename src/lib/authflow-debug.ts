// Auth-flow debugger v2: fetch + XHR interception, navigation with stacks,
// full-reload detection, click logging, Clerk state. Filter console: [authflow]
const TAG = '[authflow]';
function log(...args: any[]) { console.log(TAG, ...args); }

export function installAuthFlowDebug() {
  const w = window as any;
  if (w.__authflowInstalled) return;
  w.__authflowInstalled = true;

  window.addEventListener('beforeunload', () => {
    log('!! PAGE RELOAD/UNLOAD ||', (new Error().stack || '').split('\n').slice(1, 6).join(' <- '));
  });

  document.addEventListener('click', (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    log('CLICK on', (t?.tagName || '?') + (t?.textContent ? ` "${(t.textContent || '').trim().slice(0, 40)}"` : ''));
  }, true);

  const ofetch = window.fetch.bind(window);
  window.fetch = (async (input: any, init: any = {}) => {
    const url: string = typeof input === 'string' ? input : (input?.url ?? '');
    const interesting = url.includes('clerk') || url.includes('supabase.co');
    const method = String(init?.method || input?.method || 'GET').toUpperCase();
    if (!interesting) return ofetch(input, init);
    log('-> fetch', method, url.slice(0, 120));
    try {
      const res = await ofetch(input, init);
      res.clone().text().then((body: string) => {
        log('<- fetch', res.status, method, url.split('?')[0].slice(-50), '::', body.slice(0, 300));
      }).catch(() => log('<- fetch', res.status, '(body unreadable)'));
      return res;
    } catch (e: any) {
      log('!! FETCH FAILED', method, url.slice(0, 90), '::', e?.message);
      throw e;
    }
  }) as typeof fetch;

  const OX = XMLHttpRequest.prototype as any;
  const oopen = OX.open;
  const osend = OX.send;
  OX.open = function (this: any, m: string, u: any, ...rest: any[]) {
    this.__af_url = String(u);
    this.__af_m = m;
    return oopen.call(this, m, u, ...rest);
  };
  OX.send = function (this: any, ...args: any[]) {
    const u = String(this.__af_url || '');
    if (u.includes('clerk') || u.includes('supabase.co')) {
      log('-> XHR', String(this.__af_m || ''), u.slice(0, 120));
      this.addEventListener('load', () => {
        log('<- XHR', this.status, u.split('?')[0].slice(-50), '::', String(this.responseText || '').slice(0, 300));
      });
      this.addEventListener('error', () => log('!! XHR FAILED', u.slice(0, 90)));
    }
    return osend.apply(this, args);
  };

  const wrap = (fn: any, name: string) =>
    function (this: any, ...args: any[]) {
      const target = args[2] ?? args[0];
      const stack = (new Error().stack || '').split('\n').slice(2, 6).join(' <- ');
      log(`NAV ${name} ->`, String(target).slice(0, 90), '||', stack);
      return fn.apply(this, args);
    };
  history.pushState = wrap(history.pushState, 'pushState');
  history.replaceState = wrap(history.replaceState, 'replaceState');
  window.addEventListener('hashchange', () => log('NAV hashchange ->', location.href));
  window.addEventListener('popstate', () => log('NAV popstate ->', location.href));

  window.addEventListener('error', (e) => log('UNCAUGHT:', e.message, `${e.filename}:${e.lineno}`));
  window.addEventListener('unhandledrejection', (e: any) =>
    log('REJECTION:', String(e?.reason?.message || e?.reason).slice(0, 300)));

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
