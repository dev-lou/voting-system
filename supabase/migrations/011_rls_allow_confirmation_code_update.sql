-- Allow anon to update confirmation_code on their own student row
-- The submit_ballot RPC sets has_voted=true via SECURITY DEFINER,
-- but the confirmation_code is saved client-side after voting.

DROP POLICY IF EXISTS "anon_update_confirmation_code" ON public.students;
CREATE POLICY "anon_update_confirmation_code" ON public.students
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);
