-- Projection de l'index des personnalités (/p) : chaque personnalité vivante
-- avec son activité (v_public_figure_activity_summary), ses métiers avec leur
-- famille et ses affiliations, en une seule requête. Le regroupement par
-- famille, le choix des visages et le jugement « affiliation en cours » restent
-- au domaine : la vue rend toutes les affiliations avec leur date de fin.

CREATE VIEW v_public_figure_index_summary AS
SELECT
  v.*,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'name', o.name,
          'is_current', pfo.is_current,
          'family_id', f.id,
          'family_name', f.name,
          'family_slug', f.slug,
          'family_position', f.position
        )
        ORDER BY f.position, o.name
      )
      FROM public_figure_occupations pfo
      JOIN occupations o ON o.id = pfo.occupation_id
      JOIN occupation_families f ON f.id = o.family_id
      WHERE pfo.public_figure_id = v.id
    ),
    '[]'::jsonb
  ) AS occupations,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'name', org.name,
          'acronym', org.acronym,
          'slug', org.slug,
          'ended_on', m.ended_on
        )
        ORDER BY m.started_on NULLS LAST, org.name
      )
      FROM organisation_memberships m
      JOIN organisations org ON org.id = m.organisation_id
      WHERE m.public_figure_id = v.id
        AND org.deleted_at IS NULL
    ),
    '[]'::jsonb
  ) AS affiliations
FROM v_public_figure_activity_summary v;

GRANT SELECT ON v_public_figure_index_summary TO anon, authenticated;
