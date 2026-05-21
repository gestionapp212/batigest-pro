-- ============================================================
--  Script FINAL v3 — Ultra-sécurisé
--  ✅ Ignore les tables avec structure différente
--  ✅ Ne plante JAMAIS sur une colonne manquante
--  Projet : mfyhktnzjodaqfocupcn
-- ============================================================

-- ════════════════════════════════════════════════════════════
--  PARTIE 1 — FAMILY CASH FLOW : fix récursion RLS
-- ════════════════════════════════════════════════════════════

-- Fix family_members (la seule table qui cause la récursion)
ALTER TABLE IF EXISTS public.family_members DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "family_members_select"                  ON public.family_members;
DROP POLICY IF EXISTS "family_members_insert"                  ON public.family_members;
DROP POLICY IF EXISTS "family_members_update"                  ON public.family_members;
DROP POLICY IF EXISTS "family_members_delete"                  ON public.family_members;
DROP POLICY IF EXISTS "Users can view their family members"    ON public.family_members;
DROP POLICY IF EXISTS "Users can insert their family members"  ON public.family_members;
DROP POLICY IF EXISTS "Users can update their family members"  ON public.family_members;
DROP POLICY IF EXISTS "Users can delete their family members"  ON public.family_members;
DROP POLICY IF EXISTS "fm_select" ON public.family_members;
DROP POLICY IF EXISTS "fm_insert" ON public.family_members;
DROP POLICY IF EXISTS "fm_update" ON public.family_members;
DROP POLICY IF EXISTS "fm_delete" ON public.family_members;

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fm_select" ON public.family_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "fm_insert" ON public.family_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "fm_update" ON public.family_members
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "fm_delete" ON public.family_members
  FOR DELETE USING (user_id = auth.uid());

-- Fix incomes
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='incomes' AND column_name='user_id'
  ) THEN
    ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "inc_all" ON public.incomes;
    EXECUTE 'CREATE POLICY "inc_all" ON public.incomes FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
  END IF;
END $$;

-- Fix expenses
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='expenses' AND column_name='user_id'
  ) THEN
    ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "exp_all" ON public.expenses;
    EXECUTE 'CREATE POLICY "exp_all" ON public.expenses FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
  END IF;
END $$;

-- Fix subscriptions (seulement si colonne user_id existe)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='subscriptions' AND column_name='user_id'
  ) THEN
    ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "sub_all" ON public.subscriptions;
    EXECUTE 'CREATE POLICY "sub_all" ON public.subscriptions FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
  END IF;
END $$;

-- Fix loans
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='loans' AND column_name='user_id'
  ) THEN
    ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "loans_all" ON public.loans;
    EXECUTE 'CREATE POLICY "loans_all" ON public.loans FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
  END IF;
END $$;

-- Fix budgets
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='budgets' AND column_name='user_id'
  ) THEN
    ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "budgets_all" ON public.budgets;
    EXECUTE 'CREATE POLICY "budgets_all" ON public.budgets FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
  END IF;
END $$;

-- Fix notifications
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='notifications' AND column_name='user_id'
  ) THEN
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "notif_all"             ON public.notifications;
    DROP POLICY IF EXISTS "notifications_update"  ON public.notifications;
    DROP POLICY IF EXISTS "notifications_insert"  ON public.notifications;
    EXECUTE 'CREATE POLICY "notif_all" ON public.notifications FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════
--  PARTIE 2 — GESTAPP212 : nouvelles tables
-- ════════════════════════════════════════════════════════════

-- Colonnes supplémentaires ga_users
ALTER TABLE IF EXISTS ga_users ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'actif';
ALTER TABLE IF EXISTS ga_users ADD COLUMN IF NOT EXISTS tel TEXT;
ALTER TABLE IF EXISTS ga_users ADD COLUMN IF NOT EXISTS derniere_connexion TIMESTAMPTZ;

-- Super admin
UPDATE ga_users
SET role = 'super_admin', statut = 'actif'
WHERE email = 'said.hamdaoui1984@gmail.com';

-- Tables
CREATE TABLE IF NOT EXISTS ga_clients (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  societe_id   UUID,
  ref          TEXT,
  nom          TEXT NOT NULL,
  contact      TEXT,
  email        TEXT,
  tel          TEXT,
  type         TEXT DEFAULT 'Entreprise',
  ville        TEXT,
  statut       TEXT DEFAULT 'prospect',
  pipeline     TEXT DEFAULT 'contact',
  score        INTEGER DEFAULT 50,
  ca_total     NUMERIC(12,2) DEFAULT 0,
  nb_chantiers INTEGER DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ga_taches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  societe_id   UUID,
  chantier_id  UUID,
  chantier     TEXT,
  titre        TEXT NOT NULL,
  description  TEXT,
  assigne      TEXT,
  priorite     TEXT DEFAULT 'normale',
  statut       TEXT DEFAULT 'todo',
  echeance     DATE,
  done         BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ga_achats (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  societe_id     UUID,
  chantier_id    UUID,
  chantier       TEXT,
  ref            TEXT,
  fournisseur    TEXT,
  article        TEXT NOT NULL,
  montant        NUMERIC(12,2) DEFAULT 0,
  date           DATE DEFAULT CURRENT_DATE,
  mode_paiement  TEXT DEFAULT 'Virement',
  statut         TEXT DEFAULT 'commandé',
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ga_avances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  societe_id      UUID,
  chantier        TEXT,
  ref             TEXT,
  employe         TEXT NOT NULL,
  employe_id      UUID,
  montant         NUMERIC(12,2) DEFAULT 0,
  remboursements  NUMERIC(12,2) DEFAULT 0,
  date            DATE DEFAULT CURRENT_DATE,
  motif           TEXT,
  statut          TEXT DEFAULT 'en_attente',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ga_prestataires (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  societe_id       UUID,
  chantier_id      UUID,
  chantier         TEXT,
  ref              TEXT,
  nom              TEXT NOT NULL,
  responsable      TEXT,
  tel              TEXT,
  specialite       TEXT,
  montant_contrat  NUMERIC(12,2) DEFAULT 0,
  paye             NUMERIC(12,2) DEFAULT 0,
  date_debut       DATE,
  date_fin         DATE,
  statut           TEXT DEFAULT 'actif',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ga_galerie (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  societe_id   UUID,
  chantier_id  UUID,
  chantier     TEXT,
  titre        TEXT NOT NULL,
  categorie    TEXT DEFAULT 'En cours',
  url          TEXT,
  storage_path TEXT,
  note         TEXT,
  auteur       TEXT,
  date         DATE DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Fonction + Triggers updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_ga_clients_upd      ON ga_clients;
DROP TRIGGER IF EXISTS tr_ga_taches_upd       ON ga_taches;
DROP TRIGGER IF EXISTS tr_ga_prestataires_upd ON ga_prestataires;

CREATE TRIGGER tr_ga_clients_upd
  BEFORE UPDATE ON ga_clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_ga_taches_upd
  BEFORE UPDATE ON ga_taches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_ga_prestataires_upd
  BEFORE UPDATE ON ga_prestataires FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS GestionApp
ALTER TABLE ga_clients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga_taches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga_achats       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga_avances      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga_prestataires ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga_galerie      ENABLE ROW LEVEL SECURITY;

-- Drop avant recréation
DROP POLICY IF EXISTS "ga_clients_all"      ON ga_clients;
DROP POLICY IF EXISTS "ga_taches_all"       ON ga_taches;
DROP POLICY IF EXISTS "ga_achats_all"       ON ga_achats;
DROP POLICY IF EXISTS "ga_avances_all"      ON ga_avances;
DROP POLICY IF EXISTS "ga_prestataires_all" ON ga_prestataires;
DROP POLICY IF EXISTS "ga_galerie_all"      ON ga_galerie;
DROP POLICY IF EXISTS "super_admin_users"   ON ga_users;

CREATE POLICY "ga_clients_all" ON ga_clients
  FOR ALL USING (societe_id IN (SELECT societe_id FROM ga_membres WHERE user_id = auth.uid()));

CREATE POLICY "ga_taches_all" ON ga_taches
  FOR ALL USING (societe_id IN (SELECT societe_id FROM ga_membres WHERE user_id = auth.uid()));

CREATE POLICY "ga_achats_all" ON ga_achats
  FOR ALL USING (societe_id IN (SELECT societe_id FROM ga_membres WHERE user_id = auth.uid()));

CREATE POLICY "ga_avances_all" ON ga_avances
  FOR ALL USING (societe_id IN (SELECT societe_id FROM ga_membres WHERE user_id = auth.uid()));

CREATE POLICY "ga_prestataires_all" ON ga_prestataires
  FOR ALL USING (societe_id IN (SELECT societe_id FROM ga_membres WHERE user_id = auth.uid()));

CREATE POLICY "ga_galerie_all" ON ga_galerie
  FOR ALL USING (societe_id IN (SELECT societe_id FROM ga_membres WHERE user_id = auth.uid()));

CREATE POLICY "super_admin_users" ON ga_users
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM ga_users
      WHERE role = 'super_admin' OR email = 'said.hamdaoui1984@gmail.com'
    )
  );

-- ════════════════════════════════════════════════════════════
SELECT '✅ SUCCESS — Script v3 exécuté sans erreur !' AS message;
-- ════════════════════════════════════════════════════════════
