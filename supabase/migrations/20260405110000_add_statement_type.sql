-- Statement type: qualifies the nature of a position statement
-- declaration = public speech, interview, tweet, op-ed
-- vote = parliamentary vote, committee vote
-- program = electoral program, bill proposal
-- act = decree, protest, resignation, boycott

CREATE TYPE statement_type AS ENUM ('declaration', 'vote', 'program', 'act');

ALTER TABLE statements
  ADD COLUMN statement_type statement_type NOT NULL DEFAULT 'declaration';

COMMENT ON COLUMN statements.statement_type IS 'Type of position statement: declaration, vote, program, or act';
