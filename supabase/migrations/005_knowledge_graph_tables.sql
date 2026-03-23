-- Knowledge Network Graph & Daily Growth Web tables

-- Extracted concepts from daily logs (parsed by Gemini)
create table knowledge_nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  label text not null,
  node_type text not null check (node_type in ('word', 'concept', 'skill')),
  category text,
  source text not null check (source in ('wordforge', 'slight_edge', 'reflection', 'mindforge', 'quest')),
  source_id text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  mention_count int not null default 1,
  mastery_score float,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Edges between knowledge nodes
create table knowledge_edges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  source_node_id uuid references knowledge_nodes on delete cascade not null,
  target_node_id uuid references knowledge_nodes on delete cascade not null,
  edge_type text not null check (edge_type in (
    'co_occurrence', 'semantic', 'vocab_concept', 'prerequisite'
  )),
  weight float not null default 1.0,
  created_at timestamptz default now(),
  unique(source_node_id, target_node_id, edge_type)
);

-- Daily growth snapshots for the growth web
create table daily_growth_nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  log_date date not null,
  productivity_score float,
  concepts_learned text[] default '{}',
  habits_completed text[] default '{}',
  quests_completed int default 0,
  words_reviewed int default 0,
  focus_minutes int default 0,
  energy_rating int,
  log_summary text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  unique(user_id, log_date)
);

-- Enable RLS
alter table knowledge_nodes enable row level security;
alter table knowledge_edges enable row level security;
alter table daily_growth_nodes enable row level security;

-- RLS policies
create policy "Users see own knowledge nodes"
  on knowledge_nodes for all using (auth.uid() = user_id);
create policy "Users see own knowledge edges"
  on knowledge_edges for all using (auth.uid() = user_id);
create policy "Users see own daily growth"
  on daily_growth_nodes for all using (auth.uid() = user_id);

-- Indexes
create index idx_knowledge_nodes_user on knowledge_nodes(user_id);
create index idx_knowledge_nodes_type on knowledge_nodes(user_id, node_type);
create index idx_knowledge_nodes_label on knowledge_nodes(user_id, label);
create index idx_knowledge_edges_source on knowledge_edges(source_node_id);
create index idx_knowledge_edges_target on knowledge_edges(target_node_id);
create index idx_knowledge_edges_user on knowledge_edges(user_id);
create index idx_daily_growth_user_date on daily_growth_nodes(user_id, log_date);
