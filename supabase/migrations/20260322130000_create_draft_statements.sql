-- Draft statements: AI-generated drafts awaiting human validation
CREATE TABLE draft_statements (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Statement data
  quote                TEXT NOT NULL,
  source_name          VARCHAR(255) NOT NULL,
  source_url           TEXT NOT NULL,
  date                 DATE NOT NULL,
  ai_notes             TEXT,

  -- References by name (resolved by slug at validation time)
  public_figure_name   TEXT NOT NULL,
  subject_title        TEXT NOT NULL,
  position_title       TEXT NOT NULL,

  -- Creation data if entity does not exist (nullable JSONB)
  public_figure_data   JSONB,
  subject_data         JSONB,
  position_data        JSONB,

  status               VARCHAR(20) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'validated', 'rejected')),
  rejection_note       TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_draft_statements_updated_at
  BEFORE UPDATE ON draft_statements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS enabled but no policies: only service role can access this table.
-- All operations go through createAdminSupabaseClient() in the application layer,
-- which verifies admin permissions before any action.
ALTER TABLE draft_statements ENABLE ROW LEVEL SECURITY;
