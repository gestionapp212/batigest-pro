/* ============================================================
   GestionApp 212 — Supabase CRUD v5.2
   ⚠️  Ce fichier est chargé APRÈS cloudflare-client.js
   Il utilise getSupabase() déjà défini dans cloudflare-client.js
   Il NE redéclare PAS SUPABASE_URL ni getSupabase()
   ============================================================ */

// ── CRUD GÉNÉRIQUE ─────────────────────────────────────────

async function sbGetAll(table, options = {}) {
  let q = getSupabase().from(table).select(options.select || '*');
  if (options.company_id) q = q.eq('company_id', options.company_id);
  if (options.filters) options.filters.forEach(([col, val]) => { q = q.eq(col, val); });
  q = q.order(options.order || 'created_at', { ascending: options.ascending ?? false });
  if (options.limit) q = q.limit(options.limit);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

async function sbGetById(table, id) {
  const { data: rows, error } = await getSupabase().from(table).select('*').eq('id', id).limit(1);
  if (error) throw error;
  return (rows && rows.length > 0) ? rows[0] : null;
}

async function sbInsert(table, record) {
  const clean = Object.fromEntries(Object.entries(record).filter(([, v]) => v !== undefined));
  const { data: rows, error } = await getSupabase().from(table).insert(clean).select();
  if (error) throw error;
  return (rows && rows.length > 0) ? rows[0] : null;
}

async function sbUpdate(table, id, updates) {
  const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
  const { data: rows, error } = await getSupabase()
    .from(table)
    .update({ ...clean, updated_at: new Date().toISOString() })
    .eq('id', id).select();
  if (error) throw error;
  return (rows && rows.length > 0) ? rows[0] : null;
}

async function sbDelete(table, id) {
  const { error } = await getSupabase().from(table).delete().eq('id', id);
  if (error) throw error;
  return true;
}

async function sbUpsert(table, record) {
  const clean = Object.fromEntries(Object.entries(record).filter(([, v]) => v !== undefined));
  const { data: rows, error } = await getSupabase().from(table).upsert(clean).select();
  if (error) throw error;
  return (rows && rows.length > 0) ? rows[0] : null;
}

// ── PROFIL UTILISATEUR ─────────────────────────────────────
async function sbGetProfile(userId) {
  if (!userId) throw new Error('userId manquant');
  const { data: rows, error } = await getSupabase()
    .from('platform_users')
    .select('*')
    .eq('id', userId)
    .limit(1);
  if (error && error.code !== 'PGRST116') throw error;
  const profile = (rows && rows.length > 0) ? rows[0] : null;
  if (!profile) throw new Error('Profil introuvable');
  if (profile.company_id) {
    try {
      const { data: company } = await getSupabase()
        .from('companies').select('*').eq('id', profile.company_id).single();
      profile.companies = company ? {
        ...company,
        statut: company.status || 'actif', status: company.status || 'actif',
        abonnement_fin: company.subscription_end || null,
        subscription_end: company.subscription_end || null,
        ville: company.city || null, city: company.city || null,
      } : null;
    } catch(e) { profile.companies = null; }
  } else { profile.companies = null; }
  return profile;
}

// ── NORMALISATION snake_case → camelCase ───────────────────
function normalizeDevis(d) {
  if (!d) return d;
  return {
    ...d,
    clientId:     d.clientId     || d.client_id,
    clientNom:    d.clientNom    || d.client_nom    || '',
    date:         d.date         || d.date_devis    || '',
    dateValidite: d.dateValidite || d.date_validite || '',
    totalHT:      d.totalHT      ?? d.total_ht      ?? 0,
    totalTVA:     d.totalTVA     ?? d.total_tva     ?? 0,
    totalTTC:     d.totalTTC     ?? d.total_ttc     ?? 0,
    companyId:    d.companyId    || d.company_id,
    lignes:       Array.isArray(d.lignes) ? d.lignes : [],
    notes:        d.notes        || '',
  };
}

function normalizeFacture(f) {
  if (!f) return f;
  const ttc = f.total_ttc ?? f.totalTTC ?? 0;
  return {
    ...f,
    clientId:     f.clientId     || f.client_id,
    clientNom:    f.clientNom    || f.client_nom    || '',
    date:         f.date         || f.date_facture  || '',
    dateEcheance: f.dateEcheance || f.date_echeance || '',
    totalHT:      f.totalHT      ?? f.total_ht      ?? 0,
    totalTVA:     f.totalTVA     ?? f.total_tva     ?? 0,
    totalTTC:     ttc,
    montantPaye:  f.montantPaye  ?? f.montant_paye  ?? 0,
    resteAPayer:  f.resteAPayer  ?? f.reste_a_payer ?? ttc,
    companyId:    f.companyId    || f.company_id,
    lignes:       Array.isArray(f.lignes)     ? f.lignes     : [],
    paiements:    Array.isArray(f.paiements)  ? f.paiements  : [],
  };
}

// ── CHECK CONNEXION ────────────────────────────────────────
async function checkSupabaseConnection() {
  try {
    const { error } = await getSupabase().from('companies').select('id').limit(1);
    return !error;
  } catch(e) { return false; }
}

function updateSupabaseStatus(connected) {
  isSupabaseConnected = connected;
  const el = document.getElementById('supabase-status-dot');
  if (!el) return;
  el.style.background = connected ? '#48bb78' : '#f6ad55';
  el.title = connected ? 'Supabase connecté' : 'Supabase hors ligne';
}

console.log('[supabase-client v5.2] CRUD fonctions chargées : sbInsert, sbUpdate, sbDelete, sbGetAll, sbGetById, sbUpsert');
