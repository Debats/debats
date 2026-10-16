-- The subject page projection now counts and lists organisations alongside public
-- figures, exposes the latest statement's author whatever its kind, and can be
-- restricted to one kind of author (the Personnalités / Organisations filter).

DROP FUNCTION IF EXISTS get_subject_positions_summary(UUID, INT);

CREATE FUNCTION get_subject_positions_summary(
  p_subject_id UUID,
  p_authors_limit INT DEFAULT 20,
  p_author_kind TEXT DEFAULT NULL
)
RETURNS TABLE (
  position_id UUID,
  position_title TEXT,
  position_slug TEXT,
  position_description TEXT,
  total_figures_count BIGINT,
  total_organisations_count BIGINT,
  figures JSONB,
  organisations JSONB,
  latest_statement JSONB
) AS $$
  WITH live AS (
    SELECT s.*
    FROM statements s
    WHERE s.deleted_at IS NULL
      AND (
        p_author_kind IS NULL
        OR (p_author_kind = 'public_figure' AND s.public_figure_id IS NOT NULL)
        OR (p_author_kind = 'organisation' AND s.organisation_id IS NOT NULL)
      )
  )
  SELECT
    p.id AS position_id,
    p.title AS position_title,
    p.slug AS position_slug,
    p.description AS position_description,
    COUNT(DISTINCT s.public_figure_id) AS total_figures_count,
    COUNT(DISTINCT s.organisation_id) AS total_organisations_count,
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'kind', 'public_figure', 'id', pf.id, 'name', pf.name, 'slug', pf.slug, 'acronym', NULL
      )), '[]'::jsonb)
      FROM (
        SELECT DISTINCT ON (pf2.id) pf2.id, pf2.name, pf2.slug
        FROM live s2
        JOIN public_figures pf2 ON pf2.id = s2.public_figure_id AND pf2.deleted_at IS NULL
        WHERE s2.position_id = p.id
        ORDER BY pf2.id
        LIMIT p_authors_limit
      ) pf
    ) AS figures,
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'kind', 'organisation', 'id', o.id, 'name', o.name, 'slug', o.slug, 'acronym', o.acronym
      )), '[]'::jsonb)
      FROM (
        SELECT DISTINCT ON (o2.id) o2.id, o2.name, o2.slug, o2.acronym
        FROM live s2
        JOIN organisations o2 ON o2.id = s2.organisation_id AND o2.deleted_at IS NULL
        WHERE s2.position_id = p.id
        ORDER BY o2.id
        LIMIT p_authors_limit
      ) o
    ) AS organisations,
    (
      SELECT jsonb_build_object(
        'id', s3.id,
        'quote', s3.quote,
        'stated_at', s3.stated_at,
        'source_name', s3.source_name,
        'source_url', s3.source_url,
        'statement_type', s3.statement_type,
        'author', CASE
          WHEN o3.id IS NOT NULL THEN jsonb_build_object(
            'kind', 'organisation', 'id', o3.id, 'name', o3.name, 'slug', o3.slug, 'acronym', o3.acronym
          )
          ELSE jsonb_build_object(
            'kind', 'public_figure', 'id', pf3.id, 'name', pf3.name, 'slug', pf3.slug, 'acronym', NULL
          )
        END
      )
      FROM live s3
      LEFT JOIN public_figures pf3 ON pf3.id = s3.public_figure_id AND pf3.deleted_at IS NULL
      LEFT JOIN organisations o3 ON o3.id = s3.organisation_id AND o3.deleted_at IS NULL
      WHERE s3.position_id = p.id
        AND (pf3.id IS NOT NULL OR o3.id IS NOT NULL)
      ORDER BY s3.stated_at DESC, s3.created_at DESC
      LIMIT 1
    ) AS latest_statement
  FROM positions p
  LEFT JOIN live s ON s.position_id = p.id
  WHERE p.subject_id = p_subject_id
  AND p.deleted_at IS NULL
  GROUP BY p.id, p.title, p.slug, p.description
  ORDER BY (COUNT(DISTINCT s.public_figure_id) + COUNT(DISTINCT s.organisation_id)) DESC;
$$ LANGUAGE sql;
