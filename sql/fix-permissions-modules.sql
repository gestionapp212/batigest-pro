-- ============================================================
-- DIGITAL-PRO — Migration v4.0 : Permissions Granulaires
-- Exécuter UNE SEULE FOIS dans l'éditeur SQL Supabase
-- https://supabase.com/dashboard/project/mfyhktnzjodaqfocupcn/sql/new
-- ============================================================

-- ── 1. CORRECTION CHECK CONSTRAINT RÔLES ──────────────────
-- Assure que tous les rôles métier sont acceptés
ALTER TABLE public.platform_users
  DROP CONSTRAINT IF EXISTS platform_users_role_check;

ALTER TABLE public.platform_users
  ADD CONSTRAINT platform_users_role_check
  CHECK (role IN ('superadmin','admin','manager','commercial','technicien','lecture'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('superadmin','admin','manager','commercial','technicien','lecture','comptable'));

-- ── 2. COLONNE module_permissions dans platform_users ─────
-- Stocke les permissions granulaires par module pour chaque utilisateur
-- Format JSON : { "clients": "edit", "devis": "view", "factures": "hidden", ... }
-- Valeurs possibles par module : "edit" | "view" | "hidden"
ALTER TABLE public.platform_users
  ADD COLUMN IF NOT EXISTS module_permissions JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS module_permissions JSONB DEFAULT '{}'::jsonb;

-- ── 3. COLONNE can_create_users dans platform_users ───────
-- Seul le superadmin peut créer des utilisateurs
-- Les admins peuvent seulement modifier les permissions
ALTER TABLE public.platform_users
  ADD COLUMN IF NOT EXISTS can_create_users BOOLEAN DEFAULT false;

-- Mettre à jour : superadmin peut créer des utilisateurs
UPDATE public.platform_users
  SET can_create_users = true
  WHERE role = 'superadmin';

-- ── 4. TRIGGER SYNC platform_users → profiles ─────────────
-- Assure la synchronisation des permissions entre les deux tables

CREATE OR REPLACE FUNCTION sync_platform_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
  -- Synchroniser vers profiles si la ligne existe
  UPDATE public.profiles
  SET
    role               = NEW.role,
    module_permissions = NEW.module_permissions,
    is_active          = NEW.is_active,
    updated_at         = NOW()
  WHERE id = NEW.id;

  -- Si aucune ligne dans profiles, en créer une
  IF NOT FOUND THEN
    INSERT INTO public.profiles (
      id, email, full_name, name, role,
      company_id, is_active, module_permissions,
      created_at, updated_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      NEW.full_name,
      NEW.full_name,
      NEW.role,
      NEW.company_id,
      NEW.is_active,
      NEW.module_permissions,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      role               = EXCLUDED.role,
      module_permissions = EXCLUDED.module_permissions,
      is_active          = EXCLUDED.is_active,
      updated_at         = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_platform_to_profiles ON public.platform_users;

CREATE TRIGGER trg_sync_platform_to_profiles
  AFTER INSERT OR UPDATE OF role, module_permissions, is_active
  ON public.platform_users
  FOR EACH ROW EXECUTE FUNCTION sync_platform_to_profiles();

-- ── 5. TRIGGER SYNC profiles → platform_users ─────────────
-- Synchronisation inverse pour les admins qui modifient depuis profiles

CREATE OR REPLACE FUNCTION sync_profiles_to_platform()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.platform_users
  SET
    role               = NEW.role,
    module_permissions = NEW.module_permissions,
    is_active          = NEW.is_active,
    updated_at         = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_profiles_to_platform ON public.profiles;

CREATE TRIGGER trg_sync_profiles_to_platform
  AFTER UPDATE OF role, module_permissions, is_active
  ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION sync_profiles_to_platform();

-- ── 6. UPSERT SÉCURISÉ pour admin-create-user ────────────
-- Vue sécurisée pour que les admins puissent mettre à jour les permissions
-- sans pouvoir créer de nouveaux utilisateurs

CREATE OR REPLACE FUNCTION update_user_permissions(
  p_user_id UUID,
  p_module_permissions JSONB,
  p_role TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_caller_role TEXT;
  v_result JSON;
BEGIN
  -- Vérifier que l'appelant est admin ou superadmin
  SELECT role INTO v_caller_role
  FROM public.platform_users
  WHERE id = auth.uid();

  IF v_caller_role NOT IN ('superadmin', 'admin') THEN
    RAISE EXCEPTION 'Permission refusée — rôle requis : admin ou superadmin';
  END IF;

  -- Empêcher un admin de modifier un superadmin
  IF v_caller_role = 'admin' THEN
    DECLARE v_target_role TEXT;
    BEGIN
      SELECT role INTO v_target_role FROM public.platform_users WHERE id = p_user_id;
      IF v_target_role = 'superadmin' THEN
        RAISE EXCEPTION 'Un admin ne peut pas modifier un superadmin';
      END IF;
      -- Un admin ne peut pas changer le rôle
      p_role := NULL;
    END;
  END IF;

  -- Mettre à jour platform_users
  UPDATE public.platform_users SET
    module_permissions = COALESCE(p_module_permissions, module_permissions),
    role               = COALESCE(p_role, role),
    is_active          = COALESCE(p_is_active, is_active),
    updated_at         = NOW()
  WHERE id = p_user_id;

  SELECT json_build_object(
    'ok', true,
    'user_id', p_user_id,
    'updated_at', NOW()
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 7. RLS ANTI-RÉCURSION pour platform_users ────────────
-- Corriger aussi les fonctions helper si elles causent des boucles
-- IMPORTANT : on utilise une fonction SECURITY DEFINER pour éviter
-- la récursion infinie (RLS qui appelle RLS sur la même table)

-- Fonction helper : retourne le rôle du user courant SANS déclencher RLS
CREATE OR REPLACE FUNCTION get_my_platform_role()
RETURNS TEXT AS $$
  SELECT role FROM public.platform_users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Fonction helper : retourne la company_id du user courant SANS RLS
CREATE OR REPLACE FUNCTION get_my_platform_company()
RETURNS UUID AS $$
  SELECT company_id FROM public.platform_users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Supprimer TOUTES les anciennes politiques sur platform_users pour repartir proprement
DROP POLICY IF EXISTS "admins_read_company_users"         ON public.platform_users;
DROP POLICY IF EXISTS "platform_users_select_own"         ON public.platform_users;
DROP POLICY IF EXISTS "platform_users_insert_superadmin"  ON public.platform_users;
DROP POLICY IF EXISTS "platform_users_update_superadmin"  ON public.platform_users;
DROP POLICY IF EXISTS "platform_users_delete_superadmin"  ON public.platform_users;
DROP POLICY IF EXISTS "platform_users_service_role"       ON public.platform_users;
DROP POLICY IF EXISTS "platform_users_self" ON public.platform_users;
DROP POLICY IF EXISTS "platform_users_superadmin" ON public.platform_users;

-- Politique unifiée sans récursion
CREATE POLICY "platform_users_read_v4"
  ON public.platform_users
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      id = auth.uid()                          -- Toujours voir son propre profil
      OR get_my_platform_role() = 'superadmin' -- Superadmin voit tout
      OR (
        get_my_platform_role() = 'admin'       -- Admin voit sa société
        AND company_id = get_my_platform_company()
      )
    )
  );

-- Politique UPDATE : chacun peut mettre à jour son propre profil, admin peut update sa société
DROP POLICY IF EXISTS "platform_users_update_v4" ON public.platform_users;
CREATE POLICY "platform_users_update_v4"
  ON public.platform_users
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      id = auth.uid()
      OR get_my_platform_role() = 'superadmin'
      OR (get_my_platform_role() = 'admin' AND company_id = get_my_platform_company())
    )
  );

-- Politique DELETE (superadmin seulement)
DROP POLICY IF EXISTS "platform_users_delete_v4" ON public.platform_users;
CREATE POLICY "platform_users_delete_v4"
  ON public.platform_users
  FOR DELETE
  USING (get_my_platform_role() = 'superadmin');

-- Politique INSERT (service_role via Netlify Function)
-- Le service_role bypass RLS automatiquement — pas besoin de politique explicite
-- Mais on ajoute quand même pour compatibilité
DROP POLICY IF EXISTS "platform_users_service_role" ON public.platform_users;
CREATE POLICY "platform_users_service_role"
  ON public.platform_users FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Accorder les droits d'exécution sur les nouvelles fonctions helpers
GRANT EXECUTE ON FUNCTION get_my_platform_role()    TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_my_platform_company() TO authenticated, anon, service_role;

-- ── 8. VÉRIFICATION ───────────────────────────────────────

DO $$
DECLARE
  col_count INT;
  trig_count INT;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'platform_users'
    AND column_name = 'module_permissions';

  SELECT COUNT(*) INTO trig_count
  FROM information_schema.triggers
  WHERE trigger_name IN ('trg_sync_platform_to_profiles','trg_sync_profiles_to_platform');

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'MIGRATION v4.0 — RÉSULTATS :';
  RAISE NOTICE '  module_permissions colonne : %', CASE WHEN col_count > 0 THEN '✅ OK' ELSE '❌ MANQUANT' END;
  RAISE NOTICE '  triggers sync : % / 2', trig_count;
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'PROCHAINES ÉTAPES :';
  RAISE NOTICE '  1. Vérifier que les triggers sont actifs';
  RAISE NOTICE '  2. Recharger le portail admin';
  RAISE NOTICE '  3. Assigner des permissions aux admins';
  RAISE NOTICE '===========================================';
END $$;
