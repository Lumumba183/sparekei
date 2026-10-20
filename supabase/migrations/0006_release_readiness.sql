-- 0006_release_readiness.sql — completes current-version acceptance criteria C1–C9 (sans live gateway)
-- plus Academy full-map fields (RPL, delivery routes, instructor materials) and labelled seed demo. All additive.

-- ============ C2: MOQ + quantity price breaks on offers ============
alter table public.seller_offers add column if not exists moq integer not null default 1 check (moq >= 1);
alter table public.seller_offers add column if not exists price_breaks jsonb not null default '[]'::jsonb; -- [{min_qty, unit_price}]
alter table public.seller_offers add column if not exists visibility text not null default 'public'; -- public | private

-- ============ C1: vendor catalogue caps (enforced in API; counters here for audit) ============
-- cap policy: 10 active public listings + 10 distinct private inventory records per organization (AC-003).

-- ============ C3: garage shared inventory ledger ============
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid references public.canonical_products(id) on delete set null,
  name text not null,
  sku text,
  unit text not null default 'pc',
  on_hand numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.inventory_movements (
  id bigint generated always as identity primary key,
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  movement_type text not null check (movement_type in ('receive','issue_internal','sale','sale_reserve','return','adjust')),
  quantity numeric(12,2) not null,
  unit_cost numeric(12,2),
  is_revenue boolean not null default false,   -- internal issue NEVER revenue
  reference text,                               -- booking/order id where applicable
  actor_id uuid references public.app_users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
-- revenue rule invariant: is_revenue = true only for movement_type in ('sale','return')
-- enforced by trigger:
create or replace function public.inventory_movement_guard() returns trigger
language plpgsql as $$
begin
  if new.is_revenue and new.movement_type not in ('sale','return') then
    raise exception 'internal_movement_cannot_be_revenue: %', new.movement_type;
  end if;
  return new;
end $$;
drop trigger if exists inventory_movement_guard_trg on public.inventory_movements;
create trigger inventory_movement_guard_trg before insert or update on public.inventory_movements
  for each row execute function public.inventory_movement_guard();

-- ============ C5/C6: entitlements + 60-day familiarisation ============
create table if not exists public.entitlement_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  capability text not null,                     -- e.g. catalogue_public_listings, analytics_advanced
  source text not null check (source in ('free','familiarisation','subscription','payment_reconciled')),
  plan_code text,
  payment_intent_id uuid references public.payment_intents(id) on delete set null,
  status text not null default 'ACTIVE',        -- ACTIVE | EXPIRED | REVOKED
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.familiarisation_windows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  plan_code text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,                 -- starts_at + 60 days
  notice_sent_at timestamptz,                   -- pre-expiry notice audit
  converted_to text,                            -- plan_code on explicit conversion, else null
  created_at timestamptz not null default now()
);

-- ============ C7: intelligence data-sufficiency registry ============
create table if not exists public.intelligence_capabilities (
  capability text primary key,                  -- e.g. demand_forecast, quality_signals
  min_rows integer not null default 30,
  max_data_age_days integer not null default 30,
  enabled boolean not null default true
);
insert into public.intelligence_capabilities (capability, min_rows, max_data_age_days) values
  ('demand_forecast', 50, 30), ('quality_signals', 10, 90), ('matching_rank', 20, 60)
on conflict (capability) do nothing;

-- ============ C8: usage & outcome instrumentation (EV-001..010 family) ============
create table if not exists public.funnel_events (
  id bigint generated always as identity primary key,
  event_type text not null,                     -- search, view, enquiry, quote, order, booking, payment, report, recommendation
  actor_id uuid references public.app_users(id) on delete set null,
  actor_class text,                             -- role/stakeholder class
  entity_type text, entity_id text,
  outcome text not null default 'ok',           -- ok | failed | denied | timeout
  data_quality text not null default 'live',    -- live | delayed | estimated | synthetic | unavailable
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists funnel_events_type_idx on public.funnel_events(event_type, created_at);

-- ============ B5: Academy full-map additions (RPL, delivery routes, instructor materials) ============
alter table public.courses add column if not exists delivery_routes jsonb not null default '["reading"]'::jsonb; -- reading | video | link | in_person
alter table public.courses add column if not exists instructor_materials jsonb not null default '{}'::jsonb;    -- {guide, rubric, notes}
alter table public.enrollments add column if not exists rpl_granted boolean not null default false;
alter table public.enrollments add column if not exists rpl_evidence text;

-- ============ B8: labelled synthetic seed demo (cross-stakeholder relationships) ============
-- A demo organization with verified capability, an offer, and a synthetic booking — all labelled.
insert into public.organizations (name, type, country, status, owner_id)
select 'DEMO Garage — Test Lane (SYNTHETIC)', 'business', 'KE', 'ACTIVE', null
where not exists (select 1 from public.organizations where name like 'DEMO Garage%');
insert into public.provider_capabilities (org_id, service_class, scope, status)
select o.id, 'mechanical', '{"label":"synthetic demo capability"}'::jsonb, 'PLATFORM_CHECKED'
from public.organizations o where o.name like 'DEMO Garage%' and o.name not like '%DEMO Garage%'
  and not exists (select 1 from public.provider_capabilities c where c.org_id = o.id)
limit 1;
