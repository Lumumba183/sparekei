import { useState } from 'react';
import { useSession, useUser } from '@clerk/clerk-react';
import { getSupabase } from '@/lib/supabase';

// Built to capture the EXACT auth failure. Run while logged in AND while logged out.
export default function DebugAuthPage() {
  const { session, isLoaded: sessionLoaded } = useSession();
  const { user, isLoaded: userLoaded } = useUser();
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<any>(null);
  const BUILD_TAG = 'grantfix-rawfetch-v3';

  const run = async () => {
    setRunning(true);
    const r: any = { buildTag: BUILD_TAG, generatedAt: new Date().toISOString(), tests: {} };

    r.tests.browser = {
      cookieEnabled: typeof navigator !== 'undefined' ? navigator.cookieEnabled : 'n/a',
      url: window.location.href,
      userAgent: navigator.userAgent.slice(0, 120),
    };

    r.tests.clerk = {
      sessionLoaded,
      userLoaded,
      hasUser: !!user,
      userId: user?.id ?? null,
      email: user?.primaryEmailAddress?.emailAddress ?? null,
      hasSession: !!session,
      sessionId: session?.id ?? null,
      status: (session as any)?.status ?? null,
    };

    // Token acquisition
    let token: string | null = null;
    let tokenError: string | null = null;
    try {
      token = (await session?.getToken()) ?? null;
    } catch (e: any) {
      tokenError = String(e?.message || e);
    }
    r.tests.token = { obtained: !!token, length: token ? token.length : 0, error: tokenError };

    // Supabase with anon key only (no bearer)
    try {
      const resp = await fetch(
        `${(import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL)}/rest/v1/service_nodes?select=id&limit=1`,
        { headers: { apikey: (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string } }
      );
      r.tests.supabaseAnon = { status: resp.status, body: (await resp.text()).slice(0, 200) };
    } catch (e: any) {
      r.tests.supabaseAnon = { error: String(e?.message || e) };
    }

    // Supabase WITH Clerk token -> decisive test of third-party JWT validation
    if (token) {
      try {
        const resp = await fetch(
          `${(import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL)}/rest/v1/service_nodes?select=id&limit=1`,
          {
            headers: {
              apikey: (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string,
              Authorization: `Bearer ${token}`,
            },
          }
        );
        r.tests.supabaseWithClerkToken = { status: resp.status, body: (await resp.text()).slice(0, 300) };
      } catch (e: any) {
        r.tests.supabaseWithClerkToken = { error: String(e?.message || e) };
      }

      // Raw-fetch upsert: POST with merge resolution + on_conflict (same semantics as supabase-js upsert)
      try {
        const email = (user?.primaryEmailAddress?.emailAddress ?? 'unknown').toLowerCase();
        const resp = await fetch(
          (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL) +
            '/rest/v1/app_users?on_conflict=email',
          {
            method: 'POST',
            headers: {
              apikey: (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string,
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates,return=representation',
            },
            body: JSON.stringify({
              clerk_user_id: user?.id ?? 'unknown',
              email,
              full_name: 'Diagnostics Probe',
              role: 'owner',
            }),
          }
        );
        r.tests.upsertProbe = { status: resp.status, body: (await resp.text()).slice(0, 400) };
      } catch (e: any) {
        r.tests.upsertProbe = { exception: String(e?.message || e) };
      }
    } else {
      r.tests.supabaseWithClerkToken = { skipped: 'no token' };
      r.tests.upsertProbe = { skipped: 'no token' };
    }

    setReport(r);
    setRunning(false);
  };

  return (
    <div className="min-h-screen bg-ink-950 text-slate-200 p-8 font-mono text-sm">
      <h1 className="text-xl font-bold text-white mb-2">Sparekei Auth Diagnostics</h1>
      <p className="text-slate-400 mb-4">Run this while signed in. Screenshot the JSON below and send it.</p>
      <button
        onClick={run}
        disabled={running}
        className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50 mb-6"
      >
        {running ? 'Running…' : 'Run Diagnostics'}
      </button>
      {report && (
        <pre className="rounded-xl border border-white/10 bg-ink-900 p-5 overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(report, null, 2)}
        </pre>
      )}
    </div>
  );
}
