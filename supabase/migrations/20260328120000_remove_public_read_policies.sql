-- Remove "Public read" RLS policies from all domain tables.
-- All reads now go through the admin/service client (server components).
-- No direct Supabase API access is allowed — everything passes through the backend.

DROP POLICY IF EXISTS "Public read" ON subjects;
DROP POLICY IF EXISTS "Public read" ON public_figures;
DROP POLICY IF EXISTS "Public read" ON positions;
DROP POLICY IF EXISTS "Public read statements" ON statements;
DROP POLICY IF EXISTS "Public read" ON statements;
DROP POLICY IF EXISTS "Public read" ON arguments;
DROP POLICY IF EXISTS "Public read" ON argument_statements;
