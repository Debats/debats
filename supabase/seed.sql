-- Seed minimal pour le développement local
-- Le contenu est géré par le script d'import : npm run import:content

-- Utilisateur auth de test (nécessaire car auth.users n'est pas accessible via le client Supabase)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'jalil@arfaoui.net',
  '$2b$10$Ecf7RaaBNpLNwiIMYP2Ow.GD0iIQbOM/udZerrOa56WG05SwqlmKa',
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Jalil Arfaoui"}',
  false,
  '',
  '',
  '',
  ''
);

-- Le contributeur de l'utilisateur de test, avec assez de réputation pour tout faire en local
INSERT INTO contributors (id, reputation)
VALUES ('00000000-0000-0000-0000-000000000001', 100000)
ON CONFLICT (id) DO NOTHING;

-- Deux organisations pour tester les pages /o en local (le logo de Renaissance vient de seed-data/logos)
INSERT INTO organisations (id, name, slug, acronym, organisation_type, presentation, wikipedia_url, website_url, notoriety_sources, created_by, updated_by)
VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    'Renaissance',
    'renaissance',
    'RE',
    'political_party',
    'Renaissance (RE), dénommé En marche (EM) de 2016 à 2017, puis La République en marche (LREM) jusqu''en 2022, est un parti politique français créé en avril 2016 par Emmanuel Macron. Le parti a dirigé la coalition Ensemble pour la République (EPR) pour les élections législatives de 2022 et de 2024.',
    'https://fr.wikipedia.org/wiki/Renaissance_(parti)',
    'https://parti-renaissance.fr',
    '{}',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Confédération générale du travail',
    'confederation-generale-du-travail',
    'CGT',
    'union',
    'La Confédération générale du travail (CGT) est une confédération syndicale française fondée en 1895 à Limoges. Elle est l''une des principales organisations syndicales de salariés en France.',
    'https://fr.wikipedia.org/wiki/Conf%C3%A9d%C3%A9ration_g%C3%A9n%C3%A9rale_du_travail',
    'https://www.cgt.fr',
    '{}',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (slug) DO NOTHING;

-- Affiliations, seulement si les personnalités existent (le contenu vient de npm run import:content)
INSERT INTO organisation_memberships (organisation_id, public_figure_id, role, started_on, created_by, updated_by)
SELECT '10000000-0000-0000-0000-000000000001', pf.id, 'Fondateur et président d''honneur', '2016-04-06',
       '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'
FROM public_figures pf WHERE pf.slug = 'emmanuel-macron' AND pf.deleted_at IS NULL;

INSERT INTO organisation_memberships (organisation_id, public_figure_id, role, started_on, created_by, updated_by)
SELECT '10000000-0000-0000-0000-000000000002', pf.id, 'Secrétaire générale', '2023-03-31',
       '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'
FROM public_figures pf WHERE pf.slug = 'sophie-binet' AND pf.deleted_at IS NULL;

-- Métiers de quelques personnalités, pour voir vivre les pages /metiers et l'onglet Analyses
-- (seulement si les personnalités existent ; les métiers viennent de la migration 20261016230000)
INSERT INTO public_figure_occupations (public_figure_id, occupation_id, created_by)
SELECT pf.id, o.id, '00000000-0000-0000-0000-000000000001'
FROM public_figures pf JOIN occupations o ON
  (pf.slug = 'emmanuel-macron' AND o.slug IN ('president-e-de-la-republique', 'haut-e-fonctionnaire')) OR
  (pf.slug = 'marine-le-pen' AND o.slug IN ('depute-e', 'chef-fe-de-parti')) OR
  (pf.slug = 'sophie-binet' AND o.slug = 'secretaire-general-e-de-syndicat') OR
  (pf.slug = 'axel-kahn' AND o.slug IN ('medecin', 'scientifique')) OR
  (pf.slug = 'claire-fourcade' AND o.slug = 'medecin') OR
  (pf.slug = 'emmanuel-hirsch' AND o.slug = 'philosophe') OR
  (pf.slug = 'marine-tondelier' AND o.slug = 'chef-fe-de-parti')
WHERE pf.deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- Les personnalités du sujet « L'euthanasie » comme député·es : volontairement grossier,
-- c'est pour peupler la matrice des analyses en local
INSERT INTO public_figure_occupations (public_figure_id, occupation_id, created_by)
SELECT DISTINCT pf.id, o.id, '00000000-0000-0000-0000-000000000001'::uuid
FROM public_figures pf
JOIN statements st ON st.public_figure_id = pf.id AND st.deleted_at IS NULL
JOIN positions p ON p.id = st.position_id
JOIN subjects s ON s.id = p.subject_id AND s.slug = 'l-euthanasie'
JOIN occupations o ON o.slug = 'depute-e'
WHERE pf.deleted_at IS NULL
ON CONFLICT DO NOTHING;
