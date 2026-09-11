// Reads configuration using the names from the Vercel + Supabase + Clerk
// deployment guide (NEXT_PUBLIC_*) with VITE_* as fallback, so the same
// codebase works with either convention.
export function env(key: string): string {
  const meta = import.meta.env as Record<string, string | undefined>;
  return (meta[`VITE_${key}`] ?? meta[`NEXT_PUBLIC_${key}`] ?? '') as string;
}

export const CLERK_PUBLISHABLE_KEY = env('CLERK_PUBLISHABLE_KEY');
export const SUPABASE_URL = env('SUPABASE_URL');
export const SUPABASE_ANON_KEY = env('SUPABASE_ANON_KEY');
export const ADMIN_EMAIL = env('ADMIN_EMAIL') || 'mwandabrands@gmail.com';
