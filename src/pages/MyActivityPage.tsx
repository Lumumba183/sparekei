import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { Activity, CalendarClock, CreditCard, Star, Bell, Stamp, Siren, Wrench, ArrowLeft, Bot } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getSupabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const BK: Record<string, string> = {
  REQUESTED: 'bg-blue-100 text-blue-800', QUOTED: 'bg-amber-100 text-amber-800', ACCEPTED: 'bg-violet-100 text-violet-800',
  IN_SERVICE: 'bg-indigo-100 text-indigo-800', QUALITY_CHECK: 'bg-amber-100 text-amber-800', COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-muted text-muted-foreground', DISPUTED: 'bg-rose-100 text-rose-800',
};
const PAY: Record<string, string> = {
  CREATED: 'bg-slate-100 text-slate-700', SUBMITTED: 'bg-amber-100 text-amber-800', SUCCEEDED: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-rose-100 text-rose-800', REFUNDED: 'bg-muted text-muted-foreground',
};
const NEXT: Record<string, string[]> = {
  REQUESTED: ['QUOTED', 'CANCELLED'], QUOTED: ['ACCEPTED', 'CANCELLED'], ACCEPTED: ['IN_SERVICE', 'CANCELLED'],
  IN_SERVICE: ['QUALITY_CHECK'], QUALITY_CHECK: ['COMPLETED'], COMPLETED: [], CANCELLED: [], DISPUTED: [],
};

export default function MyActivityPage() {
  const { session } = useSession();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fnUrl = (a: string) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/workspace-api?action=${a}`;
  const headers = async () => {
    const t = (await session?.getToken({ template: 'supabase' })) ?? null;
    return { Authorization: `Bearer ${t}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string, 'Content-Type': 'application/json' };
  };
  const load = useCallback(async () => {
    try {
      const r = await fetch(fnUrl('activity.mine'), { headers: await headers() as any });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setData(j);
    } catch (e: any) { setError(e.message); }
  }, [session]);
  useEffect(() => { load(); }, [load]);

  const transition = async (booking_id: string, state: string) => {
    await fetch(fnUrl('booking.state'), { method: 'POST', headers: await headers() as any, body: JSON.stringify({ booking_id, state }) });
    load();
  };

  if (error) return <div className="container py-10 text-sm text-destructive">{error}</div>;
  if (!data) return <div className="container py-10 text-sm text-muted-foreground">Loading your activity…</div>;

  const providerRows = (data.bookings_for_my_orgs ?? []);
  const isProvider = providerRows.length > 0;

  return (
    <div className="container py-6 space-y-4 max-w-4xl">
      <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Home</Link>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Activity className="h-5 w-5 text-primary" /></div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">My Activity</h1>
          <p className="text-xs text-muted-foreground">Bookings, payments, reviews, vehicle records and messages — one consolidated view over live data</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link to="/emergency"><Card className="p-3 flex items-center gap-2 hover:bg-muted/50 transition border-rose-200">
          <Siren className="h-4 w-4 text-rose-600" /><div><p className="text-sm font-semibold">Emergency</p>
          <p className="text-[10px] text-muted-foreground">Roadside directory — no live dispatch</p></div></Card></Link>
        <Link to="/ai-concierge"><Card className="p-3 flex items-center gap-2 hover:bg-muted/50 transition">
          <Bot className="h-4 w-4 text-primary" /><div><p className="text-sm font-semibold">AI Concierge</p>
          <p className="text-[10px] text-muted-foreground">Ask anything — answers with sources</p></div></Card></Link>
      </div>

      <Card className="p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" /> BOOKINGS & ACTIVE JOBS {isProvider && <Badge className="text-[9px] bg-violet-100 text-violet-800">includes jobs for my organization</Badge>}</p>
        {[...(data.bookings_as_customer ?? []).map((b: any) => ({ ...b, side: 'customer' })),
          ...providerRows.map((b: any) => ({ ...b, side: 'provider' }))].length === 0 &&
          <p className="text-xs text-muted-foreground">No bookings yet. Find services through the Concierge or offers browse.</p>}
        {[...(data.bookings_as_customer ?? []).map((b: any) => ({ ...b, side: 'customer' })),
          ...providerRows.map((b: any) => ({ ...b, side: 'provider' }))].map((b: any) => (
          <div key={b.id} className="flex items-center gap-2 text-sm border-b pb-2 last:border-0 flex-wrap">
            <Badge className={cn('text-[10px]', BK[b.state] ?? 'bg-muted')}>{b.state.replace(/_/g, ' ')}</Badge>
            {b.side === 'provider' && <Badge variant="outline" className="text-[9px]">org job</Badge>}
            <span className="text-xs">{b.vehicles ? `${b.vehicles.make} ${b.vehicles.model}` : 'Vehicle'}</span>
            <span className="text-[10px] text-muted-foreground">{b.scheduled_at ? new Date(b.scheduled_at).toLocaleDateString() : new Date(b.created_at).toLocaleDateString()}</span>
            {b.side === 'provider' && (NEXT[b.state] ?? []).map((to: string) => (
              <Button key={to} size="sm" variant="outline" className="h-6 text-[10px] ml-auto first:ml-auto"
                onClick={() => transition(b.id, to)}>→ {to.replace(/_/g, ' ')}</Button>
            ))}
          </div>
        ))}
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> PAYMENTS</p>
          {(data.payments ?? []).length === 0 && <p className="text-xs text-muted-foreground">No payment intents yet. (Test lane: simulated only.)</p>}
          {(data.payments ?? []).map((p: any) => (
            <div key={p.id} className="flex items-center gap-2 text-sm border-b pb-1.5 last:border-0">
              <Badge className={cn('text-[9px]', PAY[p.state] ?? 'bg-muted')}>{p.state}</Badge>
              <span className="font-medium">{p.currency} {Number(p.amount).toLocaleString()}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{new Date(p.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </Card>
        <Card className="p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Star className="h-3.5 w-3.5" /> MY REVIEWS</p>
          {(data.reviews ?? []).length === 0 && <p className="text-xs text-muted-foreground">No reviews written yet.</p>}
          {(data.reviews ?? []).map((r: any) => (
            <div key={r.id} className="text-sm border-b pb-1.5 last:border-0">
              <span className="text-amber-500">{'★'.repeat(r.rating)}</span>
              <span className="text-xs text-muted-foreground ml-2">{r.comment}</span>
            </div>
          ))}
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Stamp className="h-3.5 w-3.5" /> VEHICLE PASSPORT</p>
          {(data.passport_stamps ?? []).length === 0 && <p className="text-xs text-muted-foreground">No passport records yet — service events will appear here.</p>}
          {(data.passport_stamps ?? []).map((s: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-xs border-b pb-1.5 last:border-0">
              <Badge variant="outline" className="text-[9px]">{s.verified ? 'verified' : 'recorded'}</Badge>
              <span className="flex-1">{s.title}{s.mileage_km ? ` · ${s.mileage_km} km` : ''}</span>
              <span className="text-[10px] text-muted-foreground">{new Date(s.stamped_at).toLocaleDateString()}</span>
            </div>
          ))}
        </Card>
        <Card className="p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Bell className="h-3.5 w-3.5" /> MESSAGES & NOTIFICATIONS</p>
          {(data.notifications ?? []).length === 0 && <p className="text-xs text-muted-foreground">No notifications yet.</p>}
          {(data.notifications ?? []).map((n: any) => (
            <div key={n.id} className={cn('text-xs border-b pb-1.5 last:border-0', !n.read && 'font-medium')}>
              <span className="text-sm">{n.title}</span>
              <span className="text-muted-foreground ml-2">{n.body}</span>
            </div>
          ))}
        </Card>
      </div>
      <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Wrench className="h-3 w-3" /> Mechanic? Jobs for your organization appear in Bookings above with accept/decline and state controls.</p>
    </div>
  );
}
