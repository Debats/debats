-- Drafts carry what a statement needs beyond its quote: the arguments it
-- mobilises, and — for a public figure author — her occupations and the
-- organisations she belongs to. All three are applied when the draft is
-- validated, so a reviewed draft no longer leaves work to redo by hand.

ALTER TABLE draft_statements
  ADD COLUMN arguments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN occupations jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN affiliations jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN draft_statements.arguments IS
  'Arguments the statement mobilises: [{ title, description }]. Titles are global site-wide; an existing one is reused, a new one is created at validation.';

COMMENT ON COLUMN draft_statements.occupations IS
  'Occupations of the public figure author: [{ name, current }]. Each name must match the closed occupations list.';

COMMENT ON COLUMN draft_statements.affiliations IS
  'Organisations the public figure author belongs to: [{ organisation, organisationData, role, startedOn, endedOn }]. No end date means the affiliation is current.';
