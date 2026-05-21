-- ================================================================
-- CHAN-PRO PLATFORM — Script SQL Supabase COMPLET
-- Projet: mfyhktnzjodaqfocupcn
-- Copiez-collez ce script dans Supabase → SQL Editor → Run
-- ================================================================

-- ─────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- 1. FAMILY CASH FLOW (famille.chan-pro.com)
-- ================================================================

-- Familles
CREATE TABLE IF NOT EXISTS families (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  currency    TEXT DEFAULT 'MAD',
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Membres de famille
CREATE TABLE IF NOT EXISTS family_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id   UUID REFERENCES families(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT CHECK(role IN ('admin','member')) DEFAULT 'member',
  nom         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

-- Profils utilisateurs famille
CREATE TABLE IF NOT EXISTS fcf_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom         TEXT,
  avatar_url  TEXT,
  currency    TEXT DEFAULT 'MAD',
  language    TEXT DEFAULT 'fr',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions (revenus + dépenses)
CREATE TABLE IF NOT EXISTS transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id       UUID REFERENCES families(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type            TEXT CHECK(type IN ('income','expense')) NOT NULL,
  amount          NUMERIC(12,2) NOT NULL CHECK(amount > 0),
  category        TEXT NOT NULL,
  description     TEXT,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method  TEXT DEFAULT 'cash',
  is_recurring    BOOLEAN DEFAULT FALSE,
  recurrence      TEXT,
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Abonnements
CREATE TABLE IF NOT EXISTS subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id       UUID REFERENCES families(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  frequency       TEXT CHECK(frequency IN ('monthly','quarterly','annual','weekly')) DEFAULT 'monthly',
  next_date       DATE,
  category        TEXT DEFAULT 'autre',
  active          BOOLEAN DEFAULT TRUE,
  auto_debit      BOOLEAN DEFAULT FALSE,
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Crédits / Dettes
CREATE TABLE IF NOT EXISTS loans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id       UUID REFERENCES families(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  total_amount    NUMERIC(12,2) NOT NULL,
  monthly_payment NUMERIC(12,2),
  start_date      DATE,
  months_total    INTEGER,
  months_paid     INTEGER DEFAULT 0,
  interest_rate   NUMERIC(5,2) DEFAULT 0,
  lender          TEXT,
  status          TEXT CHECK(status IN ('active','completed','cancelled')) DEFAULT 'active',
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id   UUID REFERENCES families(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL,
  month       INTEGER CHECK(month BETWEEN 1 AND 12),
  year        INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, category, month, year)
);

-- ── RLS Family Cash Flow ──
ALTER TABLE families        ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fcf_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans           ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets         ENABLE ROW LEVEL SECURITY;

-- Politiques (accès par famille)
CREATE POLICY "family_members_access" ON family_members
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "families_access" ON families
  FOR ALL USING (
    id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "transactions_access" ON transactions
  FOR ALL USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "subscriptions_access" ON subscriptions
  FOR ALL USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "loans_access" ON loans
  FOR ALL USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "budgets_access" ON budgets
  FOR ALL USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "profiles_access" ON fcf_profiles
  FOR ALL USING (id = auth.uid());

-- Trigger auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user_fcf()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.fcf_profiles (id, nom)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_fcf ON auth.users;
CREATE TRIGGER on_auth_user_created_fcf
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_fcf();


-- ================================================================
-- 2. GESTIONAPP212 (gestapp.chan-pro.com)
-- ================================================================

-- Profils utilisateurs GestApp
CREATE TABLE IF NOT EXISTS ga_users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom         TEXT,
  email       TEXT,
  role        TEXT CHECK(role IN ('super_admin','admin','commercial','employe')) DEFAULT 'employe',
  avatar_url  TEXT,
  tel         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Sociétés
CREATE TABLE IF NOT EXISTS ga_societes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom         TEXT NOT NULL,
  type        TEXT DEFAULT 'SARL',
  rc          TEXT,
  ice         TEXT,
  if_number   TEXT,
  cnss        TEXT,
  tel         TEXT,
  email       TEXT,
  adresse     TEXT,
  logo_url    TEXT,
  statut      TEXT CHECK(statut IN ('actif','inactif')) DEFAULT 'actif',
  devise_num  TEXT DEFAULT 'DEV-{YYYY}-{NNN}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Membres par société
CREATE TABLE IF NOT EXISTS ga_membres (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  societe_id  UUID REFERENCES ga_societes(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT CHECK(role IN ('admin','commercial','employe')) DEFAULT 'employe',
  actif       BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(societe_id, user_id)
);

-- Chantiers
CREATE TABLE IF NOT EXISTS ga_chantiers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  societe_id      UUID REFERENCES ga_societes(id) ON DELETE CASCADE,
  ref             TEXT NOT NULL,
  nom             TEXT NOT NULL,
  client          TEXT NOT NULL,
  type            TEXT DEFAULT 'Résidentiel',
  statut          TEXT CHECK(statut IN ('en_attente','en_cours','termine','annule')) DEFAULT 'en_attente',
  avancement      INTEGER DEFAULT 0 CHECK(avancement BETWEEN 0 AND 100),
  budget          NUMERIC(14,2) DEFAULT 0,
  depense         NUMERIC(14,2) DEFAULT 0,
  date_debut      DATE,
  date_fin_prevue DATE,
  date_fin_reelle DATE,
  chef            TEXT,
  adresse         TEXT,
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Devis
CREATE TABLE IF NOT EXISTS ga_devis (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  societe_id  UUID REFERENCES ga_societes(id) ON DELETE CASCADE,
  chantier_id UUID REFERENCES ga_chantiers(id) ON DELETE SET NULL,
  ref         TEXT NOT NULL,
  client      TEXT NOT NULL,
  objet       TEXT,
  montant     NUMERIC(14,2) DEFAULT 0,
  statut      TEXT CHECK(statut IN ('brouillon','envoye','valide','paye','annule')) DEFAULT 'brouillon',
  date        DATE DEFAULT CURRENT_DATE,
  validite    DATE,
  note        TEXT,
  lignes      JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Factures
CREATE TABLE IF NOT EXISTS ga_factures (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  societe_id  UUID REFERENCES ga_societes(id) ON DELETE CASCADE,
  devis_id    UUID REFERENCES ga_devis(id) ON DELETE SET NULL,
  chantier_id UUID REFERENCES ga_chantiers(id) ON DELETE SET NULL,
  ref         TEXT NOT NULL,
  client      TEXT NOT NULL,
  montant     NUMERIC(14,2) DEFAULT 0,
  paye        NUMERIC(14,2) DEFAULT 0,
  statut      TEXT CHECK(statut IN ('brouillon','envoye','paye','partiel','impaye','annule')) DEFAULT 'brouillon',
  date        DATE DEFAULT CURRENT_DATE,
  echeance    DATE,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Employés
CREATE TABLE IF NOT EXISTS ga_employes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  societe_id  UUID REFERENCES ga_societes(id) ON DELETE CASCADE,
  nom         TEXT NOT NULL,
  poste       TEXT,
  salaire     NUMERIC(10,2) DEFAULT 0,
  tel         TEXT,
  email       TEXT,
  date_debut  DATE,
  statut      TEXT CHECK(statut IN ('actif','inactif')) DEFAULT 'actif',
  chantier_id UUID REFERENCES ga_chantiers(id) ON DELETE SET NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Mouvements financiers
CREATE TABLE IF NOT EXISTS ga_mouvements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  societe_id  UUID REFERENCES ga_societes(id) ON DELETE CASCADE,
  chantier_id UUID REFERENCES ga_chantiers(id) ON DELETE SET NULL,
  type        TEXT CHECK(type IN ('entree','sortie')) NOT NULL,
  libelle     TEXT NOT NULL,
  montant     NUMERIC(14,2) NOT NULL CHECK(montant > 0),
  categorie   TEXT,
  date        DATE DEFAULT CURRENT_DATE,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS GestionApp ──
ALTER TABLE ga_users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga_societes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga_membres    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga_chantiers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga_devis      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga_factures   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga_employes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga_mouvements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ga_users_own" ON ga_users
  FOR ALL USING (id = auth.uid());

CREATE POLICY "ga_membres_access" ON ga_membres
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "ga_societes_access" ON ga_societes
  FOR ALL USING (
    id IN (SELECT societe_id FROM ga_membres WHERE user_id = auth.uid())
  );

CREATE POLICY "ga_chantiers_access" ON ga_chantiers
  FOR ALL USING (
    societe_id IN (SELECT societe_id FROM ga_membres WHERE user_id = auth.uid())
  );

CREATE POLICY "ga_devis_access" ON ga_devis
  FOR ALL USING (
    societe_id IN (SELECT societe_id FROM ga_membres WHERE user_id = auth.uid())
  );

CREATE POLICY "ga_factures_access" ON ga_factures
  FOR ALL USING (
    societe_id IN (SELECT societe_id FROM ga_membres WHERE user_id = auth.uid())
  );

CREATE POLICY "ga_employes_access" ON ga_employes
  FOR ALL USING (
    societe_id IN (SELECT societe_id FROM ga_membres WHERE user_id = auth.uid())
  );

CREATE POLICY "ga_mouvements_access" ON ga_mouvements
  FOR ALL USING (
    societe_id IN (SELECT societe_id FROM ga_membres WHERE user_id = auth.uid())
  );

-- Trigger auto-profile GestApp
CREATE OR REPLACE FUNCTION public.handle_new_user_ga()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.ga_users (id, nom, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_ga ON auth.users;
CREATE TRIGGER on_auth_user_created_ga
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_ga();


-- ================================================================
-- 3. CALCPEINTUREPRO (calcul.chan-pro.com)
-- ================================================================

-- Profils utilisateurs CalcPro
CREATE TABLE IF NOT EXISTS cp_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom         TEXT,
  societe     TEXT,
  tel         TEXT,
  email       TEXT,
  logo_url    TEXT,
  adresse     TEXT,
  ice         TEXT,
  pdf_hide_internal BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Produits peinture
CREATE TABLE IF NOT EXISTS cp_produits (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  marque      TEXT NOT NULL,
  nom         TEXT NOT NULL,
  type        TEXT CHECK(type IN ('Primaire','Enduit','Finition')) NOT NULL,
  unite       TEXT CHECK(unite IN ('L','kg')) NOT NULL,
  rendement   NUMERIC(8,3) NOT NULL,
  rend_unite  TEXT,
  density     NUMERIC(6,3),
  pertes      NUMERIC(5,2) DEFAULT 5,
  emballages  JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Systèmes de peinture
CREATE TABLE IF NOT EXISTS cp_systemes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nom         TEXT NOT NULL,
  type        TEXT CHECK(type IN ('INT','EXT')),
  support     TEXT,
  pertes      NUMERIC(5,2) DEFAULT 0,
  description TEXT,
  etapes      JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Historique calculs / devis
CREATE TABLE IF NOT EXISTS cp_historique (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  systeme_id  UUID REFERENCES cp_systemes(id) ON DELETE SET NULL,
  projet      TEXT,
  client      TEXT,
  surface     NUMERIC(10,2),
  type_devis  TEXT DEFAULT 'four_pose',
  pertes      NUMERIC(5,2),
  mo_mode     TEXT DEFAULT 'global',
  mo_global   NUMERIC(8,2),
  marge       NUMERIC(5,2),
  tva         NUMERIC(5,2),
  pack_mode   TEXT DEFAULT 'least_packs',
  cout_matiere NUMERIC(14,2),
  cout_mo     NUMERIC(14,2),
  total_ht    NUMERIC(14,2),
  total_ttc   NUMERIC(14,2),
  details     JSONB DEFAULT '[]',
  statut      TEXT CHECK(statut IN ('en_cours','valide','annule','facture')) DEFAULT 'en_cours',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS CalcPeinturePro ──
ALTER TABLE cp_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_produits   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_systemes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_historique ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cp_profiles_own"   ON cp_profiles   FOR ALL USING (id = auth.uid());
CREATE POLICY "cp_produits_own"   ON cp_produits   FOR ALL USING (user_id = auth.uid());
CREATE POLICY "cp_systemes_own"   ON cp_systemes   FOR ALL USING (user_id = auth.uid());
CREATE POLICY "cp_historique_own" ON cp_historique FOR ALL USING (user_id = auth.uid());

-- Trigger auto-profile CalcPro
CREATE OR REPLACE FUNCTION public.handle_new_user_cp()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.cp_profiles (id, nom, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_cp ON auth.users;
CREATE TRIGGER on_auth_user_created_cp
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_cp();

-- ================================================================
-- FIN — Script exécuté avec succès !
-- ================================================================
SELECT 'Chan-Pro Platform — Base de données initialisée ✅' AS status;
