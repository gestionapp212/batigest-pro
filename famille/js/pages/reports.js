// =====================================================
// Family Cash Flow — Reports Page
// =====================================================

async function loadReportsPage() {
  AppState.currentPage = 'reports';

  // Annual demo data
  const annualData = [
    { month:'Jan', income:18500, expenses:12000, savings:6500 },
    { month:'Fév', income:17000, expenses:11500, savings:5500 },
    { month:'Mar', income:20000, expenses:14200, savings:5800 },
    { month:'Avr', income:19500, expenses:10600, savings:8900 },
    { month:'Mai', income:21000, expenses:13000, savings:8000 },
    { month:'Jun', income:19000, expenses:12500, savings:6500 },
    { month:'Jul', income:18500, expenses:11000, savings:7500 },
    { month:'Aoû', income:17000, expenses:10500, savings:6500 },
    { month:'Sep', income:20000, expenses:13500, savings:6500 },
    { month:'Oct', income:21500, expenses:14000, savings:7500 },
    { month:'Nov', income:22000, expenses:15500, savings:6500 },
    { month:'Déc', income:25000, expenses:20000, savings:5000 },
  ];

  const totalIncome   = annualData.reduce((s,m) => s+m.income, 0);
  const totalExpenses = annualData.reduce((s,m) => s+m.expenses, 0);
  const totalSavings  = annualData.reduce((s,m) => s+m.savings, 0);
  const avgSavingsRate = Math.round((totalSavings / totalIncome) * 100);

  const categoryData = [
    { category:'logement',     amount:48000 },
    { category:'alimentation', amount:36000 },
    { category:'education',    amount:14400 },
    { category:'transport',    amount:9600  },
    { category:'loisirs',      amount:7200  },
    { category:'sante',        amount:4200  },
    { category:'vetements',    amount:3600  },
    { category:'autre',        amount:2400  },
  ];

  const html = `
  <div class="fade-in">

    <!-- Annual KPIs -->
    <div class="kpi-grid" style="margin-bottom:24px;">
      <div class="kpi-card green">
        <div class="kpi-header"><div class="kpi-icon"><i class="fas fa-arrow-trend-up"></i></div></div>
        <div class="kpi-value">${formatCurrencyShort(totalIncome)}</div>
        <div class="kpi-label">Revenus annuels ${new Date().getFullYear()}</div>
      </div>
      <div class="kpi-card red">
        <div class="kpi-header"><div class="kpi-icon"><i class="fas fa-arrow-trend-down"></i></div></div>
        <div class="kpi-value">${formatCurrencyShort(totalExpenses)}</div>
        <div class="kpi-label">Dépenses annuelles</div>
      </div>
      <div class="kpi-card blue">
        <div class="kpi-header"><div class="kpi-icon"><i class="fas fa-piggy-bank"></i></div></div>
        <div class="kpi-value">${formatCurrencyShort(totalSavings)}</div>
        <div class="kpi-label">Épargne annuelle</div>
      </div>
      <div class="kpi-card amber">
        <div class="kpi-header"><div class="kpi-icon"><i class="fas fa-percent"></i></div></div>
        <div class="kpi-value">${avgSavingsRate}%</div>
        <div class="kpi-label">Taux d'épargne moyen</div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="grid-2" style="margin-bottom:20px;">

      <!-- Annual Line Chart -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title"><i class="fas fa-chart-line" style="color:var(--primary);"></i> Évolution annuelle</div>
            <div class="card-subtitle">Revenus, Dépenses, Épargne ${new Date().getFullYear()}</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="exportAnnualCSV()">
            <i class="fas fa-download"></i> CSV
          </button>
        </div>
        <div class="chart-wrapper" style="height:260px;">
          <canvas id="annual-chart"></canvas>
        </div>
      </div>

      <!-- Category Pie -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-chart-pie" style="color:var(--accent);"></i> Dépenses par catégorie</div>
          <div class="card-subtitle">Annuel ${new Date().getFullYear()}</div>
        </div>
        <div style="display:flex;gap:12px;align-items:center;">
          <div class="chart-wrapper" style="height:200px;width:200px;flex-shrink:0;">
            <canvas id="annual-cat-chart"></canvas>
          </div>
          <div id="annual-cat-legend" style="flex:1;font-size:12px;"></div>
        </div>
      </div>
    </div>

    <!-- Monthly details table -->
    <div class="card" style="margin-bottom:20px;">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-table" style="color:var(--primary);"></i> Comparatif mensuel</div>
        <button class="btn btn-ghost btn-sm" onclick="exportDetailedCSV()">
          <i class="fas fa-download"></i> Export complet
        </button>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Mois</th>
              <th style="text-align:right;">Revenus</th>
              <th style="text-align:right;">Dépenses</th>
              <th style="text-align:right;">Épargne</th>
              <th style="text-align:right;">Taux</th>
              <th>Tendance</th>
            </tr>
          </thead>
          <tbody>
            ${annualData.map((m, i) => {
              const rate = Math.round((m.savings / m.income) * 100);
              const prev = annualData[i-1];
              const trend = prev ? (m.income > prev.income ? '📈' : m.income < prev.income ? '📉' : '➡️') : '—';
              const isCurrentMonth = i + 1 === AppState.currentMonth;
              return `
              <tr style="${isCurrentMonth ? 'background:var(--primary-bg);font-weight:600;' : ''}">
                <td style="font-weight:${isCurrentMonth?'700':'500'};">
                  ${m.month} ${isCurrentMonth ? '<span class="badge badge-blue" style="font-size:10px;margin-left:4px;">actuel</span>' : ''}
                </td>
                <td style="text-align:right;" class="amount-positive">+${formatCurrency(m.income)}</td>
                <td style="text-align:right;" class="amount-negative">-${formatCurrency(m.expenses)}</td>
                <td style="text-align:right;font-weight:600;color:${m.savings>=0?'var(--secondary)':'var(--danger)'};">
                  ${m.savings >= 0 ? '+' : ''}${formatCurrency(m.savings)}
                </td>
                <td style="text-align:right;">
                  <span class="badge ${rate>=20?'badge-green':rate>=10?'badge-amber':'badge-red'}">${rate}%</span>
                </td>
                <td style="font-size:16px;">${trend}</td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:var(--bg-hover);font-weight:700;">
              <td>Total</td>
              <td style="text-align:right;color:var(--secondary);">+${formatCurrency(totalIncome)}</td>
              <td style="text-align:right;color:var(--danger);">-${formatCurrency(totalExpenses)}</td>
              <td style="text-align:right;color:var(--primary);">+${formatCurrency(totalSavings)}</td>
              <td style="text-align:right;"><span class="badge badge-blue">${avgSavingsRate}%</span></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Top expenses categories -->
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-ranking-star" style="color:var(--accent);"></i> Top catégories de dépenses</div>
        <div class="card-subtitle">Année ${new Date().getFullYear()}</div>
      </div>
      <div style="display:grid;gap:10px;">
        ${categoryData.slice(0,5).map((c, i) => {
          const cat = getCategoryInfo(c.category, 'expense');
          const topAmount = categoryData[0].amount;
          return `
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:24px;height:24px;border-radius:50%;background:${i===0?'var(--accent-bg)':i===1?'var(--bg-hover)':i===2?'var(--bg-hover)':'var(--bg-hover)'};
                        display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:${i===0?'var(--accent)':'var(--text-muted)'};">
              ${i+1}
            </div>
            <div style="width:36px;height:36px;border-radius:var(--radius);background:${cat.color}22;
                        display:flex;align-items:center;justify-content:center;font-size:18px;">${cat.icon}</div>
            <div style="flex:1;">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span style="font-size:13px;font-weight:500;">${cat.label}</span>
                <span class="amount-negative">-${formatCurrency(c.amount)}</span>
              </div>
              <div class="progress-bar" style="height:5px;">
                <div class="progress-fill" style="width:${pct(c.amount, totalExpenses)}%;background:${cat.color};"></div>
              </div>
            </div>
            <span style="font-size:11px;color:var(--text-muted);min-width:36px;text-align:right;">${pct(c.amount,totalExpenses)}%</span>
          </div>`;
        }).join('')}
      </div>
    </div>

  </div>`;

  renderLayout(html, 'Rapports', `Année ${new Date().getFullYear()}`);

  setTimeout(() => {
    renderAnnualChart(annualData);
    renderCategoryChart(categoryData, totalExpenses);
  }, 100);
}

function renderAnnualChart(data) {
  const canvas = el('annual-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const isDark = AppState.theme === 'dark';
  const textColor = isDark ? '#94A3B8' : '#64748B';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  if (canvas._chart) canvas._chart.destroy();
  canvas._chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(m => m.month),
      datasets: [
        { label:'Revenus',  data:data.map(m=>m.income),   borderColor:'#10B981', backgroundColor:'rgba(16,185,129,0.1)',  fill:true, tension:0.4, pointRadius:3 },
        { label:'Dépenses', data:data.map(m=>m.expenses), borderColor:'#EF4444', backgroundColor:'rgba(239,68,68,0.1)',   fill:true, tension:0.4, pointRadius:3 },
        { label:'Épargne',  data:data.map(m=>m.savings),  borderColor:'#2563EB', backgroundColor:'rgba(37,99,235,0.05)',  fill:false,tension:0.4, pointRadius:3, borderDash:[4,4] },
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins: {
        legend:{ position:'top', labels:{ color:textColor, font:{size:11}, boxWidth:10 } },
        tooltip:{ callbacks:{ label: ctx=>` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` } }
      },
      scales: {
        x:{ grid:{display:false}, ticks:{color:textColor, font:{size:11}} },
        y:{ grid:{color:gridColor}, ticks:{color:textColor, callback:v=>formatCurrencyShort(v), font:{size:11}} }
      }
    }
  });
}

function renderCategoryChart(catData, total) {
  const canvas = el('annual-cat-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const isDark = AppState.theme === 'dark';

  const cats = catData.map(c => ({ ...getCategoryInfo(c.category,'expense'), amount:c.amount }));

  if (canvas._chart) canvas._chart.destroy();
  canvas._chart = new Chart(ctx, {
    type:'doughnut',
    data:{
      labels: cats.map(c=>c.label),
      datasets:[{
        data: cats.map(c=>c.amount),
        backgroundColor: cats.map(c=>c.color),
        borderWidth:2,
        borderColor: isDark?'#1E293B':'#FFFFFF',
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{display:false},
        tooltip:{callbacks:{label:ctx=>` ${ctx.label}: ${formatCurrency(ctx.raw)} (${pct(ctx.raw,total)}%)`}}
      },
      cutout:'60%'
    }
  });

  const legend = el('annual-cat-legend');
  if (legend) legend.innerHTML = cats.slice(0,6).map(c=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:3px 0;">
      <div style="display:flex;align-items:center;gap:5px;">
        <div style="width:8px;height:8px;border-radius:2px;background:${c.color};flex-shrink:0;"></div>
        <span style="font-size:11px;">${c.icon} ${c.label}</span>
      </div>
      <span style="font-size:11px;font-weight:600;">${pct(c.amount,total)}%</span>
    </div>`).join('');
}

function exportAnnualCSV() {
  let csv = 'Mois,Revenus,Dépenses,Épargne,Taux d\'épargne\n';
  const data = [
    ['Janvier',18500,12000],['Février',17000,11500],['Mars',20000,14200],
    ['Avril',19500,10600],['Mai',21000,13000],['Juin',19000,12500],
    ['Juillet',18500,11000],['Août',17000,10500],['Septembre',20000,13500],
    ['Octobre',21500,14000],['Novembre',22000,15500],['Décembre',25000,20000],
  ];
  data.forEach(([m,i,e]) => {
    const s = i - e;
    csv += `"${m}","${i}","${e}","${s}","${Math.round((s/i)*100)}%"\n`;
  });

  const blob = new Blob(['\ufeff'+csv], { type:'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `rapport_annuel_${new Date().getFullYear()}.csv`;
  a.click();
  showToast('Rapport CSV exporté !', 'success');
}

function exportDetailedCSV() {
  exportAnnualCSV();
}
