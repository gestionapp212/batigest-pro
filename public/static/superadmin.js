// ============================================================
// BATIGEST PRO – Interface Super Admin
// ============================================================

'use strict';

const PLANS = {
  basic:    { name: 'Basic',    price: 50,  maxUsers: 1,  color: '#64748b' },
  pro:      { name: 'Pro',      price: 100, maxUsers: 4,  color: '#2563eb' },
  business: { name: 'Business', price: 300, maxUsers: 10, color: '#7c3aed' }
};

const DB = {
  get: (k) => { try { return JSON.parse(localStorage.getItem('bg_' + k) || 'null'); } catch { return null; } },
  set: (k, v) => localStorage.setItem('bg_' + k, JSON.stringify(v)),
  getList: (k) => DB.get(k) || [],
  addItem: (k, item) => { const list = DB.getList(k); item.id = item.id || genId(); item.createdAt = new Date().toISOString(); list.push(item); DB.set(k, list); return item; },
  updateItem: (k, id, updates) => { const list = DB.getList(k); const idx = list.findIndex(i => i.id === id); if (idx !== -1) { list[idx] = { ...list[idx], ...updates }; DB.set(k, list); return list[idx]; } return null; },
  deleteItem: (k, id) => { DB.set(k, DB.getList(k).filter(i => i.id !== id)); }
};

function genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 6); }
function fmtMoney(n) { return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 0 }).format(n || 0); }
function fmtDate(d) { if (!d) return '–'; return new Date(d).toLocaleDateString('fr-FR'); }
function escHtml(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
function today() { return new Date().toISOString().split('T')[0]; }

let saUser = null;
let saPage = 'dashboard';

function saInit() {
  document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'light');
  const session = DB.get('session');
  if (!session) { window.location.href = '/app'; return; }
  const users = DB.getList('users');
  const user = users.find(u => u.id === session.userId);
  if (!user || user.role !== 'super_admin') { window.location.href = '/app'; return; }
  saUser = user;
  renderSA();
}

function showToast(msg, type = 'success') {
  const icons = { success: '✅', danger: '❌', warning: '⚠️', info: 'ℹ️' };
  const tc = document.getElementById('toast-container') || (() => { const el = document.createElement('div'); el.id = 'toast-container'; el.className = 'toast-container'; document.body.appendChild(el); return el; })();
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span style="font-size:18px;">${icons[type]}</span><span style="flex:1;font-size:14px;">${escHtml(msg)}</span><button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:#94a3b8;">✕</button>`;
  tc.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

function openModal(html) {
  const ov = document.createElement('div'); ov.className = 'modal-overlay'; ov.id = 'sa-modal'; ov.innerHTML = html;
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
}

function confirmAction(msg, onOk) {
  const ov = document.createElement('div'); ov.className = 'modal-overlay';
  ov.innerHTML = `<div class="modal" style="max-width:380px;text-align:center;"><div style="font-size:40px;margin-bottom:12px;">⚠️</div><h3 style="font-size:16px;font-weight:700;margin-bottom:8px;color:var(--text-primary);">Confirmer l'action</h3><p style="font-size:14px;color:var(--text-secondary);margin-bottom:24px;">${escHtml(msg)}</p><div style="display:flex;gap:10px;justify-content:center;"><button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Annuler</button><button class="btn btn-danger" id="sa-confirm-ok">Confirmer</button></div></div>`;
  document.body.appendChild(ov);
  document.getElementById('sa-confirm-ok').onclick = () => { ov.remove(); onOk(); };
}

function renderSA() {
  const root = document.getElementById('root');
  root.innerHTML = `
<div id="app-layout">
  <aside id="sidebar">
    <div class="logo-area">
      <div class="logo-icon">👑</div>
      <div>
        <div class="logo-text">Super Admin</div>
        <div class="logo-sub">BatiGest Pro</div>
      </div>
    </div>
    <nav>
      <div class="nav-section-title">ADMINISTRATION</div>
      <div class="nav-item ${saPage === 'dashboard' ? 'active' : ''}" onclick="saNavigate('dashboard')"><i class="fas fa-chart-pie nav-icon"></i><span>Tableau de bord</span></div>
      <div class="nav-item ${saPage === 'companies' ? 'active' : ''}" onclick="saNavigate('companies')"><i class="fas fa-building nav-icon"></i><span>Sociétés</span></div>
      <div class="nav-item ${saPage === 'users' ? 'active' : ''}" onclick="saNavigate('users')"><i class="fas fa-users nav-icon"></i><span>Utilisateurs</span></div>
      <div class="nav-item ${saPage === 'subscriptions' ? 'active' : ''}" onclick="saNavigate('subscriptions')"><i class="fas fa-credit-card nav-icon"></i><span>Abonnements</span></div>
      <div class="nav-item ${saPage === 'stats' ? 'active' : ''}" onclick="saNavigate('stats')"><i class="fas fa-chart-bar nav-icon"></i><span>Statistiques</span></div>
    </nav>
    <div class="sidebar-footer">
      <div class="user-avatar-area">
        <div class="user-avatar">SA</div>
        <div style="flex:1;"><div style="color:#e2e8f0;font-size:13px;font-weight:600;">Super Admin</div><div style="color:#64748b;font-size:11px;">Accès total</div></div>
        <button onclick="saLogout()" style="background:none;border:none;cursor:pointer;color:#64748b;" title="Déconnexion"><i class="fas fa-sign-out-alt"></i></button>
      </div>
    </div>
  </aside>
  <div id="main-content">
    <header id="topbar">
      <div class="page-title" id="sa-page-title">Tableau de bord</div>
      <div class="topbar-actions">
        <button class="btn btn-ghost" onclick="saToggleTheme()"><i class="fas fa-moon"></i></button>
        <span style="background:#dc2626;color:#fff;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">SUPER ADMIN</span>
        <a href="/app" class="btn btn-secondary btn-sm"><i class="fas fa-external-link-alt"></i> App</a>
      </div>
    </header>
    <main id="sa-page-content" style="padding:24px;"></main>
  </div>
</div>`;
  saNavigate(saPage);
}

function saNavigate(page) {
  saPage = page;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`[onclick="saNavigate('${page}')"]`)?.classList.add('active');
  const titles = { dashboard: 'Tableau de bord', companies: 'Gestion des Sociétés', users: 'Gestion des Utilisateurs', subscriptions: 'Abonnements', stats: 'Statistiques Globales' };
  const t = document.getElementById('sa-page-title');
  if (t) t.textContent = titles[page] || page;
  const content = document.getElementById('sa-page-content');
  if (!content) return;
  const renderers = { dashboard: renderSADashboard, companies: renderSACompanies, users: renderSAUsers, subscriptions: renderSASubscriptions, stats: renderSAStats };
  const fn = renderers[page];
  if (fn) { content.innerHTML = fn(); if (page === 'dashboard') initSACharts(); if (page === 'stats') initStatsCharts(); }
}

function saLogout() {
  localStorage.removeItem('bg_session');
  window.location.href = '/app';
}

function saToggleTheme() {
  const t = localStorage.getItem('theme') === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', t);
  document.documentElement.setAttribute('data-theme', t);
}

// ===== DASHBOARD SUPER ADMIN =====
function renderSADashboard() {
  const companies = DB.getList('companies');
  const users = DB.getList('users').filter(u => u.role !== 'super_admin');
  const activeCompanies = companies.filter(c => c.status === 'active').length;
  const suspendedCompanies = companies.filter(c => c.status === 'suspendu').length;
  const totalRevenue = companies.reduce((s, c) => s + (PLANS[c.plan]?.price || 0), 0);

  return `
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;">
  <div class="stat-card"><div class="stat-icon" style="background:#dbeafe;color:#2563eb;">🏢</div><div class="stat-info"><div class="stat-label">Sociétés total</div><div class="stat-value">${companies.length}</div></div></div>
  <div class="stat-card"><div class="stat-icon" style="background:#dcfce7;color:#16a34a;">✅</div><div class="stat-info"><div class="stat-label">Actives</div><div class="stat-value" style="color:#16a34a;">${activeCompanies}</div></div></div>
  <div class="stat-card"><div class="stat-icon" style="background:#ede9fe;color:#7c3aed;">👥</div><div class="stat-info"><div class="stat-label">Utilisateurs</div><div class="stat-value">${users.length}</div></div></div>
  <div class="stat-card"><div class="stat-icon" style="background:#fef3c7;color:#d97706;">💰</div><div class="stat-info"><div class="stat-label">ARR mensuel</div><div class="stat-value" style="font-size:18px;">${fmtMoney(totalRevenue)}</div></div></div>
</div>

<div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:20px;">
  <div class="card">
    <h3 style="font-size:16px;font-weight:700;margin-bottom:14px;">Répartition des abonnements</h3>
    <canvas id="sa-chart-plans" height="220"></canvas>
  </div>
  <div class="card">
    <h3 style="font-size:15px;font-weight:700;margin-bottom:14px;">Statut sociétés</h3>
    <canvas id="sa-chart-status" height="220"></canvas>
  </div>
</div>

<div class="card">
  <h3 style="font-size:15px;font-weight:700;margin-bottom:14px;">Dernières sociétés inscrites</h3>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Société</th><th>Plan</th><th>Statut</th><th>Utilisateurs</th><th>Inscription</th><th>Actions</th></tr></thead>
      <tbody>
        ${companies.slice(-5).reverse().map(c => {
          const companyUsers = users.filter(u => u.companyId === c.id);
          const plan = PLANS[c.plan];
          return `<tr>
            <td><div style="font-weight:600;">${escHtml(c.name)}</div><div style="font-size:12px;color:var(--text-secondary);">${escHtml(c.email)}</div></td>
            <td><span class="badge" style="background:${plan?.color}22;color:${plan?.color};">${plan?.name}</span></td>
            <td><span class="badge ${c.status === 'active' ? 'badge-success' : 'badge-danger'}">${c.status === 'active' ? 'Active' : 'Suspendue'}</span></td>
            <td><span style="font-weight:600;">${companyUsers.length}</span> / ${plan?.maxUsers}</td>
            <td>${fmtDate(c.createdAt)}</td>
            <td>
              <button class="btn btn-secondary btn-sm" onclick="saEditCompany('${c.id}')"><i class="fas fa-edit"></i></button>
              <button class="btn ${c.status === 'active' ? 'btn-warning' : 'btn-success'} btn-sm" onclick="saToggleCompany('${c.id}')">${c.status === 'active' ? '⏸' : '▶'}</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>
</div>`;
}

function initSACharts() {
  const companies = DB.getList('companies');
  const isDark = localStorage.getItem('theme') === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  const planCounts = { basic: 0, pro: 0, business: 0 };
  companies.forEach(c => { if (planCounts[c.plan] !== undefined) planCounts[c.plan]++; });

  const ctxPlans = document.getElementById('sa-chart-plans');
  if (ctxPlans) new Chart(ctxPlans, {
    type: 'bar',
    data: {
      labels: ['Basic (50 DH)', 'Pro (100 DH)', 'Business (300 DH)'],
      datasets: [{
        data: [planCounts.basic, planCounts.pro, planCounts.business],
        backgroundColor: ['#94a3b8', '#2563eb', '#7c3aed'], borderRadius: 6
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor, stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.05)' } } } }
  });

  const active = companies.filter(c => c.status === 'active').length;
  const suspended = companies.filter(c => c.status === 'suspendu').length;
  const ctxStatus = document.getElementById('sa-chart-status');
  if (ctxStatus) new Chart(ctxStatus, {
    type: 'doughnut',
    data: { labels: ['Actives', 'Suspendues'], datasets: [{ data: [active, suspended], backgroundColor: ['#22c55e', '#ef4444'], borderWidth: 0, hoverOffset: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: textColor, padding: 16 } } } }
  });
}

// ===== SOCIÉTÉS =====
function renderSACompanies() {
  const companies = DB.getList('companies');
  const users = DB.getList('users');

  return `
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
  <div><h2 style="font-size:18px;font-weight:700;">Sociétés <span class="badge badge-info">${companies.length}</span></h2></div>
  <button class="btn btn-primary" onclick="saOpenCompanyModal()"><i class="fas fa-plus"></i> Nouvelle société</button>
</div>
<div style="margin-bottom:16px;">
  <input class="form-input" placeholder="Rechercher société..." oninput="saFilterCompanies(this.value)" style="max-width:360px;"/>
</div>
<div class="table-wrapper">
  <table>
    <thead><tr><th>Société</th><th>Plan</th><th>Statut</th><th>Utilisateurs</th><th>Expiration</th><th>Revenu/mois</th><th>Actions</th></tr></thead>
    <tbody id="sa-companies-tbody">
      ${companies.map(c => {
        const companyUsers = users.filter(u => u.companyId === c.id);
        const plan = PLANS[c.plan];
        const expiring = c.subscriptionEnd && new Date(c.subscriptionEnd) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        return `<tr id="sa-row-${c.id}">
          <td><div style="font-weight:700;">${escHtml(c.name)}</div><div style="font-size:12px;color:var(--text-secondary);">${escHtml(c.email)}</div><div style="font-size:11px;color:var(--text-secondary);">${escHtml(c.city)}</div></td>
          <td><span class="badge" style="background:${plan?.color}22;color:${plan?.color};font-weight:700;">${plan?.name}</span></td>
          <td><span class="badge ${c.status === 'active' ? 'badge-success' : 'badge-danger'}">${c.status === 'active' ? '✅ Active' : '⛔ Suspendue'}</span></td>
          <td><span style="font-weight:600;">${companyUsers.length}</span><span style="color:var(--text-secondary);font-size:12px;"> / ${plan?.maxUsers}</span></td>
          <td style="${expiring ? 'color:#dc2626;font-weight:600;' : ''}">${fmtDate(c.subscriptionEnd)}${expiring ? ' ⚠️' : ''}</td>
          <td style="font-weight:700;color:var(--primary);">${fmtMoney(plan?.price || 0)}</td>
          <td>
            <div style="display:flex;gap:5px;flex-wrap:wrap;">
              <button class="btn btn-secondary btn-sm" onclick="saEditCompany('${c.id}')" title="Modifier"><i class="fas fa-edit"></i></button>
              <button class="btn ${c.status === 'active' ? 'btn-warning' : 'btn-success'} btn-sm" onclick="saToggleCompany('${c.id}')" title="${c.status === 'active' ? 'Suspendre' : 'Activer'}">${c.status === 'active' ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>'}</button>
              <button class="btn btn-danger btn-sm" onclick="saDeleteCompany('${c.id}')" title="Supprimer"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>`;
}

function saFilterCompanies(q) {
  const tbody = document.getElementById('sa-companies-tbody');
  if (!tbody) return;
  tbody.querySelectorAll('tr').forEach(row => {
    row.style.display = !q || row.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
  });
}

function saOpenCompanyModal(id = null) {
  const c = id ? DB.getList('companies').find(x => x.id === id) : null;
  openModal(`<div class="modal">
    <div class="modal-header">
      <h2 class="modal-title">${c ? 'Modifier société' : 'Nouvelle société'}</h2>
      <button class="modal-close" onclick="document.getElementById('sa-modal').remove()"><i class="fas fa-times"></i></button>
    </div>
    <form onsubmit="saSaveCompany(event,'${id || ''}')">
      <div class="form-grid-2">
        <div class="form-group"><label class="form-label">Nom <span class="req">*</span></label><input class="form-input" name="name" value="${escHtml(c?.name || '')}" required/></div>
        <div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" name="email" value="${escHtml(c?.email || '')}"/></div>
        <div class="form-group"><label class="form-label">Téléphone</label><input class="form-input" name="phone" value="${escHtml(c?.phone || '')}"/></div>
        <div class="form-group"><label class="form-label">Ville</label><input class="form-input" name="city" value="${escHtml(c?.city || '')}"/></div>
        <div class="form-group"><label class="form-label">Plan <span class="req">*</span></label>
          <select class="form-select" name="plan" required>
            ${Object.entries(PLANS).map(([k, p]) => `<option value="${k}" ${c?.plan === k ? 'selected' : ''}>${p.name} – ${p.price} DH/mois</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label class="form-label">Statut</label>
          <select class="form-select" name="status">
            <option value="active" ${c?.status !== 'suspendu' ? 'selected' : ''}>Active</option>
            <option value="suspendu" ${c?.status === 'suspendu' ? 'selected' : ''}>Suspendue</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Date expiration abonnement</label><input class="form-input" type="date" name="subscriptionEnd" value="${c?.subscriptionEnd || ''}"/></div>
        <div class="form-group"><label class="form-label">RC / SIRET</label><input class="form-input" name="siret" value="${escHtml(c?.siret || '')}"/></div>
      </div>
      ${!c ? `<div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px;color:#92400e;"><i class="fas fa-info-circle"></i> Un compte admin sera automatiquement créé pour cette société.</div>
      <div class="form-grid-2">
        <div class="form-group"><label class="form-label">Email admin <span class="req">*</span></label><input class="form-input" type="email" name="adminEmail" required/></div>
        <div class="form-group"><label class="form-label">Mot de passe admin <span class="req">*</span></label><input class="form-input" type="password" name="adminPassword" required/></div>
        <div class="form-group"><label class="form-label">Nom admin</label><input class="form-input" name="adminName" value="Administrateur"/></div>
      </div>` : ''}
      <div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="document.getElementById('sa-modal').remove()">Annuler</button><button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Enregistrer</button></div>
    </form>
  </div>`);
}

function saEditCompany(id) { saOpenCompanyModal(id); }

function saSaveCompany(e, id) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());

  if (id) {
    DB.updateItem('companies', id, { name: data.name, email: data.email, phone: data.phone, city: data.city, plan: data.plan, status: data.status, subscriptionEnd: data.subscriptionEnd, siret: data.siret });
    showToast('Société modifiée');
  } else {
    const newCompany = DB.addItem('companies', { name: data.name, email: data.email, phone: data.phone, city: data.city, plan: data.plan, status: data.status, subscriptionEnd: data.subscriptionEnd || today(), siret: data.siret });
    // Créer admin
    if (data.adminEmail) {
      DB.addItem('users', { companyId: newCompany.id, email: data.adminEmail, password: data.adminPassword, role: 'admin', name: data.adminName || 'Administrateur', status: 'active' });
    }
    showToast('Société créée avec succès');
  }
  document.getElementById('sa-modal')?.remove();
  saNavigate('companies');
}

function saToggleCompany(id) {
  const c = DB.getList('companies').find(x => x.id === id);
  if (!c) return;
  const newStatus = c.status === 'active' ? 'suspendu' : 'active';
  DB.updateItem('companies', id, { status: newStatus });
  showToast(`Société ${newStatus === 'active' ? 'activée' : 'suspendue'}`);
  saNavigate('companies');
}

function saDeleteCompany(id) {
  confirmAction('Supprimer cette société et toutes ses données ? Cette action est irréversible.', () => {
    DB.deleteItem('companies', id);
    // Supprimer users liés
    const users = DB.getList('users').filter(u => u.companyId !== id);
    DB.set('users', users);
    showToast('Société supprimée', 'warning');
    saNavigate('companies');
  });
}

// ===== UTILISATEURS =====
function renderSAUsers() {
  const users = DB.getList('users').filter(u => u.role !== 'super_admin');
  const companies = DB.getList('companies');

  return `
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
  <div><h2 style="font-size:18px;font-weight:700;">Utilisateurs <span class="badge badge-info">${users.length}</span></h2></div>
</div>
<div style="margin-bottom:16px;display:flex;gap:10px;">
  <input class="form-input" placeholder="Rechercher utilisateur..." oninput="saFilterUsers(this.value)" style="max-width:360px;"/>
  <select class="form-select" style="width:200px;" onchange="saFilterUsersByCompany(this.value)">
    <option value="">Toutes les sociétés</option>
    ${companies.map(c => `<option value="${c.id}">${escHtml(c.name)}</option>`).join('')}
  </select>
</div>
<div class="table-wrapper">
  <table>
    <thead><tr><th>Nom</th><th>Email</th><th>Société</th><th>Rôle</th><th>Statut</th><th>Actions</th></tr></thead>
    <tbody id="sa-users-tbody">
      ${users.map(u => {
        const c = companies.find(x => x.id === u.companyId);
        const roleColors = { admin: 'badge-purple', user: 'badge-info' };
        return `<tr>
          <td style="font-weight:600;">${escHtml(u.name)}</td>
          <td>${escHtml(u.email)}</td>
          <td>${c ? `<span style="font-size:13px;">${escHtml(c.name)}</span>` : '<span style="color:var(--text-secondary);">–</span>'}</td>
          <td><span class="badge ${roleColors[u.role] || 'badge-secondary'}">${u.role}</span></td>
          <td><span class="badge ${u.status !== 'suspendu' ? 'badge-success' : 'badge-danger'}">${u.status !== 'suspendu' ? 'Actif' : 'Suspendu'}</span></td>
          <td>
            <div style="display:flex;gap:6px;">
              <button class="btn ${u.status !== 'suspendu' ? 'btn-warning' : 'btn-success'} btn-sm" onclick="saToggleUser('${u.id}')">${u.status !== 'suspendu' ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>'}</button>
              <button class="btn btn-danger btn-sm" onclick="saDeleteUser('${u.id}')"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>`;
}

function saFilterUsers(q) {
  document.querySelectorAll('#sa-users-tbody tr').forEach(row => {
    row.style.display = !q || row.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
  });
}

function saFilterUsersByCompany(cid) {
  const companies = DB.getList('companies');
  const c = companies.find(x => x.id === cid);
  document.querySelectorAll('#sa-users-tbody tr').forEach(row => {
    if (!cid) { row.style.display = ''; return; }
    const cells = row.querySelectorAll('td');
    row.style.display = cells[2]?.textContent.includes(c?.name || '') ? '' : 'none';
  });
}

function saToggleUser(id) {
  const u = DB.getList('users').find(x => x.id === id);
  if (!u) return;
  const ns = u.status !== 'suspendu' ? 'suspendu' : 'active';
  DB.updateItem('users', id, { status: ns });
  showToast(`Utilisateur ${ns === 'active' ? 'activé' : 'suspendu'}`);
  saNavigate('users');
}

function saDeleteUser(id) {
  confirmAction('Supprimer cet utilisateur ?', () => {
    DB.deleteItem('users', id);
    showToast('Utilisateur supprimé', 'warning');
    saNavigate('users');
  });
}

// ===== ABONNEMENTS =====
function renderSASubscriptions() {
  const companies = DB.getList('companies');
  const revenue = { basic: 0, pro: 0, business: 0 };
  companies.filter(c => c.status === 'active').forEach(c => { if (revenue[c.plan] !== undefined) revenue[c.plan] += PLANS[c.plan].price; });
  const totalRevenue = Object.values(revenue).reduce((s, v) => s + v, 0);

  return `
<div style="margin-bottom:24px;">
  <h2 style="font-size:18px;font-weight:700;">Gestion des abonnements</h2>
</div>

<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px;">
  <div class="stat-card"><div class="stat-icon" style="background:#fef3c7;color:#d97706;">💰</div><div class="stat-info"><div class="stat-label">Revenu mensuel</div><div class="stat-value" style="font-size:18px;">${fmtMoney(totalRevenue)}</div></div></div>
  <div class="stat-card"><div class="stat-icon" style="background:#f1f5f9;color:#64748b;">🥉</div><div class="stat-info"><div class="stat-label">Plan Basic</div><div class="stat-value">${companies.filter(c => c.plan === 'basic').length}</div><div style="font-size:12px;color:var(--text-secondary);">${fmtMoney(revenue.basic)}/mois</div></div></div>
  <div class="stat-card"><div class="stat-icon" style="background:#dbeafe;color:#2563eb;">🥈</div><div class="stat-info"><div class="stat-label">Plan Pro</div><div class="stat-value">${companies.filter(c => c.plan === 'pro').length}</div><div style="font-size:12px;color:var(--text-secondary);">${fmtMoney(revenue.pro)}/mois</div></div></div>
  <div class="stat-card"><div class="stat-icon" style="background:#ede9fe;color:#7c3aed;">🥇</div><div class="stat-info"><div class="stat-label">Plan Business</div><div class="stat-value">${companies.filter(c => c.plan === 'business').length}</div><div style="font-size:12px;color:var(--text-secondary);">${fmtMoney(revenue.business)}/mois</div></div></div>
</div>

<div class="card" style="margin-bottom:20px;">
  <h3 style="font-size:15px;font-weight:700;margin-bottom:16px;">Plans disponibles</h3>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;">
    ${Object.entries(PLANS).map(([key, p]) => {
      const count = companies.filter(c => c.plan === key && c.status === 'active').length;
      return `<div style="border:2px solid ${p.color}33;border-radius:12px;padding:20px;text-align:center;">
        <div style="font-size:32px;margin-bottom:8px;">${key === 'basic' ? '🥉' : key === 'pro' ? '🥈' : '🥇'}</div>
        <h3 style="font-size:18px;font-weight:800;">${p.name}</h3>
        <div style="font-size:28px;font-weight:900;color:${p.color};margin:10px 0;">${p.price}<span style="font-size:12px;"> DH/mois</span></div>
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">${p.maxUsers} utilisateur${p.maxUsers > 1 ? 's' : ''} max</div>
        <div style="font-size:14px;"><b style="font-size:20px;">${count}</b> société${count > 1 ? 's' : ''}</div>
        <div style="font-weight:700;color:var(--success);margin-top:4px;">${fmtMoney(revenue[key])}/mois</div>
      </div>`;
    }).join('')}
  </div>
</div>

<div class="card">
  <h3 style="font-size:15px;font-weight:700;margin-bottom:14px;">Abonnements expirant bientôt</h3>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Société</th><th>Plan</th><th>Expiration</th><th>Actions</th></tr></thead>
      <tbody>
        ${companies.filter(c => c.subscriptionEnd && new Date(c.subscriptionEnd) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)).map(c => {
          const plan = PLANS[c.plan];
          const expired = new Date(c.subscriptionEnd) < new Date();
          return `<tr>
            <td style="font-weight:600;">${escHtml(c.name)}</td>
            <td><span class="badge" style="background:${plan?.color}22;color:${plan?.color};">${plan?.name}</span></td>
            <td style="color:${expired ? '#dc2626' : '#d97706'};font-weight:700;">${fmtDate(c.subscriptionEnd)} ${expired ? '(EXPIRÉ)' : ''}</td>
            <td>
              <button class="btn btn-primary btn-sm" onclick="saRenewSub('${c.id}')"><i class="fas fa-redo"></i> Renouveler</button>
              <button class="btn ${c.status === 'active' ? 'btn-warning' : 'btn-success'} btn-sm" onclick="saToggleCompany('${c.id}')">${c.status === 'active' ? '⏸ Suspendre' : '▶ Activer'}</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    ${companies.filter(c => c.subscriptionEnd && new Date(c.subscriptionEnd) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)).length === 0 ? '<p style="padding:16px;color:var(--text-secondary);font-size:13px;">Aucun abonnement expirant dans les 60 prochains jours.</p>' : ''}
  </div>
</div>`;
}

function saRenewSub(companyId) {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  const newDate = d.toISOString().split('T')[0];
  DB.updateItem('companies', companyId, { subscriptionEnd: newDate, status: 'active' });
  showToast('Abonnement renouvelé pour 1 an');
  saNavigate('subscriptions');
}

// ===== STATISTIQUES =====
function renderSAStats() {
  const companies = DB.getList('companies');
  const users = DB.getList('users');
  const chantiers = DB.getList('chantiers');
  const factures = DB.getList('factures');
  const clients = DB.getList('clients');

  const totalChantiers = chantiers.length;
  const totalFactures = factures.length;
  const totalClients = clients.length;

  return `
<div style="margin-bottom:24px;">
  <h2 style="font-size:18px;font-weight:700;">Statistiques globales de la plateforme</h2>
</div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px;">
  <div class="stat-card"><div class="stat-icon" style="background:#dbeafe;color:#2563eb;">🏢</div><div class="stat-info"><div class="stat-label">Sociétés</div><div class="stat-value">${companies.length}</div></div></div>
  <div class="stat-card"><div class="stat-icon" style="background:#dcfce7;color:#16a34a;">👥</div><div class="stat-info"><div class="stat-label">Utilisateurs</div><div class="stat-value">${users.filter(u => u.role !== 'super_admin').length}</div></div></div>
  <div class="stat-card"><div class="stat-icon" style="background:#ede9fe;color:#7c3aed;">🏗️</div><div class="stat-info"><div class="stat-label">Chantiers</div><div class="stat-value">${totalChantiers}</div></div></div>
  <div class="stat-card"><div class="stat-icon" style="background:#fef3c7;color:#d97706;">📄</div><div class="stat-info"><div class="stat-label">Factures</div><div class="stat-value">${totalFactures}</div></div></div>
</div>
<div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:20px;">
  <div class="card">
    <h3 style="font-size:15px;font-weight:700;margin-bottom:14px;">Sociétés par plan</h3>
    <canvas id="stats-bar-chart" height="220"></canvas>
  </div>
  <div class="card">
    <h3 style="font-size:15px;font-weight:700;margin-bottom:14px;">Top métriques</h3>
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div style="padding:12px;background:var(--bg-main);border-radius:8px;">
        <div style="font-size:12px;color:var(--text-secondary);">Taux d'activité</div>
        <div style="font-size:22px;font-weight:800;color:#16a34a;">${companies.length > 0 ? Math.round((companies.filter(c => c.status === 'active').length / companies.length) * 100) : 0}%</div>
        <div class="progress-bar-container" style="margin-top:6px;"><div class="progress-bar progress-green" style="width:${companies.length > 0 ? Math.round((companies.filter(c => c.status === 'active').length / companies.length) * 100) : 0}%"></div></div>
      </div>
      <div style="padding:12px;background:var(--bg-main);border-radius:8px;">
        <div style="font-size:12px;color:var(--text-secondary);">Revenu mensuel total</div>
        <div style="font-size:18px;font-weight:800;color:#2563eb;">${fmtMoney(companies.filter(c => c.status === 'active').reduce((s, c) => s + (PLANS[c.plan]?.price || 0), 0))}</div>
      </div>
      <div style="padding:12px;background:var(--bg-main);border-radius:8px;">
        <div style="font-size:12px;color:var(--text-secondary);">Clients total (toutes sociétés)</div>
        <div style="font-size:22px;font-weight:800;">${totalClients}</div>
      </div>
    </div>
  </div>
</div>
<div class="card">
  <h3 style="font-size:15px;font-weight:700;margin-bottom:14px;">Utilisation par société</h3>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Société</th><th>Plan</th><th>Utilisateurs</th><th>Chantiers</th><th>Clients</th><th>Factures</th></tr></thead>
      <tbody>
        ${companies.map(c => {
          const cUsers = users.filter(u => u.companyId === c.id).length;
          const cChantiers = chantiers.filter(ch => ch.companyId === c.id).length;
          const cClients = clients.filter(cl => cl.companyId === c.id).length;
          const cFactures = factures.filter(f => f.companyId === c.id).length;
          return `<tr>
            <td style="font-weight:600;">${escHtml(c.name)}</td>
            <td><span class="badge" style="background:${PLANS[c.plan]?.color}22;color:${PLANS[c.plan]?.color};">${PLANS[c.plan]?.name}</span></td>
            <td>${cUsers}</td><td>${cChantiers}</td><td>${cClients}</td><td>${cFactures}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>
</div>`;
}

function initStatsCharts() {
  const companies = DB.getList('companies');
  const isDark = localStorage.getItem('theme') === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  const byPlan = { basic: companies.filter(c => c.plan === 'basic').length, pro: companies.filter(c => c.plan === 'pro').length, business: companies.filter(c => c.plan === 'business').length };
  const ctx = document.getElementById('stats-bar-chart');
  if (ctx) new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Basic (50 DH)', 'Pro (100 DH)', 'Business (300 DH)'],
      datasets: [
        { label: 'Sociétés', data: [byPlan.basic, byPlan.pro, byPlan.business], backgroundColor: ['#94a3b8', '#3b82f6', '#7c3aed'], borderRadius: 6 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor, stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.05)' } } } }
  });
}

// Launch
saInit();
