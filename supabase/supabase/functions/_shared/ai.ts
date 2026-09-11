import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function supabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );
}

// Reject any caller who is not a platform admin (Clerk JWT -> app_users.role).
export async function requireAdmin(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  if (!token) throw new HttpError(401, 'Missing authorization');
  const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data } = await anon.from('app_users').select('id, role').eq('role', 'admin').limit(1);
  const me = data?.[0];
  if (!me) throw new HttpError(403, 'Admin role required');
  return { supabase: supabaseAdmin(), adminId: me.id, clerkToken: token };
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function openaiChat(opts: {
  model?: string; system: string; messages?: { role: string; content: string }[];
  tools?: unknown[]; toolChoice?: string; responseFormat?: unknown; maxTokens?: number;
}) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new HttpError(503, 'AI engine not configured yet: add OPENAI_API_KEY to Supabase Edge Function secrets.');
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

export async function openaiEmbed(text: string): Promise<number[]> {
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

export function estimateCost(model: string, tin: number, tout: number): number {
  if (model.startsWith('gpt-4.1')) return (tin * 2 + tout * 8) / 1e6;
  if (model.startsWith('o4')) return (tin * 1.1 + tout * 4.4) / 1e6;
  if (model.startsWith('gpt-4o-mini')) return (tin * 0.15 + tout * 0.6) / 1e6;
  return 0;
}
