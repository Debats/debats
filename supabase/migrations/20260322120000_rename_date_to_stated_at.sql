-- Rename date → stated_at (date is a SQL reserved word)
-- Fix FK constraint names inherited from the old evidences table

ALTER TABLE statements RENAME COLUMN date TO stated_at;

DROP INDEX IF EXISTS idx_statements_date;
CREATE INDEX idx_statements_stated_at ON statements(stated_at);

ALTER TABLE statements RENAME CONSTRAINT evidences_created_by_fkey TO statements_created_by_fkey;
ALTER TABLE statements RENAME CONSTRAINT evidences_public_figure_id_fkey TO statements_public_figure_id_fkey;
ALTER TABLE statements RENAME CONSTRAINT evidences_position_id_fkey TO statements_position_id_fkey;
ALTER TABLE statements RENAME CONSTRAINT evidences_pkey TO statements_pkey;

-- Recreate views with stated_at
DROP VIEW IF EXISTS v_subject_activity_summary;
DROP VIEW IF EXISTS v_public_figure_activity_summary;

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
  LEFT JOIN statements st ON st.position_id = p.id
  WHERE p.subject_id = s.id
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
    LIMIT 15
  ) sub
) fig ON true;

GRANT SELECT ON v_subject_activity_summary TO anon, authenticated;

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
) agg ON true;

GRANT SELECT ON v_public_figure_activity_summary TO anon, authenticated;
