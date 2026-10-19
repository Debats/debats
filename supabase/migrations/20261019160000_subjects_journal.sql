-- Les sujets basculent sur le journal des événements (ADR 0001, étape 3).
-- Un sujet est un seul flux qui porte aussi ses positions, ses thématiques et
-- ses liens vers d'autres sujets. Chaque ligne existante entre dans le journal
-- par des événements d'import datés et signés comme les lignes : le sujet
-- d'abord, puis chaque position à sa date, les thématiques, les liens, et la
-- suppression s'il y a lieu. Idempotent : un sujet qui a déjà un flux
-- (bascule à la demande) est laissé tel quel.

WITH facts AS (
  SELECT s.id AS subject_id, s.created_at AS at, 0 AS rank, 'SubjectImported' AS type,
    jsonb_strip_nulls(jsonb_build_object(
      'title', s.title, 'slug', s.slug, 'presentation', s.presentation,
      'problem', s.problem, 'pictureUrl', s.picture_url
    )) AS payload,
    s.created_by AS actor_id
  FROM subjects s

  UNION ALL
  SELECT p.subject_id, p.created_at, 1, 'PositionImported',
    jsonb_build_object('positionId', p.id, 'title', p.title, 'slug', p.slug, 'description', p.description),
    p.created_by
  FROM positions p

  UNION ALL
  SELECT p.subject_id, p.deleted_at, 2, 'PositionRemoved',
    jsonb_build_object('positionId', p.id), NULL
  FROM positions p
  WHERE p.deleted_at IS NOT NULL

  UNION ALL
  SELECT st.subject_id, max(st.created_at), 3, 'SubjectThemesSet',
    jsonb_build_object('themes', jsonb_agg(
      jsonb_build_object('themeId', st.theme_id, 'isPrimary', st.is_primary)
      ORDER BY st.is_primary DESC, st.created_at
    )),
    (array_agg(st.created_by ORDER BY st.created_at DESC))[1]
  FROM subject_themes st
  GROUP BY st.subject_id

  UNION ALL
  SELECT r.subject_id_1, r.created_at, 4, 'SubjectLinked',
    jsonb_build_object('subjectId', r.subject_id_2), r.created_by
  FROM related_subjects r

  UNION ALL
  SELECT r.subject_id_2, r.created_at, 4, 'SubjectLinked',
    jsonb_build_object('subjectId', r.subject_id_1), r.created_by
  FROM related_subjects r

  UNION ALL
  SELECT s.id, s.deleted_at, 5, 'SubjectDeleted', '{}'::jsonb, NULL
  FROM subjects s
  WHERE s.deleted_at IS NOT NULL
)
INSERT INTO domain_events (stream_type, stream_id, revision, type, payload, actor_id, metadata, occurred_at)
SELECT
  'subject',
  f.subject_id,
  -- Le sujet ouvre toujours son flux, puis les faits dans l'ordre du temps
  row_number() OVER (PARTITION BY f.subject_id ORDER BY (f.rank = 0) DESC, f.at, f.rank),
  f.type,
  f.payload,
  f.actor_id,
  '{"source": "backfill"}'::jsonb,
  COALESCE(f.at, now())
FROM facts f
WHERE NOT EXISTS (
  SELECT 1 FROM domain_events e WHERE e.stream_type = 'subject' AND e.stream_id = f.subject_id
);

-- Plus de logique métier dans le SQL : la fusion et la suppression sont des
-- commandes du domaine (merge-positions, delete-subject).
DROP FUNCTION IF EXISTS merge_positions(UUID, UUID);
DROP FUNCTION IF EXISTS soft_delete_subject(UUID);
DROP FUNCTION IF EXISTS soft_delete_position(UUID);
