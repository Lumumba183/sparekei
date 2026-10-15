// Sparekei Government & Compliance Cases — LOCALLY TESTABLE case management.
// Per the Government Services spec: synthetic/test lane only. No government auth,
// no official records exchange, no statutory submissions. is_test is forced TRUE.
// Evidence classes stay distinct: owner_declared | submitted | technician_check |
// authority_verified (never auto-granted) | synthetic.
// "READY_FOR_PRESENTATION" is assistance readiness — NEVER an official inspection pass.
import { cors, supabaseAdmin, HttpError } from '../_shared/ai.ts';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['OPEN', 'CLOSED'],
  OPEN: ['EVIDENCE_REVIEW', 'CLOSED'],
  EVIDENCE_REVIEW: ['READY_FOR_PRESENTATION', 'OPEN', 'CLOSED'],
  READY_FOR_PRESENTATION: ['PRESENTED', 'EVIDENCE_REVIEW'],
  PRESENTED: ['CLOSED'],
  CLOSED: [],
};

async function requireUser(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  if (!token) throw new HttpError(401, 'Missing authorization');
  const { createClient } = await import('jsr:@supabase/supabase-js@2');
  const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: me } = await anon.from('app_users').select('id, role, full_name').limit(1);
  if (!me?.[0]) throw new HttpError(401, 'Invalid session');
  return me[0] as { id: string; role: string; full_name: string };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const user = await requireUser(req);
    const admin = supabaseAdmin();
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // LIST templates / cases
    if (req.method === 'GET' && action === 'templates') {
      const { data, error } = await admin.from('gov_readiness_templates').select('*').eq('active', true).order('jurisdiction').order('case_type');
      if (error) throw new HttpError(500, error.message);
      return Response.json({ templates: data ?? [], test_only: true }, { headers: cors });
    }
    if (req.method === 'GET' && action === 'list') {
      const { data, error } = await admin.from('gov_cases')
        .select('id, case_number, case_type, jurisdiction, status, vehicle_id, is_test, updated_at, vehicles(make, model, registration)')
        .eq('is_test', true).order('updated_at', { ascending: false }).limit(200);
      if (error) throw new HttpError(500, error.message);
      return Response.json({ cases: data ?? [], test_only: true }, { headers: cors });
    }
    if (req.method === 'GET' && action === 'detail') {
      const id = url.searchParams.get('id');
      if (!id) throw new HttpError(400, 'Missing id');
      const { data: c, error } = await admin.from('gov_cases').select('*').eq('id', id).single();
      if (error || !c) throw new HttpError(404, 'Case not found');
      const [{ data: tasks }, { data: evidence }, { data: vh }] = await Promise.all([
        admin.from('gov_case_tasks').select('*').eq('case_id', id).order('sort_order'),
        admin.from('gov_case_evidence').select('*').eq('case_id', id).order('created_at'),
        admin.from('vehicles').select('id, make, model, year, registration').eq('owner_id', user.id),
      ]);
      // Vehicle-history review context: passport stamps + service orders for this vehicle
      let history: any[] = [];
      if (c.vehicle_id) {
        const [{ data: stamps }, { data: orders }] = await Promise.all([
          admin.from('passport_stamps').select('id, stamp_type, title, description, mileage_km, verified, stamped_at').eq('vehicle_id', c.vehicle_id).order('stamped_at', { ascending: false }).limit(50),
          admin.from('service_orders').select('id, status, total_amount, created_at, completed_at').eq('vehicle_id', c.vehicle_id).order('created_at', { ascending: false }).limit(50),
        ]);
        history = [
          ...(stamps ?? []).map((s: any) => ({ kind: 'passport', at: s.stamped_at, summary: s.title ?? s.stamp_type ?? 'record', verified: s.verified })),
          ...(orders ?? []).map((o: any) => ({ kind: 'service', at: o.created_at, summary: `Service order — ${o.status}` })),
        ].sort((a, b) => (a.at < b.at ? 1 : -1));
      }
      return Response.json({ case: c, tasks: tasks ?? [], evidence: evidence ?? [], vehicles: vh ?? [], vehicle_history: history, test_only: true }, { headers: cors });
    }

    // CREATE case (always is_test=true; instantiates checklist tasks from template)
    if (req.method === 'POST' && action === 'create') {
      const body = await req.json();
      const caseType: string = (body.case_type ?? '').toString();
      const jurisdiction: string = (body.jurisdiction ?? 'KE').toString().slice(0, 8).toUpperCase();
      if (!caseType) throw new HttpError(400, 'case_type required');
      const { data: tpl } = await admin.from('gov_readiness_templates')
        .select('*').eq('jurisdiction', jurisdiction).eq('case_type', caseType).eq('active', true)
        .order('version', { ascending: false }).limit(1).maybeSingle();
      const items: { key: string; label: string; assignee_role: string }[] = tpl?.items ?? [];
      const seq = Math.floor(Date.now() % 1000000);
      const { data: created, error } = await admin.from('gov_cases').insert({
        case_number: `TEST-${jurisdiction}-${caseType.slice(0, 12).toUpperCase()}-${seq}`,
        case_type: caseType, jurisdiction, vehicle_id: body.vehicle_id ?? null,
        status: 'DRAFT', checklist_version: tpl?.version ?? null,
        is_test: true, owner_id: user.id,
      }).select('*').single();
      if (error) throw new HttpError(500, error.message);
      if (items.length) {
        await admin.from('gov_case_tasks').insert(items.map((it, i) => ({
          case_id: created.id, title: it.label, assignee_role: it.assignee_role ?? 'owner', sort_order: i, status: 'PENDING',
        })));
      }
      await admin.rpc('log_audit_event', {
        p_actor: user.id, p_role: user.role, p_action: 'gov.case.create',
        p_entity: 'gov_cases', p_entity_id: created.id,
        p_metadata: { case_number: created.case_number, is_test: true },
      }).then(()=>{}, ()=>{});
      return Response.json({ case: created, tasks_created: items.length, test_only: true }, { headers: cors });
    }

    // UPDATE task status
    if (req.method === 'POST' && action === 'task') {
      const body = await req.json();
      const allowed = ['PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'NA'];
      if (!body.task_id || !allowed.includes(body.status)) throw new HttpError(400, 'task_id + valid status required');
      const { error } = await admin.from('gov_case_tasks')
        .update({ status: body.status, note: (body.note ?? '').toString().slice(0, 500), updated_at: new Date().toISOString() })
        .eq('id', body.task_id);
      if (error) throw new HttpError(500, error.message);
      await admin.from('gov_cases').update({ updated_at: new Date().toISOString() }).eq('id', body.case_id);
      return Response.json({ ok: true }, { headers: cors });
    }

    // ADD evidence — class is explicit; authority_verified records WHO verified
    if (req.method === 'POST' && action === 'evidence') {
      const body = await req.json();
      const classes = ['owner_declared', 'submitted', 'technician_check', 'authority_verified', 'synthetic'];
      if (!body.case_id || !classes.includes(body.evidence_class) || !body.label)
        throw new HttpError(400, 'case_id + evidence_class + label required');
      const insert: Record<string, unknown> = {
        case_id: body.case_id, task_id: body.task_id ?? null,
        evidence_class: body.evidence_class, document_type: (body.document_type ?? 'document').toString().slice(0, 60),
        label: (body.label ?? '').toString().slice(0, 200), note: (body.note ?? '').toString().slice(0, 500),
        verified_by: body.evidence_class === 'authority_verified' ? user.id : null,
      };
      const { data: ev, error } = await admin.from('gov_case_evidence').insert(insert).select('*').single();
      if (error) throw new HttpError(500, error.message);
      await admin.rpc('log_audit_event', {
        p_actor: user.id, p_role: user.role, p_action: 'gov.evidence.add',
        p_entity: 'gov_case_evidence', p_entity_id: ev.id,
        p_metadata: { case_id: body.case_id, evidence_class: body.evidence_class },
      }).then(()=>{}, ()=>{});
      return Response.json({ evidence: ev }, { headers: cors });
    }

    // TRANSITION case state (auditable; outcome_label forced honest)
    if (req.method === 'POST' && action === 'transition') {
      const body = await req.json();
      const { data: c } = await admin.from('gov_cases').select('id, status').eq('id', body.case_id).single();
      if (!c) throw new HttpError(404, 'Case not found');
      const next = (body.to ?? '').toString();
      if (!(ALLOWED_TRANSITIONS[c.status] ?? []).includes(next)) throw new HttpError(409, `Cannot move ${c.status} → ${next}`);
      const outcomeLabel = next === 'READY_FOR_PRESENTATION'
        ? 'READY FOR PRESENTATION (assistance readiness — NOT an official inspection pass)'
        : next === 'PRESENTED' ? 'PRESENTED to owner (unofficial, synthetic/test case)' : null;
      const { error } = await admin.from('gov_cases')
        .update({ status: next, outcome_label: outcomeLabel, updated_at: new Date().toISOString() })
        .eq('id', body.case_id);
      if (error) throw new HttpError(500, error.message);
      await admin.rpc('log_audit_event', {
        p_actor: user.id, p_role: user.role, p_action: 'gov.case.transition',
        p_entity: 'gov_cases', p_entity_id: body.case_id, p_metadata: { from: c.status, to: next },
      }).then(()=>{}, ()=>{});
      return Response.json({ ok: true, status: next, outcome_label: outcomeLabel }, { headers: cors });
    }

    throw new HttpError(400, 'Unknown action');
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return new Response(JSON.stringify({ error: (e as Error).message }), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
