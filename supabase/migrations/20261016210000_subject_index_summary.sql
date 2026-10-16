-- Projection de l'index des sujets (/s) : chaque sujet vivant avec son
-- activité (v_subject_activity_summary) et sa thématique principale, en une
-- seule requête, pour regrouper par thématique côté domaine.

CREATE VIEW v_subject_index_summary AS
SELECT
  v.*,
  t.id AS theme_id,
  t.name AS theme_name,
  t.slug AS theme_slug,
  t.description AS theme_description
FROM v_subject_activity_summary v
LEFT JOIN subject_themes st ON st.subject_id = v.id AND st.is_primary
LEFT JOIN themes t ON t.id = st.theme_id;

GRANT SELECT ON v_subject_index_summary TO anon, authenticated;
