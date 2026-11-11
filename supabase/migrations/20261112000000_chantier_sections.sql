-- L'agent range les brouillons d'un chantier en sections qu'il nomme lui-même
-- (ce qui est déjà là, une position nouvelle, chaque sujet nouveau, ou ce que
-- le chantier appelle) : chaque brouillon porte la sienne, le chantier
-- l'ordre dans lequel les lire. Sans section, la page range par ce que la
-- validation changerait.
ALTER TABLE draft_statements ADD COLUMN section text;
ALTER TABLE chantiers ADD COLUMN sections jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN draft_statements.section IS
  'Le titre de la section où l''agent range ce brouillon dans son chantier ; null quand il ne l''a pas rangé.';
COMMENT ON COLUMN chantiers.sections IS
  'Les titres des sections dans l''ordre de lecture voulu par l''agent ; une section absente de la liste vient après.';
