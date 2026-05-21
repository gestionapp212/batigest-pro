// =====================================================
// Family Cash Flow — Service de base de données Supabase
// Version 5.0 — Persistance réelle avec Supabase
// =====================================================

const DB = {
  // ── Initialisation du client Supabase ──
  _client: null,
  _familyId: null,
  _userId: null,

  get client() {
    if (!this._client) {
      this._client = window.supabase?.createClient(
        CONFIG.SUPABASE_URL,
        CONFIG.SUPABASE_ANON_KEY,
        { auth: { autoRefreshToken: true, persistSession: true, storageKey: 'fcf_session' } }
      );
    }
    return this._client;
  },

  // ── Auth ──
  async getSession() {
    const { data } = await this.client.auth.getSession();
    return data?.session ?? null;
  },

  async getCurrentUser() {
    try {
      // Priorité 1 : _userId déjà connu (set par init() ou signIn)
      if (this._userId) {
        const { data: { user } } = await this.client.auth.getUser();
        if (user) return user;
      }
      // Priorité 2 : récupérer via session
      const { data: { session } } = await this.client.auth.getSession();
      if (session?.user) {
        this._userId = session.user.id;
        return session.user;
      }
      return null;
    } catch(e) {
      console.warn('[DB.getCurrentUser]', e.message);
      return null;
    }
  },

  // ── Profil utilisateur ──
  async getProfile(userId) {
    const { data } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .limit(1);
    return data?.[0] ?? null;
  },

  async upsertProfile(profile) {
    const { data, error } = await this.client
      .from('profiles')
      .upsert(profile, { onConflict: 'id' })
      .select()
      .limit(1);
    if (error) throw error;
    return data?.[0];
  },

  // ══════════════════════════════════════════════
  //  TRANSACTIONS (revenus + dépenses)
  //  Table : famille_transactions
  // ══════════════════════════════════════════════

  async getTransactions({ type = null, month = null, year = null, userId = null } = {}) {
    let query = this.client
      .from('famille_transactions')
      .select('*')
      .order('date', { ascending: false });

    const uid = userId || this._userId;
    if (uid) query = query.eq('user_id', uid);
    if (type) query = query.eq('type', type);

    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2,'0')}-01`;
      const endMonth  = month === 12 ? 1 : month + 1;
      const endYear   = month === 12 ? year + 1 : year;
      const endDate   = `${endYear}-${String(endMonth).padStart(2,'0')}-01`;
      query = query.gte('date', startDate).lt('date', endDate);
    }

    const { data, error } = await query.limit(500);
    if (error) {
      console.warn('DB.getTransactions error:', error.message);
      return [];
    }
    return data || [];
  },

  async addTransaction(tx) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Session expirée — veuillez vous reconnecter');

    const payload = {
      user_id:        user.id,
      type:           tx.type,
      amount:         tx.amount,
      date:           tx.date,
      category:       tx.category,
      description:    tx.description || null,
      payment_method: tx.payment_method || 'cash',
    };

    const { data, error } = await this.client
      .from('famille_transactions')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateTransaction(id, updates) {
    const { data, error } = await this.client
      .from('famille_transactions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteTransaction(id) {
    const { error } = await this.client
      .from('famille_transactions')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // ══════════════════════════════════════════════
  //  ABONNEMENTS
  //  Table : famille_abonnements
  // ══════════════════════════════════════════════

  async getAbonnements(userId = null) {
    const uid = userId || this._userId;
    let query = this.client
      .from('famille_abonnements')
      .select('*')
      .order('next_date', { ascending: true });
    if (uid) query = query.eq('user_id', uid);
    const { data, error } = await query.limit(200);
    if (error) { console.warn('DB.getAbonnements:', error.message); return []; }
    return data || [];
  },

  async addAbonnement(sub) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Non connecté');
    const { data, error } = await this.client
      .from('famille_abonnements')
      .insert({ ...sub, user_id: user.id })
      .select().single();
    if (error) throw error;
    return data;
  },

  async updateAbonnement(id, updates) {
    const { data, error } = await this.client
      .from('famille_abonnements')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteAbonnement(id) {
    const { error } = await this.client.from('famille_abonnements').delete().eq('id', id);
    if (error) throw error;
  },

  // ══════════════════════════════════════════════
  //  PRÊTS / CRÉDITS
  //  Table : famille_prets
  // ══════════════════════════════════════════════

  async getPrets(userId = null) {
    const uid = userId || this._userId;
    let query = this.client.from('famille_prets').select('*').order('start_date', { ascending: false });
    if (uid) query = query.eq('user_id', uid);
    const { data, error } = await query.limit(100);
    if (error) { console.warn('DB.getPrets:', error.message); return []; }
    return data || [];
  },

  async addPret(loan) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Non connecté');
    const { data, error } = await this.client
      .from('famille_prets')
      .insert({ ...loan, user_id: user.id })
      .select().single();
    if (error) throw error;
    return data;
  },

  async updatePret(id, updates) {
    const { data, error } = await this.client
      .from('famille_prets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deletePret(id) {
    const { error } = await this.client.from('famille_prets').delete().eq('id', id);
    if (error) throw error;
  },

  // ══════════════════════════════════════════════
  //  BUDGETS
  //  Table : famille_budgets
  // ══════════════════════════════════════════════

  async getBudgets(userId = null, month = null, year = null) {
    const uid = userId || this._userId;
    let query = this.client.from('famille_budgets').select('*');
    if (uid) query = query.eq('user_id', uid);
    if (month) query = query.eq('month', month);
    if (year)  query = query.eq('year',  year);
    const { data, error } = await query.limit(200);
    if (error) { console.warn('DB.getBudgets:', error.message); return []; }
    return data || [];
  },

  async upsertBudget(budget) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Non connecté');
    const payload = { ...budget, user_id: user.id };
    const { data, error } = await this.client
      .from('famille_budgets')
      .upsert(payload, { onConflict: 'user_id,category,month,year' })
      .select().single();
    if (error) throw error;
    return data;
  },

  async deleteBudget(id) {
    const { error } = await this.client.from('famille_budgets').delete().eq('id', id);
    if (error) throw error;
  },

  // ══════════════════════════════════════════════
  //  OBJECTIFS D'ÉPARGNE
  //  Table : famille_objectifs
  // ══════════════════════════════════════════════

  async getObjectifs(userId = null) {
    const uid = userId || this._userId;
    let query = this.client.from('famille_objectifs').select('*').order('created_at', { ascending: false });
    if (uid) query = query.eq('user_id', uid);
    const { data, error } = await query.limit(50);
    if (error) { console.warn('DB.getObjectifs:', error.message); return []; }
    return data || [];
  },

  async addObjectif(goal) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Non connecté');
    const { data, error } = await this.client
      .from('famille_objectifs')
      .insert({ ...goal, user_id: user.id })
      .select().single();
    if (error) throw error;
    return data;
  },

  async updateObjectif(id, updates) {
    const { data, error } = await this.client
      .from('famille_objectifs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteObjectif(id) {
    const { error } = await this.client.from('famille_objectifs').delete().eq('id', id);
    if (error) throw error;
  },

  // ══════════════════════════════════════════════
  //  STATS MENSUELLES RAPIDES
  // ══════════════════════════════════════════════

  async getMonthStats(userId, month, year) {
    const uid = userId || this._userId;
    const startDate = `${year}-${String(month).padStart(2,'0')}-01`;
    const endMonth  = month === 12 ? 1 : month + 1;
    const endYear   = month === 12 ? year + 1 : year;
    const endDate   = `${endYear}-${String(endMonth).padStart(2,'0')}-01`;

    const { data, error } = await this.client
      .from('famille_transactions')
      .select('type, amount')
      .eq('user_id', uid)
      .gte('date', startDate)
      .lt('date', endDate);

    if (error) return { income: 0, expenses: 0, balance: 0 };

    const income   = (data || []).filter(t => t.type === 'income').reduce((s,t) => s + (t.amount || 0), 0);
    const expenses = (data || []).filter(t => t.type === 'expense').reduce((s,t) => s + (t.amount || 0), 0);
    return { income, expenses, balance: income - expenses };
  },

  // ══════════════════════════════════════════════
  //  HELPERS OFFLINE-FIRST
  // ══════════════════════════════════════════════

  _isConnected() {
    return !!this.client && !!this._userId;
  },

  // ── Initialisation : récupère la session Supabase et set _userId ──
  async init() {
    try {
      const { data: { session } } = await this.client.auth.getSession();
      if (session?.user) {
        this._userId = session.user.id;
        console.log('[DB] Session Supabase OK — userId:', this._userId);
      } else {
        this._userId = null;
        console.warn('[DB] Pas de session Supabase active');
      }
    } catch(e) {
      this._userId = null;
      console.warn('[DB] Erreur getSession:', e.message);
    }

    // Écouter les changements d'auth pour mettre à jour _userId
    this.client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        this._userId = session?.user?.id || null;
        console.log('[DB] Auth event:', event, '— userId:', this._userId);
      } else if (event === 'SIGNED_OUT') {
        this._userId = null;
        console.log('[DB] SIGNED_OUT — userId réinitialisé');
      }
    });
    return this;
  },
};

// ── isDemoMode : vérifie la session Supabase réelle (plus AppState.user) ──
// Retourne true seulement si aucune session active OU si c'est un user démo
DB.isDemoMode = () => {
  // Si _userId est défini et ne commence pas par 'demo-', on est connecté réellement
  if (DB._userId && !DB._userId.startsWith('demo-')) return false;
  // Fallback : vérifier AppState si disponible
  if (typeof AppState !== 'undefined' && AppState.user) {
    return AppState.user.id?.startsWith('demo-') || false;
  }
  return true; // Par défaut : mode démo si aucune session trouvée
};

// ── Auto-init au chargement ──
// On lance l'init dès que le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => DB.init());
} else {
  DB.init();
}
