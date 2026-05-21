/* ============================================================
   GestionApp 212 — Client v5.1
   Auth & Data : Supabase directement (anon key)
   Admin API   : Cloudflare Worker (création users)
   ============================================================ */

// ── CONFIG ──────────────────────────────────────────────────
const SUPABASE_URL  = 'https://mfyhktnzjodaqfocupcn.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1meWhrdG56am9kYXFmb2N1cGNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4Mjg2ODEsImV4cCI6MjA5MTQwNDY4MX0.jnqEOFFu1gQvQrDemK4eOYwhWZI0K84Lgwhv7Cl2xGo';
const CF_WORKER_URL = 'https://gestapp-api.gestionapp212.workers.dev';

console.log('[CF Client v5.1] Initialisé — Supabase:', SUPABASE_URL);

// ── SUPABASE CLIENT ─────────────────────────────────────────
let _sb = null;
function getSupabase() {
  if (!_sb) {
    if (typeof supabase === 'undefined' || !supabase.createClient) {
      throw new Error('Supabase SDK non chargé');
    }
    _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: {
        autoRefreshToken:   true,
        persistSession:     true,
        detectSessionInUrl: false,
        storageKey:         'ga_session',
      },
      global: {
        fetch: (...args) => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 10000);
          const [url, opts = {}] = args;
          return fetch(url, { ...opts, signal: controller.signal })
            .finally(() => clearTimeout(timer));
        }
      }
    });
  }
  return _sb;
}

// ── AUTH ────────────────────────────────────────────────────
async function cfSignIn(email, password) {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function cfSignOut() {
  try { await getSupabase().auth.signOut(); } catch(e) {}
  try { sessionStorage.clear(); } catch(e) {}
}

async function cfGetSession() {
  try {
    const { data: { session } } = await getSupabase().auth.getSession();
    return session;
  } catch(e) { return null; }
}

async function cfGetCurrentUser() {
  try {
    const { data: { user } } = await getSupabase().auth.getUser();
    return user;
  } catch(e) { return null; }
}

function cfOnAuthChange(cb) {
  return getSupabase().auth.onAuthStateChange((event, session) => cb(event, session));
}

// ── PROFIL ──────────────────────────────────────────────────
async function cfGetProfile(userId) {
  if (!userId) throw new Error('userId manquant');

  const { data: rows, error } = await getSupabase()
    .from('platform_users')
    .select('*')
    .eq('id', userId)
    .limit(1);

  if (error && error.code !== 'PGRST116') throw error;
  const profile = rows?.[0] || null;
  if (!profile) throw new Error('Profil introuvable');

  // Charger la société si company_id existe
  if (profile.company_id) {
    try {
      const { data: company } = await getSupabase()
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single();
      profile.companies = company ? {
        ...company,
        statut:           company.status           || 'active',
        status:           company.status           || 'active',
        abonnement_fin:   company.subscription_end || null,
        subscription_end: company.subscription_end || null,
        ville:            company.city             || null,
        city:             company.city             || null,
      } : null;
    } catch(e) {
      console.warn('[cfGetProfile] Société inaccessible:', e.message);
      profile.companies = null;
    }
  } else {
    profile.companies = null;
  }

  return profile;
}

// ── CRUD GÉNÉRIQUE ──────────────────────────────────────────
async function cfGetAll(table, options = {}) {
  let q = getSupabase().from(table).select(options.select || '*');
  if (options.filters) {
    options.filters.forEach(([col, val]) => { q = q.eq(col, val); });
  }
  if (options.order)  q = q.order(options.order, { ascending: options.asc ?? true });
  if (options.limit)  q = q.limit(options.limit);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

async function cfGetOne(table, id) {
  const { data, error } = await getSupabase().from(table).select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

async function cfCreate(table, record) {
  const { data, error } = await getSupabase().from(table).insert(record).select().single();
  if (error) throw error;
  return data;
}

async function cfUpdate(table, id, updates) {
  const { data, error } = await getSupabase().from(table).update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function cfDelete(table, id) {
  const { error } = await getSupabase().from(table).delete().eq('id', id);
  if (error) throw error;
  return true;
}

async function cfUpsert(table, record, opts = {}) {
  const { data, error } = await getSupabase()
    .from(table).upsert(record, opts).select().single();
  if (error) throw error;
  return data;
}

// ── COMPANY DATA ────────────────────────────────────────────
async function cfLoadCompanyData(companyId) {
  if (!companyId) return {};
  const tables = ['clients','devis','factures','chantiers','fournisseurs','materiaux'];
  const results = {};
  await Promise.allSettled(
    tables.map(async t => {
      try {
        const { data } = await getSupabase()
          .from(t).select('*').eq('company_id', companyId).order('created_at', { ascending: false });
        results[t] = data || [];
      } catch(e) {
        console.warn(`[cfLoadCompanyData] ${t}:`, e.message);
        results[t] = [];
      }
    })
  );
  return results;
}

// ── AUDIT LOG ───────────────────────────────────────────────
async function cfAddAuditLog(action, detail = '', category = 'general') {
  try {
    const user = await cfGetCurrentUser();
    await getSupabase().from('audit_logs').insert({
      user_id:    user?.id    || null,
      user_email: user?.email || null,
      action, detail, category,
      created_at: new Date().toISOString(),
    });
  } catch(e) {
    console.warn('[cfAddAuditLog]', e.message);
  }
}

// ── ALIASES (compatibilité avec core.js) ───────────────────
const sbSignIn         = cfSignIn;
const sbSignOut        = cfSignOut;
const sbGetSession     = cfGetSession;
const sbGetCurrentUser = cfGetCurrentUser;
const sbOnAuthChange   = cfOnAuthChange;
const sbGetProfile     = cfGetProfile;
const sbGetAll         = cfGetAll;
const sbGetOne         = cfGetOne;
const sbCreate         = cfCreate;
const sbUpdate         = cfUpdate;
const sbDelete         = cfDelete;
const sbUpsert         = cfUpsert;
const sbLoadCompanyData = cfLoadCompanyData;
const sbAddAuditLog    = cfAddAuditLog;

// isSupabaseConnected — mis à jour après tentative de connexion
let isSupabaseConnected = false;

// Test rapide connexion Supabase
(async () => {
  try {
    const { error } = await getSupabase().from('companies').select('id').limit(1);
    isSupabaseConnected = !error;
    console.log('[CF Client v5.1] Supabase:', isSupabaseConnected ? '✅ connecté' : '⚠️ ' + error?.message);
  } catch(e) {
    isSupabaseConnected = false;
    console.warn('[CF Client v5.1] Supabase inaccessible:', e.message);
  }
})();
