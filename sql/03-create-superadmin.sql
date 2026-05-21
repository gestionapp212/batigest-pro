-- ═══════════════════════════════════════════════════════════════
--  ÉTAPE 3 — CRÉER LE SUPERADMIN
--  UUID : 86989bbf-92a5-46f6-b634-ebdc12ee3daf
--  Email : said.hamdaoui1984@gmail.com
-- ═══════════════════════════════════════════════════════════════

INSERT INTO public.platform_users (
  id,
  email,
  full_name,
  role,
  is_active,
  can_create_users,
  app_access,
  plan,
  created_at,
  updated_at
)
VALUES (
  '86989bbf-92a5-46f6-b634-ebdc12ee3daf',
  'said.hamdaoui1984@gmail.com',
  'Said Hamdaoui',
  'superadmin',
  true,
  true,
  ARRAY['gestapp','famille','calcul'],
  'enterprise',
  NOW(),
  NOW()
);

-- ─── Vérification ─────────────────────────────────────────────
SELECT
  id,
  email,
  full_name,
  role,
  is_active,
  can_create_users,
  app_access,
  plan
FROM public.platform_users
WHERE id = '86989bbf-92a5-46f6-b634-ebdc12ee3daf';
