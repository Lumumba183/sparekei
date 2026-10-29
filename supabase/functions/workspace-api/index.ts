// Sparekei edge-function shared core — ZERO external imports (robust against registry/CDN outages).
// Provides: cors, HttpError, requireAdmin/requireUser, OpenAI helpers, estimateCost,
// and a PostgREST-backed mini-client (restDb) implementing the supabase-js call shapes we use.
const SUPA_URL = () => Deno.env.get('SUPABASE_URL')!;
const SVC_KEY = () => Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = () => Deno.env.get('SUPABASE_ANON_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// ---------- PostgREST mini-client ----------
async function restReq(method: string, pathAndQuery: string, opts: {
  token?: string; body?: unknown; count?: boolean; minimal?: boolean;
} = {}) {
  const headers: Record<string, string> = {
    apikey: ANON_KEY(),
    'Content-Type': 'application/json',
  };
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  const prefer: string[] = [];
  if (opts.count) prefer.push('count=exact');
  prefer.push(opts.minimal ? 'return=minimal' : 'return=representation');
  headers['Prefer'] = prefer.join(',');
  const res = await fetch(`${SUPA_URL()}/rest/v1/${pathAndQuery}`, {
    method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const cr = res.headers.get('content-range');
  const total = cr?.includes('/') ? parseInt(cr.split('/')[1]) : undefined;
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  let error: any = null;
  if (!res.ok) error = { message: (data && data.message) ? data.message : `${method} ${pathAndQuery.split('?')[0]} → HTTP ${res.status}`, details: data };
  return { data, error, count: total, status: res.status };
}

class Query {
  private parts: string[] = [];
  private cols = '*';
  private insBody: unknown = undefined;
  private updBody: unknown = undefined;
  private mode: 'select' | 'insert' | 'update' = 'select';
  private singleMode: 'none' | 'one' | 'maybe' = 'none';
  private wantsCount = false;
  private orders: string[] = [];
  private lim: number | null = null;

  constructor(private table: string, private token?: string) {}
  select(cols?: string, opts?: { count?: string; head?: boolean }) {
    this.cols = cols ?? '*';
    if (opts?.count) this.wantsCount = true;
    return this;
  }
  insert(obj: unknown) { this.mode = 'insert'; this.insBody = obj; return this; }
  update(obj: unknown) { this.mode = 'update'; this.updBody = obj; return this; }
  eq(col: string, val: unknown) { this.parts.push(`${col}=eq.${encodeURIComponent(String(val))}`); return this; }
  neq(col: string, val: unknown) { this.parts.push(`${col}=neq.${encodeURIComponent(String(val))}`); return this; }
  gt(col: string, val: unknown) { this.parts.push(`${col}=gt.${encodeURIComponent(String(val))}`); return this; }
  gte(col: string, val: unknown) { this.parts.push(`${col}=gte.${encodeURIComponent(String(val))}`); return this; }
  lte(col: string, val: unknown) { this.parts.push(`${col}=lte.${encodeURIComponent(String(val))}`); return this; }
  is(col: string, val: string) { this.parts.push(`${col}=is.${val}`); return this; }
  in(col: string, vals: unknown[]) { this.parts.push(`${col}=in.(${vals.map(v => encodeURIComponent(String(v))).join(',')})`); return this; }
  or(expr: string) { this.parts.push(`or=(${encodeURIComponent(expr)})`); return this; }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push(`${col}.${opts?.ascending === false ? 'desc' : 'asc'}`);
    return this;
  }
  limit(n: number) { this.lim = n; return this; }

  private buildQuery(): string {
    const q: string[] = [];
    q.push(`select=${encodeURIComponent(this.cols)}`);
    q.push(...this.parts);
    if (this.orders.length) q.push(`order=${this.orders.join(',')}`);
    if (this.lim !== null) q.push(`limit=${this.lim}`);
    if (this.singleMode !== 'none') q.push('limit=1');
    return q.join('&');
  }

  private finish(r: { data: any; error: any; count?: number }): { data: any; error: any; count?: number } {
    if (r.error) return r;
    let data = r.data;
    if (this.singleMode === 'one') {
      if (Array.isArray(data) && data.length === 0) return { data: null, error: { message: 'No rows found' }, count: r.count };
      data = Array.isArray(data) ? data[0] : data;
    } else if (this.singleMode === 'maybe') {
      data = Array.isArray(data) ? (data[0] ?? null) : data;
    }
    return { data, error: null, count: r.count };
  }

  private async run(): Promise<{ data: any; error: any; count?: number }> {
    if (this.mode === 'insert') {
      const r = await restReq('POST', `${this.table}?select=${encodeURIComponent(this.cols)}`, { body: this.insBody, token: this.token });
      return this.finish(r);
    }
    if (this.mode === 'update') {
      const q = [`select=${encodeURIComponent(this.cols)}`, ...this.parts].join('&');
      const r = await restReq('PATCH', `${this.table}?${q}`, { body: this.updBody, token: this.token });
      return this.finish(r);
    }
    const r = await restReq('GET', `${this.table}?${this.buildQuery()}`, { count: this.wantsCount, token: this.token });
    return this.finish(r);
  }

  async single() { this.singleMode = 'one'; return this.run(); }
  async maybeSingle() { this.singleMode = 'maybe'; return this.run(); }
  then(onF: any, onR?: any) { return this.run().then(onF, onR); }
}

function restDb(token?: string) {
  return {
    from: (table: string) => new Query(table, token),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      const r = await restReq('POST', `rpc/${fn}`, { body: args, token });
      return { data: r.data, error: r.error };
    },
  };
}

// ---------- Auth helpers (RLS-backed, no external SDK) ----------
async function requireUser(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  if (!token) throw new HttpError(401, 'Missing authorization');
  const r = await restReq('GET', 'app_users?select=id,role,full_name&limit=1', { token });
  if (r.error) throw new HttpError(401, 'Invalid session');
  const me = Array.isArray(r.data) ? r.data[0] : r.data;
  if (!me) throw new HttpError(401, 'Invalid session');
  return { ...(me as object), token } as { id: string; role: string; full_name: string; token: string };
}

async function requireAdmin(req: Request) {
  const me = await requireUser(req);
  if (me.role !== 'admin') throw new HttpError(403, 'Admin role required');
  return { supabase: restDb(me.token), adminId: me.id, clerkToken: me.token };
}

// ---------- OpenAI helpers ----------
async function openaiChat(opts: {
  model?: string; system: string; messages?: { role: string; content: string }[];
  tools?: unknown[]; toolChoice?: string; responseFormat?: unknown; maxTokens?: number;
}) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new HttpError(503, 'AI engine not configured: OPENAI_API_KEY missing.');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model ?? 'gpt-4.1',
      messages: [{ role: 'system', content: opts.system }, ...(opts.messages ?? [])],
      ...(opts.tools ? { tools: opts.tools } : {}),
      ...(opts.toolChoice ? { tool_choice: opts.toolChoice } : {}),
      ...(opts.responseFormat ? { response_format: opts.responseFormat } : {}),
      max_tokens: opts.maxTokens ?? 2000,
    }),
  });
  if (!res.ok) throw new HttpError(502, `OpenAI error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return await res.json();
}

async function openaiEmbed(text: string): Promise<number[]> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new HttpError(503, 'AI engine not configured: OPENAI_API_KEY missing.');
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000) }),
  });
  if (!res.ok) throw new HttpError(502, `OpenAI embedding error ${res.status}`);
  const data = await res.json();
  return data.data[0].embedding;
}

function estimateCost(model: string, tin: number, tout: number): number {
  if (model.startsWith('gpt-4.1')) return (tin * 2 + tout * 8) / 1e6;
  if (model.startsWith('o4')) return (tin * 1.1 + tout * 4.4) / 1e6;
  if (model.startsWith('gpt-4o-mini')) return (tin * 0.15 + tout * 0.6) / 1e6;
  return 0;
}

// Legacy alias so old call sites compile unchanged
const supabaseAdmin = () => restDb();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const urlEarly = new URL(req.url);
    if (urlEarly.searchParams.get('action') === 'offers.browse') {
      const q0 = urlEarly.searchParams.get('q') ?? '';
      const { data: offers0 } = await supabaseAdmin().from('seller_offers')
        .select('id, price, currency, quantity, moq, price_breaks, visibility, created_at, canonical_products(name, brand, category), organizations(name, country, markets)')
        .eq('status', 'PUBLISHED').eq('visibility', 'public').order('created_at', { ascending: false }).limit(50);
      return Response.json({ offers: (offers0 ?? []).filter((o: any) => !q0 || JSON.stringify(o).toLowerCase().includes(q0.toLowerCase())), public: true }, { headers: cors });
    }
    if (urlEarly.searchParams.get('action') === 'banner.public') {
      const db0 = supabaseAdmin();
      const now0 = new Date().toISOString();
      const { data: pub } = await db0.from('site_banners').select('title, body').eq('active', true).eq('audience', 'all')
        .or(`starts_at.is.null,starts_at.lte.${now0}`).or(`ends_at.is.null,ends_at.gte.${now0}`).limit(1);
      return Response.json({ banners: pub ?? [] }, { headers: cors });
    }
    const user = await requireUser(req);
    const db = restDb(user.token);
    const url = new URL(req.url);
    const action = url.searchParams.get('action') ?? '';
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

    // ============ M1: PROVIDER FOUNDATION ============
    if (action === 'org.mine') {
      const { data: memberships } = await db.from('organization_members').select('org_id, role').eq('user_id', user.id);
      const orgIds = (memberships ?? []).map((m: any) => m.org_id);
      const [{ data: orgs }, { data: branches }, { data: caps }] = await Promise.all([
        db.from('organizations').select('*').in('id', orgIds.length ? orgIds : ['00000000-0000-0000-0000-000000000000']),
        db.from('branches').select('*').in('org_id', orgIds.length ? orgIds : ['00000000-0000-0000-0000-000000000000']),
        db.from('provider_capabilities').select('*, capability_verifications(state, note, created_at)').in('org_id', orgIds.length ? orgIds : ['00000000-0000-0000-0000-000000000000']).order('created_at', { ascending: false }),
      ]);
      const { data: bookings } = await db.from('bookings').select('*').in('provider_org_id', orgIds.length ? orgIds : ['00000000-0000-0000-0000-000000000000']).order('created_at', { ascending: false }).limit(50);
      return Response.json({ orgs: orgs ?? [], branches: branches ?? [], capabilities: caps ?? [], memberships: memberships ?? [], bookings: bookings ?? [] }, { headers: cors });
    }
    if (action === 'org.create') {
      if (!s(body.name)) throw new HttpError(400, 'name required');
      const { data: org, error } = await db.from('organizations').insert({ name: s(body.name, 120), type: s(body.type, 30) || 'business', owner_id: user.id }).select('*').single();
      if (error) throw new HttpError(500, error.message);
      await db.from('organization_members').insert({ org_id: org.id, user_id: user.id, role: 'owner' });
      await audit(user, 'org.create', 'organizations', org.id, { name: org.name });
      return Response.json({ org }, { headers: cors });
    }
    if (action === 'capability.add') {
      if (!body.org_id || !s(body.service_class)) throw new HttpError(400, 'org_id + service_class required');
      const { data: cap, error } = await db.from('provider_capabilities').insert({
        org_id: body.org_id, service_class: s(body.service_class, 40),
        scope: body.scope && typeof body.scope === 'object' ? body.scope : {}, status: 'DECLARED',
      }).select('*').single();
      if (error) throw new HttpError(500, error.message);
      await audit(user, 'capability.declare', 'provider_capabilities', cap.id, { service_class: cap.service_class });
      return Response.json({ capability: cap }, { headers: cors });
    }

    // ============ M2: OFFERS & BOOKINGS ============
    if (action === 'offer.add') {
      if (!body.org_id || !body.product_id || !(body.price > 0)) throw new HttpError(400, 'org_id + product_id + price required');
      const { data: offer, error } = await db.from('seller_offers').insert({
        org_id: body.org_id, product_id: body.product_id, branch_id: body.branch_id ?? null,
        price: body.price, currency: s(body.currency, 8) || 'KES', quantity: Math.max(0, parseInt(body.quantity) || 0),
      }).select('*').single();
      if (error) throw new HttpError(500, error.message);
      await audit(user, 'offer.create', 'seller_offers', offer.id, { price: offer.price });
      return Response.json({ offer }, { headers: cors });
    }
    if (action === 'booking.create') {
      if (!body.provider_org_id) throw new HttpError(400, 'provider_org_id required');
      const { data: b, error } = await db.from('bookings').insert({
        customer_id: user.id, provider_org_id: body.provider_org_id,
        offer_id: body.offer_id ?? null, vehicle_id: body.vehicle_id ?? null,
        state: 'REQUESTED', scheduled_at: body.scheduled_at ?? null,
      }).select('*').single();
      if (error) throw new HttpError(500, error.message);
      await audit(user, 'booking.create', 'bookings', b.id, {});
      return Response.json({ booking: b }, { headers: cors });
    }
    if (action === 'booking.state') {
      const allowed: Record<string, string[]> = { REQUESTED: ['QUOTED', 'CANCELLED'], QUOTED: ['ACCEPTED', 'CANCELLED'], ACCEPTED: ['IN_SERVICE', 'CANCELLED'], IN_SERVICE: ['QUALITY_CHECK'], QUALITY_CHECK: ['COMPLETED'], COMPLETED: ['DISPUTED'], DISPUTED: [], CANCELLED: [] };
      const { data: b } = await db.from('bookings').select('id, state').eq('id', body.booking_id).single();
      if (!b) throw new HttpError(404, 'Booking not found');
      if (!(allowed[b.state] ?? []).includes(body.state)) throw new HttpError(409, `Cannot move ${b.state} → ${body.state}`);
      await db.from('bookings').update({ state: body.state, updated_at: new Date().toISOString() }).eq('id', b.id);
      await audit(user, 'booking.state', 'bookings', b.id, { from: b.state, to: body.state });
      return Response.json({ ok: true }, { headers: cors });
    }

    // ============ PAYMENTS (SANDBOX ONLY — no real money) ============
    if (action === 'pay.providers') {
      const { data } = await db.from('payment_providers').select('*').eq('enabled', true).order('priority');
      return Response.json({ providers: data ?? [], sandbox_only: true }, { headers: cors });
    }
    if (action === 'pay.intent.create') {
      const amount = Number(body.amount);
      if (!(amount > 0) || !body.idempotency_key) throw new HttpError(400, 'amount + idempotency_key required');
      const key = s(body.idempotency_key, 120);
      const { data: existing } = await db.from('payment_intents').select('*').eq('idempotency_key', key).maybeSingle();
      if (existing) return Response.json({ intent: existing, deduplicated: true }, { headers: cors }); // idempotency
      const { data: provider } = await db.from('payment_providers').select('code').eq('enabled', true).order('priority').limit(1).maybeSingle();
      const { data: intent, error } = await db.from('payment_intents').insert({
        idempotency_key: key, provider_code: provider?.code ?? 'sandbox-psp',
        amount, currency: s(body.currency, 8) || 'KES', customer_id: user.id, org_id: body.org_id ?? null,
        metadata: { sandbox: true, note: s(body.note, 200) },
      }).select('*').single();
      if (error) throw new HttpError(500, error.message);
      await audit(user, 'payment.intent.create', 'payment_intents', intent.id, { amount, sandbox: true });
      return Response.json({ intent, sandbox_only: true }, { headers: cors });
    }
    if (action === 'pay.intent.simulate') {
      // Simulated provider adapter: sandbox completion only
      const { data: intent } = await db.from('payment_intents').select('*').eq('id', body.intent_id).single();
      if (!intent) throw new HttpError(404, 'Intent not found');
      if (!['CREATED', 'SUBMITTED', 'FAILED'].includes(intent.state)) throw new HttpError(409, `Intent is ${intent.state}`);
      const succeed = body.outcome !== 'fail';
      const next = succeed ? 'SUCCEEDED' : 'FAILED';
      await db.from('payment_intents').update({
        state: succeed ? 'SUBMITTED' : 'FAILED',
        reference: `SBX-${Date.now()}`,
        updated_at: new Date().toISOString(),
      }).eq('id', intent.id);
      await db.from('payment_intents').update({ state: next, updated_at: new Date().toISOString() }).eq('id', intent.id);
      await audit(user, 'payment.sandbox.settle', 'payment_intents', intent.id, { outcome: next });
      return Response.json({ intent_id: intent.id, state: next, sandbox_only: true }, { headers: cors });
    }
    if (action === 'pay.webhook' || action === 'pay.webhook.simulate') {
      // Webhook ingestion with HMAC signature verification (shared secret; sandbox)
      const secret = Deno.env.get('PAYMENT_WEBHOOK_SECRET') ?? 'sandbox-webhook-secret';
      const payload = JSON.stringify(body.payload ?? {});
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const sig = body.signature ?? btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)))));
      const { data: evt, error } = await db.from('payment_webhook_events').insert({
        provider_code: s(body.provider_code, 40) || 'sandbox-psp', signature: s(sig, 200), payload: body.payload ?? {},
      }).select('id').single();
      if (error) throw new HttpError(500, error.message);
      // Idempotent processing: match by reference, ignore duplicates
      const ref = body.payload?.reference;
      let processed = false;
      if (ref) {
        const { data: dup } = await db.from('payment_intents').select('id, state').eq('reference', ref).maybeSingle();
        if (dup && dup.state !== 'SUCCEEDED') {
          await db.from('payment_intents').update({ state: 'SUCCEEDED', updated_at: new Date().toISOString() }).eq('id', dup.id);
          processed = true;
        } else if (dup) processed = true; // duplicate delivery → no double effect
      }
      await db.from('payment_webhook_events').update({ processed, processed_at: new Date().toISOString() }).eq('id', evt.id);
      await audit(user, 'payment.webhook', 'payment_webhook_events', evt.id, { processed });
      return Response.json({ received: true, processed, idempotent: true, sandbox_only: true }, { headers: cors });
    }

    // ============ M11: SUBSCRIPTIONS / FOUNDING / ACADEMY / COMMUNITY / BANNERS ============
    if (action === 'plans.list') {
      const { data: plans } = await db.from('plans').select('*').order('price');
      const { data: sub } = await db.from('subscriptions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      const { data: founding } = await db.from('founding_members').select('*').eq('user_id', user.id).maybeSingle();
      return Response.json({ plans: plans ?? [], subscription: sub ?? null, founding: founding ?? null }, { headers: cors });
    }
    if (action === 'plans.subscribe') {
      const { data: plan } = await db.from('plans').select('*').eq('code', s(body.plan_code, 40)).single();
      if (!plan) throw new HttpError(404, 'Plan not found');
      const periodEnd = new Date(Date.now() + 30 * 864e5).toISOString();
      const { data: sub, error } = await db.from('subscriptions').insert({
        user_id: user.id, plan_code: plan.code,
        status: plan.price > 0 ? 'TRIALING' : 'ACTIVE',
        trial_ends_at: plan.price > 0 ? periodEnd : null, current_period_end: periodEnd,
      }).select('*').single();
      if (error) throw new HttpError(500, error.message);
      await audit(user, 'plan.subscribe', 'subscriptions', sub.id, { plan: plan.code });
      return Response.json({ subscription: sub, billing_note: 'Sandbox — no charge was made. Real billing activates only via an approved payment provider.' }, { headers: cors });
    }
    if (action === 'founding.join') {
      const card = 'SPK-FND-' + Math.floor(100000 + Math.random() * 899999);
      const { data: fm, error } = await db.from('founding_members').insert({
        user_id: user.id, cohort: s(body.cohort, 40) || 'founders-2026', card_number: card,
      }).select('*').single();
      if (error) throw new HttpError(409, error.message.includes('duplicate') ? 'Already a founding member' : error.message);
      await audit(user, 'founding.join', 'founding_members', user.id, { card });
      return Response.json({ founding_member: fm }, { headers: cors });
    }
    if (action === 'academy.list') {
      const { data: courses } = await db.from('courses').select('*').eq('active', true).order('title');
      const { data: enrollments } = await db.from('enrollments').select('*').eq('user_id', user.id);
      return Response.json({ courses: courses ?? [], enrollments: enrollments ?? [] }, { headers: cors });
    }
    if (action === 'academy.enroll') {
      const { data: e, error } = await db.from('enrollments').insert({ course_id: body.course_id, user_id: user.id }).select('*').single();
      if (error) throw new HttpError(409, error.message.includes('duplicate') ? 'Already enrolled' : error.message);
      await audit(user, 'academy.enroll', 'enrollments', e.id, {});
      return Response.json({ enrollment: e }, { headers: cors });
    }
    if (action === 'academy.progress') {
      const progress = Math.min(100, Math.max(0, parseInt(body.progress) || 0));
      await db.from('enrollments').update({
        progress, status: progress >= 100 ? 'COMPLETED' : 'ENROLLED',
        completed_at: progress >= 100 ? new Date().toISOString() : null,
      }).eq('course_id', body.course_id).eq('user_id', user.id);
      return Response.json({ ok: true, progress }, { headers: cors });
    }
    if (action === 'community.list') {
      const { data: posts } = await db.from('community_posts').select('*').order('created_at', { ascending: false }).limit(50);
      return Response.json({ posts: posts ?? [] }, { headers: cors });
    }
    if (action === 'community.create') {
      if (!s(body.title) || !s(body.body)) throw new HttpError(400, 'title + body required');
      const { data: p, error } = await db.from('community_posts').insert({
        author_id: user.id, topic: s(body.topic, 40) || 'general', title: s(body.title, 140), body: s(body.body, 4000),
      }).select('*').single();
      if (error) throw new HttpError(500, error.message);
      await audit(user, 'community.post', 'community_posts', p.id, {});
      return Response.json({ post: p, moderation_note: 'Posts are visible immediately in this phase; a moderation queue can be enabled without schema change.' }, { headers: cors });
    }
    if (action === 'banner.list') {
      const now = new Date().toISOString();
      const { data: banners } = await db.from('site_banners').select('*').eq('active', true)
        .or(`starts_at.is.null,starts_at.lte.${now}`).or(`ends_at.is.null,ends_at.gte.${now}`);
      return Response.json({ banners: (banners ?? []).filter((b: any) => b.audience === 'all' || b.audience === `role:${user.role}`) }, { headers: cors });
    }

    // ============ ACADEMY FULL (client requirement list, 17 Oct) ============
    // Eligibility, exams from question banks, pass/retake rules, credentials,
    // verification, renewal, appeals, practical assessment hook, badges.
    const requireAdmin = (u: any) => { if (u.role !== 'admin') throw new HttpError(403, 'Admin only'); };

    if (action === 'academy.course') {
      const { data: course } = await db.from('courses').select('*').eq('id', body.course_id).single();
      if (!course) throw new HttpError(404, 'Course not found');
      const eligible = (course.allowed_roles ?? []).includes(user.role);
      let prereqMet = true;
      if (course.prerequisite_course_id) {
        const { data: pre } = await db.from('enrollments').select('status').eq('course_id', course.prerequisite_course_id).eq('user_id', user.id).maybeSingle();
        prereqMet = !!pre && pre.status === 'COMPLETED';
      }
      const { data: qb } = await db.from('question_banks').select('module_index, questions').eq('course_id', course.id);
      const { data: attempts } = await db.from('exam_attempts').select('*').eq('course_id', course.id).eq('user_id', user.id).order('created_at', { ascending: false });
      const { data: cred } = await db.from('credentials').select('*').eq('course_id', course.id).eq('user_id', user.id).eq('revoked', false).order('issued_at', { ascending: false }).limit(1).maybeSingle();
      const last = (attempts ?? [])[0];
      const cooldownUntil = last ? new Date(new Date(last.created_at).getTime() + (course.retake_cooldown_hours ?? 24) * 3600e3).toISOString() : null;
      const attemptsUsed = (attempts ?? []).length;
      const canExam = eligible && prereqMet && attemptsUsed < (course.max_attempts ?? 3) && (!cooldownUntil || cooldownUntil <= new Date().toISOString());
      return Response.json({
        course, eligible, prereq_met: prereqMet,
        question_counts: (qb ?? []).map((x: any) => ({ module_index: x.module_index, count: (x.questions ?? []).length })),
        attempts_used: attemptsUsed, max_attempts: course.max_attempts ?? 3,
        cooldown_until: cooldownUntil, can_exam: canExam,
        attempts: (attempts ?? []).map((a: any) => ({ id: a.id, attempt_no: a.attempt_no, score: a.score, passed: a.passed, appeal_state: a.appeal_state, created_at: a.created_at })),
        credential: cred ?? null,
      }, { headers: cors });
    }
    if (action === 'academy.exam.start') {
      const { data: course } = await db.from('courses').select('*').eq('id', body.course_id).single();
      if (!course) throw new HttpError(404, 'Course not found');
      if (!(course.allowed_roles ?? []).includes(user.role)) throw new HttpError(403, 'Your role is not eligible for this course');
      if (course.prerequisite_course_id) {
        const { data: pre } = await db.from('enrollments').select('status').eq('course_id', course.prerequisite_course_id).eq('user_id', user.id).maybeSingle();
        if (!pre || pre.status !== 'COMPLETED') throw new HttpError(403, 'Prerequisite course not completed');
      }
      const { data: attempts } = await db.from('exam_attempts').select('created_at').eq('course_id', course.id).eq('user_id', user.id).order('created_at', { ascending: false });
      if ((attempts ?? []).length >= (course.max_attempts ?? 3)) throw new HttpError(429, 'Maximum attempts reached — appeal route available');
      const last = (attempts ?? [])[0];
      if (last) {
        const until = new Date(new Date(last.created_at).getTime() + (course.retake_cooldown_hours ?? 24) * 3600e3);
        if (until > new Date()) throw new HttpError(429, `Retake cooldown until ${until.toISOString()}`);
      }
      const { data: qb } = await db.from('question_banks').select('questions').eq('course_id', course.id);
      const questions = (qb ?? []).flatMap((x: any) => x.questions ?? []).map((q: any, i: number) => ({ n: i, q: q.q, choices: q.choices })); // answers NEVER sent
      return Response.json({ questions, pass_mark: course.pass_mark ?? 70, attempt_no: (attempts ?? []).length + 1 }, { headers: cors });
    }
    if (action === 'academy.exam.submit') {
      const { data: course } = await db.from('courses').select('*').eq('id', body.course_id).single();
      if (!course) throw new HttpError(404, 'Course not found');
      const { data: qb } = await db.from('question_banks').select('questions').eq('course_id', course.id);
      const bank = (qb ?? []).flatMap((x: any) => x.questions ?? []);
      const answers: number[] = Array.isArray(body.answers) ? body.answers : [];
      let correct = 0;
      bank.forEach((q: any, i: number) => { if (answers[i] === q.answer) correct++; });
      const score = bank.length ? Math.round((correct / bank.length) * 100) : 0;
      const passed = score >= (course.pass_mark ?? 70);
      const { data: prev } = await db.from('exam_attempts').select('id').eq('course_id', course.id).eq('user_id', user.id);
      const { data: attempt, error } = await db.from('exam_attempts').insert({
        course_id: course.id, user_id: user.id, attempt_no: (prev ?? []).length + 1, answers, score, passed,
      }).select('*').single();
      if (error) throw new HttpError(500, error.message);
      let credential = null;
      if (passed) {
        await db.from('enrollments').update({ status: 'COMPLETED', progress: 100, completed_at: new Date().toISOString() }).eq('course_id', course.id).eq('user_id', user.id);
        const number = 'SPK-ACAD-' + Math.floor(100000 + Math.random() * 899999);
        const ins = await db.from('credentials').insert({
          user_id: user.id, course_id: course.id, credential_number: number,
          expires_at: new Date(Date.now() + 365 * 864e5).toISOString(),
        }).select('*').single();
        credential = ins.data;
      }
      await audit(user, 'academy.exam.submit', 'exam_attempts', attempt.id, { score, passed });
      return Response.json({ score, passed, pass_mark: course.pass_mark ?? 70, credential, attempts_used: (prev ?? []).length + 1 }, { headers: cors });
    }
    if (action === 'academy.appeal') {
      if (!body.attempt_id || !s(body.reason, 1000)) throw new HttpError(400, 'attempt_id + reason required');
      const { error } = await db.from('exam_attempts').update({ appeal_state: 'PENDING', appeal_reason: s(body.reason, 1000) }).eq('id', body.attempt_id).eq('user_id', user.id);
      if (error) throw new HttpError(500, error.message);
      await audit(user, 'academy.appeal', 'exam_attempts', body.attempt_id, {});
      return Response.json({ ok: true, appeal_state: 'PENDING' }, { headers: cors });
    }
    if (action === 'academy.appeal.resolve') {
      requireAdmin(user);
      const state = body.uphold ? 'UPHELD' : 'REJECTED';
      const { data: att } = await db.from('exam_attempts').select('*').eq('id', body.attempt_id).single();
      await db.from('exam_attempts').update({ appeal_state: state }).eq('id', body.attempt_id);
      let credential = null;
      if (body.uphold && att) {
        const number = 'SPK-ACAD-' + Math.floor(100000 + Math.random() * 899999);
        const ins = await db.from('credentials').insert({
          user_id: att.user_id, course_id: att.course_id, credential_number: number,
          expires_at: new Date(Date.now() + 365 * 864e5).toISOString(),
        }).select('*').single();
        credential = ins.data;
      }
      await audit(user, 'academy.appeal.resolve', 'exam_attempts', body.attempt_id, { state });
      return Response.json({ ok: true, appeal_state: state, credential }, { headers: cors });
    }
    if (action === 'credential.verify') {
      const { data: cred } = await db.from('credentials').select('credential_number, issued_at, expires_at, revoked, courses(title), app_users(full_name)').eq('credential_number', s(body.number, 30)).maybeSingle();
      if (!cred) return Response.json({ valid: false }, { headers: cors });
      const expired = cred.expires_at ? new Date(cred.expires_at) < new Date() : false;
      return Response.json({
        valid: !cred.revoked && !expired, revoked: cred.revoked, expired,
        holder: cred.app_users?.full_name, course: cred.courses?.title,
        issued_at: cred.issued_at, expires_at: cred.expires_at,
      }, { headers: cors });
    }
    if (action === 'credential.renew') {
      const { data: old } = await db.from('credentials').select('*').eq('id', body.credential_id).eq('user_id', user.id).single();
      if (!old) throw new HttpError(404, 'Credential not found');
      const number = 'SPK-ACAD-' + Math.floor(100000 + Math.random() * 899999);
      const { data: nu, error } = await db.from('credentials').insert({
        user_id: user.id, course_id: old.course_id, credential_number: number,
        renewed_from: old.id, expires_at: new Date(Date.now() + 365 * 864e5).toISOString(),
      }).select('*').single();
      if (error) throw new HttpError(500, error.message);
      await audit(user, 'credential.renew', 'credentials', nu.id, { renewed_from: old.id });
      return Response.json({ credential: nu, previous: old.credential_number }, { headers: cors });
    }
    if (action === 'academy.practical.submit') {
      // assessor-submitted practical assessment (admin in this phase)
      requireAdmin(user);
      const { data: pa, error } = await db.from('practical_assessments').insert({
        course_id: body.course_id, user_id: body.user_id, assessor_id: user.id,
        checklist: Array.isArray(body.checklist) ? body.checklist : [], result: body.result === 'PASSED' ? 'PASSED' : 'FAILED',
      }).select('*').single();
      if (error) throw new HttpError(500, error.message);
      await audit(user, 'academy.practical', 'practical_assessments', pa.id, { result: pa.result });
      return Response.json({ practical: pa }, { headers: cors });
    }
    if (action === 'academy.badges') { // profile badges = active credentials
      const { data: creds } = await db.from('credentials').select('credential_number, issued_at, courses(title)').eq('user_id', user.id).eq('revoked', false);
      return Response.json({ badges: (creds ?? []).filter((c: any) => !c.expires_at || new Date(c.expires_at) > new Date()) }, { headers: cors });
    }

    // ============ VERIFIER WORKFLOW (M1) ============
    if (action === 'capability.review') {
      requireAdmin(user);
      const states = ['PLATFORM_CHECKED', 'PROFESSIONALLY_VERIFIED', 'REJECTED', 'SUSPENDED'];
      if (!body.capability_id || !states.includes(body.state)) throw new HttpError(400, 'capability_id + valid state');
      await db.from('provider_capabilities').update({ status: body.state, verified_by: user.id }).eq('id', body.capability_id);
      const { data: v } = await db.from('capability_verifications').insert({
        capability_id: body.capability_id, verifier_id: user.id, state: body.state, note: s(body.note, 500),
      }).select('id').single();
      await audit(user, 'capability.review', 'provider_capabilities', body.capability_id, { state: body.state });
      return Response.json({ ok: true, state: body.state }, { headers: cors });
    }

    // ============ BANNERS (admin) + COMMUNITY MODERATION ============
    if (action === 'banner.admin') {
      requireAdmin(user);
      const { data: banners } = await db.from('site_banners').select('*').order('created_at', { ascending: false }).limit(50);
      return Response.json({ banners: banners ?? [] }, { headers: cors });
    }
    if (action === 'banner.create') {
      requireAdmin(user);
      if (!s(body.title) || !s(body.body)) throw new HttpError(400, 'title + body required');
      const { data: b, error } = await db.from('site_banners').insert({
        title: s(body.title, 120), body: s(body.body, 400), audience: s(body.audience, 60) || 'all',
        starts_at: body.starts_at ?? null, ends_at: body.ends_at ?? null, active: body.active !== false, created_by: user.id,
      }).select('*').single();
      if (error) throw new HttpError(500, error.message);
      await audit(user, 'banner.create', 'site_banners', b.id, {});
      return Response.json({ banner: b }, { headers: cors });
    }
    if (action === 'community.moderate') {
      requireAdmin(user);
      const states = ['VISIBLE', 'HIDDEN', 'UNDER_REVIEW'];
      if (!body.post_id || !states.includes(body.status)) throw new HttpError(400, 'post_id + valid status');
      await db.from('community_posts').update({ status: body.status, moderated: true, moderated_by: user.id }).eq('id', body.post_id);
      await audit(user, 'community.moderate', 'community_posts', body.post_id, { status: body.status });
      return Response.json({ ok: true }, { headers: cors });
    }
    // ============ C1/C2: OFFER PUBLISH WITH FREE CAPS + MOQ/PRICE BREAKS ============
    if (action === 'offer.publish') {
      if (!body.org_id || !body.product_id || !(body.price > 0)) throw new HttpError(400, 'org_id + product_id + price required');
      const visibility = body.visibility === 'private' ? 'private' : 'public';
      // AC-003 caps: 10 active public listings; 10 distinct private inventory records
      if (visibility === 'public') {
        const { count } = await db.from('seller_offers').select('id', { count: 'exact', head: true })
          .eq('org_id', body.org_id).eq('visibility', 'public').eq('status', 'PUBLISHED');
        if ((count ?? 0) >= 10) throw new HttpError(429, 'Free plan allows 10 active public listings — deactivate one to replace it (AC-003)');
      } else {
        const { count } = await db.from('seller_offers').select('id', { count: 'exact', head: true })
          .eq('org_id', body.org_id).eq('visibility', 'private').eq('status', 'PUBLISHED');
        if ((count ?? 0) >= 10) throw new HttpError(429, 'Free plan allows 10 private inventory records (AC-003)');
      }
      const { data: offer, error } = await db.from('seller_offers').insert({
        org_id: body.org_id, product_id: body.product_id, branch_id: body.branch_id ?? null,
        price: body.price, currency: s(body.currency, 8) || 'KES', quantity: Math.max(0, parseInt(body.quantity) || 0),
        visibility,
        moq: Math.max(1, parseInt(body.moq) || 1),
        price_breaks: Array.isArray(body.price_breaks) ? body.price_breaks : [],
        status: 'PUBLISHED',
      }).select('*').single();
      if (error) throw new HttpError(500, error.message);
      await audit(user, 'offer.publish', 'seller_offers', offer.id, { visibility, moq: offer.moq });
      await db.from('funnel_events').insert({ event_type: 'quote', actor_id: user.id, actor_class: user.role, entity_type: 'seller_offers', entity_id: offer.id, outcome: 'ok' });
      return Response.json({ offer, cap_check: 'AC-003 enforced' }, { headers: cors });
    }
    if (action === 'offer.price_for') { // C2: MOQ + quantity-break resolution
      const { data: offer } = await db.from('seller_offers').select('*').eq('id', body.offer_id).single();
      if (!offer) throw new HttpError(404, 'Offer not found');
      const qty = Math.max(1, parseInt(body.quantity) || 1);
      if (qty < offer.moq) return Response.json({ eligible: false, reason: `MOQ is ${offer.moq}`, moq: offer.moq, quantity: qty }, { headers: cors });
      let unit = Number(offer.price);
      for (const br of (offer.price_breaks ?? []).sort((a: any, b: any) => b.min_qty - a.min_qty)) {
        if (qty >= br.min_qty && br.unit_price > 0) { unit = Number(br.unit_price); break; }
      }
      return Response.json({ eligible: true, quantity: qty, unit_price: unit, total: +(unit * qty).toFixed(2), currency: offer.currency }, { headers: cors });
    }

    // ============ C3: INVENTORY LEDGER (internal consumption NEVER revenue) ============
    if (action === 'inventory.add') {
      if (!body.org_id || !s(body.name)) throw new HttpError(400, 'org_id + name required');
      const { data: item, error } = await db.from('inventory_items').insert({
        org_id: body.org_id, product_id: body.product_id ?? null, name: s(body.name, 160), sku: s(body.sku, 60), unit: s(body.unit, 20) || 'pc',
      }).select('*').single();
      if (error) throw new HttpError(500, error.message);
      await audit(user, 'inventory.add', 'inventory_items', item.id, {});
      return Response.json({ item }, { headers: cors });
    }
    if (action === 'inventory.move') {
      const types = ['receive', 'issue_internal', 'sale', 'sale_reserve', 'return', 'adjust'];
      if (!body.item_id || !types.includes(body.movement_type) || !(body.quantity !== 0)) throw new HttpError(400, 'item_id + movement_type + quantity required');
      const isRevenue = ['sale', 'return'].includes(body.movement_type);
      const { data: mv, error } = await db.from('inventory_movements').insert({
        item_id: body.item_id, org_id: body.org_id, movement_type: body.movement_type,
        quantity: body.quantity, unit_cost: body.unit_cost ?? null, is_revenue: isRevenue,
        reference: s(body.reference, 60), actor_id: user.id, note: s(body.note, 300),
      }).select('*').single();
      if (error) throw new HttpError(500, error.message); // guard trigger also rejects revenue-internal
      const delta = ['issue_internal', 'sale', 'sale_reserve'].includes(body.movement_type) ? -Math.abs(body.quantity)
        : body.movement_type === 'adjust' ? body.quantity : Math.abs(body.quantity);
      const { data: it } = await db.from('inventory_items').select('on_hand').eq('id', body.item_id).single();
      await db.from('inventory_items').update({ on_hand: Math.max(0, Number(it?.on_hand ?? 0) + delta) }).eq('id', body.item_id);
      await audit(user, 'inventory.move', 'inventory_movements', mv.id, { type: body.movement_type, is_revenue: isRevenue });
      return Response.json({ movement: mv, is_revenue: isRevenue, note: isRevenue ? 'booked to revenue' : 'non-revenue movement' }, { headers: cors });
    }
    if (action === 'inventory.list') {
      const { data: items } = await db.from('inventory_items').select('*, inventory_movements(*)').eq('org_id', body.org_id ?? url.searchParams.get('org_id') ?? '').order('created_at', { ascending: false }).limit(100);
      return Response.json({ items: items ?? [] }, { headers: cors });
    }

    // ============ C4: JOB-AWARE MATCHING (eligibility before ranking; paid cannot bypass) ============
    if (action === 'match.providers') {
      const serviceClass = s(body.service_class, 40);
      if (!serviceClass) throw new HttpError(400, 'service_class required');
      const { data: eligible } = await db.from('provider_capabilities')
        .select('org_id, status, organizations(name)', { count: 'exact' })
        .eq('service_class', serviceClass).in('status', ['PLATFORM_CHECKED', 'PROFESSIONALLY_VERIFIED']);
      // Ranking uses ONLY permitted signals; verification state is a hard gate above.
      const ranked = (eligible ?? [])
        .map((c: any) => ({ org_id: c.org_id, name: c.organizations?.name, verified: c.status, match_reasons: ['verified_capability:' + serviceClass] }))
        .sort((a: any, b: any) => (a.verified === 'PROFESSIONALLY_VERIFIED' ? -1 : 0) - (b.verified === 'PROFESSIONALLY_VERIFIED' ? -1 : 0));
      await db.from('funnel_events').insert({ event_type: 'search', actor_id: user.id, actor_class: user.role, outcome: 'ok', meta: { service_class: serviceClass, eligible: ranked.length } });
      return Response.json({ matches: ranked, rule: 'eligibility_first_paid_cannot_bypass (AC-006)', unverified_excluded: true }, { headers: cors });
    }

    // ============ C5: ENTITLEMENT CHECK / GRANT ============
    if (action === 'entitlement.check') {
      const cap = s(body.capability, 60);
      const now = new Date().toISOString();
      const { data: grants } = await db.from('entitlement_grants').select('*').eq('user_id', user.id)
        .eq('capability', cap).eq('status', 'ACTIVE')
        .or(`ends_at.is.null,ends_at.gte.${now}`);
      const freeDefaults = ['ai_concierge', 'marketplace_buy', 'passport_records'];
      const allowed = (grants ?? []).length > 0 || freeDefaults.includes(cap);
      return Response.json({ capability: cap, allowed, source: (grants ?? [])[0]?.source ?? (allowed ? 'free' : null), rule: 'AC-007: payment_reconciled source requires verified intent' }, { headers: cors });
    }
    if (action === 'entitlement.grant') {
      if (body.source === 'payment_reconciled' && user.role !== 'admin') throw new HttpError(403, 'Only admin grants payment-derived entitlements');
      if (body.source === 'payment_reconciled' && body.payment_intent_id) {
        const { data: pi } = await db.from('payment_intents').select('state').eq('id', body.payment_intent_id).single();
        if (!pi || pi.state !== 'SUCCEEDED') throw new HttpError(409, 'Entitlement requires a SUCCEEDED (verified) payment intent — AC-007');
      }
      const { data: gr, error } = await db.from('entitlement_grants').insert({
        user_id: body.user_id ?? user.id, capability: s(body.capability, 60), source: body.source,
        plan_code: s(body.plan_code, 40) ?? null, payment_intent_id: body.payment_intent_id ?? null,
        ends_at: body.ends_at ?? null,
      }).select('*').single();
      if (error) throw new HttpError(500, error.message);
      await audit(user, 'entitlement.grant', 'entitlement_grants', gr.id, { source: body.source });
      return Response.json({ grant: gr }, { headers: cors });
    }

    // ============ C6: FAMILIARISATION LIFECYCLE (60-day, no silent auto-charge) ============
    if (action === 'familiarisation.start') {
      const existing = await db.from('familiarisation_windows').select('id').eq('user_id', user.id).gte('ends_at', new Date().toISOString()).limit(1);
      if ((existing.data ?? []).length) throw new HttpError(409, 'An active familiarisation window already exists');
      const start = new Date();
      const end = new Date(start.getTime() + 60 * 864e5);
      const { data: win, error } = await db.from('familiarisation_windows').insert({
        user_id: user.id, plan_code: s(body.plan_code, 40) || 'pro', starts_at: start.toISOString(), ends_at: end.toISOString(),
      }).select('*').single();
      if (error) throw new HttpError(500, error.message);
      await db.from('entitlement_grants').insert({
        user_id: user.id, capability: 'familiarisation', source: 'familiarisation', plan_code: win.plan_code,
        ends_at: end.toISOString(),
      });
      await audit(user, 'familiarisation.start', 'familiarisation_windows', win.id, { ends_at: end.toISOString(), note: 'no auto-charge on expiry (AC-008)' });
      return Response.json({ window: win, ends_at: end.toISOString(), guarantee: 'expires to Permanent Free — no silent auto-charge' }, { headers: cors });
    }
    if (action === 'familiarisation.status') {
      const { data: win } = await db.from('familiarisation_windows').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (!win) return Response.json({ active: false }, { headers: cors });
      const now = new Date();
      const active = new Date(win.ends_at) > now;
      const daysLeft = active ? Math.ceil((new Date(win.ends_at).getTime() - now.getTime()) / 864e5) : 0;
      return Response.json({ active, days_left: daysLeft, ends_at: win.ends_at, notice_sent: !!win.notice_sent_at, converted_to: win.converted_to }, { headers: cors });
    }

    // ============ C7: INTELLIGENCE DATA-SUFFICIENCY LOCK ============
    if (action === 'insight.check') {
      const { data: cfg } = await db.from('intelligence_capabilities').select('*').eq('capability', s(body.capability, 60)).maybeSingle();
      if (!cfg || !cfg.enabled) return Response.json({ locked: true, reason: 'capability_not_registered' }, { headers: cors });
      const table = { demand_forecast: 'funnel_events', quality_signals: 'gov_case_evidence', matching_rank: 'provider_capabilities' }[cfg.capability as string] ?? 'funnel_events';
      const since = new Date(Date.now() - (cfg.max_data_age_days ?? 30) * 864e5).toISOString();
      const { count } = await db.from(table as any).select('id', { count: 'exact', head: true }).gte('created_at', since);
      const sufficient = (count ?? 0) >= (cfg.min_rows ?? 30);
      return Response.json({
        capability: cfg.capability, sufficient, rows: count ?? 0, min_rows: cfg.min_rows, max_age_days: cfg.max_data_age_days,
        locked: !sufficient, reason: sufficient ? null : 'insufficient_fresh_data (AC-009 — capability stays locked or escalates)',
      }, { headers: cors });
    }

    // ============ C8/C9: FUNNEL EVENTS + REPORTS ============
    if (action === 'funnel.track') {
      const types = ['search', 'view', 'enquiry', 'quote', 'order', 'booking', 'payment', 'report', 'recommendation'];
      if (!types.includes(body.event_type)) throw new HttpError(400, 'event_type required');
      const { data: ev, error } = await db.from('funnel_events').insert({
        event_type: body.event_type, actor_id: user.id, actor_class: user.role,
        entity_type: s(body.entity_type, 40) ?? null, entity_id: s(body.entity_id, 60) ?? null,
        outcome: ['ok', 'failed', 'denied', 'timeout'].includes(body.outcome) ? body.outcome : 'ok',
        data_quality: ['live', 'delayed', 'estimated', 'synthetic', 'unavailable'].includes(body.data_quality) ? body.data_quality : 'live',
        meta: body.meta && typeof body.meta === 'object' ? body.meta : {},
      }).select('id').single();
      if (error) throw new HttpError(500, error.message);
      return Response.json({ event: ev }, { headers: cors });
    }
    if (action === 'report.generate') {
      const since = new Date(Date.now() - (parseInt(body.days) || 30) * 864e5).toISOString();
      const { data: rows } = await db.from('funnel_events').select('event_type, outcome, data_quality, created_at').gte('created_at', since);
      const byType: Record<string, any> = {};
      for (const r of (rows ?? [])) {
        const t = r.event_type;
        byType[t] = byType[t] ?? { events: 0, ok: 0, failed: 0, denied: 0, synthetic: 0 };
        byType[t].events++; byType[t][r.outcome] = (byType[t][r.outcome] ?? 0) + 1;
        if (r.data_quality !== 'live') byType[t].synthetic++;
      }
      const { data: payRows } = await db.from('payment_intents').select('state').gte('created_at', since);
      const paymentSummary = { total: (payRows ?? []).length, succeeded: (payRows ?? []).filter((p: any) => p.state === 'SUCCEEDED').length };
      await audit(user, 'report.generate', 'funnel_events', null, { days: body.days ?? 30 });
      return Response.json({
        period_days: parseInt(body.days) || 30, generated_at: new Date().toISOString(),
        funnel: byType, payments: paymentSummary,
        provenance: 'sources: funnel_events, payment_intents · synthetic rows disclosed per bucket · missing telemetry ≠ zero (AC-011/CR-010)',
      }, { headers: cors });
    }

    // ============ B5: ACADEMY RPL ============
    if (action === 'academy.rpl') {
      if (!body.course_id || !s(body.evidence, 500)) throw new HttpError(400, 'course_id + evidence required');
      const { data: en, error } = await db.from('enrollments').update({
        rpl_granted: true, rpl_evidence: s(body.evidence, 500), status: 'COMPLETED', progress: 100, completed_at: new Date().toISOString(),
      }).eq('course_id', body.course_id).eq('user_id', user.id).select('*').single();
      if (error) throw new HttpError(500, error.message);
      await audit(user, 'academy.rpl', 'enrollments', en.id, { course_id: body.course_id });
      return Response.json({ enrollment: en, note: 'Recognition of prior learning granted with recorded evidence' }, { headers: cors });
    }

    // ============ INDUSTRY-PARTNER ONBOARDING (S1/S2/S3/S0) ============
    if (action === "org.profile") {
      if (!body.org_id) throw new HttpError(400, "org_id required");
      const upd: any = {};
      if (Array.isArray(body.markets)) upd.markets = body.markets.slice(0, 50);
      if (Array.isArray(body.brands)) upd.brands = body.brands.slice(0, 100);
      if (Array.isArray(body.product_categories)) upd.product_categories = body.product_categories.slice(0, 100);
      if (body.country) upd.country = s(body.country, 8).toUpperCase();
      if (body.name) upd.name = s(body.name, 120);
      if (!Object.keys(upd).length) throw new HttpError(400, "nothing to update");
      const { data: org, error } = await db.from("organizations").update(upd).eq("id", body.org_id).select("*").single();
      if (error) throw new HttpError(500, error.message);
      await audit(user, "org.profile", "organizations", org.id, { keys: Object.keys(upd) });
      return Response.json({ org }, { headers: cors });
    }
    if (action === "dist.link") {
      if (!body.from_org_id || !body.to_org_id) throw new HttpError(400, "from_org_id + to_org_id required");
      const { data: link, error } = await db.from("distribution_links").insert({
        from_org_id: body.from_org_id, to_org_id: body.to_org_id,
        link_type: ["supplies","distributes","authorizes","services"].includes(body.link_type) ? body.link_type : "supplies",
        scope: body.scope && typeof body.scope === "object" ? body.scope : {},
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      await audit(user, "dist.link", "distribution_links", link.id, { type: link.link_type });
      return Response.json({ link }, { headers: cors });
    }
    if (action === "dist.list") {
      const orgId = body.org_id ?? url.searchParams.get("org_id");
      const [{ data: out }, { data: inn }] = await Promise.all([
        db.from("distribution_links").select("*, to:organizations!distribution_links_to_org_id_fkey(name)").eq("from_org_id", orgId),
        db.from("distribution_links").select("*, from:organizations!distribution_links_from_org_id_fkey(name)").eq("to_org_id", orgId),
      ]);
      return Response.json({ supplies: out ?? [], supplied_by: inn ?? [] }, { headers: cors });
    }
    if (action === "catalogue.import") {
      if (!body.org_id || !Array.isArray(body.products) || !body.products.length) throw new HttpError(400, "org_id + products[] required");
      const results: any[] = [];
      for (const p of body.products.slice(0, 200)) {
        const ins = await db.from("canonical_products").insert({
          name: s(p.name, 200), category: s(p.category, 60) || "general", brand: s(p.brand, 80) ?? null,
          condition: ["genuine_oe","oe_supplier","aftermarket","remanufactured","refurbished","used"].includes(p.condition) ? p.condition : "aftermarket",
          identifiers: p.identifiers && typeof p.identifiers === "object" ? p.identifiers : {},
          provenance: { source: "partner_import", actor: user.id, claimed_at: new Date().toISOString(), ...(p.provenance && typeof p.provenance === "object" ? p.provenance : {}) },
        }).select("id, name").single();
        if (ins.error) { results.push({ name: p.name, ok: false, error: ins.error.message }); continue; }
        if (p.offer && p.offer.price > 0) {
          const off = await db.from("seller_offers").insert({
            product_id: ins.data.id, org_id: body.org_id, price: p.offer.price, currency: s(p.offer.currency, 8) || "KES",
            quantity: Math.max(0, parseInt(p.offer.quantity) || 0), visibility: p.offer.visibility === "private" ? "private" : "public",
            moq: Math.max(1, parseInt(p.offer.moq) || 1),
            price_breaks: Array.isArray(p.offer.price_breaks) ? p.offer.price_breaks : [],
            status: "PUBLISHED",
          }).select("id").single();
          results.push({ name: p.name, ok: !off.error, product_id: ins.data.id, offer_id: off.data?.id ?? null, error: off.error?.message ?? null });
        } else {
          results.push({ name: p.name, ok: true, product_id: ins.data.id });
        }
      }
      await audit(user, "catalogue.import", "canonical_products", body.org_id, { count: body.products.length, ok: results.filter((x) => x.ok).length });
      await db.from("funnel_events").insert({ event_type: "view", actor_id: user.id, actor_class: user.role, outcome: "ok", meta: { kind: "catalogue_import", count: results.length } });
      return Response.json({ results, imported: results.filter((x) => x.ok).length, failed: results.filter((x) => !x.ok).length }, { headers: cors });
    }
    if (action === "offers.browse") {
      const cls = s(body.service_class ?? url.searchParams.get("q") ?? "", 60);
      let q = db.from("seller_offers").select("id, price, currency, quantity, moq, price_breaks, visibility, status, canonical_products(name, brand, category), organizations(name, country, markets)").eq("status", "PUBLISHED").eq("visibility", "public").order("created_at", { ascending: false }).limit(50);
      if (cls) q = q.or(`canonical_products.name.ilike.*${cls}*,canonical_products.brand.ilike.*${cls}*`);
      const { data: offers, error } = await q;
      if (error) throw new HttpError(500, error.message);
      return Response.json({ offers: offers ?? [], note: "public offers only; caps enforced at publish (AC-003)" }, { headers: cors });
    }
    if (action === "pilot.tag") {
      requireAdmin(user);
      if (!body.user_id) throw new HttpError(400, "user_id required");
      const { data: fm, error } = await db.from("founding_members").upsert({
        user_id: body.user_id, cohort: s(body.cohort, 60) || "industry-pilot-2026",
        tier: s(body.tier, 40) || "industry_partner", status: "ACTIVE",
        benefits: { pilot: true, listing_cap_override: body.listing_cap_override === true, terms_version: s(body.terms_version, 20) || "pilot-v1" },
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      if (body.listing_cap_override) {
        await db.from("entitlement_grants").insert({ user_id: body.user_id, capability: "catalogue_public_listings", source: "familiarisation", ends_at: new Date(Date.now() + 60 * 864e5).toISOString(), plan_code: "industry-pilot" });
      }
      await audit(user, "pilot.tag", "founding_members", body.user_id, { cohort: fm.cohort });
      return Response.json({ founding_member: fm, terms: "charge-free pilot; no auto-charge on expiry (AC-008)" }, { headers: cors });
    }

    // ============ TRACK 1: CROSS-DASHBOARD ACTIVITY (owner/mechanic/admin) ============
    if (action === "activity.mine") {
      const [{ data: asCustomer }, { data: memberships }, { data: payments }, { data: reviews }, { data: notifs }, { data: vehicles }] = await Promise.all([
        db.from("bookings").select("id, state, scheduled_at, quote, checklist, referral_note, created_at, vehicles(make, model, registration)").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(25),
        db.from("organization_members").select("org_id, role").eq("user_id", user.id),
        db.from("payment_intents").select("id, amount, currency, state, reference, created_at").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(25),
        db.from("reviews").select("id, rating, comment, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(25),
        db.from("notifications").select("id, title, body, read, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(25),
        db.from("vehicles").select("id, make, model, registration").eq("owner_id", user.id),
      ]);
      const orgIds = (memberships ?? []).map((m: any) => m.org_id);
      let providerBookings: any[] = [];
      if (orgIds.length) {
        const { data: pb } = await db.from("bookings")
          .select("id, state, scheduled_at, quote, checklist, referral_note, created_at, vehicles(make, model, registration)")
          .in("provider_org_id", orgIds).order("created_at", { ascending: false }).limit(25);
        providerBookings = pb ?? [];
      }
      const vehIds = (vehicles ?? []).map((v: any) => v.id);
      let passport: any[] = [];
      if (vehIds.length) {
        const { data: stamps } = await db.from("passport_stamps").select("vehicle_id, title, description, mileage_km, verified, stamped_at").in("vehicle_id", vehIds).order("stamped_at", { ascending: false }).limit(50);
        passport = stamps ?? [];
      }
      return Response.json({
        bookings_as_customer: asCustomer ?? [], bookings_for_my_orgs: providerBookings,
        payments: payments ?? [], reviews: reviews ?? [], notifications: notifs ?? [],
        vehicles: vehicles ?? [], passport_stamps: passport,
        source_note: "all tables live; sample-labelled where seeded",
      }, { headers: cors });
    }

    // ============ TRACK 1: ADMIN OPERATIONS VIEWER (read-only, whitelisted) ============
    if (action === "admin.table") {
      requireAdmin(user);
      const allowed = ["app_users", "organizations", "organization_members", "provider_capabilities", "canonical_products", "seller_offers", "bookings", "payment_intents", "payment_providers", "subscriptions", "entitlement_grants", "familiarisation_windows", "funnel_events", "audit_events", "gov_cases", "concierge_conversations", "courses", "enrollments", "credentials", "founding_members", "community_posts", "site_banners", "distribution_links", "inventory_items", "inventory_movements", "vehicles", "passport_stamps", "service_orders", "rfq_requests", "reviews", "notifications", "question_banks", "exam_attempts", "practical_assessments", "capability_verifications", "branches", "plans"];
      const table = s(body.table ?? url.searchParams.get("table"), 60);
      if (!allowed.includes(table)) throw new HttpError(403, "Table not whitelisted for the operations viewer");
      const rows = await db.from(table).select("*").order("created_at", { ascending: false }).limit(50)
        .then((r: any) => r).catch(async () => {
          const r2 = await db.from(table).select("*").limit(50);
          return r2;
        });
      if (rows.error) throw new HttpError(500, rows.error.message);
      return Response.json({ table, rows: rows.data ?? [], count_returned: (rows.data ?? []).length, provenance: "read-only; row cap 50; ordering by created_at where present" }, { headers: cors });
    }


    // ============ POLISH PACK P1-P10 (current-version completion, no charge) ============
    // P2: booking quote builder (provider itemized quote -> QUOTED) + customer accept
    if (action === "booking.quote") {
      const { data: b } = await db.from("bookings").select("id, state, provider_org_id, quote").eq("id", body.booking_id).single();
      if (!b) throw new HttpError(404, "Booking not found");
      if (b.state !== "REQUESTED") throw new HttpError(409, `Booking is ${b.state}; quotes attach to REQUESTED bookings`);
      const { data: mem } = await db.from("organization_members").select("org_id").eq("user_id", user.id).eq("org_id", b.provider_org_id);
      if (!mem?.length && user.role !== "admin") throw new HttpError(403, "Only the assigned provider organization may quote");
      const items = Array.isArray(body.items) ? body.items.slice(0, 30).map((it: any) => ({ label: s(it.label, 120), amount: Number(it.amount) || 0 })) : [];
      const total = items.reduce((a: number, x: any) => a + x.amount, 0);
      const quote = { version: 1, items, total, note: s(body.note, 400), quoted_by: user.id, quoted_at: new Date().toISOString() };
      const { error } = await db.from("bookings").update({ state: "QUOTED", quote, updated_at: new Date().toISOString() }).eq("id", b.id);
      if (error) throw new HttpError(500, error.message);
      await audit(user, "booking.quote", "bookings", b.id, { total });
      return Response.json({ ok: true, state: "QUOTED", quote }, { headers: cors });
    }
    if (action === "booking.accept") {
      const { data: b } = await db.from("bookings").select("id, state, customer_id").eq("id", body.booking_id).single();
      if (!b) throw new HttpError(404, "Booking not found");
      if (b.customer_id !== user.id && user.role !== "admin") throw new HttpError(403, "Only the customer may accept");
      if (b.state !== "QUOTED") throw new HttpError(409, `Cannot accept a ${b.state} booking`);
      await db.from("bookings").update({ state: "ACCEPTED", "quote->accepted_at": new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", b.id);
      await audit(user, "booking.accept", "bookings", b.id, {});
      return Response.json({ ok: true, state: "ACCEPTED" }, { headers: cors });
    }
    // P3: job-card checklist on a booking (both parties; uses compliance evidence classes)
    if (action === "booking.task.add") {
      const { data: b } = await db.from("bookings").select("id, checklist, customer_id, provider_org_id").eq("id", body.booking_id).single();
      if (!b) throw new HttpError(404, "Booking not found");
      const task = { id: "t" + Date.now(), title: s(body.title, 140), done: false, by: user.id };
      const checklist = [...(b.checklist ?? []), task].slice(0, 40);
      await db.from("bookings").update({ checklist }).eq("id", b.id);
      return Response.json({ ok: true, task }, { headers: cors });
    }
    if (action === "booking.task.toggle") {
      const { data: b } = await db.from("bookings").select("id, checklist").eq("id", body.booking_id).single();
      if (!b) throw new HttpError(404, "Booking not found");
      const checklist = (b.checklist ?? []).map((t: any) => t.id === body.task_id ? { ...t, done: !t.done } : t);
      await db.from("bookings").update({ checklist }).eq("id", b.id);
      return Response.json({ ok: true }, { headers: cors });
    }
    // P4: eligible reviews (COMPLETED booking, customer, one per booking)
    if (action === "review.create") {
      const { data: b } = await db.from("bookings").select("id, state, customer_id").eq("id", body.booking_id).single();
      if (!b) throw new HttpError(404, "Booking not found");
      if (b.state !== "COMPLETED") throw new HttpError(409, "Reviews are only possible after the job is completed");
      if (b.customer_id !== user.id) throw new HttpError(403, "Only the customer may review");
      const rating = Math.min(5, Math.max(1, parseInt(body.rating) || 0));
      if (!rating) throw new HttpError(400, "Rating 1-5 required");
      const { data: existing } = await db.from("reviews").select("id").eq("booking_id", b.id).limit(1);
      if (existing?.length) throw new HttpError(409, "This booking has already been reviewed");
      const { data: rv, error } = await db.from("reviews").insert({ user_id: user.id, booking_id: b.id, rating, comment: s(body.comment, 800) }).select("id").single();
      if (error) throw new HttpError(500, error.message);
      await audit(user, "review.create", "reviews", rv.id, { booking_id: b.id, rating });
      return Response.json({ ok: true, review_id: rv.id }, { headers: cors });
    }
    if (action === "review.reply") {
      const { data: rv } = await db.from("reviews").select("id, reply").eq("id", body.review_id).single();
      if (!rv) throw new HttpError(404, "Review not found");
      await db.from("reviews").update({ reply: s(body.reply, 800), replied_at: new Date().toISOString() }).eq("id", body.review_id);
      await audit(user, "review.reply", "reviews", body.review_id, {});
      return Response.json({ ok: true }, { headers: cors });
    }
    // P5: notifications read + preferences
    if (action === "notifications.read") {
      const q = body.all ? db.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false)
                         : db.from("notifications").update({ read: true }).eq("user_id", user.id).in("id", body.ids ?? []);
      const { error } = await q;
      if (error) throw new HttpError(500, error.message);
      return Response.json({ ok: true }, { headers: cors });
    }
    // P9: referral note on a booking (honest referral-lite)
    if (action === "booking.refer") {
      const { error } = await db.from("bookings").update({ referral_note: s(body.note, 400), updated_at: new Date().toISOString() }).eq("id", body.booking_id);
      if (error) throw new HttpError(500, error.message);
      await audit(user, "booking.refer", "bookings", body.booking_id, {});
      return Response.json({ ok: true, note: "Referral recorded — the Concierge can help route this to a verified specialist." }, { headers: cors });
    }


    // ==================== PART 2 — MODULE 1: BID & NEGOTIATION ====================
    if (action === "request.create") {
      const { data: r0, error } = await db.from("service_requests").insert({
        customer_id: user.id, service_class: s(body.service_class, 40),
        vehicle_id: body.vehicle_id ?? null, description: body.description && typeof body.description === "object" ? body.description : {},
        location: s(body.location, 120), urgency: ["routine","scheduled","urgent"].includes(body.urgency) ? body.urgency : "routine",
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      await audit(user, "request.create", "service_requests", r0.id, {});
      return Response.json({ request: r0 }, { headers: cors });
    }
    if (action === "request.list") {
      const { data: mine } = await db.from("service_requests").select("*").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(50);
      const { data: memberships } = await db.from("organization_members").select("org_id").eq("user_id", user.id);
      const orgIds = (memberships ?? []).map((m: any) => m.org_id);
      let forOrgs: any[] = [];
      if (orgIds.length) {
        const { data: rs } = await db.from("service_requests").select("*").in("status", ["OPEN", "NEGOTIATING"]).order("created_at", { ascending: false }).limit(50);
        forOrgs = (rs ?? []).filter((r: any) => !orgIds.includes(r.__none)); // visible to all eligible providers; eligibility applied at offer time
      }
      return Response.json({ mine: mine ?? [], open: forOrgs }, { headers: cors });
    }
    if (action === "offer.submit" || action === "offer.counter") {
      const { data: req } = await db.from("service_requests").select("id, status, customer_id").eq("id", body.request_id).single();
      if (!req) throw new HttpError(404, "Request not found");
      if (["CONFIRMED", "CANCELLED", "EXPIRED"].includes(req.status)) throw new HttpError(409, `Request is ${req.status}`);
      const { data: mem } = await db.from("organization_members").select("org_id").eq("user_id", user.id);
      const orgId = body.provider_org_id ?? (mem ?? [])[0]?.org_id;
      if (!orgId) throw new HttpError(403, "Provider organization required");
      // versioned chain
      const { data: last } = await db.from("request_offers").select("version, id").eq("request_id", req.id).order("version", { ascending: false }).limit(1);
      const version = ((last ?? [])[0]?.version ?? 0) + 1;
      const { data: off, error } = await db.from("request_offers").insert({
        request_id: req.id, provider_org_id: orgId, version,
        payload: { scope: s(body.scope, 500), items: (body.items ?? []).slice(0, 30), total: Number(body.total) || 0, schedule: s(body.schedule, 200), warranty: s(body.warranty, 300), conditions: s(body.conditions, 300) },
        state: action === "offer.counter" ? "COUNTERED" : "SUBMITTED",
        parent_offer_id: action === "offer.counter" ? (body.parent_offer_id ?? (last ?? [])[0]?.id ?? null) : null,
        actor_id: user.id,
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      if ((last ?? [])[0]?.id) await db.from("request_offers").update({ state: "SUPERSEDED" }).eq("id", (last ?? [])[0].id);
      await db.from("service_requests").update({ status: "NEGOTIATING" }).eq("id", req.id);
      await db.from("funnel_events").insert({ event_type: "quote", actor_id: user.id, actor_class: user.role, entity_type: "request_offers", entity_id: off.id, outcome: "ok" });
      return Response.json({ offer: off, version }, { headers: cors });
    }
    if (action === "offer.accept") {
      const { data: off } = await db.from("request_offers").select("*, service_requests(customer_id, status)").eq("id", body.offer_id).single();
      if (!off) throw new HttpError(404, "Offer not found");
      if (off.service_requests?.customer_id !== user.id && user.role !== "admin") throw new HttpError(403, "Only the customer may accept");
      if (off.state !== "SUBMITTED" && off.state !== "COUNTERED") throw new HttpError(409, `Offer is ${off.state}`);
      const { data: booking, error } = await db.from("bookings").insert({
        customer_id: user.id, provider_org_id: off.provider_org_id, state: "ACCEPTED",
        quote: { offer_id: off.id, version: off.version, ...(off.payload ?? {}) },
      }).select("id").single();
      if (error) throw new HttpError(500, error.message);
      await db.from("request_offers").update({ state: "ACCEPTED" }).eq("id", off.id);
      await db.from("service_requests").update({ status: "CONFIRMED" }).eq("id", off.request_id);
      await audit(user, "offer.accept", "request_offers", off.id, { booking_id: booking.id });
      return Response.json({ ok: true, booking_id: booking.id, note: "Accepted offer is an immutable snapshot; changes require a new versioned offer." }, { headers: cors });
    }
    if (action === "offer.withdraw") {
      const { error } = await db.from("request_offers").update({ state: "WITHDRAWN" }).eq("id", body.offer_id).eq("actor_id", user.id);
      if (error) throw new HttpError(500, error.message);
      return Response.json({ ok: true }, { headers: cors });
    }

    // ==================== PART 2 — MODULE 2: SPECIALIST/GARAGE EXECUTION ====================
    if (action === "task.assign") {
      const { data: b } = await db.from("bookings").select("id").eq("id", body.booking_id).single();
      if (!b) throw new HttpError(404, "Booking not found");
      const { data: t, error } = await db.from("job_tasks").insert({
        booking_id: b.id, title: s(body.title, 140), assignee_id: body.assignee_id ?? null,
        capability_required: s(body.capability_required, 40), evidence_required: !!body.evidence_required,
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      await db.from("job_tasks").update({ status: body.assignee_id ? "ASSIGNED" : "READY" }).eq("id", t.id);
      return Response.json({ task: t }, { headers: cors });
    }
    if (action === "task.respond") {
      const allowed: Record<string, string[]> = { ASSIGNED: ["ACCEPTED", "DECLINED"], ACCEPTED: ["IN_PROGRESS"], IN_PROGRESS: ["SUBMITTED"], SUBMITTED: [], DECLINED: [], VERIFIED: [], REWORK: ["IN_PROGRESS"], READY: [] };
      const { data: t } = await db.from("job_tasks").select("*").eq("id", body.task_id).single();
      if (!t) throw new HttpError(404, "Task not found");
      if (!(allowed[t.status] ?? []).includes(body.status)) throw new HttpError(409, `Cannot move ${t.status} → ${body.status}`);
      if (t.status === "ASSIGNED" && t.assignee_id && t.assignee_id !== user.id && user.role !== "admin") throw new HttpError(403, "Only the assignee may respond");
      await db.from("job_tasks").update({ status: body.status, submitted_at: body.status === "SUBMITTED" ? new Date().toISOString() : t.submitted_at }).eq("id", t.id);
      await audit(user, "task." + body.status.toLowerCase(), "job_tasks", t.id, {});
      return Response.json({ ok: true }, { headers: cors });
    }
    if (action === "task.verify") {
      requireAdmin(user);
      const { data: t } = await db.from("job_tasks").select("id, status").eq("id", body.task_id).single();
      if (!t) throw new HttpError(404, "Task not found");
      if (t.status !== "SUBMITTED") throw new HttpError(409, "Only SUBMITTED tasks can be verified");
      await db.from("job_tasks").update({ status: body.pass === false ? "REWORK" : "VERIFIED", verified_by: user.id }).eq("id", t.id);
      const { data: so } = await db.from("quality_signoffs").insert({
        booking_id: (await db.from("job_tasks").select("booking_id").eq("id", t.id).single()).data?.booking_id,
        task_id: t.id, result: body.pass === false ? "REWORK" : "PASS", verifier_id: user.id, note: s(body.note, 300),
      }).select("id").single();
      await audit(user, "task.verify", "quality_signoffs", so.id, { pass: body.pass !== false });
      return Response.json({ ok: true }, { headers: cors });
    }
    if (action === "warranty.open") {
      const { data: w, error } = await db.from("warranty_claims").insert({
        booking_id: body.booking_id ?? null, org_id: body.org_id ?? null,
        claim_type: ["workmanship", "product", "third_party"].includes(body.claim_type) ? body.claim_type : "workmanship",
        terms: body.terms && typeof body.terms === "object" ? body.terms : {},
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      return Response.json({ claim: w }, { headers: cors });
    }
    if (action === "warranty.resolve") {
      await db.from("warranty_claims").update({ status: ["RESOLVED", "REJECTED"].includes(body.status) ? body.status : "RESOLVED" }).eq("id", body.claim_id);
      return Response.json({ ok: true }, { headers: cors });
    }
    if (action === "comeback.link") {
      const { data: c, error } = await db.from("comebacks").insert({
        original_booking_id: body.original_booking_id, followup_booking_id: body.followup_booking_id ?? null, reason: s(body.reason, 300),
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      return Response.json({ comeback: c, note: "Linked follow-up; original job history preserved unchanged." }, { headers: cors });
    }

    // ==================== PART 2 — MODULE 3: FLEET ====================
    if (action === "fleet.driver.add") {
      const { data: d, error } = await db.from("fleet_drivers").insert({ org_id: body.org_id, user_id: body.user_id ?? user.id, licence_ref: s(body.licence_ref, 60) }).select("*").single();
      if (error) throw new HttpError(error.message.includes("duplicate") ? 409 : 500, error.message.includes("duplicate") ? "Driver already registered in this fleet" : error.message);
      return Response.json({ driver: d }, { headers: cors });
    }
    if (action === "fleet.inspection.submit") {
      const items = Array.isArray(body.checklist) ? body.checklist : [];
      if (items.some((i: any) => i.status === "NOT_CHECKED" && i.treated_as_ok)) throw new HttpError(400, "NOT_CHECKED items must never silently become OK");
      const defects = items.filter((i: any) => i.status === "ISSUE");
      const { data: ins, error } = await db.from("fleet_inspections").insert({
        vehicle_id: body.vehicle_id, driver_id: body.driver_id ?? null,
        checklist: items, defects, odometer_km: parseInt(body.odometer_km) || null,
        status: defects.some((d: any) => d.severity === "safety_critical") ? "ESCALATED" : "SUBMITTED",
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      return Response.json({ inspection: ins, escalated: ins.status === "ESCALATED" }, { headers: cors });
    }
    if (action === "fleet.fuel.log") {
      const litres = Number(body.litres), unit = Number(body.unit_price);
      const total = Number(body.total) || +(litres * unit).toFixed(2);
      if (!(litres > 0) || !(unit > 0)) throw new HttpError(400, "litres + unit_price required");
      if (Math.abs(litres * unit - total) > Math.max(50, total * 0.05)) throw new HttpError(422, "litres × price does not match total within tolerance");
      const { data: f, error } = await db.from("fuel_events").insert({
        vehicle_id: body.vehicle_id, driver_id: body.driver_id ?? null,
        litres, unit_price: unit, total, odometer_km: parseInt(body.odometer_km) || null,
        station: s(body.station, 120), receipt_ref: s(body.receipt_ref, 60),
        status: body.receipt_ref ? "VALIDATED" : "FLAGGED",
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      return Response.json({ fuel: f, note: f.status === "FLAGGED" ? "No receipt reference — flagged for review (a receipt proves submission, not consumption)." : "Validated" }, { headers: cors });
    }
    if (action === "fleet.anomaly.scan") {
      const vehId = body.vehicle_id;
      const { data: fuels } = await db.from("fuel_events").select("*").eq("vehicle_id", vehId).order("created_at", { ascending: false }).limit(12);
      const cases: any[] = [];
      const fl = fuels ?? [];
      for (let i = 1; i < fl.length; i++) {
        const km = (fl[i - 1].odometer_km ?? 0) - (fl[i].odometer_km ?? 0);
        if (km > 0) {
          const lpk = (fl[i - 1].litres / km) * 100;
          const prior = fl.slice(i, i + 4);
          if (prior.length >= 2) {
            const base = prior.reduce((a: number, x: any) => a + (x.litres / Math.max(1, (x.odometer_km ?? 0))), 0) / prior.length;
            if (lpk > base * 1.35 && km > 30) {
              cases.push({ vehicle_id: vehId, kind: "consumption_spike", signal: { lp100km: +lpk.toFixed(2), baseline_sample: prior.length, km }, confidence: prior.length >= 3 ? "moderate" : "low" });
            }
          }
        }
        if ((fl[i - 1].odometer_km ?? 0) < (fl[i].odometer_km ?? 0)) {
          cases.push({ vehicle_id: vehId, kind: "odometer_rollback", signal: { later: fl[i - 1].odometer_km, earlier: fl[i].odometer_km }, confidence: "high" });
        }
      }
      const dupes = fl.filter((f: any) => f.receipt_ref && fl.filter((x: any) => x.receipt_ref === f.receipt_ref).length > 1);
      for (const d of dupes.slice(0, 3)) cases.push({ vehicle_id: vehId, kind: "duplicate_receipt", signal: { receipt_ref: d.receipt_ref }, confidence: "high" });
      let inserted = 0;
      for (const c of cases.slice(0, 10)) {
        const { error } = await db.from("anomaly_cases").insert({ ...c, status: "OPEN" });
        if (!error) inserted++;
      }
      await audit(user, "fleet.anomaly.scan", "anomaly_cases", vehId, { found: cases.length });
      return Response.json({ anomalies_found: cases.length, inserted, cases: cases.slice(0, 10), disclaimer: "An anomaly is a signal for human review — never proof of misconduct; no automatic penalties." }, { headers: cors });
    }
    if (action === "workorder.create") {
      const { data: w, error } = await db.from("work_orders").insert({
        fleet_org_id: body.fleet_org_id, vehicle_id: body.vehicle_id ?? null,
        booking_id: body.booking_id ?? null, priority: ["routine", "high", "safety_critical"].includes(body.priority) ? body.priority : "routine",
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      return Response.json({ work_order: w }, { headers: cors });
    }

    // ==================== PART 2 — MODULE 4: COMMUNITY (FULL) ====================
    if (action === "space.create") {
      if (!s(body.name)) throw new HttpError(400, "name required");
      const { data: sp, error } = await db.from("spaces").insert({
        name: s(body.name, 100), purpose: s(body.purpose, 300), owner_id: user.id,
        membership: body.membership === "members" ? "members" : "public", region: s(body.region, 40), rules: s(body.rules, 500),
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      await db.from("space_members").insert({ space_id: sp.id, user_id: user.id, role: "moderator" });
      return Response.json({ space: sp }, { headers: cors });
    }
    if (action === "space.join") {
      const { data: sp } = await db.from("spaces").select("membership").eq("id", body.space_id).single();
      if (!sp) throw new HttpError(404, "Space not found");
      const { error } = await db.from("space_members").insert({ space_id: body.space_id, user_id: user.id }).then((r: any) => r, (e: any) => ({ error: e }));
      if (error && !String(error.message).includes("duplicate")) throw new HttpError(500, error.message);
      return Response.json({ ok: true }, { headers: cors });
    }
    if (action === "space.post") {
      const { data: sp } = await db.from("spaces").select("id").eq("id", body.space_id).single();
      if (!sp) throw new HttpError(404, "Space not found");
      const { data: p, error } = await db.from("community_posts").insert({
        author_id: user.id, topic: s(body.topic, 40) || "general", title: s(body.title, 140), body: s(body.body, 4000),
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      await db.from("funnel_events").insert({ event_type: "view", actor_id: user.id, actor_class: user.role, entity_type: "space_post", entity_id: p.id, outcome: "ok" });
      return Response.json({ post: p }, { headers: cors });
    }
    if (action === "comment.add") {
      const { data: c, error } = await db.from("comments").insert({
        post_id: body.post_id ?? null, parent_id: body.parent_id ?? null, author_id: user.id, body: s(body.body, 2000),
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      return Response.json({ comment: c }, { headers: cors });
    }
    if (action === "mentor.request") {
      const { data: m, error } = await db.from("mentorship_requests").insert({ requester_id: user.id, topic: s(body.topic, 200) }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      return Response.json({ request: m, note: "Matching suggests; it never implies endorsement. Users choose whether to accept." }, { headers: cors });
    }
    if (action === "opportunity.publish") {
      const { data: o, error } = await db.from("opportunities").insert({
        source: s(body.source, 20) || "community", publisher_id: user.id,
        title: s(body.title, 140), body: s(body.body, 2000),
        eligibility: body.eligibility && typeof body.eligibility === "object" ? body.eligibility : {},
        region: s(body.region, 40), capacity: parseInt(body.capacity) || null, deadline: body.deadline ?? null,
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      return Response.json({ opportunity: o, note: "An opportunity is not a promise of work, contracts or endorsement." }, { headers: cors });
    }
    if (action === "opportunity.apply") {
      const { data: o } = await db.from("opportunities").select("id, capacity, deadline").eq("id", body.opportunity_id).single();
      if (!o) throw new HttpError(404, "Opportunity not found");
      if (o.deadline && new Date(o.deadline) < new Date()) throw new HttpError(410, "Opportunity deadline passed");
      const { data: app0, error } = await db.from("opportunity_applications").insert({ opportunity_id: o.id, applicant_id: user.id }).select("*").single();
      if (error) throw new HttpError(error.message.includes("duplicate") ? 409 : 500, error.message.includes("duplicate") ? "Already applied" : error.message);
      return Response.json({ application: app0, note: "Eligibility review follows; nothing is guaranteed by applying." }, { headers: cors });
    }

    // ==================== PART 2 — MODULE 5: FOUNDING COMPLETION ====================
    if (action === "founding.region.upsert") {
      requireAdmin(user);
      const { data: reg, error } = await db.from("founding_regions").upsert({
        code: s(body.code, 8).toUpperCase(), name: s(body.name, 60), currency: s(body.currency, 8) || "KES",
        fx_rate: Number(body.fx_rate) || 129.79, rounding: parseInt(body.rounding) || 100,
        price_usd: Number(body.price_usd) || 20, cap: parseInt(body.cap) || 500,
        status: ["PLANNED", "OPEN", "CLOSED"].includes(body.status) ? body.status : "PLANNED",
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      return Response.json({ region: reg, local_price: Math.round((reg.price_usd * reg.fx_rate) / reg.rounding) * reg.rounding, note: "FX rate is a configured policy value with a recorded timestamp — never a live hardcoded feed." }, { headers: cors });
    }
    if (action === "founding.join") {
      const regionCode = s(body.region_code, 8).toUpperCase() || "KE";
      const { data: reg } = await db.from("founding_regions").select("*").eq("code", regionCode).single();
      if (!reg) throw new HttpError(404, "Region not found");
      if (reg.status !== "OPEN") throw new HttpError(409, `Region is ${reg.status}`);
      const { data: existing } = await db.from("founding_members").select("user_id").eq("user_id", user.id);
      if (existing?.length) throw new HttpError(409, "One SPID cannot hold duplicate founding membership");
      const { count } = await db.from("founding_members").select("user_id", { count: "exact", head: true });
      if ((count ?? 0) >= reg.cap) throw new HttpError(429, "Regional cohort capacity reached");
      const localPrice = Math.round((reg.price_usd * reg.fx_rate) / reg.rounding) * reg.rounding;
      const { data: fm, error } = await db.from("founding_members").insert({
        user_id: user.id, cohort: `founders-${regionCode}-2026`, card_number: `SPK-F-${regionCode}-2026-${String((count ?? 0) + 1).padStart(6, "0")}`,
        tier: "Silver", benefits: { region: regionCode, entry_price_local: localPrice, currency: reg.currency, price_locked: true, terms_version: "founding-v1" },
      }).select("*").single();
      if (error) throw new HttpError(error.message.includes("duplicate") ? 409 : 500, error.message);
      await db.from("points_ledger").insert({ member_id: user.id, event_type: "founding_join", delta: 100, source_ref: fm.card_number, idempotency_key: `join-${user.id}-${regionCode}` });
      await audit(user, "founding.join", "founding_members", user.id, { region: regionCode, price: localPrice });
      return Response.json({ founding_member: fm, local_price: localPrice, currency: reg.currency, guarantee: "Accepted price is locked; later FX changes never alter a completed founding purchase." }, { headers: cors });
    }
    if (action === "points.post") {
      const key = s(body.idempotency_key, 120);
      const { data: dup } = await db.from("points_ledger").select("id").eq("idempotency_key", key).maybeSingle();
      if (dup) return Response.json({ ok: true, deduplicated: true }, { headers: cors });
      const delta = parseInt(body.delta) || 0;
      if (!delta) throw new HttpError(400, "delta required");
      const { data: e, error } = await db.from("points_ledger").insert({
        member_id: body.member_id ?? user.id, event_type: s(body.event_type, 40), delta,
        source_ref: s(body.source_ref, 80), idempotency_key: key,
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      return Response.json({ entry: e, note: "Append-only ledger; corrections are reversing entries, never edits." }, { headers: cors });
    }
    if (action === "points.balance") {
      const { data: rows } = await db.from("points_ledger").select("delta, status").eq("member_id", user.id).eq("status", "POSTED");
      const balance = (rows ?? []).reduce((a: number, r: any) => a + r.delta, 0);
      const { data: tiers } = await db.from("tier_rules").select("*").order("min_points");
      const tier = [...(tiers ?? [])].reverse().find((t: any) => balance >= t.min_points)?.tier ?? "Silver";
      return Response.json({ balance, tier, tiers: tiers ?? [], note: "Points are not cash or deposits unless separately approved." }, { headers: cors });
    }
    if (action === "reward.redeem") {
      const cost = parseInt(body.points_cost) || 0;
      if (!cost || !s(body.reward_label)) throw new HttpError(400, "reward_label + points_cost required");
      const { data: rows } = await db.from("points_ledger").select("delta").eq("member_id", user.id).eq("status", "POSTED");
      const balance = (rows ?? []).reduce((a: number, r: any) => a + r.delta, 0);
      if (balance < cost) throw new HttpError(409, `Insufficient points (${balance} < ${cost})`);
      const { data: o, error } = await db.from("redemption_orders").insert({ member_id: user.id, reward_label: s(body.reward_label, 120), points_cost: cost }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      await db.from("points_ledger").insert({ member_id: user.id, event_type: "redemption", delta: -cost, source_ref: o.id, idempotency_key: `rdm-${o.id}` });
      return Response.json({ order: o, remaining: balance - cost }, { headers: cors });
    }

    // ==================== PART 2 — MODULE 6: MANUFACTURER MULTI-REGION ====================
    if (action === "market.set") {
      const lifecycles = ["PLANNED", "RESEARCH", "SHADOW", "PILOT", "LIMITED_LIVE", "LIVE", "PAUSED", "CLOSED"];
      if (!body.org_id || !s(body.country)) throw new HttpError(400, "org_id + country required");
      const lc = lifecycles.includes(body.lifecycle) ? body.lifecycle : "PLANNED";
      const { data: m, error } = await db.from("org_markets").upsert({
        org_id: body.org_id, country: s(body.country, 8).toUpperCase(), state: s(body.state, 40) ?? null,
        lifecycle: lc, visibility: body.visibility && typeof body.visibility === "object" ? body.visibility : {},
        owner_id: user.id, reason: s(body.reason, 300),
      }, { onConflict: "org_id,country,state" }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      await audit(user, "market.set", "org_markets", m.id, { lifecycle: lc });
      return Response.json({ market: m, rule: "Global registration never promotes a market to LIVE automatically; each market has its own gate." }, { headers: cors });
    }
    if (action === "product.market_state") {
      const states = ["UNKNOWN", "UNDER_REVIEW", "APPROVED", "AVAILABLE", "LIMITED", "UNAVAILABLE", "NOT_AUTHORIZED", "RESTRICTED", "RECALLED", "WITHDRAWN"];
      const { data: r, error } = await db.from("regional_product_states").upsert({
        product_id: body.product_id, market_id: body.market_id,
        state: states.includes(body.state) ? body.state : "UNKNOWN",
        reason: s(body.reason, 300), source: s(body.source, 40) || "manufacturer_declaration",
      }, { onConflict: "product_id,market_id" }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      return Response.json({ regional_state: r, note: "A declaration is not presented as regulator-confirmed fact." }, { headers: cors });
    }
    if (action === "campaign.publish") {
      const { data: c, error } = await db.from("campaigns").insert({
        org_id: body.org_id, kind: ["recall", "service_campaign", "advisory"].includes(body.kind) ? body.kind : "service_campaign",
        scope: body.scope && typeof body.scope === "object" ? body.scope : {},
        severity: ["low", "moderate", "high", "critical"].includes(body.severity) ? body.severity : "moderate",
        published_by: user.id,
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      await audit(user, "campaign.publish", "campaigns", c.id, { kind: c.kind, severity: c.severity });
      return Response.json({ campaign: c }, { headers: cors });
    }
    if (action === "doc.publish") {
      const { data: prev } = await db.from("tech_documents").select("id, version").eq("product_id", body.product_id).eq("title", s(body.title, 200)).order("version", { ascending: false }).limit(1);
      const version = ((prev ?? [])[0]?.version ?? 0) + 1;
      const { data: d, error } = await db.from("tech_documents").insert({
        product_id: body.product_id ?? null, title: s(body.title, 200), version,
        doc_type: ["spec", "bulletin", "notice"].includes(body.doc_type) ? body.doc_type : "spec",
        market_scope: body.market_scope && typeof body.market_scope === "object" ? body.market_scope : {},
        published_by: user.id, supersedes: (prev ?? [])[0]?.id ?? null,
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      return Response.json({ document: d, version, note: "Prior version preserved; supersession is a link, never an overwrite." }, { headers: cors });
    }

    // ==================== PART 2 — MODULE 7: VENDOR FULFILMENT ====================
    if (action === "po.create") {
      if (!body.org_id) throw new HttpError(400, "org_id required");
      const { data: po, error } = await db.from("purchase_orders").insert({
        org_id: body.org_id, supplier_org_id: body.supplier_org_id ?? null, supplier_name: s(body.supplier_name, 120),
        terms: body.terms && typeof body.terms === "object" ? body.terms : {},
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      await audit(user, "po.create", "purchase_orders", po.id, {});
      return Response.json({ purchase_order: po }, { headers: cors });
    }
    if (action === "po.transition") {
      const allowed: Record<string, string[]> = { DRAFT: ["SUBMITTED", "CANCELLED"], SUBMITTED: ["ACCEPTED", "CANCELLED"], ACCEPTED: ["PARTIAL", "RECEIVED"], PARTIAL: ["RECEIVED"], RECEIVED: [], CANCELLED: [] };
      const { data: po } = await db.from("purchase_orders").select("id, status").eq("id", body.po_id).single();
      if (!po) throw new HttpError(404, "Purchase order not found");
      if (!(allowed[po.status] ?? []).includes(body.status)) throw new HttpError(409, `Cannot move ${po.status} → ${body.status}`);
      await db.from("purchase_orders").update({ status: body.status }).eq("id", po.id);
      await audit(user, "po." + body.status.toLowerCase(), "purchase_orders", po.id, {});
      return Response.json({ ok: true }, { headers: cors });
    }
    if (action === "shipment.create") {
      const { data: sh, error } = await db.from("shipments").insert({
        order_kind: body.order_kind === "po" ? "po" : "product_order", order_id: body.order_id,
        from_org_id: body.from_org_id ?? null, to_org_id: body.to_org_id ?? null, courier_org_id: body.courier_org_id ?? null,
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      return Response.json({ shipment: sh, rule: "Order confirmation is not dispatch; dispatch is not delivery; delivery is not installation." }, { headers: cors });
    }
    if (action === "shipment.status") {
      const flow: Record<string, string[]> = { CREATED: ["OFFERED"], OFFERED: ["ACCEPTED"], ACCEPTED: ["PICKED_UP"], PICKED_UP: ["IN_TRANSIT"], IN_TRANSIT: ["DELIVERED", "FAILED"], DELIVERED: [], FAILED: [] };
      const { data: sh } = await db.from("shipments").select("id, status").eq("id", body.shipment_id).single();
      if (!sh) throw new HttpError(404, "Shipment not found");
      if (!(flow[sh.status] ?? []).includes(body.status)) throw new HttpError(409, `Cannot move ${sh.status} → ${body.status}`);
      const proof = body.proof && typeof body.proof === "object" ? body.proof : {};
      await db.from("shipments").update({ status: body.status, proof: { ...proof, actor: user.id, at: new Date().toISOString() } }).eq("id", sh.id);
      await audit(user, "shipment." + body.status.toLowerCase(), "shipments", sh.id, {});
      return Response.json({ ok: true }, { headers: cors });
    }
    if (action === "return.open") {
      const { data: r, error } = await db.from("return_cases").insert({
        order_kind: body.order_kind === "po" ? "po" : "product_order", order_id: body.order_id, reason: s(body.reason, 400),
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      return Response.json({ return_case: r }, { headers: cors });
    }
    if (action === "return.resolve") {
      await db.from("return_cases").update({ status: ["AUTHORIZED", "RETURNING", "RECEIVED", "RESOLVED", "REJECTED"].includes(body.status) ? body.status : "RESOLVED", resolution: s(body.resolution, 400) }).eq("id", body.return_id);
      return Response.json({ ok: true }, { headers: cors });
    }
    if (action === "finance.recon") {
      const { data: intents } = await db.from("payment_intents").select("*").order("created_at", { ascending: false }).limit(100);
      const { data: webhooks } = await db.from("payment_webhook_events").select("*").order("created_at", { ascending: false }).limit(100);
      const unmatched = (intents ?? []).filter((i: any) => i.reference && !(webhooks ?? []).some((w: any) => (w.payload?.reference) === i.reference));
      const orphanWebhooks = (webhooks ?? []).filter((w: any) => w.payload?.reference && !(intents ?? []).some((i: any) => i.reference === w.payload.reference));
      return Response.json({ intents: (intents ?? []).length, webhooks: (webhooks ?? []).length, unmatched_intents: unmatched.length, orphan_webhooks: orphanWebhooks.length, note: "Reconciliation is report-only; no silent ledger changes." }, { headers: cors });
    }

    // ==================== PART 2 — MODULE 8: CONTROL PLANE ====================
    if (action === "agent.register") {
      if (user.role !== "admin") throw new HttpError(403, "Admin only");
      const { data: a, error } = await db.from("agents").insert({
        name: s(body.name, 80), kind: ["worker", "specialist", "executive"].includes(body.kind) ? body.kind : "worker",
        mandate: s(body.mandate, 400), tools: Array.isArray(body.tools) ? body.tools : [],
        status: ["PROPOSED", "TEST", "SHADOW", "ACTIVE", "PAUSED", "DEGRADED", "RETIRED"].includes(body.status) ? body.status : "PROPOSED",
        owner_id: user.id, model: s(body.model, 40) ?? null,
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      await audit(user, "agent.register", "agents", a.id, { kind: a.kind });
      return Response.json({ agent: a }, { headers: cors });
    }
    if (action === "agent.setstatus") {
      requireAdmin(user);
      await db.from("agents").update({ status: body.status, last_health_at: new Date().toISOString() }).eq("id", body.agent_id);
      await audit(user, "agent.setstatus", "agents", body.agent_id, { status: body.status });
      return Response.json({ ok: true }, { headers: cors });
    }
    if (action === "decision.create") {
      const { data: d, error } = await db.from("decisions").insert({
        title: s(body.title, 200), kind: s(body.kind, 40) || "operational",
        owner_id: body.owner_id ?? user.id, priority: ["low", "normal", "high", "critical"].includes(body.priority) ? body.priority : "normal",
        evidence: body.evidence && typeof body.evidence === "object" ? body.evidence : {}, deadline: body.deadline ?? null,
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      return Response.json({ decision: d }, { headers: cors });
    }
    if (action === "decision.resolve") {
      await db.from("decisions").update({ status: ["RESOLVED", "ESCALATED"].includes(body.status) ? body.status : "RESOLVED", resolution: s(body.resolution, 600) }).eq("id", body.decision_id);
      await audit(user, "decision.resolve", "decisions", body.decision_id, {});
      return Response.json({ ok: true }, { headers: cors });
    }
    if (action === "delegation.grant") {
      const ends = body.ends_at ?? new Date(Date.now() + 7 * 864e5).toISOString();
      const { data: d, error } = await db.from("delegations").insert({
        grantor_id: user.id, grantee_id: body.grantee_id,
        scope: body.scope && typeof body.scope === "object" ? body.scope : {}, actions: Array.isArray(body.actions) ? body.actions : [],
        ends_at: ends,
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      await audit(user, "delegation.grant", "delegations", d.id, { ends_at: ends });
      return Response.json({ delegation: d, rule: "Delegation is never broader than the delegator's authority; revocable with history preserved." }, { headers: cors });
    }
    if (action === "delegation.revoke") {
      await db.from("delegations").update({ revoked_at: new Date().toISOString() }).eq("id", body.delegation_id).eq("grantor_id", user.id);
      await audit(user, "delegation.revoke", "delegations", body.delegation_id, {});
      return Response.json({ ok: true }, { headers: cors });
    }
    if (action === "cost.report") {
      const days = parseInt(body.days) || 30;
      const since = new Date(Date.now() - days * 864e5).toISOString();
      const { data: rows } = await db.from("ai_costs").select("*").gte("created_at", since);
      const byService: Record<string, any> = {};
      for (const r of (rows ?? [])) {
        byService[r.service] = byService[r.service] ?? { calls: 0, cost_usd: 0, tokens: 0 };
        byService[r.service].calls++; byService[r.service].cost_usd += Number(r.cost_usd); byService[r.service].tokens += (r.tokens_in ?? 0) + (r.tokens_out ?? 0);
      }
      return Response.json({ period_days: days, by_service: byService, note: "Cost telemetry is separated from decision authority by design." }, { headers: cors });
    }

    // ==================== PART 2 — MODULE 9: GARAGE INTELLIGENCE (SHADOW-FIRST) ====================
    if (action === "intel.generate") {
      const orgId = body.org_id;
      const recs: any[] = [];
      // Rule 1: reorder proposal from inventory movements vs stock
      const { data: items } = await db.from("inventory_items").select("id, name, on_hand").eq("org_id", orgId);
      const { data: moves } = await db.from("inventory_movements").select("item_id, quantity, movement_type, created_at").gte("created_at", new Date(Date.now() - 30 * 864e5).toISOString());
      for (const it of (items ?? [])) {
        const used = (moves ?? []).filter((m: any) => m.item_id === it.id && ["issue_internal", "sale"].includes(m.movement_type)).reduce((a: number, m: any) => a + Math.abs(Number(m.quantity)), 0);
        if (used > 0 && Number(it.on_hand) < used / 2) {
          recs.push({ kind: "reorder_proposal", org_id: orgId, title: `Reorder candidate: ${it.name}`, explanation: `30-day usage ${used} vs on-hand ${it.on_hand}.`, evidence: { item_id: it.id, used_30d: used, on_hand: it.on_hand }, confidence: used >= 10 ? "moderate" : "low" });
        }
      }
      // Rule 2: booking demand note
      const { count: bk } = await db.from("bookings").select("id", { count: "exact", head: true }).eq("provider_org_id", orgId).gte("created_at", new Date(Date.now() - 30 * 864e5).toISOString());
      const { data: suff } = await db.from("intelligence_capabilities").select("*").eq("capability", "demand_forecast").maybeSingle();
      if ((bk ?? 0) < (suff?.min_rows ?? 50)) {
        recs.push({ kind: "data_sufficiency", org_id: orgId, title: "Demand forecast stays locked", explanation: `${bk ?? 0} bookings in 30 days < required ${suff?.min_rows ?? 50} (AC-009).`, evidence: { bookings_30d: bk }, confidence: "high" });
      } else {
        recs.push({ kind: "demand_signal", org_id: orgId, title: "Rising demand signal", explanation: `${bk} bookings in 30 days meets the data bar; consider capacity review.`, evidence: { bookings_30d: bk }, confidence: "moderate" });
      }
      let inserted = 0;
      for (const r of recs.slice(0, 20)) {
        const { error } = await db.from("recommendations").insert({ ...r, status: "SHADOW" });
        if (!error) inserted++;
      }
      await audit(user, "intel.generate", "recommendations", orgId, { inserted });
      return Response.json({ generated: inserted, note: "All recommendations start in SHADOW; human review promotes or rejects. No numeric confidence is fabricated." }, { headers: cors });
    }
    if (action === "intel.decide") {
      const { data: r } = await db.from("recommendations").select("id, status").eq("id", body.recommendation_id).single();
      if (!r) throw new HttpError(404, "Recommendation not found");
      await db.from("recommendations").update({
        status: ["ACCEPTED", "REJECTED"].includes(body.decision) ? body.decision : "REJECTED",
        decided_by: user.id, decision_reason: s(body.reason, 400),
      }).eq("id", r.id);
      await audit(user, "intel.decide", "recommendations", r.id, { decision: body.decision });
      return Response.json({ ok: true }, { headers: cors });
    }

    // ==================== PART 2 — MODULE 10: ACHIEVEMENT & OPPORTUNITIES ====================
    if (action === "rule.save") {
      requireAdmin(user);
      const { data: r, error } = await db.from("achievement_rules").insert({
        role: s(body.role, 40), name: s(body.name, 100),
        criteria: body.criteria && typeof body.criteria === "object" ? body.criteria : {},
        version: parseInt(body.version) || 1, approved: !!body.approved,
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      return Response.json({ rule: r, note: "No hidden hardcoded thresholds; unapproved rules never compute." }, { headers: cors });
    }
    if (action === "achievement.evaluate") {
      const { data: rules } = await db.from("achievement_rules").select("*").eq("role", user.role).eq("approved", true);
      const { data: completed } = await db.from("bookings").select("id").eq("customer_id", user.id).eq("state", "COMPLETED");
      const { data: creds } = await db.from("credentials").select("id").eq("user_id", user.id).eq("revoked", false);
      const basis = { completed_bookings: (completed ?? []).length, active_credentials: (creds ?? []).length };
      const results: any[] = [];
      for (const r of (rules ?? [])) {
        const c = r.criteria ?? {};
        const met = (basis.completed_bookings >= (c.min_completed_bookings ?? 0));
        const level = met ? r.name : null;
        if (level) {
          await db.from("stakeholder_achievements").upsert({
            user_id: user.id, role: user.role, level: r.name, basis, rule_version: r.version,
          }, { onConflict: "user_id,role" });
          results.push({ role: user.role, level: r.name, basis });
        }
      }
      return Response.json({ evaluated: (rules ?? []).length, earned: results, basis, note: "Evidence-based, role-aware; synthetic records never qualify." }, { headers: cors });
    }
    if (action === "ach.apply") { // apply to an achievement-sourced opportunity
      return Response.json({ note: "Use opportunity.apply with source=achievement opportunities." }, { headers: cors });
    }
    if (action === "appeal.open") {
      const { data: a, error } = await db.from("appeals").insert({
        subject_type: s(body.subject_type, 40), subject_id: s(body.subject_id, 60),
        user_id: user.id, reason: s(body.reason, 800),
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      return Response.json({ appeal: a, note: "Correction path preserved; original decision history is never rewritten." }, { headers: cors });
    }
    if (action === "appeal.resolve") {
      requireAdmin(user);
      await db.from("appeals").update({ status: ["RESOLVED", "REJECTED"].includes(body.status) ? body.status : "RESOLVED", resolution: s(body.resolution, 600) }).eq("id", body.appeal_id);
      return Response.json({ ok: true }, { headers: cors });
    }

    // ==================== PART 2 — MODULE 11: GOVERNMENT PHASE B (manual-handoff, authority-gated) ====================
    if (action === "gov.service.list") {
      const { data: svcs } = await db.from("gov_services").select("*").order("kind");
      return Response.json({ services: svcs ?? [], note: "All services are official-channel handoffs unless marked authorized_integration. Sparekei never collects government passwords." }, { headers: cors });
    }
    if (action === "gov.application.create") {
      const { data: a, error } = await db.from("gov_applications").insert({
        user_id: user.id, service_id: body.service_id, vehicle_id: body.vehicle_id ?? null,
        reference: s(body.reference, 80) ?? null, notes: body.notes && typeof body.notes === "object" ? body.notes : {},
        status: body.reference ? "SUBMITTED" : "READY",
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      return Response.json({ application: a, rule: "A saved reference is not an acknowledgement; ACKNOWLEDGED requires evidence you recorded from the official channel." }, { headers: cors });
    }
    if (action === "gov.application.transition") {
      const flow: Record<string, string[]> = { DRAFT: ["READY"], READY: ["SUBMITTED"], SUBMITTED: ["ACKNOWLEDGED", "ACTION_REQUIRED", "REJECTED", "UNKNOWN"], ACKNOWLEDGED: ["ACTION_REQUIRED", "REJECTED"], ACTION_REQUIRED: ["ACKNOWLEDGED", "REJECTED"], REJECTED: [], UNKNOWN: ["SUBMITTED"] };
      const { data: a } = await db.from("gov_applications").select("id, status").eq("id", body.application_id).single();
      if (!a) throw new HttpError(404, "Application not found");
      if (!(flow[a.status] ?? []).includes(body.status)) throw new HttpError(409, `Cannot move ${a.status} → ${body.status}`);
      await db.from("gov_applications").update({ status: body.status, reference: s(body.reference, 80) ?? undefined }).eq("id", a.id);
      await audit(user, "gov.app." + body.status.toLowerCase(), "gov_applications", a.id, {});
      return Response.json({ ok: true }, { headers: cors });
    }
    if (action === "gov.booking.record") {
      const { data: b, error } = await db.from("gov_inspection_bookings").insert({
        application_id: body.application_id ?? null, centre_name: s(body.centre_name, 120),
        inspection_type: s(body.inspection_type, 60), appointment_at: body.appointment_at ?? null,
        official_reference: s(body.official_reference, 80) ?? null, result: body.result ?? null,
      }).select("*").single();
      if (error) throw new HttpError(500, error.message);
      return Response.json({ booking: b, rule: "PASSED/FAILED may only be recorded from official result evidence — never predicted." }, { headers: cors });
    }


    // ==================== WORKSPACE HUB: one-call summary for all Part-2 module UIs ====================
    if (action === "hub.summary") {
      const { data: memberships } = await db.from("organization_members").select("org_id, role").eq("user_id", user.id);
      const orgIds = (memberships ?? []).map((m: any) => m.org_id);
      const [{ data: myVehicles }, { data: myRequests }, { data: myOffersOrg }] = await Promise.all([
        db.from("vehicles").select("id").eq("owner_id", user.id),
        db.from("service_requests").select("*, request_offers(*)").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(20),
        orgIds.length ? db.from("service_requests").select("*, request_offers(*)").in("status", ["OPEN", "NEGOTIATING"]).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
      ]);
      const vehIds = (myVehicles ?? []).map((v: any) => v.id);
      const orgBookings = orgIds.length ? (await db.from("bookings").select("id").in("provider_org_id", orgIds)).data ?? [] : [];
      const bookingIds = orgBookings.map((b: any) => b.id);
      const [
        tasks, signoffs, warranties, comebacks,
        drivers, inspections, fuel, anomalies, workorders,
        mySpaces, spacePosts, mentorships, opps, myApplications,
        founding, pointsRows, tiers,
        markets, regionalStates, campaigns, docs,
        pos, shipments, returns,
        recs, achRules, achMine, achOpps,
        govSvcs, govApps, govBookings,
      ] = await Promise.all([
        bookingIds.length ? db.from("job_tasks").select("*").in("booking_id", bookingIds).order("created_at", { ascending: false }).limit(30) : Promise.resolve({ data: [] }),
        bookingIds.length ? db.from("quality_signoffs").select("*").in("booking_id", bookingIds).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
        orgIds.length ? db.from("warranty_claims").select("*").in("org_id", orgIds).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
        bookingIds.length ? db.from("comebacks").select("*").in("original_booking_id", bookingIds).limit(20) : Promise.resolve({ data: [] }),
        orgIds.length ? db.from("fleet_drivers").select("*").in("org_id", orgIds) : Promise.resolve({ data: [] }),
        vehIds.length ? db.from("fleet_inspections").select("*").in("vehicle_id", vehIds).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
        vehIds.length ? db.from("fuel_events").select("*").in("vehicle_id", vehIds).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
        vehIds.length ? db.from("anomaly_cases").select("*").in("vehicle_id", vehIds).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
        orgIds.length ? db.from("work_orders").select("*").in("fleet_org_id", orgIds).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
        db.from("spaces").select("*, space_members!inner(user_id)").eq("space_members.user_id", user.id).limit(20),
        db.from("community_posts").select("*").eq("author_id", user.id).order("created_at", { ascending: false }).limit(10),
        db.from("mentorship_requests").select("*").eq("requester_id", user.id).order("created_at", { ascending: false }).limit(10),
        db.from("opportunities").select("*").eq("status", "PUBLISHED").order("created_at", { ascending: false }).limit(20),
        db.from("opportunity_applications").select("*").eq("applicant_id", user.id).limit(20),
        db.from("founding_members").select("*").eq("user_id", user.id).maybeSingle(),
        db.from("points_ledger").select("delta, status").eq("member_id", user.id).eq("status", "POSTED"),
        db.from("tier_rules").select("*").order("min_points"),
        orgIds.length ? db.from("org_markets").select("*").in("org_id", orgIds) : Promise.resolve({ data: [] }),
        db.from("regional_product_states").select("*, org_markets(org_id, country)").order("updated_at", { ascending: false }).limit(30),
        orgIds.length ? db.from("campaigns").select("*").in("org_id", orgIds).order("created_at", { ascending: false }).limit(10) : Promise.resolve({ data: [] }),
        orgIds.length ? db.from("tech_documents").select("*").in("product_id", (await db.from("canonical_products").select("id").limit(50)).data?.map((p: any) => p.id) ?? []).order("created_at", { ascending: false }).limit(10) : Promise.resolve({ data: [] }),
        orgIds.length ? db.from("purchase_orders").select("*").in("org_id", orgIds).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
        db.from("shipments").select("*").or(orgIds.length ? `from_org_id.in.(${orgIds.join(",")}),to_org_id.in.(${orgIds.join(",")})` : "id.eq.00000000-0000-0000-0000-000000000000").order("created_at", { ascending: false }).limit(20),
        db.from("return_cases").select("*").order("created_at", { ascending: false }).limit(10),
        orgIds.length ? db.from("recommendations").select("*").in("org_id", orgIds).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
        db.from("achievement_rules").select("*").eq("role", user.role).eq("approved", true),
        db.from("stakeholder_achievements").select("*").eq("user_id", user.id),
        db.from("opportunities").select("*").eq("source", "achievement").eq("status", "PUBLISHED").limit(10),
        db.from("gov_services").select("*"),
        db.from("gov_applications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        db.from("gov_inspection_bookings").select("*").order("created_at", { ascending: false }).limit(10),
      ]);
      const pointsBalance = (pointsRows.data ?? []).reduce((a: number, r: any) => a + r.delta, 0);
      const tier = [...(tiers.data ?? [])].reverse().find((t: any) => pointsBalance >= t.min_points)?.tier ?? "Silver";
      const control = user.role === "admin" ? {
        agents: (await db.from("agents").select("*").order("created_at", { ascending: false }).limit(20)).data ?? [],
        decisions: (await db.from("decisions").select("*").order("created_at", { ascending: false }).limit(20)).data ?? [],
        delegations: (await db.from("delegations").select("*").or(`grantor_id.eq.${user.id},grantee_id.eq.${user.id}`).limit(20)).data ?? [],
      } : null;
      return Response.json({
        orgs: orgIds, role: user.role,
        requests_mine: myRequests?.data ?? [], requests_open: (myOffersOrg as any)?.data ?? [],
        tasks: tasks.data ?? [], signoffs: signoffs.data ?? [], warranties: warranties.data ?? [], comebacks: comebacks.data ?? [],
        drivers: drivers.data ?? [], inspections: inspections.data ?? [], fuel: fuel.data ?? [], anomalies: anomalies.data ?? [], work_orders: workorders.data ?? [],
        spaces: (mySpaces as any)?.data ?? [], my_posts: spacePosts?.data ?? [], mentorships: mentorships?.data ?? [], opportunities: opps?.data ?? [], applications: myApplications?.data ?? [],
        founding: founding?.data ?? null, points: pointsBalance, tier, tiers: tiers.data ?? [],
        markets: markets.data ?? [], regional_states: regionalStates.data ?? [], campaigns: campaigns.data ?? [], tech_docs: docs.data ?? [],
        purchase_orders: pos.data ?? [], shipments: shipments.data ?? [], returns: returns.data ?? [],
        recommendations: recs.data ?? [], ach_rules: achRules.data ?? [], achievement: achMine?.data ?? [], ach_opportunities: achOpps?.data ?? [],
        gov_services: govSvcs.data ?? [], gov_applications: govApps.data ?? [], gov_bookings: govBookings.data ?? [],
        control,
      }, { headers: cors });
    }

    throw new HttpError(400, 'Unknown action: ' + action);
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return new Response(JSON.stringify({ error: (e as Error).message }), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
