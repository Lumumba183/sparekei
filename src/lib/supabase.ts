import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env';

// Single browser client. The Clerk token is injected via a wrapped fetch —
// supabase-js can drop global headers, so we enforce Authorization per-request.
export function getSupabase(clerkToken?: string | null) {
  const extra: Record<string, string> = {};
  if (clerkToken) extra['Authorization'] = `Bearer ${clerkToken}`;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { ...extra },
      fetch: ((input: RequestInfo | URL, init: RequestInit = {}) => {
        const h = new Headers(init.headers);
        for (const [k, v] of Object.entries(extra)) h.set(k, v);
        return fetch(input, { ...init, headers: h });
      }) as typeof fetch,
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
