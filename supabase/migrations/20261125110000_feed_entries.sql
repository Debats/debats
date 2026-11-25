-- Le flux, entrée par entrée. Une entrée du flux n'est pas toujours une prise
-- de position : les signatures d'un même texte n'en font qu'une (« X, Y, Z et
-- 41 autres ont signé »), et ce qu'un·e auteur·rice a dit ou fait le même jour
-- n'en fait qu'une aussi (« X a pris position pour A et B »). Le regroupement
-- se fait ici, avant la pagination : une page compte des entrées, et aucune
-- n'est coupée entre deux pages.
--
-- p_order : 'stated' (jour déclaré), 'touched' (dernière modification) ou
-- 'added' (ajout sur le site). Une entrée se range à la place de la plus
-- récente de ses prises de position.
--
-- Chaque ligne rend les prises de position de l'entrée, dans l'ordre du flux.
-- Pour un texte signé, une seule suffit à dire le texte, sa source et son
-- jour : la plus récente ; `size` dit combien de signatures l'entrée réunit.
-- `total` compte les entrées, `statements` les prises de position.

CREATE FUNCTION get_feed_entries(
  p_order text DEFAULT 'stated',
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0,
  p_author_kind text DEFAULT NULL,
  p_theme_slug text DEFAULT NULL,
  p_statement_type statement_type DEFAULT NULL,
  p_declaration_slug text DEFAULT NULL
)
RETURNS TABLE (
  declaration_id uuid,
  statement_ids uuid[],
  size bigint,
  total bigint,
  statements bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH listed AS (
    SELECT
      st.id,
      st.joint_declaration_id,
      CASE
        WHEN st.joint_declaration_id IS NOT NULL THEN 'text:' || st.joint_declaration_id
        ELSE 'day:' || COALESCE(st.public_figure_id, st.organisation_id) || ':' || st.stated_at
      END AS entry_key,
      CASE p_order
        WHEN 'touched' THEN st.updated_at
        WHEN 'added' THEN st.created_at
        ELSE st.stated_at::timestamptz
      END AS ranked_at,
      -- Beaucoup de prises de position partagent un jour déclaré : l'ajout les départage
      CASE WHEN p_order IN ('touched', 'added') THEN NULL ELSE st.created_at END AS then_at
    FROM feed_statements st
    JOIN positions p ON p.id = st.position_id AND p.deleted_at IS NULL
    JOIN subjects s ON s.id = p.subject_id AND s.deleted_at IS NULL
    WHERE st.deleted_at IS NULL
      AND (p_author_kind IS NULL
        OR (p_author_kind = 'public_figure' AND st.public_figure_id IS NOT NULL)
        OR (p_author_kind = 'organisation' AND st.organisation_id IS NOT NULL))
      AND (p_statement_type IS NULL OR st.statement_type = p_statement_type)
      -- Un slug qu'aucun texte ne porte ne retient rien, plutôt que tout
      AND (p_declaration_slug IS NULL OR st.joint_declaration_id = (
        SELECT d.id FROM joint_declarations d WHERE d.slug = p_declaration_slug
      ))
      AND (p_theme_slug IS NULL OR EXISTS (
        SELECT 1
        FROM subject_themes x
        JOIN themes t ON t.id = x.theme_id
        WHERE x.subject_id = s.id AND t.slug = p_theme_slug
      ))
  ),
  entries AS (
    SELECT
      entry_key,
      (array_agg(joint_declaration_id))[1] AS declaration_id,
      array_agg(id ORDER BY ranked_at DESC, then_at DESC NULLS LAST, id DESC) AS ids,
      count(*) AS size,
      max(ranked_at) AS ranked_at,
      max(then_at) AS then_at
    FROM listed
    GROUP BY entry_key
  )
  SELECT
    declaration_id,
    CASE WHEN declaration_id IS NULL THEN ids ELSE ids[1:1] END,
    size,
    count(*) OVER (),
    (sum(size) OVER ())::bigint
  FROM entries
  ORDER BY ranked_at DESC, then_at DESC NULLS LAST, entry_key DESC
  OFFSET GREATEST(p_offset, 0)
  LIMIT GREATEST(p_limit, 0);
$$;
