-- Rename existing subject view to follow v_ convention
ALTER VIEW subject_activity_summary RENAME TO v_subject_activity_summary;

-- Read model: public figure summaries with activity stats
-- Used by the /p page to display figures ordered by activity
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
    MAX(s.taken_at) AS latest_statement_at
  FROM statements s
  JOIN positions p ON s.position_id = p.id
  WHERE s.public_figure_id = pf.id
) agg ON true;

GRANT SELECT ON v_public_figure_activity_summary TO anon, authenticated;
