-- ============================================================
--  DIGITAL-PRO — Script de correction : Auto-Sync Profiles
--  v3.0 — À exécuter UNE SEULE FOIS dans Supabase SQL Editor
--
--  Ce script résout définitivement le problème :
--  "Je dois relancer le SQL à chaque nouvel admin"
--
--  Solution :
--  1. Trigger PostgreSQL → crée/synchronise profiles automatiquement
--     dès qu'un utilisateur est inséré/modifié dans platform_users
--  2. Trigger sur auth.users → crée une entrée platform_users
--     dès qu'un compte Auth est créé (backup)
--  3. Upsert de récupération → synchronise les comptes existants
--  4. Vue diagnostic → voir l'état de tous les comptes en un coup d'œil
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 1 : TRIGGER — platform_users → profiles (auto-sync)
-- ────────────────────────────────────────────────────────────
-- Chaque fois qu'une ligne est insérée ou modifiée dans
-- platform_users, ce trigger crée/met à jour le profil
-- correspondant dans profiles automatiquement.

CREATE OR REPLACE FUNCTION public.sync_platform_user_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Seulement si gestapp est dans app_access (ou si app_access est vide)
  IF NEW.app_access IS NULL OR 'gestapp' = ANY(NEW.app_access) OR array_length(NEW.app_access, 1) = 0 THEN
    INSERT INTO public.profiles (
      id, email, full_name, name, role, company_id,
      is_active, created_at, updated_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.full_name, split_part(NEW.email, '@', 1)),
      COALESCE(NEW.full_name, split_part(NEW.email, '@', 1)),
      CASE
        WHEN NEW.role IN ('superadmin','admin','manager','commercial','technicien','lecture')
          THEN NEW.role
        ELSE 'commercial'
      END,
      NEW.company_id,
      COALESCE(NEW.is_active, true),
      COALESCE(NEW.created_at, NOW()),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email      = EXCLUDED.email,
      full_name  = COALESCE(EXCLUDED.full_name, profiles.full_name),
      name       = COALESCE(EXCLUDED.name, profiles.name),
      role       = EXCLUDED.role,
      company_id = EXCLUDED.company_id,
      is_active  = EXCLUDED.is_active,
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- Supprimer si existant puis recréer
DROP TRIGGER IF EXISTS trg_sync_platform_to_profile ON public.platform_users;

CREATE TRIGGER trg_sync_platform_to_profile
  AFTER INSERT OR UPDATE ON public.platform_users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_platform_user_to_profile();

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 2 : TRIGGER — auth.users → platform_users (backup)
-- ────────────────────────────────────────────────────────────
-- Quand un utilisateur est créé directement dans Supabase Auth
-- (ex: via le dashboard), crée automatiquement une entrée
-- dans platform_users avec les métadonnées.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role       TEXT;
  v_full_name  TEXT;
  v_app_access TEXT[];
BEGIN
  -- Extraire les métadonnées user_metadata
  v_role       := COALESCE(NEW.raw_user_meta_data->>'role', 'admin');
  v_full_name  := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Construire app_access depuis les métadonnées
  IF NEW.raw_user_meta_data ? 'app_access' THEN
    SELECT ARRAY(
      SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'app_access')
    ) INTO v_app_access;
  ELSE
    v_app_access := ARRAY['gestapp'];
  END IF;

  -- Valider le rôle
  IF v_role NOT IN ('superadmin','admin','manager','commercial','technicien','lecture') THEN
    v_role := 'admin';
  END IF;

  -- Insérer dans platform_users (idempotent)
  INSERT INTO public.platform_users (
    id, email, full_name, role, app_access,
    is_active, created_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_role,
    v_app_access,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Ne pas écraser si déjà créé par la fonction Netlify

  RETURN NEW;
END;
$$;

-- Supprimer si existant puis recréer
DROP TRIGGER IF EXISTS trg_handle_new_auth_user ON auth.users;

CREATE TRIGGER trg_handle_new_auth_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 3 : AMÉLIORER LA FONCTION admin-create-user
--           (Politique RLS service_role déjà en place)
-- ────────────────────────────────────────────────────────────
-- Vérifier que service_role peut toujours tout faire
-- (normalement déjà configuré, mais on s'assure)

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['platform_users','profiles','companies']
  LOOP
    -- S'assurer que la policy service_role existe
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = tbl
        AND policyname = tbl || '_service_role'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        tbl || '_service_role', tbl
      );
      RAISE NOTICE '✅ Policy service_role ajoutée sur %', tbl;
    ELSE
      RAISE NOTICE '✓  Policy service_role déjà présente sur %', tbl;
    END IF;
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 4 : SYNCHRONISATION DES COMPTES EXISTANTS
-- ────────────────────────────────────────────────────────────

-- 4a. Confirmer tous les emails non confirmés
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    updated_at = NOW()
WHERE email_confirmed_at IS NULL
  AND deleted_at IS NULL;

-- 4b. Activer tous les comptes platform_users inactifs
UPDATE public.platform_users
SET is_active = true, updated_at = NOW()
WHERE is_active = false OR is_active IS NULL;

-- 4c. Créer les profiles manquants pour tous les platform_users existants
-- (le trigger ne s'est pas encore déclenché pour les anciens)
INSERT INTO public.profiles (
  id, email, full_name, name, role, company_id,
  is_active, created_at, updated_at
)
SELECT
  pu.id,
  pu.email,
  COALESCE(pu.full_name, split_part(pu.email, '@', 1)),
  COALESCE(pu.full_name, split_part(pu.email, '@', 1)),
  CASE
    WHEN pu.role IN ('superadmin','admin','manager','commercial','technicien','lecture')
      THEN pu.role
    ELSE 'commercial'
  END,
  pu.company_id,
  COALESCE(pu.is_active, true),
  COALESCE(pu.created_at, NOW()),
  NOW()
FROM public.platform_users pu
INNER JOIN auth.users au ON au.id = pu.id AND au.deleted_at IS NULL
ON CONFLICT (id) DO UPDATE SET
  role       = EXCLUDED.role,
  company_id = EXCLUDED.company_id,
  is_active  = EXCLUDED.is_active,
  updated_at = NOW();

-- 4d. Créer les platform_users manquants pour les comptes Auth qui n'ont
--     ni platform_user ni profile (comptes créés directement dans Supabase)
INSERT INTO public.platform_users (
  id, email, full_name, role, app_access, is_active, created_at, updated_at
)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'role', 'admin'),
  ARRAY['gestapp'],
  true,
  NOW(),
  NOW()
FROM auth.users au
WHERE au.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.platform_users pu WHERE pu.id = au.id)
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 5 : VUE DIAGNOSTIC
-- ────────────────────────────────────────────────────────────
-- Permet de vérifier l'état de tous les comptes en une seule requête

CREATE OR REPLACE VIEW public.v_accounts_status AS
SELECT
  au.id,
  au.email,
  au.email_confirmed_at IS NOT NULL AS email_confirmed,
  au.created_at                      AS auth_created_at,
  pu.role                            AS platform_role,
  pu.app_access,
  pu.is_active                       AS platform_active,
  pr.role                            AS profile_role,
  pr.company_id,
  pr.is_active                       AS profile_active,
  CASE
    WHEN pu.id IS NULL THEN '❌ platform_users manquant'
    WHEN pr.id IS NULL THEN '⚠️  profiles manquant'
    WHEN au.email_confirmed_at IS NULL THEN '⚠️  email non confirmé'
    WHEN NOT pu.is_active THEN '⚠️  compte désactivé'
    ELSE '✅ OK'
  END AS status
FROM auth.users au
LEFT JOIN public.platform_users pu ON pu.id = au.id
LEFT JOIN public.profiles        pr ON pr.id = au.id
WHERE au.deleted_at IS NULL
ORDER BY au.created_at DESC;

-- Accorder la lecture de la vue au service_role
GRANT SELECT ON public.v_accounts_status TO service_role;

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 6 : CRÉER/RÉPARER LE SUPERADMIN
-- ────────────────────────────────────────────────────────────

DO $$
DECLARE
  sa_uid   UUID;
  sa_email TEXT := 'said.hamdaoui1984@gmail.com';
BEGIN
  SELECT id INTO sa_uid FROM auth.users
  WHERE email = sa_email AND deleted_at IS NULL LIMIT 1;

  IF sa_uid IS NULL THEN
    RAISE NOTICE '⚠️  Compte superadmin introuvable pour %.', sa_email;
  ELSE
    -- Confirmer l'email
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()), updated_at = NOW()
    WHERE id = sa_uid;

    -- Upsert platform_users
    INSERT INTO public.platform_users (
      id, email, full_name, role, app_access, is_active, created_at, updated_at
    )
    VALUES (sa_uid, sa_email, 'Said Hamdaoui', 'superadmin',
            ARRAY['gestapp','famille','calcul'], true, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      role = 'superadmin', is_active = true,
      app_access = ARRAY['gestapp','famille','calcul'],
      updated_at = NOW();

    -- profiles est mis à jour automatiquement par le trigger ci-dessus
    -- mais on force au cas où:
    INSERT INTO public.profiles (
      id, email, full_name, name, role, is_active, created_at, updated_at
    )
    VALUES (sa_uid, sa_email, 'Said Hamdaoui', 'Said Hamdaoui',
            'superadmin', true, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      role = 'superadmin', is_active = true, updated_at = NOW(),
      full_name = COALESCE(profiles.full_name, 'Said Hamdaoui'),
      name      = COALESCE(profiles.name, 'Said Hamdaoui');

    RAISE NOTICE '✅ Superadmin configuré : % (UID: %)', sa_email, sa_uid;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- RÉSUMÉ FINAL
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  nb_auth     INTEGER;
  nb_platform INTEGER;
  nb_profiles INTEGER;
  nb_orphans  INTEGER;
BEGIN
  SELECT COUNT(*) INTO nb_auth     FROM auth.users WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO nb_platform FROM public.platform_users;
  SELECT COUNT(*) INTO nb_profiles FROM public.profiles;
  SELECT COUNT(*) INTO nb_orphans
    FROM auth.users au
    WHERE au.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id);

  RAISE NOTICE '────────────────────────────────────';
  RAISE NOTICE '📊 RÉSUMÉ';
  RAISE NOTICE '  auth.users      : %', nb_auth;
  RAISE NOTICE '  platform_users  : %', nb_platform;
  RAISE NOTICE '  profiles        : %', nb_profiles;
  RAISE NOTICE '  comptes sans profil : %', nb_orphans;
  IF nb_orphans = 0 THEN
    RAISE NOTICE '✅ Tous les comptes sont synchronisés !';
  ELSE
    RAISE NOTICE '⚠️  % compte(s) sans profil — vérifiez v_accounts_status', nb_orphans;
  END IF;
  RAISE NOTICE '────────────────────────────────────';
END $$;
