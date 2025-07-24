-- Migration pour rendre obligatoires les champs wikipedia_url, picture_url et created_by
-- Règle métier : Une personnalité doit avoir une page Wikipedia (critère de notoriété)

-- Rendre les champs obligatoires (les seeds ont déjà les bonnes valeurs)
ALTER TABLE public_figures ALTER COLUMN wikipedia_url SET NOT NULL;
ALTER TABLE public_figures ALTER COLUMN picture_url SET NOT NULL;
ALTER TABLE public_figures ALTER COLUMN created_by SET NOT NULL;

-- Ajouter des contraintes de validation
ALTER TABLE public_figures 
ADD CONSTRAINT wikipedia_url_valid 
CHECK (wikipedia_url ~ '^https?://[a-z]{2,3}\.wikipedia\.org/wiki/.+$');

ALTER TABLE public_figures 
ADD CONSTRAINT picture_url_valid 
CHECK (picture_url ~ '^(/images/|https?://).+\.(jpg|jpeg|png|gif|webp)$');

-- Ajouter des commentaires explicatifs
COMMENT ON COLUMN public_figures.wikipedia_url IS 'URL de la page Wikipedia (obligatoire - critère de notoriété)';
COMMENT ON COLUMN public_figures.picture_url IS 'URL de l''image de profil (obligatoire - nécessaire pour l''UX)';
COMMENT ON COLUMN public_figures.created_by IS 'Identifiant de l''utilisateur créateur (obligatoire - traçabilité)';