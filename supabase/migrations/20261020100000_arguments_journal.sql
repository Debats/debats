-- Les arguments basculent sur le journal des événements (ADR 0001, étape 3).
-- Chaque ligne existante entre dans le journal par un événement d'import daté
-- et signé comme la ligne, suivi d'une suppression si la ligne était effacée
-- (une fusion passée ne se distingue pas d'une suppression). Les liens vers
-- les prises de position vivent dans le flux de chacune d'elles. Idempotent :
-- un argument qui a déjà un flux (bascule à la demande) est laissé tel quel.

WITH facts AS (
  SELECT a.id AS argument_id, a.created_at AS at, 0 AS rank, 'ArgumentImported' AS type,
    jsonb_build_object('title', a.title, 'slug', a.slug, 'description', a.description) AS payload,
    a.created_by AS actor_id
  FROM arguments a

  UNION ALL
  SELECT a.id, a.deleted_at, 1, 'ArgumentDeleted', '{}'::jsonb, NULL
  FROM arguments a
  WHERE a.deleted_at IS NOT NULL
)
INSERT INTO domain_events (stream_type, stream_id, revision, type, payload, actor_id, metadata, occurred_at)
SELECT
  'argument',
  f.argument_id,
  row_number() OVER (PARTITION BY f.argument_id ORDER BY f.rank),
  f.type,
  f.payload,
  f.actor_id,
  '{"source": "backfill"}'::jsonb,
  COALESCE(f.at, now())
FROM facts f
WHERE NOT EXISTS (
  SELECT 1 FROM domain_events e WHERE e.stream_type = 'argument' AND e.stream_id = f.argument_id
);

-- Plus de logique métier dans le SQL : la fusion est une commande du domaine,
-- qui écrit un événement sur l'argument fondu et sur chaque prise de position.
DROP FUNCTION IF EXISTS merge_arguments(UUID, UUID);
