-- Add new student fields for voter ID system
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS year_section TEXT,
ADD COLUMN IF NOT EXISTS voter_id TEXT,
ADD COLUMN IF NOT EXISTS confirmation_code TEXT;

-- Add unique constraint on voter_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_voter_id_unique'
  ) THEN
    ALTER TABLE public.students ADD CONSTRAINT students_voter_id_unique UNIQUE (voter_id);
  END IF;
END $$;

-- Backfill full_name for existing students who have first_name/last_name
UPDATE public.students 
SET full_name = COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')
WHERE first_name IS NOT NULL AND (full_name IS NULL OR full_name = '');

-- Function to register a student with voter_id and new fields
CREATE OR REPLACE FUNCTION public.register_student(
  p_first_name  TEXT,
  p_last_name   TEXT,
  p_gender      TEXT,
  p_year_section TEXT,
  p_voter_id    TEXT,
  p_password    TEXT
)
RETURNS TABLE (id UUID, voter_id TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF LENGTH(TRIM(p_password)) < 8 THEN
    RAISE EXCEPTION 'PASSWORD_TOO_SHORT: Password must be at least 8 characters';
  END IF;

  RETURN QUERY
  INSERT INTO public.students (first_name, last_name, full_name, gender, year_section, voter_id, password_hash)
  VALUES (
    TRIM(p_first_name),
    TRIM(p_last_name),
    TRIM(p_first_name) || ' ' || TRIM(p_last_name),
    TRIM(p_gender),
    TRIM(p_year_section),
    LOWER(TRIM(p_voter_id)),
    crypt(p_password, gen_salt('bf', 10))
  )
  RETURNING students.id, students.voter_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_student(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;

-- Function to login with voter_id instead of email
CREATE OR REPLACE FUNCTION public.voter_login(
  p_voter_id TEXT,
  p_password TEXT
)
RETURNS TABLE (
  id             UUID,
  full_name      TEXT,
  first_name     TEXT,
  last_name      TEXT,
  gender         TEXT,
  year_section   TEXT,
  voter_id       TEXT,
  has_voted      BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT s.id, s.full_name, s.first_name, s.last_name, s.gender, s.year_section, s.voter_id, s.has_voted
  FROM   public.students s
  WHERE  s.voter_id = LOWER(TRIM(p_voter_id))
    AND  s.password_hash IS NOT NULL
    AND  s.password_hash = crypt(p_password, s.password_hash)
  LIMIT  1;
$$;

GRANT EXECUTE ON FUNCTION public.voter_login(TEXT, TEXT) TO anon;
