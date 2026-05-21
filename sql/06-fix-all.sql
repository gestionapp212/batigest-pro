-- ═══════════════════════════════════════════════════════════════════
--  DIGITAL-PRO.LIVE — Fix complet v5.2
--  Résout les 3 problèmes critiques identifiés :
--  1. Tables calcul_* manquantes (8 erreurs 404)
--  2. RLS famille_transactions incorrecte
--  3. Tables famille manquantes ou colonnes erronées
--
--  ⚠️  À EXÉCUTER dans Supabase SQL Editor :
--  https://supabase.com/dashboard/project/mfyhktnzjodaqfocupcn/sql/new
--
--  Copier-coller ce fichier entier → Run
-- ═══════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ════════════════════════════════════════════════════════════════════
--  PARTIE A — FAMILLE CASH FLOW
--  Recréer famille_transactions avec le bon schéma + vérifier les autres tables
-- ════════════════════════════════════════════════════════════════════

-- A1. Supprimer et recréer famille_transactions (corrige colonnes manquantes)
DROP TABLE IF EXISTS public.famille_transactions CASCADE;

CREATE TABLE public.famille_transactions (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type           TEXT        NOT NULL CHECK (type IN ('income','expense')),
  amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date           DATE        NOT NULL DEFAULT CURRENT_DATE,
  category       TEXT        NOT NULL DEFAULT 'Autre',
  description    TEXT,
  payment_method TEXT        DEFAULT 'cash'
                 CHECK (payment_method IN ('cash','card','transfer','mobile','cheque')),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_famille_tx_user      ON public.famille_transactions(user_id);
CREATE INDEX idx_famille_tx_date      ON public.famille_transactions(date DESC);
CREATE INDEX idx_famille_tx_type      ON public.famille_transactions(type);
CREATE INDEX idx_famille_tx_user_date ON public.famille_transactions(user_id, date DESC);

-- RLS
ALTER TABLE public.famille_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "famille_tx_own" ON public.famille_transactions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- A2. famille_abonnements
CREATE TABLE IF NOT EXISTS public.famille_abonnements (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  frequency   TEXT        NOT NULL DEFAULT 'monthly'
              CHECK (frequency IN ('monthly','quarterly','annual','weekly')),
  next_date   DATE,
  category    TEXT        DEFAULT 'abonnement',
  active      BOOLEAN     DEFAULT TRUE,
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

-- A3. famille_prets
CREATE TABLE IF NOT EXISTS public.famille_prets (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  total_amount     NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
  monthly_payment  NUMERIC(12,2) NOT NULL CHECK (monthly_payment > 0),
  start_date       DATE        NOT NULL,
  months_total     INTEGER     NOT NULL CHECK (months_total > 0),
  interest_rate    NUMERIC(5,2) DEFAULT 0,
  status           TEXT        DEFAULT 'active' CHECK (status IN ('active','completed','paused')),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_famille_prets_user ON public.famille_prets(user_id);
ALTER TABLE public.famille_prets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "famille_prets_own" ON public.famille_prets;
CREATE POLICY "famille_prets_own" ON public.famille_prets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- A4. famille_budgets
CREATE TABLE IF NOT EXISTS public.famille_budgets (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category    TEXT        NOT NULL,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  month       INTEGER     NOT NULL CHECK (month BETWEEN 1 AND 12),
  year        INTEGER     NOT NULL CHECK (year >= 2020),
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

-- A5. famille_objectifs
CREATE TABLE IF NOT EXISTS public.famille_objectifs (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  target_amount  NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(12,2) DEFAULT 0,
  target_date    DATE,
  icon           TEXT        DEFAULT '🎯',
  color          TEXT        DEFAULT '#6366f1',
  status         TEXT        DEFAULT 'active' CHECK (status IN ('active','completed','paused')),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_famille_obj_user ON public.famille_objectifs(user_id);
ALTER TABLE public.famille_objectifs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "famille_obj_own" ON public.famille_objectifs;
CREATE POLICY "famille_obj_own" ON public.famille_objectifs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════════
--  PARTIE B — CALCPEINTURE PRO
--  Créer les tables calcul_produits, calcul_systemes, calcul_historique
-- ════════════════════════════════════════════════════════════════════

-- B1. calcul_produits
CREATE TABLE IF NOT EXISTS public.calcul_produits (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marque      TEXT,
  nom         TEXT        NOT NULL,
  type        TEXT        DEFAULT 'Finition',
  unite       TEXT        DEFAULT 'L',
  rendement   NUMERIC(8,3) DEFAULT 10,
  rend_unite  TEXT        DEFAULT 'L',
  density     NUMERIC(6,3) DEFAULT 1.4,
  pertes      NUMERIC(5,2) DEFAULT 5,
  packs       JSONB       DEFAULT '[]',
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_calc_prod_user ON public.calcul_produits(user_id);
ALTER TABLE public.calcul_produits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "calc_prod_own" ON public.calcul_produits;
CREATE POLICY "calc_prod_own" ON public.calcul_produits
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- B2. calcul_systemes
CREATE TABLE IF NOT EXISTS public.calcul_systemes (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom         TEXT        NOT NULL,
  type        TEXT        DEFAULT 'INT' CHECK (type IN ('INT','EXT','SOL')),
  support     TEXT,
  pertes      NUMERIC(5,2) DEFAULT 2,
  description TEXT,
  steps       JSONB       DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_calc_sys_user ON public.calcul_systemes(user_id);
ALTER TABLE public.calcul_systemes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "calc_sys_own" ON public.calcul_systemes;
CREATE POLICY "calc_sys_own" ON public.calcul_systemes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- B3. calcul_historique
CREATE TABLE IF NOT EXISTS public.calcul_historique (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  projet      TEXT        NOT NULL,
  client      TEXT,
  systeme_id  UUID        REFERENCES public.calcul_systemes(id) ON DELETE SET NULL,
  surface     NUMERIC(12,2) DEFAULT 0,
  type        TEXT        DEFAULT 'four_pose',
  mo          NUMERIC(5,2) DEFAULT 25,
  marge       NUMERIC(5,2) DEFAULT 15,
  tva         NUMERIC(5,2) DEFAULT 20,
  total_ht    NUMERIC(14,2) DEFAULT 0,
  total_ttc   NUMERIC(14,2) DEFAULT 0,
  status      TEXT        DEFAULT 'en_cours'
              CHECK (status IN ('en_cours','valide','annule','facture')),
  details     JSONB       DEFAULT '{}',
  date        TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_calc_hist_user ON public.calcul_historique(user_id);
CREATE INDEX IF NOT EXISTS idx_calc_hist_date ON public.calcul_historique(date DESC);
ALTER TABLE public.calcul_historique ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "calc_hist_own" ON public.calcul_historique;
CREATE POLICY "calc_hist_own" ON public.calcul_historique
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════════
--  PARTIE C — TRIGGERS updated_at sur toutes les tables
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'famille_transactions',
    'famille_abonnements',
    'famille_prets',
    'famille_budgets',
    'famille_objectifs',
    'calcul_produits',
    'calcul_systemes',
    'calcul_historique'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_upd ON public.%s;
       CREATE TRIGGER trg_%s_upd
       BEFORE UPDATE ON public.%s
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END; $$;

-- ════════════════════════════════════════════════════════════════════
--  PARTIE D — VÉRIFICATION FINALE
-- ════════════════════════════════════════════════════════════════════

SELECT
  t.tablename                                                         AS table_name,
  (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.tablename) AS nb_policies,
  (SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
   FROM information_schema.columns c
   WHERE c.table_schema = 'public' AND c.table_name = t.tablename)   AS colonnes
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'famille_transactions','famille_abonnements','famille_prets',
    'famille_budgets','famille_objectifs',
    'calcul_produits','calcul_systemes','calcul_historique'
  )
ORDER BY t.tablename;

-- ════════════════════════════════════════════════════════════════════
--  Résultat attendu (8 lignes, chacune avec nb_policies = 1) :
--  ─────────────────────────────────────────────────────────────────
--  calcul_historique    | 1 | id, user_id, projet, client, ...
--  calcul_produits      | 1 | id, user_id, marque, nom, type, ...
--  calcul_systemes      | 1 | id, user_id, nom, type, support, ...
--  famille_abonnements  | 1 | id, user_id, name, amount, frequency, ...
--  famille_budgets      | 1 | id, user_id, category, amount, month, year, ...
--  famille_objectifs    | 1 | id, user_id, name, target_amount, ...
--  famille_prets        | 1 | id, user_id, name, total_amount, ...
--  famille_transactions | 1 | id, user_id, type, amount, date, category, ...
-- ════════════════════════════════════════════════════════════════════
