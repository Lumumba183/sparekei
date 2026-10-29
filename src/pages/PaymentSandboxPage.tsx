import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@clerk/clerk-react';
import { CreditCard, FlaskConical, Zap, Webhook } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getSupabase } from '@/lib/supabase';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/env';
import { cn } from '@/lib/utils';

const PAY_STATE: Record<string, string> = {
  CREATED: 'bg-slate-100 text-slate-700', SUBMITTED: 'bg-amber-100 text-amber-800',
  SUCCEEDED: 'bg-emerald-100 text-emerald-800', FAILED: 'bg-rose-100 text-rose-800', REFUNDED: 'bg-muted text-muted-foreground',
};

export default function PaymentSandboxPage() {
  const { session } = useSession();
  const [providers, setProviders] = useState<any[]>([]);
  const [intents, setIntents] = useState<any[]>([]);
  const [amount, setAmount] = useState('1500');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fnUrl = (a: string) => `${SUPABASE_URL}/functions/v1/workspace-api?action=${a}`;
  const headers = async () => {
    const t = (await session?.getToken({ template: 'supabase' })) ?? null;
    return { Authorization: `Bearer ${t}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
  };
  const load = useCallback(async () => {
    try {
      const h = await headers() as any;
      const [p] = await Promise.all([fetch(fnUrl('pay.providers'), { headers: h }).then(r => r.json())]);
      setProviders(p.providers ?? []);
      const t = (await session?.getToken({ template: 'supabase' })) ?? null;
      const { data: mine } = await getSupabase(t).from('payment_intents').select('*').order('created_at', { ascending: false }).limit(25);
      setIntents(mine ?? []);
    } catch (e: any) { setError(e.message); }
  }, [session]);
  useEffect(() => { load(); }, [load]);

  const post = async (action: string, body: any) => {
    const r = await fetch(fnUrl(action), { method: 'POST', headers: await headers() as any, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) { setError(j.error); return null; }
    setError(null); await load(); return j;
  };

  const createIntent = () => post('pay.intent.create', {
    amount: Number(amount), note,
    idempotency_key: `ui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  });
  const simulate = (id: string, outcome: 'ok' | 'fail') => post('pay.intent.simulate', { intent_id: id, outcome });
  const fireWebhook = (i: any) => post('pay.webhook.simulate', {
    provider_code: i.provider_code, payload: { reference: i.reference, amount: i.amount, currency: i.currency },
  });

  return (
    <div className="container py-6 space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><CreditCard className="h-5 w-5 text-primary" /></div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Payment Sandbox</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <FlaskConical className="h-3 w-3" /> Provider-agnostic orchestration test lane — simulated money only.
            Live processing activates only after provider contracts and approvals.
          </p>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}

      <Card className="p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">ENABLED PROVIDERS (region/currency routing ready)</p>
        {providers.map(p => (
          <div key={p.code} className="flex items-center gap-2 text-sm flex-wrap">
            <Badge className="text-[10px] bg-emerald-100 text-emerald-800">enabled · sandbox</Badge>
            <span className="font-medium">{p.name}</span>
            <span className="text-xs text-muted-foreground">{(p.regions ?? []).join(', ')} · {(p.currencies ?? []).join(', ')} · methods: {(p.methods ?? []).join(', ')}</span>
          </div>
        ))}
      </Card>

      <Card className="p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">CREATE TEST PAYMENT INTENT (idempotency-key protected)</p>
        <div className="flex gap-2 flex-wrap items-end">
          <div><label className="text-[11px] text-muted-foreground">Amount (KES)</label>
            <Input value={amount} onChange={e => setAmount(e.target.value)} className="h-8 text-xs w-28 mt-0.5" /></div>
          <div className="flex-1 min-w-[160px]"><label className="text-[11px] text-muted-foreground">Note</label>
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder="What is this test payment for?" className="h-8 text-xs mt-0.5" /></div>
          <Button size="sm" className="h-8" onClick={createIntent}><Zap className="h-3.5 w-3.5 mr-1" /> Create intent</Button>
        </div>
      </Card>

      <Card className="p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">INTENTS</p>
        {intents.length === 0 && <p className="text-xs text-muted-foreground">No intents yet.</p>}
        {intents.map(i => (
          <div key={i.id} className="flex items-center gap-2 text-sm border-b pb-2 last:border-0 flex-wrap">
            <Badge className={cn('text-[10px]', PAY_STATE[i.state] ?? 'bg-muted')}>{i.state}</Badge>
            <span className="font-medium">{i.amount} {i.currency}</span>
            <span className="text-[10px] text-muted-foreground font-mono">key:{(i.idempotency_key ?? '').slice(-12)} ref:{i.reference ?? '—'}</span>
            <span className="flex-1" />
            {['CREATED', 'SUBMITTED', 'FAILED'].includes(i.state) && (
              <>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => simulate(i.id, 'ok')}>Simulate success</Button>
                <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => simulate(i.id, 'fail')}>Fail</Button>
              </>
            )}
            {i.reference && i.state !== 'SUCCEEDED' && (
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => fireWebhook(i)}>
                <Webhook className="h-3 w-3 mr-1" /> Fire webhook
              </Button>
            )}
          </div>
        ))}
      </Card>
      <p className="text-[10px] text-muted-foreground">
        Architecture: replaceable provider adapters · region/currency/method eligibility · priority routing with fallback ·
        idempotency keys at the boundary · HMAC-signed webhook ingestion · duplicate delivery protection · full audit trail.
        Every provider here is a sandbox adapter — no live money moves.
      </p>
    </div>
  );
}
