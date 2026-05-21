// =====================================================
// Family Cash Flow — Page Revenus (v5.0 — Supabase)
// =====================================================

let incomeData = [];
let incomeFilters = { category: '', search: '', month: null, year: null };
let incomeLoading = false;

async function loadIncomePage() {
  AppState.currentPage = 'income';
  incomeFilters.month = AppState.currentMonth;
  incomeFilters.year  = AppState.currentYear;

  // Rendu initial avec skeleton
  renderIncomeLayout();

  // Chargement des données réelles (Supabase ou démo)
  await refreshIncomeData();
}

async function refreshIncomeData() {
  if (incomeLoading) return;
  incomeLoading = true;

  if (DB.isDemoMode()) {
    // Mode démo : données fictives
    incomeData = [
      { id:'i1', type:'income', category:'salaire',   amount:12000, description:'Salaire Avril',    date:'2025-04-02', payment_method:'transfer' },
      { id:'i2', type:'income', category:'commerce',  amount:5500,  description:'Ventes boutique',  date:'2025-04-05', payment_method:'cash' },
      { id:'i3', type:'income', category:'freelance', amount:2000,  description:'Mission Web',       date:'2025-04-10', payment_method:'transfer' },
      { id:'i4', type:'income', category:'salaire',   amount:8000,  description:'Salaire conjoint',  date:'2025-04-02', payment_method:'transfer' },
      { id:'i5', type:'income', category:'loyer',     amount:3200,  description:'Loyer appartement',date:'2025-04-01', payment_method:'transfer' },
      { id:'i6', type:'income', category:'salaire',   amount:12000, description:'Salaire Mars',      date:'2025-03-02', payment_method:'transfer' },
      { id:'i7', type:'income', category:'commerce',  amount:4800,  description:'Ventes Mars',       date:'2025-03-08', payment_method:'cash' },
    ];
  } else {
    try {
      // Charger TOUS les revenus (pas de filtre mois ici, on filtre côté JS pour les stats)
      incomeData = await DB.getTransactions({ type: 'income', userId: AppState.user?.id });
    } catch (err) {
      console.error('Erreur chargement revenus:', err);
      showToast('Erreur de chargement des revenus', 'error');
      incomeData = [];
    }
  }

  incomeLoading = false;
  renderIncomeLayout();
}

function renderIncomeLayout() {
  const month = incomeFilters.month || AppState.currentMonth;
  const year  = incomeFilters.year  || AppState.currentYear;
  const monthLabel = MONTHS_FR[month - 1] + ' ' + year;

  // Filtrer les données
  const filtered = incomeData.filter(t => {
    const d = new Date(t.date);
    const inMonth  = d.getMonth() + 1 === month && d.getFullYear() === year;
    const inCat    = !incomeFilters.category || t.category === incomeFilters.category;
    const inSearch = !incomeFilters.search   ||
      t.description?.toLowerCase().includes(incomeFilters.search.toLowerCase()) ||
      getCategoryInfo(t.category, 'income').label.toLowerCase().includes(incomeFilters.search.toLowerCase());
    return inMonth && inCat && inSearch;
  });

  const total = filtered.reduce((s,t) => s + (t.amount || 0), 0);

  // Par catégorie
  const byCat = {};
  filtered.forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });

  // Calcul évolution sur 6 mois pour graphique
  const last6 = [];
  for (let i = 5; i >= 0; i--) {
    let m = month - i; let y = year;
    if (m <= 0) { m += 12; y -= 1; }
    const monthTotal = incomeData.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() + 1 === m && d.getFullYear() === y;
    }).reduce((s,t) => s + (t.amount || 0), 0);
    last6.push({ label: MONTHS_FR[m-1].slice(0,3), value: monthTotal });
  }

  const html = `
  <div class="fade-in">

    <!-- Stats row -->
    <div class="stats-row" style="margin-bottom:20px;">
      <div class="stat-pill">
        <div class="stat-dot" style="background:var(--secondary);"></div>
        Total revenus : <strong style="margin-left:4px;">${formatCurrency(total)}</strong>
      </div>
      <div class="stat-pill">
        <div class="stat-dot" style="background:var(--primary);"></div>
        ${filtered.length} transaction(s)
      </div>
      <div class="stat-pill">
        <div class="stat-dot" style="background:var(--accent);"></div>
        Moyenne : <strong style="margin-left:4px;">${filtered.length ? formatCurrency(total/filtered.length) : formatCurrency(0)}</strong>
      </div>
      ${incomeLoading ? `<div class="stat-pill"><i class="fas fa-spinner fa-spin" style="color:var(--primary);"></i> Chargement...</div>` : ''}
    </div>

    <div class="grid-2" style="margin-bottom:20px;">

      <!-- Par catégorie -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-chart-donut" style="color:var(--secondary);"></i> Par catégorie</div>
          <span style="font-size:12px;color:var(--text-muted);">${monthLabel}</span>
        </div>
        <div>
          ${INCOME_CATEGORIES.map(cat => {
            const amt = byCat[cat.value] || 0;
            if (!amt) return '';
            return `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-light);">
              <span style="font-size:18px;">${cat.icon}</span>
              <div style="flex:1;">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                  <span style="font-size:13px;font-weight:500;">${cat.label}</span>
                  <span style="font-size:13px;font-weight:700;color:var(--secondary);">${formatCurrency(amt)}</span>
                </div>
                <div class="progress-bar" style="height:5px;">
                  <div class="progress-fill green" style="width:${pct(amt, total)}%;background:${cat.color};"></div>
                </div>
              </div>
              <span style="font-size:11px;color:var(--text-muted);min-width:35px;text-align:right;">${pct(amt,total)}%</span>
            </div>`;
          }).filter(Boolean).join('') || '<div class="empty-state" style="padding:20px;"><span>Aucun revenu ce mois</span></div>'}
        </div>
      </div>

      <!-- Graphique évolution mensuelle -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-chart-line" style="color:var(--primary);"></i> Évolution mensuelle</div>
        </div>
        <div class="chart-wrapper" style="height:200px;">
          <canvas id="income-chart"></canvas>
        </div>
      </div>
    </div>

    <!-- Tableau principal -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <i class="fas fa-list" style="color:var(--secondary);"></i>
          Revenus — ${monthLabel}
        </div>
        <button class="btn btn-secondary btn-sm" onclick="openIncomeModal()">
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
                 value="${incomeFilters.search}"
                 oninput="incomeFilters.search=this.value; renderIncomeLayout()">
        </div>
        <select class="filter-select" onchange="incomeFilters.category=this.value; renderIncomeLayout()">
          <option value="">Toutes catégories</option>
          ${INCOME_CATEGORIES.map(c => `<option value="${c.value}" ${incomeFilters.category===c.value?'selected':''}>${c.icon} ${c.label}</option>`).join('')}
        </select>
        <select class="filter-select" onchange="changeIncomeMonth(this.value)">
          ${MONTHS_FR.map((m, i) => `<option value="${i+1}" ${(i+1)===month?'selected':''}>${m} ${year}</option>`).join('')}
        </select>
        <button class="btn btn-ghost btn-sm" onclick="exportIncomeCSV()">
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
              const cat = getCategoryInfo(t.category, 'income');
              const pm  = getPaymentMethodInfo(t.payment_method);
              return `
              <tr>
                <td style="color:var(--text-muted);font-size:12px;">${formatDate(t.date)}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:6px;">
                    <span style="font-size:16px;">${cat.icon}</span>
                    <span style="font-size:13px;">${cat.label}</span>
                  </div>
                </td>
                <td style="font-weight:500;">${escapeHtml(t.description || '—')}</td>
                <td><span class="badge badge-gray">${pm.icon} ${pm.label}</span></td>
                <td style="text-align:right;" class="amount-positive">+${formatCurrency(t.amount)}</td>
                <td style="text-align:center;">
                  <button class="btn btn-ghost btn-sm btn-icon" onclick="deleteIncome('${t.id}')"
                          data-tooltip="Supprimer">
                    <i class="fas fa-trash-alt" style="color:var(--danger);font-size:12px;"></i>
                  </button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:var(--secondary-bg);">
              <td colspan="4" style="font-weight:700;padding:12px 14px;font-size:13px;">Total revenus</td>
              <td style="text-align:right;font-weight:800;font-size:15px;color:var(--secondary);padding:12px 14px;">
                +${formatCurrency(total)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>` : `
      <div class="empty-state">
        <div class="empty-icon">💰</div>
        <div class="empty-title">Aucun revenu ce mois-ci</div>
        <div class="empty-desc">Ajoutez votre premier revenu pour commencer le suivi financier</div>
        <button class="btn btn-secondary" onclick="openIncomeModal()">
          <i class="fas fa-plus"></i> Ajouter un revenu
        </button>
      </div>`}
    </div>

  </div>

  <!-- Modal Ajout Revenu -->
  <div class="modal-overlay" id="income-modal">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Ajouter un revenu</h3>
        <button class="modal-close" onclick="closeIncomeModal()"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <form id="income-form" onsubmit="saveIncome(event)">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Montant <span class="required">*</span></label>
              <div style="position:relative;">
                <input type="number" id="inc-amount" class="form-input" placeholder="0.00" min="0" step="0.01" required style="padding-right:50px;">
                <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:12px;color:var(--text-muted);font-weight:600;">
                  ${AppState.currency || 'MAD'}
                </span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Date <span class="required">*</span></label>
              <input type="date" id="inc-date" class="form-input" value="${isoDate()}" required>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Catégorie <span class="required">*</span></label>
            <select id="inc-category" class="form-select" required>
              <option value="">Sélectionner...</option>
              ${INCOME_CATEGORIES.map(c => `<option value="${c.value}">${c.icon} ${c.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <input type="text" id="inc-desc" class="form-input" placeholder="Ex: Salaire Avril 2025">
          </div>
          <div class="form-group">
            <label class="form-label">Mode de paiement</label>
            <select id="inc-payment" class="form-select">
              ${PAYMENT_METHODS.map(m => `<option value="${m.value}">${m.icon} ${m.label}</option>`).join('')}
            </select>
          </div>
          <div class="modal-footer" style="padding:0;margin-top:8px;">
            <button type="button" class="btn btn-ghost" onclick="closeIncomeModal()">Annuler</button>
            <button type="submit" class="btn btn-secondary" id="income-save-btn">
              <i class="fas fa-check"></i> Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>`;

  renderLayout(html, 'Revenus', MONTHS_FR[month - 1] + ' ' + year);

  // Graphique
  setTimeout(() => renderIncomeLineChart(last6), 100);
}

function renderIncomeLineChart(last6Data) {
  const canvas = el('income-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const isDark = AppState.theme === 'dark';
  const textColor = isDark ? '#94A3B8' : '#64748B';

  if (canvas._chart) canvas._chart.destroy();
  canvas._chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: (last6Data || []).map(d => d.label),
      datasets: [{
        label: 'Revenus',
        data: (last6Data || []).map(d => d.value),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16,185,129,0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#10B981',
        pointRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${formatCurrency(ctx.raw)}` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: textColor, font: { size: 11 } } },
        y: {
          grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
          ticks: { color: textColor, callback: v => formatCurrencyShort(v), font: { size: 11 } }
        }
      }
    }
  });
}

function changeIncomeMonth(month) {
  incomeFilters.month = parseInt(month);
  renderIncomeLayout();
}

function openIncomeModal() {
  el('income-modal')?.classList.add('open');
  el('inc-amount')?.focus();
}

function closeIncomeModal() {
  el('income-modal')?.classList.remove('open');
  el('income-form')?.reset();
}

async function saveIncome(e) {
  e.preventDefault();
  const amount   = parseFloat(el('inc-amount')?.value);
  const date     = el('inc-date')?.value;
  const category = el('inc-category')?.value;
  const desc     = el('inc-desc')?.value;
  const payment  = el('inc-payment')?.value;
  const btn      = el('income-save-btn');

  if (!amount || !date || !category) {
    showToast('Remplissez tous les champs obligatoires', 'error');
    return;
  }

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sauvegarde...'; }

  if (DB.isDemoMode()) {
    // Mode démo : ajout local uniquement
    incomeData.unshift({
      id: 'i' + Date.now(),
      type: 'income', amount, date, category,
      description: desc, payment_method: payment,
      created_at: new Date().toISOString()
    });
    showToast(`Revenu de ${formatCurrency(amount)} ajouté ! (mode démo)`, 'info');
    closeIncomeModal();
    renderIncomeLayout();
  } else {
    try {
      const saved = await DB.addTransaction({
        type: 'income', amount, date, category,
        description: desc, payment_method: payment
      });
      incomeData.unshift(saved);
      showToast(`✅ Revenu de ${formatCurrency(amount)} enregistré !`, 'success');
      closeIncomeModal();
      renderIncomeLayout();
    } catch (err) {
      console.error('Erreur saveIncome:', err);
      showToast(`Erreur : ${err.message}`, 'error');
    }
  }

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Enregistrer'; }
}

async function deleteIncome(id) {
  if (!confirm('Supprimer ce revenu ?')) return;

  if (DB.isDemoMode()) {
    incomeData = incomeData.filter(t => t.id !== id);
    showToast('Revenu supprimé', 'info');
    renderIncomeLayout();
    return;
  }

  try {
    await DB.deleteTransaction(id);
    incomeData = incomeData.filter(t => t.id !== id);
    showToast('Revenu supprimé', 'info');
    renderIncomeLayout();
  } catch (err) {
    showToast(`Erreur suppression : ${err.message}`, 'error');
  }
}

function exportIncomeCSV() {
  const month = incomeFilters.month || AppState.currentMonth;
  const year  = incomeFilters.year  || AppState.currentYear;
  const filtered = incomeData.filter(t => {
    const d = new Date(t.date);
    return d.getMonth()+1 === month && d.getFullYear() === year;
  });

  let csv = 'Date,Catégorie,Description,Mode,Montant\n';
  filtered.forEach(t => {
    const cat = getCategoryInfo(t.category, 'income');
    const pm  = getPaymentMethodInfo(t.payment_method);
    csv += `${t.date},"${cat.label}","${t.description || ''}","${pm.label}",${t.amount}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `revenus_${MONTHS_FR[month-1]}_${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Export CSV téléchargé', 'success');
}
