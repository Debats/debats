-- Rendre wikipedia_url optionnel et ajouter notoriety_sources
-- La validation métier (notoriété) est dans le domain layer

-- Supprimer la contrainte CHECK métier sur wikipedia_url
ALTER TABLE public_figures DROP CONSTRAINT IF EXISTS wikipedia_url_valid;

-- Rendre wikipedia_url nullable
ALTER TABLE public_figures ALTER COLUMN wikipedia_url DROP NOT NULL;

-- Ajouter la colonne notoriety_sources (tableau d'URLs)
ALTER TABLE public_figures ADD COLUMN notoriety_sources TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public_figures.wikipedia_url IS 'URL de la page Wikipedia (optionnel)';
COMMENT ON COLUMN public_figures.notoriety_sources IS 'URLs de sources indépendantes attestant la notoriété';
