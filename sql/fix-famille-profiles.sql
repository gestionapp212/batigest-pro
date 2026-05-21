-- ============================================================
--  DIGITAL-PRO — Fix app Famille v1.0
--  Résout les erreurs 400 et 406 dans Family CashFlow
--
--  Problèmes résolus :
--  1. GET profiles?user_id=eq.xxx → 400 : la table profiles
--     utilise 'id' comme PK, pas 'user_id'. Corrigé dans auth.js.
--  2. GET family_members → 406 : suppression de .single(). Corrigé dans auth.js.
--  3. Colonnes manquantes dans profiles pour l'app famille
--     (currency, language, theme).
--  4. Table family_members absente.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 1 : Ajouter les colonnes manquantes à profiles
--           pour que Family CashFlow puisse stocker ses préférences
-- ────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Monnaie préférée (MAD, EUR, USD...)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'currency'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN currency TEXT DEFAULT 'MAD';
    RAISE NOTICE '✅ Colonne profiles.currency ajoutée';
  ELSE
    RAISE NOTICE '✓  profiles.currency déjà présente';
  END IF;

  -- Langue de l'interface
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'language'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN language TEXT DEFAULT 'fr';
    RAISE NOTICE '✅ Colonne profiles.language ajoutée';
  ELSE
    RAISE NOTICE '✓  profiles.language déjà présente';
  END IF;

  -- Thème (light / dark)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'theme'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN theme TEXT DEFAULT 'light';
    RAISE NOTICE '✅ Colonne profiles.theme ajoutée';
  ELSE
    RAISE NOTICE '✓  profiles.theme déjà présente';
  END IF;

  -- 2FA flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'twofa_enabled'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN twofa_enabled BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Colonne profiles.twofa_enabled ajoutée';
  ELSE
    RAISE NOTICE '✓  profiles.twofa_enabled déjà présente';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 2 : Créer la table families (app Family CashFlow)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.families (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL DEFAULT 'Ma Famille',
  invitation_code  TEXT UNIQUE DEFAULT upper(substring(gen_random_uuid()::text, 1, 8)),
  currency         TEXT DEFAULT 'MAD',
  owner_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 3 : Créer la table family_members
-- ────────────────────────────────────────────────────────────
-- Note : family_members.user_id fait référence à auth.users.id
-- C'est une table de jonction, DISTINCTE de profiles.
-- Dans auth.js, le filtre .eq('user_id', userId) est CORRECT
-- pour cette table (contrairement à profiles qui utilise 'id').

CREATE TABLE IF NOT EXISTS public.family_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id  UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member','viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (family_id, user_id)
);

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 4 : Créer les tables métier de Family CashFlow
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.family_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type        TEXT NOT NULL CHECK (type IN ('income','expense')),
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  category    TEXT,
  description TEXT,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.family_budgets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id  UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  category   TEXT NOT NULL,
  amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  period     TEXT DEFAULT 'monthly',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 5 : Activer RLS sur les nouvelles tables
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.families             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_budgets       ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('families','family_members','family_transactions','family_budgets')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ── Politiques families ──
-- Un utilisateur peut voir sa famille (en tant que membre)
CREATE POLICY "families_select"
  ON public.families FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.family_members fm
            WHERE fm.family_id = families.id AND fm.user_id = auth.uid())
  );

CREATE POLICY "families_insert"
  ON public.families FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "families_update"
  ON public.families FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "families_delete"
  ON public.families FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "families_service_role"
  ON public.families FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── Politiques family_members ──
CREATE POLICY "family_members_select"
  ON public.family_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.family_members fm2
            WHERE fm2.family_id = family_members.family_id
              AND fm2.user_id = auth.uid()
              AND fm2.role = 'admin')
  );

CREATE POLICY "family_members_insert"
  ON public.family_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.family_members fm2
            WHERE fm2.family_id = family_members.family_id
              AND fm2.user_id = auth.uid()
              AND fm2.role = 'admin')
  );

CREATE POLICY "family_members_update"
  ON public.family_members FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.family_members fm2
            WHERE fm2.family_id = family_members.family_id
              AND fm2.user_id = auth.uid()
              AND fm2.role = 'admin')
  );

CREATE POLICY "family_members_delete"
  ON public.family_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.family_members fm2
            WHERE fm2.family_id = family_members.family_id
              AND fm2.user_id = auth.uid()
              AND fm2.role = 'admin')
  );

CREATE POLICY "family_members_service_role"
  ON public.family_members FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── Politiques family_transactions et family_budgets ──
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['family_transactions','family_budgets']
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated
       USING (
         EXISTS (SELECT 1 FROM public.family_members fm
                 WHERE fm.family_id = %I.family_id
                   AND fm.user_id = auth.uid())
       )
       WITH CHECK (
         EXISTS (SELECT 1 FROM public.family_members fm
                 WHERE fm.family_id = %I.family_id
                   AND fm.user_id = auth.uid())
       )',
      tbl || '_policy', tbl, tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      tbl || '_service', tbl
    );
    RAISE NOTICE '✅ Politiques RLS créées pour %', tbl;
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────
-- RÉSUMÉ
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '────────────────────────────────────';
  RAISE NOTICE '✅ Fix Famille terminé :';
  RAISE NOTICE '  - profiles.currency/language/theme/twofa_enabled ajoutés';
  RAISE NOTICE '  - Table families créée (avec invitation_code)';
  RAISE NOTICE '  - Table family_members créée (user_id = auth.users.id)';
  RAISE NOTICE '  - Tables family_transactions et family_budgets créées';
  RAISE NOTICE '  - RLS configuré sur toutes les nouvelles tables';
  RAISE NOTICE '────────────────────────────────────';
END $$;
