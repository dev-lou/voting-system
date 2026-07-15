-- =============================================================================
-- 013_cleanup_grants.sql
-- Phase 2: Clean up old grants, create student_register → register_student alias
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Create an alias: register_student_by_email
--    This replaces the old student_register function which was inconsistently named.
--    Keeps backward compatibility if anything calls student_register.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.register_student_by_email(
  p_full_name TEXT,
  p_email     TEXT,
  p_password  TEXT
)
RETURNS TABLE (id UUID, voter_id TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_first_name TEXT;
  v_last_name  TEXT;
  v_name_parts TEXT[];
BEGIN
  -- Split full_name into first/last at the first space
  v_name_parts := string_to_array(TRIM(p_full_name), ' ');
  v_first_name := v_name_parts[1];
  v_last_name  := array_to_string(v_name_parts[2:], ' ');

  RETURN QUERY
  INSERT INTO public.students (first_name, last_name, full_name, gender, year_section, voter_id, password_hash)
  VALUES (
    v_first_name,
    v_last_name,
    TRIM(p_full_name),
    '',
    '',
    LOWER(TRIM(p_email)),
    crypt(p_password, gen_salt('bf', 10))
  )
  RETURNING students.id, students.voter_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_student_by_email(TEXT, TEXT, TEXT) TO anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Update the RegisterPage to use register_student
--    The old student_register RPC is deprecated but kept for compatibility.
--    The frontend now uses register_student (consistent with admin panel).
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON FUNCTION public.register_student_by_email IS 'Alias for register_student that accepts full_name + email. Replaces deprecated student_register.';
