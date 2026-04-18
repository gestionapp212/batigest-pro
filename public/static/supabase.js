// ===== SUPABASE CLIENT =====
const SUPABASE_URL = 'https://zevqmvbfmaktjkrndytw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpldnFtdmJmbWFrdGprcm5keXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MjcwNjQsImV4cCI6MjA5MjEwMzA2NH0.4YH-9kNBDONLqSiDJEutg1dpbRTV3b1uu_DO6WnjRxE';

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
