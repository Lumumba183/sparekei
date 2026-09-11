// SPAREKEI REASONING CONSOLE — tool-use loop over read-only, allowlisted
// Supabase queries. The LLM interprets verified data; it cannot invent it.
import { cors, requireAdmin, openaiChat, openaiEmbed, estimateCost, HttpError } from '../_shared/ai.ts';

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
