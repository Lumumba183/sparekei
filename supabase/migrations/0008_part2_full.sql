-- 0008_part2_full.sql — Part 2 modules: schema foundations (all additive, no existing table altered)
-- N1 negotiation · N2 specialist/garage execution · N3 fleet · N4 community · N5 founding
-- N6 manufacturer regions · N7 fulfilment · N8 control plane · N9 intelligence · N10 achievement · N11 government Phase B

-- ===== N1: Bid & Negotiation =====
create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.app_users(id) on delete set null,
  service_class text not null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  description jsonb not null default '{}'::jsonb,
  location text, urgency text not null default 'routine',
  status text not null default 'OPEN', -- OPEN/NEGOTIATING/CONFIRMED/CANCELLED/EXPIRED
  created_at timestamptz not null default now()
);
create table if not exists public.request_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  provider_org_id uuid references public.organizations(id) on delete cascade,
  version integer not null default 1,
  payload jsonb not null default '{}'::jsonb, -- {scope, items[{label,amount}], total, schedule, warranty, conditions}
  state text not null default 'SUBMITTED', -- SUBMITTED/COUNTERED/ACCEPTED/REJECTED/WITHDRAWN/SUPERSEDED/EXPIRED
  parent_offer_id uuid references public.request_offers(id) on delete set null,
  actor_id uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ===== N2: Specialist/Garage execution =====
create table if not exists public.job_tasks (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  title text not null, assignee_id uuid references public.app_users(id) on delete set null,
  capability_required text, evidence_required boolean not null default false,
  status text not null default 'READY', -- READY/ASSIGNED/ACCEPTED/IN_PROGRESS/SUBMITTED/VERIFIED/DECLINED/REWORK
  submitted_at timestamptz, verified_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.quality_signoffs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  task_id uuid references public.job_tasks(id) on delete set null,
  result text not null check (result in ('PASS','FAIL','REWORK')),
  verifier_id uuid references public.app_users(id) on delete set null, note text,
  created_at timestamptz not null default now()
);
create table if not exists public.warranty_claims (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  org_id uuid references public.organizations(id) on delete cascade,
  claim_type text not null default 'workmanship', -- workmanship/product/third_party
  status text not null default 'OPEN', terms jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.comebacks (
  id uuid primary key default gen_random_uuid(),
  original_booking_id uuid not null references public.bookings(id) on delete cascade,
  followup_booking_id uuid references public.bookings(id) on delete set null,
  reason text, created_at timestamptz not null default now()
);

-- ===== N3: Fleet =====
create table if not exists public.fleet_drivers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.app_users(id) on delete cascade,
  status text not null default 'ACTIVE', licence_ref text,
  created_at timestamptz not null default now(), unique(org_id, user_id)
);
create table if not exists public.fleet_inspections (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  driver_id uuid references public.fleet_drivers(id) on delete set null,
  checklist jsonb not null default '[]'::jsonb, defects jsonb not null default '[]'::jsonb,
  odometer_km integer, status text not null default 'SUBMITTED', -- SUBMITTED/ACK/ESCALATED
  created_at timestamptz not null default now()
);
create table if not exists public.fuel_events (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  driver_id uuid references public.fleet_drivers(id) on delete set null,
  litres numeric(10,2) not null, unit_price numeric(12,2) not null, total numeric(12,2) not null,
  odometer_km integer, station text, receipt_ref text,
  status text not null default 'VALIDATED', -- VALIDATED/FLAGGED
  created_at timestamptz not null default now()
);
create table if not exists public.anomaly_cases (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  kind text not null, signal jsonb not null default '{}'::jsonb,
  confidence text not null default 'moderate', -- low/moderate/high + explanation
  status text not null default 'OPEN', -- OPEN/REVIEWED/DISMISSED
  created_at timestamptz not null default now()
);
create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  fleet_org_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  priority text not null default 'routine', status text not null default 'OPEN', -- OPEN/TRIAGED/BOOKED/CLOSED
  created_at timestamptz not null default now()
);

-- ===== N4: Community (full) =====
create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null, purpose text, owner_id uuid references public.app_users(id) on delete set null,
  membership text not null default 'public', -- public/members
  region text, rules text, created_at timestamptz not null default now()
);
create table if not exists public.space_members (
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  role text not null default 'member', created_at timestamptz not null default now(),
  primary key (space_id, user_id)
);
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.community_posts(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  author_id uuid references public.app_users(id) on delete set null,
  body text not null, status text not null default 'VISIBLE',
  created_at timestamptz not null default now()
);
create table if not exists public.mentorship_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.app_users(id) on delete cascade,
  mentor_id uuid references public.app_users(id) on delete set null,
  topic text not null, status text not null default 'OPEN', -- OPEN/MATCHED/CLOSED
  created_at timestamptz not null default now()
);
create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'community', -- community/achievement
  publisher_id uuid references public.app_users(id) on delete set null,
  title text not null, body text not null, eligibility jsonb not null default '{}'::jsonb,
  region text, capacity integer, deadline timestamptz,
  status text not null default 'PUBLISHED', created_at timestamptz not null default now()
);
create table if not exists public.opportunity_applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  applicant_id uuid not null references public.app_users(id) on delete cascade,
  status text not null default 'APPLIED', created_at timestamptz not null default now(),
  unique(opportunity_id, applicant_id)
);

-- ===== N5: Founding completion =====
create table if not exists public.founding_regions (
  code text primary key, name text not null,
  currency text not null default 'KES', fx_rate numeric(12,4) not null default 129.79,
  rounding int not null default 100, price_usd numeric(10,2) not null default 20,
  cap int not null default 500, status text not null default 'PLANNED' -- PLANNED/OPEN/CLOSED
);
insert into public.founding_regions (code, name, status) values ('KE', 'Kenya', 'OPEN') on conflict (code) do nothing;
create table if not exists public.founding_reservations (
  id uuid primary key default gen_random_uuid(),
  region_code text not null references public.founding_regions(code) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  expires_at timestamptz not null, created_at timestamptz not null default now()
);
create table if not exists public.points_ledger (
  id bigint generated always as identity primary key,
  member_id uuid not null references public.app_users(id) on delete cascade,
  event_type text not null, delta integer not null, source_ref text,
  ruleset text not null default 'v1', idempotency_key text not null unique,
  status text not null default 'POSTED', reversal_of bigint,
  created_at timestamptz not null default now()
);
create table if not exists public.tier_rules (
  tier text primary key, min_points integer not null, benefits jsonb not null default '{}'::jsonb
);
insert into public.tier_rules (tier, min_points, benefits) values
  ('Silver', 0, '{"label":"The Contributor"}'),
  ('Gold', 500, '{"label":"The Achiever"}'),
  ('Black', 2000, '{"label":"The Ultimate"}') on conflict (tier) do nothing;
create table if not exists public.redemption_orders (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.app_users(id) on delete cascade,
  reward_label text not null, points_cost integer not null,
  status text not null default 'PENDING', created_at timestamptz not null default now()
);

-- ===== N6: Manufacturer multi-region =====
create table if not exists public.org_markets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  country text not null, state text,
  lifecycle text not null default 'PLANNED', -- PLANNED/RESEARCH/SHADOW/PILOT/LIMITED_LIVE/LIVE/PAUSED/CLOSED
  visibility jsonb not null default '{}'::jsonb,
  owner_id uuid references public.app_users(id) on delete set null, reason text,
  updated_at timestamptz not null default now(), unique(org_id, country, state)
);
create table if not exists public.regional_product_states (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.canonical_products(id) on delete cascade,
  market_id uuid not null references public.org_markets(id) on delete cascade,
  state text not null default 'UNKNOWN', reason text, source text default 'manufacturer_declaration',
  updated_at timestamptz not null default now(), unique(product_id, market_id)
);
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null default 'service_campaign', -- recall/service_campaign/advisory
  scope jsonb not null default '{}'::jsonb, severity text not null default 'moderate',
  status text not null default 'OPEN', published_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.tech_documents (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.canonical_products(id) on delete cascade,
  title text not null, version integer not null default 1,
  doc_type text not null default 'spec', -- spec/bulletin/notice
  market_scope jsonb not null default '{}'::jsonb,
  published_by uuid references public.app_users(id) on delete set null,
  supersedes uuid references public.tech_documents(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ===== N7: Vendor fulfilment =====
create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  supplier_org_id uuid references public.organizations(id) on delete set null,
  supplier_name text, status text not null default 'DRAFT', -- DRAFT/SUBMITTED/ACCEPTED/PARTIAL/RECEIVED/CANCELLED
  terms jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_kind text not null default 'product_order', -- product_order/po
  order_id uuid not null,
  from_org_id uuid references public.organizations(id) on delete set null,
  to_org_id uuid references public.organizations(id) on delete set null,
  courier_org_id uuid references public.organizations(id) on delete set null,
  status text not null default 'CREATED', -- CREATED/OFFERED/ACCEPTED/PICKED_UP/IN_TRANSIT/DELIVERED/FAILED
  proof jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.return_cases (
  id uuid primary key default gen_random_uuid(),
  order_kind text not null default 'product_order', order_id uuid not null,
  reason text not null, status text not null default 'OPEN', -- OPEN/AUTHORIZED/RETURNING/RECEIVED/RESOLVED/REJECTED
  resolution text, created_at timestamptz not null default now()
);

-- ===== N8: Control plane =====
create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  name text not null, kind text not null default 'worker', -- worker/specialist/executive
  mandate text, tools jsonb not null default '[]'::jsonb,
  status text not null default 'PROPOSED', -- PROPOSED/TEST/SHADOW/ACTIVE/PAUSED/DEGRADED/RETIRED
  owner_id uuid references public.app_users(id) on delete set null, model text,
  last_health_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  title text not null, kind text not null default 'operational',
  owner_id uuid references public.app_users(id) on delete set null,
  priority text not null default 'normal', status text not null default 'PENDING', -- PENDING/RESOLVED/ESCALATED
  evidence jsonb not null default '{}'::jsonb, deadline timestamptz, resolution text,
  created_at timestamptz not null default now()
);
create table if not exists public.delegations (
  id uuid primary key default gen_random_uuid(),
  grantor_id uuid not null references public.app_users(id) on delete cascade,
  grantee_id uuid not null references public.app_users(id) on delete cascade,
  scope jsonb not null default '{}'::jsonb, actions jsonb not null default '[]'::jsonb,
  starts_at timestamptz not null default now(), ends_at timestamptz not null,
  revoked_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.authority_rules (
  id uuid primary key default gen_random_uuid(),
  domain text not null, condition jsonb not null default '{}'::jsonb,
  approver_role text not null, created_at timestamptz not null default now()
);
create table if not exists public.ai_costs (
  id bigint generated always as identity primary key,
  service text not null, model text, tokens_in integer default 0, tokens_out integer default 0,
  cost_usd numeric(10,6) default 0, actor_id uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ===== N9: Intelligence (recommendations) =====
create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  kind text not null, org_id uuid references public.organizations(id) on delete cascade,
  title text not null, explanation text, evidence jsonb not null default '{}'::jsonb,
  confidence text not null default 'moderate', -- qualitative, never fabricated numeric
  status text not null default 'SHADOW', -- CANDIDATE/SHADOW/READY_FOR_REVIEW/ACCEPTED/REJECTED/EXPIRED
  decided_by uuid references public.app_users(id) on delete set null, decision_reason text,
  created_at timestamptz not null default now()
);

-- ===== N10: Achievement & opportunities =====
create table if not exists public.achievement_rules (
  id uuid primary key default gen_random_uuid(),
  role text not null, name text not null,
  criteria jsonb not null default '{}'::jsonb, -- e.g. {min_completed_bookings: 10, min_rating: 4}
  version integer not null default 1, approved boolean not null default false,
  created_at timestamptz not null default now()
);
insert into public.achievement_rules (role, name, criteria, approved) values
  ('mechanic', 'Level 1 — Established', '{"min_completed_bookings": 5, "min_rating": 4}', true),
  ('vendor', 'Level 1 — Established', '{"min_fulfilled_orders": 5}', true)
on conflict do nothing;
create table if not exists public.stakeholder_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  role text not null, level text not null, basis jsonb not null default '{}'::jsonb,
  rule_version integer not null default 1, status text not null default 'ACTIVE',
  created_at timestamptz not null default now(), unique(user_id, role)
);
create table if not exists public.appeals (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null, subject_id text not null,
  user_id uuid not null references public.app_users(id) on delete cascade,
  reason text not null, status text not null default 'OPEN', resolution text,
  created_at timestamptz not null default now()
);

-- ===== N11: Government Phase B =====
create table if not exists public.gov_services (
  id uuid primary key default gen_random_uuid(),
  jurisdiction text not null default 'KE', kind text not null, -- driver_licence_renewal/vehicle_inspection/records
  title text not null, official_url text, fee_note text,
  availability text not null default 'manual_handoff', -- manual_handoff/authorized_integration
  created_at timestamptz not null default now()
);
insert into public.gov_services (kind, title, official_url, fee_note) values
  ('driver_licence_renewal', 'Driver Licence Renewal', 'https://www.ntsa.go.ke', 'Official NTSA/e-Citizen fees apply; pay only through official channels.'),
  ('vehicle_inspection', 'Vehicle Inspection Booking', 'https://www.ntsa.go.ke', 'Book via the official authority channel; record your reference here.')
on conflict do nothing;
create table if not exists public.gov_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  service_id uuid not null references public.gov_services(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  reference text, status text not null default 'DRAFT', -- DRAFT/READY/SUBMITTED/ACKNOWLEDGED/ACTION_REQUIRED/REJECTED/UNKNOWN
  notes jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.gov_inspection_bookings (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.gov_applications(id) on delete set null,
  centre_name text, inspection_type text, appointment_at timestamptz,
  official_reference text, result text, -- PENDING/PASSED/FAILED recorded only from official evidence
  status text not null default 'RECORDED', created_at timestamptz not null default now()
);
