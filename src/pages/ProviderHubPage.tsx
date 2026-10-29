import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@clerk/clerk-react';
import { Building2, Plus, ShieldCheck, Package, CalendarClock, BadgeCheck, Circle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSupabase } from '@/lib/supabase';
import { jres, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/env';
import { cn } from '@/lib/utils';

const CAP_STATUS: Record<string, string> = {
  DECLARED: 'bg-slate-100 text-slate-700', DOCS_SUBMITTED: 'bg-blue-100 text-blue-800',
  PLATFORM_CHECKED: 'bg-amber-100 text-amber-800', PROFESSIONALLY_VERIFIED: 'bg-emerald-100 text-emerald-800',
  EXPIRED: 'bg-rose-100 text-rose-800', SUSPENDED: 'bg-rose-100 text-rose-800',
};
const BK_STATUS: Record<string, string> = {
  REQUESTED: 'bg-blue-100 text-blue-800', QUOTED: 'bg-amber-100 text-amber-800', ACCEPTED: 'bg-violet-100 text-violet-800',
  IN_SERVICE: 'bg-indigo-100 text-indigo-800', QUALITY_CHECK: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800', CANCELLED: 'bg-muted text-muted-foreground', DISPUTED: 'bg-rose-100 text-rose-800',
};
const BK_TRANSITIONS: Record<string, string[]> = {
  REQUESTED: ['QUOTED', 'CANCELLED'], QUOTED: ['ACCEPTED', 'CANCELLED'], ACCEPTED: ['IN_SERVICE', 'CANCELLED'],
  IN_SERVICE: ['QUALITY_CHECK'], QUALITY_CHECK: ['COMPLETED'], COMPLETED: ['DISPUTED'], DISPUTED: [], CANCELLED: [],
};
const SERVICE_CLASSES = ['mechanical', 'diagnostics', 'auto_electrical', 'body', 'paint', 'detailing', 'audio', 'security', 'tyres', 'glass', 'hvac', 'upholstery', 'exhaust', 'performance', 'ev_hybrid'];

export default function ProviderHubPage() {
  const { session } = useSession();
  const [data, setData] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orgName, setOrgName] = useState('');
  const [capClass, setCapClass] = useState('mechanical');
  const [offer, setOffer] = useState({ product_id: '', price: '', quantity: '1' });
  const [error, setError] = useState<string | null>(null);

  const fnUrl = (a: string) => `${SUPABASE_URL}/functions/v1/workspace-api?action=${a}`;
  const headers = async () => {
    const t = (await session?.getToken({ template: 'supabase' })) ?? null;
    return { Authorization: `Bearer ${t}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
  };
  const load = useCallback(async () => {
    try {
      const [h, t] = [await headers(), (await session?.getToken({ template: 'supabase' })) ?? null];
      const r = await fetch(fnUrl('org.mine'), { headers: h as any }); const j = await jres(r);
      if (!r.ok) throw new Error(j.error);
      setData(j);
      const { data: prods } = await getSupabase(t).from('canonical_products').select('id, name, category').eq('status', 'ACTIVE').limit(50);
      setProducts(prods ?? []);
    } catch (e: any) { setError(e.message); }
  }, [session]);
  useEffect(() => { load(); }, [load]);

  const post = async (action: string, body: any, reset?: () => void) => {
    const r = await fetch(fnUrl(action), { method: 'POST', headers: await headers() as any, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) { setError(j.error); return; }
    setError(null); reset?.(); await load();
  };

  const myOrgId = data?.orgs?.[0]?.id;

  return (
    <div className="container py-6 space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 className="h-5 w-5 text-primary" /></div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Provider Hub</h1>
          <p className="text-xs text-muted-foreground">One organization identity, many verified capabilities — {data?.orgs?.length ?? 0} organization(s)</p>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}

      {(() => {
        const myOrg = data?.orgs?.[0];
        if (!myOrg) return null;
        const checks = [
          { label: 'Organization profile', ok: !!(myOrg.country && myOrg.name) },
          { label: 'Markets & brands declared', ok: ((myOrg.markets ?? []).length > 0 || (myOrg.brands ?? []).length > 0) },
          { label: 'Capability declared', ok: (data?.capabilities ?? []).length > 0 },
          { label: 'Capability verified', ok: (data?.capabilities ?? []).some((c: any) => ['PLATFORM_CHECKED','PROFESSIONALLY_VERIFIED'].includes(c.status)) },
          { label: 'First offer published', ok: (data?.offers ?? []).length > 0 || (data?.bookings ?? []).length >= 0 && false },
        ];
        const done = checks.filter(c => c.ok).length;
        return (
          <Card className="p-4 space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> READINESS — {done}/{checks.length} ({Math.round(done/checks.length*100)}%)</p>
            {checks.map(c => (
              <p key={c.label} className="flex items-center gap-2 text-xs">
                {c.ok ? <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className={c.ok ? '' : 'text-muted-foreground'}>{c.label}</span>
              </p>
            ))}
          </Card>
        );
      })()}

      <Card className="p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">ORGANIZATION</p>
        {(data?.orgs ?? []).map((o: any) => (
          <div key={o.id} className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-primary" /> {o.name}
            <Badge variant="outline" className="text-[10px]">{o.type} · {o.country}</Badge>
            <Badge className="text-[10px] bg-emerald-100 text-emerald-800">{o.status}</Badge>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <Input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Register an organization…" className="h-8 text-xs max-w-xs" />
          <Button size="sm" className="h-8" disabled={!orgName.trim()} onClick={() => post('org.create', { name: orgName }, () => setOrgName(''))}><Plus className="h-3.5 w-3.5 mr-1" /> Create</Button>
        </div>
      </Card>

      <Card className="p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> CAPABILITIES — verification is granular per class, never a single generic badge</p>
        {(data?.capabilities ?? []).map((c: any) => (
          <div key={c.id} className="flex items-center gap-2 text-sm border-b pb-2 last:border-0">
            <span className="font-medium capitalize flex-1">{c.service_class.replace(/_/g, ' ')}</span>
            <Badge className={cn('text-[10px]', CAP_STATUS[c.status] ?? 'bg-muted')}>{c.status.replace(/_/g, ' ')}</Badge>
          </div>
        ))}
        {myOrgId && (
          <div className="flex gap-2 pt-1 items-end">
            <Select value={capClass} onValueChange={setCapClass}>
              <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{SERVICE_CLASSES.map(sc => <SelectItem key={sc} value={sc}>{sc.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" className="h-8" onClick={() => post('capability.add', { org_id: myOrgId, service_class: capClass })}>Declare capability</Button>
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Package className="h-3.5 w-3.5" /> SELLER OFFER (canonical product, your price &amp; stock)</p>
        {myOrgId && (
          <div className="flex gap-2 flex-wrap items-end">
            <Select value={offer.product_id} onValueChange={v => setOffer(o => ({ ...o, product_id: v }))}>
              <SelectTrigger className="h-8 w-[220px] text-xs"><SelectValue placeholder="Product" /></SelectTrigger>
              <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input value={offer.price} onChange={e => setOffer(o => ({ ...o, price: e.target.value }))} placeholder="KES price" className="h-8 text-xs w-28" />
            <Input value={offer.quantity} onChange={e => setOffer(o => ({ ...o, quantity: e.target.value }))} placeholder="Qty" className="h-8 text-xs w-20" />
            <Button size="sm" className="h-8" disabled={!offer.product_id || !offer.price}
              onClick={() => post('offer.add', { org_id: myOrgId, ...offer, price: Number(offer.price), quantity: Number(offer.quantity) }, () => setOffer({ product_id: '', price: '', quantity: '1' }))}>Publish offer</Button>
          </div>
        )}
        {!myOrgId && <p className="text-xs text-muted-foreground">Create an organization to publish offers.</p>}
      </Card>

      <Card className="p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" /> BOOKINGS — versioned states; no work starts without ACCEPTED</p>
        {(data?.bookings ?? []).length === 0 && <p className="text-xs text-muted-foreground">Bookings created against your organization will appear here.</p>}
        {(data?.bookings ?? []).map((b: any) => (
          <div key={b.id} className="flex items-center gap-2 text-sm border-b pb-2 last:border-0 flex-wrap">
            <Badge className={cn('text-[10px]', BK_STATUS[b.state] ?? 'bg-muted')}>{b.state.replace(/_/g, ' ')}</Badge>
            <span className="text-xs text-muted-foreground font-mono">{b.id.slice(0, 8)}</span>
            <span className="flex-1" />
            {(BK_TRANSITIONS[b.state] ?? []).map((to: string) => (
              <Button key={to} size="sm" variant="outline" className="h-7 text-[11px]"
                onClick={() => post('booking.state', { booking_id: b.id, state: to })}>→ {to.replace(/_/g, ' ')}</Button>
            ))}
          </div>
        ))}
      </Card>
    </div>
  );
}
