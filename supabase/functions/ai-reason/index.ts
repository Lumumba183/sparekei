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

// SPAREKEI REASONING CONSOLE — tool-use loop over read-only, allowlisted
// Supabase queries. The LLM interprets verified data; it cannot invent it.

const ALLOWED_TABLES = [
  'vehicles', 'service_nodes', 'service_items', 'service_orders',
  'marketplace_listings', 'product_orders', 'reviews', 'app_users',
  'passport_stamps', 'ai_alerts', 'ai_learnings',
] as const;

const SYSTEM = `You are the Sparekei AI Reasoning Engine, operating over a verified automotive platform database.
STRICT RULES:
1. Every factual claim MUST come from a tool result. Never invent numbers, names, dates or prices.
2. After your tools give you data, answer concisely (max 250 words) and end with a "Sources:" list naming each table you queried.
3. If the tools return no data, say the platform has no data on that yet. Do not speculate.
4. You may only call the provided tools. You cannot write to the database.`;

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'query_table',
      description: 'Read rows from an allowlisted platform table. All reads are deterministic and logged.',
      parameters: {
        type: 'object',
        properties: {
          table: { type: 'string', enum: [...ALLOWED_TABLES] },
          select: { type: 'string', description: 'Column list, default *' },
          eq: { type: 'object', description: 'Optional equality filters {column: value}' },
          limit: { type: 'number', default: 25 },
        },
        required: ['table'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_knowledge',
      description: 'Semantic search over the admin-curated knowledge base (playbooks, market reports).',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { question } = await req.json();
    if (!question || typeof question !== 'string') throw new HttpError(400, 'question is required');

    const { supabase, adminId, clerkToken } = await requireAdmin(req);
    const started = Date.now();

    const { data: conv } = await supabase.from('ai_conversations')
      .insert({ admin_id: adminId, question, answer: '(thinking)' }).select('id').single();

    const messages: { role: string; content: string; tool_calls?: unknown[]; tool_call_id?: string; name?: string }[] = [
      { role: 'user', content: question },
    ];
    const citations: { table: string; description: string; rows: number }[] = [];
    const runs: { tool_name: string; tool_args: any; result_summary: string; row_count: number; latency_ms: number }[] = [];
    let usage = { prompt_tokens: 0, completion_tokens: 0 };
    let model = 'gpt-4.1';

    for (let i = 0; i < 6; i++) {
      const t0 = Date.now();
      const completion = await openaiChat({ model, system: SYSTEM, messages, tools: TOOLS });
      usage = completion.usage ?? usage;
      const choice = completion.choices[0];
      const msg = choice.message;

      if (msg.tool_calls?.length) {
        messages.push({ role: 'assistant', content: msg.content ?? '', tool_calls: msg.tool_calls });
        for (const call of msg.tool_calls) {
          const fn = call.function;
          let resultText = '';
          let rowCount = 0;
          try {
            const args = JSON.parse(fn.arguments);
            if (fn.name === 'query_table') {
              const lim = Math.min(Number(args.limit) || 25, 100);
              let q = supabase.from(args.table).select(args.select ?? '*').limit(lim);
              if (args.eq && typeof args.eq === 'object') {
                for (const [k, v] of Object.entries(args.eq)) q = q.eq(k, v as any);
              }
              const { data, error } = await q;
              if (error) throw new Error(error.message);
              rowCount = data?.length ?? 0;
              resultText = JSON.stringify(data ?? []).slice(0, 6000);
              citations.push({ table: args.table, description: `query_table(${args.table})`, rows: rowCount });
            } else if (fn.name === 'search_knowledge') {
              const emb = await openaiEmbed(args.query);
              const { data, error } = await supabase.rpc('match_knowledge', {
                query_embedding: emb, match_count: 5,
              });
              if (error) throw new Error(error.message);
              rowCount = data?.length ?? 0;
              resultText = JSON.stringify(data ?? []).slice(0, 4000);
            }
          } catch (e: any) {
            resultText = `Tool error: ${e.message}`;
          }
          runs.push({
            tool_name: fn.name, tool_args: JSON.parse(fn.arguments),
            result_summary: resultText.slice(0, 500), row_count: rowCount,
            latency_ms: Date.now() - t0,
          });
          messages.push({ role: 'tool', tool_call_id: call.id, name: fn.name, content: resultText });
        }
        continue;
      }

      // Final answer
      const answer: string = msg.content ?? 'No answer produced.';
      const latency = Date.now() - started;
      await supabase.from('ai_conversations').update({
        answer, citations, model,
        tokens_in: usage.prompt_tokens, tokens_out: usage.completion_tokens,
        cost_usd: estimateCost(model, usage.prompt_tokens, usage.completion_tokens),
        latency_ms: latency,
      }).eq('id', conv!.id);
      for (const r of runs) {
        await supabase.from('ai_tool_runs').insert({ conversation_id: conv!.id, ...r });
      }
      return Response.json({ answer, citations, conversation_id: conv!.id, tokens: usage, latency_ms: latency }, { headers: cors });
    }
    throw new HttpError(408, 'Reasoning loop exceeded 6 iterations.');
  } catch (e: any) {
    const status = e instanceof HttpError ? e.status : 500;
    return Response.json({ error: e.message ?? 'Internal error' }, { status, headers: cors });
  }
});
