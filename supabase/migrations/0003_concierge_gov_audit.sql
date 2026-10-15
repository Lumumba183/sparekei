-- 0003_concierge_gov_audit.sql
-- R1/R2: concierge conversation log (separate from AI Brain admin provenance tables)
-- R5: platform audit_events foundation
-- GOV: locally-testable government/compliance case management (SYNTHETIC ONLY — no official integration)
-- All additive; nothing existing is altered or dropped.

create table if not exists public.concierge_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete set null,
  persona text not null default 'general',
  intent text not null default 'general',
  evidence jsonb not null default '{}'::jsonb,
  message text not null,
  answer text not null,
  model text not null,
  latency_ms integer,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id bigserial primary key,
  actor_id uuid references public.app_users(id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_events_entity_idx on public.audit_events(entity_type, entity_id);

-- helper: called by edge functions to record attributable actions
create or replace function public.log_audit_event(
  p_actor uuid, p_role text, p_action text, p_entity text, p_entity_id text, p_metadata jsonb default '{}'::jsonb
) returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  insert into public.audit_events(actor_id, actor_role, action, entity_type, entity_id, metadata)
  values (p_actor, p_role, p_action, p_entity, p_entity_id, coalesce(p_metadata, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end $$;

-- GOV: readiness checklist templates, versioned per jurisdiction (synthetic content, clearly test-labelled)
create table if not exists public.gov_readiness_templates (
  id uuid primary key default gen_random_uuid(),
  jurisdiction text not null,
  case_type text not null,
  version integer not null default 1,
  items jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(jurisdiction, case_type, version)
);

create table if not exists public.gov_cases (
  id uuid primary key default gen_random_uuid(),
  case_number text not null unique,
  case_type text not null,               -- roadworthiness_readiness | import_documentation | ownership_transfer | general_compliance
  jurisdiction text not null default 'KE',
  vehicle_id uuid references public.vehicles(id) on delete set null,
  status text not null default 'DRAFT',  -- DRAFT OPEN EVIDENCE_REVIEW READY_FOR_PRESENTATION PRESENTED CLOSED
  checklist_version integer,
  outcome_label text,                    -- set only on PRESENTED/CLOSED; NEVER an official pass
  is_test boolean not null default true, -- hard guarantee: synthetic/test lane only
  owner_id uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gov_case_tasks (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.gov_cases(id) on delete cascade,
  title text not null,
  assignee_role text not null default 'owner', -- owner | technician | reviewer | agent
  sort_order integer not null default 0,
  status text not null default 'PENDING',      -- PENDING IN_PROGRESS DONE BLOCKED NA
  note text,
  updated_at timestamptz not null default now()
);
create index if not exists gov_case_tasks_case_idx on public.gov_case_tasks(case_id);

-- Evidence with explicit class: the spec's core distinction
create table if not exists public.gov_case_evidence (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.gov_cases(id) on delete cascade,
  task_id uuid references public.gov_case_tasks(id) on delete set null,
  evidence_class text not null check (evidence_class in
    ('owner_declared','submitted','technician_check','authority_verified','synthetic')),
  document_type text not null,
  label text not null,
  note text,
  verified_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists gov_case_evidence_case_idx on public.gov_case_evidence(case_id);

-- Synthetic seed templates (test data, labelled as such)
insert into public.gov_readiness_templates (jurisdiction, case_type, version, items) values
('KE','roadworthiness_readiness',1,'[
 {"key":"identity","label":"Vehicle identity documents consistent (registration / VIN visible)","assignee_role":"owner"},
 {"key":"tyres","label":"Tyre condition, size and tread within visible limits","assignee_role":"technician"},
 {"key":"lights","label":"All lamps, indicators and reflectors operational","assignee_role":"technician"},
 {"key":"brakes_visible","label":"No visible brake fluid leaks; pedal feel reported normal","assignee_role":"technician"},
 {"key":"body","label":"No sharp-edge body damage; mirrors and glass intact","assignee_role":"technician"},
 {"key":"documents","label":"Logbook / ownership documents organized and current (declared by owner)","assignee_role":"owner"}
]'),
('KE','import_documentation',1,'[
 {"key":"idf","label":"Import Declaration Form (IDF) prepared","assignee_role":"owner"},
 {"key":"invoice","label":"Commercial invoice and packing list on file","assignee_role":"owner"},
 {"key":"conformity","label":"Conformity / homologation evidence collected","assignee_role":"agent"},
 {"key":"duty","label":"Duty assessment estimate recorded (estimate only — not an assessment)","assignee_role":"agent"},
 {"key":"logistics","label":"Clearing agent assigned and shipment milestones tracked","assignee_role":"agent"}
]'),
('KE','ownership_transfer',1,'[
 {"key":"seller_id","label":"Seller identity and ownership declared","assignee_role":"owner"},
 {"key":"buyer_id","label":"Buyer identity captured","assignee_role":"owner"},
 {"key":"logbook","label":"Logbook exchange checklist prepared","assignee_role":"owner"},
 {"key":"history","label":"Vehicle history (service & accident records) reviewed from Passport","assignee_role":"reviewer"}
]')
on conflict do nothing;
