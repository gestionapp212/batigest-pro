// =====================================================
// Family Cash Flow — Budgets Page
// =====================================================

let budgetsData = [];
let currentExpensesBudget = [];

async function loadBudgetsPage() {
  AppState.currentPage = 'budgets';
  renderBudgetsLayout(); // rendu rapide
  await refreshBudgetsData();
}

async function refreshBudgetsData() {
  const month = AppState.currentMonth;
  const year  = AppState.currentYear;

  if (DB.isDemoMode()) {
    budgetsData = [
      { id:'b1', category:'alimentation', amount:3500, month, year },
      { id:'b2', category:'transport',    amount:1000, month, year },
      { id:'b3', category:'loisirs',      amount:500,  month, year },
      { id:'b4', category:'sante',        amount:400,  month, year },
      { id:'b5', category:'education',    amount:1500, month, year },
      { id:'b6', category:'logement',     amount:4000, month, year },
      { id:'b7', category:'vetements',    amount:600,  month, year },
    ];
    currentExpensesBudget = [
      { category:'alimentation', amount:3200 },
      { category:'transport',    amount:800  },
      { category:'loisirs',      amount:600  },
      { category:'sante',        amount:350  },
      { category:'education',    amount:1200 },
      { category:'logement',     amount:4000 },
      { category:'vetements',    amount:450  },
    ];
  } else {
    try {
      // Charger budgets + dépenses du mois en parallèle
      const [bData, txData] = await Promise.all([
        DB.getBudgets(AppState.user?.id, month, year),
        DB.getTransactions({ type: 'expense', userId: AppState.user?.id, month, year }),
      ]);
      budgetsData = bData;
      // Agréger les dépenses par catégorie
      const bycat = {};
      txData.forEach(t => { bycat[t.category] = (bycat[t.category] || 0) + (t.amount || 0); });
      currentExpensesBudget = Object.entries(bycat).map(([category, amount]) => ({ category, amount }));
    } catch (err) {
      console.error('Erreur budgets:', err);
      showToast('Erreur chargement des budgets', 'error');
      budgetsData = []; currentExpensesBudget = [];
    }
  }
  renderBudgetsLayout();
}

function getSpentForCategory(category) {
  return currentExpensesBudget
    .filter(e => e.category === category)
    .reduce((s, e) => s + e.amount, 0);
}

function renderBudgetsLayout() {
  const month = AppState.currentMonth;
  const year  = AppState.currentYear;
  const monthLabel = MONTHS_FR[month - 1] + ' ' + year;

  const monthBudgets = budgetsData.filter(b => b.month === month && b.year === year);

  const totalBudget  = monthBudgets.reduce((s,b) => s + b.amount, 0);
  const totalSpent   = monthBudgets.reduce((s,b) => s + getSpentForCategory(b.category), 0);
  const totalLeft    = totalBudget - totalSpent;
  const overBudgets  = monthBudgets.filter(b => getSpentForCategory(b.category) > b.amount);

  // Unbudgeted expenses
  const budgetedCats = monthBudgets.map(b => b.category);
  const allExpCats   = [...new Set(currentExpensesBudget.map(e => e.category))];
  const unbudgeted   = allExpCats.filter(c => !budgetedCats.includes(c));

  const html = `
  <div class="fade-in">

    <!-- KPIs -->
    <div class="kpi-grid" style="margin-bottom:24px;">
      <div class="kpi-card blue">
        <div class="kpi-header"><div class="kpi-icon"><i class="fas fa-wallet"></i></div></div>
        <div class="kpi-value">${formatCurrencyShort(totalBudget)}</div>
        <div class="kpi-label">Budget total alloué</div>
      </div>
      <div class="kpi-card ${totalSpent <= totalBudget ? 'green' : 'red'}">
        <div class="kpi-header"><div class="kpi-icon"><i class="fas fa-receipt"></i></div></div>
        <div class="kpi-value">${formatCurrencyShort(totalSpent)}</div>
        <div class="kpi-label">Dépensé ce mois</div>
      </div>
      <div class="kpi-card ${totalLeft >= 0 ? 'green' : 'red'}">
        <div class="kpi-header"><div class="kpi-icon"><i class="fas fa-piggy-bank"></i></div></div>
        <div class="kpi-value" style="color:${totalLeft >= 0 ? 'var(--secondary)' : 'var(--danger)'}">
          ${formatCurrencyShort(Math.abs(totalLeft))}
        </div>
        <div class="kpi-label">${totalLeft >= 0 ? 'Reste disponible' : 'Dépassement'}</div>
      </div>
      <div class="kpi-card ${overBudgets.length === 0 ? 'green' : 'red'}">
        <div class="kpi-header"><div class="kpi-icon"><i class="fas fa-triangle-exclamation"></i></div></div>
        <div class="kpi-value">${overBudgets.length}</div>
        <div class="kpi-label">Budget(s) dépassé(s)</div>
      </div>
    </div>

    ${overBudgets.length > 0 ? `
    <div class="alert alert-danger" style="margin-bottom:16px;">
      <span class="alert-icon">⚠️</span>
      <div>
        <strong>${overBudgets.length} catégorie(s) dépassent leur budget :</strong>
        ${overBudgets.map(b => {
          const spent = getSpentForCategory(b.category);
          const over  = spent - b.amount;
          const cat   = getCategoryInfo(b.category, 'expense');
          return `${cat.icon} ${cat.label} (+${formatCurrency(over)})`;
        }).join(' · ')}
      </div>
    </div>` : `
    <div class="alert alert-success" style="margin-bottom:16px;">
      <span class="alert-icon">✅</span>
      <div>Félicitations ! Tous vos budgets sont respectés ce mois-ci.</div>
    </div>`}

    <div class="grid-2">

      <!-- Budget List -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-sliders" style="color:var(--primary);"></i> Budgets — ${monthLabel}</div>
          <button class="btn btn-primary btn-sm" onclick="openBudgetModal()">
            <i class="fas fa-plus"></i> Ajouter
          </button>
        </div>

        ${monthBudgets.length > 0 ? monthBudgets.map(b => {
          const cat   = getCategoryInfo(b.category, 'expense');
          const spent = getSpentForCategory(b.category);
          const left  = b.amount - spent;
          const p     = pct(spent, b.amount);
          const over  = spent > b.amount;
          const close = !over && p >= 80;

          return `
          <div class="budget-item">
            <div class="budget-header">
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="width:34px;height:34px;border-radius:var(--radius);background:${cat.color}20;
                            display:flex;align-items:center;justify-content:center;font-size:16px;">${cat.icon}</div>
                <div>
                  <div style="font-size:13px;font-weight:600;">${cat.label}</div>
                  <div style="font-size:11px;color:var(--text-muted);">Budget: ${formatCurrency(b.amount)}</div>
                </div>
              </div>
              <div style="text-align:right;display:flex;align-items:center;gap:8px;">
                ${over ? '<span class="badge badge-red">Dépassé ⚠️</span>' : close ? '<span class="badge badge-amber">Proche !</span>' : '<span class="badge badge-green">OK ✓</span>'}
                <button class="btn btn-ghost btn-sm btn-icon" onclick="openEditBudget('${b.id}')" data-tooltip="Modifier">
                  <i class="fas fa-pencil" style="font-size:11px;"></i>
                </button>
                <button class="btn btn-ghost btn-sm btn-icon" onclick="deleteBudget('${b.id}')" data-tooltip="Supprimer">
                  <i class="fas fa-trash-alt" style="color:var(--danger);font-size:11px;"></i>
                </button>
              </div>
            </div>
            <div class="progress-bar" style="height:8px;margin:8px 0;">
              <div class="progress-fill ${over ? 'red' : close ? 'amber' : 'green'}"
                   style="width:${Math.min(100, p)}%;"></div>
            </div>
            <div class="budget-amounts">
              <span>Dépensé: <strong class="${over?'amount-negative':''}">${formatCurrency(spent)}</strong></span>
              <span style="color:${over?'var(--danger)':left<200?'var(--accent)':'var(--secondary)'}">
                ${over ? `Dépassement: ${formatCurrency(Math.abs(left))}` : `Reste: ${formatCurrency(left)}`}
              </span>
            </div>
          </div>`;
        }).join('') : `
        <div class="empty-state" style="padding:32px;">
          <div class="empty-icon">📊</div>
          <div class="empty-title">Aucun budget ce mois</div>
          <div class="empty-desc">Définissez vos plafonds par catégorie</div>
          <button class="btn btn-primary" onclick="openBudgetModal()">
            <i class="fas fa-plus"></i> Créer un budget
          </button>
        </div>`}

        ${unbudgeted.length > 0 ? `
        <div style="margin-top:12px;padding:10px;background:var(--accent-bg);border-radius:var(--radius);font-size:12px;color:#B45309;">
          <strong>⚠️ Catégories sans budget :</strong>
          ${unbudgeted.map(c => {
            const cat = getCategoryInfo(c,'expense');
            return `${cat.icon} ${cat.label}`;
          }).join(', ')}
        </div>` : ''}
      </div>

      <!-- Visual overview -->
      <div>
        <div class="card" style="margin-bottom:16px;">
          <div class="card-header">
            <div class="card-title"><i class="fas fa-chart-bar" style="color:var(--accent);"></i> Vue d'ensemble</div>
          </div>
          <div class="chart-wrapper" style="height:250px;">
            <canvas id="budget-chart"></canvas>
          </div>
        </div>

        <!-- Overall Progress -->
        <div class="card">
          <div class="card-header">
            <div class="card-title"><i class="fas fa-gauge-high" style="color:var(--primary);"></i> Utilisation globale</div>
          </div>
          <div style="text-align:center;padding:16px 0;">
            <div style="font-size:40px;font-weight:800;color:${pct(totalSpent,totalBudget)>100?'var(--danger)':pct(totalSpent,totalBudget)>80?'var(--accent)':'var(--secondary)'};">
              ${pct(totalSpent, totalBudget)}%
            </div>
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">du budget total utilisé</div>
            <div class="progress-bar" style="height:12px;">
              <div class="progress-fill ${pct(totalSpent,totalBudget)>100?'red':pct(totalSpent,totalBudget)>80?'amber':'green'}"
                   style="width:${Math.min(100,pct(totalSpent,totalBudget))}%;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-top:6px;">
              <span>${formatCurrency(totalSpent)}</span>
              <span>${formatCurrency(totalBudget)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- Add Budget Modal -->
  <div class="modal-overlay" id="budget-modal">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title" id="budget-modal-title">Créer un budget</h3>
        <button class="modal-close" onclick="closeBudgetModal()"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <form id="budget-form" onsubmit="saveBudget(event)">
          <input type="hidden" id="budget-edit-id">
          <div class="form-group">
            <label class="form-label">Catégorie <span class="required">*</span></label>
            <select id="budget-category" class="form-select" required>
              <option value="">Sélectionner...</option>
              ${EXPENSE_CATEGORIES.map(c => `<option value="${c.value}">${c.icon} ${c.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Montant alloué <span class="required">*</span></label>
            <div style="position:relative;">
              <input type="number" id="budget-amount" class="form-input" placeholder="0.00" min="0" step="0.01" required style="padding-right:40px;">
              <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:12px;color:var(--text-muted);font-weight:600;">
                ${AppState.currency || 'MAD'}
              </span>
            </div>
          </div>
          <div class="modal-footer" style="padding:0;margin-top:8px;">
            <button type="button" class="btn btn-ghost" onclick="closeBudgetModal()">Annuler</button>
            <button type="submit" class="btn btn-primary" id="budget-save-btn">
              <i class="fas fa-check"></i> <span id="budget-submit-text">Créer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>`;

  renderLayout(html, 'Budgets', `${monthLabel} · ${pct(totalSpent, totalBudget)}% utilisé`);

  setTimeout(() => renderBudgetChart(monthBudgets), 100);
}

function renderBudgetChart(budgets) {
  const canvas = el('budget-chart');
  if (!canvas || !budgets.length) return;
  const ctx = canvas.getContext('2d');
  const isDark = AppState.theme === 'dark';
  const textColor = isDark ? '#94A3B8' : '#64748B';

  const labels = budgets.map(b => getCategoryInfo(b.category,'expense').label);
  const budgetAmts = budgets.map(b => b.amount);
  const spentAmts  = budgets.map(b => getSpentForCategory(b.category));

  if (canvas._chart) canvas._chart.destroy();
  canvas._chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label:'Budget', data:budgetAmts, backgroundColor:'rgba(37,99,235,0.5)', borderRadius:4 },
        { label:'Dépensé', data:spentAmts, backgroundColor: spentAmts.map((s,i) =>
            s > budgetAmts[i] ? 'rgba(239,68,68,0.8)' : 'rgba(16,185,129,0.8)'),
          borderRadius:4 }
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins: {
        legend:{ position:'top', labels:{ color:textColor, font:{size:11}, boxWidth:10 } },
        tooltip:{ callbacks:{ label: ctx=>`  ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` } }
      },
      scales:{
        x:{ grid:{display:false}, ticks:{color:textColor, font:{size:10}} },
        y:{ grid:{color:isDark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)'},
            ticks:{color:textColor, callback:v=>formatCurrencyShort(v), font:{size:10}} }
      }
    }
  });
}

function openBudgetModal() {
  el('budget-modal')?.classList.add('open');
  el('budget-edit-id').value = '';
  el('budget-modal-title').textContent = 'Créer un budget';
  el('budget-submit-text').textContent = 'Créer';
  el('budget-form')?.reset();
}

function openEditBudget(id) {
  const b = budgetsData.find(b => b.id === id);
  if (!b) return;
  el('budget-modal')?.classList.add('open');
  el('budget-edit-id').value = id;
  el('budget-modal-title').textContent = 'Modifier le budget';
  el('budget-submit-text').textContent = 'Modifier';
  if (el('budget-category')) el('budget-category').value = b.category;
  if (el('budget-amount'))   el('budget-amount').value   = b.amount;
}

function closeBudgetModal() {
  el('budget-modal')?.classList.remove('open');
  el('budget-form')?.reset();
}

async function saveBudget(e) {
  e.preventDefault();
  const category = el('budget-category')?.value;
  const amount   = parseFloat(el('budget-amount')?.value);
  const editId   = el('budget-edit-id')?.value;
  const btn      = el('budget-save-btn');

  if (!category || !amount) { showToast('Remplissez tous les champs', 'error'); return; }
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sauvegarde...'; }

  const month = AppState.currentMonth;
  const year  = AppState.currentYear;

  if (DB.isDemoMode()) {
    if (editId) {
      const b = budgetsData.find(b => b.id === editId);
      if (b) { b.category = category; b.amount = amount; }
      showToast('Budget mis à jour ! (démo)', 'info');
    } else {
      const existing = budgetsData.find(b => b.category === category && b.month === month && b.year === year);
      if (existing) { showToast('Budget existant pour cette catégorie', 'warning'); return; }
      budgetsData.push({ id:'b'+Date.now(), category, amount, month, year });
      showToast('Budget créé ! (démo)', 'info');
    }
    closeBudgetModal(); renderBudgetsLayout();
  } else {
    try {
      const saved = await DB.upsertBudget({ category, amount, month, year });
      // Mettre à jour localement
      const idx = budgetsData.findIndex(b => b.category === category && b.month === month && b.year === year);
      if (idx >= 0) budgetsData[idx] = saved; else budgetsData.push(saved);
      showToast(`✅ Budget "${category}" enregistré !`, 'success');
      closeBudgetModal(); renderBudgetsLayout();
    } catch (err) {
      showToast(`Erreur : ${err.message}`, 'error');
    }
  }
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Enregistrer'; }
}

async function deleteBudget(id) {
  if (!confirm('Supprimer ce budget ?')) return;
  if (DB.isDemoMode()) {
    budgetsData = budgetsData.filter(b => b.id !== id);
    showToast('Budget supprimé', 'info'); renderBudgetsLayout(); return;
  }
  try {
    await DB.deleteBudget(id);
    budgetsData = budgetsData.filter(b => b.id !== id);
    showToast('Budget supprimé', 'info'); renderBudgetsLayout();
  } catch (err) { showToast(`Erreur suppression : ${err.message}`, 'error'); }
}
