import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { LayoutGrid, ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { jres, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/env';

const svc = (SUPABASE_URL) + '/functions/v1/workspace-api';
const SVC_CLASSES = ['mechanical','diagnostics','auto_electrical','body','paint','detailing','audio','security','tyres','glass','hvac','upholstery','exhaust','performance','ev_hybrid'];

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="p-4 space-y-2">
      <button className="flex items-center gap-2 w-full text-left" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <p className="text-sm font-semibold">{title}</p>
      </button>
      {open && <div className="space-y-2 pt-1">{children}</div>}
    </Card>
  );
}
const Row = ({ children }: { children: React.ReactNode }) => <div className="flex items-center gap-2 text-xs border-b pb-1.5 last:border-0 flex-wrap">{children}</div>;
const Mono = ({ children }: { children: React.ReactNode }) => <span className="text-[10px] text-muted-foreground font-mono">{(children as any)?.slice?.(0, 8) ?? children}</span>;

export default function WorkspacesHubPage() {
  const { session } = useSession();
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [svcClass, setSvcClass] = useState('mechanical');
  const [reqDesc, setReqDesc] = useState('');
  const [selReq, setSelReq] = useState<any>(null);

  const headers = async () => {
    const t = (await session?.getToken({ template: 'supabase' })) ?? null;
    return { Authorization: `Bearer ${t}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
  };
  const load = useCallback(async () => {
    try {
      const r = await fetch(svc + '?action=hub.summary', { headers: await headers() as any });
      const j = await jres(r);
      if (!r.ok) throw new Error(j.error);
      setD(j);
    } catch (e: any) { setErr(e.message); }
  }, [session]);
  useEffect(() => { load(); }, [load]);
  const post = async (action: string, body: any) => {
    const r = await fetch(svc + '?action=' + action, { method: 'POST', headers: await headers() as any, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) { setErr(j.error); return null; }
    setErr(null); await load(); return j;
  };
  if (err && !d) return <div className="container py-10 text-sm text-destructive">{err}</div>;
  if (!d) return <div className="container py-10 text-sm text-muted-foreground">Loading workspaces…</div>;
  const isAdmin = d.role === 'admin';
  const myOrg = d.orgs?.[0];

  return (
    <div className="container py-6 space-y-3 max-w-4xl">
      <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Home</Link>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><LayoutGrid className="h-5 w-5 text-primary" /></div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Workspaces</h1>
          <p className="text-xs text-muted-foreground">Every operating module — negotiation, execution, fleet, community, founding, regions, fulfilment, intelligence, achievement, government {isAdmin && '· control plane'}</p>
        </div>
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}

      {/* N1 NEGOTIATION */}
      <Section title="Bid & Negotiation" defaultOpen>
        <p className="text-[11px] font-semibold text-muted-foreground">REQUEST A SERVICE</p>
        <div className="flex gap-2 flex-wrap items-end">
          <Select value={svcClass} onValueChange={setSvcClass}>
            <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{SVC_CLASSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
          </Select>
          <Input value={reqDesc} onChange={e => setReqDesc(e.target.value)} placeholder="Describe the job…" className="h-8 text-xs flex-1 min-w-[160px]" />
          <Button size="sm" className="h-8" disabled={!reqDesc.trim()} onClick={() => post('request.create', { service_class: svcClass, description: { text: reqDesc } }).then(() => setReqDesc(''))}>Submit request</Button>
        </div>
        {(d.requests_mine ?? []).map((r: any) => (
          <Row key={r.id}>
            <Badge variant="outline" className="text-[9px]">{r.status}</Badge>
            <span className="capitalize">{r.service_class?.replace(/_/g, ' ')}</span>
            <Mono>{r.id}</Mono>
            <span className="text-[10px] text-muted-foreground">{(r.request_offers ?? []).length} offers</span>
            <Button size="sm" variant="ghost" className="h-6 text-[10px] ml-auto" onClick={() => setSelReq(selReq?.id === r.id ? null : r)}>Offers</Button>
          </Row>
        ))}
        {selReq && (
          <div className="border rounded p-2 space-y-1.5 bg-muted/20">
            {(selReq.request_offers ?? []).sort((a: any, b: any) => b.version - a.version).map((o: any) => (
              <Row key={o.id}>
                <Badge className="text-[9px] bg-blue-100 text-blue-800">v{o.version} {o.state}</Badge>
                <span className="font-medium">{o.payload?.total?.toLocaleString?.()}</span>
                <span className="text-[10px] text-muted-foreground">{(o.payload?.items ?? []).map((i: any) => i.label).join(', ').slice(0, 60)}</span>
                {(o.state === 'SUBMITTED' || o.state === 'COUNTERED') && (
                  <>
                    <Button size="sm" className="h-6 text-[10px] ml-auto" onClick={() => post('offer.accept', { offer_id: o.id })}>Accept</Button>
                    <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => {
                      const nt = prompt('Counter total (KES):', String(o.payload?.total ?? 0));
                      if (nt) post('offer.counter', { request_id: selReq.id, parent_offer_id: o.id, scope: o.payload?.scope ?? '', items: o.payload?.items ?? [], total: Number(nt), schedule: o.payload?.schedule });
                    }}>Counter</Button>
                  </>
                )}
              </Row>
            ))}
          </div>
        )}
        {myOrg && (
          <>
            <p className="text-[11px] font-semibold text-muted-foreground pt-1">OPEN REQUESTS (for your organization)</p>
            {(d.requests_open ?? []).filter((r: any) => r.customer_id).map((r: any) => (
              <Row key={r.id}>
                <Badge variant="outline" className="text-[9px]">{r.urgency}</Badge>
                <span className="capitalize flex-1">{r.service_class?.replace(/_/g, ' ')} — {r.description?.text?.slice(0, 60)}</span>
                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => {
                  const scope = prompt('Scope of work:', ''); if (!scope) return;
                  const total = prompt('Total (KES):', '0'); if (!total) return;
                  post('offer.submit', { request_id: r.id, provider_org_id: myOrg, scope, items: [], total: Number(total) });
                }}>Submit offer</Button>
              </Row>
            ))}
          </>
        )}
      </Section>

      {/* N2 EXECUTION */}
      <Section title="Job Execution & Quality">
        {(d.tasks ?? []).map((t: any) => (
          <Row key={t.id}>
            <Badge className={cn('text-[9px]', t.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : t.status === 'REWORK' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800')}>{t.status}</Badge>
            <span className="flex-1">{t.title}{t.evidence_required ? ' · evidence required' : ''}</span>
            <Mono>{t.booking_id}</Mono>
            {t.status === 'ASSIGNED' && t.assignee_id && <>
              <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => post('task.respond', { task_id: t.id, status: 'ACCEPTED' })}>Accept</Button>
              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => post('task.respond', { task_id: t.id, status: 'DECLINED' })}>Decline</Button>
            </>}
            {t.status === 'ACCEPTED' && <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => post('task.respond', { task_id: t.id, status: 'IN_PROGRESS' })}>Start</Button>}
            {t.status === 'IN_PROGRESS' && <Button size="sm" className="h-6 text-[10px]" onClick={() => post('task.respond', { task_id: t.id, status: 'SUBMITTED' })}>Submit</Button>}
            {isAdmin && t.status === 'SUBMITTED' && <>
              <Button size="sm" className="h-6 text-[10px]" onClick={() => post('task.verify', { task_id: t.id, pass: true })}>Verify</Button>
              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => post('task.verify', { task_id: t.id, pass: false })}>Rework</Button>
            </>}
          </Row>
        ))}
        {(d.tasks ?? []).length === 0 && <p className="text-xs text-muted-foreground">No tasks yet — add tasks from a booking in My Activity.</p>}
        {(d.warranties ?? []).length > 0 && <p className="text-[11px] font-semibold text-muted-foreground pt-1">WARRANTY CLAIMS</p>}
        {(d.warranties ?? []).map((w: any) => <Row key={w.id}><Badge variant="outline" className="text-[9px]">{w.status}</Badge><span>{w.claim_type}</span></Row>)}
      </Section>

      {/* N3 FLEET */}
      <Section title="Fleet">
        <div className="flex gap-2 items-end flex-wrap">
          <p className="text-[11px] font-semibold text-muted-foreground flex-1">FUEL LOG</p>
          <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={!d?.orgs?.length}
            onClick={() => {
              const v = prompt('Vehicle UUID:'); if (!v) return;
              const l = prompt('Litres:'); const p = prompt('Price per litre:'); const o = prompt('Odometer km:');
              post('fleet.fuel.log', { vehicle_id: v, litres: l, unit_price: p, odometer_km: o, receipt_ref: prompt('Receipt ref (optional):') ?? '' });
            }}>Log fuel</Button>
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => {
            const v = prompt('Vehicle UUID to scan:'); if (v) post('fleet.anomaly.scan', { vehicle_id: v });
          }}>Scan anomalies</Button>
        </div>
        {(d.anomalies ?? []).map((a: any) => (
          <Row key={a.id}><Badge className="text-[9px] bg-amber-100 text-amber-800">{a.kind}</Badge><span className="flex-1">confidence: {a.confidence}</span>
            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => post('appeal.open', { subject_type: 'anomaly', subject_id: a.id, reason: 'Review requested' })}>Request review</Button>
          </Row>
        ))}
        {(d.inspections ?? []).map((i: any) => <Row key={i.id}><Badge variant="outline" className="text-[9px]">{i.status}</Badge><span>{new Date(i.created_at).toLocaleDateString()} · {i.odometer_km ?? '—'} km</span><span className="text-[10px] text-muted-foreground">{(i.defects ?? []).length} defects</span></Row>)}
        {(d.fuel ?? []).slice(0, 5).map((f: any) => <Row key={f.id}><Badge variant="outline" className="text-[9px]">{f.status}</Badge><span>{f.litres}L @ {f.unit_price}</span><span className="text-[10px] text-muted-foreground">{f.station}</span></Row>)}
      </Section>

      {/* N4 COMMUNITY */}
      <Section title="Community">
        <div className="flex gap-2 items-end">
          <p className="text-[11px] font-semibold text-muted-foreground flex-1">SPACES</p>
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => {
            const n = prompt('Space name:'); if (n) post('space.create', { name: n, purpose: prompt('Purpose:') ?? '' });
          }}>Create space</Button>
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => {
            const id = prompt('Space UUID to join:'); if (id) post('space.join', { space_id: id });
          }}>Join</Button>
        </div>
        {(d.spaces ?? []).map((sp: any) => <Row key={sp.id}><Badge variant="outline" className="text-[9px]">{sp.membership}</Badge><span className="font-medium">{sp.name}</span><span className="text-[10px] text-muted-foreground">{sp.purpose?.slice(0, 50)}</span></Row>)}
        <div className="flex gap-2 items-end pt-1">
          <p className="text-[11px] font-semibold text-muted-foreground flex-1">OPPORTUNITIES</p>
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => {
            const t = prompt('Opportunity title:'); if (t) post('opportunity.publish', { title: t, body: prompt('Details:') ?? '' });
          }}>Publish</Button>
        </div>
        {(d.opportunities ?? []).map((o: any) => (
          <Row key={o.id}><span className="font-medium flex-1">{o.title}</span><span className="text-[10px] text-muted-foreground">{o.region ?? 'all regions'}</span>
            <Button size="sm" className="h-6 text-[10px]" onClick={() => post('opportunity.apply', { opportunity_id: o.id })}>Apply</Button>
          </Row>
        ))}
        <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => {
          const topic = prompt('Mentorship topic:'); if (topic) post('mentor.request', { topic });
        }}>Request mentorship</Button>
      </Section>

      {/* N5 FOUNDING */}
      <Section title="Founding Member">
        {d.founding ? (
          <div className="bg-gradient-to-br from-slate-700 to-slate-900 text-white rounded-xl p-4 space-y-1 max-w-sm">
            <p className="text-[10px] tracking-widest opacity-70">SPAREKEI FOUNDING MEMBER</p>
            <p className="text-lg font-bold">{d.tier}</p>
            <p className="font-mono text-xs">{d.founding.card_number}</p>
            <p className="text-[10px] opacity-70">{d.founding.cohort} · points {d.points}</p>
          </div>
        ) : (
          <Button size="sm" className="h-8 text-xs" onClick={() => post('founding.join', { region_code: 'KE' })}>Join founding cohort (KE)</Button>
        )}
        <p className="text-[10px] text-muted-foreground">Tiers: {(d.tiers ?? []).map((t: any) => `${t.tier} ${t.min_points}pts`).join(' · ')}</p>
      </Section>

      {/* N6 MANUFACTURER REGIONS */}
      {myOrg && (
      <Section title="Regional Markets">
        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => {
          const c = prompt('Country code (e.g. TZ):'); if (!c) return;
          post('market.set', { org_id: myOrg, country: c, lifecycle: 'RESEARCH', reason: prompt('Reason:') ?? '' });
        }}>Add market</Button>
        {(d.markets ?? []).map((m: any) => (
          <Row key={m.id}><Badge className="text-[9px] bg-indigo-100 text-indigo-800">{m.lifecycle}</Badge><span className="font-medium">{m.country}</span>
            <Select value={m.lifecycle} onValueChange={v => post('market.set', { org_id: m.org_id, country: m.country, state: m.state, lifecycle: v })}>
              <SelectTrigger className="h-6 w-[130px] text-[10px]"><SelectValue /></SelectTrigger>
              <SelectContent>{['PLANNED','RESEARCH','SHADOW','PILOT','LIMITED_LIVE','LIVE','PAUSED','CLOSED'].map(x => <SelectItem key={x} value={x}>{x.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
            </Select>
          </Row>
        ))}
        {(d.campaigns ?? []).map((c: any) => <Row key={c.id}><Badge variant="outline" className="text-[9px]">{c.kind} · {c.severity}</Badge><span className="flex-1">{c.status}</span></Row>)}
      </Section>
      )}

      {/* N7 FULFILMENT */}
      {myOrg && (
      <Section title="Procurement & Fulfilment">
        <div className="flex gap-2 items-end">
          <p className="text-[11px] font-semibold text-muted-foreground flex-1">PURCHASE ORDERS</p>
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => {
            const sn = prompt('Supplier name:'); if (sn) post('po.create', { org_id: myOrg, supplier_name: sn });
          }}>New PO</Button>
        </div>
        {(d.purchase_orders ?? []).map((p: any) => (
          <Row key={p.id}><Badge variant="outline" className="text-[9px]">{p.status}</Badge><span className="flex-1">{p.supplier_name}</span>
            {['DRAFT'].includes(p.status) && <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => post('po.transition', { po_id: p.id, status: 'SUBMITTED' })}>Submit</Button>}
            {['SUBMITTED'].includes(p.status) && <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => post('po.transition', { po_id: p.id, status: 'ACCEPTED' })}>Accept</Button>}
            {['ACCEPTED', 'PARTIAL'].includes(p.status) && <Button size="sm" className="h-6 text-[10px]" onClick={() => post('po.transition', { po_id: p.id, status: 'RECEIVED' })}>Receive</Button>}
          </Row>
        ))}
        {(d.shipments ?? []).map((sh: any) => (
          <Row key={sh.id}><Badge variant="outline" className="text-[9px]">{sh.status}</Badge><span className="flex-1">{sh.order_kind} · <Mono>{sh.order_id}</Mono></span>
            {sh.status === 'CREATED' && <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => post('shipment.status', { shipment_id: sh.id, status: 'OFFERED' })}>Offer to courier</Button>}
            {sh.status === 'IN_TRANSIT' && <Button size="sm" className="h-6 text-[10px]" onClick={() => post('shipment.status', { shipment_id: sh.id, status: 'DELIVERED', proof: { note: 'delivered' } })}>Mark delivered</Button>}
          </Row>
        ))}
      </Section>
      )}

      {/* N9 INTELLIGENCE */}
      {myOrg && (
      <Section title="Intelligence (shadow-first)">
        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => post('intel.generate', { org_id: myOrg })}>Generate recommendations</Button>
        {(d.recommendations ?? []).map((r: any) => (
          <Row key={r.id}><Badge className="text-[9px] bg-cyan-100 text-cyan-800">{r.status}</Badge><span className="flex-1">{r.title}</span><span className="text-[10px] text-muted-foreground">{r.confidence}</span>
            {r.status === 'SHADOW' && <>
              <Button size="sm" className="h-6 text-[10px]" onClick={() => post('intel.decide', { recommendation_id: r.id, decision: 'ACCEPTED', reason: prompt('Reason:') ?? '' })}>Accept</Button>
              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => post('intel.decide', { recommendation_id: r.id, decision: 'REJECTED', reason: prompt('Reason:') ?? '' })}>Reject</Button>
            </>}
          </Row>
        ))}
      </Section>
      )}

      {/* N10 ACHIEVEMENT */}
      <Section title="Achievement & Opportunities">
        <div className="flex gap-2 items-end">
          <p className="text-[11px] font-semibold text-muted-foreground flex-1">{d.achievement?.length ? `Level: ${d.achievement[0].level}` : 'No level earned yet — evaluation is evidence-based'}</p>
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => post('achievement.evaluate', {})}>Evaluate</Button>
        </div>
        {(d.ach_opportunities ?? []).map((o: any) => (
          <Row key={o.id}><span className="font-medium flex-1">{o.title}</span>
            <Button size="sm" className="h-6 text-[10px]" onClick={() => post('opportunity.apply', { opportunity_id: o.id })}>Request consideration</Button>
          </Row>
        ))}
      </Section>

      {/* N11 GOVERNMENT */}
      <Section title="Government Services (official-channel)">
        {(d.gov_services ?? []).map((gs: any) => (
          <Row key={gs.id}><Badge variant="outline" className="text-[9px]">{gs.availability}</Badge><span className="font-medium flex-1">{gs.title}</span>
            <a href={gs.official_url} target="_blank" rel="noreferrer" className="text-[10px] text-primary underline">Official channel</a>
            <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => post('gov.application.create', { service_id: gs.id, reference: prompt('Official reference (after submitting via the authority):') ?? '' })}>Record application</Button>
          </Row>
        ))}
        {(d.gov_applications ?? []).map((a: any) => <Row key={a.id}><Badge className="text-[9px] bg-amber-100 text-amber-800">{a.status}</Badge><span className="flex-1">{d.gov_services?.find((x: any) => x.id === a.service_id)?.title}</span><Mono>{a.reference}</Mono></Row>)}
      </Section>

      {/* N8 CONTROL PLANE (admin) */}
      {isAdmin && d.control && (
      <Section title="Control Plane">
        <div className="flex gap-2 items-end">
          <p className="text-[11px] font-semibold text-muted-foreground flex-1">AGENTS · DECISIONS · DELEGATIONS</p>
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => {
            const t = prompt('Decision title:'); if (t) post('decision.create', { title: t, priority: 'high' });
          }}>New decision</Button>
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => {
            const n = prompt('Agent name:'); if (n) post('agent.register', { name: n, mandate: prompt('Mandate:') ?? '' });
          }}>Register agent</Button>
        </div>
        {(d.control.decisions ?? []).map((x: any) => <Row key={x.id}><Badge variant="outline" className="text-[9px]">{x.status}</Badge><span className="flex-1">{x.title}</span>
          {x.status === 'PENDING' && <Button size="sm" className="h-6 text-[10px]" onClick={() => post('decision.resolve', { decision_id: x.id, status: 'RESOLVED', resolution: prompt('Resolution:') ?? '' })}>Resolve</Button>}
        </Row>)}
        {(d.control.agents ?? []).map((a: any) => <Row key={a.id}><Badge variant="outline" className="text-[9px]">{a.status}</Badge><span className="font-medium">{a.name}</span><span className="text-[10px] text-muted-foreground">{a.kind}</span></Row>)}
        {(d.control.delegations ?? []).map((g: any) => <Row key={g.id}><Badge variant="outline" className="text-[9px]">{g.revoked_at ? 'REVOKED' : 'ACTIVE'}</Badge><span className="flex-1">to <Mono>{g.grantee_id}</Mono> until {new Date(g.ends_at).toLocaleDateString()}</span>
          {!g.revoked_at && <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => post('delegation.revoke', { delegation_id: g.id })}>Revoke</Button>}
        </Row>)}
      </Section>
      )}
    </div>
  );
}
