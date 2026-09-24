-- A statement is authored by exactly one actor: a public figure or an organisation.
-- Organisations take positions through their communiqués, programmes, votes and actions.

ALTER TABLE statements ALTER COLUMN public_figure_id DROP NOT NULL;

ALTER TABLE statements
  ADD COLUMN organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE;

ALTER TABLE statements
  ADD CONSTRAINT statements_single_author
  CHECK ((public_figure_id IS NULL) <> (organisation_id IS NULL));

CREATE INDEX idx_statements_organisation_id
  ON statements (organisation_id) WHERE organisation_id IS NOT NULL;

-- Soft delete of an organisation now cascades to its statements
CREATE OR REPLACE FUNCTION soft_delete_organisation(p_id UUID)
RETURNS VOID AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
BEGIN
  UPDATE statements SET deleted_at = v_now
    WHERE organisation_id = p_id AND deleted_at IS NULL;
  UPDATE organisations SET deleted_at = v_now WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- The /o index read model also counts the organisation's own statements and subjects
DROP VIEW v_organisation_summary;
CREATE VIEW v_organisation_summary AS
  SELECT
    o.id,
    o.name,
    o.slug,
    o.acronym,
    o.organisation_type,
    o.presentation,
    COALESCE(members.members_count, 0)::integer AS members_count,
    COALESCE(activity.statements_count, 0)::integer AS statements_count,
    COALESCE(activity.subjects_count, 0)::integer AS subjects_count
  FROM organisations o
  LEFT JOIN LATERAL (
    SELECT count(DISTINCT m.public_figure_id) AS members_count
    FROM organisation_memberships m
    JOIN public_figures pf ON pf.id = m.public_figure_id AND pf.deleted_at IS NULL
    WHERE m.organisation_id = o.id AND (m.ended_on IS NULL OR m.ended_on >= CURRENT_DATE)
  ) members ON true
  LEFT JOIN LATERAL (
    SELECT count(DISTINCT s.id) AS statements_count, count(DISTINCT p.subject_id) AS subjects_count
    FROM statements s
    JOIN positions p ON p.id = s.position_id AND p.deleted_at IS NULL
    WHERE s.organisation_id = o.id AND s.deleted_at IS NULL
  ) activity ON true
  WHERE o.deleted_at IS NULL;
