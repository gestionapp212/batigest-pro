// ============================================================
//  Dépenses — CRUD complet
// ============================================================

const Expenses = {
  data: [],

  async render() {
    document.getElementById('app').innerHTML = Components.dashboardLayout(Components.spinner(), '/dashboard/expenses');
    if (window.lucide) lucide.createIcons();
    await this.load();
  },

  async load() {
    try {
      const familyId = Auth.currentFamily?.family_id;
      const { data } = await db
        .from('transactions')
        .select('*')
        .eq('family_id', familyId)
        .eq('type', 'expense')
        .order('date', { ascending: false });
      this.data = data || [];
      this.renderContent();
    } catch (err) {
      document.getElementById('page-content').innerHTML = `<div class="alert alert--error">${err.message}</div>`;
    }
  },

  renderContent() {
    const total = this.data.reduce((s, t) => s + parseFloat(t.amount), 0);
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthTotal = this.data.filter(t => t.date?.slice(0,7)===thisMonth).reduce((s,t)=>s+parseFloat(t.amount),0);

    // Répartition par catégorie
    const byCat = {};
    this.data.forEach(t => { byCat[t.category] = (byCat[t.category]||0) + parseFloat(t.amount); });
    const topCat = Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,3);

    document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Dépenses</h1>
        <p class="page-sub">Gérez et catégorisez vos dépenses</p>
      </div>
      <button class="btn btn--danger" onclick="Expenses.showForm()">
        <i data-lucide="plus"></i> Ajouter une dépense
      </button>
    </div>

    <div class="stats-grid stats-grid--3">
      <div class="stat-card stat-card--expense">
        <div class="stat-card__body">
          <div class="stat-card__label">Total dépenses</div>
          <div class="stat-card__value">${Utils.currency(total)}</div>
        </div>
        <div class="stat-card__icon" style="background:#ef444420;color:#ef4444">
          <i data-lucide="trending-down"></i>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card__body">
          <div class="stat-card__label">Ce mois-ci</div>
          <div class="stat-card__value">${Utils.currency(monthTotal)}</div>
        </div>
        <div class="stat-card__icon" style="background:#f59e0b20;color:#f59e0b">
          <i data-lucide="calendar"></i>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card__body">
          <div class="stat-card__label">Top catégorie</div>
          <div class="stat-card__value">${topCat[0] ? Utils.getCat(topCat[0][0],'expense').icon + ' ' + Utils.getCat(topCat[0][0],'expense').label : '—'}</div>
        </div>
        <div class="stat-card__icon" style="background:#6366f120;color:#6366f1">
          <i data-lucide="pie-chart"></i>
        </div>
      </div>
    </div>

    ${topCat.length > 0 ? `
    <div class="card">
      <div class="card-header"><h2 class="card-title"><i data-lucide="pie-chart"></i> Top catégories</h2></div>
      <div class="cat-bars">
        ${topCat.map(([cat, amt]) => {
          const c = Utils.getCat(cat,'expense');
          const pct = Utils.pct(amt, total);
          return `<div class="cat-bar-item">
            <div class="cat-bar-label"><span>${c.icon} ${c.label}</span><span class="fw-bold">${Utils.currency(amt)}</span></div>
            <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${pct}%;background:${c.color}"></div></div>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}

    <div class="card">
      <div class="card-header">
        <h2 class="card-title"><i data-lucide="trending-down"></i> Historique des dépenses</h2>
      </div>
      ${this.data.length === 0
        ? Components.empty('💸', 'Aucune dépense', 'Enregistrez vos premières dépenses.', '<button class="btn btn--danger" onclick="Expenses.showForm()">+ Ajouter</button>')
        : `<div class="table-wrap">
            <table class="table">
              <thead><tr><th>Date</th><th>Catégorie</th><th>Description</th><th>Méthode</th><th>Montant</th><th></th></tr></thead>
              <tbody>
                ${this.data.map(t => {
                  const cat = Utils.getCat(t.category,'expense');
                  const pm = Utils.PAYMENT_METHODS.find(m=>m.value===t.payment_method);
                  return `<tr>
                    <td>${Utils.dateShort(t.date)}</td>
                    <td><span class="badge" style="background:${cat.color}20;color:${cat.color}">${cat.icon} ${cat.label}</span></td>
                    <td class="text-muted">${t.description||'—'}</td>
                    <td class="text-muted">${pm?.label||'—'}</td>
                    <td><span class="amount--neg fw-bold">-${Utils.currency(t.amount)}</span></td>
                    <td><button class="btn-icon btn-icon--danger" onclick="Expenses.delete('${t.id}')"><i data-lucide="trash-2"></i></button></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>`
      }
    </div>`;
    if (window.lucide) lucide.createIcons();
  },

  showForm() {
    Components.showModal(`
    <div class="modal">
      <div class="modal-header">
        <h3>Nouvelle dépense</h3>
        <button onclick="closeModal()"><i data-lucide="x"></i></button>
      </div>
      <form id="exp-form" class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Montant (DH) *</label>
            <input type="number" step="0.01" min="0" id="f-amount" class="form-input" placeholder="0.00" required />
          </div>
          <div class="form-group">
            <label class="form-label">Date *</label>
            <input type="date" id="f-date" class="form-input" value="${Utils.todayISO()}" required />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Catégorie *</label>
            <select id="f-cat" class="form-input">${Utils.selectOptions(Utils.EXPENSE_CATS, 'alimentation')}</select>
          </div>
          <div class="form-group">
            <label class="form-label">Méthode de paiement</label>
            <select id="f-pm" class="form-input">${Utils.selectOptions(Utils.PAYMENT_METHODS, 'cash')}</select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <input type="text" id="f-desc" class="form-input" placeholder="Ex: Courses Carrefour" />
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn--ghost" onclick="closeModal()">Annuler</button>
          <button type="submit" class="btn btn--danger">Enregistrer</button>
        </div>
      </form>
    </div>`);
    document.getElementById('exp-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const { error } = await db.from('transactions').insert({
        family_id: Auth.currentFamily.family_id,
        user_id: Auth.currentUser.id,
        type: 'expense',
        amount: parseFloat(document.getElementById('f-amount').value),
        date: document.getElementById('f-date').value,
        category: document.getElementById('f-cat').value,
        payment_method: document.getElementById('f-pm').value,
        description: document.getElementById('f-desc').value,
      });
      if (error) { Utils.toast('Erreur : ' + error.message, 'error'); return; }
      closeModal();
      Utils.toast('Dépense enregistrée !', 'success');
      await this.load();
    });
  },

  async delete(id) {
    if (!confirm('Supprimer cette dépense ?')) return;
    await db.from('transactions').delete().eq('id', id);
    Utils.toast('Dépense supprimée', 'info');
    await this.load();
  },
};
window.Expenses = Expenses;
