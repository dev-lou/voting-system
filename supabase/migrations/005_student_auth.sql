-- =============================================================================
-- 005_student_auth.sql
-- Replaces Supabase Auth for students with table-based auth (same model as
-- admins). Students authenticate via the student_login() RPC using email.
-- No Supabase Auth session is created for students at all.
-- Also drops student_number (students identified by email only).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop all RLS policies that depend on user_id (must happen before DROP COLUMN)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "students_select_own"              ON public.students;
DROP POLICY IF EXISTS "Voters can register themselves"   ON public.students;
DROP POLICY IF EXISTS "Voters can read own row"          ON public.students;

-- ---------------------------------------------------------------------------
-- 2. Remove Supabase Auth linkage from students table
-- ---------------------------------------------------------------------------
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_user_id_unique;
DROP INDEX IF EXISTS idx_students_user_id;
ALTER TABLE public.students DROP COLUMN IF EXISTS user_id;

-- ---------------------------------------------------------------------------
-- 3. Drop student_number column (students identified by email only)
-- ---------------------------------------------------------------------------
ALTER TABLE public.students
  DROP CONSTRAINT IF EXISTS students_student_number_key,
  DROP CONSTRAINT IF EXISTS students_student_number_unique;

ALTER TABLE public.students DROP COLUMN IF EXISTS student_number;

-- ---------------------------------------------------------------------------
-- 4. Add password_hash column (email was added in 003_admin.sql)
-- ---------------------------------------------------------------------------
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- ---------------------------------------------------------------------------
-- 5. student_register RPC
--    Inserts a new student row with a bcrypt-hashed password.
--    Returns the new student's id, full_name.
--    Callable by anon (registration kiosk before any session).
--
--    NOTE: RETURNING uses qualified "students.id" / "students.full_name" to
--    avoid PL/pgSQL "column reference is ambiguous" error (RETURNS TABLE
--    output variables share the same names as table columns).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.student_register(
  p_full_name TEXT,
  p_email     TEXT,
  p_password  TEXT
)
RETURNS TABLE (id UUID, full_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF LENGTH(TRIM(p_password)) < 8 THEN
    RAISE EXCEPTION 'PASSWORD_TOO_SHORT: Password must be at least 8 characters';
  END IF;

  RETURN QUERY
  INSERT INTO public.students (full_name, email, password_hash)
  VALUES (
    TRIM(p_full_name),
    LOWER(TRIM(p_email)),
    crypt(p_password, gen_salt('bf', 10))
  )
  RETURNING students.id, students.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.student_register(TEXT, TEXT, TEXT) TO anon;

-- ---------------------------------------------------------------------------
-- 6. student_login RPC
--    Accepts email + password.
--    Returns the student row on match, empty set on failure.
--    Callable by anon (login page before any session).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.student_login(
  p_email    TEXT,
  p_password TEXT
)
RETURNS TABLE (
  id        UUID,
  full_name TEXT,
  has_voted BOOLEAN,
  email     TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT s.id, s.full_name, s.has_voted, s.email
  FROM   public.students s
  WHERE  s.email = LOWER(TRIM(p_email))
    AND  s.password_hash IS NOT NULL
    AND  s.password_hash = crypt(p_password, s.password_hash)
  LIMIT  1;
$$;

GRANT EXECUTE ON FUNCTION public.student_login(TEXT, TEXT) TO anon;

-- ---------------------------------------------------------------------------
-- 7. Replace submit_ballot — remove auth.uid() ownership check.
--    Security is now enforced at the application layer:
--      • student ID comes from the server-validated student_login session
--      • call is made via serviceSupabase (service role, server-controlled key)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_ballot(
  p_student_id  UUID,
  p_election_id UUID,
  p_selections  JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_voted       BOOLEAN;
  v_sel             JSONB;
  v_position_id     UUID;
  v_max_votes       INT;
  v_candidate_count INT;
  v_candidate_id    TEXT;
  v_valid_candidate BOOLEAN;
BEGIN
  -- 1. Lock the student row and read has_voted
  SELECT s.has_voted
    INTO v_has_voted
    FROM public.students s
   WHERE s.id = p_student_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student record not found: %', p_student_id;
  END IF;

  -- 2. Guard against double-vote
  IF v_has_voted THEN
    RAISE EXCEPTION 'ALREADY_VOTED: Student has already cast a ballot';
  END IF;

  -- 3. Validate and insert each position's selections
  FOR v_sel IN SELECT * FROM jsonb_array_elements(p_selections)
  LOOP
    v_position_id := (v_sel->>'position_id')::UUID;

    SELECT p.max_votes INTO v_max_votes
      FROM public.positions p
     WHERE p.id          = v_position_id
       AND p.election_id = p_election_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid position % for election %', v_position_id, p_election_id;
    END IF;

    v_candidate_count := jsonb_array_length(COALESCE(v_sel->'candidate_ids', '[]'::JSONB));

    IF v_candidate_count > v_max_votes THEN
      RAISE EXCEPTION 'Too many selections (%) for position % (max %)',
        v_candidate_count, v_position_id, v_max_votes;
    END IF;

    IF v_candidate_count = 0 THEN
      CONTINUE;
    END IF;

    FOR v_candidate_id IN
      SELECT * FROM jsonb_array_elements_text(v_sel->'candidate_ids')
    LOOP
      SELECT EXISTS(
        SELECT 1 FROM public.candidates c
         WHERE c.id          = v_candidate_id::UUID
           AND c.position_id = v_position_id
      ) INTO v_valid_candidate;

      IF NOT v_valid_candidate THEN
        RAISE EXCEPTION 'Candidate % does not belong to position %',
          v_candidate_id, v_position_id;
      END IF;

      INSERT INTO public.votes (student_id, position_id, candidate_id)
      VALUES (p_student_id, v_position_id, v_candidate_id::UUID);
    END LOOP;
  END LOOP;

  -- 4. Mark student as voted
  UPDATE public.students
     SET has_voted = true
   WHERE id = p_student_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_ballot(UUID, UUID, JSONB) TO service_role;
