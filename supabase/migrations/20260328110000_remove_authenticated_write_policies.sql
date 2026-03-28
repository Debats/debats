-- Remove permissive "Authenticated write" RLS policies from all tables.
-- All writes now go through the admin/service client (which bypasses RLS).
-- The domain layer handles authorization (reputation-based permissions).
-- Only "Public read" policies are kept for SELECT access.

DROP POLICY IF EXISTS "Authenticated write" ON subjects;
DROP POLICY IF EXISTS "Authenticated write" ON public_figures;
DROP POLICY IF EXISTS "Authenticated write" ON positions;
DROP POLICY IF EXISTS "Authenticated write statements" ON statements;
DROP POLICY IF EXISTS "Authenticated write" ON arguments;
DROP POLICY IF EXISTS "Authenticated write" ON argument_statements;
DROP POLICY IF EXISTS "Authenticated write" ON contributors;
