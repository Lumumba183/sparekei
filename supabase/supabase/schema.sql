-- ============================================================
-- SPAREKEI — Automotive Intelligence Platform | Supabase schema
-- Run in: Supabase Dashboard > SQL Editor. Idempotent (re-runnable).
-- ============================================================
create extension if not exists "uuid-ossp";

create type user_role as enum ('owner','mechanic','vendor','wholesaler','manufacturer','fleet_manager','service_node','admin');
create type service_class as enum ('A','B','C','D');
create type order_status as enum ('requested','accepted','in_progress','completed','cancelled');
create type condition_type as enum ('NEW_OEM','CERTIFIED','REFURBISHED','USED');

-- ---------- USERS ----------
create table if not exists public.app_users (
  id uuid primary key default uuid_generate_v4(),
  clerk_user_id text unique,
  email text unique not null,
  full_name text,
  role user_role not null default 'owner',
  service_class service_class,
  phone text,
  avatar_url text,
  city text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- VEHICLES ----------
create table if not exists public.vehicles (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.app_users(id) on delete cascade,
  make text not null, model text not null, year int,
  vin text unique, registration text, engine_number text, chassis text, color text,
  region text default 'KE',
  health_score int not null default 90 check (health_score between 0 and 100),
  mileage_km int not null default 0,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists vehicles_owner_idx on public.vehicles(owner_id);

-- ---------- DIGITAL VEHICLE PASSPORT LEDGER ----------
create table if not exists public.passport_stamps (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  service_provider_id uuid references public.app_users(id),
  stamp_type text not null,               -- cosmetic | structural | maintenance | compliance
  title text not null,
  description text,
  parts_used jsonb default '[]'::jsonb,
  mileage_km int,
  verified boolean not null default false,
  signature text,
  stamped_at timestamptz not null default now()
);
create index if not exists passport_vehicle_idx on public.passport_stamps(vehicle_id);

-- ---------- USNA SERVICE NODES (Class A-D) ----------
create table if not exists public.service_nodes (
  id uuid primary key default uuid_generate_v4(),
  operator_id uuid not null references public.app_users(id) on delete cascade,
  business_name text not null,
  class service_class not null,
  description text,
  specializations text[] default '{}',
  base_price_min numeric(12,2) default 0,
  base_price_max numeric(12,2) default 0,
  rating numeric(2,1) not null default 5.0,
  reviews_count int not null default 0,
  bay_count int, bays_available int,      -- Class D only
  verified boolean not null default false,
  location text,
  distance_km numeric(5,2) default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.service_items (
  id uuid primary key default uuid_generate_v4(),
  node_id uuid not null references public.service_nodes(id) on delete cascade,
  name text not null,
  description text,
  category text not null,
  base_price numeric(12,2) not null default 0,
  duration_minutes int default 60,
  stamp_type text not null default 'maintenance',
  created_at timestamptz not null default now()
);

create table if not exists public.service_orders (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references public.app_users(id),
  node_id uuid not null references public.service_nodes(id),
  vehicle_id uuid references public.vehicles(id),
  service_item_id uuid references public.service_items(id),
  status order_status not null default 'requested',
  scheduled_at timestamptz,
  completed_at timestamptz,
  total_amount numeric(12,2) default 0,
  escrow_status text not null default 'held',   -- held | released | immediate
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- MARKETPLACE ----------
create table if not exists public.marketplace_listings (
  id uuid primary key default uuid_generate_v4(),
  vendor_id uuid not null references public.app_users(id),
  part_sku text not null,
  part_name text not null,
  category_slug text,
  brand_name text,
  aliases text[] default '{}',            -- cross-market names (Vitz / Yaris / Scion iA)
  part_condition condition_type not null default 'NEW_OEM',
  unit_price numeric(12,2) not null default 0,
  wholesale_price numeric(12,2),
  bulk_price numeric(12,2),
  stock_level int not null default 0,
  image_url text,
  verified boolean not null default false,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  unique(vendor_id, part_sku)
);

create table if not exists public.product_orders (
  id uuid primary key default uuid_generate_v4(),
  buyer_id uuid not null references public.app_users(id),
  vendor_id uuid not null references public.app_users(id),
  listing_id uuid not null references public.marketplace_listings(id),
  quantity int not null default 1,
  total_amount numeric(12,2) not null,
  status order_status not null default 'requested',
  routing_mode text not null default 'ESCROW',
  created_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  item_type text not null check (item_type in ('part','service')),
  listing_id uuid references public.marketplace_listings(id),
  service_item_id uuid references public.service_items(id),
  node_id uuid references public.service_nodes(id),
  quantity int not null default 1,
  unit_price numeric(12,2) not null default 0,
  added_at timestamptz not null default now()
);

create table if not exists public.rfq_requests (
  id uuid primary key default uuid_generate_v4(),
  buyer_id uuid not null references public.app_users(id),
  part_details jsonb not null,
  quantity int not null default 1,
  target_price numeric(12,2),
  delivery_timeline text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  reviewer_id uuid not null references public.app_users(id),
  target_user_id uuid references public.app_users(id),
  target_node_id uuid references public.service_nodes(id),
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, read);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.app_users enable row level security;
alter table public.vehicles enable row level security;
alter table public.passport_stamps enable row level security;
alter table public.service_nodes enable row level security;
alter table public.service_items enable row level security;
alter table public.service_orders enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.product_orders enable row level security;
alter table public.cart_items enable row level security;
alter table public.rfq_requests enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists (select 1 from public.app_users
    where clerk_user_id = auth.jwt() ->> 'sub' and role = 'admin');
$$;

create policy app_users_select on public.app_users
  for select using (clerk_user_id = auth.jwt() ->> 'sub' or public.is_admin());
create policy app_users_update on public.app_users
  for update using (clerk_user_id = auth.jwt() ->> 'sub' or public.is_admin());
create policy app_users_admin_insert on public.app_users
  for insert with check (public.is_admin());

create policy vehicles_select on public.vehicles
  for select using (owner_id in (select id from public.app_users where clerk_user_id = auth.jwt() ->> 'sub') or public.is_admin());
create policy vehicles_insert on public.vehicles
  for insert with check (owner_id in (select id from public.app_users where clerk_user_id = auth.jwt() ->> 'sub'));
create policy vehicles_update on public.vehicles
  for update using (owner_id in (select id from public.app_users where clerk_user_id = auth.jwt() ->> 'sub') or public.is_admin());
create policy vehicles_delete on public.vehicles
  for delete using (owner_id in (select id from public.app_users where clerk_user_id = auth.jwt() ->> 'sub'));

create policy passport_select on public.passport_stamps
  for select using (
    vehicle_id in (select v.id from public.vehicles v join public.app_users u on u.id = v.owner_id where u.clerk_user_id = auth.jwt() ->> 'sub')
    or service_provider_id in (select id from public.app_users where clerk_user_id = auth.jwt() ->> 'sub')
    or public.is_admin());
create policy passport_insert on public.passport_stamps
  for insert with check (service_provider_id in (select id from public.app_users where clerk_user_id = auth.jwt() ->> 'sub') or public.is_admin());

create policy listings_select on public.marketplace_listings for select using (true);
create policy listings_insert on public.marketplace_listings
  for insert with check (vendor_id in (select id from public.app_users where clerk_user_id = auth.jwt() ->> 'sub' and role in ('vendor','wholesaler','manufacturer')));
create policy listings_update on public.marketplace_listings
  for update using (vendor_id in (select id from public.app_users where clerk_user_id = auth.jwt() ->> 'sub') or public.is_admin());
create policy listings_delete on public.marketplace_listings
  for delete using (vendor_id in (select id from public.app_users where clerk_user_id = auth.jwt() ->> 'sub') or public.is_admin());

create policy nodes_select on public.service_nodes for select using (true);
create policy nodes_insert on public.service_nodes
  for insert with check (operator_id in (select id from public.app_users where clerk_user_id = auth.jwt() ->> 'sub'));
create policy nodes_update on public.service_nodes
  for update using (operator_id in (select id from public.app_users where clerk_user_id = auth.jwt() ->> 'sub') or public.is_admin());
create policy nodes_delete on public.service_nodes
  for delete using (operator_id in (select id from public.app_users where clerk_user_id = auth.jwt() ->> 'sub') or public.is_admin());

create policy service_items_select on public.service_items for select using (true);
create policy service_items_write on public.service_items
  for all using (
    node_id in (select n.id from public.service_nodes n join public.app_users u on u.id = n.operator_id where u.clerk_user_id = auth.jwt() ->> 'sub')
    or public.is_admin());

create policy service_orders_select on public.service_orders
  for select using (
    customer_id in (select id from public.app_users where clerk_user_id = auth.jwt() ->> 'sub')
    or node_id in (select n.id from public.service_nodes n join public.app_users u on u.id = n.operator_id where u.clerk_user_id = auth.jwt() ->> 'sub')
    or public.is_admin());
create policy service_orders_insert on public.service_orders
  for insert with check (customer_id in (select id from public.app_users where clerk_user_id = auth.jwt() ->> 'sub'));

create policy product_orders_select on public.product_orders
  for select using (
    buyer_id in (select id from public.app_users where clerk_user_id = auth.jwt() ->> 'sub')
    or vendor_id in (select id from public.app_users where clerk_user_id = auth.jwt() ->> 'sub')
    or public.is_admin());
create policy product_orders_insert on public.product_orders
  for insert with check (buyer_id in (select id from public.app_users where clerk_user_id = auth.jwt() ->> 'sub'));

create policy cart_all on public.cart_items
  for all using (user_id in (select id from public.app_users where clerk_user_id = auth.jwt() ->> 'sub'));

create policy rfq_select on public.rfq_requests
  for select using (buyer_id in (select id from public.app_users where clerk_user_id = auth.jwt() ->> 'sub') or public.is_admin());
create policy rfq_insert on public.rfq_requests
  for insert with check (buyer_id in (select id from public.app_users where clerk_user_id = auth.jwt() ->> 'sub'));

create policy reviews_select on public.reviews for select using (true);
create policy reviews_insert on public.reviews
  for insert with check (reviewer_id in (select id from public.app_users where clerk_user_id = auth.jwt() ->> 'sub'));

create policy notifications_all on public.notifications
  for all using (user_id in (select id from public.app_users where clerk_user_id = auth.jwt() ->> 'sub'));

-- ============================================================
-- PROVISIONING + ADMIN BOOTSTRAP
-- ============================================================
create or replace function public.provision_user(p_clerk_id text, p_email text, p_full_name text, p_role text default 'owner')
returns uuid language plpgsql security definer as $$
declare v_id uuid;
begin
  insert into public.app_users (clerk_user_id, email, full_name, role)
  values (p_clerk_id, lower(p_email), p_full_name, coalesce(p_role::user_role, 'owner'))
  on conflict (email) do update set clerk_user_id = excluded.clerk_user_id
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.bootstrap_admin(p_clerk_id text)
returns void language plpgsql security definer as $$
begin
  perform public.provision_user(p_clerk_id, 'mwandabrands@gmail.com', 'Platform Admin', 'admin');
end $$;

-- ============================================================
-- SEED DATA (demo service nodes, services, marketplace listings)
-- ============================================================
insert into public.app_users (clerk_user_id, email, full_name, role, service_class, is_active)
values
  ('seed_node_a','seed-a@sparekei.internal','Premium Car Care Operator','service_node','A',true),
  ('seed_node_b','seed-b@sparekei.internal','AutoMax Operator','service_node','B',true),
  ('seed_node_c','seed-c@sparekei.internal','TechDrive Operator','service_node','C',true),
  ('seed_node_d','seed-d@sparekei.internal','MegaFleet Operator','service_node','D',true),
  ('seed_vendor','admin@sparekei.internal','Sparekei Parts Store','vendor',null,true)
on conflict (email) do nothing;

insert into public.service_nodes (operator_id, business_name, class, description, specializations, base_price_min, base_price_max, rating, reviews_count, location, distance_km, bay_count, bays_available, verified)
select u.id, v.business_name, v.class::service_class, v.description, v.specializations, v.pmin, v.pmax, v.rating, v.reviews, v.location, v.km,
  case when v.class = 'D' then 12 end, case when v.class = 'D' then 4 end, true
from public.app_users u
join (values
  ('seed-a@sparekei.internal','Premium Car Care Nairobi','A','Aesthetic & Care node - detailing, tint, ceramic coating', array['Detailing','Ceramic Coating','Window Tint','Interior Customization'], 2500, 15000, 4.9, 234, 'Westlands Business Park, Nairobi', 2.3),
  ('seed-b@sparekei.internal','AutoMax Garage & Bodyshop','B','Structural Restoration node - panel beating & spray painting', array['Panel Beating','Spray Painting','Dent Removal','Chassis Alignment'], 5000, 60000, 4.7, 189, 'Industrial Area, Nairobi', 5.1),
  ('seed-c@sparekei.internal','TechDrive Diagnostics','C','Precision Diagnostics hub - auto electrics, ECU, AC repair', array['Auto Electricians','ECU Tuners','AC Repair','Tyre & Wheel Alignment'], 3500, 40000, 4.8, 312, 'Kilimani, Nairobi', 3.4),
  ('seed-d@sparekei.internal','MegaFleet Enterprise Workshops','D','Multi-bay enterprise workshop serving fleet operators', array['Multi-bay Service','Heavy Commercial','Fleet Maintenance'], 8000, 250000, 4.6, 98, 'Mombasa Road, Nairobi', 8.7)
) as v(email, business_name, class, description, specializations, pmin, pmax, rating, reviews, location, km)
  on u.email = v.email
where not exists (select 1 from public.service_nodes sn where sn.business_name = v.business_name);

insert into public.service_items (node_id, name, description, category, base_price, duration_minutes, stamp_type)
select n.id, s.name, s.description, s.category, s.price, s.mins, s.stamp
from public.service_nodes n
join (values
  ('Premium Car Care Nairobi','Full Detailing','Interior + exterior deep detail with paint decontamination','Detailing', 6500, 180, 'cosmetic'),
  ('Premium Car Care Nairobi','Ceramic Coating','9H ceramic coating, 3-year durability','Ceramic Coating', 12000, 240, 'cosmetic'),
  ('AutoMax Garage & Bodyshop','Panel Beating','Structural repair of damaged panels','Structural Restoration', 15000, 480, 'structural'),
  ('AutoMax Garage & Bodyshop','Spray Painting','Full respray in factory colour code','Structural Restoration', 45000, 720, 'structural'),
  ('TechDrive Diagnostics','AC System Diagnosis & Recharge','Leak detection, recharge, compressor health check','Precision Diagnostics', 3500, 90, 'maintenance'),
  ('TechDrive Diagnostics','ECU Diagnostics','Full ECU scan with live-data interpretation','Precision Diagnostics', 5000, 60, 'maintenance'),
  ('MegaFleet Enterprise Workshops','Fleet Bay Service','High-velocity multi-bay service for fleet vehicles','Enterprise', 8000, 120, 'maintenance')
) as s(node_name, name, description, category, price, mins, stamp)
  on n.business_name = s.node_name
where not exists (select 1 from public.service_items si where si.node_id = n.id and si.name = s.name);

insert into public.marketplace_listings (vendor_id, part_sku, part_name, category_slug, brand_name, aliases, part_condition, unit_price, wholesale_price, bulk_price, stock_level, verified, featured)
select u.id, l.sku, l.name, l.cat, l.brand, l.aliases, l.cond::condition_type, l.price, l.ws, l.bulk, l.stock, true, l.featured
from public.app_users u
join (values
  ('admin@sparekei.internal','SKU-AC-001','AC Compressor - Toyota 1KD/2KD','AC & Climate','Toyota', array['A/C Compressor','Compresor de Aire'], 'NEW_OEM', 28500, 24000, 21000, 14, true),
  ('admin@sparekei.internal','SKU-BRK-014','Brake Pad Set - Land Cruiser Prado','Braking','Akebono', array['Brake Pads','Pastillas de Freno'], 'NEW_OEM', 4200, 3500, 3000, 60, false),
  ('admin@sparekei.internal','SKU-FLT-007','Oil Filter - Universal Spin-on','Filters','Bosch', array['Oil Filter','Filtro de Aceite'], 'CERTIFIED', 850, 650, 500, 200, false),
  ('admin@sparekei.internal','SKU-BAT-021','Battery 12V 75Ah AGM','Electrical','Varta', array['Car Battery','Bateria'], 'NEW_OEM', 14500, 12800, 11500, 22, true)
) as l(vemail, sku, name, cat, brand, aliases, cond, price, ws, bulk, stock, featured)
  on u.email = l.vemail
where not exists (select 1 from public.marketplace_listings ml where ml.part_sku = l.sku);

-- ---------- SPA MODE: users upsert their own app_users row client-side ----------
drop policy if exists app_users_self_upsert on public.app_users;
create policy app_users_self_upsert on public.app_users
  for insert with check (clerk_user_id = auth.jwt() ->> 'sub');
create policy app_users_self_update on public.app_users
  for update using (clerk_user_id = auth.jwt() ->> 'sub');
