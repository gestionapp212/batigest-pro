// ============================================================
//  Abonnements récurrents
// ============================================================

const Subscriptions = {
  data: [],

  async render() {
    document.getElementById('app').innerHTML = Components.dashboardLayout(Components.spinner(), '/dashboard/subscriptions');
    if (window.lucide) lucide.createIcons();
    await this.load();
  },

  async load() {
    const { data } = await db
      .from('recurring_expenses')
      .select('*')
      .eq('family_id', Auth.currentFamily?.family_id)
      .order('created_at', { ascending: false });
    this.data = data || [];
    this.renderContent();
  },

  renderContent() {
    const active = this.data.filter(s => s.is_active);
    const totalMonthly = active.reduce((sum, s) => {
      const amt = parseFloat(s.amount);
      if (s.frequency === 'weekly') return sum + amt * 4.33;
      if (s.frequency === 'quarterly') return sum + amt / 3;
      if (s.frequency === 'yearly') return sum + amt / 12;
      return sum + amt;
    }, 0);

    document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Abonnements & Récurrents</h1>
        <p class="page-sub">Gérez vos dépenses récurrentes et abonnements</p>
      </div>
      <button class="btn btn--primary" onclick="Subscriptions.showForm()">
        <i data-lucide="plus"></i> Ajouter
      </button>
    </div>

    <div class="stats-grid stats-grid--3">
      <div class="stat-card">
        <div class="stat-card__body">
          <div class="stat-card__label">Coût mensuel total</div>
          <div class="stat-card__value">${Utils.currency(totalMonthly)}</div>
        </div>
        <div class="stat-card__icon" style="background:#8b5cf620;color:#8b5cf6"><i data-lucide="calendar"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-card__body">
          <div class="stat-card__label">Abonnements actifs</div>
          <div class="stat-card__value">${active.length}</div>
        </div>
        <div class="stat-card__icon" style="background:#10b98120;color:#10b981"><i data-lucide="check-circle"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-card__body">
          <div class="stat-card__label">Coût annuel estimé</div>
          <div class="stat-card__value">${Utils.currency(totalMonthly * 12)}</div>
        </div>
        <div class="stat-card__icon" style="background:#f59e0b20;color:#f59e0b"><i data-lucide="trending-up"></i></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h2 class="card-title"><i data-lucide="calendar"></i> Liste des abonnements</h2></div>
      ${this.data.length === 0
        ? Components.empty('📅', 'Aucun abonnement', 'Ajoutez vos abonnements (Netflix, électricité, loyer...)', '<button class="btn btn--primary" onclick="Subscriptions.showForm()">+ Ajouter</button>')
        : `<div class="sub-list">
            ${this.data.map(s => {
              const freq = Utils.FREQUENCIES.find(f => f.value === s.frequency);
              return `<div class="sub-card ${!s.is_active ? 'sub-card--inactive' : ''}">
                <div class="sub-card__icon" style="background:${s.color || '#6366f1'}20;color:${s.color || '#6366f1'}">
                  ${s.emoji || '📦'}
                </div>
                <div class="sub-card__body">
                  <div class="sub-card__name">${s.name}</div>
                  <div class="sub-card__meta">${freq?.label || s.frequency} • ${s.category || '—'}</div>
                  ${s.next_date ? `<div class="sub-card__next">Prochain : ${Utils.dateShort(s.next_date)}</div>` : ''}
                </div>
                <div class="sub-card__right">
                  <div class="sub-card__amount">${Utils.currency(s.amount)}<span class="sub-card__freq">/${freq?.label?.slice(0,3) || 'mois'}</span></div>
                  <div class="sub-card__actions">
                    <button class="btn-icon" onclick="Subscriptions.toggle('${s.id}', ${s.is_active})" title="${s.is_active ? 'Désactiver' : 'Activer'}">
                      <i data-lucide="${s.is_active ? 'pause' : 'play'}"></i>
                    </button>
                    <button class="btn-icon btn-icon--danger" onclick="Subscriptions.delete('${s.id}')"><i data-lucide="trash-2"></i></button>
                  </div>
                </div>
              </div>`;
            }).join('')}
          </div>`
      }
    </div>`;
    if (window.lucide) lucide.createIcons();
  },

  showForm() {
    Components.showModal(`
    <div class="modal">
      <div class="modal-header">
        <h3>Nouvel abonnement récurrent</h3>
        <button onclick="closeModal()"><i data-lucide="x"></i></button>
      </div>
      <form id="sub-form" class="modal-body">
        <div class="form-row">
          <div class="form-group" style="flex:0 0 60px">
            <label class="form-label">Emoji</label>
            <input type="text" id="f-emoji" class="form-input" value="📦" maxlength="2" style="font-size:1.5rem;text-align:center" />
          </div>
          <div class="form-group">
            <label class="form-label">Nom *</label>
            <input type="text" id="f-name" class="form-input" placeholder="Ex: Netflix, Loyer, Électricité..." required />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Montant (DH) *</label>
            <input type="number" step="0.01" min="0" id="f-amount" class="form-input" placeholder="0.00" required />
          </div>
          <div class="form-group">
            <label class="form-label">Fréquence *</label>
            <select id="f-freq" class="form-input">${Utils.selectOptions(Utils.FREQUENCIES, 'monthly')}</select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Catégorie</label>
            <select id="f-cat" class="form-input">${Utils.selectOptions(Utils.EXPENSE_CATS, 'factures')}</select>
          </div>
          <div class="form-group">
            <label class="form-label">Prochain paiement</label>
            <input type="date" id="f-next" class="form-input" value="${Utils.todayISO()}" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Notes</label>
          <input type="text" id="f-notes" class="form-input" placeholder="Notes optionnelles..." />
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn--ghost" onclick="closeModal()">Annuler</button>
          <button type="submit" class="btn btn--primary">Enregistrer</button>
        </div>
      </form>
    </div>`);

    document.getElementById('sub-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const { error } = await db.from('recurring_expenses').insert({
        family_id: Auth.currentFamily.family_id,
        user_id: Auth.currentUser.id,
        name: document.getElementById('f-name').value,
        emoji: document.getElementById('f-emoji').value,
        amount: parseFloat(document.getElementById('f-amount').value),
        frequency: document.getElementById('f-freq').value,
        category: document.getElementById('f-cat').value,
        next_date: document.getElementById('f-next').value,
        notes: document.getElementById('f-notes').value,
        is_active: true,
      });
      if (error) { Utils.toast('Erreur : ' + error.message, 'error'); return; }
      closeModal();
      Utils.toast('Abonnement ajouté !', 'success');
      await this.load();
    });
  },

  async toggle(id, current) {
    await db.from('recurring_expenses').update({ is_active: !current }).eq('id', id);
    await this.load();
  },

  async delete(id) {
    if (!confirm('Supprimer cet abonnement ?')) return;
    await db.from('recurring_expenses').delete().eq('id', id);
    Utils.toast('Abonnement supprimé', 'info');
    await this.load();
  },
};
window.Subscriptions = Subscriptions;
