-- Les thématiques basculent sur le journal des événements (ADR 0001, étape 3).
-- Chaque ligne existante entre dans le journal par un événement d'import daté
-- et signé comme la ligne. Les affectations aux sujets vivent dans le flux de
-- chaque sujet. Idempotent : une thématique qui a déjà un flux (bascule à la
-- demande) est laissée telle quelle.

INSERT INTO domain_events (stream_type, stream_id, revision, type, payload, actor_id, metadata, occurred_at)
SELECT
  'theme',
  t.id,
  1,
  'ThemeImported',
  jsonb_build_object('name', t.name, 'slug', t.slug, 'description', t.description),
  t.created_by,
  '{"source": "backfill"}'::jsonb,
  t.created_at
FROM themes t
WHERE NOT EXISTS (
  SELECT 1 FROM domain_events e WHERE e.stream_type = 'theme' AND e.stream_id = t.id
);
