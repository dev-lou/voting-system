-- =============================================================================
-- Seed Data — Sample Election for Testing
-- =============================================================================
-- Run this AFTER 001_schema.sql in the Supabase SQL Editor.
-- NOTE: You must create auth users separately (via Supabase dashboard or API)
-- and then update the students table user_id references.
-- =============================================================================

-- ── 1. Create a sample election ──────────────────────────────────────────────
insert into public.elections (id, name, is_active)
values ('a0000000-0000-0000-0000-000000000001', 'Student Government Election 2026', true);

-- ── 2. Create positions ─────────────────────────────────────────────────────
insert into public.positions (id, election_id, title, max_votes, display_order) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'President',      1, 1),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Vice President',  1, 2),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Secretary',       1, 3),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Treasurer',       1, 4),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Senators',        3, 5);

-- ── 3. Create candidates ────────────────────────────────────────────────────
-- President (2 candidates)
insert into public.candidates (position_id, full_name, party) values
  ('b0000000-0000-0000-0000-000000000001', 'Maria Santos',     'Unity Party'),
  ('b0000000-0000-0000-0000-000000000001', 'Carlos Reyes',     'Progress Alliance');

-- Vice President (2 candidates)
insert into public.candidates (position_id, full_name, party) values
  ('b0000000-0000-0000-0000-000000000002', 'Ana Cruz',         'Unity Party'),
  ('b0000000-0000-0000-0000-000000000002', 'Miguel Torres',    'Progress Alliance');

-- Secretary (3 candidates)
insert into public.candidates (position_id, full_name, party) values
  ('b0000000-0000-0000-0000-000000000003', 'Sofia Garcia',     'Unity Party'),
  ('b0000000-0000-0000-0000-000000000003', 'Diego Ramirez',    'Progress Alliance'),
  ('b0000000-0000-0000-0000-000000000003', 'Isabella Morales', 'Independent');

-- Treasurer (2 candidates)
insert into public.candidates (position_id, full_name, party) values
  ('b0000000-0000-0000-0000-000000000004', 'Luis Fernandez',   'Unity Party'),
  ('b0000000-0000-0000-0000-000000000004', 'Camila Rivera',    'Progress Alliance');

-- Senators (6 candidates, voters pick up to 3)
insert into public.candidates (position_id, full_name, party) values
  ('b0000000-0000-0000-0000-000000000005', 'Rafael Mendoza',   'Unity Party'),
  ('b0000000-0000-0000-0000-000000000005', 'Patricia Lim',     'Unity Party'),
  ('b0000000-0000-0000-0000-000000000005', 'Gabriel Navarro',  'Progress Alliance'),
  ('b0000000-0000-0000-0000-000000000005', 'Elena Vasquez',    'Progress Alliance'),
  ('b0000000-0000-0000-0000-000000000005', 'Marco Tan',        'Independent'),
  ('b0000000-0000-0000-0000-000000000005', 'Julia Bautista',   'Independent');

-- ── 4. Sample students (update user_id after creating auth users) ───────────
-- These use placeholder UUIDs. After creating users in Supabase Auth,
-- run UPDATE statements to set the correct user_id values.
--
-- Example:
--   insert into public.students (user_id, student_number, full_name)
--   values ('AUTH_USER_UUID_HERE', '2026-0001', 'Juan Dela Cruz');
