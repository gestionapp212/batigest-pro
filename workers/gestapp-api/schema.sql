-- ============================================================
-- GestionApp 212 — Cloudflare D1 Schema v5.0
-- À exécuter dans : Cloudflare Dashboard → D1 → gestapp-db → Console
-- OU via : wrangler d1 execute gestapp-db --file=schema.sql
-- ============================================================

-- ── PLATFORM USERS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_users (
  id               TEXT    PRIMARY KEY,
  email            TEXT    NOT NULL UNIQUE,
  password_hash    TEXT    NOT NULL,
  full_name        TEXT    NOT NULL,
  role             TEXT    NOT NULL DEFAULT 'admin' CHECK (role IN ('superadmin','admin','manager','commercial','technicien','lecture')),
  company_id       TEXT    REFERENCES companies(id) ON DELETE SET NULL,
  app_access       TEXT    DEFAULT '[]',        -- JSON array: ["gestapp","famille","calcul"]
  module_permissions TEXT  DEFAULT '{}',        -- JSON: {"clients":"edit","devis":"view",...}
  is_active        INTEGER NOT NULL DEFAULT 1,
  can_create_users INTEGER NOT NULL DEFAULT 0,  -- Seulement superadmin = 1
  twofa_enabled    INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT    NOT NULL,
  updated_at       TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_platform_users_email ON platform_users(email);
CREATE INDEX IF NOT EXISTS idx_platform_users_company ON platform_users(company_id);
CREATE INDEX IF NOT EXISTS idx_platform_users_role ON platform_users(role);

-- ── COMPANIES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  ice              TEXT,
  rc               TEXT,
  patente          TEXT,
  ville            TEXT,
  adresse          TEXT,
  telephone        TEXT,
  email            TEXT,
  logo             TEXT,                        -- URL seulement (pas de base64)
  plan             TEXT DEFAULT 'Starter',
  status           TEXT DEFAULT 'actif' CHECK (status IN ('actif','suspendu','bloque','essai')),
  abonnement_fin   TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);

-- ── AUDIT LOGS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id         TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  user_id    TEXT REFERENCES platform_users(id) ON DELETE SET NULL,
  user_name  TEXT,
  action     TEXT NOT NULL,
  detail     TEXT,
  module     TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ── CLIENTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nom         TEXT NOT NULL,
  prenom      TEXT,
  email       TEXT,
  telephone   TEXT,
  adresse     TEXT,
  ville       TEXT,
  ice         TEXT,
  rc          TEXT,
  patente     TEXT,
  type        TEXT DEFAULT 'particulier' CHECK (type IN ('particulier','entreprise')),
  statut      TEXT DEFAULT 'actif',
  notes       TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_deleted ON clients(deleted);

-- ── DEVIS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devis (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  numero      TEXT,
  client_id   TEXT REFERENCES clients(id),
  client_nom  TEXT,
  date_devis  TEXT,
  date_validite TEXT,
  objet       TEXT,
  statut      TEXT DEFAULT 'brouillon',
  total_ht    REAL DEFAULT 0,
  tva         REAL DEFAULT 0,
  total_ttc   REAL DEFAULT 0,
  lignes      TEXT DEFAULT '[]',               -- JSON
  notes       TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_devis_company ON devis(company_id);

-- ── FACTURES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS factures (
  id              TEXT PRIMARY KEY,
  company_id      TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  numero          TEXT,
  client_id       TEXT REFERENCES clients(id),
  client_nom      TEXT,
  date_facture    TEXT,
  date_echeance   TEXT,
  objet           TEXT,
  statut          TEXT DEFAULT 'non_payee',
  total_ht        REAL DEFAULT 0,
  tva             REAL DEFAULT 0,
  total_ttc       REAL DEFAULT 0,
  montant_paye    REAL DEFAULT 0,
  reste_a_payer   REAL DEFAULT 0,
  lignes          TEXT DEFAULT '[]',
  paiements       TEXT DEFAULT '[]',
  notes           TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  deleted         INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_factures_company ON factures(company_id);

-- ── PAIEMENTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS paiements (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  facture_id  TEXT REFERENCES factures(id),
  client_id   TEXT REFERENCES clients(id),
  client_nom  TEXT,
  montant     REAL DEFAULT 0,
  date_paiement TEXT,
  mode        TEXT DEFAULT 'virement',
  reference   TEXT,
  notes       TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_paiements_company ON paiements(company_id);

-- ── CHANTIERS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chantiers (
  id             TEXT PRIMARY KEY,
  company_id     TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nom            TEXT NOT NULL,
  client_id      TEXT REFERENCES clients(id),
  client_nom     TEXT,
  adresse        TEXT,
  date_debut     TEXT,
  date_fin       TEXT,
  statut         TEXT DEFAULT 'en_cours',
  budget_prevu   REAL DEFAULT 0,
  budget_reel    REAL DEFAULT 0,
  employes       TEXT DEFAULT '[]',
  sous_traitants TEXT DEFAULT '[]',
  achats         TEXT DEFAULT '[]',
  journal        TEXT DEFAULT '[]',
  photos         TEXT DEFAULT '[]',
  notes          TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  deleted        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_chantiers_company ON chantiers(company_id);

-- ── STOCK ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reference   TEXT,
  designation TEXT NOT NULL,
  categorie   TEXT,
  quantite    REAL DEFAULT 0,
  unite       TEXT DEFAULT 'unité',
  prix_achat  REAL DEFAULT 0,
  prix_vente  REAL DEFAULT 0,
  fournisseur_id TEXT,
  seuil_alerte REAL DEFAULT 0,
  notes       TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_stock_company ON stock(company_id);

-- ── FOURNISSEURS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fournisseurs (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nom         TEXT NOT NULL,
  contact     TEXT,
  email       TEXT,
  telephone   TEXT,
  adresse     TEXT,
  ville       TEXT,
  ice         TEXT,
  rc          TEXT,
  patente     TEXT,
  notes       TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_fournisseurs_company ON fournisseurs(company_id);

-- ── GARANTIES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS garanties (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id   TEXT REFERENCES clients(id),
  client_nom  TEXT,
  chantier_id TEXT REFERENCES chantiers(id),
  description TEXT,
  date_debut  TEXT,
  date_fin    TEXT,
  statut      TEXT DEFAULT 'actif',
  notes       TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_garanties_company ON garanties(company_id);

-- ── AGENDA ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agenda (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  titre       TEXT NOT NULL,
  description TEXT,
  date_debut  TEXT,
  date_fin    TEXT,
  type        TEXT DEFAULT 'evenement',
  couleur     TEXT DEFAULT '#3182ce',
  all_day     INTEGER DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_agenda_company ON agenda(company_id);

-- ── TACHES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS taches (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  titre       TEXT NOT NULL,
  description TEXT,
  statut      TEXT DEFAULT 'a_faire',
  priorite    TEXT DEFAULT 'normale',
  date_echeance TEXT,
  assignee    TEXT,
  chantier_id TEXT REFERENCES chantiers(id),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_taches_company ON taches(company_id);

-- ── PIPELINE ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  titre       TEXT NOT NULL,
  client_id   TEXT REFERENCES clients(id),
  client_nom  TEXT,
  valeur      REAL DEFAULT 0,
  etape       TEXT DEFAULT 'prospect',
  probabilite INTEGER DEFAULT 50,
  date_cible  TEXT,
  notes       TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_pipeline_company ON pipeline(company_id);

-- ── GALERIE ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS galerie (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  chantier_id TEXT REFERENCES chantiers(id),
  titre       TEXT,
  url         TEXT NOT NULL,               -- URL CF R2 ou URL externe
  description TEXT,
  date_prise  TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_galerie_company ON galerie(company_id);

-- ── SUPERADMIN (compte initial) ─────────────────────────────
-- ⚠️ Remplacer PASSWORD_HASH par le hash généré via l'API /auth/setup-superadmin
-- Ou utiliser le script seed.sql fourni séparément
-- INSERT OR IGNORE INTO platform_users (id, email, password_hash, full_name, role, is_active, can_create_users, created_at, updated_at)
-- VALUES ('SA001', 'said.hamdaoui1984@gmail.com', 'HASH_ICI', 'Said Hamdaoui', 'superadmin', 1, 1, datetime('now'), datetime('now'));
