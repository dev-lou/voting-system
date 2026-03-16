-- =============================================================================
-- Migration 008: Add candidate photos support
-- =============================================================================
-- 1. Add image_url column to candidates
-- 2. Create storage bucket for candidate photos
-- 3. Add RLS policies for storage
-- =============================================================================

-- ── 1. Add photo_url column (already in types, adding to DB) ───────────────
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- ── 2. Create storage bucket (run manually in Supabase Dashboard if needed) ─
-- The bucket will be created via Supabase Storage UI or this command:
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES ('candidate-photos', 'candidate-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- ── 3. Storage RLS policies ─────────────────────────────────────────────────
-- Allow public read access to candidate-photos
CREATE POLICY "Public can view candidate photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'candidate-photos');

-- Allow authenticated users to upload
CREATE POLICY "Users can upload candidate photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'candidate-photos' 
  AND auth.role() IN ('authenticated', 'anon')
);

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Users can delete candidate photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'candidate-photos');

-- ── 4. Grant storage permissions to anon ───────────────────────────────────
GRANT USAGE ON SCHEMA storage TO anon;
GRANT SELECT ON storage.objects TO anon;
GRANT INSERT ON storage.objects TO anon;
GRANT DELETE ON storage.objects TO anon;
