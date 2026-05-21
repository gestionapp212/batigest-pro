// ============================================================
//  Budgets par catégorie
// ============================================================

const Budgets = {
  data: [],
  transactions: [],

  async render() {
    document.getElementById('app').innerHTML = Components.dashboardLayout(Components.spinner(), '/dashboard/budgets');
    if (window.lucide) lucide.createIcons();
    await this.load();
  },

  async load() {
    const familyId = Auth.currentFamily?.family_id;
    const now = new Date();
    const month = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}`;

    const [budgetsRes, txRes] = await Promise.all([
      db.from('budgets').select('*').eq('family_id', familyId).eq('month', month),
      db.from('transactions').select('amount,category').eq('family_id', familyId)
        .eq('type', 'expense').gte('date', month + '-01').lte('date', month + '-31'),
    ]);

    this.data = budgetsRes.data || [];
    this.transactions = txRes.data || [];
    this.currentMonth = month;
    this.renderContent();
  },

  renderContent() {
    const month = this.currentMonth;
    const spentByCategory = {};
    this.transactions.forEach(t => {
      spentByCategory[t.category] = (spentByCategory[t.category] || 0) + parseFloat(t.amount);
    });

    const totalBudget = this.data.reduce((s, b) => s + parseFloat(b.amount), 0);
    const totalSpent = this.data.reduce((s, b) => s + (spentByCategory[b.category] || 0), 0);
    const overBudget = this.data.filter(b => (spentByCategory[b.category] || 0) > parseFloat(b.amount));

    document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Budgets</h1>
        <p class="page-sub">Contrôlez vos dépenses par catégorie — ${Utils.monthName(new Date().getMonth())} ${new Date().getFullYear()}</p>
      </div>
      <button class="btn btn--primary" onclick="Budgets.showForm()">
        <i data-lucide="plus"></i> Définir un budget
      </button>
    </div>

    ${overBudget.length > 0 ? `
    <div class="alert alert--error">
      🚨 <strong>${overBudget.length} catégorie(s)</strong> ont dépassé leur budget : 
      ${overBudget.map(b => Utils.getCat(b.category,'expense').label).join(', ')}
    </div>` : ''}

    <div class="stats-grid stats-grid--3">
      <div class="stat-card">
        <div class="stat-card__body">
          <div class="stat-card__label">Budget total planifié</div>
          <div class="stat-card__value">${Utils.currency(totalBudget)}</div>
        </div>
        <div class="stat-card__icon" style="background:#6366f120;color:#6366f1"><i data-lucide="target"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-card__body">
          <div class="stat-card__label">Dépensé (budgets)</div>
          <div class="stat-card__value">${Utils.currency(totalSpent)}</div>
        </div>
        <div class="stat-card__icon" style="background:#ef444420;color:#ef4444"><i data-lucide="trending-down"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-card__body">
          <div class="stat-card__label">Restant disponible</div>
          <div class="stat-card__value ${totalBudget - totalSpent >= 0 ? 'amount--pos' : 'amount--neg'}">${Utils.currency(totalBudget - totalSpent)}</div>
        </div>
        <div class="stat-card__icon" style="background:#10b98120;color:#10b981"><i data-lucide="wallet"></i></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h2 class="card-title"><i data-lucide="target"></i> Budgets par catégorie</h2></div>
      ${this.data.length === 0
        ? Components.empty('🎯', 'Aucun budget défini', 'Définissez des budgets pour mieux contrôler vos dépenses.', '<button class="btn btn--primary" onclick="Budgets.showForm()">+ Définir un budget</button>')
        : `<div class="budget-list">
            ${this.data.map(b => {
              const cat = Utils.getCat(b.category, 'expense');
              const spent = spentByCategory[b.category] || 0;
              const budget = parseFloat(b.amount);
              const pct = Math.min(Utils.pct(spent, budget), 100);
              const over = spent > budget;
              const barColor = over ? '#ef4444' : pct > 80 ? '#f59e0b' : '#10b981';
              return `<div class="budget-item">
                <div class="budget-item__header">
                  <div class="budget-item__cat">
                    <span class="budget-item__icon" style="background:${cat.color}20;color:${cat.color}">${cat.icon}</span>
                    <span class="fw-medium">${cat.label}</span>
                    ${over ? '<span class="badge badge--red">Dépassé !</span>' : pct > 80 ? '<span class="badge badge--yellow">Attention</span>' : ''}
                  </div>
                  <div class="budget-item__amounts">
                    <span class="${over ? 'amount--neg fw-bold' : ''}">${Utils.currency(spent)}</span>
                    <span class="text-muted"> / ${Utils.currency(budget)}</span>
                  </div>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width:${pct}%;background:${barColor}"></div>
                </div>
                <div class="budget-item__footer">
                  <span class="text-muted">${pct}% utilisé</span>
                  <span class="text-muted">${over ? '⚠️ -' + Utils.currency(spent - budget) : 'Reste : ' + Utils.currency(budget - spent)}</span>
                  <div>
                    <button class="btn-icon" onclick="Budgets.showEdit('${b.id}','${b.category}',${budget})" title="Modifier"><i data-lucide="edit-2"></i></button>
                    <button class="btn-icon btn-icon--danger" onclick="Budgets.delete('${b.id}')"><i data-lucide="trash-2"></i></button>
                  </div>
                </div>
              </div>`;
            }).join('')}
          </div>`
      }
    </div>`;
    if (window.lucide) lucide.createIcons();
  },

  showForm(cat = '', amount = '') {
    const existing = this.data.map(b => b.category);
    const available = Utils.EXPENSE_CATS.filter(c => !existing.includes(c.value) || c.value === cat);
    Components.showModal(`
    <div class="modal">
      <div class="modal-header">
        <h3>${cat ? 'Modifier le budget' : 'Définir un budget'}</h3>
        <button onclick="closeModal()"><i data-lucide="x"></i></button>
      </div>
      <form id="budget-form" class="modal-body">
        <div class="form-group">
          <label class="form-label">Catégorie *</label>
          <select id="f-cat" class="form-input" ${cat ? 'disabled' : ''}>
            ${Utils.selectOptions(available, cat || available[0]?.value)}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Budget mensuel (DH) *</label>
          <input type="number" step="0.01" min="0" id="f-amount" class="form-input" value="${amount}" placeholder="0.00" required />
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn--ghost" onclick="closeModal()">Annuler</button>
          <button type="submit" class="btn btn--primary">Enregistrer</button>
        </div>
      </form>
    </div>`);
    document.getElementById('budget-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const category = cat || document.getElementById('f-cat').value;
      const amt = parseFloat(document.getElementById('f-amount').value);
      const existing = this.data.find(b => b.category === category);
      let error;
      if (existing && !cat) {
        ({ error } = await db.from('budgets').update({ amount: amt }).eq('id', existing.id));
      } else if (cat) {
        ({ error } = await db.from('budgets').update({ amount: amt }).eq('family_id', Auth.currentFamily.family_id).eq('category', cat).eq('month', this.currentMonth));
      } else {
        ({ error } = await db.from('budgets').insert({ family_id: Auth.currentFamily.family_id, category, amount: amt, month: this.currentMonth }));
      }
      if (error) { Utils.toast('Erreur : ' + error.message, 'error'); return; }
      closeModal();
      Utils.toast('Budget enregistré !', 'success');
      await this.load();
    });
  },

  showEdit(id, cat, amount) { this.showForm(cat, amount); },

  async delete(id) {
    if (!confirm('Supprimer ce budget ?')) return;
    await db.from('budgets').delete().eq('id', id);
    Utils.toast('Budget supprimé', 'info');
    await this.load();
  },
};
window.Budgets = Budgets;
