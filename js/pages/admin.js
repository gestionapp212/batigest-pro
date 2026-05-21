// ============================================================
//  Back-Office Admin
// ============================================================

const Admin = {
  async render() {
    const cfg = window.FCF_CONFIG;
    if (!cfg.ADMIN_EMAILS.includes(Auth.currentUser?.email || '')) {
      Router.navigate('/dashboard');
      return;
    }
    document.getElementById('app').innerHTML = Components.adminLayout(Components.spinner('Chargement back-office...'), '/admin');
    if (window.lucide) lucide.createIcons();
    await this.loadStats();
  },

  async loadStats() {
    try {
      const [usersRes, familiesRes, activeSubsRes, pendingRes, trialRes] = await Promise.all([
        db.from('profiles').select('*', { count: 'exact', head: true }),
        db.from('families').select('*', { count: 'exact', head: true }),
        db.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        db.from('subscriptions').select('*, families(name), plans(name, price)').eq('status', 'pending').order('created_at', { ascending: false }).limit(10),
        db.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'trial'),
      ]);

      const { data: recentUsers } = await db.from('profiles').select('*').order('created_at', { ascending: false }).limit(6);
      const { data: activeSubs } = await db.from('subscriptions').select('plans(price)').eq('status', 'active');
      const monthlyRevenue = (activeSubs || []).reduce((s, sub) => s + parseFloat(sub.plans?.price || 0), 0);

      this.renderContent({
        totalUsers: usersRes.count || 0,
        totalFamilies: familiesRes.count || 0,
        activeSubscriptions: activeSubsRes.count || 0,
        pendingPayments: pendingRes.data?.length || 0,
        trialAccounts: trialRes.count || 0,
        monthlyRevenue,
        pendingList: pendingRes.data || [],
        recentUsers: recentUsers || [],
      });
    } catch (err) {
      document.getElementById('page-content').innerHTML = `<div class="alert alert--error">Erreur : ${err.message}</div>`;
    }
  },

  renderContent(d) {
    document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title" style="color:white">Back-Office Admin</h1>
        <p class="page-sub" style="color:#9ca3af">Family Cash Flow — famille.chan-pro.com</p>
      </div>
      <button class="btn btn--ghost" onclick="Admin.loadStats()"><i data-lucide="refresh-cw"></i> Actualiser</button>
    </div>

    <!-- Stats -->
    <div class="stats-grid">
      ${[
        { label:'Utilisateurs', value: d.totalUsers, icon:'users', color:'#3b82f6', sub: d.totalFamilies + ' familles' },
        { label:'Abonnements actifs', value: d.activeSubscriptions, icon:'check-circle', color:'#10b981', sub: d.trialAccounts + ' en essai' },
        { label:'Paiements en attente', value: d.pendingPayments, icon:'clock', color:'#f59e0b', sub:'À valider manuellement' },
        { label:'Revenu mensuel', value: Utils.currency(d.monthlyRevenue), icon:'dollar-sign', color:'#8b5cf6', sub:'Abonnements actifs', isText: true },
      ].map(s => `
        <div class="stat-card stat-card--dark">
          <div class="stat-card__body">
            <div class="stat-card__label">${s.label}</div>
            <div class="stat-card__value">${s.value}</div>
            <div class="stat-card__sub">${s.sub}</div>
          </div>
          <div class="stat-card__icon" style="background:${s.color}25;color:${s.color}">
            <i data-lucide="${s.icon}"></i>
          </div>
        </div>`).join('')}
    </div>

    <div class="grid-2">
      <!-- Paiements en attente -->
      <div class="card card--dark">
        <div class="card-header">
          <h2 class="card-title"><i data-lucide="clock" style="color:#f59e0b"></i> Paiements en attente
            ${d.pendingPayments > 0 ? `<span class="badge badge--yellow">${d.pendingPayments}</span>` : ''}
          </h2>
        </div>
        ${d.pendingList.length === 0
          ? `<div class="empty-state"><div class="empty-icon">✅</div><p class="text-muted">Aucun paiement en attente</p></div>`
          : d.pendingList.map(p => `
            <div class="pending-item">
              <div class="pending-item__body">
                <div class="fw-medium" style="color:white">${p.families?.name || 'Famille inconnue'}</div>
                <div class="text-muted" style="font-size:.8rem">Plan : ${p.plans?.name || '—'} · ${Utils.dateShort(p.created_at)}</div>
                ${p.payment_reference ? `<div style="color:#f59e0b;font-size:.8rem">Réf : ${p.payment_reference}</div>` : ''}
              </div>
              <div class="pending-item__actions">
                <button class="btn btn--sm btn--success" onclick="Admin.approve('${p.id}')">
                  <i data-lucide="check"></i> Valider
                </button>
                <button class="btn btn--sm btn--ghost" onclick="Admin.reject('${p.id}')">
                  <i data-lucide="x"></i>
                </button>
              </div>
            </div>`).join('')}
      </div>

      <!-- Utilisateurs récents -->
      <div class="card card--dark">
        <div class="card-header"><h2 class="card-title"><i data-lucide="users" style="color:#3b82f6"></i> Utilisateurs récents</h2></div>
        ${d.recentUsers.map(u => `
          <div class="member-item member-item--dark">
            <div class="member-avatar" style="background:${Utils.avatarColor(u.email)}">${Utils.initials(u.full_name, u.email)}</div>
            <div class="member-info">
              <div class="member-name" style="color:white">${u.full_name || 'Sans nom'}</div>
              <div class="member-email">${u.email}</div>
            </div>
            <span class="text-muted" style="font-size:.75rem">${Utils.dateShort(u.created_at)}</span>
          </div>`).join('')}
      </div>
    </div>

    <!-- Infos système -->
    <div class="card card--dark">
      <div class="card-header"><h2 class="card-title">Informations système</h2></div>
      <div class="stats-grid stats-grid--4" style="padding:1rem">
        ${[
          { label:'Version', value:'v2.0.0' },
          { label:'Base de données', value:'Supabase PostgreSQL' },
          { label:'Hébergement', value:'Netlify' },
          { label:'Domaine', value:'famille.chan-pro.com' },
        ].map(s => `<div class="sys-info"><div class="sys-info__label">${s.label}</div><div class="sys-info__value">${s.value}</div></div>`).join('')}
      </div>
    </div>`;

    if (window.lucide) lucide.createIcons();
  },

  async approve(subId) {
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    const { error } = await db.from('subscriptions').update({
      status: 'active',
      start_date: new Date().toISOString(),
      end_date: endDate.toISOString(),
    }).eq('id', subId);
    if (error) { Utils.toast('Erreur : ' + error.message, 'error'); return; }
    Utils.toast('✅ Abonnement activé avec succès !', 'success');
    await this.loadStats();
  },

  async reject(subId) {
    if (!confirm('Rejeter ce paiement ?')) return;
    const { error } = await db.from('subscriptions').update({ status: 'expired' }).eq('id', subId);
    if (error) { Utils.toast('Erreur : ' + error.message, 'error'); return; }
    Utils.toast('Paiement rejeté', 'info');
    await this.loadStats();
  },
};
window.Admin = Admin;
