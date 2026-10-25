import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { Activity, CalendarClock, CreditCard, Star, Bell, Stamp, Siren, ArrowLeft, Bot, FileText, CheckCircle2, Circle, Share2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [sel, setSel] = useState<any>(null);
  const [qItem, setQItem] = useState({ label: '', amount: '' });
  const [qItems, setQItems] = useState<any[]>([]);
  const [qNote, setQNote] = useState('');
  const [rv, setRv] = useState({ rating: 5, comment: '' });
  const [taskTitle, setTaskTitle] = useState('');
  const [referNote, setReferNote] = useState('');

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

  const post = async (action: string, body: any) => {
    const r = await fetch(fnUrl(action), { method: 'POST', headers: await headers() as any, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) { setError(j.error); return null; }
    setError(null); await load(); return j;
  };
  const transition = (id: string, state: string) => post('booking.state', { booking_id: id, state });

  const allBookings = [...(data?.bookings_as_customer ?? []).map((b: any) => ({ ...b, side: 'customer' })),
    ...(data?.bookings_for_my_orgs ?? []).map((b: any) => ({ ...b, side: 'provider' }))];

  if (error && !data) return <div className="container py-10 text-sm text-destructive">{error}</div>;
  if (!data) return <div className="container py-10 text-sm text-muted-foreground">Loading your activity…</div>;

  return (
    <div className="container py-6 space-y-4 max-w-4xl">
      <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Home</Link>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Activity className="h-5 w-5 text-primary" /></div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">My Activity</h1>
          <p className="text-xs text-muted-foreground">Live bookings with quotes & job cards, payments, reviews, passport, notifications</p>
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
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 flex-1"><CalendarClock className="h-3.5 w-3.5" /> BOOKINGS & ACTIVE JOBS</p>
          <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => { setSel(null); setQItems([]); }}>Clear selection</Button>
        </div>
        {allBookings.length === 0 && <p className="text-xs text-muted-foreground">No bookings yet — find services through the Concierge or /offers.</p>}
        {allBookings.map((b: any) => (
          <button key={b.id} onClick={() => { setSel(b); setQItems([]); setReferNote(''); }}
            className={cn("w-full text-left flex items-center gap-2 text-sm border-b pb-2 last:border-0 flex-wrap hover:bg-muted/30 rounded p-1 -m-1 transition",
              sel?.id === b.id && "bg-primary/5")}>
            <Badge className={cn('text-[10px]', BK[b.state] ?? 'bg-muted')}>{b.state.replace(/_/g, ' ')}</Badge>
            {b.side === 'provider' && <Badge variant="outline" className="text-[9px]">org job</Badge>}
            <span className="text-xs">{b.vehicles ? `${b.vehicles.make} ${b.vehicles.model}` : 'Vehicle'}</span>
            {b.quote?.total > 0 && <span className="text-[10px] text-muted-foreground">quote {b.quote.total}</span>}
            <span className="text-[10px] text-muted-foreground ml-auto">{new Date(b.scheduled_at ?? b.created_at).toLocaleDateString()}</span>
          </button>
        ))}
      </Card>

      {sel && (
        <Card className="p-4 space-y-3 border-primary/40">
          <p className="text-xs font-semibold text-muted-foreground">SELECTED BOOKING — {sel.state.replace(/_/g, ' ')} {sel.side === 'provider' ? '(your organization)' : '(your booking)'}</p>

          {sel.quote && (
            <div className="text-xs bg-muted/40 rounded p-2.5 space-y-1">
              <p className="font-semibold">Quote v{sel.quote.version} — total {sel.quote.total?.toLocaleString?.() ?? sel.quote.total}</p>
              {(sel.quote.items ?? []).map((it: any, i: number) => (
                <p key={i} className="flex justify-between"><span>{it.label}</span><span>{it.amount?.toLocaleString?.() ?? it.amount}</span></p>
              ))}
              {sel.quote.note && <p className="text-muted-foreground">{sel.quote.note}</p>}
              {sel.side === 'customer' && sel.state === 'QUOTED' && (
                <Button size="sm" className="h-7 text-xs mt-1" onClick={() => post('booking.accept', { booking_id: sel.id }).then(() => setSel(null))}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Accept quote & authorize work
                </Button>
              )}
            </div>
          )}

          {sel.side === 'provider' && sel.state === 'REQUESTED' && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground">SEND ITEMIZED QUOTE (P2)</p>
              <div className="flex gap-1.5 flex-wrap items-end">
                <Input value={qItem.label} onChange={e => setQItem({ ...qItem, label: e.target.value })} placeholder="Item (e.g. Brake pads, front)" className="h-7 text-xs flex-1 min-w-[140px]" />
                <Input value={qItem.amount} onChange={e => setQItem({ ...qItem, amount: e.target.value })} placeholder="KES" className="h-7 text-xs w-24" />
                <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={!qItem.label || !qItem.amount}
                  onClick={() => { setQItems([...qItems, { label: qItem.label, amount: Number(qItem.amount) }]); setQItem({ label: '', amount: '' }); }}>Add item</Button>
              </div>
              {qItems.map((it, i) => <p key={i} className="text-[11px] flex justify-between"><span>{it.label}</span><span>{it.amount.toLocaleString()}</span></p>)}
              <div className="flex gap-1.5">
                <Input value={qNote} onChange={e => setQNote(e.target.value)} placeholder="Notes / exclusions (optional)" className="h-7 text-xs" />
                <Button size="sm" className="h-7 text-xs" disabled={!qItems.length}
                  onClick={() => post('booking.quote', { booking_id: sel.id, items: qItems, note: qNote }).then(() => { setSel(null); setQItems([]); setQNote(''); })}>Send quote</Button>
              </div>
            </div>
          )}

          {sel.side === 'provider' && (NEXT[sel.state] ?? []).length > 0 && sel.state !== 'REQUESTED' && (
            <div className="flex gap-1.5 flex-wrap">
              {(NEXT[sel.state] ?? []).map((to: string) => (
                <Button key={to} size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => transition(sel.id, to)}>→ {to.replace(/_/g, ' ')}</Button>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground">JOB-CARD CHECKLIST (P3) — {(sel.checklist ?? []).filter((t: any) => t.done).length}/{(sel.checklist ?? []).length} done</p>
            {(sel.checklist ?? []).map((t: any) => (
              <button key={t.id} className="flex items-center gap-2 text-xs w-full text-left hover:bg-muted/40 rounded p-1"
                onClick={() => post('booking.task.toggle', { booking_id: sel.id, task_id: t.id })}>
                {t.done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className={cn(t.done && 'line-through opacity-60')}>{t.title}</span>
              </button>
            ))}
            <div className="flex gap-1.5">
              <Input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Add task (e.g. Inspect brake discs)" className="h-7 text-xs" />
              <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={!taskTitle.trim()}
                onClick={() => post('booking.task.add', { booking_id: sel.id, title: taskTitle }).then(() => setTaskTitle(''))}>Add</Button>
            </div>
          </div>

          {sel.side === 'customer' && sel.state === 'COMPLETED' && (
            <div className="space-y-1.5 border-t pt-2">
              <p className="text-[11px] font-semibold text-muted-foreground">REVIEW THIS JOB (P4 — eligible reviews only)</p>
              <div className="flex gap-1.5 items-center">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setRv({ ...rv, rating: n })}><Star className={cn('h-4 w-4', n <= rv.rating ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground')} /></button>
                ))}
                <Input value={rv.comment} onChange={e => setRv({ ...rv, comment: e.target.value })} placeholder="How was the service?" className="h-7 text-xs flex-1" />
                <Button size="sm" className="h-7 text-xs" onClick={() => post('review.create', { booking_id: sel.id, ...rv })}>Post</Button>
              </div>
            </div>
          )}

          <div className="flex gap-1.5 items-end border-t pt-2">
            <Share2 className="h-3.5 w-3.5 text-muted-foreground mb-1.5" />
            <Input value={referNote} onChange={e => setReferNote(e.target.value)} placeholder="Refer to a specialist — note what's needed (P9)" className="h-7 text-xs" />
            <Button size="sm" variant="ghost" className="h-7 text-[11px]" disabled={!referNote.trim()}
              onClick={() => post('booking.refer', { booking_id: sel.id, note: referNote }).then(() => setReferNote(''))}>Refer</Button>
          </div>
          {sel.referral_note && <p className="text-[10px] text-muted-foreground">Referral note: {sel.referral_note}</p>}
        </Card>
      )}

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
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 flex-1"><Star className="h-3.5 w-3.5" /> MY REVIEWS</p>
          </div>
          {(data.reviews ?? []).length === 0 && <p className="text-xs text-muted-foreground">No reviews yet — they unlock after a completed job.</p>}
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
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 flex-1"><Bell className="h-3.5 w-3.5" /> NOTIFICATIONS</p>
            {(data.notifications ?? []).some((n: any) => !n.read) && (
              <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => post('notifications.read', { all: true })}>Mark all read</Button>
            )}
          </div>
          {(data.notifications ?? []).length === 0 && <p className="text-xs text-muted-foreground">No notifications yet.</p>}
          {(data.notifications ?? []).map((n: any) => (
            <div key={n.id} className={cn('text-xs border-b pb-1.5 last:border-0', !n.read && 'font-medium')}>
              <span className="text-sm">{n.title}</span>
              <span className="text-muted-foreground ml-2">{n.body}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
