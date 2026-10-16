-- Un métier attribué peut être passé (ex-député·e) ou encore d'actualité.
-- Les statistiques comptent les deux ; l'affichage les distingue.
ALTER TABLE public_figure_occupations
  ADD COLUMN is_current BOOLEAN NOT NULL DEFAULT true;
