CREATE OR REPLACE FUNCTION get_subject_positions_summary(
  p_subject_id UUID,
  p_figures_limit INT DEFAULT 20
)
RETURNS TABLE (
  position_id UUID,
  position_title TEXT,
  position_description TEXT,
  total_figures_count BIGINT,
  figures JSONB
) AS $$
  SELECT
    p.id AS position_id,
    p.title AS position_title,
    p.description AS position_description,
    COUNT(DISTINCT s.public_figure_id) AS total_figures_count,
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('id', pf.id, 'name', pf.name, 'slug', pf.slug)), '[]'::jsonb)
      FROM (
        SELECT DISTINCT ON (pf2.id) pf2.id, pf2.name, pf2.slug
        FROM statements s2
        JOIN public_figures pf2 ON pf2.id = s2.public_figure_id
        WHERE s2.position_id = p.id
        ORDER BY pf2.id
        LIMIT p_figures_limit
      ) pf
    ) AS figures
  FROM positions p
  LEFT JOIN statements s ON s.position_id = p.id
  WHERE p.subject_id = p_subject_id
  GROUP BY p.id, p.title, p.description
  ORDER BY total_figures_count DESC;
$$ LANGUAGE sql;
