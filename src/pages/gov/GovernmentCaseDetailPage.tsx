import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSession } from '@clerk/clerk-react';
import { ShieldCheck, FlaskConical, ArrowLeft, AlertTriangle, FilePlus2, Stamp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/env';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground', OPEN: 'bg-blue-100 text-blue-800',
  EVIDENCE_REVIEW: 'bg-amber-100 text-amber-800', READY_FOR_PRESENTATION: 'bg-emerald-100 text-emerald-800',
  PRESENTED: 'bg-violet-100 text-violet-800', CLOSED: 'bg-muted text-muted-foreground',
};
const EVIDENCE_COLORS: Record<string, string> = {
  owner_declared: 'bg-slate-100 text-slate-700', submitted: 'bg-blue-100 text-blue-800',
  technician_check: 'bg-amber-100 text-amber-800', authority_verified: 'bg-emerald-100 text-emerald-800',
  synthetic: 'bg-purple-100 text-purple-800',
};
const TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['OPEN', 'CLOSED'], OPEN: ['EVIDENCE_REVIEW', 'CLOSED'],
  EVIDENCE_REVIEW: ['READY_FOR_PRESENTATION', 'OPEN', 'CLOSED'],
  READY_FOR_PRESENTATION: ['PRESENTED', 'EVIDENCE_REVIEW'], PRESENTED: ['CLOSED'], CLOSED: [],
};

export default function GovernmentCaseDetailPage() {
  const { id } = useParams();
  const { session } = useSession();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [evClass, setEvClass] = useState('submitted');
  const [evDoc] = useState('document');
  const [evLabel, setEvLabel] = useState('');
  const [evNote, setEvNote] = useState('');

  const fnUrl = (action: string) => `${SUPABASE_URL}/functions/v1/gov-cases?action=${action}`;
  const headers = async () => {
    const token = (await session?.getToken({ template: 'supabase' })) ?? null;
    return { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch(fnUrl('detail') + `&id=${id}`, { headers: await headers() as any });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (e: any) { setError(e.message); }
  }, [id, session]);
  useEffect(() => { load(); }, [load]);

  const post = async (action: string, body: any) => {
    const res = await fetch(fnUrl(action), { method: 'POST', headers: await headers() as any, body: JSON.stringify(body) });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? 'Failed'); return; }
    setError(null); await load();
  };

  if (error && !data) return <div className="container py-10 text-sm text-destructive">{error}</div>;
  if (!data) return <div className="container py-10 text-sm text-muted-foreground">Loading case…</div>;
  const c = data.case;

  const doneCount = (data.tasks ?? []).filter((t: any) => t.status === 'DONE' || t.status === 'NA').length;

  return (
    <div className="container py-6 space-y-4 max-w-4xl">
      <Link to="/dashboard/government/cases" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All cases
      </Link>

      <div className="flex items-start gap-3 flex-wrap">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><ShieldCheck className="h-5 w-5 text-primary" /></div>
        <div className="flex-1 min-w-[220px]">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold tracking-tight capitalize">{c.case_type.replace(/_/g, ' ')}</h1>
            <Badge className={cn('text-[10px]', STATUS_COLORS[c.status])}>{c.status.replace(/_/g, ' ')}</Badge>
            <Badge variant="outline" className="text-[10px]"><FlaskConical className="h-3 w-3 mr-1" /> TEST / SYNTHETIC</Badge>
          </div>
          <p className="font-mono text-xs text-muted-foreground">{c.case_number} · {c.jurisdiction} · checklist v{c.checklist_version ?? '—'}</p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(TRANSITIONS[c.status] ?? []).map((to: string) => (
            <Button key={to} size="sm" variant={to === 'CLOSED' ? 'outline' : 'default'} className="h-8 text-xs"
              onClick={() => post('transition', { case_id: c.id, to })}>
              → {to.replace(/_/g, ' ')}
            </Button>
          ))}
        </div>
      </div>

      {c.status === 'READY_FOR_PRESENTATION' && (
        <Card className="p-3 border-amber-300 bg-amber-50 flex gap-2 items-start">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">{c.outcome_label ?? 'READY FOR PRESENTATION (assistance readiness — NOT an official inspection pass)'}.
            This case has no statutory effect and has not been reviewed by any authority.</p>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">READINESS CHECKLIST — {doneCount}/{(data.tasks ?? []).length} complete</p>
          {(data.tasks ?? []).map((t: any) => (
            <div key={t.id} className="flex items-center gap-2 text-sm border-b pb-2 last:border-0">
              <Select value={t.status} onValueChange={(s) => post('task', { task_id: t.id, case_id: c.id, status: s })}>
                <SelectTrigger className="h-7 w-[110px] text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'NA'].map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="flex-1">{t.title}</span>
              <Badge variant="outline" className="text-[9px]">{t.assignee_role}</Badge>
            </div>
          ))}
        </Card>

        <Card className="p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">EVIDENCE — classes stay distinct</p>
          {(data.evidence ?? []).map((e: any) => (
            <div key={e.id} className="text-sm border-b pb-2 last:border-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={cn('text-[9px]', EVIDENCE_COLORS[e.evidence_class])}>{e.evidence_class.replace(/_/g, ' ')}</Badge>
                <span className="font-medium">{e.label}</span>
                <span className="text-[10px] text-muted-foreground">({e.document_type})</span>
              </div>
              {e.note && <p className="text-xs text-muted-foreground">{e.note}</p>}
            </div>
          ))}
          <div className="flex flex-wrap gap-1.5 pt-1 items-end">
            <Select value={evClass} onValueChange={setEvClass}>
              <SelectTrigger className="h-8 w-[130px] text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['owner_declared', 'submitted', 'technician_check', 'authority_verified', 'synthetic'].map(s =>
                  <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={evLabel} onChange={e => setEvLabel(e.target.value)} placeholder="Evidence label" className="h-8 text-xs flex-1 min-w-[120px]" />
            <Input value={evNote} onChange={e => setEvNote(e.target.value)} placeholder="Note (optional)" className="h-8 text-xs flex-1 min-w-[120px]" />
            <Button size="sm" className="h-8" disabled={!evLabel.trim()}
              onClick={() => post('evidence', { case_id: c.id, evidence_class: evClass, document_type: evDoc, label: evLabel, note: evNote })
                .then(() => { setEvLabel(''); setEvNote(''); })}>
              <FilePlus2 className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">“Authority verified” is recorded only when a designated reviewer marks it — it is never granted automatically.</p>
        </Card>
      </div>

      {c.vehicle_id && (
        <Card className="p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Stamp className="h-3.5 w-3.5" /> VEHICLE HISTORY REVIEW — from the Vehicle Passport &amp; service records
          </p>
          {(data.vehicle_history ?? []).length === 0 && <p className="text-xs text-muted-foreground">No passport or service records found for this vehicle yet.</p>}
          {(data.vehicle_history ?? []).map((h: any, i: number) => (
            <div key={i} className="flex items-center gap-3 text-sm border-b pb-1.5 last:border-0">
              <Badge variant="outline" className="text-[9px]">{h.kind}</Badge>
              <span className="flex-1">{h.summary}</span>
              <span className="text-[10px] text-muted-foreground">{new Date(h.at).toLocaleDateString()}</span>
            </div>
          ))}
        </Card>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
