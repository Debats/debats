-- A statement says something, or it does something, and the two are not
-- recorded alike. A declaration and a programme carry words — a verbatim
-- quote. A vote and an act carry no words of their own: a vote names the text
-- it bears on and the way it went, an act names what was done. The words that
-- justify a vote are an explication de vote: a declaration in their own right,
-- spoken by whoever said them, which is rarely every voter.
--
-- Until now `quote` was mandatory whatever the type, so an act had to be
-- described in the quote field and was then displayed as if it had been
-- spoken. Hence 260 drafts whose « citation » read « Cosignataire d'un projet
-- de loi… ».

CREATE TYPE vote_choice AS ENUM ('pour', 'contre', 'abstention');

ALTER TABLE statements
  ADD COLUMN voted_text text,
  ADD COLUMN vote_choice vote_choice,
  ADD COLUMN deed text,
  ADD COLUMN document_name text,
  ALTER COLUMN quote DROP NOT NULL;

COMMENT ON COLUMN statements.quote IS
  'The words themselves, verbatim. Required for a declaration and a programme, empty for a vote and an act.';

COMMENT ON COLUMN statements.voted_text IS
  'Vote only: the text put to the ballot, as it is named there.';

COMMENT ON COLUMN statements.vote_choice IS
  'Vote only: how the vote went. Not taking part is no position, so it is not a value here.';

COMMENT ON COLUMN statements.deed IS
  'Act only: what was done, as a short factual noun phrase.';

COMMENT ON COLUMN statements.document_name IS
  'Programme only: the programmatic document the commitment is quoted from, told apart from the source it was read in.';

-- Verifiability is the promise of the site: a statement nobody can check is
-- worth less than no statement. Every row has one already.
ALTER TABLE statements
  ALTER COLUMN source_url SET NOT NULL;

-- Drafts carry the same shape, so a reviewed draft needs no second pass.
ALTER TABLE draft_statements
  ADD COLUMN voted_text text,
  ADD COLUMN vote_choice vote_choice,
  ADD COLUMN deed text,
  ADD COLUMN document_name text,
  ALTER COLUMN quote DROP NOT NULL;
