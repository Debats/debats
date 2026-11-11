-- La recherche globale rendait, pour une position, le slug de son sujet et
-- son identifiant : le lien construit avec (/s/<sujet>/position/<uuid>)
-- tombait en 404, la page d'une position répondant à son slug. La fonction
-- rend désormais le slug de la ligne trouvée dans `slug`, et dans
-- `subject_slug` celui du sujet d'une position (NULL pour les autres types,
-- dont le slug est toute l'adresse). Le reste est inchangé.
--
-- Le type de retour change : DROP puis CREATE, CREATE OR REPLACE le refuse.

DROP FUNCTION IF EXISTS search_site(text, int);

CREATE FUNCTION search_site(p_query text, p_per_kind int DEFAULT 5)
RETURNS TABLE (
  kind text,
  id uuid,
  title text,
  slug text,
  subject_slug text,
  detail text,
  score real
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  WITH needle AS (
    -- The query is a text, never a pattern: its % and _ are escaped for LIKE
    SELECT replace(replace(replace(lower(unaccent(trim(p_query))), '\', '\\'), '%', '\%'), '_', '\_') AS text
  ),
  candidates AS (
    SELECT 'subject' AS kind, s.id, s.title::text AS title, s.slug::text AS slug,
      NULL::text AS subject_slug, NULL::text AS detail, lower(unaccent(s.title)) AS haystack
    FROM subjects s
    WHERE s.deleted_at IS NULL
    UNION ALL
    -- A position is reached through its subject: its own slug under the subject's
    SELECT 'position', p.id, p.title, p.slug, s.slug, s.title, lower(unaccent(p.title))
    FROM positions p
    JOIN subjects s ON s.id = p.subject_id
    WHERE p.deleted_at IS NULL AND s.deleted_at IS NULL
    UNION ALL
    SELECT 'public_figure', f.id, f.name, f.slug, NULL, NULL, lower(unaccent(f.name))
    FROM public_figures f
    WHERE f.deleted_at IS NULL
    UNION ALL
    SELECT 'organisation', o.id, o.name, o.slug, NULL, o.acronym,
      lower(unaccent(o.name || ' ' || coalesce(o.acronym, '')))
    FROM organisations o
    WHERE o.deleted_at IS NULL
    UNION ALL
    SELECT 'argument', a.id, a.title, a.slug, NULL, NULL, lower(unaccent(a.title))
    FROM arguments a
    WHERE a.deleted_at IS NULL
    UNION ALL
    SELECT 'theme', t.id, t.name, t.slug, NULL, NULL, lower(unaccent(t.name))
    FROM themes t
  ),
  scored AS (
    SELECT c.kind, c.id, c.title, c.slug, c.subject_slug, c.detail,
      (CASE
        WHEN c.haystack LIKE needle.text || '%' THEN 1.0
        WHEN c.haystack LIKE '%' || needle.text || '%' THEN 0.9
        ELSE word_similarity(needle.text, c.haystack)
      END)::real AS score
    FROM candidates c, needle
    WHERE needle.text <> ''
  ),
  ranked AS (
    SELECT scored.*, row_number() OVER (PARTITION BY kind ORDER BY score DESC, title) AS rank
    FROM scored
    WHERE score >= 0.5
  )
  SELECT kind, id, title, slug, subject_slug, detail, score
  FROM ranked
  WHERE rank <= p_per_kind
  ORDER BY score DESC, kind, title;
$$;
