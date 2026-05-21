-- ============================================================
-- DIGITAL-PRO PLATFORM — Supabase SQL Complet v6.0
-- Exécuter dans : https://supabase.com/dashboard/project/mfyhktnzjodaqfocupcn/sql/new
-- 
-- Architecture :
--   platform_users  → tous les utilisateurs (superadmin, admins, users)
--   companies       → une ligne par abonnement (lié à une app)
--   gestapp_profiles → profils GestApp BTP
--   famille_profiles → profils Family CashFlow  
--   calcul_profiles  → profils CalcPeinture Pro
-- ============================================================

-- ══════════════════════════════════════════════════════════
-- 1. TABLE PLATFORM_USERS (centrale — tous les utilisateurs)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.platform_users (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT        NOT NULL,
  full_name       TEXT        NOT NULL DEFAULT '',
  role            TEXT        NOT NULL DEFAULT 'user'
                              CHECK (role IN ('superadmin','admin','user')),
  app_id          TEXT        NOT NULL DEFAULT 'gestapp'
                              CHECK (app_id IN ('gestapp','famille','calcul','all')),
  company_id      UUID        REFERENCES public.companies(id) ON DELETE SET NULL,
  plan            TEXT        NOT NULL DEFAULT 'starter'
                              CHECK (plan IN ('starter','pro','business','enterprise')),
  max_users       INTEGER     NOT NULL DEFAULT 3,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  module_permissions JSONB    DEFAULT '{}'::jsonb,
  can_add_users   BOOLEAN     NOT NULL DEFAULT false,
  subscription_end DATE,
  created_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════
-- 2. TABLE COMPANIES (une par admin/abonnement)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.companies (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  app_id          TEXT        NOT NULL DEFAULT 'gestapp'
                              CHECK (app_id IN ('gestapp','famille','calcul')),
  plan            TEXT        NOT NULL DEFAULT 'starter'
                              CHECK (plan IN ('starter','pro','business','enterprise')),
  max_users       INTEGER     NOT NULL DEFAULT 3,
  status          TEXT        NOT NULL DEFAULT 'actif'
                              CHECK (status IN ('actif','suspendu','bloque','essai')),
  admin_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  ice             TEXT,
  ville           TEXT,
  telephone       TEXT,
  email           TEXT,
  logo_url        TEXT,
  subscription_end DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_companies_app      ON public.companies(app_id);
CREATE INDEX IF NOT EXISTS idx_companies_admin     ON public.companies(admin_id);
CREATE INDEX IF NOT EXISTS idx_platform_users_email ON public.platform_users(email);
CREATE INDEX IF NOT EXISTS idx_platform_users_app   ON public.platform_users(app_id);
CREATE INDEX IF NOT EXISTS idx_platform_users_company ON public.platform_users(company_id);

-- ══════════════════════════════════════════════════════════
-- 3. PROFILS PAR APPLICATION
-- ══════════════════════════════════════════════════════════

-- GestApp BTP
CREATE TABLE IF NOT EXISTS public.gestapp_profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id      UUID        REFERENCES public.companies(id) ON DELETE CASCADE,
  email           TEXT        NOT NULL,
  full_name       TEXT,
  role            TEXT        DEFAULT 'technicien',
  is_active       BOOLEAN     DEFAULT true,
  module_permissions JSONB    DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Family CashFlow
CREATE TABLE IF NOT EXISTS public.famille_profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id      UUID        REFERENCES public.companies(id) ON DELETE CASCADE,
  email           TEXT        NOT NULL,
  full_name       TEXT,
  role            TEXT        DEFAULT 'membre',
  is_active       BOOLEAN     DEFAULT true,
  module_permissions JSONB    DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- CalcPeinture Pro
CREATE TABLE IF NOT EXISTS public.calcul_profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id      UUID        REFERENCES public.companies(id) ON DELETE CASCADE,
  email           TEXT        NOT NULL,
  full_name       TEXT,
  role            TEXT        DEFAULT 'peintre',
  is_active       BOOLEAN     DEFAULT true,
  module_permissions JSONB    DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id      TEXT,
  company_id  UUID        REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name   TEXT,
  action      TEXT        NOT NULL,
  detail      TEXT,
  module      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_company ON public.audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_app     ON public.audit_logs(app_id);

-- ══════════════════════════════════════════════════════════
-- 4. ACTIVER RLS
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.platform_users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gestapp_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.famille_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calcul_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs        ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════
-- 5. FONCTIONS HELPER (sans récursion RLS)
-- ══════════════════════════════════════════════════════════

-- Retourne le rôle de l'utilisateur courant (SECURITY DEFINER = bypass RLS)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.platform_users WHERE id = auth.uid() LIMIT 1;
$$;

-- Retourne l'app_id de l'utilisateur courant
CREATE OR REPLACE FUNCTION public.get_my_app()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT app_id FROM public.platform_users WHERE id = auth.uid() LIMIT 1;
$$;

-- Retourne le company_id de l'utilisateur courant
CREATE OR REPLACE FUNCTION public.get_my_company()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.platform_users WHERE id = auth.uid() LIMIT 1;
$$;

-- Retourne le nombre d'utilisateurs actifs pour une company
CREATE OR REPLACE FUNCTION public.count_company_users(p_company_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.platform_users
  WHERE company_id = p_company_id AND is_active = true AND role = 'user';
$$;

-- ══════════════════════════════════════════════════════════
-- 6. POLITIQUES RLS — PLATFORM_USERS
-- ══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "pu_select" ON public.platform_users;
DROP POLICY IF EXISTS "pu_insert" ON public.platform_users;
DROP POLICY IF EXISTS "pu_update" ON public.platform_users;
DROP POLICY IF EXISTS "pu_delete" ON public.platform_users;
DROP POLICY IF EXISTS "pu_service" ON public.platform_users;

-- SELECT : superadmin voit tout | admin voit sa company | user voit lui-même
CREATE POLICY "pu_select" ON public.platform_users FOR SELECT
USING (
  public.get_my_role() = 'superadmin'
  OR id = auth.uid()
  OR (public.get_my_role() = 'admin' AND company_id = public.get_my_company())
);

-- INSERT : superadmin crée des admins | admin crée des users (si quota OK)
CREATE POLICY "pu_insert" ON public.platform_users FOR INSERT
WITH CHECK (
  public.get_my_role() = 'superadmin'
  OR (
    public.get_my_role() = 'admin'
    AND role = 'user'
    AND company_id = public.get_my_company()
    AND public.count_company_users(company_id) < (
      SELECT max_users FROM public.platform_users WHERE id = auth.uid() LIMIT 1
    )
  )
);

-- UPDATE : superadmin met à jour tout | admin met à jour ses users
CREATE POLICY "pu_update" ON public.platform_users FOR UPDATE
USING (
  public.get_my_role() = 'superadmin'
  OR (public.get_my_role() = 'admin' AND company_id = public.get_my_company() AND role = 'user')
  OR id = auth.uid()
);

-- DELETE : superadmin uniquement
CREATE POLICY "pu_delete" ON public.platform_users FOR DELETE
USING (public.get_my_role() = 'superadmin');

-- Service Role (Cloudflare Worker) : accès total
CREATE POLICY "pu_service" ON public.platform_users FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ══════════════════════════════════════════════════════════
-- 7. POLITIQUES RLS — COMPANIES
-- ══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "co_select" ON public.companies;
DROP POLICY IF EXISTS "co_insert" ON public.companies;
DROP POLICY IF EXISTS "co_update" ON public.companies;
DROP POLICY IF EXISTS "co_service" ON public.companies;

CREATE POLICY "co_select" ON public.companies FOR SELECT
USING (
  public.get_my_role() = 'superadmin'
  OR id = public.get_my_company()
  OR admin_id = auth.uid()
);

CREATE POLICY "co_insert" ON public.companies FOR INSERT
WITH CHECK (public.get_my_role() = 'superadmin' OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "co_update" ON public.companies FOR UPDATE
USING (
  public.get_my_role() = 'superadmin'
  OR admin_id = auth.uid()
);

CREATE POLICY "co_service" ON public.companies FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ══════════════════════════════════════════════════════════
-- 8. POLITIQUES RLS — PROFILS APPLICATIONS
-- ══════════════════════════════════════════════════════════

-- GestApp
DROP POLICY IF EXISTS "gp_select" ON public.gestapp_profiles;
DROP POLICY IF EXISTS "gp_write"  ON public.gestapp_profiles;
DROP POLICY IF EXISTS "gp_service" ON public.gestapp_profiles;
CREATE POLICY "gp_select"  ON public.gestapp_profiles FOR SELECT
USING (public.get_my_role() IN ('superadmin','admin') OR id = auth.uid() OR company_id = public.get_my_company());
CREATE POLICY "gp_write"   ON public.gestapp_profiles FOR ALL
USING (public.get_my_role() IN ('superadmin','admin') OR id = auth.uid());
CREATE POLICY "gp_service" ON public.gestapp_profiles FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role') WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Famille
DROP POLICY IF EXISTS "fp_select" ON public.famille_profiles;
DROP POLICY IF EXISTS "fp_write"  ON public.famille_profiles;
DROP POLICY IF EXISTS "fp_service" ON public.famille_profiles;
CREATE POLICY "fp_select"  ON public.famille_profiles FOR SELECT
USING (public.get_my_role() IN ('superadmin','admin') OR id = auth.uid() OR company_id = public.get_my_company());
CREATE POLICY "fp_write"   ON public.famille_profiles FOR ALL
USING (public.get_my_role() IN ('superadmin','admin') OR id = auth.uid());
CREATE POLICY "fp_service" ON public.famille_profiles FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role') WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Calcul
DROP POLICY IF EXISTS "cp_select" ON public.calcul_profiles;
DROP POLICY IF EXISTS "cp_write"  ON public.calcul_profiles;
DROP POLICY IF EXISTS "cp_service" ON public.calcul_profiles;
CREATE POLICY "cp_select"  ON public.calcul_profiles FOR SELECT
USING (public.get_my_role() IN ('superadmin','admin') OR id = auth.uid() OR company_id = public.get_my_company());
CREATE POLICY "cp_write"   ON public.calcul_profiles FOR ALL
USING (public.get_my_role() IN ('superadmin','admin') OR id = auth.uid());
CREATE POLICY "cp_service" ON public.calcul_profiles FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role') WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Audit
DROP POLICY IF EXISTS "al_select" ON public.audit_logs;
DROP POLICY IF EXISTS "al_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "al_service" ON public.audit_logs;
CREATE POLICY "al_select"  ON public.audit_logs FOR SELECT
USING (public.get_my_role() = 'superadmin' OR company_id = public.get_my_company());
CREATE POLICY "al_insert"  ON public.audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "al_service" ON public.audit_logs FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role') WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ══════════════════════════════════════════════════════════
-- 9. TRIGGER : mise à jour automatique updated_at
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_platform_users_updated ON public.platform_users;
CREATE TRIGGER trg_platform_users_updated
  BEFORE UPDATE ON public.platform_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_companies_updated ON public.companies;
CREATE TRIGGER trg_companies_updated
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════════════════
-- 10. SUPERADMIN INITIAL
-- Remplacer l'UUID par le vrai UUID depuis auth.users
-- ══════════════════════════════════════════════════════════
-- Étape 1 : Créer le compte dans Supabase Auth → Dashboard → Auth → Users → Add User
-- Étape 2 : Récupérer l'UUID et exécuter ci-dessous :

/*
INSERT INTO public.platform_users (id, email, full_name, role, app_id, is_active, can_add_users, created_at, updated_at)
VALUES (
  'UUID_DU_COMPTE_AUTH',           -- ← remplacer
  'said.hamdaoui1984@gmail.com',   -- ← remplacer par votre email
  'Said Hamdaoui',
  'superadmin',
  'all',
  true,
  false,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET role = 'superadmin', app_id = 'all', is_active = true;
*/

-- ══════════════════════════════════════════════════════════
-- 11. VÉRIFICATION FINALE
-- ══════════════════════════════════════════════════════════
DO $$
DECLARE
  t_count INT;
  p_count INT;
BEGIN
  SELECT COUNT(*) INTO t_count FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name IN (
    'platform_users','companies','gestapp_profiles','famille_profiles','calcul_profiles','audit_logs'
  );
  SELECT COUNT(*) INTO p_count FROM pg_policies WHERE schemaname = 'public';
  RAISE NOTICE '✅ Tables créées : %/6', t_count;
  RAISE NOTICE '✅ Politiques RLS : %', p_count;
  RAISE NOTICE '✅ Platform v6.0 prête !';
END $$;
