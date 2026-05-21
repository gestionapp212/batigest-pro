// ============================================================
//  Rapports financiers
// ============================================================

const Reports = {
  monthlyData: [],
  selectedMonth: new Date().getMonth(),
  selectedYear: new Date().getFullYear(),
  chart: null,

  async render() {
    document.getElementById('app').innerHTML = Components.dashboardLayout(Components.spinner(), '/dashboard/reports');
    if (window.lucide) lucide.createIcons();
    await this.loadYear();
  },

  async loadYear() {
    const familyId = Auth.currentFamily?.family_id;
    const { data: tx } = await db
      .from('transactions')
      .select('amount,type,date,category')
      .eq('family_id', familyId)
      .gte('date', `${this.selectedYear}-01-01`)
      .lte('date', `${this.selectedYear}-12-31`);

    const map = {};
    for (let i = 0; i < 12; i++) map[i] = { income: 0, expense: 0 };
    (tx || []).forEach(t => {
      const m = new Date(t.date).getMonth();
      map[m][t.type === 'income' ? 'income' : 'expense'] += parseFloat(t.amount);
    });
    this.monthlyData = Object.values(map);
    await this.renderContent(tx || []);
  },

  async renderContent(allTx) {
    const yearIncome = this.monthlyData.reduce((s, m) => s + m.income, 0);
    const yearExpense = this.monthlyData.reduce((s, m) => s + m.expense, 0);
    const yearBalance = yearIncome - yearExpense;
    const savingsRate = yearIncome > 0 ? Utils.pct(yearBalance, yearIncome) : 0;

    // Mois sélectionné
    const selM = this.monthlyData[this.selectedMonth];
    const mTx = allTx.filter(t => new Date(t.date).getMonth() === this.selectedMonth);
    const expBycat = {};
    mTx.filter(t => t.type === 'expense').forEach(t => { expBycat[t.category] = (expBycat[t.category] || 0) + parseFloat(t.amount); });
    const expTotal = Object.values(expBycat).reduce((a, b) => a + b, 0) || 1;

    document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Rapports financiers</h1>
        <p class="page-sub">Analyse complète de vos finances</p>
      </div>
      <div class="page-actions">
        <div class="year-nav">
          <button onclick="Reports.changeYear(-1)"><i data-lucide="chevron-left"></i></button>
          <span class="fw-bold">${this.selectedYear}</span>
          <button onclick="Reports.changeYear(1)" ${this.selectedYear >= new Date().getFullYear() ? 'disabled' : ''}><i data-lucide="chevron-right"></i></button>
        </div>
        <button class="btn btn--ghost" onclick="Reports.exportCSV()">
          <i data-lucide="download"></i> CSV
        </button>
      </div>
    </div>

    <!-- Stats annuelles -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-card__body">
          <div class="stat-card__label">Revenus ${this.selectedYear}</div>
          <div class="stat-card__value amount--pos">${Utils.currency(yearIncome)}</div>
        </div>
        <div class="stat-card__icon" style="background:#10b98120;color:#10b981"><i data-lucide="trending-up"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-card__body">
          <div class="stat-card__label">Dépenses ${this.selectedYear}</div>
          <div class="stat-card__value amount--neg">${Utils.currency(yearExpense)}</div>
        </div>
        <div class="stat-card__icon" style="background:#ef444420;color:#ef4444"><i data-lucide="trending-down"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-card__body">
          <div class="stat-card__label">Balance annuelle</div>
          <div class="stat-card__value ${yearBalance >= 0 ? 'amount--pos' : 'amount--neg'}">${Utils.currency(yearBalance)}</div>
        </div>
        <div class="stat-card__icon" style="background:#6366f120;color:#6366f1"><i data-lucide="bar-chart-2"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-card__body">
          <div class="stat-card__label">Taux d'épargne</div>
          <div class="stat-card__value">${savingsRate}%</div>
        </div>
        <div class="stat-card__icon" style="background:#f59e0b20;color:#f59e0b"><i data-lucide="target"></i></div>
      </div>
    </div>

    <!-- Graphique annuel -->
    <div class="card">
      <div class="card-header"><h2 class="card-title"><i data-lucide="bar-chart-2"></i> Évolution mensuelle ${this.selectedYear}</h2></div>
      <div class="chart-wrap" style="height:260px"><canvas id="report-chart"></canvas></div>
    </div>

    <!-- Sélecteur de mois -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title"><i data-lucide="calendar"></i> Détails — ${Utils.monthName(this.selectedMonth)} ${this.selectedYear}</h2>
        <div class="month-tabs">
          ${this.monthlyData.map((_, i) => `
            <button class="month-tab ${i === this.selectedMonth ? 'month-tab--active' : ''}" onclick="Reports.selectMonth(${i})">
              ${Utils.monthShort(i)}
            </button>`).join('')}
        </div>
      </div>

      <div class="grid-2" style="padding:1.5rem;gap:1.5rem">
        <!-- Stats mois -->
        <div>
          <div class="month-stats">
            <div class="month-stat"><span class="text-muted">Revenus</span><span class="amount--pos fw-bold">${Utils.currency(selM?.income || 0)}</span></div>
            <div class="month-stat"><span class="text-muted">Dépenses</span><span class="amount--neg fw-bold">${Utils.currency(selM?.expense || 0)}</span></div>
            <div class="month-stat"><span class="text-muted">Balance</span><span class="${(selM?.income||0)-(selM?.expense||0) >= 0 ? 'amount--pos' : 'amount--neg'} fw-bold">${Utils.currency((selM?.income||0)-(selM?.expense||0))}</span></div>
          </div>

          <!-- Dépenses par catégorie -->
          <h4 class="section-title mt-4">Dépenses par catégorie</h4>
          ${Object.entries(expBycat).length === 0
            ? '<p class="text-muted">Aucune dépense ce mois</p>'
            : Object.entries(expBycat).sort((a,b)=>b[1]-a[1]).map(([cat, amt]) => {
                const c = Utils.getCat(cat, 'expense');
                const pct = Utils.pct(amt, expTotal);
                return `<div class="cat-bar-item">
                  <div class="cat-bar-label">
                    <span>${c.icon} ${c.label}</span>
                    <span class="fw-bold">${Utils.currency(amt)} (${pct}%)</span>
                  </div>
                  <div class="cat-bar-track">
                    <div class="cat-bar-fill" style="width:${pct}%;background:${c.color}"></div>
                  </div>
                </div>`;
              }).join('')
          }
        </div>

        <!-- Tableau récap annuel -->
        <div>
          <h4 class="section-title">Récapitulatif annuel</h4>
          <div class="table-wrap">
            <table class="table table--compact">
              <thead><tr><th>Mois</th><th>Revenus</th><th>Dépenses</th><th>Épargne</th></tr></thead>
              <tbody>
                ${this.monthlyData.map((m, i) => {
                  const bal = m.income - m.expense;
                  const sp = m.income > 0 ? Utils.pct(bal, m.income) : 0;
                  return `<tr class="${i === this.selectedMonth ? 'tr--active' : ''}" onclick="Reports.selectMonth(${i})" style="cursor:pointer">
                    <td>${Utils.monthShort(i)}</td>
                    <td class="${m.income > 0 ? 'amount--pos' : 'text-muted'}">${m.income > 0 ? Utils.currency(m.income) : '—'}</td>
                    <td class="${m.expense > 0 ? 'amount--neg' : 'text-muted'}">${m.expense > 0 ? Utils.currency(m.expense) : '—'}</td>
                    <td>${m.income > 0 ? `<span class="badge ${sp >= 20 ? 'badge--green' : sp >= 0 ? 'badge--yellow' : 'badge--red'}">${sp}%</span>` : '—'}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;

    if (window.lucide) lucide.createIcons();
    this.initChart();
  },

  initChart() {
    const canvas = document.getElementById('report-chart');
    if (!canvas) return;
    if (this.chart) { this.chart.destroy(); }
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gc = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
    const tc = isDark ? '#9ca3af' : '#6b7280';
    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: this.monthlyData.map((_, i) => Utils.monthShort(i)),
        datasets: [
          { label: 'Revenus', data: this.monthlyData.map(m => m.income), backgroundColor: 'rgba(16,185,129,0.75)', borderRadius: 5 },
          { label: 'Dépenses', data: this.monthlyData.map(m => m.expense), backgroundColor: 'rgba(239,68,68,0.75)', borderRadius: 5 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: tc, font: { family: 'Inter' } } } },
        scales: {
          x: { grid: { color: gc }, ticks: { color: tc } },
          y: { grid: { color: gc }, ticks: { color: tc, callback: v => v.toLocaleString('fr-FR') + ' DH' } },
        },
        onClick: (e, els) => { if (els.length) this.selectMonth(els[0].index); },
      },
    });
  },

  async selectMonth(i) {
    this.selectedMonth = i;
    await this.loadYear();
  },

  async changeYear(dir) {
    this.selectedYear += dir;
    await this.loadYear();
  },

  exportCSV() {
    const rows = [['Mois', 'Revenus (DH)', 'Dépenses (DH)', 'Balance (DH)']];
    this.monthlyData.forEach((m, i) => {
      rows.push([Utils.monthName(i), m.income.toFixed(2), m.expense.toFixed(2), (m.income - m.expense).toFixed(2)]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `rapport-${this.selectedYear}.csv`;
    a.click();
    Utils.toast('Export CSV téléchargé !', 'success');
  },
};
window.Reports = Reports;
