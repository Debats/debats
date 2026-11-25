-- La page /revue : les prises de position à relire, par pages. Celles que
-- personne n'a encore confirmées ni signalées, les plus récemment ajoutées
-- d'abord, jamais celles que la personne qui regarde a ajoutées elle-même.
-- Chaque ligne porte le nombre total de prises de position à relire.
--
-- Elle prend la suite de get_statement_to_review, qui n'en offrait qu'une, sur
-- l'accueil. Celle-ci reste en place : la version du site encore en ligne
-- pendant un déploiement l'appelle. Une migration suivante la retirera.

CREATE FUNCTION get_statements_to_review(
  p_viewer uuid DEFAULT NULL,
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (id uuid, total bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT st.id, count(*) OVER ()
  FROM statements st
  JOIN positions p ON p.id = st.position_id AND p.deleted_at IS NULL
  JOIN subjects s ON s.id = p.subject_id AND s.deleted_at IS NULL
  WHERE st.deleted_at IS NULL
    AND st.created_by IS DISTINCT FROM p_viewer
    AND NOT EXISTS (SELECT 1 FROM confirmations c WHERE c.entity_id = st.id)
    AND NOT EXISTS (SELECT 1 FROM flags fl WHERE fl.entity_id = st.id AND fl.status = 'open')
  ORDER BY st.created_at DESC, st.id
  OFFSET GREATEST(p_offset, 0)
  LIMIT GREATEST(p_limit, 0);
$$;
