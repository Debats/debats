-- Arguments become global tags, as the guide always described them: one title
-- for the whole site, so that « Dignité de la personne » mobilised on two
-- subjects is one argument and a public figure's recurring reasoning shows
-- across subjects. Which subjects and positions an argument serves is read
-- from the statements that mobilise it. The table was never written to.

DROP FUNCTION IF EXISTS get_subject_arguments_summary(UUID, INT);

ALTER TABLE arguments DROP COLUMN subject_id;
ALTER TABLE arguments ALTER COLUMN description SET DEFAULT '';
ALTER TABLE arguments ADD COLUMN slug VARCHAR(255) NOT NULL;

CREATE UNIQUE INDEX idx_arguments_slug ON arguments (slug) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_arguments_title ON arguments (lower(title)) WHERE deleted_at IS NULL;

-- A subject's soft delete no longer touches arguments, they are not its own
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
  UPDATE subjects SET deleted_at = v_now WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Merging an argument into another: its statements now mobilise the target
-- (never twice), and it disappears
CREATE OR REPLACE FUNCTION merge_arguments(source_id UUID, target_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO argument_statements (argument_id, statement_id, created_by)
  SELECT target_id, l.statement_id, l.created_by
  FROM argument_statements l
  WHERE l.argument_id = source_id
    AND NOT EXISTS (
      SELECT 1 FROM argument_statements t
      WHERE t.argument_id = target_id AND t.statement_id = l.statement_id
    );
  DELETE FROM argument_statements WHERE argument_id = source_id;
  UPDATE arguments SET deleted_at = now() WHERE id = source_id;
END;
$$ LANGUAGE plpgsql;

-- Read model of the arguments index and of the form's suggestions
CREATE VIEW v_argument_summary AS
  SELECT
    a.id,
    a.title,
    a.slug,
    a.description,
    COALESCE(agg.statements_count, 0)::integer AS statements_count,
    COALESCE(agg.subjects_count, 0)::integer AS subjects_count
  FROM arguments a
  LEFT JOIN LATERAL (
    SELECT count(DISTINCT s.id) AS statements_count, count(DISTINCT p.subject_id) AS subjects_count
    FROM argument_statements l
    JOIN statements s ON s.id = l.statement_id AND s.deleted_at IS NULL
    JOIN positions p ON p.id = s.position_id AND p.deleted_at IS NULL
    WHERE l.argument_id = a.id
  ) agg ON true
  WHERE a.deleted_at IS NULL;

-- Read model of a subject's Arguments tab: the arguments its statements mobilise
CREATE FUNCTION get_subject_arguments_summary(
  p_subject_id UUID,
  p_authors_limit INT DEFAULT 8
)
RETURNS TABLE (
  argument_id UUID,
  title TEXT,
  slug TEXT,
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
    WHERE p.subject_id = p_subject_id
  )
  SELECT
    a.id AS argument_id,
    a.title::text,
    a.slug::text,
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
  JOIN live s ON s.argument_id = a.id
  WHERE a.deleted_at IS NULL
  GROUP BY a.id, a.title, a.slug, a.description, a.created_at
  ORDER BY statements_count DESC, a.created_at ASC;
$$ LANGUAGE sql;

-- The featured statement's arguments now carry their slug, to link to the argument's page
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
          SELECT COALESCE(jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'slug', a.slug) ORDER BY a.title), '[]'::jsonb)
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
