-- =============================================================================
-- 007_anon_rls_and_admin_rpcs.sql
--
-- Problem: The service_role key cannot be used in a browser (Supabase blocks
-- it). All operations must go through the anon client.
--
-- Solution:
--   1. Allow anon SELECT on elections, positions, candidates, students, votes
--   2. Create SECURITY DEFINER RPCs for every admin write operation
--   3. Grant EXECUTE on all RPCs to anon
--   4. Grant submit_ballot and get_results to anon
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 1: RLS SELECT policies for anon
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_elections" ON public.elections;
CREATE POLICY "anon_select_elections" ON public.elections
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_select_positions" ON public.positions;
CREATE POLICY "anon_select_positions" ON public.positions
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_select_candidates" ON public.candidates;
CREATE POLICY "anon_select_candidates" ON public.candidates
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_select_students" ON public.students;
CREATE POLICY "anon_select_students" ON public.students
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_select_votes" ON public.votes;
CREATE POLICY "anon_select_votes" ON public.votes
  FOR SELECT TO anon USING (true);


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 2: Admin CRUD RPCs — Elections
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_upsert_election(
  p_admin_email   TEXT,
  p_id            UUID DEFAULT NULL,
  p_name          TEXT DEFAULT '',
  p_starts_at     TIMESTAMPTZ DEFAULT NULL,
  p_ends_at       TIMESTAMPTZ DEFAULT NULL,
  p_is_active     BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE email = LOWER(TRIM(p_admin_email))) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Not an admin';
  END IF;

  IF p_is_active THEN
    UPDATE public.elections SET is_active = false
     WHERE is_active = true AND (p_id IS NULL OR id != p_id);
  END IF;

  IF p_id IS NOT NULL THEN
    UPDATE public.elections
       SET name = p_name, starts_at = p_starts_at, ends_at = p_ends_at, is_active = p_is_active
     WHERE id = p_id
     RETURNING id INTO v_result_id;
  ELSE
    INSERT INTO public.elections (name, starts_at, ends_at, is_active)
    VALUES (p_name, p_starts_at, p_ends_at, p_is_active)
    RETURNING id INTO v_result_id;
  END IF;

  RETURN v_result_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_election(TEXT, UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN) TO anon;


CREATE OR REPLACE FUNCTION public.admin_delete_election(
  p_admin_email TEXT,
  p_id          UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE email = LOWER(TRIM(p_admin_email))) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Not an admin';
  END IF;
  DELETE FROM public.elections WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_election(TEXT, UUID) TO anon;


CREATE OR REPLACE FUNCTION public.admin_toggle_election(
  p_admin_email TEXT,
  p_id          UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_currently_active BOOLEAN;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE email = LOWER(TRIM(p_admin_email))) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Not an admin';
  END IF;

  SELECT is_active INTO v_currently_active FROM public.elections WHERE id = p_id;

  IF NOT v_currently_active THEN
    UPDATE public.elections SET is_active = false WHERE is_active = true AND id != p_id;
  END IF;

  UPDATE public.elections SET is_active = NOT is_active WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_toggle_election(TEXT, UUID) TO anon;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 3: Admin CRUD RPCs — Positions
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_upsert_position(
  p_admin_email   TEXT,
  p_id            UUID DEFAULT NULL,
  p_election_id   UUID DEFAULT NULL,
  p_title         TEXT DEFAULT '',
  p_max_votes     INT DEFAULT 1,
  p_display_order INT DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE email = LOWER(TRIM(p_admin_email))) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Not an admin';
  END IF;

  IF p_id IS NOT NULL THEN
    UPDATE public.positions
       SET election_id = p_election_id, title = p_title, max_votes = p_max_votes, display_order = p_display_order
     WHERE id = p_id
     RETURNING id INTO v_result_id;
  ELSE
    INSERT INTO public.positions (election_id, title, max_votes, display_order)
    VALUES (p_election_id, p_title, p_max_votes, p_display_order)
    RETURNING id INTO v_result_id;
  END IF;

  RETURN v_result_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_position(TEXT, UUID, UUID, TEXT, INT, INT) TO anon;


CREATE OR REPLACE FUNCTION public.admin_delete_position(
  p_admin_email TEXT,
  p_id          UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE email = LOWER(TRIM(p_admin_email))) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Not an admin';
  END IF;
  DELETE FROM public.positions WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_position(TEXT, UUID) TO anon;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 4: Admin CRUD RPCs — Candidates
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_upsert_candidate(
  p_admin_email   TEXT,
  p_id            UUID DEFAULT NULL,
  p_position_id   UUID DEFAULT NULL,
  p_full_name     TEXT DEFAULT '',
  p_party         TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE email = LOWER(TRIM(p_admin_email))) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Not an admin';
  END IF;

  IF p_id IS NOT NULL THEN
    UPDATE public.candidates
       SET position_id = p_position_id, full_name = p_full_name, party = p_party
     WHERE id = p_id
     RETURNING id INTO v_result_id;
  ELSE
    INSERT INTO public.candidates (position_id, full_name, party)
    VALUES (p_position_id, p_full_name, p_party)
    RETURNING id INTO v_result_id;
  END IF;

  RETURN v_result_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_candidate(TEXT, UUID, UUID, TEXT, TEXT) TO anon;


CREATE OR REPLACE FUNCTION public.admin_delete_candidate(
  p_admin_email TEXT,
  p_id          UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE email = LOWER(TRIM(p_admin_email))) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Not an admin';
  END IF;
  DELETE FROM public.candidates WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_candidate(TEXT, UUID) TO anon;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 5: Admin RPC — Reset voter
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_reset_voter(
  p_admin_email TEXT,
  p_student_id  UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE email = LOWER(TRIM(p_admin_email))) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Not an admin';
  END IF;
  UPDATE public.students SET has_voted = false WHERE id = p_student_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_voter(TEXT, UUID) TO anon;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 6: Grant submit_ballot and get_results to anon
-- ═══════════════════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION public.submit_ballot(UUID, UUID, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.get_results(UUID) TO anon;
