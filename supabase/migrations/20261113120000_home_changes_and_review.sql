-- Deux lectures de la page d'accueil.
--
-- « Elle, il a changé de position » : les prises de position des
-- personnalités qui ont pris plus d'une position sur un même sujet. La
-- fonction ne rend que la matière ; ce qui fait un changement (un ordre dans
-- le temps, deux jours différents) est dit par le domaine
-- (domain/read-models/position-changes.ts).

CREATE FUNCTION get_moved_statements()
RETURNS TABLE (
  figure_id uuid,
  figure_name text,
  figure_slug text,
  subject_id uuid,
  subject_title text,
  subject_slug text,
  position_id uuid,
  position_title text,
  stated_at date,
  created_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
  WITH live AS (
    SELECT f.id AS figure_id, f.name AS figure_name, f.slug AS figure_slug,
      s.id AS subject_id, s.title AS subject_title, s.slug AS subject_slug,
      p.id AS position_id, p.title AS position_title,
      st.stated_at, st.created_at
    FROM statements st
    JOIN positions p ON p.id = st.position_id AND p.deleted_at IS NULL
    JOIN subjects s ON s.id = p.subject_id AND s.deleted_at IS NULL
    JOIN public_figures f ON f.id = st.public_figure_id AND f.deleted_at IS NULL
    WHERE st.deleted_at IS NULL
  ),
  moved AS (
    SELECT figure_id, subject_id
    FROM live
    GROUP BY figure_id, subject_id
    HAVING COUNT(DISTINCT position_id) > 1
  )
  SELECT live.figure_id, live.figure_name::text, live.figure_slug::text,
    live.subject_id, live.subject_title::text, live.subject_slug::text,
    live.position_id, live.position_title::text,
    live.stated_at, live.created_at
  FROM live
  JOIN moved ON moved.figure_id = live.figure_id AND moved.subject_id = live.subject_id
  ORDER BY live.figure_id, live.subject_id, live.stated_at, live.created_at;
$$;

-- « Deux minutes devant vous ? » : une prise de position à relire. Celle que
-- personne n'a encore confirmée ni signalée, la plus récemment ajoutée
-- d'abord, jamais une que la personne qui regarde a ajoutée elle-même.
-- p_skip en saute : « une autre » demande la suivante.

CREATE FUNCTION get_statement_to_review(p_viewer uuid DEFAULT NULL, p_skip int DEFAULT 0)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT st.id
  FROM statements st
  JOIN positions p ON p.id = st.position_id AND p.deleted_at IS NULL
  JOIN subjects s ON s.id = p.subject_id AND s.deleted_at IS NULL
  WHERE st.deleted_at IS NULL
    AND st.created_by IS DISTINCT FROM p_viewer
    AND NOT EXISTS (SELECT 1 FROM confirmations c WHERE c.entity_id = st.id)
    AND NOT EXISTS (SELECT 1 FROM flags fl WHERE fl.entity_id = st.id AND fl.status = 'open')
  ORDER BY st.created_at DESC, st.id
  OFFSET GREATEST(p_skip, 0)
  LIMIT 1;
$$;
