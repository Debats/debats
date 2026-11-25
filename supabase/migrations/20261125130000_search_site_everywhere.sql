-- La recherche globale ne lisait que les titres et les noms. Elle lit
-- désormais aussi les textes longs (problématique et présentation d'un sujet,
-- description d'une position, d'un argument, d'une thématique, d'un métier,
-- présentation d'une personnalité, d'une organisation), les prises de
-- position (citation, texte voté, acte, document), les déclarations communes
-- et les métiers, et elle suit deux liens : les personnalités d'un métier
-- trouvé, les sujets d'une thématique trouvée.
--
-- Trois façons d'être trouvé, de la plus à la moins forte ; une ligne trouvée
-- de plusieurs façons garde la plus forte :
--   1. par son titre : 1 si la requête l'ouvre, 0,9 si elle y figure, 0,8 si
--      tous ses mots y figurent dans un autre ordre, sinon la similarité
--      trigramme du mot le plus proche, à partir de 0,5 (inchangé) ;
--   2. par ce à quoi elle est rattachée (0,4) : une personnalité par un métier
--      ou une famille de métiers dont le nom porte les mots, un sujet par une
--      thématique dont le nom porte les mots (pas par ressemblance) ; `detail`
--      dit alors par quoi ; qui n'exerce plus le métier passe après (0,35) ;
--   3. par son texte long (0,3) : tous les mots de la requête y figurent, sans
--      tolérance aux fautes (sur un paragraphe, la similarité trouve tout) ;
--      `excerpt` rend alors le passage où se tient le plus long des mots.
--
-- Une prise de position n'a pas de titre : elle ne se trouve que par son
-- texte. Sa ligne porte le nom et le slug de son auteur, `author_kind`, et
-- le slug de son sujet : elle se lit sur la page de son auteur sur son sujet.
-- Les signatures d'une déclaration commune répètent toutes la même citation :
-- elles ne sortent pas une à une, c'est la déclaration qui est trouvée, par
-- son titre, sa présentation ou ses citations.
--
-- Un métier et une famille de métiers sortent sous le même type `occupation`,
-- avec le slug de la famille : c'est la famille qui a une page.
--
-- Le type de retour change : DROP puis CREATE, CREATE OR REPLACE le refuse.

DROP FUNCTION IF EXISTS search_site(text, int);

-- Le passage d'un texte autour d'un mot (déjà sans accents, en minuscules) :
-- les blancs ramenés à une espace, 240 caractères au plus, coupé entre deux
-- mots, des points de suspension là où le texte continue.
CREATE FUNCTION search_excerpt(p_text text, p_word text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  WITH flat AS (
    SELECT regexp_replace(trim(p_text), '\s+', ' ', 'g') AS text
  ),
  cut AS (
    SELECT flat.text, greatest(position(p_word IN lower(unaccent(flat.text))) - 80, 1) AS start
    FROM flat
  ),
  piece AS (
    SELECT substr(cut.text, cut.start, 240) AS text,
      cut.start > 1 AS has_before,
      cut.start + 240 <= length(cut.text) AS has_after
    FROM cut
  )
  SELECT
    CASE WHEN has_before THEN '… ' ELSE '' END
    || regexp_replace(
         regexp_replace(text, CASE WHEN has_before THEN '^\S*\s' ELSE '^' END, ''),
         CASE WHEN has_after THEN '\s\S*$' ELSE '$' END, '')
    || CASE WHEN has_after THEN ' …' ELSE '' END
  FROM piece;
$$;

CREATE FUNCTION search_site(p_query text, p_per_kind int DEFAULT 5)
RETURNS TABLE (
  kind text,
  id uuid,
  title text,
  slug text,
  subject_slug text,
  author_kind text,
  detail text,
  excerpt text,
  score real
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  WITH folded AS (
    SELECT lower(unaccent(trim(p_query))) AS text
  ),
  escaped AS (
    -- The query is a text, never a pattern: its % and _ are escaped for LIKE
    SELECT replace(replace(replace(folded.text, '\', '\\'), '%', '\%'), '_', '\_') AS text
    FROM folded
  ),
  needle AS (
    SELECT
      escaped.text,
      -- One pattern per word: a text holds the query when it holds each of them
      ARRAY(
        SELECT '%' || word || '%'
        FROM regexp_split_to_table(escaped.text, '\s+') AS word
        WHERE word <> ''
      ) AS words,
      -- The excerpt is cut around the longest word: the one that tells the most
      (
        SELECT word
        FROM regexp_split_to_table(folded.text, '\s+') WITH ORDINALITY AS split(word, place)
        ORDER BY length(word) DESC, place
        LIMIT 1
      ) AS longest
    FROM folded, escaped
  ),
  -- Everything that can be found: what shows it, its title as compared
  -- (`haystack`, NULL when it has none) and its long text (`body`)
  things AS (
    SELECT 'subject' AS kind, s.id, s.title::text AS title, s.slug::text AS slug,
      NULL::text AS subject_slug, NULL::text AS author_kind, NULL::text AS detail,
      lower(unaccent(s.title)) AS haystack,
      concat_ws(' ', s.problem, s.presentation) AS body,
      NULL::date AS dated
    FROM subjects s
    WHERE s.deleted_at IS NULL
    UNION ALL
    -- A position is reached through its subject: its own slug under the subject's
    SELECT 'position', p.id, p.title, p.slug, s.slug, NULL, s.title,
      lower(unaccent(p.title)), p.description, NULL
    FROM positions p
    JOIN subjects s ON s.id = p.subject_id
    WHERE p.deleted_at IS NULL AND s.deleted_at IS NULL
    UNION ALL
    SELECT 'public_figure', f.id, f.name, f.slug, NULL, NULL, NULL,
      lower(unaccent(f.name)), f.presentation, NULL
    FROM public_figures f
    WHERE f.deleted_at IS NULL
    UNION ALL
    SELECT 'organisation', o.id, o.name, o.slug, NULL, NULL, o.acronym,
      lower(unaccent(o.name || ' ' || coalesce(o.acronym, ''))), o.presentation, NULL
    FROM organisations o
    WHERE o.deleted_at IS NULL
    UNION ALL
    -- A statement is shown by its author and reached on its subject; the
    -- signatures of a joint declaration are found as the declaration, below
    SELECT 'statement', st.id, coalesce(f.name, o.name), coalesce(f.slug, o.slug), s.slug,
      CASE WHEN f.id IS NOT NULL THEN 'public_figure' ELSE 'organisation' END, s.title,
      NULL, concat_ws(' — ', st.document_name, st.voted_text, st.deed, st.quote), st.stated_at
    FROM statements st
    JOIN positions p ON p.id = st.position_id
    JOIN subjects s ON s.id = p.subject_id
    LEFT JOIN public_figures f ON f.id = st.public_figure_id AND f.deleted_at IS NULL
    LEFT JOIN organisations o ON o.id = st.organisation_id AND o.deleted_at IS NULL
    WHERE st.deleted_at IS NULL AND p.deleted_at IS NULL AND s.deleted_at IS NULL
      AND st.joint_declaration_id IS NULL
      AND (f.id IS NOT NULL OR o.id IS NOT NULL)
    UNION ALL
    SELECT 'joint_declaration', d.id, d.title, d.slug, NULL, NULL, NULL,
      lower(unaccent(d.title)),
      concat_ws(' ', d.presentation, (
        SELECT string_agg(DISTINCT st.quote, ' ')
        FROM statements st
        WHERE st.joint_declaration_id = d.id AND st.deleted_at IS NULL
      )),
      d.declared_at
    FROM joint_declarations d
    UNION ALL
    SELECT 'argument', a.id, a.title, a.slug, NULL, NULL, NULL,
      lower(unaccent(a.title)), a.description, NULL
    FROM arguments a
    WHERE a.deleted_at IS NULL
    UNION ALL
    SELECT 'theme', t.id, t.name, t.slug, NULL, NULL, NULL,
      lower(unaccent(t.name)), t.description, NULL
    FROM themes t
    UNION ALL
    -- The page is the family's: an occupation carries the slug of its family
    SELECT 'occupation', oc.id, oc.name, fam.slug, NULL, NULL, fam.name,
      lower(unaccent(oc.name)), oc.description, NULL
    FROM occupations oc
    JOIN occupation_families fam ON fam.id = oc.family_id
    UNION ALL
    SELECT 'occupation', fam.id, fam.name, fam.slug, NULL, NULL, NULL,
      lower(unaccent(fam.name)), fam.description, NULL
    FROM occupation_families fam
  ),
  named AS (
    SELECT t.kind, t.id,
      (CASE
        WHEN t.haystack LIKE needle.text || '%' THEN 1.0
        WHEN t.haystack LIKE '%' || needle.text || '%' THEN 0.9
        WHEN t.haystack LIKE ALL (needle.words) THEN 0.8
        ELSE word_similarity(needle.text, t.haystack)
      END)::real AS score
    FROM things t, needle
    WHERE needle.text <> '' AND t.haystack IS NOT NULL
  ),
  found AS (
    SELECT n.kind, n.id, n.score, NULL::text AS through, false AS in_body
    FROM named n
    WHERE n.score >= 0.5
    UNION ALL
    -- A link is followed from a name that holds the words (0.8 and above),
    -- never from a look-alike: « ministre » resembles « administration », and
    -- would bring every lawyer along.
    -- The public figures of an occupation found, or of a family found
    -- (those who hold it today before those who held it)
    SELECT 'public_figure', held.public_figure_id,
      CASE WHEN bool_or(held.is_current) THEN 0.4 ELSE 0.35 END,
      string_agg(DISTINCT CASE WHEN held.is_current THEN oc.name ELSE 'ex-' || oc.name END, ', '),
      false
    FROM named n
    JOIN occupations oc ON oc.id = n.id OR oc.family_id = n.id
    JOIN public_figure_occupations held ON held.occupation_id = oc.id
    WHERE n.kind = 'occupation' AND n.score >= 0.8
    GROUP BY held.public_figure_id
    UNION ALL
    -- The subjects of a theme found
    SELECT 'subject', filed.subject_id, 0.4, string_agg(DISTINCT th.name, ', '), false
    FROM named n
    JOIN themes th ON th.id = n.id
    JOIN subject_themes filed ON filed.theme_id = th.id
    WHERE n.kind = 'theme' AND n.score >= 0.8
    GROUP BY filed.subject_id
    UNION ALL
    SELECT t.kind, t.id, 0.3, NULL, true
    FROM things t, needle
    WHERE needle.text <> '' AND lower(unaccent(t.body)) LIKE ALL (needle.words)
  ),
  best AS (
    SELECT DISTINCT ON (f.kind, f.id) f.kind, f.id, f.score, f.through, f.in_body
    FROM found f
    ORDER BY f.kind, f.id, f.score DESC
  ),
  ranked AS (
    -- The join drops what was found through a link but is deleted
    SELECT t.kind, t.id, t.title, t.slug, t.subject_slug, t.author_kind,
      coalesce(b.through, t.detail) AS detail, t.body, b.in_body, b.score,
      row_number() OVER (
        PARTITION BY t.kind ORDER BY b.score DESC, t.dated DESC NULLS LAST, t.title, t.id
      ) AS rank
    FROM best b
    JOIN things t ON t.kind = b.kind AND t.id = b.id
  )
  -- The excerpt is cut for the rows given back only
  SELECT r.kind, r.id, r.title, r.slug, r.subject_slug, r.author_kind, r.detail,
    CASE WHEN r.in_body THEN search_excerpt(r.body, needle.longest) END,
    r.score
  FROM ranked r, needle
  WHERE r.rank <= p_per_kind
  ORDER BY r.score DESC, r.kind, r.rank;
$$;
