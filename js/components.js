// ============================================================
//  Composants réutilisables (layout, modales, etc.)
// ============================================================

const Components = {

  // ── Layout dashboard ─────────────────────────────────────
  dashboardLayout(content, activePath) {
    const user = Auth.currentUser;
    const cfg = window.FCF_CONFIG;
    const isAdmin = cfg.ADMIN_EMAILS.includes(user?.email || '');

    const navItems = [
      { href: '/dashboard',               icon: 'layout-dashboard', label: 'Tableau de bord' },
      { href: '/dashboard/income',         icon: 'trending-up',      label: 'Revenus' },
      { href: '/dashboard/expenses',       icon: 'trending-down',    label: 'Dépenses' },
      { href: '/dashboard/subscriptions',  icon: 'calendar',         label: 'Abonnements' },
      { href: '/dashboard/loans',          icon: 'credit-card',      label: 'Crédits' },
      { href: '/dashboard/budgets',        icon: 'target',           label: 'Budgets' },
      { href: '/dashboard/reports',        icon: 'bar-chart-2',      label: 'Rapports' },
      { href: '/dashboard/family',         icon: 'users',            label: 'Famille' },
      { href: '/dashboard/settings',       icon: 'settings',         label: 'Paramètres' },
    ];

    const navHTML = navItems.map(item => {
      const isActive = activePath === item.href;
      return `<a class="nav-link ${isActive ? 'nav-link--active' : ''}" data-href="${item.href}">
        <i data-lucide="${item.icon}" class="nav-icon"></i>
        <span>${item.label}</span>
      </a>`;
    }).join('');

    const adminHTML = isAdmin ? `
      <div class="nav-divider"></div>
      <a class="nav-link nav-link--admin" data-href="/admin">
        <i data-lucide="shield" class="nav-icon"></i>
        <span>Back-Office Admin</span>
      </a>` : '';

    const initials = Utils.initials(user?.user_metadata?.full_name, user?.email);
    const avatarColor = Utils.avatarColor(user?.email);

    return `
    <div class="layout">
      <!-- Sidebar -->
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <a class="sidebar-brand" data-href="/dashboard">
            <div class="brand-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
            </div>
            <div>
              <div class="brand-name">Family Cash Flow</div>
              <div class="brand-domain">chan-pro.com</div>
            </div>
          </a>
          <button class="sidebar-close" id="sidebar-close" onclick="document.getElementById('sidebar').classList.remove('sidebar-open')">
            <i data-lucide="x"></i>
          </button>
        </div>

        <nav class="sidebar-nav">
          ${navHTML}
          ${adminHTML}
        </nav>

        <div class="sidebar-footer">
          <div class="user-card">
            <div class="user-avatar" style="background:${avatarColor}">
              ${initials}
            </div>
            <div class="user-info">
              <div class="user-name">${user?.user_metadata?.full_name || user?.email || 'Utilisateur'}</div>
              <div class="user-email">${user?.email || ''}</div>
            </div>
          </div>
          <button class="btn-logout" onclick="Auth.logout()">
            <i data-lucide="log-out"></i>
            Déconnexion
          </button>
        </div>
      </aside>

      <!-- Backdrop mobile -->
      <div class="sidebar-backdrop" id="sidebar-backdrop" onclick="document.getElementById('sidebar').classList.remove('sidebar-open')"></div>

      <!-- Main -->
      <div class="main-wrap">
        <!-- Topbar -->
        <header class="topbar">
          <button class="topbar-menu" onclick="document.getElementById('sidebar').classList.add('sidebar-open')">
            <i data-lucide="menu"></i>
          </button>
          <div class="topbar-brand-mobile">
            <i data-lucide="trending-up"></i>
            Family Cash Flow
          </div>
          <div class="topbar-actions">
            <button class="topbar-btn" onclick="Components.toggleTheme()" title="Basculer thème">
              <i data-lucide="sun" class="icon-sun"></i>
              <i data-lucide="moon" class="icon-moon"></i>
            </button>
          </div>
        </header>

        <!-- Page content -->
        <main class="page-content" id="page-content">
          ${content}
        </main>
      </div>
    </div>`;
  },

  // ── Layout Admin ─────────────────────────────────────────
  adminLayout(content, activePath) {
    const user = Auth.currentUser;
    const navItems = [
      { href: '/admin',               icon: 'bar-chart-2', label: 'Vue d\'ensemble' },
      { href: '/admin/users',         icon: 'users',       label: 'Utilisateurs' },
      { href: '/admin/subscriptions', icon: 'credit-card', label: 'Abonnements' },
      { href: '/admin/payments',      icon: 'dollar-sign', label: 'Paiements' },
    ];
    const navHTML = navItems.map(item => {
      const isActive = activePath === item.href;
      return `<a class="nav-link ${isActive ? 'nav-link--active' : ''}" data-href="${item.href}">
        <i data-lucide="${item.icon}" class="nav-icon"></i>
        <span>${item.label}</span>
      </a>`;
    }).join('');

    return `
    <div class="layout layout--admin">
      <aside class="sidebar sidebar--admin" id="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-brand">
            <div class="brand-icon brand-icon--admin">
              <i data-lucide="shield" style="width:20px;height:20px;color:white"></i>
            </div>
            <div>
              <div class="brand-name">Admin Panel</div>
              <div class="brand-domain admin-badge">🔴 SUPER ADMIN</div>
            </div>
          </div>
          <button class="sidebar-close" onclick="document.getElementById('sidebar').classList.remove('sidebar-open')">
            <i data-lucide="x"></i>
          </button>
        </div>
        <nav class="sidebar-nav">
          ${navHTML}
          <div class="nav-divider"></div>
          <a class="nav-link" data-href="/dashboard">
            <i data-lucide="arrow-left" class="nav-icon"></i>
            <span>Retour au Dashboard</span>
          </a>
        </nav>
        <div class="sidebar-footer">
          <div class="user-card">
            <div class="user-avatar" style="background:#ef4444">${Utils.initials('', user?.email)}</div>
            <div class="user-info">
              <div class="user-name">${user?.email}</div>
              <div class="user-email" style="color:#ef4444">Super Admin</div>
            </div>
          </div>
          <button class="btn-logout" onclick="Auth.logout()">
            <i data-lucide="log-out"></i>
            Déconnexion
          </button>
        </div>
      </aside>
      <div class="sidebar-backdrop" onclick="document.getElementById('sidebar').classList.remove('sidebar-open')"></div>
      <div class="main-wrap">
        <header class="topbar topbar--admin">
          <button class="topbar-menu" onclick="document.getElementById('sidebar').classList.add('sidebar-open')">
            <i data-lucide="menu"></i>
          </button>
          <span class="admin-mode-badge">🔴 MODE ADMINISTRATION</span>
        </header>
        <main class="page-content" id="page-content">${content}</main>
      </div>
    </div>`;
  },

  // ── Thème clair/sombre ───────────────────────────────────
  toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('fcf-theme', next);
  },

  initTheme() {
    const saved = localStorage.getItem('fcf-theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
  },

  // ── Spinner de chargement ────────────────────────────────
  spinner(msg = 'Chargement...') {
    return `<div class="spinner-wrap"><div class="spinner"></div><p class="spinner-msg">${msg}</p></div>`;
  },

  // ── État vide ────────────────────────────────────────────
  empty(icon, title, desc, action = '') {
    return `<div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <h3 class="empty-title">${title}</h3>
      <p class="empty-desc">${desc}</p>
      ${action}
    </div>`;
  },

  // ── Carte statistique ────────────────────────────────────
  statCard(label, value, icon, color, sub = '') {
    return `<div class="stat-card">
      <div class="stat-card__body">
        <div class="stat-card__label">${label}</div>
        <div class="stat-card__value">${value}</div>
        ${sub ? `<div class="stat-card__sub">${sub}</div>` : ''}
      </div>
      <div class="stat-card__icon" style="background:${color}20;color:${color}">
        <i data-lucide="${icon}"></i>
      </div>
    </div>`;
  },

  // ── Modal ────────────────────────────────────────────────
  showModal(html) {
    document.getElementById('modal-overlay').classList.remove('hidden');
    const mc = document.getElementById('modal-container');
    mc.classList.remove('hidden');
    mc.innerHTML = html;
    if (window.lucide) lucide.createIcons();
  },

  closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-container').classList.add('hidden');
  },
};

window.Components = Components;
window.closeModal = () => Components.closeModal();
