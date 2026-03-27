-- Soft delete: add deleted_at column to editorial tables
-- Data is never physically deleted, only marked with a timestamp.

-- Step 1: Add deleted_at column
ALTER TABLE subjects ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public_figures ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE positions ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE statements ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Step 2: Partial indexes for efficient queries excluding soft-deleted rows
CREATE INDEX idx_subjects_not_deleted ON subjects(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_public_figures_not_deleted ON public_figures(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_positions_not_deleted ON positions(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_statements_not_deleted ON statements(id) WHERE deleted_at IS NULL;

-- Step 3: Atomic cascade soft-delete functions

CREATE OR REPLACE FUNCTION soft_delete_subject(p_id UUID)
RETURNS VOID AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Cascade: soft-delete statements linked to this subject's positions
  UPDATE statements SET deleted_at = v_now
    WHERE position_id IN (SELECT id FROM positions WHERE subject_id = p_id AND deleted_at IS NULL)
      AND deleted_at IS NULL;

  -- Cascade: soft-delete positions
  UPDATE positions SET deleted_at = v_now
    WHERE subject_id = p_id AND deleted_at IS NULL;

  -- Soft-delete the subject
  UPDATE subjects SET deleted_at = v_now WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION soft_delete_public_figure(p_id UUID)
RETURNS VOID AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Cascade: soft-delete all statements by this public figure
  UPDATE statements SET deleted_at = v_now
    WHERE public_figure_id = p_id AND deleted_at IS NULL;

  -- Soft-delete the public figure
  UPDATE public_figures SET deleted_at = v_now WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION soft_delete_position(p_id UUID)
RETURNS VOID AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Cascade: soft-delete statements linked to this position
  UPDATE statements SET deleted_at = v_now
    WHERE position_id = p_id AND deleted_at IS NULL;

  -- Soft-delete the position
  UPDATE positions SET deleted_at = v_now WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Fix merge_positions to soft-delete instead of hard-delete

CREATE OR REPLACE FUNCTION merge_positions(source_id UUID, target_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE statements SET position_id = target_id, updated_at = now()
    WHERE position_id = source_id AND deleted_at IS NULL;
  UPDATE positions SET deleted_at = now() WHERE id = source_id;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Recreate views to exclude soft-deleted rows

DROP VIEW IF EXISTS v_subject_activity_summary;
CREATE VIEW v_subject_activity_summary AS
SELECT
  s.id,
  s.title,
  s.slug,
  s.presentation,
  s.problem,
  s.picture_url,
  s.created_by,
  s.created_at,
  s.updated_at,
  COALESCE(agg.positions_count, 0)::integer AS positions_count,
  COALESCE(agg.statements_count, 0)::integer AS statements_count,
  COALESCE(agg.public_figures_count, 0)::integer AS public_figures_count,
  agg.latest_statement_at,
  COALESCE(fig.figures, '[]'::jsonb) AS figures
FROM subjects s
LEFT JOIN LATERAL (
  SELECT
    COUNT(DISTINCT p.id) AS positions_count,
    COUNT(DISTINCT st.id) AS statements_count,
    COUNT(DISTINCT st.public_figure_id) AS public_figures_count,
    MAX(st.stated_at) AS latest_statement_at
  FROM positions p
  LEFT JOIN statements st ON st.position_id = p.id AND st.deleted_at IS NULL
  WHERE p.subject_id = s.id AND p.deleted_at IS NULL
) agg ON true
LEFT JOIN LATERAL (
  SELECT jsonb_agg(
    jsonb_build_object('id', sub.id, 'name', sub.name, 'slug', sub.slug)
  ) AS figures
  FROM (
    SELECT DISTINCT pf.id, pf.name, pf.slug
    FROM statements st
    JOIN positions p ON st.position_id = p.id
    JOIN public_figures pf ON st.public_figure_id = pf.id
    WHERE p.subject_id = s.id
      AND st.deleted_at IS NULL
      AND p.deleted_at IS NULL
      AND pf.deleted_at IS NULL
    LIMIT 15
  ) sub
) fig ON true
WHERE s.deleted_at IS NULL;

GRANT SELECT ON v_subject_activity_summary TO anon, authenticated;

DROP VIEW IF EXISTS v_public_figure_activity_summary;
CREATE VIEW v_public_figure_activity_summary AS
SELECT
  pf.id,
  pf.name,
  pf.slug,
  pf.presentation,
  COALESCE(agg.statements_count, 0)::integer AS statements_count,
  COALESCE(agg.subjects_count, 0)::integer AS subjects_count,
  agg.latest_statement_at
FROM public_figures pf
LEFT JOIN LATERAL (
  SELECT
    COUNT(DISTINCT s.id) AS statements_count,
    COUNT(DISTINCT p.subject_id) AS subjects_count,
    MAX(s.stated_at) AS latest_statement_at
  FROM statements s
  JOIN positions p ON s.position_id = p.id
  WHERE s.public_figure_id = pf.id
    AND s.deleted_at IS NULL
    AND p.deleted_at IS NULL
) agg ON true
WHERE pf.deleted_at IS NULL;

GRANT SELECT ON v_public_figure_activity_summary TO anon, authenticated;
