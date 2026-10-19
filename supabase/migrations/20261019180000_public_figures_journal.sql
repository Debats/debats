-- Les personnalités basculent sur le journal des événements (ADR 0001, étape 3).
-- Une personnalité est un seul flux qui porte aussi ses métiers et ses
-- affiliations. Chaque ligne existante entre dans le journal par des
-- événements d'import datés et signés comme les lignes : la personnalité
-- d'abord, puis chaque affiliation à sa date, les métiers, et la suppression
-- s'il y a lieu. Idempotent : une personnalité qui a déjà un flux (bascule à
-- la demande) est laissée telle quelle.

WITH facts AS (
  SELECT f.id AS figure_id, f.created_at AS at, 0 AS rank, 'PublicFigureImported' AS type,
    jsonb_strip_nulls(jsonb_build_object(
      'name', f.name, 'slug', f.slug, 'presentation', f.presentation,
      'wikipediaUrl', f.wikipedia_url, 'websiteUrl', f.website_url,
      'notorietySources', to_jsonb(COALESCE(f.notoriety_sources, '{}'::text[]))
    )) AS payload,
    f.created_by AS actor_id
  FROM public_figures f

  UNION ALL
  SELECT m.public_figure_id, m.created_at, 1, 'MembershipImported',
    jsonb_strip_nulls(jsonb_build_object(
      'membershipId', m.id, 'organisationId', m.organisation_id, 'role', m.role,
      'startedOn', to_char(m.started_on, 'YYYY-MM-DD'), 'endedOn', to_char(m.ended_on, 'YYYY-MM-DD')
    )),
    m.created_by
  FROM organisation_memberships m

  UNION ALL
  SELECT o.public_figure_id, max(o.created_at), 2, 'OccupationsSet',
    jsonb_build_object('occupations', jsonb_agg(
      jsonb_build_object('occupationId', o.occupation_id, 'current', o.is_current)
      ORDER BY o.created_at
    )),
    (array_agg(o.created_by ORDER BY o.created_at DESC))[1]
  FROM public_figure_occupations o
  GROUP BY o.public_figure_id

  UNION ALL
  SELECT f.id, f.deleted_at, 3, 'PublicFigureDeleted', '{}'::jsonb, NULL
  FROM public_figures f
  WHERE f.deleted_at IS NOT NULL
)
INSERT INTO domain_events (stream_type, stream_id, revision, type, payload, actor_id, metadata, occurred_at)
SELECT
  'public_figure',
  f.figure_id,
  -- La personnalité ouvre toujours son flux, puis les faits dans l'ordre du temps
  row_number() OVER (PARTITION BY f.figure_id ORDER BY (f.rank = 0) DESC, f.at, f.rank),
  f.type,
  f.payload,
  f.actor_id,
  '{"source": "backfill"}'::jsonb,
  COALESCE(f.at, now())
FROM facts f
WHERE NOT EXISTS (
  SELECT 1 FROM domain_events e WHERE e.stream_type = 'public_figure' AND e.stream_id = f.figure_id
);

-- Plus de logique métier dans le SQL : la suppression est une commande du domaine.
DROP FUNCTION IF EXISTS soft_delete_public_figure(UUID);
