import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env';

// Single browser client. When a Clerk session exists, pass its JWT so
// Postgres RLS resolves the caller (Supabase > Auth > JWT Issuer = Clerk).
export function getSupabase(clerkToken?: string | null) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: clerkToken ? { headers: { Authorization: `Bearer ${clerkToken}` } } : undefined,
    auth: { persistSession: false },
  });
}
