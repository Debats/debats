-- Read model: subject summaries with activity stats
-- Used by the homepage to display subjects ordered by latest statement

CREATE VIEW subject_activity_summary AS
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
    MAX(st.taken_at) AS latest_statement_at
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
  ) sub
) fig ON true;

GRANT SELECT ON subject_activity_summary TO anon, authenticated;
