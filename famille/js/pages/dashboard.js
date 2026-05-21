// =====================================================
// Family Cash Flow — Dashboard Page
// =====================================================

// Demo data
const DEMO_DATA = {
  transactions: [
    { id:'t1', type:'income',  category:'salaire',     amount:12000, description:'Salaire Mars',       date:'2025-04-02', payment_method:'transfer' },
    { id:'t2', type:'income',  category:'commerce',    amount:5500,  description:'Ventes boutique',    date:'2025-04-05', payment_method:'cash' },
    { id:'t3', type:'income',  category:'freelance',   amount:2000,  description:'Mission web',        date:'2025-04-10', payment_method:'transfer' },
    { id:'t4', type:'expense', category:'alimentation',amount:3200,  description:'Supermarché',        date:'2025-04-03', payment_method:'card' },
    { id:'t5', type:'expense', category:'transport',   amount:800,   description:'Carburant',          date:'2025-04-04', payment_method:'cash' },
    { id:'t6', type:'expense', category:'logement',    amount:4000,  description:'Loyer',              date:'2025-04-01', payment_method:'transfer' },
    { id:'t7', type:'expense', category:'education',   amount:1200,  description:'Cours enfants',      date:'2025-04-08', payment_method:'cash' },
    { id:'t8', type:'expense', category:'sante',       amount:350,   description:'Pharmacie',          date:'2025-04-09', payment_method:'card' },
    { id:'t9', type:'expense', category:'loisirs',     amount:600,   description:'Sorties',            date:'2025-04-15', payment_method:'card' },
    { id:'t10',type:'expense', category:'vetements',   amount:450,   description:'Vêtements enfants',  date:'2025-04-11', payment_method:'card' },
  ],
  subscriptions: [
    { id:'s1', name:'Netflix',    amount:99,  frequency:'monthly', next_date:'2025-04-20', active:true },
    { id:'s2', name:'Spotify',    amount:59,  frequency:'monthly', next_date:'2025-04-18', active:true },
    { id:'s3', name:'Eau/Élec',   amount:350, frequency:'monthly', next_date:'2025-04-25', active:true },
    { id:'s4', name:'Internet',   amount:299, frequency:'monthly', next_date:'2025-04-22', active:true },
    { id:'s5', name:'Assurance',  amount:1200,frequency:'quarterly',next_date:'2025-04-28', active:true },
  ],
  loans: [
    { id:'l1', name:'Crédit Voiture', total_amount:80000, monthly_payment:2200, start_date:'2023-01-01', months_total:48, status:'active' },
    { id:'l2', name:'Crédit Maison',  total_amount:500000,monthly_payment:5500, start_date:'2022-06-01', months_total:240,status:'active' },
  ],
  budgets: [
    { id:'b1', category:'alimentation', amount:3500, month:4, year:2025 },
    { id:'b2', category:'transport',    amount:1000, month:4, year:2025 },
    { id:'b3', category:'loisirs',      amount:500,  month:4, year:2025 },
    { id:'b4', category:'sante',        amount:400,  month:4, year:2025 },
  ],
  monthly6: [
    { label:'Nov',  income:18000, expenses:12000 },
    { label:'Déc',  income:22000, expenses:18000 },
    { label:'Jan',  income:19500, expenses:13500 },
    { label:'Fév',  income:17000, expenses:11000 },
    { label:'Mar',  income:20000, expenses:14200 },
    { label:'Avr',  income:19500, expenses:10600 },
  ],
};

async function loadDashboard() {
  AppState.currentPage = 'dashboard';

  const month = AppState.currentMonth;
  const year  = AppState.currentYear;
  const monthLabel = MONTHS_FR[month - 1] + ' ' + year;

  let monthTx = [], allTx = [], subs = [], loans = [], budgets = [], monthly6 = [];

  if (DB.isDemoMode()) {
    // ── Mode démo ──────────────────────────────────────────────
    allTx   = DEMO_DATA.transactions;
    monthTx = allTx.filter(t => { const d=new Date(t.date); return d.getMonth()+1===month && d.getFullYear()===year; });
    subs    = DEMO_DATA.subscriptions;
    loans   = DEMO_DATA.loans;
    budgets = DEMO_DATA.budgets.filter(b => b.month===month && b.year===year);
    monthly6= DEMO_DATA.monthly6;
  } else {
    // ── Données réelles Supabase ────────────────────────────────
    try {
      const uid = AppState.user?.id;
      // Chargement parallèle : transactions mois, abonnements, prêts, budgets
      const [txAll, subList, loanList, budgetList] = await Promise.all([
        DB.getTransactions({ userId: uid }),
        DB.getAbonnements(uid),
        DB.getPrets(uid),
        DB.getBudgets(uid, month, year),
      ]);

      allTx   = txAll;
      monthTx = txAll.filter(t => { const d=new Date(t.date); return d.getMonth()+1===month && d.getFullYear()===year; });
      subs    = subList;
      loans   = loanList;
      budgets = budgetList;

      // Calcul évolution 6 mois
      for (let i = 5; i >= 0; i--) {
        let m = month - i, y = year;
        if (m <= 0) { m += 12; y--; }
        const mTx = txAll.filter(t => { const d=new Date(t.date); return d.getMonth()+1===m && d.getFullYear()===y; });
        monthly6.push({
          label:    MONTHS_FR[m-1].slice(0,3),
          income:   mTx.filter(t=>t.type==='income').reduce((s,t)=>s+(t.amount||0),0),
          expenses: mTx.filter(t=>t.type==='expense').reduce((s,t)=>s+(t.amount||0),0),
        });
      }
    } catch (err) {
      console.error('Erreur dashboard Supabase:', err);
      // Fallback démo si erreur
      allTx   = DEMO_DATA.transactions;
      monthTx = allTx.filter(t => { const d=new Date(t.date); return d.getMonth()+1===month && d.getFullYear()===year; });
      subs    = DEMO_DATA.subscriptions;
      loans   = DEMO_DATA.loans;
      budgets = DEMO_DATA.budgets.filter(b => b.month===month && b.year===year);
      monthly6= DEMO_DATA.monthly6;
    }
  }

  const totalIncome  = monthTx.filter(t => t.type === 'income').reduce((s,t) => s + (t.amount||0), 0);
  const totalExpense = monthTx.filter(t => t.type === 'expense').reduce((s,t) => s + (t.amount||0), 0);
  const balance      = totalIncome - totalExpense;
  const savingsRate  = totalIncome > 0 ? pct(balance, totalIncome) : 0;

  // Alertes
  const urgentSubs   = subs.filter(s => s.active && daysUntil(s.next_date) <= 7);
  const urgentLoans  = loans.filter(l => l.status === 'active');
  const budgetAlerts = budgets.filter(b => {
    const spent = monthTx.filter(t => t.type==='expense' && t.category===b.category).reduce((s,t)=>s+(t.amount||0),0);
    return spent > b.amount;
  });

  // Dépenses par catégorie
  const expByCat = {};
  monthTx.filter(t => t.type === 'expense').forEach(t => {
    expByCat[t.category] = (expByCat[t.category] || 0) + (t.amount||0);
  });

  const savingsGoal   = 5000;
  const savingsActual = Math.max(0, balance);

  // Transactions récentes (5 dernières)
  const recentTx = [...allTx].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  const html = `
  <div class="fade-in">

    <!-- Quick Actions -->
    <div class="quick-actions">
      <button class="quick-btn btn-primary" onclick="navigateTo('expenses')">
        <i class="fas fa-minus-circle"></i> Ajouter une dépense
      </button>
      <button class="quick-btn btn-secondary" onclick="navigateTo('income')">
        <i class="fas fa-plus-circle"></i> Ajouter un revenu
      </button>
      <button class="quick-btn btn-ghost" onclick="navigateTo('reports')">
        <i class="fas fa-file-chart-column"></i> Voir les rapports
      </button>
    </div>

    <!-- Alerts -->
    ${urgentSubs.length > 0 ? `
    <div class="alert alert-warning" style="margin-bottom:8px;">
      <span class="alert-icon">🔔</span>
      <div>
        <strong>${urgentSubs.length} abonnement(s)</strong> se renouvelle(nt) dans moins de 7 jours :
        ${urgentSubs.map(s => `<strong>${s.name}</strong> (${formatDate(s.next_date)})`).join(', ')}
      </div>
    </div>` : ''}

    ${budgetAlerts.length > 0 ? `
    <div class="alert alert-danger" style="margin-bottom:8px;">
      <span class="alert-icon">⚠️</span>
      <div>
        <strong>${budgetAlerts.length} budget(s) dépassé(s)</strong> ce mois-ci.
        <a onclick="navigateTo('budgets')" style="cursor:pointer;text-decoration:underline;margin-left:6px;">Voir les budgets →</a>
      </div>
    </div>` : ''}

    <!-- KPI Cards -->
    <div class="kpi-grid" style="margin-top:16px;">
      <div class="kpi-card green">
        <div class="kpi-header">
          <div class="kpi-icon"><i class="fas fa-arrow-trend-up"></i></div>
          <span class="kpi-badge up">+12%</span>
        </div>
        <div class="kpi-value">${formatCurrencyShort(totalIncome)}</div>
        <div class="kpi-label">Revenus — ${monthLabel}</div>
      </div>

      <div class="kpi-card red">
        <div class="kpi-header">
          <div class="kpi-icon"><i class="fas fa-arrow-trend-down"></i></div>
          <span class="kpi-badge down">-5%</span>
        </div>
        <div class="kpi-value">${formatCurrencyShort(totalExpense)}</div>
        <div class="kpi-label">Dépenses — ${monthLabel}</div>
      </div>

      <div class="kpi-card ${balance >= 0 ? 'blue' : 'red'}">
        <div class="kpi-header">
          <div class="kpi-icon"><i class="fas fa-scale-balanced"></i></div>
          <span class="kpi-badge ${balance >= 0 ? 'up' : 'down'}">${balance >= 0 ? '+' : ''}${pct(balance, totalIncome)}%</span>
        </div>
        <div class="kpi-value" style="color:${balance >= 0 ? 'var(--secondary)' : 'var(--danger)'}">
          ${formatCurrencyShort(balance)}
        </div>
        <div class="kpi-label">Solde du mois</div>
      </div>

      <div class="kpi-card amber">
        <div class="kpi-header">
          <div class="kpi-icon"><i class="fas fa-piggy-bank"></i></div>
          <span class="kpi-badge ${savingsRate >= 20 ? 'up' : savingsRate >= 10 ? 'neutral' : 'down'}">${savingsRate}%</span>
        </div>
        <div class="kpi-value">${savingsRate}%</div>
        <div class="kpi-label">Taux d'épargne</div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="grid-2" style="margin-bottom:20px;">

      <!-- Bar Chart: Revenus vs Dépenses -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title"><i class="fas fa-chart-bar" style="color:var(--primary);"></i> Revenus vs Dépenses</div>
            <div class="card-subtitle">6 derniers mois</div>
          </div>
        </div>
        <div class="chart-wrapper" style="height:240px;">
          <canvas id="bar-chart"></canvas>
        </div>
      </div>

      <!-- Donut Chart: Dépenses par catégorie -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title"><i class="fas fa-chart-pie" style="color:var(--accent);"></i> Répartition des dépenses</div>
            <div class="card-subtitle">${monthLabel}</div>
          </div>
        </div>
        <div style="display:flex;gap:16px;align-items:center;">
          <div class="chart-wrapper" style="height:200px;width:200px;flex-shrink:0;">
            <canvas id="donut-chart"></canvas>
          </div>
          <div id="donut-legend" style="flex:1;font-size:12px;"></div>
        </div>
      </div>
    </div>

    <!-- Bottom Row -->
    <div class="grid-2">

      <!-- Savings Progress -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-bullseye" style="color:var(--secondary);"></i> Objectifs d'épargne</div>
          <button class="btn btn-ghost btn-sm" onclick="navigateTo('reports')">Voir tout</button>
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="font-size:13px;font-weight:500;">Épargne mensuelle</span>
            <span style="font-size:13px;color:var(--text-muted);">${formatCurrency(savingsActual)} / ${formatCurrency(savingsGoal)}</span>
          </div>
          <div class="progress-bar" style="height:10px;">
            <div class="progress-fill ${pct(savingsActual, savingsGoal) >= 100 ? 'green' : pct(savingsActual,savingsGoal) >= 60 ? 'blue' : 'amber'}"
                 style="width:${pct(savingsActual,savingsGoal)}%;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-top:4px;">
            <span>${pct(savingsActual, savingsGoal)}% atteint</span>
            <span>Objectif: ${formatCurrency(savingsGoal)}</span>
          </div>

          <div class="divider"></div>

          <!-- Budget summary -->
          ${budgets.slice(0,3).map(b => {
            const cat = getCategoryInfo(b.category, 'expense');
            const spent = monthTx.filter(t => t.type==='expense' && t.category===b.category).reduce((s,t)=>s+(t.amount||0),0);
            const p = pct(spent, b.amount);
            return `
            <div class="budget-item">
              <div class="budget-header">
                <div style="display:flex;align-items:center;gap:6px;">
                  <span>${cat.icon}</span>
                  <span style="font-size:13px;font-weight:500;">${cat.label}</span>
                </div>
                <span style="font-size:13px;font-weight:600;color:${p > 100 ? 'var(--danger)' : 'var(--text)'};">${p}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill ${p > 100 ? 'red' : p > 80 ? 'amber' : 'green'}" style="width:${Math.min(100,p)}%;"></div>
              </div>
              <div class="budget-amounts">
                <span>Dépensé: ${formatCurrency(spent)}</span>
                <span>Budget: ${formatCurrency(b.amount)}</span>
              </div>
            </div>`;
          }).join('')}
          <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:8px;" onclick="navigateTo('budgets')">
            Gérer les budgets →
          </button>
        </div>
      </div>

      <!-- Recent Transactions -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-clock-rotate-left" style="color:var(--primary);"></i> Transactions récentes</div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-ghost btn-sm" onclick="navigateTo('income')">Revenus</button>
            <button class="btn btn-ghost btn-sm" onclick="navigateTo('expenses')">Dépenses</button>
          </div>
        </div>
        <div>
          ${recentTx.map(t => {
            const cat = getCategoryInfo(t.category, t.type);
            return `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-light);">
              <div style="width:38px;height:38px;border-radius:var(--radius);background:${t.type==='income'?'var(--secondary-bg)':'var(--danger-bg)'};
                          display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">
                ${cat.icon}
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ${t.description || cat.label}
                </div>
                <div style="font-size:11px;color:var(--text-muted);">${cat.label} · ${formatDate(t.date)}</div>
              </div>
              <div class="${t.type === 'income' ? 'amount-positive' : 'amount-negative'}" style="font-size:14px;">
                ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
              </div>
            </div>`;
          }).join('')}
          <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:12px;" onclick="navigateTo('expenses')">
            Voir toutes les transactions →
          </button>
        </div>
      </div>

    </div>

    <!-- Subscriptions & Loans Summary -->
    <div class="grid-2" style="margin-top:20px;">
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-repeat" style="color:var(--accent);"></i> Abonnements actifs</div>
          <button class="btn btn-ghost btn-sm" onclick="navigateTo('subscriptions')">Gérer</button>
        </div>
        ${subs.slice(0,3).map(s => {
          const days = daysUntil(s.next_date);
          return `
          <div class="sub-card" style="margin-bottom:8px;">
            <div class="sub-icon">📱</div>
            <div class="sub-info">
              <div class="sub-name">${s.name}</div>
              <div class="sub-meta">${getFrequencyInfo(s.frequency).label} · Prochain: ${formatDate(s.next_date)}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-weight:700;font-size:14px;">${formatCurrency(s.amount)}</div>
              <span class="badge ${days <= 7 ? 'badge-red' : 'badge-gray'}" style="font-size:10px;">
                ${days <= 0 ? "Aujourd'hui" : `J-${days}`}
              </span>
            </div>
          </div>`;
        }).join('')}
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-hand-holding-dollar" style="color:var(--danger);"></i> Crédits en cours</div>
          <button class="btn btn-ghost btn-sm" onclick="navigateTo('loans')">Gérer</button>
        </div>
        ${loans.filter(l=>l.status==='active').slice(0,3).map(l => {
          const monthsElapsed = Math.floor((new Date() - new Date(l.start_date)) / (30.44 * 86400000));
          const progress = pct(monthsElapsed, l.months_total);
          const remaining = Math.max(0, l.months_total - monthsElapsed);
          return `
          <div class="loan-card" style="margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <span style="font-weight:600;font-size:13px;">${l.name}</span>
              <span class="badge badge-blue" style="font-size:10px;">${remaining} mois restants</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill blue" style="width:${progress}%;"></div>
            </div>
            <div class="budget-amounts" style="margin-top:4px;">
              <span>Mensualité: ${formatCurrency(l.monthly_payment)}</span>
              <span>${progress}% remboursé</span>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>

  </div>`;

  renderLayout(html, 'Tableau de bord', `${monthLabel} · ${AppState.family?.name || 'Ma Famille'}`);

  // Render charts
  setTimeout(() => {
    renderBarChart(monthly6);
    renderDonutChart(expByCat, totalExpense);
  }, 100);
}

function renderBarChart(monthly6Data) {
  const monthly6 = monthly6Data || DEMO_DATA.monthly6;
  const canvas = el('bar-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const isDark = AppState.theme === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#94A3B8' : '#64748B';

  if (canvas._chart) canvas._chart.destroy();
  canvas._chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthly6.map(m => m.label),
      datasets: [
        {
          label: 'Revenus',
          data: monthly6.map(m => m.income),
          backgroundColor: 'rgba(16,185,129,0.8)',
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: 'Dépenses',
          data: monthly6.map(m => m.expenses),
          backgroundColor: 'rgba(239,68,68,0.75)',
          borderRadius: 6,
          borderSkipped: false,
        },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { color: textColor, boxWidth: 12, font: { size: 12 } } },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: textColor } },
        y: {
          grid: { color: gridColor },
          ticks: { color: textColor, callback: v => formatCurrencyShort(v) }
        }
      }
    }
  });
}

function renderDonutChart(expByCat, total) {
  const canvas = el('donut-chart');
  if (!canvas) return;
  if (!Object.keys(expByCat).length) return;
  const ctx = canvas.getContext('2d');

  const cats = Object.entries(expByCat).map(([key, val]) => ({
    ...getCategoryInfo(key, 'expense'), amount: val
  })).sort((a,b) => b.amount - a.amount);

  if (canvas._chart) canvas._chart.destroy();
  canvas._chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: cats.map(c => c.label),
      datasets: [{
        data: cats.map(c => c.amount),
        backgroundColor: cats.map(c => c.color),
        borderWidth: 2,
        borderColor: AppState.theme === 'dark' ? '#1E293B' : '#FFFFFF',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${formatCurrency(ctx.raw)} (${pct(ctx.raw, total)}%)`
          }
        }
      },
      cutout: '65%',
    }
  });

  // Legend
  const legend = el('donut-legend');
  if (legend) {
    legend.innerHTML = cats.map(c => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;">
      <div style="display:flex;align-items:center;gap:6px;">
        <div style="width:10px;height:10px;border-radius:2px;background:${c.color};flex-shrink:0;"></div>
        <span style="font-size:12px;">${c.icon} ${c.label}</span>
      </div>
      <span style="font-size:12px;font-weight:600;">${pct(c.amount, total)}%</span>
    </div>`).join('');
  }
}
