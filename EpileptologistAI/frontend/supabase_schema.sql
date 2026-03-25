-- ============================================================
-- EpileptologistAI Database Schema
-- ============================================================

-- Sessions: one row per 10-minute monitoring session
create table sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  started_at timestamptz default now() not null,
  ended_at timestamptz,
  total_windows int default 0,
  avg_probability float,
  final_prediction int, -- 0 = no seizure, 1 = seizure
  status text default 'recording' check (status in ('recording', 'completed', 'cancelled')),
  created_at timestamptz default now() not null
);

-- Predictions: one row per 6-second window within a session
create table predictions (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references sessions(id) on delete cascade not null,
  window_number int not null,
  prediction int not null, -- 0 or 1
  probability float not null,
  created_at timestamptz default now() not null
);

-- Indexes for fast lookups
create index idx_sessions_user_id on sessions(user_id);
create index idx_predictions_session_id on predictions(session_id);

-- Row Level Security: users can only see their own data
alter table sessions enable row level security;
alter table predictions enable row level security;

create policy "Users can view their own sessions"
  on sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own sessions"
  on sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own sessions"
  on sessions for update
  using (auth.uid() = user_id);

create policy "Users can view predictions for their sessions"
  on predictions for select
  using (session_id in (select id from sessions where user_id = auth.uid()));

create policy "Users can insert predictions for their sessions"
  on predictions for insert
  with check (session_id in (select id from sessions where user_id = auth.uid()));
