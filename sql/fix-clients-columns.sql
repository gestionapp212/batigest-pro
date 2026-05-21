-- ============================================================
--  DIGITAL-PRO — Correction table clients
--  Problème : colonnes rc, ice, type, statut, notes, patente,
--             identifiant_fiscal manquantes en production
--  Solution : ALTER TABLE ADD COLUMN IF NOT EXISTS (idempotent)
--
--  À exécuter dans :
--  https://supabase.com/dashboard/project/mfyhktnzjodaqfocupcn/sql/new
-- ============================================================

-- ── ÉTAPE 1 : Colonnes manquantes sur clients ─────────────────
-- Toutes avec IF NOT EXISTS → sans risque si déjà présentes

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS ice               TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS rc                TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS patente           TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS identifiant_fiscal TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS type              TEXT DEFAULT 'entreprise';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS statut            TEXT DEFAULT 'actif';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS notes             TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS prenom            TEXT;

-- ── ÉTAPE 1b : Colonnes manquantes sur fournisseurs ────────────
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS ice               TEXT;
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS rc                TEXT;
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS identifiant_fiscal TEXT;
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS patente           TEXT;
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS categorie         TEXT DEFAULT 'general';
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS ville             TEXT;
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS conditions        TEXT DEFAULT '30';
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS notes             TEXT;

-- ── ÉTAPE 2 : Migrer identifiant_fiscal → si type_client existait ──
-- La colonne type_client peut coexister avec type ; on normalise
DO $$
BEGIN
  -- Si la colonne type_client existe, copier vers type (si type est vide)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='clients' AND column_name='type_client'
  ) THEN
    UPDATE public.clients
    SET type = type_client
    WHERE type IS NULL AND type_client IS NOT NULL;
    RAISE NOTICE 'Migration type_client → type effectuée.';
  END IF;
END $$;

-- ── ÉTAPE 3 : Vérification finale ─────────────────────────────
DO $$
DECLARE
  cols TEXT := '';
  r    RECORD;
BEGIN
  FOR r IN
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients'
    ORDER BY ordinal_position
  LOOP
    cols := cols || r.column_name || ' (' || r.data_type || '), ';
  END LOOP;
  RAISE NOTICE 'Colonnes de clients : %', cols;
END $$;

-- ── MESSAGE FINAL ─────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Correction terminée !';
  RAISE NOTICE '   clients      : ice, rc, patente, identifiant_fiscal, type, statut, notes ✅';
  RAISE NOTICE '   fournisseurs : ice, rc, patente, identifiant_fiscal, categorie, ville, conditions, notes ✅';
  RAISE NOTICE '   Rechargez GestApp → les formulaires clients et fournisseurs doivent fonctionner sans erreur 400.';
END $$;
