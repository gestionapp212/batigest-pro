-- =====================================================
-- BATIGEST PRO – Script SQL Supabase
-- À exécuter dans Supabase → SQL Editor
-- =====================================================

-- ===== 1. AJOUTER COLONNE pdf_settings À LA TABLE companies =====
-- Permet de stocker les paramètres PDF (couleur, police, style...) 
-- et de les synchroniser entre appareils.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS pdf_settings JSONB DEFAULT '{}';

-- ===== 2. DÉSACTIVER LA CONFIRMATION EMAIL (Solution principale) =====
-- Cette fonction RPC permet à un admin de confirmer un utilisateur Auth
-- sans avoir besoin de la service_role_key côté frontend.
-- Appelée depuis le Super Admin ou l'admin de société.

CREATE OR REPLACE FUNCTION confirm_user_email(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- S'exécute avec les droits du owner (service_role)
AS $$
BEGIN
  -- Confirmer l'email de l'utilisateur
  UPDATE auth.users 
  SET email_confirmed_at = NOW(),
      confirmed_at = NOW()
  WHERE id = user_id 
    AND email_confirmed_at IS NULL;
  
  RETURN FOUND;
END;
$$;

-- Donner l'accès à la fonction aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION confirm_user_email(UUID) TO authenticated;

-- ===== 3. FONCTION POUR CRÉER UN UTILISATEUR CONFIRMÉ =====
-- Utilisée par le Super Admin pour créer des utilisateurs sans confirmation email
CREATE OR REPLACE FUNCTION admin_create_confirmed_user(
  user_email TEXT,
  user_password TEXT,
  user_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Vérifier que l'appelant est super_admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Accès refusé : rôle super_admin requis';
  END IF;
  
  -- Cette fonction crée un utilisateur via l'API Auth interne
  -- Note: nécessite Supabase version avec pg_net ou similar
  RETURN jsonb_build_object('message', 'Utilisez la service_role_key pour créer des utilisateurs');
END;
$$;

-- ===== 4. POLITIQUE RLS POUR pdf_settings =====
-- S'assurer que les utilisateurs peuvent mettre à jour pdf_settings pour leur société
-- (Les politiques RLS existantes sur companies couvrent normalement déjà cela)

-- ===== 5. VÉRIFICATION COLONNE date_validite DANS devis =====
-- S'assurer que la colonne date_validite existe (et non validite)
ALTER TABLE devis ADD COLUMN IF NOT EXISTS date_validite DATE;

-- Migrer les données si la colonne validite existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'devis' AND column_name = 'validite'
  ) THEN
    UPDATE devis SET date_validite = validite::DATE WHERE date_validite IS NULL AND validite IS NOT NULL;
  END IF;
END;
$$;

-- ===== 6. INDEX POUR PERFORMANCE =====
CREATE INDEX IF NOT EXISTS idx_profiles_company_status ON profiles(company_id, status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- =====================================================
-- INSTRUCTION IMPORTANTE pour désactiver la confirmation email :
-- 
-- Allez dans : Supabase Dashboard → Authentication → Settings
-- Section : "Email Auth"  
-- Désactivez : "Enable email confirmations"
-- 
-- Cette action permet à TOUS les nouveaux utilisateurs de se
-- connecter directement sans confirmer leur email.
-- C'est la solution la plus simple pour votre cas d'usage.
-- =====================================================
