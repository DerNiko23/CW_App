-- Faktencheck-Inbox – initiales Schema (MASTERPLAN.md §7)
-- Einfach im Supabase SQL Editor ausführen (kein Supabase-CLI-Linking, Anti-Overhead-Prinzip).

create extension if not exists pgcrypto;

create type video_platform as enum ('youtube', 'tiktok', 'instagram');
create type video_status as enum ('new', 'accepted', 'done', 'rejected');
create type feedback_action as enum ('accept', 'reject');

create table myths (
  id uuid primary key default gen_random_uuid(),
  claim_pattern text not null,
  category text not null,
  verdict text not null,
  sources_json jsonb not null default '[]'::jsonb,
  covered_by_chris boolean not null default false,
  chris_video_url text,
  created_at timestamptz not null default now()
);

create table videos (
  id uuid primary key default gen_random_uuid(),
  platform video_platform not null,
  external_id text not null,
  url text not null,
  title text not null,
  channel text,
  published_at timestamptz,
  thumbnail text,
  status video_status not null default 'new',
  done_at timestamptz,
  created_at timestamptz not null default now(),
  unique (platform, external_id)
);

create table claims (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id) on delete cascade,
  quote text not null,
  timestamp_s integer,
  normalized_claim text,
  myth_id uuid references myths(id),
  confidence numeric(5, 2),
  evidence_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table snapshots (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id) on delete cascade,
  views bigint not null default 0,
  likes bigint not null default 0,
  comments bigint not null default 0,
  captured_at timestamptz not null default now()
);

create table feedback (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id) on delete cascade,
  action feedback_action not null,
  reason text,
  created_at timestamptz not null default now()
);

create table weights (
  key text primary key,
  value numeric not null
);

-- Score-Gewichte aus MASTERPLAN §4 (Reach 0.30, Velocity 0.30, Confidence 0.20, Engagement 0.10, Novelty 0.10)
insert into weights (key, value) values
  ('reach', 0.30),
  ('velocity', 0.30),
  ('confidence', 0.20),
  ('engagement', 0.10),
  ('novelty', 0.10)
on conflict (key) do nothing;

create index videos_status_idx on videos (status);
create index snapshots_video_id_captured_at_idx on snapshots (video_id, captured_at desc);
create index claims_video_id_idx on claims (video_id);
create index claims_myth_id_idx on claims (myth_id);

-- RLS aktiviert, bewusst ohne Policies: Zugriff ausschließlich serverseitig über den
-- Supabase Service-Role-Key (Ein-Nutzer-App ohne Supabase-Auth, kein Anon-Zugriff nötig).
alter table myths enable row level security;
alter table videos enable row level security;
alter table claims enable row level security;
alter table snapshots enable row level security;
alter table feedback enable row level security;
alter table weights enable row level security;
