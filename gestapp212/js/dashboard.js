/* ============================================================
   DASHBOARD MODULE
============================================================ */
function renderDashboard() {
  const clients = getCompanyData('clients');
  const devis = getCompanyData('devis');
  const factures = getCompanyData('factures');
  const chantiers = getCompanyData('chantiers');
  const taches = getCompanyData('taches');

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const facturesMois = factures.filter(f => {
    const d = new Date(f.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear && f.statut !== 'avoir';
  });
  const caTotal = facturesMois.reduce((s, f) => s + (f.totalTTC || 0), 0);
  const impayees = factures.filter(f => f.statut === 'impaye');
  const impayeesTotal = impayees.reduce((s, f) => s + (f.resteAPayer || f.totalTTC || 0), 0);
  const devisEnAttente = devis.filter(d => d.statut === 'envoye');
  const chantiersActifs = chantiers.filter(c => c.statut === 'en_cours');
  const tachesEnCours = taches.filter(t => t.statut !== 'done');

  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fas fa-tachometer-alt"></i> ${t('dashboard')}</div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" onclick="navigate('analyse')"><i class="fas fa-chart-bar"></i> Rapports</button>
        <button class="btn btn-primary btn-sm" onclick="navigate('devis')"><i class="fas fa-plus"></i> Nouveau devis</button>
      </div>
    </div>

    <!-- KPI GRID -->
    <div class="kpi-grid">
      <div class="kpi-card" onclick="navigate('factures')">
        <div class="kpi-icon" style="background:#e8f4fd;color:#2980b9">
          <i class="fas fa-chart-line"></i>
        </div>
        <div class="kpi-info">
          <div class="kpi-value">${formatMAD(caTotal)}</div>
          <div class="kpi-label">CA du mois</div>
          <div class="kpi-trend up"><i class="fas fa-arrow-up"></i> +12% vs mois précédent</div>
        </div>
      </div>
      <div class="kpi-card" onclick="navigate('factures')">
        <div class="kpi-icon" style="background:#fdecea;color:#e74c3c">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="kpi-info">
          <div class="kpi-value">${formatMAD(impayeesTotal)}</div>
          <div class="kpi-label">Factures impayées (${impayees.length})</div>
          <div class="kpi-trend down"><i class="fas fa-arrow-down"></i> À relancer</div>
        </div>
      </div>
      <div class="kpi-card" onclick="navigate('devis')">
        <div class="kpi-icon" style="background:#fef9e7;color:#f39c12">
          <i class="fas fa-file-alt"></i>
        </div>
        <div class="kpi-info">
          <div class="kpi-value">${devisEnAttente.length}</div>
          <div class="kpi-label">Devis en attente</div>
          <div class="kpi-trend"><i class="fas fa-clock"></i> En cours de validation</div>
        </div>
      </div>
      <div class="kpi-card" onclick="navigate('chantiers')">
        <div class="kpi-icon" style="background:#d5f5e3;color:#27ae60">
          <i class="fas fa-hard-hat"></i>
        </div>
        <div class="kpi-info">
          <div class="kpi-value">${chantiersActifs.length}</div>
          <div class="kpi-label">Chantiers actifs</div>
          <div class="kpi-trend"><i class="fas fa-tools"></i> En cours</div>
        </div>
      </div>
      <div class="kpi-card" onclick="navigate('clients')">
        <div class="kpi-icon" style="background:#f3e5f5;color:#8e44ad">
          <i class="fas fa-users"></i>
        </div>
        <div class="kpi-info">
          <div class="kpi-value">${clients.length}</div>
          <div class="kpi-label">Total clients</div>
          <div class="kpi-trend up"><i class="fas fa-user-plus"></i> +${Math.floor(clients.length * 0.15)} ce mois</div>
        </div>
      </div>
      <div class="kpi-card" onclick="navigate('taches')">
        <div class="kpi-icon" style="background:#e8f4fd;color:#1a6fa3">
          <i class="fas fa-tasks"></i>
        </div>
        <div class="kpi-info">
          <div class="kpi-value">${tachesEnCours.length}</div>
          <div class="kpi-label">Tâches en cours</div>
          <div class="kpi-trend"><i class="fas fa-clock"></i> À traiter</div>
        </div>
      </div>
    </div>

    <!-- CHARTS -->
    <div class="charts-grid">
      <div class="card">
        <div class="card-header"><h3><i class="fas fa-chart-bar"></i> CA mensuel (6 mois)</h3></div>
        <div class="card-body"><div class="chart-wrapper"><canvas id="chart-ca"></canvas></div></div>
      </div>
      <div class="card">
        <div class="card-header"><h3><i class="fas fa-chart-pie"></i> Statuts factures</h3></div>
        <div class="card-body"><div class="chart-wrapper"><canvas id="chart-factures"></canvas></div></div>
      </div>
    </div>

    <!-- RECENT + ACTIVITY -->
    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-clock"></i> Activité récente</h3>
          <button class="btn btn-ghost btn-sm" onclick="navigate('analyse')">Voir tout</button>
        </div>
        <div class="card-body">
          ${renderRecentActivity(factures, devis, chantiers)}
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-exclamation-circle" style="color:var(--danger)"></i> Alertes</h3>
        </div>
        <div class="card-body">
          ${renderAlerts(impayees, chantiersActifs)}
        </div>
      </div>
    </div>

    <!-- QUICK ACTIONS -->
    <div class="card mt-3">
      <div class="card-header"><h3><i class="fas fa-bolt"></i> Actions rapides</h3></div>
      <div class="card-body">
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="showNewDevisQuick()"><i class="fas fa-file-alt"></i> Nouveau devis</button>
          <button class="btn btn-accent" onclick="navigate('clients')"><i class="fas fa-user-plus"></i> Nouveau client</button>
          <button class="btn btn-success" onclick="navigate('chantiers')"><i class="fas fa-hard-hat"></i> Nouveau chantier</button>
          <button class="btn btn-warning" onclick="navigate('taches')"><i class="fas fa-tasks"></i> Créer une tâche</button>
          <button class="btn btn-ghost" onclick="exportBackup()"><i class="fas fa-download"></i> Sauvegarde</button>
        </div>
      </div>
    </div>
  `;

  // Render Charts
  setTimeout(() => {
    renderCAChart(factures);
    renderFacturesChart(factures);
  }, 50);
}

function renderRecentActivity(factures, devis, chantiers) {
  const items = [
    ...factures.slice(0, 3).map(f => ({ icon: 'fa-file-invoice-dollar', color: '#e74c3c', text: `Facture ${f.numero} — ${f.clientNom}`, date: f.date, sub: formatMAD(f.totalTTC) })),
    ...devis.slice(0, 2).map(d => ({ icon: 'fa-file-alt', color: '#f39c12', text: `Devis ${d.numero} — ${d.clientNom}`, date: d.date, sub: formatMAD(d.totalTTC) })),
    ...chantiers.slice(0, 2).map(c => ({ icon: 'fa-hard-hat', color: '#27ae60', text: `Chantier: ${c.nom}`, date: c.dateDebut, sub: c.statut })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

  if (items.length === 0) return '<div class="empty-state" style="padding:20px"><p>Aucune activité récente</p></div>';
  return items.map(i => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="width:36px;height:36px;border-radius:10px;background:${i.color}22;color:${i.color};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="fas ${i.icon}"></i>
      </div>
      <div style="flex:1;overflow:hidden">
        <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${i.text}</div>
        <div style="font-size:11px;color:var(--text-muted)">${formatDate(i.date)} · ${i.sub}</div>
      </div>
    </div>
  `).join('');
}

function renderAlerts(impayees, chantiersActifs) {
  const alerts = [];
  impayees.slice(0, 3).forEach(f => {
    const days = Math.floor((Date.now() - new Date(f.dateEcheance || f.date)) / 86400000);
    alerts.push({ type: 'danger', icon: 'fa-file-invoice-dollar', text: `${f.numero} — ${f.clientNom}`, sub: `Impayé depuis ${days} jour(s)` });
  });
  chantiersActifs.filter(c => c.budgetReel > c.budget * 0.85).forEach(c => {
    alerts.push({ type: 'warning', icon: 'fa-hard-hat', text: `Chantier: ${c.nom}`, sub: `Budget utilisé: ${Math.round((c.budgetReel / c.budget) * 100)}%` });
  });

  if (alerts.length === 0) return '<div style="text-align:center;padding:20px;color:var(--success)"><i class="fas fa-check-circle" style="font-size:32px;display:block;margin-bottom:10px"></i><p>Aucune alerte active ✓</p></div>';
  return alerts.map(a => `
    <div class="alert alert-${a.type}" style="margin-bottom:10px">
      <i class="fas ${a.icon}"></i>
      <div><strong>${a.text}</strong><br><small>${a.sub}</small></div>
    </div>
  `).join('');
}

function renderCAChart(factures) {
  const ctx = document.getElementById('chart-ca');
  if (!ctx) return;
  const now = new Date();
  const months = [];
  const values = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toLocaleDateString('fr-MA', { month: 'short' }));
    const ca = factures.filter(f => {
      const fd = new Date(f.date);
      return fd.getMonth() === d.getMonth() && fd.getFullYear() === d.getFullYear() && f.statut !== 'avoir';
    }).reduce((s, f) => s + (f.totalTTC || 0), 0);
    values.push(ca);
  }
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [{ label: 'CA (MAD)', data: values, backgroundColor: 'rgba(30,58,95,0.85)', borderRadius: 8, borderSkipped: false }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { ticks: { callback: v => v.toLocaleString('fr') } } }
    }
  });
}

function renderFacturesChart(factures) {
  const ctx = document.getElementById('chart-factures');
  if (!ctx) return;
  const paye = factures.filter(f => f.statut === 'paye').length;
  const partial = factures.filter(f => f.statut === 'partiellement_paye').length;
  const impaye = factures.filter(f => f.statut === 'impaye').length;
  const reste = factures.filter(f => !['paye','partiellement_paye','impaye'].includes(f.statut)).length;
  
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Payées', 'Partielles', 'Impayées', 'Autres'],
      datasets: [{ data: [paye, partial, impaye, reste], backgroundColor: ['#27ae60','#f39c12','#e74c3c','#95a5a6'], borderWidth: 0 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });
}

function showNewDevisQuick() { navigate('devis'); }
