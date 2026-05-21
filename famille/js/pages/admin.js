// =====================================================
// Family Cash Flow — Admin Page
// =====================================================

async function loadAdminPage() {
  AppState.currentPage = 'admin';

  if (AppState.familyRole !== 'admin') {
    renderLayout('<div class="empty-state"><div class="empty-icon">🔒</div><div class="empty-title">Accès non autorisé</div></div>', 'Admin');
    return;
  }

  const html = `
  <div class="fade-in">
    <div class="alert alert-info" style="margin-bottom:20px;">
      <span class="alert-icon">ℹ️</span>
      <div>Panneau d'administration — Accès réservé aux administrateurs. Ici vous pouvez gérer les données globales.</div>
    </div>

    <div class="kpi-grid" style="margin-bottom:24px;">
      <div class="kpi-card blue"><div class="kpi-header"><div class="kpi-icon"><i class="fas fa-users"></i></div></div><div class="kpi-value">3</div><div class="kpi-label">Membres famille</div></div>
      <div class="kpi-card green"><div class="kpi-header"><div class="kpi-icon"><i class="fas fa-receipt"></i></div></div><div class="kpi-value">47</div><div class="kpi-label">Transactions ce mois</div></div>
      <div class="kpi-card amber"><div class="kpi-header"><div class="kpi-icon"><i class="fas fa-database"></i></div></div><div class="kpi-value">2.3 MB</div><div class="kpi-label">Données stockées</div></div>
      <div class="kpi-card red"><div class="kpi-header"><div class="kpi-icon"><i class="fas fa-bell"></i></div></div><div class="kpi-value">5</div><div class="kpi-label">Alertes actives</div></div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title"><i class="fas fa-gear" style="color:var(--primary);"></i> Actions rapides</div></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
        <button class="btn btn-ghost" onclick="navigateTo('family')"><i class="fas fa-users"></i> Gérer les membres</button>
        <button class="btn btn-ghost" onclick="navigateTo('settings')"><i class="fas fa-gear"></i> Paramètres</button>
        <button class="btn btn-ghost" onclick="navigateTo('reports')"><i class="fas fa-chart-bar"></i> Rapports</button>
      </div>
    </div>
  </div>`;

  renderLayout(html, 'Administration', 'Panneau Admin');
}
