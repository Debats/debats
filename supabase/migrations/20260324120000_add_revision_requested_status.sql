ALTER TABLE draft_statements DROP CONSTRAINT draft_statements_status_check;
ALTER TABLE draft_statements ADD CONSTRAINT draft_statements_status_check
  CHECK (status IN ('pending', 'validated', 'rejected', 'revision_requested'));
