-- ═══════════════════════════════════════════════════════════════
--  FIX TABLES EXISTANTES — v5.0
--  Ce script corrige les tables qui existent déjà en ajoutant
--  les colonnes manquantes (ALTER TABLE ... ADD COLUMN IF NOT EXISTS)
--
--  À exécuter dans :
--  https://supabase.com/dashboard/project/mfyhktnzjodaqfocupcn/sql/new
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
--  1. CORRECTIONS TABLE companies
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS max_users        INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS ice              TEXT,
  ADD COLUMN IF NOT EXISTS city             TEXT,
  ADD COLUMN IF NOT EXISTS address          TEXT,
  ADD COLUMN IF NOT EXISTS phone            TEXT,
  ADD COLUMN IF NOT EXISTS logo_url         TEXT,
  ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT NOW();

-- Corriger le check constraint sur plan (s'il n'existe pas)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'companies_plan_check' AND conrelid = 'public.companies'::regclass
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_plan_check CHECK (plan IN ('starter','pro','enterprise'));
  END IF;
END $$;

-- Corriger le check constraint sur status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'companies_status_check' AND conrelid = 'public.companies'::regclass
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_status_check CHECK (status IN ('active','suspended','blocked'));
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
--  2. CORRECTIONS TABLE platform_users
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.platform_users
  ADD COLUMN IF NOT EXISTS plan               TEXT DEFAULT 'pro',
  ADD COLUMN IF NOT EXISTS avatar_url         TEXT,
  ADD COLUMN IF NOT EXISTS phone              TEXT,
  ADD COLUMN IF NOT EXISTS module_permissions JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS can_create_users   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS two_fa_enabled     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS app_access         TEXT[] DEFAULT '{}';

-- Corriger le check sur role (peut déjà exister)
DO $$
BEGIN
  -- Supprimer l'ancien constraint s'il ne contient pas 'lecture'
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'platform_users_role_check' AND conrelid = 'public.platform_users'::regclass
  ) THEN
    ALTER TABLE public.platform_users DROP CONSTRAINT platform_users_role_check;
  END IF;
  ALTER TABLE public.platform_users
    ADD CONSTRAINT platform_users_role_check
    CHECK (role IN ('superadmin','admin','manager','commercial','technicien','lecture'));
END $$;

-- ─────────────────────────────────────────────────────────────
--  3. CORRECTIONS TABLE profiles
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan               TEXT DEFAULT 'pro',
  ADD COLUMN IF NOT EXISTS module_permissions JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS two_fa_enabled     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────
--  4. CORRECTIONS TABLE clients
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS prenom     TEXT,
  ADD COLUMN IF NOT EXISTS cin        TEXT,
  ADD COLUMN IF NOT EXISTS ice        TEXT,
  ADD COLUMN IF NOT EXISTS type       TEXT DEFAULT 'particulier',
  ADD COLUMN IF NOT EXISTS notes      TEXT,
  ADD COLUMN IF NOT EXISTS is_active  BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- ─────────────────────────────────────────────────────────────
--  5. CORRECTIONS TABLE fournisseurs
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.fournisseurs
  ADD COLUMN IF NOT EXISTS categorie TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notes     TEXT;

-- ─────────────────────────────────────────────────────────────
--  6. CRÉER LES TABLES MANQUANTES (si elles n'existent pas encore)
-- ─────────────────────────────────────────────────────────────

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email  TEXT,
  action      TEXT NOT NULL,
  detail      TEXT,
  category    TEXT DEFAULT 'general',
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- materiaux
CREATE TABLE IF NOT EXISTS public.materiaux (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  fournisseur_id UUID REFERENCES public.fournisseurs(id),
  nom            TEXT NOT NULL,
  reference      TEXT,
  unite          TEXT DEFAULT 'unité',
  prix_unitaire  NUMERIC(10,2) DEFAULT 0,
  stock          NUMERIC(10,2) DEFAULT 0,
  stock_min      NUMERIC(10,2) DEFAULT 0,
  categorie      TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- famille_comptes
CREATE TABLE IF NOT EXISTS public.famille_comptes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nom        TEXT NOT NULL,
  type       TEXT DEFAULT 'courant',
  solde      NUMERIC(12,2) DEFAULT 0,
  couleur    TEXT DEFAULT '#6366f1',
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- famille_transactions
CREATE TABLE IF NOT EXISTS public.famille_transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  compte_id   UUID REFERENCES public.famille_comptes(id),
  type        TEXT DEFAULT 'depense',
  categorie   TEXT,
  montant     NUMERIC(12,2) NOT NULL,
  description TEXT,
  date_trans  DATE DEFAULT CURRENT_DATE,
  recurrent   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- calcul_projets
CREATE TABLE IF NOT EXISTS public.calcul_projets (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nom          TEXT NOT NULL,
  client       TEXT,
  adresse      TEXT,
  statut       TEXT DEFAULT 'en_cours',
  surfaces     JSONB DEFAULT '[]',
  total_m2     NUMERIC(10,2) DEFAULT 0,
  total_litres NUMERIC(10,2) DEFAULT 0,
  total_prix   NUMERIC(12,2) DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
--  7. ACTIVER RLS SUR LES NOUVELLES TABLES
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiaux            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.famille_comptes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.famille_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calcul_projets       ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
--  8. FONCTIONS HELPER (recréer si manquantes)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.platform_users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_company()
RETURNS UUID AS $$
  SELECT company_id FROM public.platform_users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─────────────────────────────────────────────────────────────
--  9. POLICIES RLS
-- ─────────────────────────────────────────────────────────────

-- Companies
DROP POLICY IF EXISTS companies_select    ON public.companies;
DROP POLICY IF EXISTS companies_all_sa    ON public.companies;
CREATE POLICY companies_select ON public.companies FOR SELECT
  USING (get_user_role() = 'superadmin' OR id = get_user_company());
CREATE POLICY companies_all_sa ON public.companies FOR ALL
  USING (get_user_role() = 'superadmin') WITH CHECK (get_user_role() = 'superadmin');

-- platform_users
DROP POLICY IF EXISTS pusers_select    ON public.platform_users;
DROP POLICY IF EXISTS pusers_update    ON public.platform_users;
DROP POLICY IF EXISTS pusers_insert_sa ON public.platform_users;
CREATE POLICY pusers_select ON public.platform_users FOR SELECT
  USING (
    get_user_role() = 'superadmin'
    OR id = auth.uid()
    OR (get_user_role() = 'admin' AND company_id = get_user_company())
  );
CREATE POLICY pusers_update ON public.platform_users FOR UPDATE
  USING (get_user_role() = 'superadmin' OR id = auth.uid());
CREATE POLICY pusers_insert_sa ON public.platform_users FOR INSERT
  WITH CHECK (get_user_role() = 'superadmin');

-- profiles
DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_update ON public.profiles;
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT
  USING (
    get_user_role() = 'superadmin'
    OR id = auth.uid()
    OR (get_user_role() = 'admin' AND company_id = get_user_company())
  );
CREATE POLICY profiles_update ON public.profiles FOR UPDATE
  USING (get_user_role() = 'superadmin' OR id = auth.uid());
CREATE POLICY profiles_insert ON public.profiles FOR INSERT
  WITH CHECK (get_user_role() = 'superadmin' OR id = auth.uid());

-- Tables GestApp (clients, devis, factures, chantiers, fournisseurs)
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['clients','devis','factures','chantiers','fournisseurs','materiaux'] LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS %I ON public.%I;
      CREATE POLICY %I ON public.%I FOR ALL
        USING (get_user_role() = ''superadmin'' OR company_id = get_user_company())
        WITH CHECK (get_user_role() = ''superadmin'' OR company_id = get_user_company());
    ', tbl||'_policy', tbl, tbl||'_policy', tbl);
  END LOOP;
END $$;

-- audit_logs
DROP POLICY IF EXISTS audit_insert ON public.audit_logs;
DROP POLICY IF EXISTS audit_select ON public.audit_logs;
CREATE POLICY audit_insert ON public.audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY audit_select ON public.audit_logs FOR SELECT
  USING (get_user_role() = 'superadmin' OR user_id = auth.uid());

-- famille
DROP POLICY IF EXISTS fcomptes_user ON public.famille_comptes;
DROP POLICY IF EXISTS ftrans_user   ON public.famille_transactions;
CREATE POLICY fcomptes_user ON public.famille_comptes FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY ftrans_user ON public.famille_transactions FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- calcul
DROP POLICY IF EXISTS calcul_user ON public.calcul_projets;
CREATE POLICY calcul_user ON public.calcul_projets FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
--  10. TRIGGERS
-- ─────────────────────────────────────────────────────────────

-- updated_at automatique
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'companies','platform_users','profiles','clients','devis','factures',
    'chantiers','fournisseurs','materiaux','calcul_projets'
  ] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_updated_at_%I ON public.%I;
      CREATE TRIGGER trg_updated_at_%I BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    ', tbl, tbl, tbl, tbl);
  END LOOP;
END $$;

-- Sync platform_users → profiles
CREATE OR REPLACE FUNCTION public.sync_platform_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, company_id, plan, is_active, module_permissions, updated_at)
  VALUES (NEW.id, NEW.email, NEW.full_name, NEW.role, NEW.company_id, NEW.plan, NEW.is_active, NEW.module_permissions, NOW())
  ON CONFLICT (id) DO UPDATE SET
    full_name          = EXCLUDED.full_name,
    role               = EXCLUDED.role,
    company_id         = EXCLUDED.company_id,
    plan               = EXCLUDED.plan,
    is_active          = EXCLUDED.is_active,
    module_permissions = EXCLUDED.module_permissions,
    updated_at         = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_platform_to_profiles ON public.platform_users;
CREATE TRIGGER trg_sync_platform_to_profiles
  AFTER INSERT OR UPDATE ON public.platform_users
  FOR EACH ROW EXECUTE FUNCTION public.sync_platform_to_profiles();

-- Trigger: nouveau auth.user → platform_users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.platform_users (id, email, full_name, role, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin'),
    true,
    NOW(), NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_new_auth_user ON auth.users;
CREATE TRIGGER trg_new_auth_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ─────────────────────────────────────────────────────────────
--  11. INDEXES
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_platform_users_company ON public.platform_users(company_id);
CREATE INDEX IF NOT EXISTS idx_platform_users_email   ON public.platform_users(email);
CREATE INDEX IF NOT EXISTS idx_platform_users_role    ON public.platform_users(role);
CREATE INDEX IF NOT EXISTS idx_clients_company        ON public.clients(company_id);
CREATE INDEX IF NOT EXISTS idx_devis_company          ON public.devis(company_id);
CREATE INDEX IF NOT EXISTS idx_factures_company       ON public.factures(company_id);
CREATE INDEX IF NOT EXISTS idx_chantiers_company      ON public.chantiers(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_user             ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created          ON public.audit_logs(created_at DESC);

-- ─────────────────────────────────────────────────────────────
--  12. ENTREPRISE DÉMO
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.companies (id, name, ice, city, plan, status, max_users, subscription_end)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Société Démo BTP',
  '000000000000000',
  'Casablanca',
  'pro',
  'active',
  10,
  NOW() + INTERVAL '1 year'
)
ON CONFLICT (id) DO UPDATE SET
  max_users = 10,
  plan      = 'pro',
  status    = 'active';

-- ─────────────────────────────────────────────────────────────
--  13. SUPERADMIN (décommenter après avoir l'UUID depuis Auth > Users)
-- ─────────────────────────────────────────────────────────────
/*
INSERT INTO public.platform_users (id, email, full_name, role, is_active, can_create_users, app_access)
VALUES (
  'VOTRE-UUID-SUPERADMIN',         -- ← Remplacer par le vrai UUID
  'said.hamdaoui1984@gmail.com',
  'Said Hamdaoui',
  'superadmin',
  true,
  true,
  ARRAY['gestapp','famille','calcul']
)
ON CONFLICT (id) DO UPDATE SET
  role             = 'superadmin',
  can_create_users = true,
  is_active        = true;
*/

-- ═══════════════════════════════════════════════════════════════
SELECT 'Fix v5.0 terminé — colonnes manquantes ajoutées !' AS status;
-- ═══════════════════════════════════════════════════════════════
