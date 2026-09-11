// SPAREKEI LEARNING ENGINE — mines VERIFIED OUTCOMES (completed service orders,
// delivered product orders, reviews) and proposes generalizations.
// Proposals land in ai_learnings as 'pending' — a human must approve.
import { cors, requireAdmin, openaiChat, estimateCost, HttpError } from '../_shared/ai.ts';

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
