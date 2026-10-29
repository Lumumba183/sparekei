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
    const { supabase } = await requireAdmin(req);
    const alerts: { alert_type: string; severity: string; title: string; message: string; source_refs: any[] }[] = [];
    const now = Date.now();

    // 1. Maintenance due: vehicle with no passport stamp in > 180 days
    const { data: staleVehicles } = await supabase.from('vehicles')
      .select('id, make, model, registration, mileage_km, owner:app_users!vehicles_owner_id_fkey(full_name)').eq('is_active', true).limit(200);
    const { data: recentStamps } = await supabase.from('passport_stamps')
      .select('vehicle_id, stamped_at').gte('stamped_at', new Date(now - 180 * 864e5).toISOString());
    const stamped = new Set((recentStamps ?? []).map((s: any) => s.vehicle_id));
    for (const v of staleVehicles ?? []) {
      if (!stamped.has(v.id)) {
        alerts.push({
          alert_type: 'maintenance_due', severity: 'warning',
          title: `${v.make} ${v.model} (${v.registration ?? 'no plate'}) may be due for service`,
          message: `No verified service stamp in the last 180 days. Owner: ${(v as any).owner?.full_name ?? 'unknown'}. Mileage: ${v.mileage_km.toLocaleString()} km.`,
          source_refs: [{ table: 'vehicles', id: v.id }],
        });
      }
    }

    // 2. Stockout risk: listings below 10 units
    const { data: lowStock } = await supabase.from('marketplace_listings')
      .select('id, part_sku, part_name, stock_level').lt('stock_level', 10);
    for (const l of lowStock ?? []) {
      alerts.push({
        alert_type: 'stockout_risk', severity: 'info',
        title: `Low stock: ${l.part_name} (${l.part_sku})`,
        message: `Only ${l.stock_level} units remain. Consider restocking or raising price.`,
        source_refs: [{ table: 'marketplace_listings', id: l.id }],
      });
    }

    // 3. Rating decay: nodes below 4.2
    const { data: weakNodes } = await supabase.from('service_nodes')
      .select('id, business_name, rating, reviews_count').lt('rating', 4.2);
    for (const n of weakNodes ?? []) {
      alerts.push({
        alert_type: 'rating_decay', severity: 'warning',
        title: `${n.business_name} rating is ${n.rating} (${n.reviews_count} reviews)`,
        message: 'Below the 4.2 quality threshold. Consider a quality audit or support.',
        source_refs: [{ table: 'service_nodes', id: n.id }],
      });
    }

    // 4. Demand spike: >=3 orders in 7 days on one node
    const { data: hotNodes } = await supabase.from('service_orders')
      .select('node_id, service_nodes(business_name)')
      .gte('created_at', new Date(now - 7 * 864e5).toISOString());
    const counts = new Map<string, number>();
    for (const o of hotNodes ?? []) counts.set(o.node_id, (counts.get(o.node_id) ?? 0) + 1);
    for (const [nodeId, count] of counts) {
      if (count >= 3) {
        const name = (hotNodes ?? []).find((o: any) => o.node_id === nodeId)?.service_nodes?.business_name ?? nodeId;
        alerts.push({
          alert_type: 'demand_spike', severity: 'info',
          title: `Demand spike at ${name}: ${count} orders in 7 days`,
          message: 'Consider promoting this node or guaranteeing bay availability.',
          source_refs: [{ table: 'service_orders', node_id: nodeId }],
        });
      }
    }

    // De-dupe against pending alerts, then insert
    const { data: pending } = await supabase.from('ai_alerts').select('alert_type, title').eq('status', 'pending');
    const existing = new Set((pending ?? []).map((a: any) => `${a.alert_type}:${a.title}`));
    const fresh = alerts.filter(a => !existing.has(`${a.alert_type}:${a.title}`));
    if (fresh.length) await supabase.from('ai_alerts').insert(fresh);

    return Response.json({ scanned: alerts.length, inserted: fresh.length, skipped_duplicates: alerts.length - fresh.length }, { headers: cors });
  } catch (e: any) {
    const status = e instanceof HttpError ? e.status : 500;
    return Response.json({ error: e.message ?? 'Internal error' }, { status, headers: cors });
  }
});
