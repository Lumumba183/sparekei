// Auth-flow debugger: logs every Clerk/Supabase request + response, every
// navigation (with stack trace), uncaught errors, and Clerk state transitions.
// Install once at app start. Filter console by: [authflow]
const TAG = '[authflow]';
function log(...args: any[]) { console.log(TAG, ...args); }

export function installAuthFlowDebug() {
  const w = window as any;
  if (w.__authflowInstalled) return;
  w.__authflowInstalled = true;

  // 1) fetch interceptor
  const ofetch = window.fetch.bind(window);
  window.fetch = (async (input: any, init: any = {}) => {
    const url: string = typeof input === 'string' ? input : (input?.url ?? '');
    const interesting = url.includes('clerk') || url.includes('supabase.co');
    const method = (init?.method || input?.method || 'GET').toUpperCase();
    if (!interesting) return ofetch(input, init);
    log(`-> ${method} ${url.slice(0, 120)}`);
    try {
      const res = await ofetch(input, init);
      res.clone().text().then((body: string) => {
        log(`<- ${res.status} ${method} ${url.split('?')[0].slice(-50)} :: ${body.slice(0, 300)}`);
      }).catch(() => log(`<- ${res.status} (body unreadable)`));
      return res;
    } catch (e: any) {
      log(`!! FETCH FAILED ${method} ${url.slice(0, 90)} :: ${e?.message}`);
      throw e;
    }
  }) as typeof fetch;

  // 2) navigation tracker with stack (who caused the jump)
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

  // 3) uncaught errors / rejections
  window.addEventListener('error', (e) => log('UNCAUGHT:', e.message, `${e.filename}:${e.lineno}`));
  window.addEventListener('unhandledrejection', (e: any) =>
    log('REJECTION:', String(e?.reason?.message || e?.reason).slice(0, 300)));

  // 4) Clerk state transitions
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

  log('installed. Now attempt login; copy every line tagged', TAG);
}
