-- ============================================================
-- SPAREKEI AI REASONING & LEARNING ENGINE — cognitive layer
-- Consumes existing business tables; writes only to ai_* tables.
-- LLM is never source of truth: all figures come from read-only
-- deterministic queries; every run is logged with provenance.
-- ============================================================
create extension if not exists vector;

-- ---------- CONVERSATIONS (Reasoning Console) ----------
create table if not exists public.ai_conversations (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid references public.app_users(id),
  question text not null,
  answer text not null,
  citations jsonb not null default '[]'::jsonb,   -- [{table, description, rows}]
  model text not null default 'gpt-4.1',
  tokens_in int default 0,
  tokens_out int default 0,
  cost_usd numeric(10,6) default 0,
  latency_ms int default 0,
  created_at timestamptz not null default now()
);

-- ---------- TOOL RUN LOG (provenance / governance surface) ----------
create table if not exists public.ai_tool_runs (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references public.ai_conversations(id) on delete cascade,
  tool_name text not null,
  tool_args jsonb not null default '{}'::jsonb,
  result_summary text not null,
  row_count int default 0,
  latency_ms int default 0,
  created_at timestamptz not null default now()
);
create index if not exists ai_tool_runs_conv_idx on public.ai_tool_runs(conversation_id);

-- ---------- LEARNINGS (human approval queue) ----------
create table if not exists public.ai_learnings (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  body text not null,
  source_refs jsonb not null default '[]'::jsonb,  -- verified outcome ids/tables
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  confidence text not null default 'medium',
  proposed_by text not null default 'engine',
  decided_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists ai_learnings_status_idx on public.ai_learnings(status);

-- ---------- ALERTS (predictive, approval-gated) ----------
create table if not exists public.ai_alerts (
  id uuid primary key default uuid_generate_v4(),
  alert_type text not null,               -- maintenance_due | stockout_risk | rating_decay | demand_spike | anomaly
  severity text not null default 'info' check (severity in ('info','warning','critical')),
  title text not null,
  message text not null,
  source_refs jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending','acknowledged','dismissed')),
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz
);
create index if not exists ai_alerts_status_idx on public.ai_alerts(status);

-- ---------- KNOWLEDGE BASE (pgvector RAG) ----------
create table if not exists public.knowledge_documents (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  content text not null,
  embedding vector(1536),
  source text not null default 'admin',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists knowledge_documents_embedding_idx on public.knowledge_documents
  using hnsw (embedding vector_cosine_ops);

-- Vector similarity search (called by the ai-reason edge function)
create or replace function public.match_knowledge(query_embedding vector(1536), match_count int default 5)
returns table (id uuid, title text, content text, similarity float)
language sql stable as $$
  select id, title, content, 1 - (embedding <=> query_embedding) as similarity
  from public.knowledge_documents
  where embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- ---------- RLS: admin-only across the entire cognitive layer ----------
alter table public.ai_conversations enable row level security;
alter table public.ai_tool_runs enable row level security;
alter table public.ai_learnings enable row level security;
alter table public.ai_alerts enable row level security;
alter table public.knowledge_documents enable row level security;

create policy ai_conversations_admin on public.ai_conversations for all using (public.is_admin()) with check (public.is_admin());
create policy ai_tool_runs_admin on public.ai_tool_runs for all using (public.is_admin()) with check (public.is_admin());
create policy ai_learnings_admin on public.ai_learnings for all using (public.is_admin()) with check (public.is_admin());
create policy ai_alerts_admin on public.ai_alerts for all using (public.is_admin()) with check (public.is_admin());
create policy knowledge_admin on public.knowledge_documents for all using (public.is_admin()) with check (public.is_admin());

-- Grant execute on the match function to authenticated (admin check happens inside edge function before calling)
grant execute on function public.match_knowledge(vector, int) to authenticated;
grant execute on function public.match_knowledge(vector, int) to anon;
