-- ============================================================
--  Créer le compte Super Admin dans Supabase Auth
--  ⚠️  À exécuter dans : Supabase > SQL Editor
-- ============================================================

-- ÉTAPE 1 : Créer l'utilisateur dans auth.users
-- (utilise la fonction interne Supabase pour créer un vrai compte Auth)

SELECT auth.uid(); -- vérifier que auth fonctionne

-- Créer le compte avec email + mot de passe
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'said.hamdaoui1984@gmail.com',
  crypt('SAID1984@', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"nom":"Said Hamdaoui","role":"super_admin"}',
  FALSE,
  'authenticated'
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'said.hamdaoui1984@gmail.com'
);

-- ÉTAPE 2 : S'assurer que ga_users contient le profil
INSERT INTO ga_users (id, email, nom, role, statut)
SELECT 
  u.id,
  'said.hamdaoui1984@gmail.com',
  'Said Hamdaoui',
  'super_admin',
  'actif'
FROM auth.users u
WHERE u.email = 'said.hamdaoui1984@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin',
  statut = 'actif',
  nom = COALESCE(ga_users.nom, 'Said Hamdaoui');

-- Vérification
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  g.role,
  g.statut
FROM auth.users u
LEFT JOIN ga_users g ON g.id = u.id
WHERE u.email = 'said.hamdaoui1984@gmail.com';
