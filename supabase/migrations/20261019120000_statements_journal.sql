-- Les prises de position basculent sur le journal des événements (ADR 0001,
-- étape 2). Chaque ligne existante entre dans le journal par un événement
-- d'import qui porte son état complet, daté et signé comme la ligne ; une
-- ligne supprimée reçoit en plus l'événement de suppression. Idempotent :
-- une ligne déjà dans le journal (bascule à la demande) est laissée telle quelle.

INSERT INTO domain_events (stream_type, stream_id, revision, type, payload, actor_id, metadata, occurred_at)
SELECT
  'statement',
  s.id,
  1,
  'StatementImported',
  jsonb_strip_nulls(jsonb_build_object(
    'author', CASE
      WHEN s.organisation_id IS NOT NULL THEN jsonb_build_object('kind', 'organisation', 'id', s.organisation_id)
      ELSE jsonb_build_object('kind', 'public_figure', 'id', s.public_figure_id)
    END,
    'positionId', s.position_id,
    'statementType', s.statement_type,
    'sourceName', s.source_name,
    'sourceUrl', s.source_url,
    'quote', s.quote,
    'statedAt', to_char(s.stated_at, 'YYYY-MM-DD'),
    'argumentIds', COALESCE(
      (SELECT jsonb_agg(a.argument_id ORDER BY a.created_at) FROM argument_statements a WHERE a.statement_id = s.id),
      '[]'::jsonb
    )
  )),
  s.created_by,
  '{"source": "backfill"}'::jsonb,
  COALESCE(s.created_at, now())
FROM statements s
ON CONFLICT (stream_type, stream_id, revision) DO NOTHING;

INSERT INTO domain_events (stream_type, stream_id, revision, type, payload, actor_id, metadata, occurred_at)
SELECT 'statement', s.id, 2, 'StatementDeleted', '{}'::jsonb, NULL, '{"source": "backfill"}'::jsonb, s.deleted_at
FROM statements s
WHERE s.deleted_at IS NOT NULL
ON CONFLICT (stream_type, stream_id, revision) DO NOTHING;
