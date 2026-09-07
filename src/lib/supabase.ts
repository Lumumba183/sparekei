import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Single browser client. When a Clerk session exists, pass its JWT so
// Postgres RLS resolves the caller (Supabase > Auth > JWT Issuer = Clerk).
export function getSupabase(clerkToken?: string | null) {
  return createClient(url, anon, {
    global: clerkToken ? { headers: { Authorization: `Bearer ${clerkToken}` } } : undefined,
    auth: { persistSession: false },
  });
}
