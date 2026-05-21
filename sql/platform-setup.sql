-- ═══════════════════════════════════════════════════════════════
--  PLATFORM SAAS — SQL SETUP COMPLET v5.0
--  Supabase PostgreSQL
--  À exécuter dans : https://supabase.com/dashboard/project/mfyhktnzjodaqfocupcn/sql/new
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
--  0. EXTENSIONS
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────
--  1. TABLE COMPANIES (Entreprises / Abonnements)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.companies (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  ice              TEXT,
  city             TEXT,
  address          TEXT,
  phone            TEXT,
  email            TEXT,
  logo_url         TEXT,
  plan             TEXT NOT NULL DEFAULT 'pro'
                   CHECK (plan IN ('starter','pro','enterprise')),
  status           TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','suspended','blocked')),
  max_users        INTEGER NOT NULL DEFAULT 10,
  subscription_end TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
--  2. TABLE PLATFORM_USERS (Tous les utilisateurs de la plateforme)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_users (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT UNIQUE NOT NULL,
  full_name           TEXT,
  role                TEXT NOT NULL DEFAULT 'admin'
                      CHECK (role IN ('superadmin','admin','manager','commercial','technicien','lecture')),
  app_access          TEXT[]   DEFAULT '{}',        -- ['gestapp','famille','calcul']
  company_id          UUID     REFERENCES public.companies(id) ON DELETE SET NULL,
  plan                TEXT     DEFAULT 'pro',
  is_active           BOOLEAN  DEFAULT true,
  avatar_url          TEXT,
  phone               TEXT,
  module_permissions  JSONB    DEFAULT '{}',        -- {"clients":"edit","devis":"view"}
  can_create_users    BOOLEAN  DEFAULT false,        -- true uniquement pour superadmin
  two_fa_enabled      BOOLEAN  DEFAULT false,
  last_login          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
--  3. TABLE PROFILES (Mirror pour GestApp — synchronisé via trigger)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email              TEXT UNIQUE NOT NULL,
  full_name          TEXT,
  role               TEXT DEFAULT 'admin',
  company_id         UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  plan               TEXT DEFAULT 'pro',
  is_active          BOOLEAN DEFAULT true,
  avatar_url         TEXT,
  module_permissions JSONB DEFAULT '{}',
  two_fa_enabled     BOOLEAN DEFAULT false,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
--  4. TABLE AUDIT_LOGS
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
--  5. TABLES GESTAPP BTP
-- ─────────────────────────────────────────────────────────────

-- Clients
CREATE TABLE IF NOT EXISTS public.clients (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  nom          TEXT NOT NULL,
  prenom       TEXT,
  email        TEXT,
  telephone    TEXT,
  adresse      TEXT,
  ville        TEXT,
  cin          TEXT,
  ice          TEXT,
  type         TEXT DEFAULT 'particulier' CHECK (type IN ('particulier','entreprise')),
  notes        TEXT,
  is_active    BOOLEAN DEFAULT true,
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Devis
CREATE TABLE IF NOT EXISTS public.devis (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES public.clients(id),
  numero          TEXT NOT NULL,
  titre           TEXT,
  statut          TEXT DEFAULT 'brouillon' CHECK (statut IN ('brouillon','envoye','accepte','refuse','expire')),
  date_devis      DATE DEFAULT CURRENT_DATE,
  date_validite   DATE,
  montant_ht      NUMERIC(12,2) DEFAULT 0,
  tva_pct         NUMERIC(5,2)  DEFAULT 20,
  montant_ttc     NUMERIC(12,2) DEFAULT 0,
  notes           TEXT,
  lignes          JSONB DEFAULT '[]',
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Factures
CREATE TABLE IF NOT EXISTS public.factures (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES public.clients(id),
  devis_id        UUID REFERENCES public.devis(id),
  numero          TEXT NOT NULL,
  titre           TEXT,
  statut          TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente','payee','partiellement_payee','en_retard','annulee')),
  date_facture    DATE DEFAULT CURRENT_DATE,
  date_echeance   DATE,
  montant_ht      NUMERIC(12,2) DEFAULT 0,
  tva_pct         NUMERIC(5,2)  DEFAULT 20,
  montant_ttc     NUMERIC(12,2) DEFAULT 0,
  montant_paye    NUMERIC(12,2) DEFAULT 0,
  notes           TEXT,
  lignes          JSONB DEFAULT '[]',
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Chantiers
CREATE TABLE IF NOT EXISTS public.chantiers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id     UUID REFERENCES public.clients(id),
  nom           TEXT NOT NULL,
  description   TEXT,
  adresse       TEXT,
  statut        TEXT DEFAULT 'planifie' CHECK (statut IN ('planifie','en_cours','termine','suspendu','annule')),
  date_debut    DATE,
  date_fin      DATE,
  budget        NUMERIC(12,2) DEFAULT 0,
  avancement    INTEGER DEFAULT 0 CHECK (avancement BETWEEN 0 AND 100),
  chef_chantier TEXT,
  notes         TEXT,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Fournisseurs
CREATE TABLE IF NOT EXISTS public.fournisseurs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  nom          TEXT NOT NULL,
  contact      TEXT,
  email        TEXT,
  telephone    TEXT,
  adresse      TEXT,
  ville        TEXT,
  ice          TEXT,
  categorie    TEXT,
  notes        TEXT,
  is_active    BOOLEAN DEFAULT true,
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Matériaux
CREATE TABLE IF NOT EXISTS public.materiaux (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  fournisseur_id UUID REFERENCES public.fournisseurs(id),
  nom          TEXT NOT NULL,
  reference    TEXT,
  unite        TEXT DEFAULT 'unité',
  prix_unitaire NUMERIC(10,2) DEFAULT 0,
  stock        NUMERIC(10,2) DEFAULT 0,
  stock_min    NUMERIC(10,2) DEFAULT 0,
  categorie    TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
--  6. TABLES FAMILY CASHFLOW
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.famille_comptes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nom          TEXT NOT NULL,
  type         TEXT DEFAULT 'courant' CHECK (type IN ('courant','epargne','credit','cash')),
  solde        NUMERIC(12,2) DEFAULT 0,
  couleur      TEXT DEFAULT '#6366f1',
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.famille_transactions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  compte_id    UUID REFERENCES public.famille_comptes(id),
  type         TEXT DEFAULT 'depense' CHECK (type IN ('revenu','depense','transfert')),
  categorie    TEXT,
  montant      NUMERIC(12,2) NOT NULL,
  description  TEXT,
  date_trans   DATE DEFAULT CURRENT_DATE,
  recurrent    BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
--  7. TABLES CALCPEINTURE PRO
-- ─────────────────────────────────────────────────────────────
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
--  8. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────
-- Activer RLS sur toutes les tables
ALTER TABLE public.companies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_users   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devis            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factures         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chantiers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fournisseurs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiaux        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.famille_comptes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.famille_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calcul_projets   ENABLE ROW LEVEL SECURITY;

-- Helper: rôle de l'utilisateur courant
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.platform_users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: company_id de l'utilisateur courant
CREATE OR REPLACE FUNCTION public.get_user_company()
RETURNS UUID AS $$
  SELECT company_id FROM public.platform_users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Companies: superadmin voit tout, autres voient leur entreprise ──
DROP POLICY IF EXISTS companies_select ON public.companies;
CREATE POLICY companies_select ON public.companies FOR SELECT
  USING (
    get_user_role() = 'superadmin'
    OR id = get_user_company()
  );

DROP POLICY IF EXISTS companies_all_sa ON public.companies;
CREATE POLICY companies_all_sa ON public.companies FOR ALL
  USING (get_user_role() = 'superadmin')
  WITH CHECK (get_user_role() = 'superadmin');

-- ── platform_users: superadmin voit tout, user voit son profil ──
DROP POLICY IF EXISTS pusers_select ON public.platform_users;
CREATE POLICY pusers_select ON public.platform_users FOR SELECT
  USING (
    get_user_role() = 'superadmin'
    OR id = auth.uid()
    OR (get_user_role() = 'admin' AND company_id = get_user_company())
  );

DROP POLICY IF EXISTS pusers_update ON public.platform_users;
CREATE POLICY pusers_update ON public.platform_users FOR UPDATE
  USING (
    get_user_role() = 'superadmin'
    OR id = auth.uid()
  );

DROP POLICY IF EXISTS pusers_insert_sa ON public.platform_users;
CREATE POLICY pusers_insert_sa ON public.platform_users FOR INSERT
  WITH CHECK (get_user_role() = 'superadmin');

-- ── profiles: même logique ──
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT
  USING (
    get_user_role() = 'superadmin'
    OR id = auth.uid()
    OR (get_user_role() = 'admin' AND company_id = get_user_company())
  );

DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles FOR UPDATE
  USING (get_user_role() = 'superadmin' OR id = auth.uid());

DROP POLICY IF EXISTS profiles_insert ON public.profiles;
CREATE POLICY profiles_insert ON public.profiles FOR INSERT
  WITH CHECK (get_user_role() = 'superadmin' OR id = auth.uid());

-- ── Tables GestApp: accès par company_id ──
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['clients','devis','factures','chantiers','fournisseurs','materiaux']
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS %I_company ON public.%I;
      CREATE POLICY %I_company ON public.%I FOR ALL
        USING (
          get_user_role() = ''superadmin''
          OR company_id = get_user_company()
        )
        WITH CHECK (
          get_user_role() = ''superadmin''
          OR company_id = get_user_company()
        );
    ', tbl||'_policy', tbl, tbl||'_policy', tbl);
  END LOOP;
END $$;

-- ── famille: accès par user_id ──
DROP POLICY IF EXISTS fcomptes_user ON public.famille_comptes;
CREATE POLICY fcomptes_user ON public.famille_comptes FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS ftrans_user ON public.famille_transactions;
CREATE POLICY ftrans_user ON public.famille_transactions FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── calcul: accès par user_id ──
DROP POLICY IF EXISTS calcul_user ON public.calcul_projets;
CREATE POLICY calcul_user ON public.calcul_projets FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── audit_logs: superadmin lit tout, insert pour tous ──
DROP POLICY IF EXISTS audit_insert ON public.audit_logs;
CREATE POLICY audit_insert ON public.audit_logs FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS audit_select ON public.audit_logs;
CREATE POLICY audit_select ON public.audit_logs FOR SELECT
  USING (get_user_role() = 'superadmin' OR user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
--  9. TRIGGERS
-- ─────────────────────────────────────────────────────────────

-- Trigger: updated_at automatique
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

-- Trigger: sync platform_users → profiles
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

-- Trigger: nouveau auth.user → platform_users (auto-création profil)
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
--  10. DONNÉES INITIALES
-- ─────────────────────────────────────────────────────────────

-- Entreprise démo GestApp
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
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
--  11. INDEXES pour les performances
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_platform_users_company  ON public.platform_users(company_id);
CREATE INDEX IF NOT EXISTS idx_platform_users_email    ON public.platform_users(email);
CREATE INDEX IF NOT EXISTS idx_platform_users_role     ON public.platform_users(role);
CREATE INDEX IF NOT EXISTS idx_clients_company         ON public.clients(company_id);
CREATE INDEX IF NOT EXISTS idx_devis_company           ON public.devis(company_id);
CREATE INDEX IF NOT EXISTS idx_factures_company        ON public.factures(company_id);
CREATE INDEX IF NOT EXISTS idx_chantiers_company       ON public.chantiers(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_user              ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created           ON public.audit_logs(created_at DESC);

-- ─────────────────────────────────────────────────────────────
--  12. CRÉER LE SUPERADMIN (après avoir créé l'utilisateur dans Auth)
--  Remplacez 'VOTRE-UUID-SUPERADMIN' par le vrai UUID depuis Auth > Users
-- ─────────────────────────────────────────────────────────────
/*
INSERT INTO public.platform_users (id, email, full_name, role, is_active, can_create_users, app_access)
VALUES (
  'VOTRE-UUID-SUPERADMIN',
  'said.hamdaoui1984@gmail.com',
  'Said Hamdaoui',
  'superadmin',
  true,
  true,
  ARRAY['gestapp','famille','calcul']
)
ON CONFLICT (id) DO UPDATE SET
  role = 'superadmin',
  can_create_users = true,
  is_active = true;
*/

-- ═══════════════════════════════════════════════════════════════
--  FIN DU SCRIPT
-- ═══════════════════════════════════════════════════════════════
SELECT 'Platform SaaS v5.0 — Setup terminé !' AS status;
