-- La page d'accueil compare les sujets entre eux : qui s'est exprimé, comment
-- les voix se répartissent entre les positions, ce qui vient d'être ajouté.
-- Une fonction rend tous les sujets en une lecture, pour que les blocs de la
-- page (sujet du jour, carte des débats, sujets partagés ou tranchés, débats
-- qui bougent, nouveaux sujets) partent des mêmes nombres.
--
-- Une voix est un auteur, personnalité ou organisation : celui qui a pris
-- deux positions sur un sujet compte une fois pour le sujet, une fois dans
-- chacune de ses positions. La fonction ne fait que compter ; ce qui fait un
-- sujet du jour, un sujet partagé ou un débat qui bouge est dit par le
-- domaine (domain/read-models/home-debates.ts).
--
-- « Récent » n'a pas d'horloge ici : la page donne l'instant depuis lequel
-- elle compte.

CREATE FUNCTION get_home_debates(p_recent_since timestamptz)
RETURNS TABLE (
  id uuid,
  title text,
  slug text,
  problem text,
  created_at timestamptz,
  voices bigint,
  statements_count bigint,
  recent_statements_count bigint,
  theme_name text,
  theme_slug text,
  positions jsonb
)
LANGUAGE sql
STABLE
AS $$
  WITH live AS (
    -- A statement counts when its position and its author are still there
    SELECT st.created_at, p.id AS position_id, p.subject_id,
      COALESCE(f.id, o.id) AS author_id
    FROM statements st
    JOIN positions p ON p.id = st.position_id AND p.deleted_at IS NULL
    LEFT JOIN public_figures f ON f.id = st.public_figure_id AND f.deleted_at IS NULL
    LEFT JOIN organisations o ON o.id = st.organisation_id AND o.deleted_at IS NULL
    WHERE st.deleted_at IS NULL
      AND (f.id IS NOT NULL OR o.id IS NOT NULL)
  ),
  position_voices AS (
    SELECT position_id, COUNT(DISTINCT author_id) AS voices
    FROM live
    GROUP BY position_id
  ),
  subject_positions AS (
    SELECT p.subject_id,
      jsonb_agg(
        jsonb_build_object(
          'id', p.id, 'title', p.title, 'slug', p.slug, 'voices', COALESCE(pv.voices, 0)
        )
        ORDER BY COALESCE(pv.voices, 0) DESC, p.title
      ) AS positions
    FROM positions p
    LEFT JOIN position_voices pv ON pv.position_id = p.id
    WHERE p.deleted_at IS NULL
    GROUP BY p.subject_id
  ),
  subject_counts AS (
    SELECT subject_id,
      COUNT(DISTINCT author_id) AS voices,
      COUNT(*) AS statements_count,
      COUNT(*) FILTER (WHERE created_at >= p_recent_since) AS recent_statements_count
    FROM live
    GROUP BY subject_id
  )
  SELECT s.id, s.title::text, s.slug::text, s.problem, s.created_at,
    COALESCE(sc.voices, 0),
    COALESCE(sc.statements_count, 0),
    COALESCE(sc.recent_statements_count, 0),
    t.name::text, t.slug::text,
    COALESCE(sp.positions, '[]'::jsonb)
  FROM subjects s
  LEFT JOIN subject_counts sc ON sc.subject_id = s.id
  LEFT JOIN subject_positions sp ON sp.subject_id = s.id
  LEFT JOIN subject_themes sth ON sth.subject_id = s.id AND sth.is_primary
  LEFT JOIN themes t ON t.id = sth.theme_id
  WHERE s.deleted_at IS NULL
  ORDER BY s.id;
$$;

-- Ce que le site contient, compté : les chiffres sous le titre de l'accueil.
-- Une source est le nom sous lequel une prise de position cite son origine.
CREATE FUNCTION get_site_figures()
RETURNS TABLE (
  subjects bigint,
  positions bigint,
  statements bigint,
  public_figures bigint,
  organisations bigint,
  sources bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    (SELECT COUNT(*) FROM subjects WHERE deleted_at IS NULL),
    (SELECT COUNT(*) FROM positions p
      JOIN subjects s ON s.id = p.subject_id AND s.deleted_at IS NULL
      WHERE p.deleted_at IS NULL),
    (SELECT COUNT(*) FROM statements WHERE deleted_at IS NULL),
    (SELECT COUNT(*) FROM public_figures WHERE deleted_at IS NULL),
    (SELECT COUNT(*) FROM organisations WHERE deleted_at IS NULL),
    (SELECT COUNT(DISTINCT source_name) FROM statements WHERE deleted_at IS NULL);
$$;
