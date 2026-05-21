// ============================================================
//  Revenus — CRUD complet
// ============================================================

const Income = {
  data: [],

  async render() {
    const app = document.getElementById('app');
    app.innerHTML = Components.dashboardLayout(Components.spinner(), '/dashboard/income');
    if (window.lucide) lucide.createIcons();
    await this.load();
  },

  async load() {
    try {
      const familyId = Auth.currentFamily?.family_id;
      if (!familyId) return;
      const { data } = await db
        .from('transactions')
        .select('*')
        .eq('family_id', familyId)
        .eq('type', 'income')
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
    const monthTotal = this.data
      .filter(t => t.date?.slice(0, 7) === thisMonth)
      .reduce((s, t) => s + parseFloat(t.amount), 0);

    document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Revenus</h1>
        <p class="page-sub">Gérez tous vos revenus familiaux</p>
      </div>
      <button class="btn btn--primary" onclick="Income.showForm()">
        <i data-lucide="plus"></i> Ajouter un revenu
      </button>
    </div>

    <!-- Stats -->
    <div class="stats-grid stats-grid--3">
      <div class="stat-card stat-card--income">
        <div class="stat-card__body">
          <div class="stat-card__label">Total des revenus</div>
          <div class="stat-card__value">${Utils.currency(total)}</div>
        </div>
        <div class="stat-card__icon" style="background:#10b98120;color:#10b981">
          <i data-lucide="trending-up"></i>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card__body">
          <div class="stat-card__label">Ce mois-ci</div>
          <div class="stat-card__value">${Utils.currency(monthTotal)}</div>
        </div>
        <div class="stat-card__icon" style="background:#3b82f620;color:#3b82f6">
          <i data-lucide="calendar"></i>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card__body">
          <div class="stat-card__label">Nombre d'entrées</div>
          <div class="stat-card__value">${this.data.length}</div>
        </div>
        <div class="stat-card__icon" style="background:#8b5cf620;color:#8b5cf6">
          <i data-lucide="list"></i>
        </div>
      </div>
    </div>

    <!-- Tableau -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title"><i data-lucide="trending-up"></i> Historique des revenus</h2>
      </div>
      ${this.data.length === 0
        ? Components.empty('💰', 'Aucun revenu enregistré', 'Ajoutez votre premier revenu pour commencer.', '<button class="btn btn--primary" onclick="Income.showForm()">+ Ajouter un revenu</button>')
        : `<div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Date</th><th>Catégorie</th><th>Description</th><th>Méthode</th><th>Montant</th><th></th>
                </tr>
              </thead>
              <tbody>
                ${this.data.map(t => {
                  const cat = Utils.getCat(t.category, 'income');
                  const pm = Utils.PAYMENT_METHODS.find(m => m.value === t.payment_method);
                  return `<tr>
                    <td>${Utils.dateShort(t.date)}</td>
                    <td><span class="badge" style="background:${cat.color}20;color:${cat.color}">${cat.icon} ${cat.label}</span></td>
                    <td class="text-muted">${t.description || '—'}</td>
                    <td class="text-muted">${pm?.label || t.payment_method || '—'}</td>
                    <td><span class="amount--pos fw-bold">+${Utils.currency(t.amount)}</span></td>
                    <td><button class="btn-icon btn-icon--danger" onclick="Income.delete('${t.id}')" title="Supprimer">
                      <i data-lucide="trash-2"></i>
                    </button></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>`
      }
    </div>`;
    if (window.lucide) lucide.createIcons();
  },

  showForm(tx = null) {
    Components.showModal(`
    <div class="modal">
      <div class="modal-header">
        <h3>${tx ? 'Modifier le revenu' : 'Nouveau revenu'}</h3>
        <button onclick="closeModal()"><i data-lucide="x"></i></button>
      </div>
      <form id="income-form" class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Montant (DH) *</label>
            <input type="number" step="0.01" min="0" id="f-amount" class="form-input" value="${tx?.amount || ''}" placeholder="0.00" required />
          </div>
          <div class="form-group">
            <label class="form-label">Date *</label>
            <input type="date" id="f-date" class="form-input" value="${tx?.date || Utils.todayISO()}" required />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Catégorie *</label>
            <select id="f-cat" class="form-input">
              ${Utils.selectOptions(Utils.INCOME_CATS, tx?.category || 'salaire')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Méthode de paiement</label>
            <select id="f-pm" class="form-input">
              ${Utils.selectOptions(Utils.PAYMENT_METHODS, tx?.payment_method || 'transfer')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <input type="text" id="f-desc" class="form-input" value="${tx?.description || ''}" placeholder="Ex: Salaire mars" />
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn--ghost" onclick="closeModal()">Annuler</button>
          <button type="submit" class="btn btn--primary">Enregistrer</button>
        </div>
      </form>
    </div>`);

    document.getElementById('income-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.save(tx?.id);
    });
  },

  async save(id) {
    const familyId = Auth.currentFamily?.family_id;
    const payload = {
      family_id: familyId,
      user_id: Auth.currentUser.id,
      type: 'income',
      amount: parseFloat(document.getElementById('f-amount').value),
      date: document.getElementById('f-date').value,
      category: document.getElementById('f-cat').value,
      payment_method: document.getElementById('f-pm').value,
      description: document.getElementById('f-desc').value,
    };
    const { error } = id
      ? await db.from('transactions').update(payload).eq('id', id)
      : await db.from('transactions').insert(payload);
    if (error) { Utils.toast('Erreur : ' + error.message, 'error'); return; }
    closeModal();
    Utils.toast('Revenu enregistré !', 'success');
    await this.load();
  },

  async delete(id) {
    if (!confirm('Supprimer ce revenu ?')) return;
    await db.from('transactions').delete().eq('id', id);
    Utils.toast('Revenu supprimé', 'info');
    await this.load();
  },
};

window.Income = Income;
