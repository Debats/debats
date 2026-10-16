-- Arguments were modelled from the start (an argument belongs to a subject, a
-- statement mobilises arguments) but never written to. Before the first UI:
-- mandatory audit fields, soft delete, no duplicate titles within a subject,
-- and the projections the subject page and the statement lists read.

ALTER TABLE arguments
  ALTER COLUMN created_by SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL,
  ADD COLUMN updated_by UUID NOT NULL REFERENCES contributors(id),
  ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX idx_arguments_not_deleted ON arguments (id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX idx_arguments_subject_title
  ON arguments (subject_id, lower(title)) WHERE deleted_at IS NULL;

ALTER TABLE argument_statements
  ALTER COLUMN created_at SET NOT NULL,
  ADD COLUMN created_by UUID NOT NULL REFERENCES contributors(id);

CREATE INDEX idx_argument_statements_statement_id ON argument_statements (statement_id);

-- Soft delete of a subject now hides its arguments too
CREATE OR REPLACE FUNCTION soft_delete_subject(p_id UUID)
RETURNS VOID AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
BEGIN
  UPDATE statements SET deleted_at = v_now
    WHERE position_id IN (SELECT id FROM positions WHERE subject_id = p_id AND deleted_at IS NULL)
      AND deleted_at IS NULL;
  UPDATE positions SET deleted_at = v_now
    WHERE subject_id = p_id AND deleted_at IS NULL;
  UPDATE arguments SET deleted_at = v_now
    WHERE subject_id = p_id AND deleted_at IS NULL;
  UPDATE subjects SET deleted_at = v_now WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Read model of the Arguments tab: each argument of a subject with how often it
-- is mobilised, by which positions, and by whom.
CREATE FUNCTION get_subject_arguments_summary(
  p_subject_id UUID,
  p_authors_limit INT DEFAULT 8
)
RETURNS TABLE (
  argument_id UUID,
  title TEXT,
  description TEXT,
  statements_count BIGINT,
  positions JSONB,
  total_authors_count BIGINT,
  authors JSONB
) AS $$
  WITH live AS (
    SELECT s.id, s.position_id, s.public_figure_id, s.organisation_id, s.stated_at, s.created_at,
           l.argument_id
    FROM argument_statements l
    JOIN statements s ON s.id = l.statement_id AND s.deleted_at IS NULL
    JOIN positions p ON p.id = s.position_id AND p.deleted_at IS NULL
  )
  SELECT
    a.id AS argument_id,
    a.title::text,
    a.description,
    COUNT(DISTINCT s.id) AS statements_count,
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', p.id, 'title', p.title, 'slug', p.slug, 'statementsCount', p.n
      ) ORDER BY p.n DESC), '[]'::jsonb)
      FROM (
        SELECT p2.id, p2.title, p2.slug, COUNT(DISTINCT s2.id) AS n
        FROM live s2
        JOIN positions p2 ON p2.id = s2.position_id
        WHERE s2.argument_id = a.id
        GROUP BY p2.id, p2.title, p2.slug
      ) p
    ) AS positions,
    COUNT(DISTINCT s.public_figure_id) + COUNT(DISTINCT s.organisation_id) AS total_authors_count,
    (
      SELECT COALESCE(jsonb_agg(author), '[]'::jsonb)
      FROM (
        SELECT DISTINCT ON (COALESCE(s3.public_figure_id, s3.organisation_id))
          CASE
            WHEN o3.id IS NOT NULL THEN jsonb_build_object(
              'kind', 'organisation', 'id', o3.id, 'name', o3.name, 'slug', o3.slug, 'acronym', o3.acronym
            )
            ELSE jsonb_build_object(
              'kind', 'public_figure', 'id', pf3.id, 'name', pf3.name, 'slug', pf3.slug, 'acronym', NULL
            )
          END AS author
        FROM live s3
        LEFT JOIN public_figures pf3 ON pf3.id = s3.public_figure_id AND pf3.deleted_at IS NULL
        LEFT JOIN organisations o3 ON o3.id = s3.organisation_id AND o3.deleted_at IS NULL
        WHERE s3.argument_id = a.id AND (pf3.id IS NOT NULL OR o3.id IS NOT NULL)
        ORDER BY COALESCE(s3.public_figure_id, s3.organisation_id), s3.stated_at DESC
        LIMIT p_authors_limit
      ) authors
    ) AS authors
  FROM arguments a
  LEFT JOIN live s ON s.argument_id = a.id
  WHERE a.subject_id = p_subject_id
  AND a.deleted_at IS NULL
  GROUP BY a.id, a.title, a.description
  ORDER BY statements_count DESC, a.created_at ASC;
$$ LANGUAGE sql;

-- The featured statement of each position now carries its arguments
DROP FUNCTION IF EXISTS get_subject_positions_summary(UUID, INT, TEXT);

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
        END,
        'arguments', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title) ORDER BY a.title), '[]'::jsonb)
          FROM argument_statements l
          JOIN arguments a ON a.id = l.argument_id AND a.deleted_at IS NULL
          WHERE l.statement_id = s3.id
        )
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
