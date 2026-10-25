import { useState, useEffect } from 'react';
import { useSession } from '@clerk/clerk-react';
import { Database, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TABLES = ['service_requests','request_offers','job_tasks','quality_signoffs','warranty_claims','comebacks','fleet_drivers','fleet_inspections','fuel_events','anomaly_cases','work_orders','spaces','space_members','comments','mentorship_requests','opportunities','opportunity_applications','founding_regions','founding_reservations','points_ledger','tier_rules','redemption_orders','org_markets','regional_product_states','campaigns','tech_documents','purchase_orders','shipments','return_cases','agents','decisions','delegations','authority_rules','ai_costs','recommendations','achievement_rules','stakeholder_achievements','appeals','gov_services','gov_applications','gov_inspection_bookings','audit_events','funnel_events','bookings','payment_intents','entitlement_grants','familiarisation_windows','organizations','provider_capabilities','seller_offers','canonical_products','inventory_movements','gov_cases','concierge_conversations','subscriptions','founding_members','community_posts','site_banners','distribution_links','credentials','exam_attempts','passport_stamps','vehicles','reviews','notifications','app_users'];

export default function AdminOpsPage() {
  const { session } = useSession();
  const [table, setTable] = useState('audit_events');
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (t: string) => {
    setLoading(true); setError(null);
    try {
      const token = (await session?.getToken({ template: 'supabase' })) ?? null;
      const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/workspace-api?action=admin.table&table=${t}`, {
        headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setRows(j.rows ?? []);
    } catch (e: any) { setError(e.message); setRows([]); }
    setLoading(false);
  };
  useEffect(() => { if (session) load(table); }, [session]);

  const cols = rows.length ? Object.keys(rows[0]).slice(0, 8) : [];

  return (
    <div className="container py-6 space-y-4 max-w-5xl">
      <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Admin</Link>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="h-5 w-5 text-primary" /></div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Operations Data Viewer</h1>
          <p className="text-xs text-muted-foreground">Read-only inspection over live platform tables · admin-only · 50-row cap · audit-logged</p>
        </div>
        <Select value={table} onValueChange={v => { setTable(v); load(v); }}>
          <SelectTrigger className="h-8 w-56 text-xs ml-auto"><SelectValue /></SelectTrigger>
          <SelectContent>{TABLES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Card className="p-3 overflow-x-auto">
        {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!loading && rows.length === 0 && !error && <p className="text-xs text-muted-foreground">No rows in {table}.</p>}
        {rows.length > 0 && (
          <table className="w-full text-[11px]">
            <thead><tr>{cols.map(c => <th key={c} className="text-left font-semibold border-b pb-1 pr-3 whitespace-nowrap">{c}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  {cols.map(c => (
                    <td key={c} className="py-1 pr-3 align-top max-w-[220px] truncate text-muted-foreground">
                      {r[c] === null ? <span className="opacity-40">null</span> : typeof r[c] === 'object' ? JSON.stringify(r[c]).slice(0, 60) : String(r[c]).slice(0, 60)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
        <Badge variant="outline" className="text-[9px]">evidence tool</Badge>
        Every query is audit-logged. This viewer is for operations verification — not a substitute for the future control-plane dashboards, which remain separately scoped.
      </p>
    </div>
  );
}
