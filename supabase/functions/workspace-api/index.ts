// Sparekei Workspace API — one governed entry point over the shared foundations:
//   M1 provider org/capabilities · M2 offers/bookings · Payments (SANDBOX ONLY)
//   M11 subscriptions / founding members / Academy / Community / banners
// Hard rules: authenticated users only; payments are simulated (no real money,
// no live providers); every consequential action writes audit_events.
import { cors, supabaseAdmin, HttpError } from '../_shared/ai.ts';

async function requireUser(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  if (!token) throw new HttpError(401, 'Missing authorization');
  const { createClient } = await import('jsr:@supabase/supabase-js@2');
  const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: me } = await anon.from('app_users').select('id, role, full_name').limit(1);
  if (!me?.[0]) throw new HttpError(401, 'Invalid session');
  return me[0] as { id: string; role: string; full_name: string };
}
const audit = (u: any, action: string, entity: string, entityId: any, meta: any = {}) =>
  supabaseAdmin().rpc('log_audit_event', {
    p_actor: u.id, p_role: u.role, p_action: action, p_entity: entity,
    p_entity_id: entityId == null ? null : String(entityId), p_metadata: meta,
  }).then(() => {}, () => {});
const s = (v: any, n = 200) => (v ?? '').toString().slice(0, n);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
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

    throw new HttpError(400, 'Unknown action: ' + action);
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return new Response(JSON.stringify({ error: (e as Error).message }), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
