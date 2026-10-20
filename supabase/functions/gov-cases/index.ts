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

// Sparekei Government & Compliance Cases — LOCALLY TESTABLE case management.
// Per the Government Services spec: synthetic/test lane only. No government auth,
// no official records exchange, no statutory submissions. is_test is forced TRUE.
// Evidence classes stay distinct: owner_declared | submitted | technician_check |
// authority_verified (never auto-granted) | synthetic.
// "READY_FOR_PRESENTATION" is assistance readiness — NEVER an official inspection pass.

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['OPEN', 'CLOSED'],
  OPEN: ['EVIDENCE_REVIEW', 'CLOSED'],
  EVIDENCE_REVIEW: ['READY_FOR_PRESENTATION', 'OPEN', 'CLOSED'],
  READY_FOR_PRESENTATION: ['PRESENTED', 'EVIDENCE_REVIEW'],
  PRESENTED: ['CLOSED'],
  CLOSED: [],
};


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const user = await requireUser(req);
    const admin = supabaseAdmin();
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // LIST templates / cases
    if (req.method === 'GET' && action === 'templates') {
      const { data, error } = await admin.from('gov_readiness_templates').select('*').eq('active', true).order('jurisdiction').order('case_type');
      if (error) throw new HttpError(500, error.message);
      return Response.json({ templates: data ?? [], test_only: true }, { headers: cors });
    }
    if (req.method === 'GET' && action === 'list') {
      const { data, error } = await admin.from('gov_cases')
        .select('id, case_number, case_type, jurisdiction, status, vehicle_id, is_test, updated_at, vehicles(make, model, registration)')
        .eq('is_test', true).order('updated_at', { ascending: false }).limit(200);
      if (error) throw new HttpError(500, error.message);
      return Response.json({ cases: data ?? [], test_only: true }, { headers: cors });
    }
    if (req.method === 'GET' && action === 'detail') {
      const id = url.searchParams.get('id');
      if (!id) throw new HttpError(400, 'Missing id');
      const { data: c, error } = await admin.from('gov_cases').select('*').eq('id', id).single();
      if (error || !c) throw new HttpError(404, 'Case not found');
      const [{ data: tasks }, { data: evidence }, { data: vh }] = await Promise.all([
        admin.from('gov_case_tasks').select('*').eq('case_id', id).order('sort_order'),
        admin.from('gov_case_evidence').select('*').eq('case_id', id).order('created_at'),
        admin.from('vehicles').select('id, make, model, year, registration').eq('owner_id', user.id),
      ]);
      // Vehicle-history review context: passport stamps + service orders for this vehicle
      let history: any[] = [];
      if (c.vehicle_id) {
        const [{ data: stamps }, { data: orders }] = await Promise.all([
          admin.from('passport_stamps').select('id, stamp_type, title, description, mileage_km, verified, stamped_at').eq('vehicle_id', c.vehicle_id).order('stamped_at', { ascending: false }).limit(50),
          admin.from('service_orders').select('id, status, total_amount, created_at, completed_at').eq('vehicle_id', c.vehicle_id).order('created_at', { ascending: false }).limit(50),
        ]);
        history = [
          ...(stamps ?? []).map((s: any) => ({ kind: 'passport', at: s.stamped_at, summary: s.title ?? s.stamp_type ?? 'record', verified: s.verified })),
          ...(orders ?? []).map((o: any) => ({ kind: 'service', at: o.created_at, summary: `Service order — ${o.status}` })),
        ].sort((a, b) => (a.at < b.at ? 1 : -1));
      }
      return Response.json({ case: c, tasks: tasks ?? [], evidence: evidence ?? [], vehicles: vh ?? [], vehicle_history: history, test_only: true }, { headers: cors });
    }

    // CREATE case (always is_test=true; instantiates checklist tasks from template)
    if (req.method === 'POST' && action === 'create') {
      const body = await req.json();
      const caseType: string = (body.case_type ?? '').toString();
      const jurisdiction: string = (body.jurisdiction ?? 'KE').toString().slice(0, 8).toUpperCase();
      if (!caseType) throw new HttpError(400, 'case_type required');
      const { data: tpl } = await admin.from('gov_readiness_templates')
        .select('*').eq('jurisdiction', jurisdiction).eq('case_type', caseType).eq('active', true)
        .order('version', { ascending: false }).limit(1).maybeSingle();
      const items: { key: string; label: string; assignee_role: string }[] = tpl?.items ?? [];
      const seq = Math.floor(Date.now() % 1000000);
      const { data: created, error } = await admin.from('gov_cases').insert({
        case_number: `TEST-${jurisdiction}-${caseType.slice(0, 12).toUpperCase()}-${seq}`,
        case_type: caseType, jurisdiction, vehicle_id: body.vehicle_id ?? null,
        status: 'DRAFT', checklist_version: tpl?.version ?? null,
        is_test: true, owner_id: user.id,
      }).select('*').single();
      if (error) throw new HttpError(500, error.message);
      if (items.length) {
        await admin.from('gov_case_tasks').insert(items.map((it, i) => ({
          case_id: created.id, title: it.label, assignee_role: it.assignee_role ?? 'owner', sort_order: i, status: 'PENDING',
        })));
      }
      await admin.rpc('log_audit_event', {
        p_actor: user.id, p_role: user.role, p_action: 'gov.case.create',
        p_entity: 'gov_cases', p_entity_id: created.id,
        p_metadata: { case_number: created.case_number, is_test: true },
      }).then(()=>{}, ()=>{});
      return Response.json({ case: created, tasks_created: items.length, test_only: true }, { headers: cors });
    }

    // UPDATE task status
    if (req.method === 'POST' && action === 'task') {
      const body = await req.json();
      const allowed = ['PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'NA'];
      if (!body.task_id || !allowed.includes(body.status)) throw new HttpError(400, 'task_id + valid status required');
      const { error } = await admin.from('gov_case_tasks')
        .update({ status: body.status, note: (body.note ?? '').toString().slice(0, 500), updated_at: new Date().toISOString() })
        .eq('id', body.task_id);
      if (error) throw new HttpError(500, error.message);
      await admin.from('gov_cases').update({ updated_at: new Date().toISOString() }).eq('id', body.case_id);
      return Response.json({ ok: true }, { headers: cors });
    }

    // ADD evidence — class is explicit; authority_verified records WHO verified
    if (req.method === 'POST' && action === 'evidence') {
      const body = await req.json();
      const classes = ['owner_declared', 'submitted', 'technician_check', 'authority_verified', 'synthetic'];
      if (!body.case_id || !classes.includes(body.evidence_class) || !body.label)
        throw new HttpError(400, 'case_id + evidence_class + label required');
      const insert: Record<string, unknown> = {
        case_id: body.case_id, task_id: body.task_id ?? null,
        evidence_class: body.evidence_class, document_type: (body.document_type ?? 'document').toString().slice(0, 60),
        label: (body.label ?? '').toString().slice(0, 200), note: (body.note ?? '').toString().slice(0, 500),
        verified_by: body.evidence_class === 'authority_verified' ? user.id : null,
      };
      const { data: ev, error } = await admin.from('gov_case_evidence').insert(insert).select('*').single();
      if (error) throw new HttpError(500, error.message);
      await admin.rpc('log_audit_event', {
        p_actor: user.id, p_role: user.role, p_action: 'gov.evidence.add',
        p_entity: 'gov_case_evidence', p_entity_id: ev.id,
        p_metadata: { case_id: body.case_id, evidence_class: body.evidence_class },
      }).then(()=>{}, ()=>{});
      return Response.json({ evidence: ev }, { headers: cors });
    }

    // TRANSITION case state (auditable; outcome_label forced honest)
    if (req.method === 'POST' && action === 'transition') {
      const body = await req.json();
      const { data: c } = await admin.from('gov_cases').select('id, status').eq('id', body.case_id).single();
      if (!c) throw new HttpError(404, 'Case not found');
      const next = (body.to ?? '').toString();
      if (!(ALLOWED_TRANSITIONS[c.status] ?? []).includes(next)) throw new HttpError(409, `Cannot move ${c.status} → ${next}`);
      const outcomeLabel = next === 'READY_FOR_PRESENTATION'
        ? 'READY FOR PRESENTATION (assistance readiness — NOT an official inspection pass)'
        : next === 'PRESENTED' ? 'PRESENTED to owner (unofficial, synthetic/test case)' : null;
      const { error } = await admin.from('gov_cases')
        .update({ status: next, outcome_label: outcomeLabel, updated_at: new Date().toISOString() })
        .eq('id', body.case_id);
      if (error) throw new HttpError(500, error.message);
      await admin.rpc('log_audit_event', {
        p_actor: user.id, p_role: user.role, p_action: 'gov.case.transition',
        p_entity: 'gov_cases', p_entity_id: body.case_id, p_metadata: { from: c.status, to: next },
      }).then(()=>{}, ()=>{});
      return Response.json({ ok: true, status: next, outcome_label: outcomeLabel }, { headers: cors });
    }

    throw new HttpError(400, 'Unknown action');
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return new Response(JSON.stringify({ error: (e as Error).message }), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
