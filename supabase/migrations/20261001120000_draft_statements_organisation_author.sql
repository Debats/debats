-- A draft statement is authored by exactly one actor: a public figure or an organisation.
-- Organisations take positions through their communiqués, programmes, votes and actions.

ALTER TABLE draft_statements ALTER COLUMN public_figure_name DROP NOT NULL;

ALTER TABLE draft_statements
  ADD COLUMN organisation_name TEXT,
  ADD COLUMN organisation_data JSONB;

ALTER TABLE draft_statements
  ADD CONSTRAINT draft_statements_single_author
  CHECK ((public_figure_name IS NULL) <> (organisation_name IS NULL));

-- Drafts used to always produce a declaration; a programme or a vote is not one.
ALTER TABLE draft_statements
  ADD COLUMN statement_type statement_type NOT NULL DEFAULT 'declaration';
