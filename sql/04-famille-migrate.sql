-- ═══════════════════════════════════════════════════════════════
--  MIGRATION v5.1 — Family Cash Flow Tables
--  Problème : famille_transactions existe avec de mauvaises colonnes
--  Solution : migration vers le nouveau schéma (date, amount, category)
--
--  À exécuter dans :
--  https://supabase.com/dashboard/project/mfyhktnzjodaqfocupcn/sql/new
-- ═══════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════
--  ÉTAPE 1 — Vider + reconstruire famille_transactions
--  (table vide = migration directe sans perte de données)
-- ════════════════════════════════════════════════════════════════

-- Supprimer l'ancienne table famille_transactions
DROP TABLE IF EXISTS public.famille_transactions CASCADE;

-- Recréer avec le bon schéma (compatible avec db.js)
CREATE TABLE public.famille_transactions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type           TEXT NOT NULL CHECK (type IN ('income','expense')),
  amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  category       TEXT NOT NULL,
  description    TEXT,
  payment_method TEXT DEFAULT 'cash'
                 CHECK (payment_method IN ('cash','card','transfer','mobile','cheque')),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Index performance
CREATE INDEX idx_famille_tx_user      ON public.famille_transactions(user_id);
CREATE INDEX idx_famille_tx_date      ON public.famille_transactions(date DESC);
CREATE INDEX idx_famille_tx_type      ON public.famille_transactions(type);
CREATE INDEX idx_famille_tx_user_date ON public.famille_transactions(user_id, date DESC);

-- RLS
ALTER TABLE public.famille_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "famille_tx_own" ON public.famille_transactions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════
--  ÉTAPE 2 — Créer les tables famille manquantes (si inexistantes)
-- ════════════════════════════════════════════════════════════════

-- ── famille_abonnements ──
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
DROP POLICY IF EXISTS "famille_abo_own" ON public.famille_abonnements;
CREATE POLICY "famille_abo_own" ON public.famille_abonnements
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── famille_prets ──
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
DROP POLICY IF EXISTS "famille_prets_own" ON public.famille_prets;
CREATE POLICY "famille_prets_own" ON public.famille_prets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── famille_budgets ──
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
CREATE INDEX IF NOT EXISTS idx_famille_budgets_user   ON public.famille_budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_famille_budgets_period ON public.famille_budgets(user_id, year, month);
ALTER TABLE public.famille_budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "famille_budgets_own" ON public.famille_budgets;
CREATE POLICY "famille_budgets_own" ON public.famille_budgets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── famille_objectifs ──
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
DROP POLICY IF EXISTS "famille_obj_own" ON public.famille_objectifs;
CREATE POLICY "famille_obj_own" ON public.famille_objectifs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════
--  ÉTAPE 3 — Trigger updated_at sur toutes les tables famille
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
    'famille_transactions',
    'famille_abonnements',
    'famille_prets',
    'famille_budgets',
    'famille_objectifs'
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
--  ÉTAPE 4 — Vérification finale
-- ════════════════════════════════════════════════════════════════
SELECT
  t.tablename                                        AS table_name,
  (SELECT COUNT(*) FROM pg_policies p
   WHERE p.tablename = t.tablename)                  AS nb_policies,
  (SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
   FROM information_schema.columns c
   WHERE c.table_schema = 'public'
     AND c.table_name   = t.tablename)               AS colonnes
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename  LIKE 'famille_%'
ORDER BY t.tablename;

-- ═══════════════════════════════
--  Résultat attendu :
--  famille_abonnements  | 1 policy | id, user_id, name, amount, ...
--  famille_budgets      | 1 policy | id, user_id, category, amount, month, year, ...
--  famille_comptes      | ? policy | (ancienne table — OK de la laisser)
--  famille_objectifs    | 1 policy | id, user_id, name, target_amount, ...
--  famille_prets        | 1 policy | id, user_id, name, total_amount, ...
--  famille_transactions | 1 policy | id, user_id, type, amount, date, category, ...
-- ═══════════════════════════════
