-- Ce que la validation d'un brouillon a fait : la prise de position créée et
-- ce qui a été créé plutôt que réutilisé (sujet, position, auteur). Lu par la
-- page du chantier et par l'agent, qui n'en savait rien jusqu'ici.
ALTER TABLE draft_statements ADD COLUMN validation jsonb;

COMMENT ON COLUMN draft_statements.validation IS
  'Après validation : { "statementId": uuid, "created": ["subject" | "position" | "public_figure" | "organisation", …] }';

-- Le fil d'un chantier porte aussi les décisions de relecture que le site
-- transmet à l'agent : ni la personne, ni l'agent, un troisième rôle.
ALTER TABLE chantier_messages DROP CONSTRAINT chantier_messages_role_check;
ALTER TABLE chantier_messages
  ADD CONSTRAINT chantier_messages_role_check CHECK (role IN ('person', 'agent', 'review'));
