-- =============================================================================
-- Migration 009: Add photo_url to admin_upsert_candidate RPC
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_upsert_candidate(
  p_admin_email   TEXT,
  p_id            UUID DEFAULT NULL,
  p_position_id   UUID DEFAULT NULL,
  p_full_name     TEXT DEFAULT '',
  p_party         TEXT DEFAULT NULL,
  p_photo_url     TEXT DEFAULT NULL
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
       SET position_id = p_position_id, 
           full_name = p_full_name, 
           party = p_party,
           photo_url = p_photo_url
     WHERE id = p_id
     RETURNING id INTO v_result_id;
  ELSE
    INSERT INTO public.candidates (position_id, full_name, party, photo_url)
    VALUES (p_position_id, p_full_name, p_party, p_photo_url)
    RETURNING id INTO v_result_id;
  END IF;

  RETURN v_result_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_candidate(TEXT, UUID, UUID, TEXT, TEXT, TEXT) TO anon;
