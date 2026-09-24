-- Organisations: political parties, NGOs, unions, companies, lobbies, business groups,
-- associations and collectives. They take positions alongside public figures (later increment)
-- and public figures can be affiliated to them through memberships.

CREATE TYPE organisation_type AS ENUM (
  'political_party',
  'ngo',
  'union',
  'company',
  'lobby',
  'business_group',
  'association',
  'collective'
);

CREATE TABLE organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) UNIQUE NOT NULL,
  slug VARCHAR(150) UNIQUE NOT NULL,
  acronym VARCHAR(30),
  organisation_type organisation_type NOT NULL,
  presentation TEXT NOT NULL,
  wikipedia_url TEXT,
  website_url TEXT,
  notoriety_sources TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES contributors(id),
  updated_by UUID NOT NULL REFERENCES contributors(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_organisations_slug ON organisations (slug);
CREATE INDEX idx_organisations_not_deleted ON organisations (id) WHERE deleted_at IS NULL;

CREATE TRIGGER update_organisations_updated_at
  BEFORE UPDATE ON organisations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Memberships: a public figure belongs to (or is affiliated with) an organisation,
-- optionally with a role and a period. A figure can have several successive memberships
-- in the same organisation (left then came back), hence no uniqueness constraint.
CREATE TABLE organisation_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  public_figure_id UUID NOT NULL REFERENCES public_figures(id) ON DELETE CASCADE,
  role VARCHAR(100),
  started_on DATE,
  ended_on DATE,
  created_by UUID NOT NULL REFERENCES contributors(id),
  updated_by UUID NOT NULL REFERENCES contributors(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT organisation_memberships_period CHECK (
    started_on IS NULL OR ended_on IS NULL OR ended_on >= started_on
  )
);

CREATE INDEX idx_organisation_memberships_organisation_id
  ON organisation_memberships (organisation_id);
CREATE INDEX idx_organisation_memberships_public_figure_id
  ON organisation_memberships (public_figure_id);

CREATE TRIGGER update_organisation_memberships_updated_at
  BEFORE UPDATE ON organisation_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Soft delete: memberships are kept, queries filter them out through the organisation
CREATE OR REPLACE FUNCTION soft_delete_organisation(p_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE organisations SET deleted_at = now() WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Read model for the /o index: organisations with their current members count
-- (a membership is current until its end date, if any, is past)
CREATE VIEW v_organisation_summary AS
  SELECT
    o.id,
    o.name,
    o.slug,
    o.acronym,
    o.organisation_type,
    o.presentation,
    COALESCE(agg.members_count, 0)::integer AS members_count
  FROM organisations o
  LEFT JOIN LATERAL (
    SELECT count(DISTINCT m.public_figure_id) AS members_count
    FROM organisation_memberships m
    JOIN public_figures pf ON pf.id = m.public_figure_id AND pf.deleted_at IS NULL
    WHERE m.organisation_id = o.id AND (m.ended_on IS NULL OR m.ended_on >= CURRENT_DATE)
  ) agg ON true
  WHERE o.deleted_at IS NULL;

-- RLS: all access goes through the admin/service client
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_memberships ENABLE ROW LEVEL SECURITY;

-- Public storage bucket for organisation logos (served through /logos/:path)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('logos', 'logos', true, 5242880, ARRAY['image/png', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;
