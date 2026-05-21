-- ============================================================
--  GestionApp212 — Mise à jour V2
--  1. Ajoute colonne password_changed à ga_users
--  2. Met à jour le Super Admin
--  3. Crée ga_users si elle n'existe pas encore
-- ============================================================

-- ── 1. Table ga_users (si pas encore créée) ──
CREATE TABLE IF NOT EXISTS ga_users (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  nom               TEXT,
  role              TEXT DEFAULT 'user',
  statut            TEXT DEFAULT 'actif',
  tel               TEXT,
  avatar_url        TEXT,
  password_changed  BOOLEAN DEFAULT FALSE,
  derniere_connexion TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Ajouter password_changed si la table existe déjà ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'ga_users'
      AND column_name  = 'password_changed'
  ) THEN
    ALTER TABLE ga_users ADD COLUMN password_changed BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Colonne password_changed ajoutée à ga_users';
  ELSE
    RAISE NOTICE 'Colonne password_changed existe déjà';
  END IF;
END $$;

-- ── 3. Ajouter derniere_connexion si absente ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'ga_users'
      AND column_name  = 'derniere_connexion'
  ) THEN
    ALTER TABLE ga_users ADD COLUMN derniere_connexion TIMESTAMPTZ;
    RAISE NOTICE 'Colonne derniere_connexion ajoutée';
  END IF;
END $$;

-- ── 4. Super Admin : créer ou mettre à jour said.hamdaoui1984@gmail.com ──
DO $$
DECLARE
  v_uid UUID;
BEGIN
  -- Récupérer l'UUID depuis auth.users
  SELECT id INTO v_uid FROM auth.users
  WHERE email = 'said.hamdaoui1984@gmail.com'
  LIMIT 1;

  IF v_uid IS NOT NULL THEN
    INSERT INTO ga_users (id, email, nom, role, statut, password_changed)
    VALUES (v_uid, 'said.hamdaoui1984@gmail.com', 'Said Hamdaoui', 'super_admin', 'actif', TRUE)
    ON CONFLICT (id) DO UPDATE
      SET role             = 'super_admin',
          statut           = 'actif',
          password_changed = TRUE,
          updated_at       = NOW();
    RAISE NOTICE 'Super Admin configuré : %', v_uid;
  ELSE
    RAISE NOTICE 'Utilisateur said.hamdaoui1984@gmail.com non trouvé dans auth.users';
    RAISE NOTICE '→ Créez d''abord ce compte dans Authentication > Users';
  END IF;
END $$;

-- ── 5. RLS sur ga_users ──
ALTER TABLE ga_users ENABLE ROW LEVEL SECURITY;

-- Super admin : accès total
DROP POLICY IF EXISTS "super_admin_full_access" ON ga_users;
CREATE POLICY "super_admin_full_access" ON ga_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM ga_users u2
      WHERE u2.id = auth.uid()
        AND u2.role = 'super_admin'
    )
    OR auth.jwt()->>'email' = 'said.hamdaoui1984@gmail.com'
  );

-- Utilisateur : voir/modifier son propre profil
DROP POLICY IF EXISTS "user_own_profile" ON ga_users;
CREATE POLICY "user_own_profile" ON ga_users
  FOR ALL USING (id = auth.uid());

-- ── 6. Trigger updated_at ──
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ga_users_updated_at ON ga_users;
CREATE TRIGGER trigger_ga_users_updated_at
  BEFORE UPDATE ON ga_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Confirmation ──
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ =============================================';
  RAISE NOTICE '✅  GestionApp V2 — Mise à jour réussie !';
  RAISE NOTICE '✅  - password_changed ajouté à ga_users';
  RAISE NOTICE '✅  - Super Admin configuré';
  RAISE NOTICE '✅  - RLS et triggers à jour';
  RAISE NOTICE '✅ =============================================';
END $$;
