// ===== SUPABASE CLIENT =====
const SUPABASE_URL = 'https://zevqmvbfmaktjkrndytw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpldnFtdmJmbWFrdGprcm5keXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MjcwNjQsImV4cCI6MjA5MjEwMzA2NH0.4YH-9kNBDONLqSiDJEutg1dpbRTV3b1uu_DO6WnjRxE';

// *** SERVICE ROLE KEY ***
// Utilisée UNIQUEMENT sur la page /super-admin (protégée par auth super_admin)
// Permet la création/suppression d'utilisateurs Auth sans confirmation email
// NE PAS utiliser sur des pages publiques non protégées
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpldnFtdmJmbWFrdGprcm5keXR3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUyNzA2NCwiZXhwIjoyMDkyMTAzMDY0fQ.I1wy2q52g2AVc9JtRV747M9HoCj4ATQcJFvoLHm6wQY';

// Clé de stockage différente selon la page pour isoler les sessions
const _isSuperAdmin = window.location.pathname.includes('super-admin');
const _storageKey = _isSuperAdmin ? 'sb-sa-auth' : 'sb-app-auth';

// Client Supabase avec session isolée par page
const _supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storageKey: _storageKey,
    autoRefreshToken: true,
    persistSession: true,
  }
});

// ===== HELPERS ADMIN REST API =====
// Utilise d'abord la route Hono (/api/admin/*) qui dispose de la clé serveur,
// puis se rabat sur l'API directe avec la service_role_key si disponible.
async function _adminFetch(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(`${SUPABASE_URL}${path}`, opts);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { message: e.message } };
  }
}

// Appelle une route API Hono (proxy serveur avec vraie service_role_key Cloudflare)
async function _honoAdminFetch(path, method = 'GET', body = null) {
  try {
    const session = await _supa.auth.getSession();
    const token = session?.data?.session?.access_token || '';
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(path, opts);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { message: e.message } };
  }
}

// ===== API WRAPPER =====
const SB = {
  // AUTH
  async signIn(email, password) {
    const { data, error } = await _supa.auth.signInWithPassword({ email, password });
    return { data, error };
  },
  async signOut() {
    return await _supa.auth.signOut();
  },
  async getSession() {
    const { data } = await _supa.auth.getSession();
    return data.session;
  },
  async getUser() {
    const { data } = await _supa.auth.getUser();
    return data.user;
  },
  async signUp(email, password) {
    const { data, error } = await _supa.auth.signUp({ email, password });
    return { data, error };
  },

  // ===== ADMIN AUTH =====
  // Stratégie : 1) Route Hono /api/admin/* (clé serveur Cloudflare)
  //             2) API directe Supabase avec service_role_key (si valide)

  // Crée un utilisateur Auth directement confirmé (sans email de confirmation)
  async adminCreateUser(email, password, metadata = {}) {
    // Essai 1 : Route Hono (serveur avec SUPABASE_SERVICE_KEY Cloudflare)
    const honoRes = await _honoAdminFetch('/api/admin/create-user', 'POST', { email, password, metadata });
    if (honoRes.ok && honoRes.data?.user) {
      return { data: { user: honoRes.data.user }, error: null };
    }
    // Si erreur Hono non liée à la config (ex: conflit email), on remonte l'erreur
    if (honoRes.status === 422 || (honoRes.data?.error && !honoRes.data.error.includes('configuré') && !honoRes.data.error.includes('Non autorisé'))) {
      return { data: null, error: { message: honoRes.data?.error || 'Erreur création' } };
    }
    // Essai 2 : API directe avec service_role_key (peut être invalide)
    const { ok, data } = await _adminFetch('/auth/v1/admin/users', 'POST', {
      email, password, email_confirm: true, user_metadata: metadata || {},
    });
    if (!ok) {
      const msg = data.message || data.error_description || '';
      // Si clé invalide → signaler SETUP_REQUIRED pour que l'appelant fasse un fallback
      if (msg.includes('Invalid API key') || msg.includes('invalid_api_key')) {
        return { data: null, error: { message: 'SETUP_REQUIRED', code: 'SETUP_REQUIRED' } };
      }
      return { data: null, error: { message: msg || 'Erreur création compte' } };
    }
    return { data: { user: data }, error: null };
  },

  // Supprime un utilisateur Auth définitivement
  async adminDeleteUser(userId) {
    if (!userId || !isValidUUID(userId)) return { error: { message: 'UUID invalide : ' + userId } };
    // Essai 1 : Route Hono
    const honoRes = await _honoAdminFetch(`/api/admin/delete-user/${userId}`, 'DELETE');
    if (honoRes.ok) return { error: null };
    if (honoRes.status !== 503 && honoRes.status !== 403 && honoRes.status !== 0) {
      return { error: { message: honoRes.data?.error || 'Erreur suppression Auth' } };
    }
    // Essai 2 : API directe
    const { ok, data } = await _adminFetch(`/auth/v1/admin/users/${userId}`, 'DELETE');
    if (!ok) return { error: { message: data.message || data.error_description || 'Erreur suppression Auth. Configurez SUPABASE_SERVICE_KEY dans Cloudflare Pages.' } };
    return { error: null };
  },

  // Liste tous les utilisateurs Auth (pour le Super Admin)
  async adminListAuthUsers() {
    const { ok, data } = await _adminFetch('/auth/v1/admin/users?per_page=1000');
    if (!ok) return { data: [], error: { message: data.message || 'Erreur' } };
    return { data: data.users || [], error: null };
  },

  // Met à jour un utilisateur Auth (ex: confirmer email, changer mdp)
  async adminUpdateUser(userId, updates) {
    if (!userId || !isValidUUID(userId)) return { error: { message: 'UUID invalide' } };
    const { ok, data } = await _adminFetch(`/auth/v1/admin/users/${userId}`, 'PUT', updates);
    if (!ok) return { error: { message: data.message || 'Erreur mise à jour Auth' } };
    return { data, error: null };
  },

  // Confirme l'email d'un utilisateur existant (valider compte en attente)
  async adminConfirmUser(userId) {
    if (!userId || !isValidUUID(userId)) return { error: { message: 'UUID invalide' } };
    // Essai 1 : Route Hono
    const honoRes = await _honoAdminFetch(`/api/admin/confirm-user/${userId}`, 'POST');
    if (honoRes.ok) return { error: null };
    if (honoRes.status !== 503 && honoRes.status !== 403 && honoRes.status !== 0) {
      return { error: { message: honoRes.data?.error || 'Erreur confirmation' } };
    }
    // Essai 2 : API directe
    const { ok, data } = await _adminFetch(`/auth/v1/admin/users/${userId}`, 'PUT', { email_confirm: true });
    if (!ok) return { error: { message: data.message || 'Erreur confirmation. Configurez SUPABASE_SERVICE_KEY.' } };
    return { error: null };
  },

  // PROFILES
  async getProfile(userId) {
    const { data, error } = await _supa.from('profiles').select('*, companies(*)').eq('id', userId).single();
    return { data, error };
  },
  async updateProfile(userId, updates) {
    const { data, error } = await _supa.from('profiles').update(updates).eq('id', userId).select().single();
    return { data, error };
  },
  async getCompanyProfiles(companyId) {
    const { data, error } = await _supa.from('profiles').select('*').eq('company_id', companyId);
    return { data: data || [], error };
  },
  async createProfile(profile) {
    const { data, error } = await _supa.from('profiles').insert(profile).select().single();
    return { data, error };
  },
  async deleteProfile(id) {
    const { error } = await _supa.from('profiles').delete().eq('id', id);
    return { error };
  },

  // COMPANIES
  async getCompany(id) {
    const { data, error } = await _supa.from('companies').select('*').eq('id', id).single();
    return { data, error };
  },
  async getAllCompanies() {
    const { data, error } = await _supa.from('companies').select('*').order('created_at', { ascending: false });
    return { data: data || [], error };
  },
  async createCompany(company) {
    const { data, error } = await _supa.from('companies').insert(company).select().single();
    return { data, error };
  },
  async updateCompany(id, updates) {
    const { data, error } = await _supa.from('companies').update(updates).eq('id', id).select().single();
    return { data, error };
  },
  async deleteCompany(id) {
    const { error } = await _supa.from('companies').delete().eq('id', id);
    return { error };
  },

  // ALL USERS (Super Admin)
  async getAllUsers() {
    const { data, error } = await _supa.from('profiles').select('*').order('created_at', { ascending: false });
    return { data: data || [], error };
  },
  async deleteProfilesByCompany(companyId) {
    const { error } = await _supa.from('profiles').delete().eq('company_id', companyId);
    return { error };
  },

  // Crée un utilisateur de société sans confirmation email (appelé par admin de société)
  async adminCreateCompanyUser(email, password) {
    // Essai 1 : Route Hono dédiée pour admin de société (ne demande pas super_admin)
    const honoRes = await _honoAdminFetch('/api/admin/create-company-user', 'POST', { email, password });
    if (honoRes.ok && honoRes.data?.user) {
      return { data: { user: honoRes.data.user }, error: null };
    }
    if (honoRes.status === 503) {
      // Service non configuré → signaler au code appelant pour fallback signUp
      return { data: null, error: { message: 'SETUP_REQUIRED', code: 'SETUP_REQUIRED' } };
    }
    if (honoRes.data?.error === 'SETUP_REQUIRED') {
      return { data: null, error: { message: 'SETUP_REQUIRED', code: 'SETUP_REQUIRED' } };
    }
    if (!honoRes.ok) {
      return { data: null, error: { message: honoRes.data?.error || honoRes.data?.message || 'Erreur création' } };
    }
    // Fallback API directe
    return await this.adminCreateUser(email, password);
  },

  // GENERIC CRUD (pour toutes les tables)
  async getAll(table, companyId) {
    let q = _supa.from(table).select('*');
    if (companyId) q = q.eq('company_id', companyId);
    q = q.order('created_at', { ascending: false });
    const { data, error } = await q;
    return { data: data || [], error };
  },
  async getOne(table, id) {
    const { data, error } = await _supa.from(table).select('*').eq('id', id).single();
    return { data, error };
  },
  async insert(table, item) {
    const { data, error } = await _supa.from(table).insert(item).select().single();
    return { data, error };
  },
  async update(table, id, updates) {
    const { data, error } = await _supa.from(table).update(updates).eq('id', id).select().single();
    return { data, error };
  },
  async remove(table, id) {
    const { error } = await _supa.from(table).delete().eq('id', id);
    return { error };
  },
  async getWhere(table, field, value) {
    const { data, error } = await _supa.from(table).select('*').eq(field, value).order('created_at', { ascending: false });
    return { data: data || [], error };
  },
};

// Utilitaire UUID (disponible globalement)
function isValidUUID(id) {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}
