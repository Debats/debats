-- Les événements d'une prise de position portaient un `statementType` et une
-- `quote` côte à côte, quel que soit le type. Le contenu est désormais une
-- union : chaque variante ne nomme que ce qu'elle porte, et le rejeu refuse
-- l'ancienne forme. Les 950 événements existants sont donc réexprimés, sans
-- rien perdre de ce qu'ils disaient — sauf pour le seul vote, voir plus bas.
--
-- Idempotent : un événement déjà porteur de `content` n'est plus trouvé.

-- Une déclaration porte ses mots : la réexpression est mécanique.
UPDATE domain_events
SET payload = (payload - 'statementType' - 'quote')
  || jsonb_build_object(
       'content',
       jsonb_build_object('kind', 'declaration', 'quote', payload->>'quote')
     )
WHERE stream_type = 'statement'
  AND type IN ('StatementAdded', 'StatementEdited')
  AND NOT payload ? 'content'
  AND payload->>'statementType' = 'declaration';

-- Le seul vote du journal : scrutin public n° 322 du Sénat, séance du 12 juin
-- 2025, sur l'article unique constituant l'ensemble de la proposition de loi
-- instaurant un impôt plancher de 2 % sur le patrimoine des ultrariches.
-- https://www.senat.fr/scrutin-public/2024/scr2024-322.html
-- Le groupe Les Républicains, auteur de la prise de position, y a voté contre
-- (pour : 0, contre : 127, abstentions : 2, n'a pas pris part : 1).
--
-- La citation que cet événement portait était une explication de vote, et non
-- les mots du vote : « Pour toutes ces raisons, nous ne voterons donc pas la
-- proposition de loi qui nous est soumise. » — Dominique de Legge, au nom du
-- groupe LR. Un vote ne porte pas de paroles : cette explication est une
-- déclaration à part entière, à saisir comme telle. Elle est conservée ici
-- pour que rien ne se perde.
UPDATE domain_events
SET payload = (payload - 'statementType' - 'quote')
  || jsonb_build_object(
       'content',
       jsonb_build_object(
         'kind', 'vote',
         'votedText', 'Proposition de loi instaurant un impôt plancher de 2 % sur le patrimoine des ultrariches',
         'choice', 'contre'
       )
     )
WHERE stream_type = 'statement'
  AND type IN ('StatementAdded', 'StatementEdited')
  AND NOT payload ? 'content'
  AND payload->>'statementType' = 'vote';

-- La table projetée dit la même chose que le journal.
UPDATE statements
SET statement_type = 'vote',
    voted_text = 'Proposition de loi instaurant un impôt plancher de 2 % sur le patrimoine des ultrariches',
    vote_choice = 'contre',
    quote = NULL
WHERE statement_type = 'vote'
  AND voted_text IS NULL;

-- Aucun programme ni acte n'a jamais été écrit : un événement d'un type qui
-- demande des champs que l'ancienne forme ne portait pas arrêterait la
-- migration plutôt que de passer en silence.
DO $$
DECLARE orphans int;
BEGIN
  SELECT count(*) INTO orphans
  FROM domain_events
  WHERE stream_type = 'statement'
    AND type IN ('StatementAdded', 'StatementEdited')
    AND NOT payload ? 'content';

  IF orphans > 0 THEN
    RAISE EXCEPTION
      'Il reste % événement(s) de prise de position sans contenu typé : leur type demande des champs que l''ancienne charge ne portait pas, et il faut les reprendre un par un.',
      orphans;
  END IF;
END $$;
