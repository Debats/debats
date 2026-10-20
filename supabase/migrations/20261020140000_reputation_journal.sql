-- La réputation bascule sur le journal des événements (ADR 0001, étape 3).
-- Un flux par contributeur, sans événement de création : le compte appartient
-- à l'authentification, le flux s'ouvre au premier gain. Chaque ligne de
-- reputation_events entre dans le journal, datée comme la ligne, dans l'ordre
-- du temps. Idempotent : un contributeur qui a déjà un flux est laissé tel quel.

INSERT INTO domain_events (stream_type, stream_id, revision, type, payload, actor_id, metadata, occurred_at)
SELECT
  'contributor',
  r.contributor_id,
  row_number() OVER (PARTITION BY r.contributor_id ORDER BY r.created_at, r.id),
  'ReputationGranted',
  jsonb_strip_nulls(jsonb_build_object(
    'grantId', r.id,
    'action', r.action,
    'amount', r.amount,
    'relatedEntityType', r.related_entity_type,
    'relatedEntityId', r.related_entity_id
  )),
  NULL,
  '{"source": "backfill"}'::jsonb,
  COALESCE(r.created_at, now())
FROM reputation_events r
WHERE NOT EXISTS (
  SELECT 1 FROM domain_events e WHERE e.stream_type = 'contributor' AND e.stream_id = r.contributor_id
);
