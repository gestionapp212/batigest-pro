-- ═══════════════════════════════════════════════════════════════
--  CALCPEINTURE PRO — Tables Supabase v5.1
--  Remplacement de paint_produits / paint_systemes / paint_historique
--  par des tables conformes à la plateforme
--
--  À exécuter dans :
--  https://supabase.com/dashboard/project/mfyhktnzjodaqfocupcn/sql/new
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ════════════════════════════════════════════════════════════════
--  1. TABLE : calcul_produits
--     Produits peinture de l'utilisateur
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.calcul_produits (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marque      TEXT,
  nom         TEXT NOT NULL,
  type        TEXT DEFAULT 'Finition',
  unite       TEXT DEFAULT 'L',
  rendement   NUMERIC(8,3) DEFAULT 10,
  rend_unite  TEXT DEFAULT 'L',
  density     NUMERIC(6,3) DEFAULT 1.4,
  pertes      NUMERIC(5,2) DEFAULT 5,
  packs       JSONB DEFAULT '[]',
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_calc_prod_user ON public.calcul_produits(user_id);
ALTER TABLE public.calcul_produits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "calc_prod_own" ON public.calcul_produits;
CREATE POLICY "calc_prod_own" ON public.calcul_produits
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════
--  2. TABLE : calcul_systemes
--     Systèmes peinture (suite d'étapes)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.calcul_systemes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom         TEXT NOT NULL,
  type        TEXT DEFAULT 'INT' CHECK (type IN ('INT','EXT','SOL')),
  support     TEXT,
  pertes      NUMERIC(5,2) DEFAULT 2,
  desc        TEXT,
  steps       JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_calc_sys_user ON public.calcul_systemes(user_id);
ALTER TABLE public.calcul_systemes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "calc_sys_own" ON public.calcul_systemes;
CREATE POLICY "calc_sys_own" ON public.calcul_systemes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════
--  3. TABLE : calcul_historique
--     Historique des devis peinture
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.calcul_historique (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  projet      TEXT NOT NULL,
  client      TEXT,
  systeme_id  UUID REFERENCES public.calcul_systemes(id) ON DELETE SET NULL,
  surface     NUMERIC(12,2) DEFAULT 0,
  type        TEXT DEFAULT 'four_pose',
  mo          NUMERIC(5,2) DEFAULT 25,
  marge       NUMERIC(5,2) DEFAULT 15,
  tva         NUMERIC(5,2) DEFAULT 20,
  total_ht    NUMERIC(14,2) DEFAULT 0,
  total_ttc   NUMERIC(14,2) DEFAULT 0,
  status      TEXT DEFAULT 'en_cours'
              CHECK (status IN ('en_cours','valide','annule','facture')),
  details     JSONB DEFAULT '{}',
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

-- ════════════════════════════════════════════════════════════════
--  4. Trigger updated_at
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['calcul_produits','calcul_systemes','calcul_historique']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_upd ON public.%s;
       CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON public.%s
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      tbl, tbl, tbl, tbl);
  END LOOP;
END; $$;

-- ════════════════════════════════════════════════════════════════
--  5. Vérification
-- ════════════════════════════════════════════════════════════════
SELECT tablename, (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.tablename) AS policies
FROM pg_tables t
WHERE schemaname = 'public' AND tablename LIKE 'calcul_%'
ORDER BY tablename;
-- Résultat attendu :
-- calcul_historique  | 1
-- calcul_produits    | 1
-- calcul_projets     | (ancienne - peut rester)
-- calcul_systemes    | 1
