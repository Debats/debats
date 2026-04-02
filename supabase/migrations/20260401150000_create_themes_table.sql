-- Themes: thematic categories for subjects (N-to-N relationship)
-- Examples: Économie, Société, Environnement, Institutions, International...

CREATE TABLE themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES contributors(id),
  updated_by UUID NOT NULL REFERENCES contributors(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_themes_slug ON themes (slug);

-- Junction table: a subject can have multiple themes, a theme can have multiple subjects
CREATE TABLE subject_themes (
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES contributors(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (subject_id, theme_id)
);

CREATE INDEX idx_subject_themes_theme_id ON subject_themes (theme_id);

-- RLS: all access goes through admin/service client
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_themes ENABLE ROW LEVEL SECURITY;
