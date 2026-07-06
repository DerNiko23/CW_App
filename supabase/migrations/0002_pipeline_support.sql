-- Discovery-Pipeline (Phase 1, MASTERPLAN.md §2) – Unterstützungstabellen.
-- Wie 0001: einfach im Supabase SQL Editor ausführen (kein CLI-Linking).

-- Suchqueries pro Mythos (Discovery generiert Queries daraus; leer = Fallback auf claim_pattern).
alter table myths add column if not exists search_queries jsonb not null default '[]'::jsonb;

-- Skip+Log: Videos, die die Pipeline aus gutem Grund nicht weiterverarbeitet
-- (kein Transkript, themenfremd, keine extrahierbare Aussage, Fehler). Bewusst kein
-- Eintrag in `videos`, weil diese Fälle nie Inbox-Kandidaten werden.
create type discovery_skip_reason as enum ('no_transcript', 'off_topic', 'no_claims', 'error');

create table discovery_log (
  id uuid primary key default gen_random_uuid(),
  platform video_platform not null default 'youtube',
  external_id text not null,
  url text not null,
  reason discovery_skip_reason not null,
  detail text,
  created_at timestamptz not null default now()
);

create index discovery_log_external_id_idx on discovery_log (external_id);
create index discovery_log_created_at_idx on discovery_log (created_at desc);

-- YouTube-Quota-Zähler pro Tag (search.list = 100 Units, videos.list = 1 Unit),
-- damit Discovery-Läufe das 10.000-Units/Tag-Budget nie überschreiten.
create table youtube_quota_usage (
  usage_date date primary key,
  units_used integer not null default 0
);

alter table discovery_log enable row level security;
alter table youtube_quota_usage enable row level security;
