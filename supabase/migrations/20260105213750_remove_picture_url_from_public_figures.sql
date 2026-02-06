-- Remove picture_url from public_figures
-- Avatars are now stored in Supabase Storage with convention {slug}.jpg
ALTER TABLE public_figures DROP COLUMN picture_url;