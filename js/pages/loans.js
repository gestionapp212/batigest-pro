// ============================================================
//  Crédits & Prêts
// ============================================================

const Loans = {
  data: [],

  async render() {
    document.getElementById('app').innerHTML = Components.dashboardLayout(Components.spinner(), '/dashboard/loans');
    if (window.lucide) lucide.createIcons();
    await this.load();
  },

  async load() {
    const { data } = await db
      .from('loans')
      .select('*')
      .eq('family_id', Auth.currentFamily?.family_id)
      .order('created_at', { ascending: false });
    this.data = data || [];
    this.renderContent();
  },

  renderContent() {
    const active = this.data.filter(l => l.status === 'active');
    const totalRemaining = active.reduce((s, l) => s + parseFloat(l.remaining_amount || l.amount || 0), 0);
    const totalMonthly = active.reduce((s, l) => s + parseFloat(l.monthly_payment || 0), 0);

    document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Crédits & Prêts</h1>
        <p class="page-sub">Suivez vos emprunts et remboursements</p>
      </div>
      <button class="btn btn--primary" onclick="Loans.showForm()">
        <i data-lucide="plus"></i> Ajouter un crédit
      </button>
    </div>

    <div class="stats-grid stats-grid--3">
      <div class="stat-card">
        <div class="stat-card__body">
          <div class="stat-card__label">Total restant dû</div>
          <div class="stat-card__value amount--neg">${Utils.currency(totalRemaining)}</div>
        </div>
        <div class="stat-card__icon" style="background:#ef444420;color:#ef4444"><i data-lucide="credit-card"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-card__body">
          <div class="stat-card__label">Mensualités totales</div>
          <div class="stat-card__value">${Utils.currency(totalMonthly)}</div>
        </div>
        <div class="stat-card__icon" style="background:#f59e0b20;color:#f59e0b"><i data-lucide="calendar"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-card__body">
          <div class="stat-card__label">Crédits actifs</div>
          <div class="stat-card__value">${active.length}</div>
        </div>
        <div class="stat-card__icon" style="background:#3b82f620;color:#3b82f6"><i data-lucide="activity"></i></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h2 class="card-title"><i data-lucide="credit-card"></i> Mes crédits</h2></div>
      ${this.data.length === 0
        ? Components.empty('💳', 'Aucun crédit', 'Ajoutez vos prêts et crédits pour les suivre.', '<button class="btn btn--primary" onclick="Loans.showForm()">+ Ajouter</button>')
        : `<div class="loan-list">
            ${this.data.map(l => {
              const remaining = parseFloat(l.remaining_amount || l.amount || 0);
              const total = parseFloat(l.amount || 0);
              const paid = total - remaining;
              const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
              const statusBadge = {
                active: '<span class="badge badge--green">Actif</span>',
                paid: '<span class="badge badge--blue">Remboursé</span>',
                overdue: '<span class="badge badge--red">En retard</span>',
              }[l.status] || '';
              return `<div class="loan-card">
                <div class="loan-card__header">
                  <div>
                    <div class="loan-card__name">${l.name}</div>
                    <div class="loan-card__meta">${l.lender || '—'} ${l.interest_rate ? '• ' + l.interest_rate + '%' : ''}</div>
                  </div>
                  <div class="loan-card__right">
                    ${statusBadge}
                    <div class="loan-card__amount">${Utils.currency(remaining)}</div>
                    <div class="text-muted" style="font-size:.75rem">restant / ${Utils.currency(total)}</div>
                  </div>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width:${pct}%;background:#10b981"></div>
                </div>
                <div class="loan-card__footer">
                  <span class="text-muted">${pct}% remboursé</span>
                  <span class="text-muted">Mensualité : ${Utils.currency(l.monthly_payment || 0)}</span>
                  <span class="text-muted">${l.end_date ? 'Fin : ' + Utils.dateShort(l.end_date) : ''}</span>
                  <div>
                    <button class="btn-icon" onclick="Loans.markPaid('${l.id}')" title="Marquer remboursé"><i data-lucide="check"></i></button>
                    <button class="btn-icon btn-icon--danger" onclick="Loans.delete('${l.id}')"><i data-lucide="trash-2"></i></button>
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
        <h3>Nouveau crédit / prêt</h3>
        <button onclick="closeModal()"><i data-lucide="x"></i></button>
      </div>
      <form id="loan-form" class="modal-body">
        <div class="form-group">
          <label class="form-label">Nom du crédit *</label>
          <input type="text" id="f-name" class="form-input" placeholder="Ex: Crédit voiture, Prêt immobilier..." required />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Montant total (DH) *</label>
            <input type="number" step="0.01" min="0" id="f-amount" class="form-input" placeholder="0.00" required />
          </div>
          <div class="form-group">
            <label class="form-label">Montant restant (DH)</label>
            <input type="number" step="0.01" min="0" id="f-remaining" class="form-input" placeholder="= montant total si nouveau" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Mensualité (DH)</label>
            <input type="number" step="0.01" min="0" id="f-monthly" class="form-input" placeholder="0.00" />
          </div>
          <div class="form-group">
            <label class="form-label">Taux d'intérêt (%)</label>
            <input type="number" step="0.01" min="0" id="f-rate" class="form-input" placeholder="Ex: 4.5" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Prêteur / Banque</label>
            <input type="text" id="f-lender" class="form-input" placeholder="Ex: CIH Bank, Attijariwafa..." />
          </div>
          <div class="form-group">
            <label class="form-label">Date de fin</label>
            <input type="date" id="f-end" class="form-input" />
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn--ghost" onclick="closeModal()">Annuler</button>
          <button type="submit" class="btn btn--primary">Enregistrer</button>
        </div>
      </form>
    </div>`);

    document.getElementById('loan-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('f-amount').value);
      const remaining = parseFloat(document.getElementById('f-remaining').value) || amount;
      const { error } = await db.from('loans').insert({
        family_id: Auth.currentFamily.family_id,
        user_id: Auth.currentUser.id,
        name: document.getElementById('f-name').value,
        amount, remaining_amount: remaining,
        monthly_payment: parseFloat(document.getElementById('f-monthly').value) || 0,
        interest_rate: parseFloat(document.getElementById('f-rate').value) || null,
        lender: document.getElementById('f-lender').value,
        end_date: document.getElementById('f-end').value || null,
        status: 'active',
        start_date: Utils.todayISO(),
      });
      if (error) { Utils.toast('Erreur : ' + error.message, 'error'); return; }
      closeModal();
      Utils.toast('Crédit enregistré !', 'success');
      await this.load();
    });
  },

  async markPaid(id) {
    if (!confirm('Marquer ce crédit comme remboursé ?')) return;
    await db.from('loans').update({ status: 'paid', remaining_amount: 0 }).eq('id', id);
    Utils.toast('Crédit marqué comme remboursé ✅', 'success');
    await this.load();
  },

  async delete(id) {
    if (!confirm('Supprimer ce crédit ?')) return;
    await db.from('loans').delete().eq('id', id);
    Utils.toast('Crédit supprimé', 'info');
    await this.load();
  },
};
window.Loans = Loans;
