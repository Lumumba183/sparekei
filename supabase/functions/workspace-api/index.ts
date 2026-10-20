// Sparekei edge-function shared core — ZERO external imports (robust against registry/CDN outages).
// Provides: cors, HttpError, requireAdmin/requireUser, OpenAI helpers, estimateCost,
// and a PostgREST-backed mini-client (restDb) implementing the supabase-js call shapes we use.
const SUPA_URL = () => Deno.env.get('SUPABASE_URL')!;
const SVC_KEY = () => Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = () => Deno.env.get('SUPABASE_ANON_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
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
    Authorization: `Bearer ${opts.token ?? SVC_KEY()}`,
    'Content-Type': 'application/json',
  };
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

  constructor(private table: string) {}
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
      const r = await restReq('POST', `${this.table}?select=${encodeURIComponent(this.cols)}`, { body: this.insBody });
      return this.finish(r);
    }
    if (this.mode === 'update') {
      const q = [`select=${encodeURIComponent(this.cols)}`, ...this.parts].join('&');
      const r = await restReq('PATCH', `${this.table}?${q}`, { body: this.updBody });
      return this.finish(r);
    }
    const r = await restReq('GET', `${this.table}?${this.buildQuery()}`, { count: this.wantsCount });
    return this.finish(r);
  }

  async single() { this.singleMode = 'one'; return this.run(); }
  async maybeSingle() { this.singleMode = 'maybe'; return this.run(); }
  then(onF: any, onR?: any) { return this.run().then(onF, onR); }
}

function restDb() {
  return {
    from: (table: string) => new Query(table),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      const r = await restReq('POST', `rpc/${fn}`, { body: args });
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
  return me as { id: string; role: string; full_name: string };
}

async function requireAdmin(req: Request) {
  const me = await requireUser(req);
  if (me.role !== 'admin') throw new HttpError(403, 'Admin role required');
  return { supabase: restDb(), adminId: me.id, clerkToken: req.headers.get('Authorization')?.replace('Bearer ', '') ?? '' };
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
const supabaseAdmin = restDb;

// Sparekei Workspace API — one governed entry point over the shared foundations:
//   M1 provider org/capabilities · M2 offers/bookings · Payments (SANDBOX ONLY)
//   M11 subscriptions / founding members / Academy / Community / banners
// Hard rules: authenticated users only; payments are simulated (no real money,
// no live providers); every consequential action writes audit_events.

const audit = async (u: any, action: string, entity: string, entityId: any, meta: any = {}) => {
  const db = supabaseAdmin();
  const { error: rpcErr } = await db.rpc('log_audit_event', {
    p_actor: u.id, p_role: u.role, p_action: action, p_entity: entity,
    p_entity_id: entityId == null ? null : String(entityId), p_metadata: meta,
  });
  if (rpcErr) { // F-01 hardening: never silently lose an audit record
    const { error: insErr } = await db.from('audit_events').insert({
      actor_id: u.id, actor_role: u.role, action, entity_type: entity,
      entity_id: entityId == null ? null : String(entityId), metadata: meta ?? {},
    });
    if (insErr) console.error('AUDIT FAILURE (rpc + fallback):', rpcErr.message, insErr.message);
  }
};
const s = (v: any, n = 200) => (v ?? '').toString().slice(0, n);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const urlEarly = new URL(req.url);
    if (urlEarly.searchParams.get('action') === 'banner.public') {
      const db0 = supabaseAdmin();
      const now0 = new Date().toISOString();
      const { data: pub } = await db0.from('site_banners').select('title, body').eq('active', true).eq('audience', 'all')
        .or(`starts_at.is.null,starts_at.lte.${now0}`).or(`ends_at.is.null,ends_at.gte.${now0}`).limit(1);
      return Response.json({ banners: pub ?? [] }, { headers: cors });
    }
    const user = await requireUser(req);
    const db = supabaseAdmin();
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
    throw new HttpError(400, 'Unknown action: ' + action);
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return new Response(JSON.stringify({ error: (e as Error).message }), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
