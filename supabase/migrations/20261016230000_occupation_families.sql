-- Deux niveaux fermés pour les métiers : une famille (« Exécutif », « Élu·e
-- national·e ») regroupe des métiers (« Ministre », « Député·e »). Les
-- statistiques se lisent par famille, le détail par métier. La liste initiale
-- plate de la migration précédente est remplacée.

CREATE TABLE occupation_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  -- Ordre d'affichage : les familles ont un ordre naturel, pas alphabétique
  position INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES contributors(id),
  updated_by UUID NOT NULL REFERENCES contributors(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_occupation_families_slug ON occupation_families (slug);
ALTER TABLE occupation_families ENABLE ROW LEVEL SECURITY;

-- On repart d'une liste vide : la première liste n'a jamais été déployée.
DELETE FROM public_figure_occupations;
DELETE FROM occupations;

ALTER TABLE occupations
  ADD COLUMN family_id UUID NOT NULL REFERENCES occupation_families(id) ON DELETE CASCADE;

CREATE INDEX idx_occupations_family_id ON occupations (family_id);

-- Liste initiale, au nom du contributeur le mieux noté (voir la migration précédente)
WITH author AS (
  SELECT id FROM contributors ORDER BY reputation DESC, created_at ASC LIMIT 1
),
families AS (
  INSERT INTO occupation_families (name, slug, position, created_by, updated_by)
  SELECT f.name, f.slug, f.position, author.id, author.id
  FROM author
  CROSS JOIN (VALUES
    ('Exécutif', 'executif', 1),
    ('Élu·e national·e', 'elu-e-national-e', 2),
    ('Élu·e local·e', 'elu-e-local-e', 3),
    ('Responsable politique', 'responsable-politique', 4),
    ('Syndicaliste', 'syndicaliste', 5),
    ('Monde associatif et militant', 'monde-associatif-et-militant', 6),
    ('Chercheur·se et universitaire', 'chercheur-se-et-universitaire', 7),
    ('Intellectuel·le et auteur·rice', 'intellectuel-le-et-auteur-rice', 8),
    ('Journaliste', 'journaliste', 9),
    ('Monde économique', 'monde-economique', 10),
    ('Administration et justice', 'administration-et-justice', 11),
    ('Culture et arts', 'culture-et-arts', 12),
    ('Santé', 'sante', 13),
    ('Religieux', 'religieux', 14)
  ) AS f(name, slug, position)
  RETURNING id, slug
)
INSERT INTO occupations (name, slug, family_id, created_by, updated_by)
SELECT o.name, o.slug, families.id, author.id, author.id
FROM author
CROSS JOIN (VALUES
  ('executif', 'Président·e de la République', 'president-e-de-la-republique'),
  ('executif', 'Premier·ère ministre', 'premier-ere-ministre'),
  ('executif', 'Ministre', 'ministre'),
  ('executif', 'Secrétaire d''État', 'secretaire-d-etat'),
  ('elu-e-national-e', 'Député·e', 'depute-e'),
  ('elu-e-national-e', 'Sénateur·rice', 'senateur-rice'),
  ('elu-e-national-e', 'Député·e européen·ne', 'depute-e-europeen-ne'),
  ('elu-e-local-e', 'Maire', 'maire'),
  ('elu-e-local-e', 'Président·e d''exécutif local', 'president-e-d-executif-local'),
  ('elu-e-local-e', 'Conseiller·ère régional·e', 'conseiller-ere-regional-e'),
  ('elu-e-local-e', 'Conseiller·ère départemental·e', 'conseiller-ere-departemental-e'),
  ('elu-e-local-e', 'Conseiller·ère municipal·e', 'conseiller-ere-municipal-e'),
  ('responsable-politique', 'Chef·fe de parti', 'chef-fe-de-parti'),
  ('responsable-politique', 'Cadre de parti', 'cadre-de-parti'),
  ('responsable-politique', 'Porte-parole', 'porte-parole'),
  ('syndicaliste', 'Secrétaire général·e de syndicat', 'secretaire-general-e-de-syndicat'),
  ('syndicaliste', 'Responsable syndical·e', 'responsable-syndical-e'),
  ('monde-associatif-et-militant', 'Responsable associatif·ve', 'responsable-associatif-ve'),
  ('monde-associatif-et-militant', 'Militant·e', 'militant-e'),
  ('monde-associatif-et-militant', 'Porte-parole d''ONG', 'porte-parole-d-ong'),
  ('chercheur-se-et-universitaire', 'Économiste', 'economiste'),
  ('chercheur-se-et-universitaire', 'Sociologue', 'sociologue'),
  ('chercheur-se-et-universitaire', 'Historien·ne', 'historien-ne'),
  ('chercheur-se-et-universitaire', 'Juriste', 'juriste'),
  ('chercheur-se-et-universitaire', 'Politologue', 'politologue'),
  ('chercheur-se-et-universitaire', 'Scientifique', 'scientifique'),
  ('chercheur-se-et-universitaire', 'Universitaire', 'universitaire'),
  ('intellectuel-le-et-auteur-rice', 'Essayiste', 'essayiste'),
  ('intellectuel-le-et-auteur-rice', 'Écrivain·e', 'ecrivain-e'),
  ('intellectuel-le-et-auteur-rice', 'Philosophe', 'philosophe'),
  ('journaliste', 'Journaliste', 'journaliste'),
  ('journaliste', 'Éditorialiste', 'editorialiste'),
  ('journaliste', 'Chroniqueur·se', 'chroniqueur-se'),
  ('monde-economique', 'Chef·fe d''entreprise', 'chef-fe-d-entreprise'),
  ('monde-economique', 'Dirigeant·e de grande entreprise', 'dirigeant-e-de-grande-entreprise'),
  ('monde-economique', 'Représentant·e patronal·e', 'representant-e-patronal-e'),
  ('monde-economique', 'Banquier·ère', 'banquier-ere'),
  ('administration-et-justice', 'Haut·e fonctionnaire', 'haut-e-fonctionnaire'),
  ('administration-et-justice', 'Magistrat·e', 'magistrat-e'),
  ('administration-et-justice', 'Avocat·e', 'avocat-e'),
  ('administration-et-justice', 'Préfet·ète', 'prefet-ete'),
  ('administration-et-justice', 'Diplomate', 'diplomate'),
  ('culture-et-arts', 'Artiste', 'artiste'),
  ('culture-et-arts', 'Cinéaste', 'cineaste'),
  ('culture-et-arts', 'Musicien·ne', 'musicien-ne'),
  ('culture-et-arts', 'Acteur·rice', 'acteur-rice'),
  ('sante', 'Médecin', 'medecin'),
  ('sante', 'Soignant·e', 'soignant-e'),
  ('religieux', 'Responsable religieux·se', 'responsable-religieux-se')
) AS o(family_slug, name, slug)
JOIN families ON families.slug = o.family_slug;
