-- Ajoute à la projection des positions d'un sujet la prise de position la plus
-- récente de chaque position (citation mise en avant sur la page sujet).

DROP FUNCTION IF EXISTS get_subject_positions_summary(UUID, INT);

CREATE FUNCTION get_subject_positions_summary(
  p_subject_id UUID,
  p_figures_limit INT DEFAULT 20
)
RETURNS TABLE (
  position_id UUID,
  position_title TEXT,
  position_slug TEXT,
  position_description TEXT,
  total_figures_count BIGINT,
  figures JSONB,
  latest_statement JSONB
) AS $$
  SELECT
    p.id AS position_id,
    p.title AS position_title,
    p.slug AS position_slug,
    p.description AS position_description,
    COUNT(DISTINCT s.public_figure_id) AS total_figures_count,
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('id', pf.id, 'name', pf.name, 'slug', pf.slug)), '[]'::jsonb)
      FROM (
        SELECT DISTINCT ON (pf2.id) pf2.id, pf2.name, pf2.slug
        FROM statements s2
        JOIN public_figures pf2 ON pf2.id = s2.public_figure_id
        WHERE s2.position_id = p.id
        AND s2.deleted_at IS NULL
        ORDER BY pf2.id
        LIMIT p_figures_limit
      ) pf
    ) AS figures,
    (
      SELECT jsonb_build_object(
        'id', s3.id,
        'quote', s3.quote,
        'stated_at', s3.stated_at,
        'source_name', s3.source_name,
        'source_url', s3.source_url,
        'statement_type', s3.statement_type,
        'figure', jsonb_build_object('id', pf3.id, 'name', pf3.name, 'slug', pf3.slug)
      )
      FROM statements s3
      JOIN public_figures pf3 ON pf3.id = s3.public_figure_id
      WHERE s3.position_id = p.id
      AND s3.deleted_at IS NULL
      AND pf3.deleted_at IS NULL
      ORDER BY s3.stated_at DESC, s3.created_at DESC
      LIMIT 1
    ) AS latest_statement
  FROM positions p
  LEFT JOIN statements s ON s.position_id = p.id AND s.deleted_at IS NULL
  WHERE p.subject_id = p_subject_id
  AND p.deleted_at IS NULL
  GROUP BY p.id, p.title, p.slug, p.description
  ORDER BY total_figures_count DESC;
$$ LANGUAGE sql;
