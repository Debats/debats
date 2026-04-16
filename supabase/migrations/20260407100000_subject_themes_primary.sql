-- Allow a subject to have AT MOST ONE primary theme among its assigned themes
-- The /s page groups subjects by their primary theme

ALTER TABLE subject_themes
  ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT FALSE;

-- Partial unique index: at most one primary theme per subject
CREATE UNIQUE INDEX idx_subject_themes_one_primary_per_subject
  ON subject_themes (subject_id)
  WHERE is_primary = TRUE;
