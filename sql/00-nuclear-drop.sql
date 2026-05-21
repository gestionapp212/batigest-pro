-- ═══════════════════════════════════════════════════════════════
--  NUCLEAR DROP — Supprime ABSOLUMENT TOUT le schéma public
--  ✅ Fonctionne même avec 50+ tables inconnues
--  ⚠️  IRRÉVERSIBLE — toutes les données seront perdues
--  https://supabase.com/dashboard/project/mfyhktnzjodaqfocupcn/sql/new
-- ═══════════════════════════════════════════════════════════════

-- ─── ÉTAPE 1 : Supprimer tous les triggers sur auth.users ──────
DROP TRIGGER IF EXISTS trg_new_auth_user        ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created     ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user          ON auth.users;

-- ─── ÉTAPE 2 : Supprimer TOUTES les fonctions publiques ────────
DO $$
DECLARE
  func_rec RECORD;
BEGIN
  FOR func_rec IN
    SELECT ns.nspname AS schema, p.proname AS name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname = 'public'
  LOOP
    BEGIN
      EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE',
                     func_rec.name, func_rec.args);
    EXCEPTION WHEN OTHERS THEN
      NULL; -- ignorer les erreurs
    END;
  END LOOP;
END $$;

-- ─── ÉTAPE 3 : Supprimer TOUTES les tables dynamiquement ───────
DO $$
DECLARE
  tbl_rec RECORD;
BEGIN
  -- Désactiver toutes les FK temporairement
  SET session_replication_role = replica;

  FOR tbl_rec IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  LOOP
    BEGIN
      EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', tbl_rec.tablename);
      RAISE NOTICE 'Table supprimée : %', tbl_rec.tablename;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Erreur sur % : %', tbl_rec.tablename, SQLERRM;
    END;
  END LOOP;

  -- Réactiver les FK
  SET session_replication_role = DEFAULT;
END $$;

-- ─── ÉTAPE 4 : Supprimer toutes les séquences restantes ────────
DO $$
DECLARE
  seq_rec RECORD;
BEGIN
  FOR seq_rec IN
    SELECT sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
  LOOP
    EXECUTE format('DROP SEQUENCE IF EXISTS public.%I CASCADE', seq_rec.sequence_name);
  END LOOP;
END $$;

-- ─── ÉTAPE 5 : Supprimer tous les types custom ─────────────────
DO $$
DECLARE
  typ_rec RECORD;
BEGIN
  FOR typ_rec IN
    SELECT typname
    FROM pg_type
    JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
    WHERE nspname = 'public' AND typtype = 'e' -- enum types
  LOOP
    EXECUTE format('DROP TYPE IF EXISTS public.%I CASCADE', typ_rec.typname);
  END LOOP;
END $$;

-- ─── VÉRIFICATION ─────────────────────────────────────────────
DO $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM pg_tables
  WHERE schemaname = 'public';

  IF cnt = 0 THEN
    RAISE NOTICE '✅ Schéma public entièrement vidé ! 0 tables restantes.';
  ELSE
    RAISE NOTICE '⚠️  Il reste encore % table(s). Relancez le script.', cnt;
  END IF;
END $$;

SELECT
  COUNT(*) AS tables_restantes,
  CASE WHEN COUNT(*) = 0
    THEN '✅ TOUT EST SUPPRIMÉ — Exécutez maintenant 02-create-all.sql'
    ELSE '⚠️  Des tables restent — Relancez ce script'
  END AS message
FROM pg_tables
WHERE schemaname = 'public';
