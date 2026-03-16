-- =============================================================================
-- 003_admin.sql
-- Admin infrastructure: admins table, is_admin() helper, RLS policies for
-- admin operations, student self-registration policy, get_results() RPC,
-- and email column on students.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add email column to students (so admin panel can show it without
--    needing service-role access to auth.users)
-- ---------------------------------------------------------------------------
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS email TEXT;

-- ---------------------------------------------------------------------------
-- 2. Admins table
--    Rows are inserted manually via SQL (no self-signup).
--    Only stores the auth.users UUID — no passwords here.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. is_admin() — SECURITY DEFINER so it can read public.admins even when
--    the calling user's RLS policies haven't been evaluated yet.
--    Must be stable (no side effects) so PG can cache the result per
--    statement.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admins
    WHERE user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. admins table RLS — admins can see their own row only
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can read own row" ON public.admins;
CREATE POLICY "Admins can read own row"
  ON public.admins
  FOR SELECT
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5. elections RLS — expand existing policies with admin write access
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can insert elections" ON public.elections;
CREATE POLICY "Admins can insert elections"
  ON public.elections
  FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update elections" ON public.elections;
CREATE POLICY "Admins can update elections"
  ON public.elections
  FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete elections" ON public.elections;
CREATE POLICY "Admins can delete elections"
  ON public.elections
  FOR DELETE
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6. positions RLS — admin write access
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can insert positions" ON public.positions;
CREATE POLICY "Admins can insert positions"
  ON public.positions
  FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update positions" ON public.positions;
CREATE POLICY "Admins can update positions"
  ON public.positions
  FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete positions" ON public.positions;
CREATE POLICY "Admins can delete positions"
  ON public.positions
  FOR DELETE
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 7. candidates RLS — admin write access
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can insert candidates" ON public.candidates;
CREATE POLICY "Admins can insert candidates"
  ON public.candidates
  FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update candidates" ON public.candidates;
CREATE POLICY "Admins can update candidates"
  ON public.candidates
  FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete candidates" ON public.candidates;
CREATE POLICY "Admins can delete candidates"
  ON public.candidates
  FOR DELETE
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 8. students RLS — admin full access + voter self-registration INSERT
-- ---------------------------------------------------------------------------

-- Self-registration: an authenticated user can insert their own row
DROP POLICY IF EXISTS "Voters can register themselves" ON public.students;
CREATE POLICY "Voters can register themselves"
  ON public.students
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Voters can read their own row (e.g. check has_voted)
DROP POLICY IF EXISTS "Voters can read own row" ON public.students;
CREATE POLICY "Voters can read own row"
  ON public.students
  FOR SELECT
  USING (user_id = auth.uid());

-- Admins can read all students
DROP POLICY IF EXISTS "Admins can read all students" ON public.students;
CREATE POLICY "Admins can read all students"
  ON public.students
  FOR SELECT
  USING (public.is_admin());

-- Admins can update students (e.g. reset has_voted)
DROP POLICY IF EXISTS "Admins can update students" ON public.students;
CREATE POLICY "Admins can update students"
  ON public.students
  FOR UPDATE
  USING (public.is_admin());

-- Admins can delete students
DROP POLICY IF EXISTS "Admins can delete students" ON public.students;
CREATE POLICY "Admins can delete students"
  ON public.students
  FOR DELETE
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 9. votes RLS — admins can read all votes (for results)
--    (Ballot secrecy is preserved by not exposing which voter cast which
--    candidates — the get_results() RPC only returns aggregated counts.)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can read votes" ON public.votes;
CREATE POLICY "Admins can read votes"
  ON public.votes
  FOR SELECT
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 10. get_results(p_election_id UUID) RPC
--     Returns per-candidate vote counts for a given election.
--     SECURITY DEFINER so it can bypass RLS on votes (ballot secrecy:
--     individual vote rows are never exposed — only counts are returned).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_results(p_election_id UUID)
RETURNS TABLE (
  position_id    UUID,
  position_title TEXT,
  display_order  INT,
  candidate_id   UUID,
  candidate_name TEXT,
  party          TEXT,
  vote_count     BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pos.id            AS position_id,
    pos.title         AS position_title,
    pos.display_order AS display_order,
    c.id              AS candidate_id,
    c.full_name       AS candidate_name,
    c.party           AS party,
    COUNT(v.id)       AS vote_count
  FROM public.positions pos
  JOIN public.candidates c
    ON c.position_id = pos.id
  LEFT JOIN public.votes v
    ON v.candidate_id = c.id
  WHERE pos.election_id = p_election_id
  GROUP BY pos.id, pos.title, pos.display_order, c.id, c.full_name, c.party
  ORDER BY pos.display_order ASC, vote_count DESC, c.full_name ASC;
$$;

-- Grant execute to authenticated users (admin check happens in app layer
-- since this only returns aggregate counts, not individual votes)
GRANT EXECUTE ON FUNCTION public.get_results(UUID) TO authenticated;
