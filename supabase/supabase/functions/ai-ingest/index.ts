// Knowledge-base ingestion: embeds an admin-supplied document via OpenAI and
// stores it in knowledge_documents for semantic retrieval by ai-reason.
import { cors, requireAdmin, openaiEmbed, HttpError } from '../_shared/ai.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { title, content, source } = await req.json();
    if (!title || !content) throw new HttpError(400, 'title and content are required');
    const { supabase, adminId } = await requireAdmin(req);
    const embedding = await openaiEmbed(`${title}\n\n${content}`);
    const { data, error } = await supabase.from('knowledge_documents').insert({
      title: String(title).slice(0, 300),
      content: String(content).slice(0, 50000),
      embedding,
      source: source ? String(source).slice(0, 100) : 'admin',
      metadata: { ingested_by: adminId },
    }).select('id, title').single();
    if (error) throw new HttpError(500, error.message);
    return Response.json({ ingested: data }, { headers: cors });
  } catch (e: any) {
    const status = e instanceof HttpError ? e.status : 500;
    return Response.json({ error: e.message ?? 'Internal error' }, { status, headers: cors });
  }
});
