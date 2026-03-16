-- =============================================================================
-- Secure Voting System — Database Schema
-- =============================================================================
-- Run this in the Supabase SQL Editor or as a migration.
-- This file creates all tables, indexes, RLS policies, and the atomic
-- submit_ballot RPC function.
-- =============================================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Tables ──────────────────────────────────────────────────────────────────

-- Elections: top-level container
create table if not exists public.elections (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  is_active  boolean not null default false,
  starts_at  timestamptz,
  ends_at    timestamptz,
  created_at timestamptz not null default now()
);

-- Positions: configurable roles within an election
create table if not exists public.positions (
  id            uuid primary key default gen_random_uuid(),
  election_id   uuid not null references public.elections(id) on delete cascade,
  title         text not null,
  max_votes     int not null default 1 check (max_votes >= 1),
  display_order int not null default 0,
  created_at    timestamptz not null default now()
);

-- Candidates: people running for a position
create table if not exists public.candidates (
  id          uuid primary key default gen_random_uuid(),
  position_id uuid not null references public.positions(id) on delete cascade,
  full_name   text not null,
  party       text,
  photo_url   text,
  created_at  timestamptz not null default now()
);

-- Students: voter roster linked to Supabase Auth
create table if not exists public.students (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  student_number text not null,
  full_name      text not null,
  has_voted      boolean not null default false,
  created_at     timestamptz not null default now(),
  constraint students_user_id_unique unique (user_id),
  constraint students_student_number_unique unique (student_number)
);

-- Votes: immutable vote records
create table if not exists public.votes (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.students(id),
  position_id  uuid not null references public.positions(id),
  candidate_id uuid not null references public.candidates(id),
  submitted_at timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

create index if not exists idx_positions_election on public.positions(election_id);
create index if not exists idx_candidates_position on public.candidates(position_id);
create index if not exists idx_students_user_id on public.students(user_id);
create index if not exists idx_votes_student on public.votes(student_id);
create index if not exists idx_votes_position on public.votes(position_id);

-- ─── Row Level Security ──────────────────────────────────────────────────────

alter table public.elections enable row level security;
alter table public.positions enable row level security;
alter table public.candidates enable row level security;
alter table public.students enable row level security;
alter table public.votes enable row level security;

-- Elections: anyone authenticated can read active elections
create policy "elections_select" on public.elections
  for select using (auth.role() = 'authenticated');

-- Positions: anyone authenticated can read
create policy "positions_select" on public.positions
  for select using (auth.role() = 'authenticated');

-- Candidates: anyone authenticated can read
create policy "candidates_select" on public.candidates
  for select using (auth.role() = 'authenticated');

-- Students: voters can only read their OWN record
create policy "students_select_own" on public.students
  for select using (auth.uid() = user_id);

-- Votes: NO direct access. All inserts go through the RPC function
-- (which runs as SECURITY DEFINER). This enforces ballot secrecy —
-- voters cannot read back their own votes or anyone else's.
-- No select, insert, update, or delete policies = total lockdown.

-- ─── RPC: Atomic Ballot Submission ──────────────────────────────────────────
--
-- Parameters:
--   p_student_id  UUID  — the student's id from the students table
--   p_election_id UUID  — which election this ballot is for
--   p_selections  JSONB — array of objects:
--     [
--       { "position_id": "uuid", "candidate_ids": ["uuid", ...] },
--       ...
--     ]
--
-- Security model:
--   - Runs as SECURITY DEFINER (bypasses RLS)
--   - Validates the caller's auth.uid() matches the student's user_id
--   - Checks has_voted = false (with row-level lock via FOR UPDATE)
--   - Validates each position belongs to the election
--   - Validates candidate count does not exceed max_votes
--   - Validates each candidate belongs to the claimed position
--   - Inserts all votes atomically
--   - Sets has_voted = true
--   - If ANY step fails, the entire transaction rolls back
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.submit_ballot(
  p_student_id  uuid,
  p_election_id uuid,
  p_selections  jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id        uuid;
  v_has_voted      boolean;
  v_sel            jsonb;
  v_position_id    uuid;
  v_max_votes      int;
  v_candidate_count int;
  v_candidate_id   text;
  v_valid_candidate boolean;
begin
  -- ── 1. Verify caller identity ──────────────────────────────────────────
  -- Ensure the authenticated user owns this student record
  select user_id, has_voted
    into v_user_id, v_has_voted
    from public.students
   where id = p_student_id
     for update;  -- row-level lock prevents race conditions

  if not found then
    raise exception 'Student record not found: %', p_student_id;
  end if;

  if v_user_id != auth.uid() then
    raise exception 'Unauthorized: caller does not own this student record';
  end if;

  -- ── 2. Check double-vote ───────────────────────────────────────────────
  if v_has_voted then
    raise exception 'ALREADY_VOTED: Student has already cast a ballot';
  end if;

  -- ── 3. Validate and insert each position's selections ──────────────────
  for v_sel in select * from jsonb_array_elements(p_selections)
  loop
    v_position_id := (v_sel->>'position_id')::uuid;

    -- Verify position belongs to this election and get max_votes
    select max_votes into v_max_votes
      from public.positions
     where id = v_position_id
       and election_id = p_election_id;

    if not found then
      raise exception 'Invalid position % for election %', v_position_id, p_election_id;
    end if;

    -- Check selection count
    v_candidate_count := jsonb_array_length(coalesce(v_sel->'candidate_ids', '[]'::jsonb));

    if v_candidate_count > v_max_votes then
      raise exception 'Too many selections (%) for position % (max %)',
        v_candidate_count, v_position_id, v_max_votes;
    end if;

    -- Allow abstention (0 selections) — skip inserts for this position
    if v_candidate_count = 0 then
      continue;
    end if;

    -- Insert each vote, validating candidate belongs to this position
    for v_candidate_id in
      select * from jsonb_array_elements_text(v_sel->'candidate_ids')
    loop
      select exists(
        select 1 from public.candidates
         where id = v_candidate_id::uuid
           and position_id = v_position_id
      ) into v_valid_candidate;

      if not v_valid_candidate then
        raise exception 'Candidate % does not belong to position %',
          v_candidate_id, v_position_id;
      end if;

      insert into public.votes (student_id, position_id, candidate_id)
      values (p_student_id, v_position_id, v_candidate_id::uuid);
    end loop;
  end loop;

  -- ── 4. Mark student as voted ───────────────────────────────────────────
  update public.students
     set has_voted = true
   where id = p_student_id;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.submit_ballot(uuid, uuid, jsonb) to authenticated;
