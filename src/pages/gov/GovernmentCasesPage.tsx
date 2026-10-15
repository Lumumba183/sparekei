import { useState, useEffect } from 'react';
import { useSession } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Plus, FlaskConical, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSupabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface GovCase { id: string; case_number: string; case_type: string; jurisdiction: string; status: string; is_test: boolean; updated_at: string; vehicles?: { make: string; model: string; registration: string | null } | null; }

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground', OPEN: 'bg-blue-100 text-blue-800',
  EVIDENCE_REVIEW: 'bg-amber-100 text-amber-800', READY_FOR_PRESENTATION: 'bg-emerald-100 text-emerald-800',
  PRESENTED: 'bg-violet-100 text-violet-800', CLOSED: 'bg-muted text-muted-foreground',
};

export default function GovernmentCasesPage() {
  const { session } = useSession();
  const [cases, setCases] = useState<GovCase[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [caseType, setCaseType] = useState('');
  const [vehicleId, setVehicleId] = useState('none');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // supabase-js invoke posts to function root; actions are read via query param — use fetch instead for GETs
  const fnUrl = (action: string) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gov-cases?action=${action}`;

  const load = async () => {
    try {
      const token = (await session?.getToken({ template: 'supabase' })) ?? null;
      const h = { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string };
      const [t, c, v] = await Promise.all([
        fetch(fnUrl('templates'), { headers: h }).then(r => r.json()),
        fetch(fnUrl('list'), { headers: h }).then(r => r.json()),
        getSupabase(token).from('vehicles').select('id, make, model, registration').then((r: any) => r.data ?? []),
      ]);
      setTemplates(t.templates ?? []); setCases(c.cases ?? []); setVehicles(v);
      if (!caseType && t.templates?.length) setCaseType(t.templates[0].case_type);
    } catch (e: any) { setError(e.message); }
  };
  useEffect(() => { load(); }, [session]);

  const createCase = async () => {
    if (!caseType) return;
    setBusy(true); setError(null);
    try {
      const token = (await session?.getToken({ template: 'supabase' })) ?? null;
      const res = await fetch(fnUrl('create'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string, 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_type: caseType, jurisdiction: 'KE', vehicle_id: vehicleId === 'none' ? null : vehicleId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Create failed');
      await load();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="container py-6 space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><ShieldCheck className="h-5 w-5 text-primary" /></div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Government &amp; Compliance Cases</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <FlaskConical className="h-3 w-3" /> Test environment — synthetic records only. No government authentication,
            submissions, or official records exchange.
          </p>
        </div>
      </div>

      <Card className="p-4 space-y-3 border-dashed">
        <p className="text-xs font-semibold text-muted-foreground">OPEN A NEW TEST CASE</p>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="min-w-[220px]">
            <label className="text-[11px] text-muted-foreground">Checklist template (Kenya v1)</label>
            <Select value={caseType} onValueChange={setCaseType}>
              <SelectTrigger className="h-9 mt-0.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {templates.map(t => <SelectItem key={t.id} value={t.case_type}>{t.case_type.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[200px]">
            <label className="text-[11px] text-muted-foreground">Vehicle (optional)</label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger className="h-9 mt-0.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No vehicle linked</SelectItem>
                {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.make} {v.model} · {v.registration ?? 'no plate'}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={createCase} disabled={busy || !caseType} size="sm" className="h-9"><Plus className="h-3.5 w-3.5 mr-1" /> Create test case</Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </Card>

      <div className="space-y-2">
        {cases.length === 0 && <p className="text-sm text-muted-foreground">No test cases yet. Create one above — it will follow a readiness checklist and auditable states.</p>}
        {cases.map((c) => (
          <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Link to={`/dashboard/government/cases/${c.id}`}>
              <Card className="p-3.5 flex items-center gap-3 hover:bg-muted/40 transition">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-muted-foreground">{c.case_number}</span>
                    <Badge className={cn('text-[10px]', STATUS_COLORS[c.status] ?? 'bg-muted')}>{c.status.replace(/_/g, ' ')}</Badge>
                    <Badge variant="outline" className="text-[10px]">TEST</Badge>
                  </div>
                  <p className="text-sm font-medium mt-0.5 capitalize">{c.case_type.replace(/_/g, ' ')} · {c.jurisdiction}</p>
                  {c.vehicles && <p className="text-xs text-muted-foreground">{c.vehicles.make} {c.vehicles.model} · {c.vehicles.registration ?? ''}</p>}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
