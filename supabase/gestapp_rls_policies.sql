-- ============================================================
--  GestionApp212 — RLS Policies (PARTIE 2)
--  ⚠️  Exécuter APRÈS la Partie 1
--  Projet : mfyhktnzjodaqfocupcn
-- ============================================================

-- ╔══════════════════════════════════════════════════════════╗
--  PARTIE 2 — Row Level Security (RLS) + Politiques
-- ╚══════════════════════════════════════════════════════════╝

-- ── 1. Activer RLS sur les nouvelles tables ───────────────────
ALTER TABLE ga_clients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga_taches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga_achats       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga_avances      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga_prestataires ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga_galerie      ENABLE ROW LEVEL SECURITY;

-- ── 2. Supprimer les politiques existantes avant de recréer ──
-- (évite l'erreur "policy already exists")
DROP POLICY IF EXISTS "membres_societe_clients"      ON ga_clients;
DROP POLICY IF EXISTS "membres_societe_taches"       ON ga_taches;
DROP POLICY IF EXISTS "membres_societe_achats"       ON ga_achats;
DROP POLICY IF EXISTS "membres_societe_avances"      ON ga_avances;
DROP POLICY IF EXISTS "membres_societe_prestataires" ON ga_prestataires;
DROP POLICY IF EXISTS "membres_societe_galerie"      ON ga_galerie;
DROP POLICY IF EXISTS "super_admin_users"            ON ga_users;

-- ── 3. Politiques : membres de la société ─────────────────────
CREATE POLICY "membres_societe_clients" ON ga_clients
  FOR ALL USING (
    societe_id IN (
      SELECT societe_id FROM ga_membres WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "membres_societe_taches" ON ga_taches
  FOR ALL USING (
    societe_id IN (
      SELECT societe_id FROM ga_membres WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "membres_societe_achats" ON ga_achats
  FOR ALL USING (
    societe_id IN (
      SELECT societe_id FROM ga_membres WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "membres_societe_avances" ON ga_avances
  FOR ALL USING (
    societe_id IN (
      SELECT societe_id FROM ga_membres WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "membres_societe_prestataires" ON ga_prestataires
  FOR ALL USING (
    societe_id IN (
      SELECT societe_id FROM ga_membres WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "membres_societe_galerie" ON ga_galerie
  FOR ALL USING (
    societe_id IN (
      SELECT societe_id FROM ga_membres WHERE user_id = auth.uid()
    )
  );

-- ── 4. Super admin — accès total à ga_users ───────────────────
-- Note : on utilise une sous-requête simple (pas IF NOT EXISTS)
CREATE POLICY "super_admin_users" ON ga_users
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM ga_users
      WHERE role = 'super_admin'
         OR email = 'said.hamdaoui1984@gmail.com'
    )
  );

-- ── Fin Partie 2 ──────────────────────────────────────────────
-- ✅ Si pas d'erreur → publier depuis l'onglet Publish de Genspark
-- 📌 Résumé tables créées :
--    ga_clients, ga_taches, ga_achats, ga_avances,
--    ga_prestataires, ga_galerie
-- 📌 Super admin : said.hamdaoui1984@gmail.com → role = super_admin
