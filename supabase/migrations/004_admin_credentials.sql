-- =============================================================================
-- 004_admin_credentials.sql
-- Replaces the Supabase-Auth-linked admins table with a self-contained
-- admins table that stores email + bcrypt password hash.
-- Admins log in via the admin_login() RPC — no Supabase Auth session needed.
-- Admin dashboard operations use the service role key (bypasses RLS).
-- =============================================================================

-- pgcrypto is already enabled by 001_schema.sql, but guard anyway
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Drop the old admins table (created by 003_admin.sql) and its policies.
--    CASCADE drops the dependent is_admin() usages and policies.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.admins CASCADE;

-- Drop old is_admin() with CASCADE to remove all dependent RLS policies.
-- Those policies are recreated implicitly as stubs (is_admin() returns FALSE,
-- so they never match) — the service role key bypasses RLS for admin writes.
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- ---------------------------------------------------------------------------
-- 2. New admins table: email + bcrypt password hash, no FK to auth.users
-- ---------------------------------------------------------------------------
CREATE TABLE public.admins (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lock it down completely — all access via SECURITY DEFINER RPCs or
-- the service-role client (which bypasses RLS entirely).
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
-- No policies → zero direct access from any anon/authenticated JWT

-- ---------------------------------------------------------------------------
-- 3. is_admin() stub (kept so 003_admin.sql policies compile without error)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT FALSE;
$$;

-- ---------------------------------------------------------------------------
-- 4. admin_login(email, password) RPC
--    Returns (id, email) if credentials match, empty set if not.
--    Runs as SECURITY DEFINER so it can read admins despite RLS lockdown.
--    Callable by anon role (before any auth session exists).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_login(
  p_email    TEXT,
  p_password TEXT
)
RETURNS TABLE (id UUID, email TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT a.id, a.email
  FROM   public.admins a
  WHERE  a.email         = LOWER(TRIM(p_email))
    AND  a.password_hash = crypt(p_password, a.password_hash)
  LIMIT  1;
$$;

-- Callable by both anon (login page before auth) and authenticated (just in case)
GRANT EXECUTE ON FUNCTION public.admin_login(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.admin_login(TEXT, TEXT) TO authenticated;

-- Also grant get_results to service_role so admin dashboard can call it
GRANT EXECUTE ON FUNCTION public.get_results(UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Seed the default admin account
--    Email:    admin@vote.local
--    Password: Admin1234!
--    Change via: UPDATE public.admins SET password_hash = crypt('newpass', gen_salt('bf',10)) WHERE email = 'admin@vote.local';
-- ---------------------------------------------------------------------------
INSERT INTO public.admins (email, password_hash)
VALUES (
  'admin@vote.local',
  extensions.crypt('Admin1234!', extensions.gen_salt('bf', 10))
)
ON CONFLICT (email) DO NOTHING;
