-- Les invitations basculent sur le journal des événements (ADR 0001). Un flux
-- par invitation : chaque ligne existante entre dans le journal par un
-- événement d'import daté et signé par l'invitant, suivi de l'acceptation
-- datée et signée par l'invité·e si elle a eu lieu. L'acceptation s'écrit à
-- la révision du flux : deux acceptations ne peuvent plus passer toutes les
-- deux. Idempotent : une invitation qui a déjà un flux est laissée telle quelle.

INSERT INTO domain_events (stream_type, stream_id, revision, type, payload, actor_id, metadata, occurred_at)
SELECT
  'invitation',
  i.id,
  1,
  'InvitationImported',
  jsonb_build_object('inviteeEmail', i.invitee_email, 'inviteeName', i.invitee_name),
  i.inviter_id,
  '{"source": "backfill"}'::jsonb,
  COALESCE(i.created_at, now())
FROM invitations i
WHERE NOT EXISTS (
  SELECT 1 FROM domain_events e WHERE e.stream_type = 'invitation' AND e.stream_id = i.id
);

INSERT INTO domain_events (stream_type, stream_id, revision, type, payload, actor_id, metadata, occurred_at)
SELECT
  'invitation',
  i.id,
  2,
  'InvitationAccepted',
  jsonb_build_object('inviteeId', i.invitee_id),
  i.invitee_id,
  '{"source": "backfill"}'::jsonb,
  COALESCE(i.updated_at, i.created_at, now())
FROM invitations i
WHERE i.status = 'accepted'
  AND i.invitee_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM domain_events e
    WHERE e.stream_type = 'invitation' AND e.stream_id = i.id
      AND e.revision = 1 AND e.metadata->>'source' = 'backfill'
  )
  AND NOT EXISTS (
    SELECT 1 FROM domain_events e
    WHERE e.stream_type = 'invitation' AND e.stream_id = i.id AND e.revision = 2
  );

-- Le projecteur date la ligne comme l'événement : plus de trigger updated_at
DROP TRIGGER IF EXISTS update_invitations_updated_at ON public.invitations;
