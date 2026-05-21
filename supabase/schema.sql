-- =====================================================
-- Chan-Pro Platform — Script SQL complet Supabase
-- Version 3.0 — Toutes les tables pour les 3 apps
-- =====================================================
-- Instructions :
-- 1. Aller sur https://app.supabase.com
-- 2. Ouvrir votre projet
-- 3. SQL Editor → Nouveau query
-- 4. Coller TOUT ce script et exécuter
-- =====================================================

-- Activer UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PARTIE 1 : FAMILY CASH FLOW (famille.chan-pro.com)
-- =====================================================

-- Profils utilisateurs
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  currency TEXT DEFAULT 'MAD',
  language TEXT DEFAULT 'fr',
  theme TEXT DEFAULT 'light',
  family_id UUID,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin','member','viewer')),
  onboarding_done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Espaces familiaux
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  invitation_code TEXT UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 8)),
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions (revenus + dépenses)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  family_id UUID REFERENCES families(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  date DATE NOT NULL,
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash','card','transfer','cheque','other')),
  tags TEXT[],
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Abonnements récurrents
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  family_id UUID REFERENCES families(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'other',
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  frequency TEXT DEFAULT 'monthly' CHECK (frequency IN ('weekly','monthly','quarterly','annually')),
  next_date DATE,
  start_date DATE DEFAULT CURRENT_DATE,
  active BOOLEAN DEFAULT TRUE,
  auto_debit BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crédits / Dettes
CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  family_id UUID REFERENCES families(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'personal' CHECK (type IN ('personal','mortgage','car','business','education','other')),
  lender TEXT,
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
  monthly_payment NUMERIC(10,2) NOT NULL CHECK (monthly_payment > 0),
  interest_rate NUMERIC(5,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  months_total INTEGER,
  months_paid INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','paused')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budgets mensuels
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  family_id UUID REFERENCES families(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category, month, year)
);

-- Objectifs d'épargne
CREATE TABLE IF NOT EXISTS savings_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  family_id UUID REFERENCES families(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(12,2) DEFAULT 0,
  target_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','paused')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PARTIE 2 : CALCPEINTUREPRO (calcul.chan-pro.com)
-- =====================================================

-- Produits peinture
CREATE TABLE IF NOT EXISTS paint_produits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  marque TEXT NOT NULL,
  nom TEXT NOT NULL,
  type TEXT CHECK (type IN ('Primaire','Enduit','Finition')),
  unite TEXT CHECK (unite IN ('L','kg')),
  rendement NUMERIC(8,2) NOT NULL CHECK (rendement > 0),
  rend_unite TEXT,
  density NUMERIC(6,3),
  pertes NUMERIC(5,2) DEFAULT 5,
  packs JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Systèmes de peinture
CREATE TABLE IF NOT EXISTS paint_systemes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nom TEXT NOT NULL,
  type TEXT CHECK (type IN ('INT','EXT')),
  support TEXT,
  pertes NUMERIC(5,2) DEFAULT 0,
  desc TEXT,
  steps JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historique devis
CREATE TABLE IF NOT EXISTS paint_historique (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  projet TEXT NOT NULL,
  client TEXT,
  systeme_id UUID REFERENCES paint_systemes(id) ON DELETE SET NULL,
  systeme_name TEXT,
  surface NUMERIC(10,2),
  type TEXT CHECK (type IN ('four_pose','fourniture')),
  marge NUMERIC(5,2) DEFAULT 0,
  tva NUMERIC(5,2) DEFAULT 20,
  total_ht NUMERIC(12,2),
  total_ttc NUMERIC(12,2),
  prix_m2 NUMERIC(8,2),
  status TEXT DEFAULT 'en_cours' CHECK (status IN ('en_cours','valide','annule','facture')),
  details JSONB,
  date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PARTIE 3 : GESTAPP (gestapp.chan-pro.com) — SAAS B2B
-- =====================================================

-- Organisations (clients SaaS)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'MA',
  industry TEXT,
  size_range TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free','starter','pro','enterprise')),
  plan_expires_at TIMESTAMPTZ,
  owner_id UUID REFERENCES auth.users(id),
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Membres d'organisation
CREATE TABLE IF NOT EXISTS org_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner','admin','member','viewer')),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE paint_produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE paint_systemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE paint_historique ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- Policies Profiles
CREATE POLICY "profiles_own" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Policies Transactions
CREATE POLICY "transactions_own" ON transactions
  FOR ALL USING (auth.uid() = user_id);

-- Policies Subscriptions
CREATE POLICY "subscriptions_own" ON subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Policies Loans
CREATE POLICY "loans_own" ON loans
  FOR ALL USING (auth.uid() = user_id);

-- Policies Budgets
CREATE POLICY "budgets_own" ON budgets
  FOR ALL USING (auth.uid() = user_id);

-- Policies Savings Goals
CREATE POLICY "goals_own" ON savings_goals
  FOR ALL USING (auth.uid() = user_id);

-- Policies Families
CREATE POLICY "families_owner" ON families
  FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "families_member_read" ON families
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM profiles WHERE family_id = families.id)
  );

-- Policies Paint Produits
CREATE POLICY "paint_produits_own" ON paint_produits
  FOR ALL USING (auth.uid() = user_id);

-- Policies Paint Systèmes
CREATE POLICY "paint_systemes_own" ON paint_systemes
  FOR ALL USING (auth.uid() = user_id);

-- Policies Paint Historique
CREATE POLICY "paint_historique_own" ON paint_historique
  FOR ALL USING (auth.uid() = user_id);

-- Policies Organizations
CREATE POLICY "orgs_owner" ON organizations
  FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "orgs_member_read" ON organizations
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM org_members WHERE org_id = organizations.id)
  );

-- Policies Org Members
CREATE POLICY "org_members_own" ON org_members
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS : updated_at automatique
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_transactions_updated
  BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_paint_produits_updated
  BEFORE UPDATE ON paint_produits FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_paint_systemes_updated
  BEFORE UPDATE ON paint_systemes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- TRIGGER : créer le profil automatiquement
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- INDEX pour les performances
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_family ON transactions(family_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type, category);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_user ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_paint_produits_user ON paint_produits(user_id);
CREATE INDEX IF NOT EXISTS idx_paint_systemes_user ON paint_systemes(user_id);
CREATE INDEX IF NOT EXISTS idx_paint_historique_user ON paint_historique(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members(org_id);

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================
-- ✅ Exécution terminée !
-- Vérifiez l'onglet "Table Editor" dans Supabase
-- pour confirmer que toutes les tables ont été créées.
-- =====================================================
