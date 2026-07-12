-- ClipScry database schema
-- Source of truth for what the Supabase database looks like.
-- Applied in the Supabase SQL Editor on 2026-07-06. Append future changes below with a dated comment.

-- Table 1: one row per video file
create table clips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  filename text not null,
  folder_path text,
  duration_seconds numeric,
  recorded_at timestamptz,
  clip_type text not null default 'session'
    check (clip_type in ('session', 'replay')),
  status text not null default 'pending'
    check (status in ('pending', 'transcribing', 'ready', 'error')),
  created_at timestamptz not null default now(),
  unique (user_id, folder_path, filename)
);

-- Table 2: one row per chunk of speech in a clip
create table transcript_segments (
  id bigint generated always as identity primary key,
  clip_id uuid not null references clips (id) on delete cascade,
  start_seconds numeric not null,
  end_seconds numeric not null,
  text text not null,
  fts tsvector generated always as (to_tsvector('english', text)) stored
);

-- Indexes: fast lookups per clip, per user, and fast text search
create index on clips (user_id);
create index on transcript_segments (clip_id);
create index on transcript_segments using gin (fts);

-- Lock both tables down: only the logged-in owner can touch their rows
alter table clips enable row level security;
alter table transcript_segments enable row level security;

create policy "own clips" on clips
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own segments" on transcript_segments
  for all using (
    exists (select 1 from clips where clips.id = clip_id and clips.user_id = auth.uid())
  ) with check (
    exists (select 1 from clips where clips.id = clip_id and clips.user_id = auth.uid())
  );

-- Added 2026-07-08: Saved Moments ("editing gold pile")
create table saved_moments (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) default auth.uid(),
  clip_id uuid not null references clips (id) on delete cascade,
  start_seconds numeric not null,
  end_seconds numeric,
  text text not null,
  note text,
  created_at timestamptz not null default now()
);

create index on saved_moments (user_id, created_at desc);

alter table saved_moments enable row level security;

create policy "own moments" on saved_moments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Added 2026-07-11: clip export jobs (helper cuts .mp4 with ffmpeg, local, no API)
create table export_jobs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) default auth.uid(),
  clip_id uuid not null references clips (id) on delete cascade,
  start_seconds numeric not null,
  end_seconds numeric,
  pad_before numeric not null default 5,
  pad_after numeric not null default 3,
  label text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'done', 'error')),
  output_path text,
  created_at timestamptz not null default now()
);

create index on export_jobs (user_id, status);

alter table export_jobs enable row level security;

create policy "own export jobs" on export_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
