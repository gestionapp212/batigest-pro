-- ═══════════════════════════════════════════════════════════════
--  FAMILY CASH FLOW — Tables Supabase v5.0
--  À exécuter dans : https://supabase.com/dashboard/project/mfyhktnzjodaqfocupcn/sql/new
--  Après avoir exécuté 02-create-all.sql
-- ═══════════════════════════════════════════════════════════════

-- ── Extension ──────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ════════════════════════════════════════════════════════════════
--  1. TABLE : famille_transactions
--     Revenus et dépenses de l'utilisateur
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.famille_transactions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type           TEXT NOT NULL CHECK (type IN ('income','expense')),
  amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date           DATE NOT NULL,
  category       TEXT NOT NULL,
  description    TEXT,
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash','card','transfer','mobile','cheque')),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_famille_tx_user    ON public.famille_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_famille_tx_date    ON public.famille_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_famille_tx_type    ON public.famille_transactions(type);
CREATE INDEX IF NOT EXISTS idx_famille_tx_user_date ON public.famille_transactions(user_id, date DESC);

-- RLS
ALTER TABLE public.famille_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "famille_tx_select" ON public.famille_transactions;
DROP POLICY IF EXISTS "famille_tx_insert" ON public.famille_transactions;
DROP POLICY IF EXISTS "famille_tx_update" ON public.famille_transactions;
DROP POLICY IF EXISTS "famille_tx_delete" ON public.famille_transactions;

CREATE POLICY "famille_tx_select" ON public.famille_transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "famille_tx_insert" ON public.famille_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "famille_tx_update" ON public.famille_transactions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "famille_tx_delete" ON public.famille_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════
--  2. TABLE : famille_abonnements
--     Abonnements et charges récurrentes
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.famille_abonnements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  frequency   TEXT NOT NULL DEFAULT 'monthly'
                CHECK (frequency IN ('monthly','quarterly','annual','weekly')),
  next_date   DATE,
  category    TEXT DEFAULT 'abonnement',
  active      BOOLEAN DEFAULT TRUE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_famille_abo_user ON public.famille_abonnements(user_id);
CREATE INDEX IF NOT EXISTS idx_famille_abo_date ON public.famille_abonnements(next_date);

ALTER TABLE public.famille_abonnements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "famille_abo_select" ON public.famille_abonnements;
DROP POLICY IF EXISTS "famille_abo_insert" ON public.famille_abonnements;
DROP POLICY IF EXISTS "famille_abo_update" ON public.famille_abonnements;
DROP POLICY IF EXISTS "famille_abo_delete" ON public.famille_abonnements;

CREATE POLICY "famille_abo_select" ON public.famille_abonnements
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "famille_abo_insert" ON public.famille_abonnements
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "famille_abo_update" ON public.famille_abonnements
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "famille_abo_delete" ON public.famille_abonnements
  FOR DELETE USING (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════
--  3. TABLE : famille_prets
--     Prêts et crédits (voiture, maison, etc.)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.famille_prets (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  total_amount      NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
  monthly_payment   NUMERIC(12,2) NOT NULL CHECK (monthly_payment > 0),
  start_date        DATE NOT NULL,
  months_total      INTEGER NOT NULL CHECK (months_total > 0),
  interest_rate     NUMERIC(5,2) DEFAULT 0,
  status            TEXT DEFAULT 'active' CHECK (status IN ('active','completed','paused')),
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_famille_prets_user ON public.famille_prets(user_id);

ALTER TABLE public.famille_prets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "famille_prets_select" ON public.famille_prets;
DROP POLICY IF EXISTS "famille_prets_insert" ON public.famille_prets;
DROP POLICY IF EXISTS "famille_prets_update" ON public.famille_prets;
DROP POLICY IF EXISTS "famille_prets_delete" ON public.famille_prets;

CREATE POLICY "famille_prets_select" ON public.famille_prets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "famille_prets_insert" ON public.famille_prets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "famille_prets_update" ON public.famille_prets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "famille_prets_delete" ON public.famille_prets
  FOR DELETE USING (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════
--  4. TABLE : famille_budgets
--     Budgets mensuels par catégorie
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.famille_budgets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  month       INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year        INTEGER NOT NULL CHECK (year >= 2020),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, category, month, year)
);

CREATE INDEX IF NOT EXISTS idx_famille_budgets_user ON public.famille_budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_famille_budgets_period ON public.famille_budgets(user_id, year, month);

ALTER TABLE public.famille_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "famille_budgets_select" ON public.famille_budgets;
DROP POLICY IF EXISTS "famille_budgets_insert" ON public.famille_budgets;
DROP POLICY IF EXISTS "famille_budgets_update" ON public.famille_budgets;
DROP POLICY IF EXISTS "famille_budgets_delete" ON public.famille_budgets;

CREATE POLICY "famille_budgets_select" ON public.famille_budgets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "famille_budgets_insert" ON public.famille_budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "famille_budgets_update" ON public.famille_budgets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "famille_budgets_delete" ON public.famille_budgets
  FOR DELETE USING (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════
--  5. TABLE : famille_objectifs
--     Objectifs d'épargne
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.famille_objectifs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  target_amount   NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
  current_amount  NUMERIC(12,2) DEFAULT 0,
  target_date     DATE,
  icon            TEXT DEFAULT '🎯',
  color           TEXT DEFAULT '#6366f1',
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','completed','paused')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_famille_obj_user ON public.famille_objectifs(user_id);

ALTER TABLE public.famille_objectifs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "famille_obj_select" ON public.famille_objectifs;
DROP POLICY IF EXISTS "famille_obj_insert" ON public.famille_objectifs;
DROP POLICY IF EXISTS "famille_obj_update" ON public.famille_objectifs;
DROP POLICY IF EXISTS "famille_obj_delete" ON public.famille_objectifs;

CREATE POLICY "famille_obj_select" ON public.famille_objectifs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "famille_obj_insert" ON public.famille_objectifs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "famille_obj_update" ON public.famille_objectifs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "famille_obj_delete" ON public.famille_objectifs
  FOR DELETE USING (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════
--  6. TRIGGER : updated_at automatique
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'famille_transactions','famille_abonnements',
    'famille_prets','famille_budgets','famille_objectifs'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated ON public.%s;
       CREATE TRIGGER trg_%s_updated
       BEFORE UPDATE ON public.%s
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END;
$$;

-- ════════════════════════════════════════════════════════════════
--  7. VÉRIFICATION FINALE
-- ════════════════════════════════════════════════════════════════
SELECT
  schemaname,
  tablename,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) AS nb_policies
FROM pg_tables t
WHERE schemaname = 'public'
  AND tablename LIKE 'famille_%'
ORDER BY tablename;

-- Résultat attendu :
-- famille_abonnements | 4 policies
-- famille_budgets     | 4 policies
-- famille_objectifs   | 4 policies
-- famille_prets       | 4 policies
-- famille_transactions| 4 policies
