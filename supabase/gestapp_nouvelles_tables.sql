-- ============================================================
--  GestionApp212 — Nouvelles tables (script corrigé)
--  ⚠️  Exécuter en 2 parties séparées dans Supabase SQL Editor
--  Projet : mfyhktnzjodaqfocupcn
-- ============================================================

-- ╔══════════════════════════════════════════════════════════╗
--  PARTIE 1 — Colonnes + Tables + Triggers
--  Copiez et exécutez cette partie en premier
-- ╚══════════════════════════════════════════════════════════╝

-- ── 1. Colonnes supplémentaires sur ga_users ─────────────────
ALTER TABLE ga_users ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'actif';
ALTER TABLE ga_users ADD COLUMN IF NOT EXISTS tel TEXT;
ALTER TABLE ga_users ADD COLUMN IF NOT EXISTS derniere_connexion TIMESTAMPTZ;

-- Passer le super admin
UPDATE ga_users
SET role = 'super_admin', statut = 'actif'
WHERE email = 'said.hamdaoui1984@gmail.com';

-- ── 2. Table ga_clients ───────────────────────────────────────
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

-- ── 3. Table ga_taches ────────────────────────────────────────
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

-- ── 4. Table ga_achats ────────────────────────────────────────
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

-- ── 5. Table ga_avances ───────────────────────────────────────
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

-- ── 6. Table ga_prestataires ──────────────────────────────────
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

-- ── 7. Table ga_galerie ───────────────────────────────────────
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

-- ── 8. Fonction updated_at (remplace si existe déjà) ─────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 9. Triggers updated_at (DROP avant CREATE pour éviter erreur)
DROP TRIGGER IF EXISTS tr_clients_updated_at      ON ga_clients;
DROP TRIGGER IF EXISTS tr_taches_updated_at       ON ga_taches;
DROP TRIGGER IF EXISTS tr_prestataires_updated_at ON ga_prestataires;

CREATE TRIGGER tr_clients_updated_at
  BEFORE UPDATE ON ga_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_taches_updated_at
  BEFORE UPDATE ON ga_taches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_prestataires_updated_at
  BEFORE UPDATE ON ga_prestataires
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Fin Partie 1 ──────────────────────────────────────────────
-- ✅ Si pas d'erreur → passer à la PARTIE 2 ci-dessous
