-- ═══════════════════════════════════════════════════════════════
--  ÉTAPE 2 — CRÉER TOUT (CREATE ALL) v5.0
--  À exécuter APRÈS le script 01-drop-all.sql
--  https://supabase.com/dashboard/project/mfyhktnzjodaqfocupcn/sql/new
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
--  EXTENSIONS
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════════════════════════
--  TABLES
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
--  1. COMPANIES — Entreprises clientes
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.companies (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT        NOT NULL,
  ice              TEXT,
  city             TEXT,
  address          TEXT,
  phone            TEXT,
  email            TEXT,
  logo_url         TEXT,
  plan             TEXT        NOT NULL DEFAULT 'pro'
                               CHECK (plan IN ('starter','pro','enterprise')),
  status           TEXT        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active','suspended','blocked')),
  max_users        INTEGER     NOT NULL DEFAULT 10,
  subscription_end TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
--  2. PLATFORM_USERS — Tous les utilisateurs de la plateforme
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.platform_users (
  id                 UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email              TEXT        UNIQUE NOT NULL,
  full_name          TEXT,
  role               TEXT        NOT NULL DEFAULT 'admin'
                                 CHECK (role IN ('superadmin','admin','manager','commercial','technicien','lecture')),
  app_access         TEXT[]      NOT NULL DEFAULT '{}',
  company_id         UUID        REFERENCES public.companies(id) ON DELETE SET NULL,
  plan               TEXT        NOT NULL DEFAULT 'pro',
  is_active          BOOLEAN     NOT NULL DEFAULT true,
  avatar_url         TEXT,
  phone              TEXT,
  module_permissions JSONB       NOT NULL DEFAULT '{}',
  can_create_users   BOOLEAN     NOT NULL DEFAULT false,
  two_fa_enabled     BOOLEAN     NOT NULL DEFAULT false,
  last_login         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
--  3. PROFILES — Mirror GestApp (synchronisé par trigger)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id                 UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email              TEXT        UNIQUE NOT NULL,
  full_name          TEXT,
  role               TEXT        NOT NULL DEFAULT 'admin',
  company_id         UUID        REFERENCES public.companies(id) ON DELETE SET NULL,
  plan               TEXT        NOT NULL DEFAULT 'pro',
  is_active          BOOLEAN     NOT NULL DEFAULT true,
  avatar_url         TEXT,
  module_permissions JSONB       NOT NULL DEFAULT '{}',
  two_fa_enabled     BOOLEAN     NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
--  4. AUDIT_LOGS — Journal des actions
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.audit_logs (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action     TEXT        NOT NULL,
  detail     TEXT,
  category   TEXT        NOT NULL DEFAULT 'general',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
--  TABLES GESTAPP BTP
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
--  5. CLIENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.clients (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nom          TEXT        NOT NULL,
  prenom       TEXT,
  email        TEXT,
  telephone    TEXT,
  adresse      TEXT,
  ville        TEXT,
  cin          TEXT,
  ice          TEXT,
  type         TEXT        NOT NULL DEFAULT 'particulier'
                           CHECK (type IN ('particulier','entreprise')),
  notes        TEXT,
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  created_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
--  6. DEVIS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.devis (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id      UUID        REFERENCES public.clients(id) ON DELETE SET NULL,
  numero         TEXT        NOT NULL,
  titre          TEXT,
  statut         TEXT        NOT NULL DEFAULT 'brouillon'
                             CHECK (statut IN ('brouillon','envoye','accepte','refuse','expire')),
  date_devis     DATE        NOT NULL DEFAULT CURRENT_DATE,
  date_validite  DATE,
  montant_ht     NUMERIC(12,2) NOT NULL DEFAULT 0,
  tva_pct        NUMERIC(5,2)  NOT NULL DEFAULT 20,
  montant_ttc    NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes          TEXT,
  lignes         JSONB       NOT NULL DEFAULT '[]',
  created_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
--  7. FACTURES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.factures (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id       UUID        REFERENCES public.clients(id) ON DELETE SET NULL,
  devis_id        UUID        REFERENCES public.devis(id) ON DELETE SET NULL,
  numero          TEXT        NOT NULL,
  titre           TEXT,
  statut          TEXT        NOT NULL DEFAULT 'en_attente'
                              CHECK (statut IN ('en_attente','payee','partiellement_payee','en_retard','annulee')),
  date_facture    DATE        NOT NULL DEFAULT CURRENT_DATE,
  date_echeance   DATE,
  montant_ht      NUMERIC(12,2) NOT NULL DEFAULT 0,
  tva_pct         NUMERIC(5,2)  NOT NULL DEFAULT 20,
  montant_ttc     NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_paye    NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  lignes          JSONB       NOT NULL DEFAULT '[]',
  created_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
--  8. CHANTIERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.chantiers (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id     UUID        REFERENCES public.clients(id) ON DELETE SET NULL,
  nom           TEXT        NOT NULL,
  description   TEXT,
  adresse       TEXT,
  statut        TEXT        NOT NULL DEFAULT 'planifie'
                            CHECK (statut IN ('planifie','en_cours','termine','suspendu','annule')),
  date_debut    DATE,
  date_fin      DATE,
  budget        NUMERIC(12,2) NOT NULL DEFAULT 0,
  avancement    INTEGER     NOT NULL DEFAULT 0 CHECK (avancement BETWEEN 0 AND 100),
  chef_chantier TEXT,
  notes         TEXT,
  created_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
--  9. FOURNISSEURS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.fournisseurs (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nom         TEXT        NOT NULL,
  contact     TEXT,
  email       TEXT,
  telephone   TEXT,
  adresse     TEXT,
  ville       TEXT,
  ice         TEXT,
  categorie   TEXT,
  notes       TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
--  10. MATERIAUX
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.materiaux (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  fournisseur_id UUID        REFERENCES public.fournisseurs(id) ON DELETE SET NULL,
  nom            TEXT        NOT NULL,
  reference      TEXT,
  unite          TEXT        NOT NULL DEFAULT 'unité',
  prix_unitaire  NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock          NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_min      NUMERIC(10,2) NOT NULL DEFAULT 0,
  categorie      TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
--  TABLES FAMILY CASHFLOW
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
--  11. FAMILLE_COMPTES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.famille_comptes (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom        TEXT        NOT NULL,
  type       TEXT        NOT NULL DEFAULT 'courant'
                         CHECK (type IN ('courant','epargne','credit','cash')),
  solde      NUMERIC(12,2) NOT NULL DEFAULT 0,
  couleur    TEXT        NOT NULL DEFAULT '#6366f1',
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
--  12. FAMILLE_TRANSACTIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.famille_transactions (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  compte_id   UUID        REFERENCES public.famille_comptes(id) ON DELETE SET NULL,
  type        TEXT        NOT NULL DEFAULT 'depense'
                          CHECK (type IN ('revenu','depense','transfert')),
  categorie   TEXT,
  montant     NUMERIC(12,2) NOT NULL,
  description TEXT,
  date_trans  DATE        NOT NULL DEFAULT CURRENT_DATE,
  recurrent   BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
--  TABLES CALCPEINTURE PRO
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
--  13. CALCUL_PROJETS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.calcul_projets (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom          TEXT        NOT NULL,
  client       TEXT,
  adresse      TEXT,
  statut       TEXT        NOT NULL DEFAULT 'en_cours',
  surfaces     JSONB       NOT NULL DEFAULT '[]',
  total_m2     NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_litres NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_prix   NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.companies            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devis                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factures             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chantiers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fournisseurs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiaux            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.famille_comptes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.famille_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calcul_projets       ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
--  FONCTIONS HELPER
-- ═══════════════════════════════════════════════════════════════

-- Rôle de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM public.platform_users WHERE id = auth.uid() LIMIT 1;
$$;

-- company_id de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.get_user_company()
RETURNS UUID
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT company_id FROM public.platform_users WHERE id = auth.uid() LIMIT 1;
$$;

-- ═══════════════════════════════════════════════════════════════
--  POLICIES RLS
-- ═══════════════════════════════════════════════════════════════

-- ── companies ────────────────────────────────────────────────
CREATE POLICY companies_select ON public.companies
  FOR SELECT USING (
    get_user_role() = 'superadmin'
    OR id = get_user_company()
  );

CREATE POLICY companies_insert ON public.companies
  FOR INSERT WITH CHECK (get_user_role() = 'superadmin');

CREATE POLICY companies_update ON public.companies
  FOR UPDATE USING (get_user_role() = 'superadmin');

CREATE POLICY companies_delete ON public.companies
  FOR DELETE USING (get_user_role() = 'superadmin');

-- ── platform_users ────────────────────────────────────────────
CREATE POLICY pusers_select ON public.platform_users
  FOR SELECT USING (
    get_user_role() = 'superadmin'
    OR id = auth.uid()
    OR (get_user_role() = 'admin' AND company_id = get_user_company())
  );

CREATE POLICY pusers_insert ON public.platform_users
  FOR INSERT WITH CHECK (get_user_role() = 'superadmin');

CREATE POLICY pusers_update ON public.platform_users
  FOR UPDATE USING (
    get_user_role() = 'superadmin'
    OR id = auth.uid()
  );

CREATE POLICY pusers_delete ON public.platform_users
  FOR DELETE USING (get_user_role() = 'superadmin');

-- ── profiles ──────────────────────────────────────────────────
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT USING (
    get_user_role() = 'superadmin'
    OR id = auth.uid()
    OR (get_user_role() = 'admin' AND company_id = get_user_company())
  );

CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT WITH CHECK (
    get_user_role() = 'superadmin'
    OR id = auth.uid()
  );

CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE USING (
    get_user_role() = 'superadmin'
    OR id = auth.uid()
  );

-- ── clients / devis / factures / chantiers / fournisseurs / materiaux ──
CREATE POLICY clients_policy ON public.clients FOR ALL
  USING (get_user_role() = 'superadmin' OR company_id = get_user_company())
  WITH CHECK (get_user_role() = 'superadmin' OR company_id = get_user_company());

CREATE POLICY devis_policy ON public.devis FOR ALL
  USING (get_user_role() = 'superadmin' OR company_id = get_user_company())
  WITH CHECK (get_user_role() = 'superadmin' OR company_id = get_user_company());

CREATE POLICY factures_policy ON public.factures FOR ALL
  USING (get_user_role() = 'superadmin' OR company_id = get_user_company())
  WITH CHECK (get_user_role() = 'superadmin' OR company_id = get_user_company());

CREATE POLICY chantiers_policy ON public.chantiers FOR ALL
  USING (get_user_role() = 'superadmin' OR company_id = get_user_company())
  WITH CHECK (get_user_role() = 'superadmin' OR company_id = get_user_company());

CREATE POLICY fournisseurs_policy ON public.fournisseurs FOR ALL
  USING (get_user_role() = 'superadmin' OR company_id = get_user_company())
  WITH CHECK (get_user_role() = 'superadmin' OR company_id = get_user_company());

CREATE POLICY materiaux_policy ON public.materiaux FOR ALL
  USING (get_user_role() = 'superadmin' OR company_id = get_user_company())
  WITH CHECK (get_user_role() = 'superadmin' OR company_id = get_user_company());

-- ── audit_logs ────────────────────────────────────────────────
CREATE POLICY audit_insert ON public.audit_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY audit_select ON public.audit_logs
  FOR SELECT USING (
    get_user_role() = 'superadmin'
    OR user_id = auth.uid()
  );

-- ── famille_comptes ───────────────────────────────────────────
CREATE POLICY fcomptes_policy ON public.famille_comptes FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── famille_transactions ──────────────────────────────────────
CREATE POLICY ftrans_policy ON public.famille_transactions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── calcul_projets ────────────────────────────────────────────
CREATE POLICY calcul_policy ON public.calcul_projets FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
--  FONCTIONS TRIGGER
-- ═══════════════════════════════════════════════════════════════

-- Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Sync platform_users → profiles (automatique)
CREATE OR REPLACE FUNCTION public.sync_platform_to_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, full_name, role, company_id,
    plan, is_active, module_permissions, updated_at
  )
  VALUES (
    NEW.id, NEW.email, NEW.full_name, NEW.role,
    NEW.company_id, NEW.plan, NEW.is_active,
    NEW.module_permissions, NOW()
  )
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
$$;

-- Création automatique du profil lors d'un nouveau auth.user
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.platform_users (
    id, email, full_name, role,
    is_active, created_at, updated_at
  )
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
$$;

-- ═══════════════════════════════════════════════════════════════
--  TRIGGERS
-- ═══════════════════════════════════════════════════════════════

-- updated_at sur toutes les tables concernées
CREATE TRIGGER trg_updated_at_companies
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_updated_at_platform_users
  BEFORE UPDATE ON public.platform_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_updated_at_clients
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_updated_at_devis
  BEFORE UPDATE ON public.devis
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_updated_at_factures
  BEFORE UPDATE ON public.factures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_updated_at_chantiers
  BEFORE UPDATE ON public.chantiers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_updated_at_fournisseurs
  BEFORE UPDATE ON public.fournisseurs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_updated_at_materiaux
  BEFORE UPDATE ON public.materiaux
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_updated_at_calcul_projets
  BEFORE UPDATE ON public.calcul_projets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sync platform_users → profiles
CREATE TRIGGER trg_sync_platform_to_profiles
  AFTER INSERT OR UPDATE ON public.platform_users
  FOR EACH ROW EXECUTE FUNCTION public.sync_platform_to_profiles();

-- Nouveau auth.user → platform_users
CREATE TRIGGER trg_new_auth_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ═══════════════════════════════════════════════════════════════
--  INDEXES
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX idx_platform_users_company  ON public.platform_users(company_id);
CREATE INDEX idx_platform_users_email    ON public.platform_users(email);
CREATE INDEX idx_platform_users_role     ON public.platform_users(role);
CREATE INDEX idx_profiles_company        ON public.profiles(company_id);
CREATE INDEX idx_clients_company         ON public.clients(company_id);
CREATE INDEX idx_devis_company           ON public.devis(company_id);
CREATE INDEX idx_devis_client            ON public.devis(client_id);
CREATE INDEX idx_factures_company        ON public.factures(company_id);
CREATE INDEX idx_factures_client         ON public.factures(client_id);
CREATE INDEX idx_chantiers_company       ON public.chantiers(company_id);
CREATE INDEX idx_fournisseurs_company    ON public.fournisseurs(company_id);
CREATE INDEX idx_materiaux_company       ON public.materiaux(company_id);
CREATE INDEX idx_audit_user              ON public.audit_logs(user_id);
CREATE INDEX idx_audit_created           ON public.audit_logs(created_at DESC);
CREATE INDEX idx_ftrans_user             ON public.famille_transactions(user_id);
CREATE INDEX idx_calcul_user             ON public.calcul_projets(user_id);

-- ═══════════════════════════════════════════════════════════════
--  DONNÉES INITIALES
-- ═══════════════════════════════════════════════════════════════

-- Entreprise démo GestApp BTP
INSERT INTO public.companies (
  id, name, ice, city, plan, status, max_users, subscription_end
) VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Société Démo BTP',
  '000000000000000',
  'Casablanca',
  'pro',
  'active',
  10,
  NOW() + INTERVAL '1 year'
);

-- ═══════════════════════════════════════════════════════════════
--  VÉRIFICATION FINALE
-- ═══════════════════════════════════════════════════════════════
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_active
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
