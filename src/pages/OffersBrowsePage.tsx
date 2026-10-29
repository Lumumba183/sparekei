import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PackageSearch, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/env';

interface Offer {
  id: string; price: number; currency: string; quantity: number; moq: number; created_at?: string;
  price_breaks: { min_qty: number; unit_price: number }[];
  canonical_products: { name: string; brand: string; category: string } | null;
  organizations: { name: string; country: string; markets: string[] } | null;
}

export default function OffersBrowsePage() {
  const [params, setParams] = useSearchParams();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [q, setQ] = useState(params.get('q') ?? '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${SUPABASE_URL}/functions/v1/workspace-api?action=offers.browse&q=${encodeURIComponent(q)}`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    }).then(r => r.json()).then(j => { setOffers(j.offers ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params]);

  const search = () => setParams(q ? { q } : {});

  return (
    <div className="container py-8 max-w-4xl space-y-4">
      <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Home
      </Link>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <PackageSearch className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Parts Offers</h1>
          <p className="text-xs text-muted-foreground">Public offers from verified suppliers — MOQ and volume pricing shown up front</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Search by part name or brand…" className="h-9" />
        <Button onClick={search} size="sm" className="h-9">Search</Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading offers…</p>}
      {!loading && offers.length === 0 && (
        <Card className="p-6 text-sm text-muted-foreground">
          No published offers match. Suppliers publish offers from their Provider Hub — this page shows them as they go live.
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {offers.map(o => (
          <Card key={o.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold leading-snug">{o.canonical_products?.name ?? 'Product'}</p>
              <Badge variant="outline" className="text-[9px] shrink-0">{o.canonical_products?.category}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {o.canonical_products?.brand && <>Brand: {o.canonical_products.brand} · </>}
              Supplier: {o.organizations?.name ?? '—'} ({o.organizations?.country})
              {o.created_at && <> · <span className={new Date(o.created_at) < new Date(Date.now() - 7 * 864e5) ? 'text-amber-700' : ''}>
                updated {new Date(o.created_at).toLocaleDateString()}{new Date(o.created_at) < new Date(Date.now() - 7 * 864e5) ? ' (stale)' : ''}
              </span></>}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold">{o.currency} {o.price.toLocaleString()}</span>
              <span className="text-[11px] text-muted-foreground">/ unit · MOQ {o.moq} · stock {o.quantity}</span>
            </div>
            {(o.price_breaks ?? []).length > 0 && (
              <div className="text-[11px] text-muted-foreground border-t pt-1.5">
                Volume pricing: {(o.price_breaks ?? []).sort((a, b) => a.min_qty - b.min_qty)
                  .map(pb => `${pb.min_qty}+ @ ${pb.unit_price.toLocaleString()}`).join(' · ')}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Link to="/register" className="text-[11px] text-primary hover:underline">Request quote →</Link>
              <Link to="/login" className="text-[11px] text-muted-foreground hover:underline">Sign in to order</Link>
            </div>
          </Card>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">Sample/demo records are labelled in the supplier registry; no fabricated availability — stock figures are the supplier's published quantities.</p>
    </div>
  );
}
