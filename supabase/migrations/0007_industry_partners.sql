
-- 0007_industry_partners.sql — S1: markets/brands declaration + distribution relationships (all additive)
alter table public.organizations add column if not exists markets jsonb not null default '[]'::jsonb;   -- countries/regions served
alter table public.organizations add column if not exists brands jsonb not null default '[]'::jsonb;    -- brands represented
alter table public.organizations add column if not exists product_categories jsonb not null default '[]'::jsonb;

create table if not exists public.distribution_links (
  id uuid primary key default gen_random_uuid(),
  from_org_id uuid not null references public.organizations(id) on delete cascade,
  to_org_id uuid not null references public.organizations(id) on delete cascade,
  link_type text not null default 'supplies',        -- supplies | distributes | authorizes | services
  scope jsonb not null default '{}'::jsonb,          -- brands/categories/territories
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now()
);
