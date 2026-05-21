// ============================================================
//  Dashboard — Tableau de bord principal
// ============================================================

const Dashboard = {
  chart: null,

  async render() {
    const app = document.getElementById('app');
    app.innerHTML = Components.dashboardLayout(Components.spinner('Chargement du tableau de bord...'), '/dashboard');
    if (window.lucide) lucide.createIcons();

    try {
      const familyId = Auth.currentFamily?.family_id;
      if (!familyId) { Router.navigate('/onboarding'); return; }

      // Période courante
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const startMonth = `${year}-${month}-01`;
      const endMonth = `${year}-${month}-31`;

      // Transactions du mois
      const { data: txMonth } = await db
        .from('transactions')
        .select('amount,type,category,date,description')
        .eq('family_id', familyId)
        .gte('date', startMonth)
        .lte('date', endMonth)
        .order('date', { ascending: false });

      const income  = (txMonth || []).filter(t => t.type === 'income').reduce((s,t) => s + parseFloat(t.amount), 0);
      const expense = (txMonth || []).filter(t => t.type === 'expense').reduce((s,t) => s + parseFloat(t.amount), 0);
      const balance = income - expense;

      // 6 derniers mois de données pour le graphique
      const chartData = await this.loadChartData(familyId, 6);

      // Budgets du mois
      const { data: budgets } = await db
        .from('budgets')
        .select('*')
        .eq('family_id', familyId)
        .eq('month', `${year}-${month}`);

      document.getElementById('page-content').innerHTML = this.html(income, expense, balance, txMonth || [], budgets || [], chartData);
      if (window.lucide) lucide.createIcons();
      this.initChart(chartData);
    } catch (err) {
      console.error(err);
      document.getElementById('page-content').innerHTML = `<div class="alert alert--error">Erreur de chargement : ${err.message}</div>`;
    }
  },

  async loadChartData(familyId, months) {
    const data = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = (d.getMonth() + 1).toString().padStart(2, '0');
      const start = `${y}-${m}-01`;
      const end = `${y}-${m}-31`;
      const { data: tx } = await db
        .from('transactions')
        .select('amount,type')
        .eq('family_id', familyId)
        .gte('date', start)
        .lte('date', end);
      const inc = (tx||[]).filter(t=>t.type==='income').reduce((s,t)=>s+parseFloat(t.amount),0);
      const exp = (tx||[]).filter(t=>t.type==='expense').reduce((s,t)=>s+parseFloat(t.amount),0);
      data.push({ label: Utils.monthShort(d.getMonth()), income: inc, expense: exp });
    }
    return data;
  },

  html(income, expense, balance, transactions, budgets, chartData) {
    const balanceClass = balance >= 0 ? 'positive' : 'negative';
    const recentTx = transactions.slice(0, 8);

    // Alerte budget
    const budgetAlerts = budgets.filter(b => {
      const spent = transactions.filter(t => t.type==='expense' && t.category===b.category)
                                .reduce((s,t)=>s+parseFloat(t.amount),0);
      return spent > b.amount * 0.8;
    });

    return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Tableau de bord</h1>
        <p class="page-sub">${Utils.monthName(new Date().getMonth())} ${new Date().getFullYear()} — ${Auth.currentFamily?.families?.name || 'Ma famille'}</p>
      </div>
      <a data-href="/dashboard/expenses" class="btn btn--primary">
        <i data-lucide="plus"></i> Nouvelle dépense
      </a>
    </div>

    ${budgetAlerts.length > 0 ? `
    <div class="alert alert--warning">
      ⚠️ <strong>${budgetAlerts.length} budget(s)</strong> proche(s) du dépassement ce mois-ci.
      <a data-href="/dashboard/budgets" class="link"> Voir les budgets →</a>
    </div>` : ''}

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card stat-card--income">
        <div class="stat-card__body">
          <div class="stat-card__label">Revenus du mois</div>
          <div class="stat-card__value">${Utils.currency(income)}</div>
          <div class="stat-card__sub"><i data-lucide="trending-up" style="width:12px;height:12px"></i> Ce mois</div>
        </div>
        <div class="stat-card__icon" style="background:#10b98120;color:#10b981">
          <i data-lucide="trending-up"></i>
        </div>
      </div>
      <div class="stat-card stat-card--expense">
        <div class="stat-card__body">
          <div class="stat-card__label">Dépenses du mois</div>
          <div class="stat-card__value">${Utils.currency(expense)}</div>
          <div class="stat-card__sub"><i data-lucide="trending-down" style="width:12px;height:12px"></i> Ce mois</div>
        </div>
        <div class="stat-card__icon" style="background:#ef444420;color:#ef4444">
          <i data-lucide="trending-down"></i>
        </div>
      </div>
      <div class="stat-card stat-card--balance ${balanceClass}">
        <div class="stat-card__body">
          <div class="stat-card__label">Solde du mois</div>
          <div class="stat-card__value">${Utils.currency(balance)}</div>
          <div class="stat-card__sub">${balance >= 0 ? '✅ Positif' : '⚠️ Négatif'}</div>
        </div>
        <div class="stat-card__icon" style="background:#6366f120;color:#6366f1">
          <i data-lucide="wallet"></i>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card__body">
          <div class="stat-card__label">Taux d'épargne</div>
          <div class="stat-card__value">${income > 0 ? Utils.pct(balance, income) : 0}%</div>
          <div class="stat-card__sub">${income > 0 && balance/income >= 0.2 ? '🎯 Excellent' : '📈 À améliorer'}</div>
        </div>
        <div class="stat-card__icon" style="background:#f59e0b20;color:#f59e0b">
          <i data-lucide="target"></i>
        </div>
      </div>
    </div>

    <!-- Graphique -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title"><i data-lucide="bar-chart-2"></i> Évolution sur 6 mois</h2>
      </div>
      <div class="chart-wrap" style="height:280px">
        <canvas id="main-chart"></canvas>
      </div>
    </div>

    <div class="grid-2">
      <!-- Transactions récentes -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title"><i data-lucide="clock"></i> Transactions récentes</h2>
          <a data-href="/dashboard/expenses" class="btn btn--ghost btn--sm">Voir tout</a>
        </div>
        ${recentTx.length === 0
          ? Components.empty('📭', 'Aucune transaction', 'Commencez par ajouter un revenu ou une dépense.', '<a data-href="/dashboard/income" class="btn btn--primary btn--sm">+ Ajouter</a>')
          : `<div class="tx-list">
              ${recentTx.map(t => {
                const cat = Utils.getCat(t.category, t.type);
                return `<div class="tx-item">
                  <div class="tx-icon" style="background:${cat.color}20;color:${cat.color}">${cat.icon}</div>
                  <div class="tx-body">
                    <div class="tx-desc">${t.description || cat.label}</div>
                    <div class="tx-date">${Utils.dateShort(t.date)} · ${cat.label}</div>
                  </div>
                  <div class="tx-amount ${t.type === 'income' ? 'amount--pos' : 'amount--neg'}">
                    ${t.type === 'income' ? '+' : '-'}${Utils.currency(t.amount)}
                  </div>
                </div>`;
              }).join('')}
            </div>`
        }
      </div>

      <!-- Raccourcis -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title"><i data-lucide="zap"></i> Accès rapide</h2>
        </div>
        <div class="shortcuts-grid">
          ${[
            { href:'/dashboard/income',        icon:'trending-up',   label:'Ajouter revenu',   color:'#10b981' },
            { href:'/dashboard/expenses',       icon:'trending-down', label:'Ajouter dépense',  color:'#ef4444' },
            { href:'/dashboard/subscriptions',  icon:'calendar',      label:'Abonnements',      color:'#8b5cf6' },
            { href:'/dashboard/loans',          icon:'credit-card',   label:'Crédits',          color:'#f59e0b' },
            { href:'/dashboard/budgets',        icon:'target',        label:'Budgets',          color:'#3b82f6' },
            { href:'/dashboard/reports',        icon:'bar-chart-2',   label:'Rapports',         color:'#14b8a6' },
          ].map(s => `
            <a data-href="${s.href}" class="shortcut-btn">
              <div class="shortcut-icon" style="background:${s.color}15;color:${s.color}">
                <i data-lucide="${s.icon}"></i>
              </div>
              <span>${s.label}</span>
            </a>`).join('')}
        </div>
      </div>
    </div>`;
  },

  initChart(data) {
    const canvas = document.getElementById('main-chart');
    if (!canvas) return;
    if (this.chart) { this.chart.destroy(); this.chart = null; }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#9ca3af' : '#6b7280';

    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map(d => d.label),
        datasets: [
          {
            label: 'Revenus',
            data: data.map(d => d.income),
            backgroundColor: 'rgba(16,185,129,0.7)',
            borderRadius: 6,
          },
          {
            label: 'Dépenses',
            data: data.map(d => d.expense),
            backgroundColor: 'rgba(239,68,68,0.7)',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: textColor, font: { family: 'Inter' } } } },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor } },
          y: { grid: { color: gridColor }, ticks: { color: textColor, callback: v => v.toLocaleString('fr-FR') + ' DH' } },
        },
      },
    });
  },
};

window.Dashboard = Dashboard;
