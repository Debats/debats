-- Les organisations basculent sur le journal des événements (ADR 0001, étape 3).
-- Chaque ligne existante entre dans le journal par un événement d'import daté
-- et signé comme la ligne, suivi de la suppression s'il y a lieu. Les
-- affiliations vivent dans le flux des personnalités qu'elles concernent.
-- Idempotent : une organisation qui a déjà un flux (bascule à la demande) est
-- laissée telle quelle.

WITH facts AS (
  SELECT o.id AS organisation_id, o.created_at AS at, 0 AS rank, 'OrganisationImported' AS type,
    jsonb_strip_nulls(jsonb_build_object(
      'name', o.name, 'slug', o.slug, 'acronym', o.acronym,
      'organisationType', o.organisation_type, 'presentation', o.presentation,
      'wikipediaUrl', o.wikipedia_url, 'websiteUrl', o.website_url,
      'notorietySources', to_jsonb(COALESCE(o.notoriety_sources, '{}'::text[]))
    )) AS payload,
    o.created_by AS actor_id
  FROM organisations o

  UNION ALL
  SELECT o.id, o.deleted_at, 1, 'OrganisationDeleted', '{}'::jsonb, NULL
  FROM organisations o
  WHERE o.deleted_at IS NOT NULL
)
INSERT INTO domain_events (stream_type, stream_id, revision, type, payload, actor_id, metadata, occurred_at)
SELECT
  'organisation',
  f.organisation_id,
  row_number() OVER (PARTITION BY f.organisation_id ORDER BY f.rank),
  f.type,
  f.payload,
  f.actor_id,
  '{"source": "backfill"}'::jsonb,
  COALESCE(f.at, now())
FROM facts f
WHERE NOT EXISTS (
  SELECT 1 FROM domain_events e WHERE e.stream_type = 'organisation' AND e.stream_id = f.organisation_id
);

-- Plus de logique métier dans le SQL : la suppression est une commande du domaine.
DROP FUNCTION IF EXISTS soft_delete_organisation(UUID);
