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


// Privileged query path (service key is non-JWT; PostGREST rejects it — management API is the sanctioned route)
const MREF = () => Deno.env.get('SUPABASE_URL')!.replace('https://', '').split('.')[0];
async function mquery(sql: string): Promise<any[]> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${MREF()}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('SB_ADMIN_TOKEN')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`mquery ${res.status}: ${JSON.stringify(j).slice(0, 150)}`);
  return Array.isArray(j) ? j : [];
}
const esc = (v: any) => `'${String(v ?? '').replace(/'/g, "''")}'`;

// ==================== AI BRAIN — WORLD-CLASS AGENT (admin) ====================
// Function-calling over whitelisted tables · visible reasoning trace · cost logging
const BRAIN_TABLES = ['app_users','organizations','organization_members','provider_capabilities','canonical_products','seller_offers','bookings','inventory_items','inventory_movements','payment_intents','subscriptions','entitlement_grants','funnel_events','audit_events','gov_cases','concierge_conversations','courses','enrollments','credentials','founding_members','community_posts','reviews','vehicles','passport_stamps','service_orders','rfq_requests','question_banks','exam_attempts','recommendations','agents','decisions','ai_costs'];
const brainRate = new Map<string, number[]>();


// DB-backed rate limiting (in-memory maps do not survive edge isolates)
async function rateGateDb(key: string, perMinute: number, perDay: number): Promise<boolean> {
  try {
    const kMin = esc(key) + '::min', kDay = esc(key) + '::day';
    const rows = await mquery(`select key, count, window_start from public.rate_counters where key in (${kMin}, ${kDay})`);
    const now = new Date();
    const get = (k: string) => (rows ?? []).find((r: any) => r.key === k);
    const minRow = get(key + '::min'), dayRow = get(key + '::day');
    const minFresh = minRow && (now.getTime() - new Date(minRow.window_start).getTime()) < 60_000;
    const dayFresh = dayRow && (now.getTime() - new Date(dayRow.window_start).getTime()) < 86_400_000;
    if ((minFresh && minRow.count >= perMinute) || (dayFresh && dayRow.count >= perDay)) return false;
    if (minFresh) await mquery(`update public.rate_counters set count = count + 1 where key = ${kMin}`);
    else await mquery(`insert into public.rate_counters (key, window_start, count) values (${kMin}, now(), 1) on conflict (key) do update set window_start = now(), count = 1`);
    if (dayFresh) await mquery(`update public.rate_counters set count = count + 1 where key = ${kDay}`);
    else await mquery(`insert into public.rate_counters (key, window_start, count) values (${kDay}, now(), 1) on conflict (key) do update set window_start = now(), count = 1`);
    return true;
  } catch (e) { console.error('rate gate:', (e as Error).message); return true; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'POST only');
    const rlKey = (req.headers.get('Authorization') ?? '').slice(-24) || 'anon';
    if (!(await rateGateDb(rlKey, 15, 300))) throw new HttpError(429, 'Rate limit — please wait a minute (15/min for the reasoning engine).');

    const admin = await requireAdmin(req);
    const body = await req.json();
    const question: string = (body.question ?? '').toString().slice(0, 3000);
    if (!question.trim()) throw new HttpError(400, 'question required');

    const TOOLS = [
      { type: 'function', function: { name: 'list_tables', description: 'List the data tables the Brain can query.', parameters: { type: 'object', properties: {} } } },
      { type: 'function', function: { name: 'query_table', description: 'Query one whitelisted table. filters are exact-match key/value pairs. Returns up to `limit` rows (max 25).', parameters: { type: 'object', properties: {
        table: { type: 'string', enum: BRAIN_TABLES }, select: { type: 'string', description: 'comma-separated columns, default *' },
        filters: { type: 'object', description: 'exact-match {column: value}' }, order_by: { type: 'string' }, order_desc: { type: 'boolean' },
        limit: { type: 'integer' }, count_only: { type: 'boolean' } }, required: ['table'] } } },
    ];
    async function runTool(name: string, args: any) {
      if (name === 'list_tables') return BRAIN_TABLES;
      if (name === 'query_table') {
        const tbl = String(args.table ?? '');
        if (!BRAIN_TABLES.includes(tbl)) return { error: `table '${tbl}' not whitelisted` };
        const cols = /^[a-zA-Z0-9_,\s()*]+$/.test(String(args.select ?? '*')) ? String(args.select ?? '*') : '*';
        let sql = `select ${cols === '*' ? '*' : cols} from public.${tbl}`;
        const filters = args.filters && typeof args.filters === 'object' ? args.filters : {};
        const conds = Object.entries(filters).filter(([k]) => /^[a-zA-Z0-9_]+$/.test(k)).map(([k, v]) => `${k} = ${esc(v)}`);
        if (conds.length) sql += ` where ${conds.join(' and ')}`;
        if (args.count_only) sql = `select count(*) as n from public.${tbl}${conds.length ? ` where ${conds.join(' and ')}` : ''}`;
        if (args.order_by && /^[a-zA-Z0-9_]+$/.test(String(args.order_by))) sql += ` order by ${args.order_by} ${args.order_desc ? 'desc' : 'asc'}`;
        sql += ` limit ${Math.min(25, Math.max(1, parseInt(args.limit) || 10))}`;
        const rows = await mquery(sql);
        return rows;
      }
      return { error: 'unknown tool' };
    }

    const system = `You are the Sparekei AI Brain, the administrator's reasoning engine over the LIVE platform database.
You answer by CALLING TOOLS — never from memory. Plan the minimal queries, inspect the returned rows, then answer with SPECIFIC numbers, names and dates drawn from the data.
RULES: cite table names in your answer; if data is absent, say "no records"; never fabricate; numeric confidence is forbidden — state limitations in words; your final line must be "Sources:" followed by the tables queried.`;

    const messages: any[] = [{ role: 'user', content: question }];
    const trace: any[] = [];
    let answer = '', tin = 0, tout = 0;
    for (let round = 0; round < 6; round++) {
      let res: any; let lastErr: any;
      for (let a = 0; a < 2; a++) {
        try { res = await openaiChat({ model: 'gpt-4.1', system, messages, tools: TOOLS, maxTokens: 2000 }); break; }
        catch (e) { lastErr = e; if (a === 0) await new Promise((r) => setTimeout(r, 1500)); }
      }
      if (!res) throw new HttpError(502, `The reasoning engine is temporarily unreachable — please retry shortly. (${(lastErr as Error)?.message?.slice(0, 80) ?? 'error'})`);
      tin += res.usage?.prompt_tokens ?? 0; tout += res.usage?.completion_tokens ?? 0;
      const msg = res.choices?.[0]?.message;
      if (msg?.tool_calls?.length) {
        for (const call of msg.tool_calls) {
          let args: any = {}; try { args = JSON.parse(call.function?.arguments ?? '{}'); } catch { args = {}; }
          const result = await runTool(call.function?.name ?? '', args);
          trace.push({ tool: call.function?.name, args, rows: Array.isArray(result) ? result.length : 0 });
          messages.push({ role: 'assistant', content: null, tool_calls: [call] });
          messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result).slice(0, 8000) });
        }
        continue;
      }
      answer = msg?.content ?? ''; break;
    }
    if (!answer) answer = 'I could not reach a conclusion with the available queries. Please refine the question.';
    try {
      await mquery(`insert into public.ai_costs (service, model, tokens_in, tokens_out, cost_usd, actor_id) values ('ai-brain', 'gpt-4.1', ${tin}, ${tout}, ${estimateCost('gpt-4.1', tin, tout)}, ${esc(admin.adminId)})`);
    } catch (e) { console.error('brain cost log:', (e as Error).message); }
    return Response.json({ answer, trace, tokens: { in: tin, out: tout }, provider: 'OpenAI GPT-4.1 via Sparekei AI Brain (agent mode)' }, { headers: cors });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return new Response(JSON.stringify({ error: (e as Error).message }), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
