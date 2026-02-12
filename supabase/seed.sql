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
