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
    const started = Date.now();

    const [{ data: completed }, { data: delivered }, { data: reviews }, { data: nodes }] = await Promise.all([
      supabase.from('service_orders').select('status, total_amount, created_at, service_nodes(business_name)').eq('status', 'completed').order('created_at', { ascending: false }).limit(100),
      supabase.from('product_orders').select('status, total_amount, quantity, created_at').eq('status', 'completed').order('created_at', { ascending: false }).limit(100),
      supabase.from('reviews').select('rating, comment, created_at').order('created_at', { ascending: false }).limit(50),
      supabase.from('service_nodes').select('business_name, class, rating, reviews_count, distance_km'),
    ]);

    const facts = JSON.stringify({
      completed_service_orders: completed, delivered_product_orders: delivered,
      recent_reviews: reviews, service_nodes: nodes,
    }).slice(0, 10000);

    const completion = await openaiChat({
      model: 'gpt-4.1-mini',
      system: `You are the Sparekei Learning Engine. Given verified platform outcomes (completed orders, deliveries, reviews), propose generalizations that could improve the platform.
Rules: only use patterns actually visible in the data; each learning must cite which records support it; max 5 learnings; if data is too thin, return fewer or none.`,
      messages: [{ role: 'user', content: `Verified outcomes:\n${facts}\n\nPropose learnings as JSON.` }],
      responseFormat: {
        type: 'json_schema',
        json_schema: {
          name: 'learnings',
          schema: {
            type: 'object',
            properties: {
              learnings: {
                type: 'array', maxItems: 5,
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    body: { type: 'string' },
                    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
                    source_refs: { type: 'array', items: { type: 'object' } },
                  },
                  required: ['title', 'body', 'confidence', 'source_refs'],
                  additionalProperties: false,
                },
              },
            },
            required: ['learnings'],
            additionalProperties: false,
          },
        },
      },
    });

    const usage = completion.usage ?? { prompt_tokens: 0, completion_tokens: 0 };
    const parsed = JSON.parse(completion.choices[0].message.content);
    const inserted = [];
    for (const l of parsed.learnings ?? []) {
      const { data } = await supabase.from('ai_learnings').insert({
        title: l.title, body: l.body, confidence: l.confidence,
        source_refs: l.source_refs, status: 'pending', proposed_by: 'engine',
      }).select('id, title').single();
      if (data) inserted.push(data);
    }
    return Response.json({
      proposed: inserted.length, learnings: inserted,
      tokens: usage, latency_ms: Date.now() - started,
      cost_usd: estimateCost('gpt-4.1-mini', usage.prompt_tokens, usage.completion_tokens),
    }, { headers: cors });
  } catch (e: any) {
    const status = e instanceof HttpError ? e.status : 500;
    return Response.json({ error: e.message ?? 'Internal error' }, { status, headers: cors });
  }
});
