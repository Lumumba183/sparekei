-- 0005_academy_full.sql — completes the Academy per the client's 17 Oct requirement list
-- eligibility · modules · exams · question banks · pass/retake rules · practical assessment hook ·
-- credentials (issue/verify/renew) · appeals · profile badges. All additive.

alter table public.courses add column if not exists allowed_roles text[] not null default '{mechanic,service_node_operator,vendor,wholesaler,manufacturer,fleet_manager,admin,owner}';
alter table public.courses add column if not exists prerequisite_course_id uuid references public.courses(id) on delete set null;
alter table public.courses add column if not exists pass_mark numeric not null default 70;   -- percent
alter table public.courses add column if not exists max_attempts integer not null default 3;
alter table public.courses add column if not exists retake_cooldown_hours integer not null default 24;

create table if not exists public.question_banks (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  module_index integer not null default 0,        -- which module the questions belong to
  questions jsonb not null,                       -- [{q, choices[4], answer: 0-3}]
  created_at timestamptz not null default now()
);

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  attempt_no integer not null default 1,
  answers jsonb not null default '[]'::jsonb,
  score numeric,                                  -- percent
  passed boolean,
  appeal_state text not null default 'NONE',      -- NONE | PENDING | UPHELD | REJECTED
  appeal_reason text,
  created_at timestamptz not null default now()
);
create index if not exists exam_attempts_user_idx on public.exam_attempts(course_id, user_id);

create table if not exists public.credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  credential_number text not null unique,         -- SPK-ACAD-XXXXXX — verifiable
  level text not null default 'course',
  issued_at timestamptz not null default now(),
  expires_at timestamptz,                         -- renewal cycle
  revoked boolean not null default false,
  renewed_from uuid references public.credentials(id) on delete set null
);
-- profile badge = active, non-revoked credential (rendered in UI from this table)

create table if not exists public.practical_assessments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  assessor_id uuid references public.app_users(id) on delete set null,
  checklist jsonb not null default '[]'::jsonb,   -- [{item, passed, note}]
  result text not null default 'PENDING',         -- PENDING | PASSED | FAILED
  created_at timestamptz not null default now()
);

-- Founding tiers + Community moderation (small additive columns)
alter table public.founding_members add column if not exists tier text not null default 'founder';
alter table public.founding_members add column if not exists benefits jsonb not null default '{}'::jsonb;
alter table public.community_posts add column if not exists status text not null default 'VISIBLE'; -- VISIBLE | HIDDEN | UNDER_REVIEW
alter table public.community_posts add column if not exists moderated_by uuid references public.app_users(id) on delete set null;

-- Seed question banks (synthetic, clearly labelled content)
insert into public.question_banks (course_id, module_index, questions)
select c.id, 0, '[
 {"q":"What is the primary cause of brake fade?","choices":["Worn discs","Overheated friction material","Low brake fluid only","Air in ABS module"],"answer":1},
 {"q":"Minimum safe brake pad thickness is generally…","choices":["0.1 mm","1.0 mm","3.0 mm","10.0 mm"],"answer":2},
 {"q":"Spongy pedal feel most commonly indicates…","choices":["Worn pads","Air in the hydraulic circuit","Warped discs","Overheating"],"answer":1}
]'::jsonb from public.courses c where c.title = 'Brake System Fundamentals'
and not exists (select 1 from public.question_banks qb where qb.course_id = c.id);
insert into public.question_banks (course_id, module_index, questions)
select c.id, 0, '[
 {"q":"A material scope change after customer acceptance requires…","choices":["Verbal agreement","A new approved quote version","Nothing if small","Invoice after only"],"answer":1},
 {"q":"Before/after evidence primarily protects…","choices":["The garage only","The customer only","Both parties in a dispute","No one"],"answer":2}
]'::jsonb from public.courses c where c.title = 'Customer Communication for Garages'
and not exists (select 1 from public.question_banks qb where qb.course_id = c.id);
insert into public.question_banks (course_id, module_index, questions)
select c.id, 0, '[
 {"q":"OE and aftermarket part numbers that look similar…","choices":["Are always equivalent","Need source-verified equivalence","Mean the same part","Can be merged freely"],"answer":1},
 {"q":"Fitment evidence should state…","choices":["Only the car model name","Configuration, source and scope","The seller opinion","Nothing, logos suffice"],"answer":1}
]'::jsonb from public.courses c where c.title = 'Parts Identification Basics'
and not exists (select 1 from public.question_banks qb where qb.course_id = c.id);
