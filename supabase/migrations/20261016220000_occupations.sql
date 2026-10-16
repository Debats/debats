-- Métiers et fonctions des personnalités (« Député·e », « Économiste »…).
-- Liste fermée gérée par les Idéalistes, sur le modèle des thématiques ;
-- une personnalité peut en tenir plusieurs, sans hiérarchie.

CREATE TABLE occupations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL REFERENCES contributors(id),
  updated_by UUID NOT NULL REFERENCES contributors(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_occupations_slug ON occupations (slug);

CREATE TABLE public_figure_occupations (
  public_figure_id UUID NOT NULL REFERENCES public_figures(id) ON DELETE CASCADE,
  occupation_id UUID NOT NULL REFERENCES occupations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES contributors(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (public_figure_id, occupation_id)
);

CREATE INDEX idx_public_figure_occupations_occupation_id
  ON public_figure_occupations (occupation_id);

-- RLS : tout passe par le client d'administration
ALTER TABLE occupations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_figure_occupations ENABLE ROW LEVEL SECURITY;

-- Liste initiale, au nom du contributeur le mieux noté (il y en a toujours un
-- là où la table a un sens ; une base sans contributeur reste vide).
INSERT INTO occupations (name, slug, created_by, updated_by)
SELECT o.name, o.slug, c.id, c.id
FROM (
  SELECT id FROM contributors ORDER BY reputation DESC, created_at ASC LIMIT 1
) c
CROSS JOIN (VALUES
  ('Président·e de la République', 'president-e-de-la-republique'),
  ('Premier·ère ministre', 'premier-ere-ministre'),
  ('Ministre', 'ministre'),
  ('Député·e', 'depute-e'),
  ('Sénateur·rice', 'senateur-rice'),
  ('Député·e européen·ne', 'depute-e-europeen-ne'),
  ('Maire', 'maire'),
  ('Élu·e local·e', 'elu-e-local-e'),
  ('Chef·fe de parti', 'chef-fe-de-parti'),
  ('Haut·e fonctionnaire', 'haut-e-fonctionnaire'),
  ('Magistrat·e', 'magistrat-e'),
  ('Syndicaliste', 'syndicaliste'),
  ('Responsable associatif·ve', 'responsable-associatif-ve'),
  ('Militant·e', 'militant-e'),
  ('Chef·fe d''entreprise', 'chef-fe-d-entreprise'),
  ('Économiste', 'economiste'),
  ('Universitaire', 'universitaire'),
  ('Chercheur·se', 'chercheur-se'),
  ('Philosophe', 'philosophe'),
  ('Essayiste', 'essayiste'),
  ('Écrivain·e', 'ecrivain-e'),
  ('Journaliste', 'journaliste'),
  ('Avocat·e', 'avocat-e'),
  ('Médecin', 'medecin'),
  ('Enseignant·e', 'enseignant-e'),
  ('Artiste', 'artiste'),
  ('Responsable religieux·se', 'responsable-religieux-se')
) AS o(name, slug);
