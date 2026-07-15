-- =============================================================================
-- 014_section_turnout.sql
-- Phase 3: Section-level turnout tracking + admin RPC
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- Admin RPC: admin_get_section_turnout
-- Returns per-section voter counts so teachers can track who hasn't voted yet.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_get_section_turnout(p_admin_email TEXT)
RETURNS TABLE (
  year_section TEXT,
  total_voters BIGINT,
  votes_cast   BIGINT
)
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
    COALESCE(s.year_section, 'Unassigned') AS year_section,
    COUNT(*)::BIGINT AS total_voters,
    COUNT(*) FILTER (WHERE s.has_voted = true)::BIGINT AS votes_cast
  FROM public.students s
  GROUP BY s.year_section
  ORDER BY year_section ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_section_turnout(TEXT) TO anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Also update admin_get_stats to include section breakdown count
-- (for the OverviewPanel to show how many sections are participating)
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.admin_get_stats(TEXT);

CREATE OR REPLACE FUNCTION public.admin_get_stats(p_admin_email TEXT)
RETURNS TABLE (
  total_voters      BIGINT,
  votes_cast        BIGINT,
  active_sections   BIGINT
)
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
    (SELECT COUNT(*)::BIGINT FROM public.students WHERE has_voted = true),
    (SELECT COUNT(DISTINCT year_section)::BIGINT FROM public.students WHERE year_section IS NOT NULL AND year_section != '');
END;
$$;
