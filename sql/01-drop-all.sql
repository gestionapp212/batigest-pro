-- ═══════════════════════════════════════════════════════════════
--  ÉTAPE 1 — SUPPRIMER TOUT (DROP ALL) — VERSION CORRIGÉE
--  ⚠️  ATTENTION : Supprime TOUTES les données existantes !
--  À exécuter EN PREMIER dans :
--  https://supabase.com/dashboard/project/mfyhktnzjodaqfocupcn/sql/new
-- ═══════════════════════════════════════════════════════════════

-- ─── Supprimer les triggers via DO block (ignore si la table n'existe pas) ──
DO $$
DECLARE
  tbl  TEXT;
  trig TEXT;
BEGIN
  -- Liste des couples (trigger, table)
  FOR trig, tbl IN
    VALUES
      ('trg_sync_platform_to_profiles', 'platform_users'),
      ('trg_updated_at_companies',      'companies'),
      ('trg_updated_at_platform_users', 'platform_users'),
      ('trg_updated_at_profiles',       'profiles'),
      ('trg_updated_at_clients',        'clients'),
      ('trg_updated_at_devis',          'devis'),
      ('trg_updated_at_factures',       'factures'),
      ('trg_updated_at_chantiers',      'chantiers'),
      ('trg_updated_at_fournisseurs',   'fournisseurs'),
      ('trg_updated_at_materiaux',      'materiaux'),
      ('trg_updated_at_calcul_projets', 'calcul_projets')
  LOOP
    -- Vérifier que la table existe avant de supprimer le trigger
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', trig, tbl);
    END IF;
  END LOOP;
END $$;

-- ─── Supprimer le trigger sur auth.users (table système) ──────
DROP TRIGGER IF EXISTS trg_new_auth_user ON auth.users;

-- ─── Supprimer les fonctions ───────────────────────────────────
DROP FUNCTION IF EXISTS public.sync_platform_to_profiles() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_auth_user()      CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at()            CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role()             CASCADE;
DROP FUNCTION IF EXISTS public.get_user_company()          CASCADE;

-- ─── Supprimer toutes les tables avec CASCADE ─────────────────
-- (L'ordre évite les erreurs de clés étrangères)
DROP TABLE IF EXISTS public.audit_logs              CASCADE;
DROP TABLE IF EXISTS public.famille_transactions    CASCADE;
DROP TABLE IF EXISTS public.famille_comptes         CASCADE;
DROP TABLE IF EXISTS public.calcul_projets          CASCADE;
DROP TABLE IF EXISTS public.materiaux               CASCADE;
DROP TABLE IF EXISTS public.fournisseurs            CASCADE;
DROP TABLE IF EXISTS public.chantiers               CASCADE;
DROP TABLE IF EXISTS public.factures                CASCADE;
DROP TABLE IF EXISTS public.devis                   CASCADE;
DROP TABLE IF EXISTS public.clients                 CASCADE;
DROP TABLE IF EXISTS public.profiles                CASCADE;
DROP TABLE IF EXISTS public.platform_users          CASCADE;
DROP TABLE IF EXISTS public.companies               CASCADE;

-- ─── Vérification : aucune table public ne doit rester ────────
DO $$
DECLARE
  remaining INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

  IF remaining = 0 THEN
    RAISE NOTICE '✅ Toutes les tables supprimées avec succès !';
  ELSE
    RAISE NOTICE '⚠️  Il reste % table(s) dans le schéma public.', remaining;
  END IF;
END $$;

SELECT 'DROP ALL terminé ✅ — Vous pouvez maintenant exécuter 02-create-all.sql' AS status;
