-- ============================================================
--  DIGITAL-PRO — Script SQL Définitif v2.0
--  Exécuter UNE SEULE FOIS dans Supabase SQL Editor :
--  https://supabase.com/dashboard/project/mfyhktnzjodaqfocupcn/sql/new
--
--  Ce script :
--  1. Crée les tables manquantes
--  2. Ajoute les colonnes manquantes (idempotent)
--  3. Confirme tous les emails non confirmés
--  4. Crée/répare le profil superadmin
--  5. Configure le RLS proprement (sans récursion)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 1 : CRÉER LES TABLES DE BASE
-- ────────────────────────────────────────────────────────────

-- Table des utilisateurs de la plateforme (1 ligne par compte auth)
CREATE TABLE IF NOT EXISTS public.platform_users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'admin'
              CHECK (role IN ('superadmin','admin','manager','commercial','technicien','lecture')),
  app_access  TEXT[] DEFAULT ARRAY['gestapp'],
  gestapp_role TEXT,
  company_id  UUID,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des sociétés (pour gestapp212)
CREATE TABLE IF NOT EXISTS public.companies (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'actif' CHECK (status IN ('actif','suspendu','bloque')),
  plan             TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','pro','enterprise')),
  city             TEXT,
  phone            TEXT,
  address          TEXT,
  logo_url         TEXT,
  subscription_end TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des profils utilisateurs gestapp (liée à auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  full_name  TEXT,
  name       TEXT,
  role       TEXT NOT NULL DEFAULT 'commercial'
             CHECK (role IN ('superadmin','admin','manager','commercial','comptable','technicien','lecture')),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  avatar     TEXT,
  phone      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tables métier gestapp
CREATE TABLE IF NOT EXISTS public.clients (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nom        TEXT NOT NULL,
  prenom     TEXT,
  email      TEXT,
  telephone  TEXT,
  adresse    TEXT,
  ville      TEXT,
  type_client TEXT DEFAULT 'particulier',
  contacts   JSONB DEFAULT '[]',
  identifiant_fiscal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.devis (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id     UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_nom    TEXT,
  numero        TEXT,
  date_devis    DATE,
  date_validite DATE,
  statut        TEXT DEFAULT 'brouillon',
  total_ht      NUMERIC(12,2) DEFAULT 0,
  total_tva     NUMERIC(12,2) DEFAULT 0,
  total_ttc     NUMERIC(12,2) DEFAULT 0,
  lignes        JSONB DEFAULT '[]',
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.factures (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id      UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_nom     TEXT,
  numero         TEXT,
  date_facture   DATE,
  date_echeance  DATE,
  statut         TEXT DEFAULT 'brouillon',
  total_ht       NUMERIC(12,2) DEFAULT 0,
  total_tva      NUMERIC(12,2) DEFAULT 0,
  total_ttc      NUMERIC(12,2) DEFAULT 0,
  montant_paye   NUMERIC(12,2) DEFAULT 0,
  reste_a_payer  NUMERIC(12,2) DEFAULT 0,
  lignes         JSONB DEFAULT '[]',
  paiements      JSONB DEFAULT '[]',
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.paiements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id    UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_nom   TEXT,
  facture_id   UUID REFERENCES public.factures(id) ON DELETE SET NULL,
  date_paiement DATE,
  montant      NUMERIC(12,2) DEFAULT 0,
  mode         TEXT DEFAULT 'virement',
  reference    TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chantiers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id    UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_nom   TEXT,
  nom          TEXT NOT NULL,
  adresse      TEXT,
  statut       TEXT DEFAULT 'en_cours',
  date_debut   DATE,
  date_fin     DATE,
  budget       NUMERIC(12,2) DEFAULT 0,
  budget_reel  NUMERIC(12,2) DEFAULT 0,
  employes     JSONB DEFAULT '[]',
  prestataires JSONB DEFAULT '[]',
  achats       JSONB DEFAULT '[]',
  journal      JSONB DEFAULT '[]',
  photos       JSONB DEFAULT '[]',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nom           TEXT NOT NULL,
  reference     TEXT,
  categorie     TEXT,
  quantite      NUMERIC(12,2) DEFAULT 0,
  prix_unitaire NUMERIC(12,2) DEFAULT 0,
  seuil_alerte  NUMERIC(12,2) DEFAULT 0,
  mouvements    JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fournisseurs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nom        TEXT NOT NULL,
  contact    TEXT,
  email      TEXT,
  telephone  TEXT,
  adresse    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.garanties (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id     UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_nom    TEXT,
  chantier_id   UUID REFERENCES public.chantiers(id) ON DELETE SET NULL,
  chantier_nom  TEXT,
  type_travaux  TEXT,
  type_garantie TEXT DEFAULT 'autre',
  date_debut    DATE,
  date_fin      DATE,
  duree_mois    INTEGER DEFAULT 24,
  statut        TEXT DEFAULT 'actif',
  interventions JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reclamations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id   UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_nom  TEXT,
  chantier_id UUID REFERENCES public.chantiers(id) ON DELETE SET NULL,
  chantier_nom TEXT,
  description TEXT,
  priorite    TEXT DEFAULT 'moyenne',
  statut      TEXT DEFAULT 'ouvert',
  solution    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.taches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  titre       TEXT NOT NULL,
  description TEXT,
  module_lie  TEXT DEFAULT 'autre',
  assigne     TEXT,
  echeance    DATE,
  statut      TEXT DEFAULT 'en_attente',
  priorite    TEXT DEFAULT 'normale',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agenda (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  titre       TEXT NOT NULL,
  description TEXT,
  type_event  TEXT DEFAULT 'reunion',
  date_debut  TIMESTAMPTZ,
  date_fin    TIMESTAMPTZ,
  lieu        TEXT,
  participants TEXT[],
  client_id   UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_nom  TEXT,
  couleur     TEXT DEFAULT '#2980b9',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pipeline (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nom          TEXT NOT NULL,
  client_id    UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_nom   TEXT,
  etape        TEXT DEFAULT 'prospect',
  valeur       NUMERIC(12,2) DEFAULT 0,
  probabilite  INTEGER DEFAULT 50,
  date_cloture DATE,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.galerie (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  chantier_id UUID REFERENCES public.chantiers(id) ON DELETE CASCADE,
  url         TEXT,
  nom         TEXT,
  description TEXT,
  type_media  TEXT DEFAULT 'photo',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name  TEXT,
  action     TEXT,
  detail     TEXT,
  module     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 2 : AJOUTER LES COLONNES MANQUANTES (idempotent)
-- ────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- platform_users
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='platform_users' AND column_name='app_access') THEN
    ALTER TABLE public.platform_users ADD COLUMN app_access TEXT[] DEFAULT ARRAY['gestapp'];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='platform_users' AND column_name='gestapp_role') THEN
    ALTER TABLE public.platform_users ADD COLUMN gestapp_role TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='platform_users' AND column_name='company_id') THEN
    ALTER TABLE public.platform_users ADD COLUMN company_id UUID;
  END IF;

  -- profiles
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='company_id') THEN
    ALTER TABLE public.profiles ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='avatar') THEN
    ALTER TABLE public.profiles ADD COLUMN avatar TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='phone') THEN
    ALTER TABLE public.profiles ADD COLUMN phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='name') THEN
    ALTER TABLE public.profiles ADD COLUMN name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='full_name') THEN
    ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
  END IF;

  -- companies
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='city') THEN
    ALTER TABLE public.companies ADD COLUMN city TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='phone') THEN
    ALTER TABLE public.companies ADD COLUMN phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='address') THEN
    ALTER TABLE public.companies ADD COLUMN address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='logo_url') THEN
    ALTER TABLE public.companies ADD COLUMN logo_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='subscription_end') THEN
    ALTER TABLE public.companies ADD COLUMN subscription_end TIMESTAMPTZ;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 3 : CONFIRMER LES EMAILS NON CONFIRMÉS
-- ────────────────────────────────────────────────────────────

-- Note: confirmed_at est une colonne générée, on ne met à jour que email_confirmed_at
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    updated_at = NOW()
WHERE email_confirmed_at IS NULL
  AND deleted_at IS NULL;

-- Activer tous les comptes platform_users
UPDATE public.platform_users
SET is_active = true, updated_at = NOW()
WHERE is_active = false OR is_active IS NULL;

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 4 : FONCTIONS RLS ANTI-RÉCURSION
-- ────────────────────────────────────────────────────────────

-- Ces fonctions SECURITY DEFINER contournent le RLS pour lire
-- le rôle de l'utilisateur courant sans déclencher de récursion.

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role()       TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_company_id() TO authenticated, anon, service_role;

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 5 : ACTIVER RLS ET DÉFINIR LES POLITIQUES
-- ────────────────────────────────────────────────────────────

-- Activer RLS sur toutes les tables
ALTER TABLE public.platform_users  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devis           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factures        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paiements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chantiers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fournisseurs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garanties       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reclamations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taches          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galerie         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs      ENABLE ROW LEVEL SECURITY;

-- ── Supprimer les anciennes politiques ──
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('platform_users','profiles','companies','clients','devis',
                        'factures','paiements','chantiers','stock','fournisseurs',
                        'garanties','reclamations','taches','agenda','pipeline',
                        'galerie','audit_logs')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ── PLATFORM_USERS ──
CREATE POLICY "platform_users_select_own"
  ON public.platform_users FOR SELECT TO authenticated
  USING (id = auth.uid() OR get_my_role() = 'superadmin');

CREATE POLICY "platform_users_insert_superadmin"
  ON public.platform_users FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'superadmin');

CREATE POLICY "platform_users_update_superadmin"
  ON public.platform_users FOR UPDATE TO authenticated
  USING (get_my_role() = 'superadmin')
  WITH CHECK (get_my_role() = 'superadmin');

CREATE POLICY "platform_users_delete_superadmin"
  ON public.platform_users FOR DELETE TO authenticated
  USING (get_my_role() = 'superadmin');

CREATE POLICY "platform_users_service_role"
  ON public.platform_users FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── PROFILES ──
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid() OR
    get_my_role() = 'superadmin' OR
    (company_id IS NOT NULL AND company_id = get_my_company_id() AND get_my_role() IN ('admin','manager','commercial','technicien'))
  );

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR get_my_role() IN ('superadmin','admin'));

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR get_my_role() IN ('superadmin','admin'));

CREATE POLICY "profiles_delete_superadmin"
  ON public.profiles FOR DELETE TO authenticated
  USING (get_my_role() = 'superadmin');

CREATE POLICY "profiles_service_role"
  ON public.profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── COMPANIES ──
CREATE POLICY "companies_select"
  ON public.companies FOR SELECT TO authenticated
  USING (get_my_role() = 'superadmin' OR id = get_my_company_id());

CREATE POLICY "companies_insert_superadmin"
  ON public.companies FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('superadmin','admin'));

CREATE POLICY "companies_update"
  ON public.companies FOR UPDATE TO authenticated
  USING (get_my_role() = 'superadmin' OR (id = get_my_company_id() AND get_my_role() = 'admin'));

CREATE POLICY "companies_delete_superadmin"
  ON public.companies FOR DELETE TO authenticated
  USING (get_my_role() = 'superadmin');

CREATE POLICY "companies_service_role"
  ON public.companies FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── TABLES MÉTIER (clients, devis, factures, etc.) ──
-- Politique commune : superadmin voit tout, admin/users voient leur société
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['clients','devis','factures','paiements','chantiers',
                              'stock','fournisseurs','garanties','reclamations',
                              'taches','agenda','pipeline','galerie']
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated
       USING (get_my_role() = ''superadmin'' OR company_id = get_my_company_id())
       WITH CHECK (get_my_role() = ''superadmin'' OR company_id = get_my_company_id())',
      tbl || '_policy', tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      tbl || '_service', tbl
    );
  END LOOP;
END $$;

-- ── AUDIT_LOGS ──
CREATE POLICY "audit_logs_select"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (get_my_role() = 'superadmin' OR company_id = get_my_company_id());

CREATE POLICY "audit_logs_insert"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "audit_logs_service_role"
  ON public.audit_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 6 : CRÉER / RÉPARER LE SUPERADMIN
-- ────────────────────────────────────────────────────────────

DO $$
DECLARE
  sa_uid UUID;
  sa_email TEXT := 'said.hamdaoui1984@gmail.com';
BEGIN
  -- Récupérer l'UID du superadmin
  SELECT id INTO sa_uid FROM auth.users
  WHERE email = sa_email AND deleted_at IS NULL
  LIMIT 1;

  IF sa_uid IS NULL THEN
    RAISE NOTICE '⚠️  Compte superadmin introuvable. Créez-le manuellement dans Supabase Auth puis relancez ce script.';
  ELSE
    -- Confirmer l'email
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
    WHERE id = sa_uid;

    -- Créer/réparer dans profiles
    INSERT INTO public.profiles (id, email, full_name, name, role, is_active, created_at, updated_at)
    VALUES (sa_uid, sa_email, 'Said Hamdaoui', 'Said Hamdaoui', 'superadmin', true, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      role = 'superadmin', is_active = true, updated_at = NOW(),
      full_name = COALESCE(profiles.full_name, 'Said Hamdaoui'),
      name      = COALESCE(profiles.name, 'Said Hamdaoui');

    -- Créer/réparer dans platform_users
    INSERT INTO public.platform_users (id, email, full_name, role, app_access, is_active, created_at, updated_at)
    VALUES (sa_uid, sa_email, 'Said Hamdaoui', 'superadmin', ARRAY['gestapp','famille','calcul'], true, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      role = 'superadmin', is_active = true,
      app_access = ARRAY['gestapp','famille','calcul'],
      updated_at = NOW();

    RAISE NOTICE '✅ Superadmin % configuré (UID: %)', sa_email, sa_uid;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 7 : SYNCHRONISER PLATFORM_USERS → PROFILES
-- (copie les utilisateurs platform qui existent dans auth.users
--  mais pas encore dans profiles)
-- ────────────────────────────────────────────────────────────

INSERT INTO public.profiles (id, email, full_name, name, role, company_id, is_active, created_at, updated_at)
SELECT
  pu.id,
  pu.email,
  COALESCE(pu.full_name, split_part(pu.email,'@',1)) AS full_name,
  COALESCE(pu.full_name, split_part(pu.email,'@',1)) AS name,
  CASE
    WHEN pu.role = 'superadmin' THEN 'superadmin'
    WHEN pu.role = 'admin'      THEN 'admin'
    WHEN pu.role = 'manager'    THEN 'manager'
    WHEN pu.role = 'commercial' THEN 'commercial'
    WHEN pu.role = 'technicien' THEN 'technicien'
    ELSE 'commercial'
  END AS role,
  pu.company_id,
  COALESCE(pu.is_active, true),
  COALESCE(pu.created_at, NOW()),
  NOW()
FROM public.platform_users pu
-- Seulement si l'ID existe dans auth.users (évite FK violation)
INNER JOIN auth.users au ON au.id = pu.id AND au.deleted_at IS NULL
-- Seulement si pas déjà dans profiles
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = pu.id)
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- VÉRIFICATION FINALE
-- ────────────────────────────────────────────────────────────

SELECT
  au.email,
  au.email_confirmed_at IS NOT NULL AS email_confirme,
  p.role   AS role_profiles,
  pu.role  AS role_platform_users,
  pu.app_access,
  p.is_active
FROM auth.users au
LEFT JOIN public.profiles      p  ON p.id  = au.id
LEFT JOIN public.platform_users pu ON pu.id = au.id
WHERE au.deleted_at IS NULL
ORDER BY au.created_at DESC
LIMIT 20;
