-- 0004_shared_foundations.sql
-- M1 Provider foundation · M2 Commercial core · Payment architecture (sandbox) · M11 prior-vision systems
-- All additive. No existing table altered. Regulated/live capabilities remain gated.

-- ===================== M1: PROVIDER FOUNDATION =====================
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'business',          -- sole_trader | business | franchise | network
  country text not null default 'KE',
  status text not null default 'ACTIVE',          -- ACTIVE | LIMITED | SUSPENDED | RETIRED
  owner_id uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  region text,
  created_at timestamptz not null default now()
);
create table if not exists public.organization_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  role text not null default 'member',            -- owner | manager | technician | staff
  branch_id uuid references public.branches(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create table if not exists public.provider_capabilities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  service_class text not null,                    -- mechanical | diagnostics | auto_electrical | body | paint | detailing | audio | security | tyres | glass | hvac | upholstery | exhaust | performance | ev_hybrid
  scope jsonb not null default '{}'::jsonb,       -- vehicle types, modes, coverage area
  status text not null default 'DECLARED',        -- UNDECLARED|DECLARED|DOCS_SUBMITTED|PLATFORM_CHECKED|PROFESSIONALLY_VERIFIED|EXPIRED|SUSPENDED
  evidence jsonb not null default '[]'::jsonb,
  verified_by uuid references public.app_users(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.capability_verifications (
  id uuid primary key default gen_random_uuid(),
  capability_id uuid not null references public.provider_capabilities(id) on delete cascade,
  verifier_id uuid references public.app_users(id) on delete set null,
  state text not null,                            -- PLATFORM_CHECKED | PROFESSIONALLY_VERIFIED | REJECTED
  note text,
  created_at timestamptz not null default now()
);

-- ===================== M2: COMMERCIAL CORE =====================
create table if not exists public.canonical_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  brand text,
  condition text not null default 'aftermarket',  -- genuine_oe | oe_supplier | aftermarket | remanufactured | refurbished | used
  identifiers jsonb not null default '{}'::jsonb, -- part numbers, GTIN, OE refs
  provenance jsonb not null default '{}'::jsonb,  -- source claims with class
  status text not null default 'ACTIVE',          -- CANDIDATE | ACTIVE | SUPERSEDED | RESTRICTED
  created_at timestamptz not null default now()
);
create table if not exists public.seller_offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.canonical_products(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'KES',
  quantity integer not null default 0 check (quantity >= 0),
  status text not null default 'DRAFT',           -- DRAFT | PUBLISHED | PAUSED | EXPIRED | WITHDRAWN
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.app_users(id) on delete set null,
  provider_org_id uuid references public.organizations(id) on delete set null,
  offer_id uuid references public.seller_offers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  state text not null default 'REQUESTED',        -- REQUESTED|QUOTED|ACCEPTED|IN_SERVICE|QUALITY_CHECK|COMPLETED|CANCELLED|DISPUTED
  quote jsonb,                                    -- versioned quote snapshot
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===================== PAYMENT ARCHITECTURE (SANDBOX ONLY) =====================
create table if not exists public.payment_providers (
  code text primary key,                          -- sandbox-psp | mpesa-sandbox | card-sandbox
  name text not null,
  regions jsonb not null default '["KE"]'::jsonb,
  currencies jsonb not null default '["KES"]'::jsonb,
  methods jsonb not null default '[]'::jsonb,
  priority integer not null default 100,
  enabled boolean not null default false,
  sandbox boolean not null default true
);
create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,           -- anti-double-spend at the boundary
  provider_code text references public.payment_providers(code),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'KES',
  method text not null default 'sandbox_push',
  state text not null default 'CREATED',          -- CREATED|SUBMITTED|SUCCEEDED|FAILED|REFUNDED
  customer_id uuid references public.app_users(id) on delete set null,
  org_id uuid references public.organizations(id) on delete set null,
  reference text,                                 -- external provider ref (sandbox: simulated)
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.payment_webhook_events (
  id bigserial primary key,
  provider_code text not null,
  signature text,
  payload jsonb not null,
  processed boolean not null default false,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ===================== M11: PRIOR-VISION SYSTEMS =====================
create table if not exists public.plans (
  code text primary key,
  name text not null,
  price numeric(12,2) not null default 0,
  currency text not null default 'KES',
  interval text not null default 'month',
  entitlements jsonb not null default '{}'::jsonb
);
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  plan_code text not null references public.plans(code),
  status text not null default 'ACTIVE',          -- TRIALING|ACTIVE|PAST_DUE|CANCELLED
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.founding_members (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  cohort text not null default 'founders-2026',
  status text not null default 'ACTIVE',
  points integer not null default 0,
  card_number text unique,
  joined_at timestamptz not null default now()
);
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  audience_role text not null default 'mechanic',
  lessons jsonb not null default '[]'::jsonb,     -- [{title, minutes}]
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  progress integer not null default 0,            -- 0-100
  status text not null default 'ENROLLED',        -- ENROLLED|COMPLETED
  completed_at timestamptz,
  unique(course_id, user_id)
);
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.app_users(id) on delete set null,
  topic text not null default 'general',
  title text not null,
  body text not null,
  moderated boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.site_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null default 'all',           -- all | role:<role> | plan:<code>
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---- seeds (synthetic, clearly sandbox) ----
insert into public.payment_providers (code, name, methods, priority, enabled, sandbox) values
  ('sandbox-psp', 'Sandbox PSP (test)', '["sandbox_push","sandbox_card"]', 1, true, true),
  ('mpesa-sandbox', 'M-Pesa (sandbox placeholder)', '["stk_push"]', 2, false, true)
on conflict (code) do nothing;

insert into public.plans (code, name, price, entitlements) values
  ('free', 'Permanent Free Foundation', 0, '{"ai_concierge": true, "marketplace_buy": true, "passport_records": true}'),
  ('pro', 'Sparekei Pro', 1500, '{"ai_concierge": true, "marketplace_buy": true, "passport_records": true, "priority_support": true, "advanced_analytics": true}')
on conflict (code) do nothing;

insert into public.courses (title, summary, audience_role, lessons) values
  ('Brake System Fundamentals', 'Inspection, diagnosis and safe replacement of brake systems.', 'mechanic',
   '[{"title":"Brake system anatomy","minutes":12},{"title":"Diagnosing wear and faults","minutes":18},{"title":"Safe replacement procedure","minutes":22}]'),
  ('Customer Communication for Garages', 'Quotes, approvals and evidence that build trust.', 'service_node_operator',
   '[{"title":"Writing clear quotes","minutes":10},{"title":"Change approvals","minutes":12}]'),
  ('Parts Identification Basics', 'Reading part numbers and fitment evidence.', 'vendor',
   '[{"title":"OEM vs aftermarket identifiers","minutes":15},{"title":"Fitment evidence","minutes":15}]')
on conflict do nothing;
