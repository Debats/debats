-- Les événements d'import des backfills deviennent les faits de création
-- qu'ils sont (ADR 0001). Un `SubjectImported` portait exactement la charge
-- d'un `SubjectAdded`, daté de la création de la ligne et signé par son
-- auteur : il ne disait que « le journal n'existait pas encore », ce que
-- `metadata.source = 'backfill'` dit déjà. Le code ne connaît plus que les
-- faits de création. Idempotent : un type déjà renommé n'est plus trouvé.

UPDATE domain_events AS e
SET type = renamed.to_type
FROM (VALUES
  ('SubjectImported', 'SubjectAdded'),
  ('PositionImported', 'PositionAdded'),
  ('StatementImported', 'StatementAdded'),
  ('PublicFigureImported', 'PublicFigureAdded'),
  ('MembershipImported', 'MembershipAdded'),
  ('OrganisationImported', 'OrganisationAdded'),
  ('ArgumentImported', 'ArgumentAdded'),
  ('ThemeImported', 'ThemeAdded'),
  ('OccupationFamilyImported', 'OccupationFamilyAdded'),
  ('OccupationImported', 'OccupationAdded'),
  ('InvitationImported', 'InvitationSent')
) AS renamed(from_type, to_type)
WHERE e.type = renamed.from_type;
