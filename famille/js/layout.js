// =====================================================
// Family Cash Flow — Layout (Sidebar + Header)
// =====================================================

const NAV_ITEMS = [
  { id: 'dashboard',     icon: 'fa-chart-pie',      label: 'Tableau de bord', section: null },
  { id: 'income',        icon: 'fa-arrow-trend-up', label: 'Revenus',         section: 'Finances' },
  { id: 'expenses',      icon: 'fa-arrow-trend-down',label: 'Dépenses',       section: null },
  { id: 'subscriptions', icon: 'fa-repeat',          label: 'Abonnements',    section: null },
  { id: 'loans',         icon: 'fa-hand-holding-dollar', label: 'Crédits',   section: null },
  { id: 'budgets',       icon: 'fa-wallet',          label: 'Budgets',        section: null },
  { id: 'reports',       icon: 'fa-file-chart-column',label: 'Rapports',     section: 'Outils' },
  { id: 'family',        icon: 'fa-users',           label: 'Famille',        section: null },
  { id: 'settings',      icon: 'fa-gear',            label: 'Paramètres',     section: null },
];

function renderLayout(pageContent, pageTitle = 'Tableau de bord', pageSubtitle = '') {
  const app = el('app');
  if (!app) return;

  const user = AppState.user;
  const profile = AppState.profile;
  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email || 'Utilisateur';
  const userInitial = userName.charAt(0).toUpperCase();
  const role = AppState.familyRole || 'Membre';
  const themeIcon = AppState.theme === 'dark' ? 'fa-sun' : 'fa-moon';

  // Build nav items HTML
  let navHTML = '';
  let lastSection = null;

  NAV_ITEMS.forEach(item => {
    if (item.section && item.section !== lastSection) {
      navHTML += `<div class="nav-section-title">${item.section}</div>`;
      lastSection = item.section;
    }
    const isActive = AppState.currentPage === item.id;
    const badge = AppState.alerts[item.id] > 0
      ? `<span class="nav-badge">${AppState.alerts[item.id]}</span>` : '';

    navHTML += `
    <div class="nav-item ${isActive ? 'active' : ''}" onclick="navigateTo('${item.id}'); closeSidebar();">
      <i class="fas ${item.icon} nav-icon"></i>
      <span>${item.label}</span>
      ${badge}
    </div>`;
  });

  // Admin nav (if admin role)
  if (AppState.familyRole === 'admin') {
    navHTML += `
    <div class="nav-section-title">Administration</div>
    <div class="nav-item ${AppState.currentPage === 'admin' ? 'active' : ''}" onclick="navigateTo('admin'); closeSidebar();">
      <i class="fas fa-shield-halved nav-icon"></i>
      <span>Admin</span>
    </div>`;
  }

  // Month display
  const monthLabel = MONTHS_FR[AppState.currentMonth - 1] + ' ' + AppState.currentYear;

  app.innerHTML = `
  <div class="app-container">

    <!-- Sidebar -->
    <aside class="sidebar" id="main-sidebar">
      <div class="sidebar-logo" onclick="navigateTo('dashboard')">
        <div class="logo-icon">💰</div>
        <div class="logo-text">
          <span>Family Cash Flow</span>
          <span>${AppState.family?.name || 'Ma Famille'}</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        ${navHTML}
      </nav>

      <div class="sidebar-footer">
        <div class="user-card" onclick="navigateTo('settings')">
          <div class="user-avatar">${userInitial}</div>
          <div class="user-info">
            <div class="user-name">${userName}</div>
            <div class="user-role">${role.charAt(0).toUpperCase() + role.slice(1)}</div>
          </div>
          <i class="fas fa-ellipsis-vertical" style="color:var(--text-muted);font-size:13px;"></i>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <div class="main-content">

      <!-- Header -->
      <header class="header">
        <div class="header-left">
          <button class="hamburger-btn" onclick="openSidebar()">
            <i class="fas fa-bars"></i>
          </button>
          <div>
            <div class="page-title">${pageTitle}</div>
            ${pageSubtitle ? `<div class="page-subtitle">${pageSubtitle}</div>` : ''}
          </div>
        </div>

        <div class="header-right">
          <!-- Month selector -->
          <div class="month-selector" id="month-selector-btn">
            <i class="fas fa-calendar-alt" style="color:var(--text-muted);font-size:13px;"></i>
            <span id="current-month-label">${monthLabel}</span>
            <i class="fas fa-chevron-down" style="color:var(--text-muted);font-size:11px;"></i>
          </div>

          <!-- Month picker dropdown -->
          <div id="month-picker" class="card" style="display:none;position:absolute;top:70px;right:180px;z-index:200;min-width:300px;padding:16px;">
            <div style="display:flex;gap:8px;margin-bottom:12px;">
              <button class="btn btn-ghost btn-sm" onclick="changeYear(-1)"><i class="fas fa-chevron-left"></i></button>
              <span id="picker-year" style="flex:1;text-align:center;font-weight:700;line-height:32px;">${AppState.currentYear}</span>
              <button class="btn btn-ghost btn-sm" onclick="changeYear(1)"><i class="fas fa-chevron-right"></i></button>
            </div>
            <div id="month-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
              ${MONTHS_FR.map((m, i) => `
                <div class="tab-btn ${i + 1 === AppState.currentMonth ? 'active' : ''}"
                     style="font-size:12px;padding:7px;"
                     onclick="selectMonth(${i + 1})">${m.slice(0,3)}</div>
              `).join('')}
            </div>
          </div>

          <!-- Theme toggle -->
          <button class="theme-toggle" id="theme-toggle-btn" onclick="toggleTheme()" data-tooltip="${AppState.theme === 'dark' ? 'Mode clair' : 'Mode sombre'}">
            <i class="fas ${themeIcon}"></i>
          </button>

          <!-- Notifications -->
          <button class="header-btn" onclick="navigateTo('dashboard')" data-tooltip="Alertes">
            <i class="fas fa-bell"></i>
            ${(AppState.alerts.subscriptions + AppState.alerts.loans + AppState.alerts.budgets) > 0
              ? '<span class="notif-dot"></span>' : ''}
          </button>

          <!-- Logout -->
          <button class="header-btn" onclick="confirmSignOut()" data-tooltip="Déconnexion">
            <i class="fas fa-right-from-bracket"></i>
          </button>
        </div>
      </header>

      <!-- Page Content -->
      <main class="page-content fade-in" id="page-content">
        ${pageContent}
      </main>

    </div>

    <!-- Bottom Nav (mobile) -->
    <nav class="bottom-nav">
      <div class="bottom-nav-items">
        <div class="bottom-nav-item ${AppState.currentPage === 'dashboard' ? 'active' : ''}" onclick="navigateTo('dashboard')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          Tableau
        </div>
        <div class="bottom-nav-item ${AppState.currentPage === 'expenses' ? 'active' : ''}" onclick="navigateTo('expenses')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7-7 7 7"/></svg>
          Dépenses
        </div>
        <div class="bottom-nav-item" onclick="showQuickAdd()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
          Ajouter
        </div>
        <div class="bottom-nav-item ${AppState.currentPage === 'income' ? 'active' : ''}" onclick="navigateTo('income')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7 7 7-7"/></svg>
          Revenus
        </div>
        <div class="bottom-nav-item ${AppState.currentPage === 'budgets' ? 'active' : ''}" onclick="navigateTo('budgets')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          Budgets
        </div>
      </div>
    </nav>

  </div>`;

  // Month selector toggle
  el('month-selector-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const picker = el('month-picker');
    if (picker) picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
  });

  document.addEventListener('click', () => {
    const picker = el('month-picker');
    if (picker) picker.style.display = 'none';
  }, { once: true });
}

function changeYear(delta) {
  AppState.currentYear += delta;
  el('picker-year').textContent = AppState.currentYear;
}

function selectMonth(month) {
  AppState.currentMonth = month;
  const label = MONTHS_FR[month - 1] + ' ' + AppState.currentYear;
  el('current-month-label').textContent = label;
  el('month-picker').style.display = 'none';
  // Reload current page
  navigateTo(AppState.currentPage);
}

function confirmSignOut() {
  if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
    signOut();
  }
}

function showQuickAdd() {
  // Show quick add modal
  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'quick-add-modal';
  modal.innerHTML = `
  <div class="modal">
    <div class="modal-header">
      <h3 class="modal-title">Ajouter rapidement</h3>
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px;">
        <button class="btn btn-secondary" style="height:80px;flex-direction:column;gap:6px;font-size:15px;"
                onclick="this.closest('.modal-overlay').remove(); navigateTo('income');">
          <i class="fas fa-plus-circle fa-lg"></i>
          Revenu
        </button>
        <button class="btn btn-danger" style="height:80px;flex-direction:column;gap:6px;font-size:15px;"
                onclick="this.closest('.modal-overlay').remove(); navigateTo('expenses');">
          <i class="fas fa-minus-circle fa-lg"></i>
          Dépense
        </button>
        <button class="btn btn-ghost" style="height:80px;flex-direction:column;gap:6px;font-size:15px;"
                onclick="this.closest('.modal-overlay').remove(); navigateTo('subscriptions');">
          <i class="fas fa-repeat fa-lg"></i>
          Abonnement
        </button>
        <button class="btn btn-ghost" style="height:80px;flex-direction:column;gap:6px;font-size:15px;"
                onclick="this.closest('.modal-overlay').remove(); navigateTo('loans');">
          <i class="fas fa-hand-holding-dollar fa-lg"></i>
          Crédit
        </button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}
