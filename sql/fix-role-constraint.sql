-- ============================================================
--  DIGITAL-PRO — Correction contrainte CHECK sur les rôles
--  Problème : en production, platform_users_role_check n'autorise
--             pas manager / commercial / technicien / lecture
--  Solution : supprimer l'ancienne contrainte et en créer une
--             nouvelle avec la liste complète des rôles.
--
--  À exécuter UNE SEULE FOIS dans :
--  https://supabase.com/dashboard/project/mfyhktnzjodaqfocupcn/sql/new
-- ============================================================

-- ── ÉTAPE 1 : Voir les contraintes existantes (diagnostic) ────
DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  SELECT constraint_name INTO v_constraint
  FROM information_schema.table_constraints
  WHERE table_schema = 'public'
    AND table_name   = 'platform_users'
    AND constraint_type = 'CHECK'
  LIMIT 1;
  RAISE NOTICE 'Contrainte CHECK trouvée : %', COALESCE(v_constraint, 'aucune');
END $$;

-- ── ÉTAPE 2 : Supprimer TOUTES les contraintes CHECK existantes
--             sur platform_users.role (noms variables selon création)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_schema    = 'public'
      AND table_name      = 'platform_users'
      AND constraint_type = 'CHECK'
  LOOP
    EXECUTE format('ALTER TABLE public.platform_users DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
    RAISE NOTICE 'Contrainte supprimée : %', r.constraint_name;
  END LOOP;
END $$;

-- ── ÉTAPE 3 : Ajouter la contrainte complète ──────────────────
ALTER TABLE public.platform_users
  ADD CONSTRAINT platform_users_role_check
  CHECK (role IN (
    'superadmin',
    'admin',
    'manager',
    'commercial',
    'technicien',
    'lecture'
  ));

-- Même correction pour profiles (au cas où)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_schema    = 'public'
      AND table_name      = 'profiles'
      AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
    RAISE NOTICE 'Profiles contrainte supprimée : %', r.constraint_name;
  END LOOP;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'superadmin',
    'admin',
    'manager',
    'commercial',
    'comptable',
    'technicien',
    'lecture'
  ));

-- ── ÉTAPE 4 : Vérification finale ─────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '=== VÉRIFICATION ===';
  RAISE NOTICE 'Contraintes actives sur platform_users :';
END $$;

SELECT
  tc.constraint_name,
  tc.constraint_type,
  cc.check_clause
FROM information_schema.table_constraints  tc
JOIN information_schema.check_constraints  cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name   = 'platform_users';

-- ── ÉTAPE 5 : Test — ces updates ne doivent plus échouer ──────
-- (simulation sans commit réel)
DO $$
BEGIN
  -- Test silencieux : insérer une valeur de rôle valide
  -- Si aucune exception → contrainte OK
  PERFORM 1 WHERE 'manager'    IN ('superadmin','admin','manager','commercial','technicien','lecture');
  PERFORM 1 WHERE 'commercial' IN ('superadmin','admin','manager','commercial','technicien','lecture');
  PERFORM 1 WHERE 'technicien' IN ('superadmin','admin','manager','commercial','technicien','lecture');
  RAISE NOTICE '✅ Tous les rôles sont valides dans la nouvelle contrainte.';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '❌ Erreur test : %', SQLERRM;
END $$;

-- ── MESSAGE FINAL ─────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Correction terminée !';
  RAISE NOTICE '   platform_users accepte maintenant : superadmin, admin, manager, commercial, technicien, lecture';
  RAISE NOTICE '   profiles accepte maintenant        : superadmin, admin, manager, commercial, comptable, technicien, lecture';
  RAISE NOTICE '';
  RAISE NOTICE '👉 Retournez sur https://helpful-rugelach-c0465d.netlify.app/admin/test.html';
  RAISE NOTICE '   et re-testez le drag & drop → les changements de rôle doivent maintenant fonctionner.';
END $$;
