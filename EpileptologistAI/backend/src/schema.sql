-- Core schema for auth-linked users, sessions, predictions, devices, and events.
-- In Supabase, email/password credentials are stored in auth.users.

create extension if not exists pgcrypto;

-- App user profile data linked 1:1 to auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Analysis sessions shown in frontend history
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  total_windows integer not null default 0,
  avg_probability double precision,
  final_prediction integer,
  status text not null default 'recording'
    check (status in ('recording', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

-- Per-window model outputs for a session
create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  window_number integer not null,
  prediction integer not null check (prediction in (0, 1)),
  probability double precision not null,
  created_at timestamptz not null default now(),
  unique (session_id, window_number)
);

-- Device registry
create table if not exists public.devices (
  id text primary key,
  name text,
  owner_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Raw/derived telemetry and events
create table if not exists public.events (
  id bigserial primary key,
  device_id text references public.devices(id) on delete set null,
  ts timestamptz not null default now(),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_sessions_user_created_at on public.sessions (user_id, created_at desc);
create index if not exists idx_predictions_session_window on public.predictions (session_id, window_number);
create index if not exists idx_events_device_ts on public.events (device_id, ts desc);

-- Keep profiles.updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Auto-create profile rows when new auth users sign up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
