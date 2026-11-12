-- « Qui pense comme qui ? » : pour chaque paire de personnalités, sur combien
-- de sujets elles se sont toutes deux exprimées, et sur combien elles
-- partagent une position. Être d'accord sur un sujet, c'est y partager au
-- moins une position : la même lecture que les alliés de la page d'un auteur.
--
-- Seules les personnalités exprimées sur au moins p_min_subjects sujets sont
-- appariées. C'est ce qui garde la lecture bon marché : un vote de plusieurs
-- centaines de député·es ne crée aucune paire tant que ces député·es n'ont
-- pris position que là. La fonction rend au plus p_limit paires, celles qui
-- s'accordent sur le plus de sujets ; laquelle montrer est dit par le domaine
-- (domain/read-models/figure-agreements.ts).

CREATE FUNCTION get_figure_agreements(p_min_subjects int, p_limit int)
RETURNS TABLE (
  a_id uuid,
  a_name text,
  a_slug text,
  b_id uuid,
  b_name text,
  b_slug text,
  agreed_subjects bigint,
  common_subjects bigint,
  examples jsonb
)
LANGUAGE sql
STABLE
AS $$
  WITH taken AS (
    -- Who took which position, once, among what is still there
    SELECT DISTINCT st.public_figure_id AS figure_id, p.id AS position_id, p.subject_id
    FROM statements st
    JOIN positions p ON p.id = st.position_id AND p.deleted_at IS NULL
    JOIN subjects s ON s.id = p.subject_id AND s.deleted_at IS NULL
    JOIN public_figures f ON f.id = st.public_figure_id AND f.deleted_at IS NULL
    WHERE st.deleted_at IS NULL
  ),
  present AS (
    SELECT figure_id
    FROM taken
    GROUP BY figure_id
    HAVING COUNT(DISTINCT subject_id) >= p_min_subjects
  ),
  spoke AS (
    SELECT DISTINCT t.figure_id, t.subject_id
    FROM taken t
    JOIN present ON present.figure_id = t.figure_id
  ),
  agreed AS (
    -- The subjects on which a pair shares at least one position
    SELECT DISTINCT a.figure_id AS a_id, b.figure_id AS b_id, a.subject_id
    FROM taken a
    JOIN taken b ON b.position_id = a.position_id AND a.figure_id < b.figure_id
    JOIN present pa ON pa.figure_id = a.figure_id
    JOIN present pb ON pb.figure_id = b.figure_id
  ),
  common AS (
    SELECT a.figure_id AS a_id, b.figure_id AS b_id, COUNT(*) AS common_subjects
    FROM spoke a
    JOIN spoke b ON b.subject_id = a.subject_id AND a.figure_id < b.figure_id
    GROUP BY a.figure_id, b.figure_id
  ),
  pairs AS (
    SELECT common.a_id, common.b_id, common.common_subjects,
      COUNT(agreed.subject_id) AS agreed_subjects
    FROM common
    LEFT JOIN agreed ON agreed.a_id = common.a_id AND agreed.b_id = common.b_id
    GROUP BY common.a_id, common.b_id, common.common_subjects
    ORDER BY COUNT(agreed.subject_id) DESC, common.common_subjects, common.a_id, common.b_id
    LIMIT p_limit
  )
  SELECT fa.id, fa.name::text, fa.slug::text, fb.id, fb.name::text, fb.slug::text,
    pairs.agreed_subjects, pairs.common_subjects,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('title', e.title, 'slug', e.slug) ORDER BY e.title)
      FROM (
        SELECT s.title, s.slug
        FROM agreed
        JOIN subjects s ON s.id = agreed.subject_id
        WHERE agreed.a_id = pairs.a_id AND agreed.b_id = pairs.b_id
        ORDER BY s.title
        LIMIT 3
      ) e
    ), '[]'::jsonb)
  FROM pairs
  JOIN public_figures fa ON fa.id = pairs.a_id
  JOIN public_figures fb ON fb.id = pairs.b_id
  ORDER BY pairs.agreed_subjects DESC, pairs.common_subjects, fa.name, fb.name;
$$;
