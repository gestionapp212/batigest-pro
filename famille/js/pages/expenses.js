// =====================================================
// Family Cash Flow — Page Dépenses (v5.0 — Supabase)
// =====================================================

let expensesData = [];
let expenseFilters = { category: '', payment: '', search: '' };
let expensesLoading = false;

async function loadExpensesPage() {
  AppState.currentPage = 'expenses';

  renderExpensesLayout();
  await refreshExpensesData();
}

async function refreshExpensesData() {
  if (expensesLoading) return;
  expensesLoading = true;

  if (DB.isDemoMode()) {
    expensesData = [
      { id:'e1',  type:'expense', category:'alimentation', amount:3200, description:'Supermarché Marjane', date:'2025-04-03', payment_method:'card' },
      { id:'e2',  type:'expense', category:'transport',    amount:800,  description:'Carburant',            date:'2025-04-04', payment_method:'cash' },
      { id:'e3',  type:'expense', category:'logement',     amount:4000, description:'Loyer',                date:'2025-04-01', payment_method:'transfer' },
      { id:'e4',  type:'expense', category:'education',    amount:1200, description:'Cours particuliers',   date:'2025-04-08', payment_method:'cash' },
      { id:'e5',  type:'expense', category:'sante',        amount:350,  description:'Pharmacie',            date:'2025-04-09', payment_method:'card' },
      { id:'e6',  type:'expense', category:'loisirs',      amount:600,  description:'Cinéma + restaurant',  date:'2025-04-15', payment_method:'card' },
      { id:'e7',  type:'expense', category:'vetements',    amount:450,  description:'Vêtements enfants',    date:'2025-04-11', payment_method:'card' },
      { id:'e8',  type:'expense', category:'alimentation', amount:1800, description:'Boucherie + légumes',  date:'2025-04-18', payment_method:'cash' },
      { id:'e9',  type:'expense', category:'electricite',  amount:620,  description:'Facture ONE',          date:'2025-04-05', payment_method:'mobile' },
      { id:'e10', type:'expense', category:'internet',     amount:299,  description:'Forfait Maroc Telecom',date:'2025-04-10', payment_method:'mobile' },
    ];
  } else {
    try {
      expensesData = await DB.getTransactions({ type: 'expense', userId: AppState.user?.id });
    } catch (err) {
      console.error('Erreur chargement dépenses:', err);
      showToast('Erreur de chargement des dépenses', 'error');
      expensesData = [];
    }
  }

  expensesLoading = false;
  renderExpensesLayout();
}

function renderExpensesLayout() {
  const month = AppState.currentMonth;
  const year  = AppState.currentYear;
  const monthLabel = MONTHS_FR[month - 1] + ' ' + year;

  // Filtrer
  const filtered = expensesData.filter(t => {
    const d = new Date(t.date);
    const inMonth   = d.getMonth() + 1 === month && d.getFullYear() === year;
    const inCat     = !expenseFilters.category || t.category === expenseFilters.category;
    const inPayment = !expenseFilters.payment  || t.payment_method === expenseFilters.payment;
    const inSearch  = !expenseFilters.search   ||
      t.description?.toLowerCase().includes(expenseFilters.search.toLowerCase()) ||
      getCategoryInfo(t.category, 'expense').label.toLowerCase().includes(expenseFilters.search.toLowerCase());
    return inMonth && inCat && inPayment && inSearch;
  });

  const total = filtered.reduce((s,t) => s + (t.amount || 0), 0);

  // Par catégorie
  const byCat = {};
  filtered.forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
  const sortedCats = Object.entries(byCat).sort((a,b) => b[1]-a[1]);

  const html = `
  <div class="fade-in">

    <!-- Stats -->
    <div class="stats-row" style="margin-bottom:20px;">
      <div class="stat-pill">
        <div class="stat-dot" style="background:var(--danger);"></div>
        Total dépenses : <strong style="margin-left:4px;">${formatCurrency(total)}</strong>
      </div>
      <div class="stat-pill">
        <div class="stat-dot" style="background:var(--primary);"></div>
        ${filtered.length} transaction(s)
      </div>
      <div class="stat-pill">
        <div class="stat-dot" style="background:var(--text-muted);"></div>
        Catégories : ${Object.keys(byCat).length}
      </div>
      ${expensesLoading ? `<div class="stat-pill"><i class="fas fa-spinner fa-spin" style="color:var(--primary);"></i> Chargement...</div>` : ''}
    </div>

    <div class="grid-2" style="margin-bottom:20px;">

      <!-- Top catégories -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-ranking-star" style="color:var(--accent);"></i> Top catégories</div>
          <span style="font-size:12px;color:var(--text-muted);">${monthLabel}</span>
        </div>
        ${sortedCats.length ? sortedCats.map(([key, amt]) => {
          const cat = getCategoryInfo(key, 'expense');
          return `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-light);">
            <div style="width:34px;height:34px;border-radius:var(--radius);background:${cat.color}22;
                        display:flex;align-items:center;justify-content:center;font-size:16px;">${cat.icon}</div>
            <div style="flex:1;">
              <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                <span style="font-size:13px;font-weight:500;">${cat.label}</span>
                <span class="amount-negative">-${formatCurrency(amt)}</span>
              </div>
              <div class="progress-bar" style="height:5px;">
                <div class="progress-fill" style="width:${pct(amt,total)}%;background:${cat.color};"></div>
              </div>
            </div>
            <span style="font-size:11px;color:var(--text-muted);min-width:32px;text-align:right;">${pct(amt,total)}%</span>
          </div>`;
        }).join('') : '<div class="empty-state" style="padding:20px;"><span>Aucune dépense</span></div>'}
      </div>

      <!-- Graphique donut -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-chart-pie" style="color:var(--danger);"></i> Répartition</div>
        </div>
        <div style="display:flex;gap:12px;align-items:center;">
          <div class="chart-wrapper" style="height:180px;width:180px;flex-shrink:0;">
            <canvas id="exp-donut"></canvas>
          </div>
          <div id="exp-legend" style="flex:1;font-size:12px;"></div>
        </div>
      </div>
    </div>

    <!-- Liste principale -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <i class="fas fa-list-check" style="color:var(--danger);"></i>
          Dépenses — ${monthLabel}
        </div>
        <button class="btn btn-danger btn-sm" onclick="openExpenseModal()">
          <i class="fas fa-plus"></i> Ajouter
        </button>
      </div>

      <!-- Filtres -->
      <div class="filters-bar">
        <div class="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="text" class="filter-input" placeholder="Rechercher..."
                 value="${expenseFilters.search}"
                 oninput="expenseFilters.search=this.value; renderExpensesLayout()">
        </div>
        <select class="filter-select" onchange="expenseFilters.category=this.value; renderExpensesLayout()">
          <option value="">Toutes catégories</option>
          ${EXPENSE_CATEGORIES.map(c => `<option value="${c.value}" ${expenseFilters.category===c.value?'selected':''}>${c.icon} ${c.label}</option>`).join('')}
        </select>
        <select class="filter-select" onchange="expenseFilters.payment=this.value; renderExpensesLayout()">
          <option value="">Tous modes</option>
          ${PAYMENT_METHODS.map(m => `<option value="${m.value}" ${expenseFilters.payment===m.value?'selected':''}>${m.icon} ${m.label}</option>`).join('')}
        </select>
        <button class="btn btn-ghost btn-sm" onclick="exportExpensesCSV()">
          <i class="fas fa-download"></i> Export CSV
        </button>
      </div>

      <!-- Tableau -->
      ${filtered.length > 0 ? `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Catégorie</th>
              <th>Description</th>
              <th>Mode</th>
              <th style="text-align:right;">Montant</th>
              <th style="text-align:center;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.sort((a,b) => new Date(b.date)-new Date(a.date)).map(t => {
              const cat = getCategoryInfo(t.category, 'expense');
              const pm  = getPaymentMethodInfo(t.payment_method);
              return `
              <tr>
                <td style="color:var(--text-muted);font-size:12px;">${formatDate(t.date)}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:6px;">
                    <div style="width:28px;height:28px;border-radius:6px;background:${cat.color}22;
                                display:flex;align-items:center;justify-content:center;font-size:14px;">${cat.icon}</div>
                    <span style="font-size:13px;">${cat.label}</span>
                  </div>
                </td>
                <td style="font-weight:500;">${escapeHtml(t.description || '—')}</td>
                <td><span class="badge badge-gray">${pm.icon} ${pm.label}</span></td>
                <td style="text-align:right;" class="amount-negative">-${formatCurrency(t.amount)}</td>
                <td style="text-align:center;">
                  <button class="btn btn-ghost btn-sm btn-icon" onclick="deleteExpense('${t.id}')"
                          data-tooltip="Supprimer">
                    <i class="fas fa-trash-alt" style="color:var(--danger);font-size:12px;"></i>
                  </button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:var(--secondary-bg);">
              <td colspan="4" style="font-weight:700;padding:12px 14px;font-size:13px;">Total dépenses</td>
              <td style="text-align:right;font-weight:800;font-size:15px;color:var(--danger);padding:12px 14px;">
                -${formatCurrency(total)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>` : `
      <div class="empty-state">
        <div class="empty-icon">🧾</div>
        <div class="empty-title">Aucune dépense ce mois-ci</div>
        <div class="empty-desc">Enregistrez vos dépenses pour suivre votre budget</div>
        <button class="btn btn-danger" onclick="openExpenseModal()">
          <i class="fas fa-plus"></i> Ajouter une dépense
        </button>
      </div>`}
    </div>

  </div>

  <!-- Modal Ajout Dépense -->
  <div class="modal-overlay" id="expense-modal">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Ajouter une dépense</h3>
        <button class="modal-close" onclick="closeExpenseModal()"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <form id="expense-form" onsubmit="saveExpense(event)">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Montant <span class="required">*</span></label>
              <div style="position:relative;">
                <input type="number" id="exp-amount" class="form-input" placeholder="0.00" min="0" step="0.01" required style="padding-right:50px;">
                <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:12px;color:var(--text-muted);font-weight:600;">
                  ${AppState.currency || 'MAD'}
                </span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Date <span class="required">*</span></label>
              <input type="date" id="exp-date" class="form-input" value="${isoDate()}" required>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Catégorie <span class="required">*</span></label>
            <select id="exp-category" class="form-select" required>
              <option value="">Sélectionner...</option>
              ${EXPENSE_CATEGORIES.map(c => `<option value="${c.value}">${c.icon} ${c.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <input type="text" id="exp-desc" class="form-input" placeholder="Ex: Supermarché Marjane">
          </div>
          <div class="form-group">
            <label class="form-label">Mode de paiement</label>
            <select id="exp-payment" class="form-select">
              ${PAYMENT_METHODS.map(m => `<option value="${m.value}">${m.icon} ${m.label}</option>`).join('')}
            </select>
          </div>
          <div class="modal-footer" style="padding:0;margin-top:8px;">
            <button type="button" class="btn btn-ghost" onclick="closeExpenseModal()">Annuler</button>
            <button type="submit" class="btn btn-danger" id="expense-save-btn">
              <i class="fas fa-check"></i> Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>`;

  renderLayout(html, 'Dépenses', monthLabel);

  // Graphique donut
  setTimeout(() => renderExpenseDonut(sortedCats, total), 100);
}

function renderExpenseDonut(sortedCats, total) {
  const canvas = el('exp-donut');
  if (!canvas || !sortedCats.length) return;
  const ctx = canvas.getContext('2d');

  const top5 = sortedCats.slice(0, 5);
  const colors = top5.map(([key]) => getCategoryInfo(key, 'expense').color || '#64748b');

  if (canvas._chart) canvas._chart.destroy();
  canvas._chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: top5.map(([key]) => getCategoryInfo(key, 'expense').label),
      datasets: [{ data: top5.map(([,v]) => v), backgroundColor: colors, borderWidth: 2, borderColor: 'transparent' }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '65%',
      plugins: { legend: { display: false } }
    }
  });

  const legend = el('exp-legend');
  if (legend) {
    legend.innerHTML = top5.map(([key, amt], i) => {
      const cat = getCategoryInfo(key, 'expense');
      return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
        <div style="width:10px;height:10px;border-radius:50%;background:${colors[i]};flex-shrink:0;"></div>
        <span style="flex:1;">${cat.label}</span>
        <strong>${pct(amt,total)}%</strong>
      </div>`;
    }).join('');
  }
}

function openExpenseModal() {
  el('expense-modal')?.classList.add('open');
  el('exp-amount')?.focus();
}

function closeExpenseModal() {
  el('expense-modal')?.classList.remove('open');
  el('expense-form')?.reset();
}

async function saveExpense(e) {
  e.preventDefault();
  const amount   = parseFloat(el('exp-amount')?.value);
  const date     = el('exp-date')?.value;
  const category = el('exp-category')?.value;
  const desc     = el('exp-desc')?.value;
  const payment  = el('exp-payment')?.value;
  const btn      = el('expense-save-btn');

  if (!amount || !date || !category) {
    showToast('Remplissez tous les champs obligatoires', 'error');
    return;
  }

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sauvegarde...'; }

  if (DB.isDemoMode()) {
    expensesData.unshift({
      id: 'e' + Date.now(),
      type: 'expense', amount, date, category,
      description: desc, payment_method: payment,
      created_at: new Date().toISOString()
    });
    showToast(`Dépense de ${formatCurrency(amount)} ajoutée ! (mode démo)`, 'info');
    closeExpenseModal();
    renderExpensesLayout();
  } else {
    try {
      const saved = await DB.addTransaction({
        type: 'expense', amount, date, category,
        description: desc, payment_method: payment
      });
      expensesData.unshift(saved);
      showToast(`✅ Dépense de ${formatCurrency(amount)} enregistrée !`, 'success');
      closeExpenseModal();
      renderExpensesLayout();
    } catch (err) {
      console.error('Erreur saveExpense:', err);
      showToast(`Erreur : ${err.message}`, 'error');
    }
  }

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Enregistrer'; }
}

async function deleteExpense(id) {
  if (!confirm('Supprimer cette dépense ?')) return;

  if (DB.isDemoMode()) {
    expensesData = expensesData.filter(t => t.id !== id);
    showToast('Dépense supprimée', 'info');
    renderExpensesLayout();
    return;
  }

  try {
    await DB.deleteTransaction(id);
    expensesData = expensesData.filter(t => t.id !== id);
    showToast('Dépense supprimée', 'info');
    renderExpensesLayout();
  } catch (err) {
    showToast(`Erreur suppression : ${err.message}`, 'error');
  }
}

function exportExpensesCSV() {
  const month = AppState.currentMonth;
  const year  = AppState.currentYear;
  const filtered = expensesData.filter(t => {
    const d = new Date(t.date);
    return d.getMonth()+1 === month && d.getFullYear() === year;
  });

  let csv = 'Date,Catégorie,Description,Mode,Montant\n';
  filtered.forEach(t => {
    const cat = getCategoryInfo(t.category, 'expense');
    const pm  = getPaymentMethodInfo(t.payment_method);
    csv += `${t.date},"${cat.label}","${t.description || ''}","${pm.label}",${t.amount}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `depenses_${MONTHS_FR[month-1]}_${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Export CSV téléchargé', 'success');
}
