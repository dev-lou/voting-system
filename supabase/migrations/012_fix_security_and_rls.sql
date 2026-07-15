-- =============================================================================
-- 012_fix_security_and_rls.sql — COPY AND PASTE THIS ENTIRE FILE INTO SUPABASE SQL EDITOR
-- =============================================================================
-- Phase 0: Critical Security Fixes
--
-- 1. Fix submit_ballot — NEW 4-param version requires password, returns confirmation
--    code atomically. OLD 3-param version kept for backward compatibility.
-- 2. Remove anon SELECT on votes (ballot secrecy)
-- 3. Remove anon SELECT on students (PII protection)
-- 4. Remove broken confirmation code update policy
-- 5. Revoke anon storage uploads
-- 6. Create admin RPCs for reading student data & stats
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🟥 1. submit_ballot — BACKWARD-COMPATIBLE 3-PARAM VERSION
--      Kept so OLD frontend (not rebuilt yet) still works.
--      Will be removed once frontend is updated.
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.submit_ballot(UUID, UUID, JSONB);

CREATE OR REPLACE FUNCTION public.submit_ballot(
  p_student_id  UUID,
  p_election_id UUID,
  p_selections  JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_has_voted       BOOLEAN;
  v_sel             JSONB;
  v_position_id     UUID;
  v_max_votes       INT;
  v_candidate_count INT;
  v_candidate_id    TEXT;
  v_valid_candidate BOOLEAN;
  v_confirmation    TEXT;
  v_now             TIMESTAMPTZ;
  v_starts_at       TIMESTAMPTZ;
  v_ends_at         TIMESTAMPTZ;
BEGIN
  v_now := now();

  -- 1. Lock student row and check has_voted
  SELECT s.has_voted INTO v_has_voted
    FROM public.students s
   WHERE s.id = p_student_id
     FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Student record not found'; END IF;
  IF v_has_voted THEN RAISE EXCEPTION 'ALREADY_VOTED'; END IF;

  -- 2. Verify election exists and check schedule
  SELECT starts_at, ends_at INTO v_starts_at, v_ends_at
    FROM public.elections WHERE id = p_election_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Election not found'; END IF;
  IF v_starts_at IS NOT NULL AND v_now < v_starts_at THEN RAISE EXCEPTION 'ELECTION_NOT_STARTED'; END IF;
  IF v_ends_at IS NOT NULL AND v_now > v_ends_at THEN RAISE EXCEPTION 'ELECTION_ENDED'; END IF;

  -- 3. Generate confirmation code
  v_confirmation := 'V-' || encode(extensions.gen_random_bytes(4), 'hex');

  -- 4. Validate and insert each position's selections
  FOR v_sel IN SELECT * FROM jsonb_array_elements(p_selections)
  LOOP
    v_position_id := (v_sel->>'position_id')::UUID;

    SELECT p.max_votes INTO v_max_votes
      FROM public.positions p
     WHERE p.id = v_position_id AND p.election_id = p_election_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid position % for election %', v_position_id, p_election_id; END IF;

    v_candidate_count := jsonb_array_length(COALESCE(v_sel->'candidate_ids', '[]'::JSONB));
    IF v_candidate_count > v_max_votes THEN
      RAISE EXCEPTION 'Too many selections (%) for position % (max %)', v_candidate_count, v_position_id, v_max_votes;
    END IF;
    IF v_candidate_count = 0 THEN CONTINUE; END IF;

    FOR v_candidate_id IN SELECT * FROM jsonb_array_elements_text(v_sel->'candidate_ids')
    LOOP
      SELECT EXISTS(SELECT 1 FROM public.candidates c WHERE c.id = v_candidate_id::UUID AND c.position_id = v_position_id)
        INTO v_valid_candidate;
      IF NOT v_valid_candidate THEN RAISE EXCEPTION 'Candidate % does not belong to position %', v_candidate_id, v_position_id; END IF;

      INSERT INTO public.votes (student_id, position_id, candidate_id)
      VALUES (p_student_id, v_position_id, v_candidate_id::UUID);
    END LOOP;
  END LOOP;

  -- 5. Mark student as voted + store confirmation code
  UPDATE public.students SET has_voted = true, confirmation_code = v_confirmation WHERE id = p_student_id;

  RETURN v_confirmation;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_ballot(UUID, UUID, JSONB) TO anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔒 NEW: submit_ballot — SECURE 4-PARAM VERSION (requires password)
--      Use this when frontend is updated to pass p_password.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.submit_ballot(
  p_student_id  UUID,
  p_election_id UUID,
  p_selections  JSONB,
  p_password    TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_has_voted       BOOLEAN;
  v_password_hash   TEXT;
  v_sel             JSONB;
  v_position_id     UUID;
  v_max_votes       INT;
  v_candidate_count INT;
  v_candidate_id    TEXT;
  v_valid_candidate BOOLEAN;
  v_confirmation    TEXT;
  v_now             TIMESTAMPTZ;
  v_starts_at       TIMESTAMPTZ;
  v_ends_at         TIMESTAMPTZ;
BEGIN
  v_now := now();

  -- 1. Lock student row and verify password
  SELECT s.has_voted, s.password_hash
    INTO v_has_voted, v_password_hash
    FROM public.students s
   WHERE s.id = p_student_id
     FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Student record not found'; END IF;
  IF v_has_voted THEN RAISE EXCEPTION 'ALREADY_VOTED'; END IF;
  IF v_password_hash IS NULL OR v_password_hash != crypt(p_password, v_password_hash) THEN
    RAISE EXCEPTION 'INVALID_PASSWORD';
  END IF;

  -- 2. Verify election exists and check schedule
  SELECT starts_at, ends_at INTO v_starts_at, v_ends_at
    FROM public.elections WHERE id = p_election_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Election not found'; END IF;
  IF v_starts_at IS NOT NULL AND v_now < v_starts_at THEN RAISE EXCEPTION 'ELECTION_NOT_STARTED'; END IF;
  IF v_ends_at IS NOT NULL AND v_now > v_ends_at THEN RAISE EXCEPTION 'ELECTION_ENDED'; END IF;

  -- 3. Generate confirmation code
  v_confirmation := 'V-' || encode(extensions.gen_random_bytes(4), 'hex');

  -- 4. Validate and insert each position's selections
  FOR v_sel IN SELECT * FROM jsonb_array_elements(p_selections)
  LOOP
    v_position_id := (v_sel->>'position_id')::UUID;

    SELECT p.max_votes INTO v_max_votes
      FROM public.positions p
     WHERE p.id = v_position_id AND p.election_id = p_election_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid position % for election %', v_position_id, p_election_id; END IF;

    v_candidate_count := jsonb_array_length(COALESCE(v_sel->'candidate_ids', '[]'::JSONB));
    IF v_candidate_count > v_max_votes THEN
      RAISE EXCEPTION 'Too many selections (%) for position % (max %)', v_candidate_count, v_position_id, v_max_votes;
    END IF;
    IF v_candidate_count = 0 THEN CONTINUE; END IF;

    FOR v_candidate_id IN SELECT * FROM jsonb_array_elements_text(v_sel->'candidate_ids')
    LOOP
      SELECT EXISTS(SELECT 1 FROM public.candidates c WHERE c.id = v_candidate_id::UUID AND c.position_id = v_position_id)
        INTO v_valid_candidate;
      IF NOT v_valid_candidate THEN RAISE EXCEPTION 'Candidate % does not belong to position %', v_candidate_id, v_position_id; END IF;

      INSERT INTO public.votes (student_id, position_id, candidate_id)
      VALUES (p_student_id, v_position_id, v_candidate_id::UUID);
    END LOOP;
  END LOOP;

  -- 5. Mark student as voted + store confirmation code
  UPDATE public.students SET has_voted = true, confirmation_code = v_confirmation WHERE id = p_student_id;

  RETURN v_confirmation;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_ballot(UUID, UUID, JSONB, TEXT) TO anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🟥 2. Remove anon SELECT on votes — ballot secrecy
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "anon_select_votes" ON public.votes;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🟥 3. Remove anon SELECT on students — PII protection
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "anon_select_students" ON public.students;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🟥 4. Remove broken anon UPDATE policy on students
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "anon_update_confirmation_code" ON public.students;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🟥 5. Revoke anon storage uploads
-- ═══════════════════════════════════════════════════════════════════════════════

REVOKE INSERT ON storage.objects FROM anon;
REVOKE DELETE ON storage.objects FROM anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🟧 6. Admin RPC: admin_get_students — reads all student data
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_get_students(p_admin_email TEXT)
RETURNS SETOF public.students
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE email = LOWER(TRIM(p_admin_email))) THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  RETURN QUERY SELECT * FROM public.students ORDER BY created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_students(TEXT) TO anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🟧 7. Admin RPC: admin_get_stats — voter counts
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_get_stats(p_admin_email TEXT)
RETURNS TABLE (total_voters BIGINT, votes_cast BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE email = LOWER(TRIM(p_admin_email))) THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::BIGINT FROM public.students),
    (SELECT COUNT(*)::BIGINT FROM public.students WHERE has_voted = true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_stats(TEXT) TO anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ DONE! Both versions now exist:
--    submit_ballot(uuid, uuid, jsonb)        — backward-compatible (3 params)
--    submit_ballot(uuid, uuid, jsonb, text)  — secure (4 params, requires password)
-- ═══════════════════════════════════════════════════════════════════════════════
