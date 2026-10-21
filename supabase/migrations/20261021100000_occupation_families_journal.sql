-- Les familles de métiers basculent sur le journal des événements (ADR 0001, étape 3).
-- Une famille est un seul flux qui porte aussi ses métiers. Chaque ligne existante
-- entre dans le journal par des événements d'import datés et signés comme les
-- lignes : la famille d'abord, puis chaque métier à sa date. Les métiers d'une
-- personnalité vivent dans le flux de la personnalité. Idempotent : une famille
-- qui a déjà un flux (bascule à la demande) est laissée telle quelle.

WITH facts AS (
  SELECT f.id AS family_id, f.created_at AS at, 0 AS rank, 'OccupationFamilyImported' AS type,
    jsonb_build_object(
      'name', f.name, 'slug', f.slug, 'description', f.description, 'position', f.position
    ) AS payload,
    f.created_by AS actor_id
  FROM occupation_families f

  UNION ALL
  SELECT o.family_id, o.created_at, 1, 'OccupationImported',
    jsonb_build_object(
      'occupationId', o.id, 'name', o.name, 'slug', o.slug, 'description', o.description
    ),
    o.created_by
  FROM occupations o
)
INSERT INTO domain_events (stream_type, stream_id, revision, type, payload, actor_id, metadata, occurred_at)
SELECT
  'occupation_family',
  f.family_id,
  -- La famille ouvre toujours son flux, puis ses métiers dans l'ordre du temps
  row_number() OVER (PARTITION BY f.family_id ORDER BY (f.rank = 0) DESC, f.at, f.rank),
  f.type,
  f.payload,
  f.actor_id,
  '{"source": "backfill"}'::jsonb,
  f.at
FROM facts f
WHERE NOT EXISTS (
  SELECT 1 FROM domain_events e WHERE e.stream_type = 'occupation_family' AND e.stream_id = f.family_id
);
