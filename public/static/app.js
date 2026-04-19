// ===== BATIGEST PRO – APPLICATION PRINCIPALE (Supabase) =====

const AppState = {
  currentUser: null,
  currentProfile: null,
  currentCompany: null,
  currentPage: 'dashboard',
  theme: localStorage.getItem('theme') || 'light',
  lang: localStorage.getItem('lang') || 'fr',
  cache: {},
};

// ===== UTILITAIRES =====
function fmt(n) { return Number(n || 0).toLocaleString('fr-MA') + ' DH'; }
function fmtDate(d) { if (!d) return '–'; try { return new Date(d).toLocaleDateString('fr-FR'); } catch { return d; } }
function genNum(prefix, arr) { return prefix + '-' + new Date().getFullYear() + '-' + String((arr.length + 1)).padStart(3, '0'); }

function setTheme(t) {
  AppState.theme = t;
  localStorage.setItem('theme', t);
  document.documentElement.setAttribute('data-theme', t);
}

function toast(msg, type = 'success') {
  const colors = { success: '#16a34a', danger: '#dc2626', warning: '#d97706', info: '#2563eb' };
  const icons = { success: 'fa-check-circle', danger: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  let c = document.getElementById('toast-container');
  if (!c) { c = document.createElement('div'); c.id = 'toast-container'; c.className = 'toast-container'; document.body.appendChild(c); }
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<i class="fas ${icons[type]}" style="color:${colors[type]}"></i><span style="flex:1">${msg}</span><button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:var(--text-secondary)"><i class="fas fa-times"></i></button>`;
  c.appendChild(t);
  setTimeout(() => t.style.opacity = '0', 3500);
  setTimeout(() => t.remove(), 3800);
}

function showLoading(msg = 'Chargement...') {
  document.getElementById('app-root').innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:16px">
      <div style="width:48px;height:48px;background:var(--primary);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px">🏗️</div>
      <div class="loading-spinner"></div>
      <div style="color:var(--text-secondary);font-size:14px">${msg}</div>
    </div>`;
}

function openModal(html, size = '') {
  const existing = document.getElementById('modal-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-overlay';
  overlay.innerHTML = `<div class="modal ${size}" id="modal-box">${html}</div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
}
function closeModal() { const e = document.getElementById('modal-overlay'); if (e) e.remove(); }

function confirmDialog(msg, onOk) {
  openModal(`
    <div class="modal-header"><h3 class="modal-title"><i class="fas fa-question-circle text-yellow-500 mr-2"></i>Confirmation</h3>
    <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
    <p style="color:var(--text-secondary);margin-bottom:24px">${msg}</p>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-danger" onclick="closeModal();(${onOk.toString()})()"><i class="fas fa-trash"></i> Confirmer</button>
    </div>`);
}

function navigate(page) {
  AppState.currentPage = page;
  AppState.cache = {};
  closeSidebar();
  renderMain();
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  if (sb) sb.classList.toggle('open');
}
function closeSidebar() {
  const sb = document.getElementById('sidebar');
  if (sb) sb.classList.remove('open');
}

// ===== STAT CARDS =====
function statCard(label, val, icon, color, trend = 'up', sub = '') {
  return `<div class="stat-card">
    <div class="stat-icon" style="background:${color}22"><i class="fas ${icon}" style="color:${color}"></i></div>
    <div class="stat-info">
      <div class="stat-label">${label}</div>
      <div class="stat-value">${val}</div>
      ${sub ? `<div class="stat-change ${trend}"><i class="fas fa-arrow-${trend}"></i> ${sub}</div>` : ''}
    </div>
  </div>`;
}

// ===== AUTH =====
async function initApp() {
  setTheme(AppState.theme);

  // Nettoyer TOUTES les anciennes clés de session Supabase (migration localStorage)
  // pour éviter les conflits de session entre app et super-admin
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('sb-') || key.startsWith('supabase.auth'))) {
      // Garder seulement la clé de cette page
      if (key !== 'sb-app-auth') keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));

  const session = await SB.getSession();
  if (session) {
    await loadUserProfile(session.user.id);
  } else {
    renderLoginPage();
  }
}

async function loadUserProfile(userId) {
  showLoading('Chargement de votre espace...');
  const { data: profile, error } = await SB.getProfile(userId);
  if (error || !profile) {
    await SB.signOut();
    renderLoginPage();
    return;
  }
  AppState.currentProfile = profile;
  AppState.currentUser = profile;
  AppState.currentCompany = profile.companies || null;

  // Vérifier si l'utilisateur est suspendu
  if (profile.status === 'suspended') {
    await SB.signOut();
    renderLoginPage('Votre compte a été suspendu. Contactez l\'administrateur.');
    return;
  }

  if (profile.role === 'super_admin') {
    // Super admin ne peut pas accéder à l'app normale
    await SB.signOut();
    renderLoginPage('Ce compte est réservé au Super Admin. Accédez via /super-admin');
    return;
  }

  if (!profile.company_id || !profile.companies) {
    renderNoCompany();
    return;
  }

  // Synchroniser le logo depuis Supabase vers localStorage (pour accès rapide dans PDF)
  const co = profile.companies;
  if (co?.logo && !localStorage.getItem('batigest_logo_' + co.id)) {
    localStorage.setItem('batigest_logo_' + co.id, co.logo);
  }

  // Appliquer la couleur d'app sauvegardée
  try {
    const appStyle = JSON.parse(localStorage.getItem('batigest_app_style') || '{}');
    if (appStyle.color) {
      document.documentElement.style.setProperty('--primary', appStyle.color);
    }
  } catch (_) {}

  renderApp();
}

async function doLogin(email, password) {
  const { data, error } = await SB.signIn(email, password);
  if (error) {
    // Message d'erreur clair en français
    if (error.message.includes('Invalid login') || error.message.includes('invalid_credentials') || error.status === 400) {
      return { error: 'Email ou mot de passe incorrect. Vérifiez vos identifiants.' };
    }
    if (error.message.includes('Email not confirmed')) {
      return { error: 'Veuillez confirmer votre email avant de vous connecter. Contactez votre administrateur pour activer votre compte.' };
    }
    return { error: 'Erreur de connexion. Réessayez dans quelques instants.' };
  }
  await loadUserProfile(data.user.id);
  return { ok: true };
}

async function doLogout() {
  await SB.signOut();
  AppState.currentUser = null;
  AppState.currentProfile = null;
  AppState.currentCompany = null;
  renderLoginPage();
}

// ===== PAGE LOGIN =====
function renderLoginPage(errorMsg = '') {
  document.getElementById('app-root').innerHTML = `
  <div id="login-page">
    <div class="login-left">
      <div class="login-hero">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:32px">
          <div style="width:56px;height:56px;background:var(--primary);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:28px">🏗️</div>
          <div>
            <div style="color:#fff;font-size:22px;font-weight:800">BatiGest Pro</div>
            <div style="color:#94a3b8;font-size:13px">Gestion BTP & Commerce</div>
          </div>
        </div>
        <h1>Gérez vos chantiers<br/><span style="color:#60a5fa">en toute simplicité</span></h1>
        <p>Plateforme SaaS complète pour la gestion des chantiers BTP, facturation, stock et suivi financier en temps réel.</p>
        <ul class="feature-list">
          <li><span class="check"><i class="fas fa-check"></i></span>Suivi financier complet des chantiers</li>
          <li><span class="check"><i class="fas fa-check"></i></span>Gestion clients, devis et factures</li>
          <li><span class="check"><i class="fas fa-check"></i></span>Contrôle stock et fournisseurs</li>
          <li><span class="check"><i class="fas fa-check"></i></span>Tableau de bord avec graphiques</li>
          <li><span class="check"><i class="fas fa-check"></i></span>Données sécurisées dans le cloud ☁️</li>
        </ul>
      </div>
    </div>
    <div class="login-right">
      <div class="login-box">
        <div class="login-logo">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <div style="width:40px;height:40px;background:var(--primary);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px">🏗️</div>
            <span style="font-size:20px;font-weight:800;color:var(--text-primary)">BatiGest Pro</span>
          </div>
          <h2 style="font-size:24px;font-weight:700;color:var(--text-primary);margin-bottom:4px">Connexion</h2>
          <p style="color:var(--text-secondary);font-size:14px">Accédez à votre espace de gestion</p>
        </div>
        <form id="login-form">
          <div class="form-group">
            <label class="form-label">Adresse email</label>
            <div style="position:relative">
              <i class="fas fa-envelope" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-secondary);font-size:13px"></i>
              <input type="email" id="login-email" class="form-input" style="padding-left:36px" placeholder="votre@email.com" required/>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Mot de passe</label>
            <div style="position:relative">
              <i class="fas fa-lock" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-secondary);font-size:13px"></i>
              <input type="password" id="login-password" class="form-input" style="padding-left:36px;padding-right:40px" placeholder="••••••••" required/>
              <button type="button" onclick="togglePwd()" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-secondary)"><i class="fas fa-eye" id="pwd-eye"></i></button>
            </div>
          </div>
          <div id="login-error" style="display:none;color:var(--danger);font-size:13px;margin-bottom:12px;padding:10px;background:rgba(220,38,38,0.08);border-radius:8px;border-left:3px solid var(--danger)">
            <i class="fas fa-exclamation-circle"></i> <span id="login-error-msg">Email ou mot de passe incorrect</span>
          </div>
          <button type="submit" class="btn btn-primary btn-lg" style="width:100%;justify-content:center;margin-bottom:16px" id="login-btn">
            <i class="fas fa-sign-in-alt"></i> Se connecter
          </button>
        </form>
        ${errorMsg ? `<div style="background:rgba(220,38,38,0.08);border:1px solid rgba(220,38,38,0.2);border-radius:10px;padding:12px 14px;margin-bottom:12px;display:flex;align-items:center;gap:10px">
          <i class="fas fa-exclamation-triangle" style="color:#dc2626;font-size:14px"></i>
          <span style="font-size:12px;color:#dc2626">${errorMsg}</span>
        </div>` : ''}
        <div style="background:var(--bg-main);border-radius:10px;padding:12px 14px;border:1px solid var(--border);display:flex;align-items:center;gap:10px">
          <i class="fas fa-info-circle" style="color:#2563eb;font-size:14px"></i>
          <span style="font-size:12px;color:var(--text-secondary)">Contactez votre administrateur pour obtenir vos identifiants de connexion.</span>
        </div>
      </div>
    </div>
  </div>
  <style>
    .demo-acc { display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;transition:background 0.2s; }
    .demo-acc:hover { background:var(--border); }
  </style>`;

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');
    const errEl = document.getElementById('login-error');
    errEl.style.display = 'none';
    btn.innerHTML = '<span class="loading-spinner"></span> Connexion...';
    btn.disabled = true;
    const result = await doLogin(email, password);
    if (result && result.error) {
      document.getElementById('login-error-msg').textContent = result.error;
      errEl.style.display = 'block';
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
      btn.disabled = false;
    }
  });
}

function togglePwd() {
  const inp = document.getElementById('login-password');
  const eye = document.getElementById('pwd-eye');
  if (inp.type === 'password') { inp.type = 'text'; eye.className = 'fas fa-eye-slash'; }
  else { inp.type = 'password'; eye.className = 'fas fa-eye'; }
}

function renderNoCompany() {
  document.getElementById('app-root').innerHTML = `
  <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:16px;padding:24px;text-align:center">
    <div style="font-size:48px">⚠️</div>
    <h2 style="font-size:22px;font-weight:700">Aucune société associée</h2>
    <p style="color:var(--text-secondary)">Votre compte n'est pas encore lié à une société.<br>Contactez votre administrateur.</p>
    <button class="btn btn-secondary" onclick="doLogout()"><i class="fas fa-sign-out-alt"></i> Déconnexion</button>
  </div>`;
}

// ===== APP PRINCIPALE =====
function renderApp() {
  document.getElementById('app-root').innerHTML = `
    <div id="sidebar"></div>
    <div id="sidebar-overlay" onclick="closeSidebar()"></div>
    <div id="main-content">
      <div id="topbar"></div>
      <div id="page-content"></div>
    </div>`;
  renderSidebar();
  renderTopbar();
  renderMain();
}

// ===== SIDEBAR =====
function renderSidebar() {
  const u = AppState.currentProfile;
  const co = AppState.currentCompany;
  const isAdmin = u?.role === 'admin';
  const planLabels = { basic: 'Basic', pro: 'Pro', business: 'Business' };
  const planColors = { basic: '#64748b', pro: '#2563eb', business: '#7c3aed' };
  const plan = co?.plan || 'basic';

  const nav = [
    { page: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard', section: null },
    { page: 'chantiers', icon: 'fa-hard-hat', label: 'Chantiers', section: 'PROJETS' },
    { page: 'clients', icon: 'fa-users', label: 'Clients', section: null },
    { page: 'devis', icon: 'fa-file-alt', label: 'Devis', section: 'COMMERCE' },
    { page: 'factures', icon: 'fa-file-invoice-dollar', label: 'Factures', section: null },
    { page: 'paiements', icon: 'fa-money-bill-wave', label: 'Paiements', section: null },
    { page: 'stock', icon: 'fa-boxes', label: 'Stock', section: 'LOGISTIQUE' },
    { page: 'fournisseurs', icon: 'fa-truck', label: 'Fournisseurs', section: null },
    { page: 'agenda', icon: 'fa-calendar-alt', label: 'Agenda', section: 'OUTILS' },
    { page: 'rapports', icon: 'fa-chart-bar', label: 'Rapports', section: null },
    ...(isAdmin ? [{ page: 'parametres', icon: 'fa-cog', label: 'Paramètres', section: 'ADMIN' }] : []),
  ];

  let lastSection = null;
  const navHtml = nav.map(item => {
    let sectionHtml = '';
    if (item.section && item.section !== lastSection) {
      lastSection = item.section;
      sectionHtml = `<div class="nav-section-label">${item.section}</div>`;
    }
    const active = AppState.currentPage === item.page ? 'active' : '';
    return `${sectionHtml}<div class="nav-item ${active}" onclick="navigate('${item.page}')">
      <i class="fas ${item.icon}"></i><span>${item.label}</span></div>`;
  }).join('');

  document.getElementById('sidebar').innerHTML = `
    <div class="sidebar-header">
      <div style="display:flex;align-items:center;gap:10px">
        ${co?.logo ? `<img src="${co.logo}" style="width:36px;height:36px;border-radius:8px;object-fit:cover"/>` : `<div style="width:36px;height:36px;background:var(--primary);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px">🏗️</div>`}
        <div>
          <div style="font-weight:800;font-size:14px;color:var(--text-primary)">${co?.name || 'BatiGest'}</div>
          <span class="badge" style="background:${planColors[plan]}22;color:${planColors[plan]};font-size:10px">${planLabels[plan]}</span>
        </div>
      </div>
    </div>
    <nav class="sidebar-nav">${navHtml}</nav>
    <div class="sidebar-footer">
      <div style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;background:var(--bg-main);margin-bottom:8px">
        <div style="width:32px;height:32px;background:var(--primary);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:700">${(u?.name||'?')[0].toUpperCase()}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u?.name || 'Utilisateur'}</div>
          <div style="font-size:11px;color:var(--text-secondary)">${u?.role === 'admin' ? 'Administrateur' : 'Utilisateur'}</div>
        </div>
      </div>
      <button class="btn-ghost" onclick="doLogout()" style="width:100%;justify-content:center;color:var(--danger);font-size:13px;display:flex;align-items:center;gap:6px;padding:8px;border-radius:8px;background:none;border:none;cursor:pointer">
        <i class="fas fa-sign-out-alt"></i> Déconnexion
      </button>
    </div>`;
}

// ===== TOPBAR =====
function renderTopbar() {
  const pageLabels = { dashboard:'Dashboard', chantiers:'Chantiers', clients:'Clients', devis:'Devis', factures:'Factures', paiements:'Paiements', stock:'Stock', fournisseurs:'Fournisseurs', agenda:'Agenda', rapports:'Rapports', parametres:'Paramètres' };
  document.getElementById('topbar').innerHTML = `
    <div class="topbar">
      <div style="display:flex;align-items:center;gap:8px">
        <button class="sidebar-toggle" onclick="toggleSidebar()"><i class="fas fa-bars"></i></button>
        <h1 style="font-size:18px;font-weight:700">${pageLabels[AppState.currentPage] || AppState.currentPage}</h1>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <button class="btn-ghost" onclick="setTheme(AppState.theme==='light'?'dark':'light')" style="background:none;border:none;cursor:pointer;padding:6px;border-radius:8px;color:var(--text-secondary)">
          <i class="fas fa-${AppState.theme === 'light' ? 'moon' : 'sun'}"></i>
        </button>
      </div>
    </div>`;
}

// ===== RENDER MAIN =====
async function renderMain() {
  const content = document.getElementById('page-content');
  if (!content) return;
  content.innerHTML = `<div style="display:flex;justify-content:center;padding:40px"><div class="loading-spinner"></div></div>`;
  renderTopbar();
  renderSidebar();

  const pages = {
    dashboard: renderDashboard,
    chantiers: renderChantiers,
    clients: renderClients,
    devis: renderDevis,
    factures: renderFactures,
    paiements: renderPaiements,
    stock: renderStock,
    fournisseurs: renderFournisseurs,
    agenda: renderAgenda,
    rapports: renderRapports,
    parametres: renderParametres,
  };

  const fn = pages[AppState.currentPage];
  if (fn) await fn();
}

// ===== DASHBOARD =====
async function renderDashboard() {
  const cid = AppState.currentCompany?.id;
  const content = document.getElementById('page-content');

  const [{ data: factures }, { data: chantiers }, { data: clients }, { data: devis }] = await Promise.all([
    SB.getAll('factures', cid),
    SB.getAll('chantiers', cid),
    SB.getAll('clients', cid),
    SB.getAll('devis', cid),
  ]);

  const totalCA = (factures || []).filter(f => f.statut === 'paye').reduce((s, f) => s + Number(f.montant_ttc), 0);
  const totalImpaye = (factures || []).filter(f => f.statut !== 'paye').reduce((s, f) => s + (Number(f.montant_ttc) - Number(f.montant_paye)), 0);
  const chantiersActifs = (chantiers || []).filter(c => c.statut === 'en_cours').length;
  const devisEnAttente = (devis || []).filter(d => d.statut === 'en_attente').length;

  content.innerHTML = `
  <div style="margin-bottom:24px">
    <h2 style="font-size:20px;font-weight:700">Bonjour, ${AppState.currentProfile?.name?.split(' ')[0]} 👋</h2>
    <p style="color:var(--text-secondary);font-size:13px">${AppState.currentCompany?.name} — ${new Date().toLocaleDateString('fr-FR', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
  </div>
  <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin-bottom:24px">
    ${statCard('Chiffre d\'affaires', fmt(totalCA), 'fa-chart-line', '#16a34a', 'up', `${(factures||[]).filter(f=>f.statut==='paye').length} factures payées`)}
    ${statCard('Impayés', fmt(totalImpaye), 'fa-exclamation-circle', '#dc2626', 'down', `${(factures||[]).filter(f=>f.statut!=='paye').length} en attente`)}
    ${statCard('Chantiers actifs', chantiersActifs, 'fa-hard-hat', '#7c3aed', 'up', `${(chantiers||[]).length} au total`)}
    ${statCard('Devis en attente', devisEnAttente, 'fa-file-alt', '#d97706', 'up', `${(devis||[]).length} devis total`)}
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="font-weight:700">Derniers chantiers</h3>
        <button class="btn btn-secondary btn-sm" onclick="navigate('chantiers')">Voir tout</button>
      </div>
      ${(chantiers||[]).slice(0,4).map(ch => {
        const cls = ch.statut==='en_cours'?'badge-success':ch.statut==='termine'?'badge-secondary':'badge-warning';
        const lbl = ch.statut==='en_cours'?'En cours':ch.statut==='termine'?'Terminé':'Pause';
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-weight:600;font-size:14px">${ch.nom}</div>
            <div style="font-size:12px;color:var(--text-secondary)">${ch.client_nom||'–'}</div>
          </div>
          <span class="badge ${cls}">${lbl}</span>
        </div>`;
      }).join('') || '<div style="color:var(--text-secondary);text-align:center;padding:20px">Aucun chantier</div>'}
    </div>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="font-weight:700">Dernières factures</h3>
        <button class="btn btn-secondary btn-sm" onclick="navigate('factures')">Voir tout</button>
      </div>
      ${(factures||[]).slice(0,4).map(f => {
        const cls = f.statut==='paye'?'badge-success':f.statut==='non_paye'?'badge-danger':'badge-warning';
        const lbl = f.statut==='paye'?'Payé':f.statut==='non_paye'?'Impayé':'Partiel';
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-weight:600;font-size:14px">${f.numero}</div>
            <div style="font-size:12px;color:var(--text-secondary)">${f.client_nom||'–'}</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:700;font-size:13px">${fmt(f.montant_ttc)}</div>
            <span class="badge ${cls}">${lbl}</span>
          </div>
        </div>`;
      }).join('') || '<div style="color:var(--text-secondary);text-align:center;padding:20px">Aucune facture</div>'}
    </div>
  </div>
  <div class="card">
    <h3 style="font-weight:700;margin-bottom:16px">Vue d'ensemble</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px">
      <div style="text-align:center;padding:16px;background:var(--bg-main);border-radius:10px;cursor:pointer" onclick="navigate('clients')">
        <div style="font-size:24px;font-weight:800;color:#2563eb">${(clients||[]).length}</div>
        <div style="font-size:12px;color:var(--text-secondary)">Clients</div>
      </div>
      <div style="text-align:center;padding:16px;background:var(--bg-main);border-radius:10px;cursor:pointer" onclick="navigate('devis')">
        <div style="font-size:24px;font-weight:800;color:#7c3aed">${(devis||[]).length}</div>
        <div style="font-size:12px;color:var(--text-secondary)">Devis</div>
      </div>
      <div style="text-align:center;padding:16px;background:var(--bg-main);border-radius:10px;cursor:pointer" onclick="navigate('factures')">
        <div style="font-size:24px;font-weight:800;color:#16a34a">${(factures||[]).length}</div>
        <div style="font-size:12px;color:var(--text-secondary)">Factures</div>
      </div>
      <div style="text-align:center;padding:16px;background:var(--bg-main);border-radius:10px;cursor:pointer" onclick="navigate('chantiers')">
        <div style="font-size:24px;font-weight:800;color:#d97706">${(chantiers||[]).length}</div>
        <div style="font-size:12px;color:var(--text-secondary)">Chantiers</div>
      </div>
    </div>
  </div>`;
}

// ===== CLIENTS =====
async function renderClients() {
  const cid = AppState.currentCompany?.id;
  const { data: clients } = await SB.getAll('clients', cid);
  const content = document.getElementById('page-content');
  content.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div><h2 style="font-size:20px;font-weight:700">Clients</h2><p style="color:var(--text-secondary);font-size:13px">${(clients||[]).length} clients</p></div>
    <button class="btn btn-primary" onclick="openClientModal()"><i class="fas fa-plus"></i> Nouveau client</button>
  </div>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Ville</th><th>Type</th><th>Actions</th></tr></thead>
      <tbody>
        ${!(clients||[]).length ? `<tr><td colspan="6"><div class="empty-state"><div class="icon">👥</div><h3>Aucun client</h3></div></td></tr>` :
        (clients||[]).map(c => `<tr>
          <td style="font-weight:600">${c.name}</td>
          <td>${c.email||'–'}</td>
          <td>${c.phone||'–'}</td>
          <td>${c.city||'–'}</td>
          <td><span class="badge badge-info">${c.type||'particulier'}</span></td>
          <td>
            <button class="btn btn-ghost btn-sm" onclick="openClientModal('${c.id}')"><i class="fas fa-edit" style="color:#2563eb"></i></button>
            <button class="btn btn-ghost btn-sm" onclick="deleteClient('${c.id}')"><i class="fas fa-trash" style="color:#dc2626"></i></button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

async function openClientModal(id = null) {
  const cid = AppState.currentCompany?.id;
  let client = {};
  if (id) { const { data } = await SB.getOne('clients', id); client = data || {}; }
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-user-plus" style="margin-right:8px;color:#2563eb"></i>${id ? 'Modifier client' : 'Nouveau client'}</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Nom <span class="req">*</span></label><input id="cl-name" class="form-input" value="${client.name||''}" placeholder="Nom complet"/></div>
      <div class="form-group"><label class="form-label">Type</label>
        <select id="cl-type" class="form-select">
          <option value="particulier" ${client.type==='particulier'?'selected':''}>Particulier</option>
          <option value="entreprise" ${client.type==='entreprise'?'selected':''}>Entreprise</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Email</label><input id="cl-email" class="form-input" value="${client.email||''}" placeholder="email@example.com"/></div>
      <div class="form-group"><label class="form-label">Téléphone</label><input id="cl-phone" class="form-input" value="${client.phone||''}" placeholder="06XXXXXXXX"/></div>
      <div class="form-group"><label class="form-label">Ville</label><input id="cl-city" class="form-input" value="${client.city||''}" placeholder="Casablanca"/></div>
      <div class="form-group"><label class="form-label">Notes</label><input id="cl-notes" class="form-input" value="${client.notes||''}" placeholder="Notes..."/></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveClient('${id||''}')"><i class="fas fa-save"></i> ${id ? 'Modifier' : 'Créer'}</button>
    </div>`);
}

async function saveClient(id) {
  const name = document.getElementById('cl-name').value.trim();
  if (!name) { toast('Nom requis', 'danger'); return; }
  const item = {
    company_id: AppState.currentCompany.id,
    name, email: document.getElementById('cl-email').value,
    phone: document.getElementById('cl-phone').value,
    city: document.getElementById('cl-city').value,
    type: document.getElementById('cl-type').value,
    notes: document.getElementById('cl-notes').value,
  };
  const { error: ce } = id ? await SB.update('clients', id, item) : await SB.insert('clients', item);
  if (ce) { toast('Erreur : ' + ce.message, 'danger'); return; }
  toast(id ? 'Client modifié' : 'Client créé', 'success');
  closeModal(); navigate('clients');
}

async function deleteClient(id) {
  confirmDialog('Supprimer ce client ?', async () => {
    await SB.remove('clients', id);
    toast('Client supprimé', 'danger');
    navigate('clients');
  });
}

// ===== DEVIS =====
async function renderDevis() {
  const cid = AppState.currentCompany?.id;
  const { data: devis } = await SB.getAll('devis', cid);
  const stMap = { accepte: 'badge-success', en_attente: 'badge-warning', refuse: 'badge-danger', expire: 'badge-secondary' };
  const stLabel = { accepte: 'Accepté', en_attente: 'En attente', refuse: 'Refusé', expire: 'Expiré' };
  const content = document.getElementById('page-content');
  content.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div><h2 style="font-size:20px;font-weight:700">Devis</h2><p style="color:var(--text-secondary);font-size:13px">${(devis||[]).length} devis</p></div>
    <button class="btn btn-primary" onclick="openDevisModal()"><i class="fas fa-plus"></i> Nouveau devis</button>
  </div>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Numéro</th><th>Client</th><th>Date</th><th>Validité</th><th>Montant HT</th><th>TTC</th><th>Statut</th><th>Actions</th></tr></thead>
      <tbody>
        ${!(devis||[]).length ? `<tr><td colspan="8"><div class="empty-state"><div class="icon">📄</div><h3>Aucun devis</h3></div></td></tr>` :
        (devis||[]).map(d => `<tr>
          <td style="font-weight:700">${d.numero}</td>
          <td>${d.client_nom||'–'}</td>
          <td>${fmtDate(d.date)}</td>
          <td>${fmtDate(d.date_validite || d.validite)}</td>
          <td>${fmt(d.montant_ht)}</td>
          <td style="font-weight:700">${fmt(d.montant_ttc)}</td>
          <td><span class="badge ${stMap[d.statut]||'badge-secondary'}">${stLabel[d.statut]||d.statut}</span></td>
          <td style="white-space:nowrap">
            <button class="btn btn-ghost btn-sm" title="Aperçu" onclick="previewDevis('${d.id}')"><i class="fas fa-eye" style="color:#7c3aed"></i></button>
            ${d.statut==='en_attente'?`<button class="btn btn-ghost btn-sm" title="Modifier" onclick="openDevisModal('${d.id}')"><i class="fas fa-edit" style="color:#2563eb"></i></button>`:''}
            <button class="btn btn-ghost btn-sm" title="PDF" onclick="printDevis('${d.id}')"><i class="fas fa-print" style="color:#0891b2"></i></button>
            <button class="btn btn-ghost btn-sm" title="Convertir" onclick="convertToFacture('${d.id}')"><i class="fas fa-file-invoice-dollar" style="color:#16a34a"></i></button>
            <button class="btn btn-ghost btn-sm" onclick="deleteDevis('${d.id}')"><i class="fas fa-trash" style="color:#dc2626"></i></button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

async function openDevisModal(id = null) {
  const cid = AppState.currentCompany?.id;
  const { data: clients } = await SB.getAll('clients', cid);
  const { data: allDevis } = await SB.getAll('devis', cid);
  let dv = {};
  if (id) { const { data } = await SB.getOne('devis', id); dv = data || {}; }
  const num = dv.numero || genNum('DEV', allDevis||[]);
  const lignesHtml = ((dv.lignes)||[{designation:'',qte:1,prix:0}]).map(l => `
    <div class="devis-ligne" style="display:grid;grid-template-columns:3fr 1fr 1fr auto;gap:8px;margin-bottom:8px">
      <input class="form-input" placeholder="Désignation" name="designation" value="${l.designation||''}"/>
      <input type="number" class="form-input" placeholder="Qté" name="qte" value="${l.qte||1}" oninput="calcDevisTotal()"/>
      <input type="number" class="form-input" placeholder="Prix unitaire" name="prix" value="${l.prix||0}" oninput="calcDevisTotal()"/>
      <button class="btn btn-ghost" onclick="removeDevisLigne(this)"><i class="fas fa-minus-circle" style="color:#dc2626"></i></button>
    </div>`).join('');
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-file-alt" style="color:#2563eb;margin-right:8px"></i>${id?'Modifier':'Nouveau'} devis</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Numéro</label><input id="dv-num" class="form-input" value="${num}" readonly style="background:var(--bg-main)"/></div>
      <div class="form-group"><label class="form-label">Client <span class="req">*</span></label>
        <select id="dv-client" class="form-select">
          <option value="">– Sélectionner –</option>
          ${(clients||[]).map(c=>`<option value="${c.id}" data-nom="${c.name}" ${c.id===dv.client_id?'selected':''}>${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Date</label><input id="dv-date" type="date" class="form-input" value="${dv.date||new Date().toISOString().split('T')[0]}"/></div>
      <div class="form-group"><label class="form-label">Validité</label><input id="dv-validite" type="date" class="form-input" value="${dv.date_validite||dv.validite||''}"/></div>
    </div>
    <div style="margin-bottom:16px">
      <label class="form-label">Lignes du devis</label>
      <div id="devis-lignes">${lignesHtml}</div>
      <button class="btn btn-secondary btn-sm" onclick="addDevisLigne()"><i class="fas fa-plus"></i> Ajouter ligne</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;background:var(--bg-main);padding:14px;border-radius:10px;margin-bottom:16px">
      <div><div style="font-size:12px;color:var(--text-secondary)">Total HT</div><div id="dv-total-ht" style="font-size:18px;font-weight:700">0 DH</div></div>
      <div><label class="form-label">TVA (%)</label><input id="dv-tva" type="number" class="form-input" value="${dv.tva||20}" oninput="calcDevisTotal()"/></div>
      <div><div style="font-size:12px;color:var(--text-secondary)">Total TTC</div><div id="dv-total-ttc" style="font-size:18px;font-weight:700;color:#2563eb">0 DH</div></div>
    </div>
    ${id?`<div class="form-group"><label class="form-label">Statut</label>
      <select id="dv-statut" class="form-select">
        <option value="en_attente" ${dv.statut==='en_attente'?'selected':''}>En attente</option>
        <option value="accepte" ${dv.statut==='accepte'?'selected':''}>Accepté</option>
        <option value="refuse" ${dv.statut==='refuse'?'selected':''}>Refusé</option>
      </select></div>`:''}
    <div class="form-group"><label class="form-label">Notes</label><textarea id="dv-notes" class="form-textarea" placeholder="Conditions, remarques...">${dv.notes||''}</textarea></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveDevis('${id||''}')"><i class="fas fa-save"></i> ${id?'Enregistrer':'Créer le devis'}</button>
    </div>`, 'modal-lg');
  setTimeout(calcDevisTotal, 100);
}

function addDevisLigne() {
  const c = document.getElementById('devis-lignes');
  const d = document.createElement('div');
  d.className = 'devis-ligne';
  d.style.cssText = 'display:grid;grid-template-columns:3fr 1fr 1fr auto;gap:8px;margin-bottom:8px';
  d.innerHTML = `<input class="form-input" placeholder="Désignation" name="designation"/><input type="number" class="form-input" placeholder="Qté" name="qte" value="1" oninput="calcDevisTotal()"/><input type="number" class="form-input" placeholder="Prix unitaire" name="prix" value="0" oninput="calcDevisTotal()"/><button class="btn btn-ghost" onclick="removeDevisLigne(this)"><i class="fas fa-minus-circle" style="color:#dc2626"></i></button>`;
  c.appendChild(d);
}
function removeDevisLigne(btn) { btn.closest('.devis-ligne').remove(); calcDevisTotal(); }
function calcDevisTotal() {
  let ht = 0;
  document.querySelectorAll('.devis-ligne').forEach(l => {
    ht += (parseFloat(l.querySelector('[name="qte"]')?.value)||0) * (parseFloat(l.querySelector('[name="prix"]')?.value)||0);
  });
  const tva = parseFloat(document.getElementById('dv-tva')?.value)||0;
  const htEl = document.getElementById('dv-total-ht');
  const ttcEl = document.getElementById('dv-total-ttc');
  if (htEl) htEl.textContent = fmt(ht);
  if (ttcEl) ttcEl.textContent = fmt(ht*(1+tva/100));
}

async function saveDevis(id) {
  const clientEl = document.getElementById('dv-client');
  if (!clientEl.value) { toast('Sélectionnez un client', 'danger'); return; }
  const lignes = [];
  document.querySelectorAll('.devis-ligne').forEach(l => {
    const des = l.querySelector('[name="designation"]')?.value;
    const qte = parseFloat(l.querySelector('[name="qte"]')?.value)||1;
    const prix = parseFloat(l.querySelector('[name="prix"]')?.value)||0;
    if (des) lignes.push({ designation: des, qte, prix });
  });
  if (!lignes.length) { toast('Ajoutez au moins une ligne', 'danger'); return; }
  const ht = lignes.reduce((s,l)=>s+l.qte*l.prix,0);
  const tva = parseFloat(document.getElementById('dv-tva').value)||0;
  const item = {
    company_id: AppState.currentCompany.id,
    numero: document.getElementById('dv-num').value,
    client_id: clientEl.value,
    client_nom: clientEl.options[clientEl.selectedIndex].dataset.nom,
    date: document.getElementById('dv-date').value || null,
    validite: document.getElementById('dv-validite').value || null,
    statut: id ? (document.getElementById('dv-statut')?.value||'en_attente') : 'en_attente',
    montant_ht: ht, tva, montant_ttc: ht*(1+tva/100),
    lignes: lignes,
    notes: document.getElementById('dv-notes').value,
  };
  const btn = document.querySelector('.modal-footer .btn-primary');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="loading-spinner"></span> Enregistrement...'; }
  if (id) {
    const { error } = await SB.update('devis', id, item);
    if (error) { toast('Erreur : ' + error.message, 'danger'); if (btn) { btn.disabled=false; btn.innerHTML='<i class="fas fa-save"></i> Enregistrer'; } return; }
    toast('Devis modifié avec succès', 'success');
  } else {
    const { error } = await SB.insert('devis', item);
    if (error) { toast('Erreur : ' + error.message, 'danger'); if (btn) { btn.disabled=false; btn.innerHTML='<i class="fas fa-save"></i> Créer le devis'; } return; }
    toast('Devis créé avec succès', 'success');
  }
  closeModal(); navigate('devis');
}

async function deleteDevis(id) {
  confirmDialog('Supprimer ce devis ?', async () => { await SB.remove('devis', id); toast('Devis supprimé', 'danger'); navigate('devis'); });
}

async function convertToFacture(devisId) {
  const { data: d } = await SB.getOne('devis', devisId);
  if (!d) return;
  const { data: allFac } = await SB.getAll('factures', d.company_id);
  const num = genNum('FAC', allFac||[]);
  const lignesData = typeof d.lignes==='string' ? JSON.parse(d.lignes||'[]') : (d.lignes||[]);
  const { error: fe } = await SB.insert('factures', {
    company_id: d.company_id, numero: num, client_id: d.client_id, client_nom: d.client_nom,
    date: new Date().toISOString().split('T')[0], date_echeance: null, statut: 'non_paye',
    montant_ht: d.montant_ht, tva: d.tva, montant_ttc: d.montant_ttc, montant_paye: 0,
    lignes: lignesData,
  });
  if (fe) { toast('Erreur création facture : ' + fe.message, 'danger'); return; }
  await SB.update('devis', devisId, { statut: 'accepte' });
  toast('Facture créée depuis le devis', 'success');
  navigate('factures');
}

async function previewDevis(id) {
  const { data: d } = await SB.getOne('devis', id);
  if (!d) return;
  const stMap = { accepte:'badge-success', en_attente:'badge-warning', refuse:'badge-danger', expire:'badge-secondary' };
  const stLabel = { accepte:'Accepté', en_attente:'En attente', refuse:'Refusé', expire:'Expiré' };
  const lignes = typeof d.lignes === 'string' ? JSON.parse(d.lignes||'[]') : (d.lignes||[]);
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-eye" style="color:#7c3aed;margin-right:8px"></i>Aperçu – ${d.numero}</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div style="background:var(--bg-main);border-radius:10px;padding:16px;margin-bottom:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div><div style="font-size:11px;color:var(--text-secondary)">CLIENT</div><div style="font-weight:700">${d.client_nom}</div></div>
        <div><div style="font-size:11px;color:var(--text-secondary)">STATUT</div><span class="badge ${stMap[d.statut]||'badge-secondary'}">${stLabel[d.statut]||d.statut}</span></div>
        <div><div style="font-size:11px;color:var(--text-secondary)">DATE</div><div>${fmtDate(d.date)}</div></div>
        <div><div style="font-size:11px;color:var(--text-secondary)">VALIDITÉ</div><div>${fmtDate(d.date_validite||d.validite)}</div></div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:var(--primary);color:#fff">
          <th style="padding:8px 12px;text-align:left">Désignation</th>
          <th style="padding:8px 12px;text-align:center">Qté</th>
          <th style="padding:8px 12px;text-align:right">Prix U.</th>
          <th style="padding:8px 12px;text-align:right">Total HT</th>
        </tr></thead>
        <tbody>${lignes.map(l=>`<tr><td style="padding:8px 12px;border-bottom:1px solid var(--border)">${l.designation}</td><td style="padding:8px 12px;border-bottom:1px solid var(--border);text-align:center">${l.qte}</td><td style="padding:8px 12px;border-bottom:1px solid var(--border);text-align:right">${fmt(l.prix)}</td><td style="padding:8px 12px;border-bottom:1px solid var(--border);text-align:right;font-weight:600">${fmt(l.qte*l.prix)}</td></tr>`).join('')}</tbody>
      </table>
      <div style="margin-top:12px;display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <div style="display:flex;gap:32px"><span style="color:var(--text-secondary)">HT</span><span style="font-weight:700">${fmt(d.montant_ht)}</span></div>
        <div style="display:flex;gap:32px"><span style="color:var(--text-secondary)">TVA ${d.tva}%</span><span>${fmt(d.montant_ht*d.tva/100)}</span></div>
        <div style="display:flex;gap:32px;border-top:2px solid var(--primary);padding-top:8px;margin-top:4px"><span style="color:var(--primary);font-weight:700">TTC</span><span style="font-weight:800;font-size:18px;color:var(--primary)">${fmt(d.montant_ttc)}</span></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Fermer</button>
      ${d.statut==='en_attente'?`<button class="btn btn-warning" onclick="closeModal();openDevisModal('${d.id}')"><i class="fas fa-edit"></i> Modifier</button>`:''}
      <button class="btn btn-primary" onclick="printDevis('${d.id}')"><i class="fas fa-print"></i> PDF</button>
    </div>`, 'modal-lg');
}

// ===== FACTURES =====
async function renderFactures() {
  const cid = AppState.currentCompany?.id;
  const { data: factures } = await SB.getAll('factures', cid);
  const stMap = { paye:'badge-success', non_paye:'badge-danger', partiel:'badge-warning' };
  const stLabel = { paye:'Payé', non_paye:'Impayé', partiel:'Partiel' };
  const totalCA = (factures||[]).filter(f=>f.statut==='paye').reduce((s,f)=>s+Number(f.montant_ttc),0);
  const totalImpaye = (factures||[]).filter(f=>f.statut!=='paye').reduce((s,f)=>s+(Number(f.montant_ttc)-Number(f.montant_paye)),0);
  const content = document.getElementById('page-content');
  content.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div><h2 style="font-size:20px;font-weight:700">Factures</h2><p style="color:var(--text-secondary);font-size:13px">${(factures||[]).length} factures</p></div>
    <button class="btn btn-primary" onclick="openFactureModal()"><i class="fas fa-plus"></i> Nouvelle facture</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px">
    ${statCard('Total encaissé',fmt(totalCA),'fa-check-circle','#16a34a','up',`${(factures||[]).filter(f=>f.statut==='paye').length} payées`)}
    ${statCard('Total impayé',fmt(totalImpaye),'fa-exclamation-circle','#dc2626','down',`${(factures||[]).filter(f=>f.statut!=='paye').length} en attente`)}
    ${statCard('Total facturé',fmt((factures||[]).reduce((s,f)=>s+Number(f.montant_ttc),0)),'fa-file-invoice-dollar','#2563eb','up',`${(factures||[]).length} factures`)}
  </div>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Numéro</th><th>Client</th><th>Date</th><th>Échéance</th><th>TTC</th><th>Payé</th><th>Reste</th><th>Statut</th><th>Actions</th></tr></thead>
      <tbody>
        ${!(factures||[]).length ? `<tr><td colspan="9"><div class="empty-state"><div class="icon">💳</div><h3>Aucune facture</h3></div></td></tr>` :
        (factures||[]).map(f=>`<tr>
          <td style="font-weight:700">${f.numero}</td>
          <td>${f.client_nom||'–'}</td>
          <td>${fmtDate(f.date)}</td>
          <td style="color:${new Date(f.date_echeance||f.echeance)<new Date()&&f.statut!=='paye'?'#dc2626':'inherit'}">${fmtDate(f.date_echeance||f.echeance)}</td>
          <td style="font-weight:700">${fmt(f.montant_ttc)}</td>
          <td style="color:#16a34a">${fmt(f.montant_paye)}</td>
          <td style="color:#dc2626;font-weight:600">${fmt(Number(f.montant_ttc)-Number(f.montant_paye))}</td>
          <td><span class="badge ${stMap[f.statut]||'badge-secondary'}">${stLabel[f.statut]||f.statut}</span></td>
          <td style="white-space:nowrap">
            <button class="btn btn-ghost btn-sm" title="Aperçu" onclick="previewFacture('${f.id}')"><i class="fas fa-eye" style="color:#7c3aed"></i></button>
            ${f.statut==='non_paye'?`<button class="btn btn-ghost btn-sm" title="Modifier" onclick="openFactureModal('${f.id}')"><i class="fas fa-edit" style="color:#2563eb"></i></button>`:''}
            <button class="btn btn-ghost btn-sm" title="PDF" onclick="printFacture('${f.id}')"><i class="fas fa-print" style="color:#0891b2"></i></button>
            <button class="btn btn-ghost btn-sm" title="Paiement" onclick="openPaiementFacture('${f.id}')"><i class="fas fa-money-bill-wave" style="color:#16a34a"></i></button>
            <button class="btn btn-ghost btn-sm" onclick="deleteFacture('${f.id}')"><i class="fas fa-trash" style="color:#dc2626"></i></button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

async function openFactureModal(id = null) {
  const cid = AppState.currentCompany?.id;
  const { data: clients } = await SB.getAll('clients', cid);
  const { data: allFac } = await SB.getAll('factures', cid);
  let fac = {};
  if (id) { const { data } = await SB.getOne('factures', id); fac = data || {}; }
  const num = fac.numero || genNum('FAC', allFac||[]);
  const lignes = typeof fac.lignes === 'string' ? JSON.parse(fac.lignes||'[]') : (fac.lignes||[{designation:'',qte:1,prix:0}]);
  const lignesHtml = lignes.map(l=>`
    <div class="facture-ligne" style="display:grid;grid-template-columns:3fr 1fr 1fr auto;gap:8px;margin-bottom:8px">
      <input class="form-input" placeholder="Désignation" name="designation" value="${l.designation||''}"/>
      <input type="number" class="form-input" placeholder="Qté" name="qte" value="${l.qte||1}" oninput="calcFactureTotal()"/>
      <input type="number" class="form-input" placeholder="Prix" name="prix" value="${l.prix||0}" oninput="calcFactureTotal()"/>
      <button class="btn btn-ghost" onclick="removeFacLigne(this)"><i class="fas fa-minus-circle" style="color:#dc2626"></i></button>
    </div>`).join('');
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-file-invoice-dollar" style="color:#16a34a;margin-right:8px"></i>${id?'Modifier':'Nouvelle'} facture</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Numéro</label><input id="fac-num" class="form-input" value="${num}" readonly style="background:var(--bg-main)"/></div>
      <div class="form-group"><label class="form-label">Client <span class="req">*</span></label>
        <select id="fac-client" class="form-select">
          <option value="">– Sélectionner –</option>
          ${(clients||[]).map(c=>`<option value="${c.id}" data-nom="${c.name}" ${c.id===fac.client_id?'selected':''}>${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Date facture</label><input id="fac-date" type="date" class="form-input" value="${fac.date||new Date().toISOString().split('T')[0]}"/></div>
      <div class="form-group"><label class="form-label">Date échéance</label><input id="fac-echeance" type="date" class="form-input" value="${fac.date_echeance||fac.echeance||''}"/></div>
    </div>
    <div style="margin-bottom:16px">
      <label class="form-label">Lignes</label>
      <div id="facture-lignes">${lignesHtml}</div>
      <button class="btn btn-secondary btn-sm" onclick="addFacLigne()"><i class="fas fa-plus"></i> Ajouter ligne</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;background:var(--bg-main);padding:14px;border-radius:10px;margin-bottom:16px">
      <div><div style="font-size:12px;color:var(--text-secondary)">Total HT</div><div id="fac-ht" style="font-size:18px;font-weight:700">0 DH</div></div>
      <div><label class="form-label">TVA (%)</label><input id="fac-tva" type="number" class="form-input" value="${fac.tva||20}" oninput="calcFactureTotal()"/></div>
      <div><div style="font-size:12px;color:var(--text-secondary)">Total TTC</div><div id="fac-ttc" style="font-size:18px;font-weight:700;color:#2563eb">0 DH</div></div>
    </div>
    ${id?`<div class="form-group"><label class="form-label">Statut</label>
      <select id="fac-statut" class="form-select">
        <option value="non_paye" ${fac.statut==='non_paye'?'selected':''}>Impayé</option>
        <option value="partiel" ${fac.statut==='partiel'?'selected':''}>Partiel</option>
        <option value="paye" ${fac.statut==='paye'?'selected':''}>Payé</option>
      </select></div>`:''}
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveFacture('${id||''}')"><i class="fas fa-save"></i> ${id?'Enregistrer':'Créer'}</button>
    </div>`, 'modal-lg');
  setTimeout(calcFactureTotal, 100);
}

function addFacLigne() {
  const c = document.getElementById('facture-lignes');
  const d = document.createElement('div');
  d.className = 'facture-ligne';
  d.style.cssText = 'display:grid;grid-template-columns:3fr 1fr 1fr auto;gap:8px;margin-bottom:8px';
  d.innerHTML = `<input class="form-input" placeholder="Désignation" name="designation"/><input type="number" class="form-input" placeholder="Qté" name="qte" value="1" oninput="calcFactureTotal()"/><input type="number" class="form-input" placeholder="Prix" name="prix" value="0" oninput="calcFactureTotal()"/><button class="btn btn-ghost" onclick="removeFacLigne(this)"><i class="fas fa-minus-circle" style="color:#dc2626"></i></button>`;
  c.appendChild(d);
}
function removeFacLigne(btn) { btn.closest('.facture-ligne').remove(); calcFactureTotal(); }
function calcFactureTotal() {
  let ht = 0;
  document.querySelectorAll('.facture-ligne').forEach(l => {
    ht += (parseFloat(l.querySelector('[name="qte"]')?.value)||0) * (parseFloat(l.querySelector('[name="prix"]')?.value)||0);
  });
  const tva = parseFloat(document.getElementById('fac-tva')?.value)||0;
  if (document.getElementById('fac-ht')) document.getElementById('fac-ht').textContent = fmt(ht);
  if (document.getElementById('fac-ttc')) document.getElementById('fac-ttc').textContent = fmt(ht*(1+tva/100));
}

async function saveFacture(id) {
  const clientEl = document.getElementById('fac-client');
  if (!clientEl.value) { toast('Sélectionnez un client', 'danger'); return; }
  const lignes = [];
  document.querySelectorAll('.facture-ligne').forEach(l => {
    const des = l.querySelector('[name="designation"]')?.value;
    const qte = parseFloat(l.querySelector('[name="qte"]')?.value)||1;
    const prix = parseFloat(l.querySelector('[name="prix"]')?.value)||0;
    if (des) lignes.push({ designation: des, qte, prix });
  });
  if (!lignes.length) { toast('Ajoutez au moins une ligne', 'danger'); return; }
  const ht = lignes.reduce((s,l)=>s+l.qte*l.prix,0);
  const tva = parseFloat(document.getElementById('fac-tva').value)||0;
  const item = {
    company_id: AppState.currentCompany.id,
    numero: document.getElementById('fac-num').value,
    client_id: clientEl.value,
    client_nom: clientEl.options[clientEl.selectedIndex].dataset.nom,
    date: document.getElementById('fac-date').value || null,
    date_echeance: document.getElementById('fac-echeance').value || null,
    statut: id ? (document.getElementById('fac-statut')?.value||'non_paye') : 'non_paye',
    montant_ht: ht, tva, montant_ttc: ht*(1+tva/100),
    montant_paye: 0,
    lignes: lignes,
  };
  const btn2 = document.querySelector('.modal-footer .btn-primary');
  if (btn2) { btn2.disabled = true; btn2.innerHTML = '<span class="loading-spinner"></span> Enregistrement...'; }
  if (id) {
    const { error } = await SB.update('factures', id, item);
    if (error) { toast('Erreur : ' + error.message, 'danger'); if (btn2) { btn2.disabled=false; btn2.innerHTML='<i class="fas fa-save"></i> Enregistrer'; } return; }
    toast('Facture modifiée avec succès', 'success');
  } else {
    const { error } = await SB.insert('factures', item);
    if (error) { toast('Erreur : ' + error.message, 'danger'); if (btn2) { btn2.disabled=false; btn2.innerHTML='<i class="fas fa-save"></i> Créer'; } return; }
    toast('Facture créée avec succès', 'success');
  }
  closeModal(); navigate('factures');
}

async function deleteFacture(id) {
  confirmDialog('Supprimer cette facture ?', async () => { await SB.remove('factures', id); toast('Facture supprimée', 'danger'); navigate('factures'); });
}

async function previewFacture(id) {
  const { data: f } = await SB.getOne('factures', id);
  if (!f) return;
  const stMap = { paye:'badge-success', non_paye:'badge-danger', partiel:'badge-warning' };
  const stLabel = { paye:'Payé', non_paye:'Impayé', partiel:'Paiement partiel' };
  const lignes = typeof f.lignes==='string'?JSON.parse(f.lignes||'[]'):(f.lignes||[]);
  const reste = Number(f.montant_ttc)-Number(f.montant_paye);
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-eye" style="color:#7c3aed;margin-right:8px"></i>Aperçu – ${f.numero}</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div style="background:var(--bg-main);border-radius:10px;padding:16px;margin-bottom:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div><div style="font-size:11px;color:var(--text-secondary)">CLIENT</div><div style="font-weight:700">${f.client_nom}</div></div>
        <div><div style="font-size:11px;color:var(--text-secondary)">STATUT</div><span class="badge ${stMap[f.statut]||'badge-secondary'}">${stLabel[f.statut]||f.statut}</span></div>
        <div><div style="font-size:11px;color:var(--text-secondary)">DATE</div><div>${fmtDate(f.date)}</div></div>
        <div><div style="font-size:11px;color:var(--text-secondary)">ÉCHÉANCE</div><div>${fmtDate(f.date_echeance||f.echeance)}</div></div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:var(--primary);color:#fff">
          <th style="padding:8px 12px;text-align:left">Désignation</th><th style="padding:8px 12px;text-align:center">Qté</th>
          <th style="padding:8px 12px;text-align:right">Prix U.</th><th style="padding:8px 12px;text-align:right">Total HT</th>
        </tr></thead>
        <tbody>${lignes.map(l=>`<tr><td style="padding:8px 12px;border-bottom:1px solid var(--border)">${l.designation}</td><td style="padding:8px 12px;border-bottom:1px solid var(--border);text-align:center">${l.qte}</td><td style="padding:8px 12px;border-bottom:1px solid var(--border);text-align:right">${fmt(l.prix)}</td><td style="padding:8px 12px;border-bottom:1px solid var(--border);text-align:right;font-weight:600">${fmt(l.qte*l.prix)}</td></tr>`).join('')}</tbody>
      </table>
      <div style="margin-top:12px;display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <div style="display:flex;gap:32px"><span style="color:var(--text-secondary)">HT</span><span style="font-weight:700">${fmt(f.montant_ht)}</span></div>
        <div style="display:flex;gap:32px"><span style="color:var(--text-secondary)">TVA ${f.tva}%</span><span>${fmt(f.montant_ht*f.tva/100)}</span></div>
        <div style="display:flex;gap:32px;border-top:2px solid var(--primary);padding-top:8px;margin-top:4px"><span style="color:var(--primary);font-weight:700">TTC</span><span style="font-weight:800;font-size:18px;color:var(--primary)">${fmt(f.montant_ttc)}</span></div>
      </div>
      <div style="margin-top:14px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
        <div style="background:rgba(22,163,74,0.08);border-radius:8px;padding:10px;border-left:3px solid #16a34a"><div style="font-size:11px;color:var(--text-secondary)">Payé</div><div style="font-weight:700;color:#16a34a">${fmt(f.montant_paye)}</div></div>
        <div style="background:rgba(220,38,38,0.08);border-radius:8px;padding:10px;border-left:3px solid #dc2626"><div style="font-size:11px;color:var(--text-secondary)">Reste</div><div style="font-weight:700;color:#dc2626">${fmt(reste)}</div></div>
        <div style="background:rgba(37,99,235,0.08);border-radius:8px;padding:10px;border-left:3px solid #2563eb"><div style="font-size:11px;color:var(--text-secondary)">Avancement</div><div style="font-weight:700;color:#2563eb">${f.montant_ttc>0?Math.round(f.montant_paye/f.montant_ttc*100):0}%</div></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Fermer</button>
      ${f.statut==='non_paye'?`<button class="btn btn-warning" onclick="closeModal();openFactureModal('${f.id}')"><i class="fas fa-edit"></i> Modifier</button>`:''}
      <button class="btn btn-success" onclick="openPaiementFacture('${f.id}')"><i class="fas fa-money-bill-wave"></i> Paiement</button>
      <button class="btn btn-primary" onclick="printFacture('${f.id}')"><i class="fas fa-print"></i> PDF</button>
    </div>`, 'modal-lg');
}

async function openPaiementFacture(id) {
  const { data: f } = await SB.getOne('factures', id);
  if (!f) return;
  const reste = Number(f.montant_ttc) - Number(f.montant_paye);
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-money-bill-wave" style="color:#16a34a;margin-right:8px"></i>Paiement – ${f.numero}</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div style="background:var(--bg-main);border-radius:10px;padding:14px;margin-bottom:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div><div style="font-size:12px;color:var(--text-secondary)">Total TTC</div><div style="font-weight:700">${fmt(f.montant_ttc)}</div></div>
        <div><div style="font-size:12px;color:var(--text-secondary)">Déjà payé</div><div style="font-weight:700;color:#16a34a">${fmt(f.montant_paye)}</div></div>
        <div><div style="font-size:12px;color:var(--text-secondary)">Reste à payer</div><div style="font-weight:700;color:#dc2626">${fmt(reste)}</div></div>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Montant reçu <span class="req">*</span></label><input id="pay-montant" type="number" class="form-input" placeholder="0" max="${reste}"/></div>
    <div class="form-group"><label class="form-label">Date</label><input id="pay-date" type="date" class="form-input" value="${new Date().toISOString().split('T')[0]}"/></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-success" onclick="savePaiementFacture('${f.id}',${reste})"><i class="fas fa-check"></i> Enregistrer paiement</button>
    </div>`);
}

async function savePaiementFacture(id, reste) {
  const montant = parseFloat(document.getElementById('pay-montant').value)||0;
  if (montant <= 0) { toast('Montant invalide', 'danger'); return; }
  const { data: f } = await SB.getOne('factures', id);
  const newPaye = Number(f.montant_paye) + montant;
  const newStatut = newPaye >= Number(f.montant_ttc) ? 'paye' : 'partiel';
  await SB.update('factures', id, { montant_paye: newPaye, statut: newStatut });
  // Enregistrer dans trésorerie
  await SB.insert('paiements', {
    company_id: f.company_id, type: 'entree', montant,
    date: document.getElementById('pay-date').value,
    description: `Paiement ${f.numero} – ${f.client_nom}`,
    reference: f.numero, categorie: 'Facturation',
  });
  closeModal(); toast('Paiement enregistré', 'success'); navigate('factures');
}

// ===== CHANTIERS =====
async function renderChantiers() {
  const cid = AppState.currentCompany?.id;
  const { data: chantiers } = await SB.getAll('chantiers', cid);
  const content = document.getElementById('page-content');
  const statusMap = { en_cours:['badge-success','fa-play','En cours'], pause:['badge-warning','fa-pause','En pause'], termine:['badge-secondary','fa-check','Terminé'], annule:['badge-danger','fa-times','Annulé'] };
  content.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div><h2 style="font-size:20px;font-weight:700">Chantiers</h2><p style="color:var(--text-secondary);font-size:13px">${(chantiers||[]).length} chantiers</p></div>
    <button class="btn btn-primary" onclick="openChantierModal()"><i class="fas fa-plus"></i> Nouveau chantier</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px">
    ${!(chantiers||[]).length?`<div class="card" style="text-align:center;padding:40px;grid-column:1/-1"><div style="font-size:48px;margin-bottom:12px">🏗️</div><h3>Aucun chantier</h3><p style="color:var(--text-secondary)">Créez votre premier chantier</p></div>`:
    (chantiers||[]).map(ch => {
      const [sCls,sIcon,sLabel] = statusMap[ch.statut]||['badge-secondary','fa-circle',ch.statut];
      return `<div class="card" style="cursor:pointer" onclick="openChantierDetail('${ch.id}')">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
          <h3 style="font-weight:700;font-size:15px">${ch.nom}</h3>
          <span class="badge ${sCls}"><i class="fas ${sIcon}"></i> ${sLabel}</span>
        </div>
        <div style="color:var(--text-secondary);font-size:13px;margin-bottom:12px"><i class="fas fa-user"></i> ${ch.client_nom||'–'}</div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:10px">
          <span>Budget: <strong>${fmt(ch.budget)}</strong></span>
          <span>${fmtDate(ch.date_debut)} → ${fmtDate(ch.date_fin)}</span>
        </div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();openChantierModal('${ch.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteChantier('${ch.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

async function openChantierModal(id = null) {
  const cid = AppState.currentCompany?.id;
  const { data: clients } = await SB.getAll('clients', cid);
  let ch = {};
  if (id) { const { data } = await SB.getOne('chantiers', id); ch = data || {}; }
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-hard-hat" style="color:#7c3aed;margin-right:8px"></i>${id?'Modifier':'Nouveau'} chantier</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="form-grid-2">
      <div class="form-group" style="grid-column:1/-1"><label class="form-label">Nom du chantier <span class="req">*</span></label><input id="ch-nom" class="form-input" value="${ch.nom||''}" placeholder="Villa Résidentielle..."/></div>
      <div class="form-group"><label class="form-label">Client</label>
        <select id="ch-client" class="form-select">
          <option value="">– Sélectionner –</option>
          ${(clients||[]).map(c=>`<option value="${c.id}" data-nom="${c.name}" ${c.id===ch.client_id?'selected':''}>${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Budget (DH)</label><input id="ch-budget" type="number" class="form-input" value="${ch.budget||0}"/></div>
      <div class="form-group"><label class="form-label">Date début</label><input id="ch-debut" type="date" class="form-input" value="${ch.date_debut||''}"/></div>
      <div class="form-group"><label class="form-label">Date fin prévue</label><input id="ch-fin" type="date" class="form-input" value="${ch.date_fin||''}"/></div>
      <div class="form-group"><label class="form-label">Statut</label>
        <select id="ch-statut" class="form-select">
          <option value="en_cours" ${ch.statut==='en_cours'?'selected':''}>En cours</option>
          <option value="pause" ${ch.statut==='pause'?'selected':''}>En pause</option>
          <option value="termine" ${ch.statut==='termine'?'selected':''}>Terminé</option>
          <option value="annule" ${ch.statut==='annule'?'selected':''}>Annulé</option>
        </select>
      </div>
      <div class="form-group" style="grid-column:1/-1"><label class="form-label">Description</label><textarea id="ch-desc" class="form-textarea" placeholder="Description...">${ch.description||''}</textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveChantier('${id||''}')"><i class="fas fa-save"></i> ${id?'Modifier':'Créer'}</button>
    </div>`, 'modal-lg');
}

async function saveChantier(id) {
  const nom = document.getElementById('ch-nom').value.trim();
  if (!nom) { toast('Nom requis', 'danger'); return; }
  const clientEl = document.getElementById('ch-client');
  const item = {
    company_id: AppState.currentCompany.id,
    nom, client_id: clientEl.value||null,
    client_nom: clientEl.value ? clientEl.options[clientEl.selectedIndex].dataset.nom : null,
    budget: parseFloat(document.getElementById('ch-budget').value)||0,
    date_debut: document.getElementById('ch-debut').value || null,
    date_fin: document.getElementById('ch-fin').value || null,
    statut: document.getElementById('ch-statut').value,
    description: document.getElementById('ch-desc').value,
  };
  const { error: che } = id ? await SB.update('chantiers', id, item) : await SB.insert('chantiers', item);
  if (che) { toast('Erreur : ' + che.message, 'danger'); return; }
  toast(id ? 'Chantier modifié' : 'Chantier créé', 'success');
  closeModal(); navigate('chantiers');
}

async function deleteChantier(id) {
  confirmDialog('Supprimer ce chantier ?', async () => { await SB.remove('chantiers', id); toast('Chantier supprimé', 'danger'); navigate('chantiers'); });
}

async function openChantierDetail(id) {
  const { data: ch } = await SB.getOne('chantiers', id);
  if (!ch) return;
  const [{ data: entrees }, { data: achats }, { data: mo }] = await Promise.all([
    SB.getWhere('chantier_entrees', 'chantier_id', id),
    SB.getWhere('chantier_achats', 'chantier_id', id),
    SB.getWhere('chantier_main_oeuvre', 'chantier_id', id),
  ]);
  const totalEntrees = (entrees||[]).reduce((s,x)=>s+Number(x.montant),0);
  const totalAchats = (achats||[]).reduce((s,x)=>s+Number(x.montant),0);
  const totalMO = (mo||[]).reduce((s,x)=>s+Number(x.montant),0);
  const totalDepenses = totalAchats + totalMO;
  const resultat = totalEntrees - totalDepenses;
  const budgetPct = ch.budget > 0 ? Math.round(totalDepenses / ch.budget * 100) : 0;
  const barColor = budgetPct < 70 ? '#16a34a' : budgetPct <= 100 ? '#d97706' : '#dc2626';

  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-hard-hat" style="color:#7c3aed;margin-right:8px"></i>${ch.nom}</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div style="background:var(--bg-main);border-radius:10px;padding:16px;margin-bottom:16px">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
        <div style="text-align:center;padding:12px;background:rgba(22,163,74,0.1);border-radius:8px">
          <div style="font-size:11px;color:var(--text-secondary)">Entrées</div>
          <div style="font-weight:700;color:#16a34a">${fmt(totalEntrees)}</div>
        </div>
        <div style="text-align:center;padding:12px;background:rgba(220,38,38,0.1);border-radius:8px">
          <div style="font-size:11px;color:var(--text-secondary)">Achats</div>
          <div style="font-weight:700;color:#dc2626">${fmt(totalAchats)}</div>
        </div>
        <div style="text-align:center;padding:12px;background:rgba(124,58,237,0.1);border-radius:8px">
          <div style="font-size:11px;color:var(--text-secondary)">Main d'œuvre</div>
          <div style="font-weight:700;color:#7c3aed">${fmt(totalMO)}</div>
        </div>
        <div style="text-align:center;padding:12px;background:rgba(37,99,235,0.1);border-radius:8px">
          <div style="font-size:11px;color:var(--text-secondary)">Résultat</div>
          <div style="font-weight:700;color:${resultat>=0?'#16a34a':'#dc2626'}">${fmt(resultat)}</div>
        </div>
      </div>
      <div style="margin-bottom:8px;display:flex;justify-content:space-between">
        <span style="font-size:13px">Budget consommé</span>
        <span style="font-weight:700;color:${barColor}">${budgetPct}%</span>
      </div>
      <div style="background:var(--border);border-radius:99px;height:10px">
        <div style="background:${barColor};width:${Math.min(budgetPct,100)}%;height:100%;border-radius:99px;transition:width 0.5s"></div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <strong>Entrées (${(entrees||[]).length})</strong>
          <button class="btn btn-primary btn-sm" onclick="addEntreeChantier('${id}')"><i class="fas fa-plus"></i></button>
        </div>
        ${(entrees||[]).map(e=>`<div style="padding:8px;background:var(--bg-main);border-radius:6px;margin-bottom:6px;font-size:12px">
          <div style="font-weight:600">${e.description||'–'}</div>
          <div style="color:#16a34a;font-weight:700">${fmt(e.montant)}</div>
          <div style="color:var(--text-secondary)">${fmtDate(e.date)}</div>
        </div>`).join('') || '<div style="font-size:12px;color:var(--text-secondary);text-align:center;padding:8px">Aucune entrée</div>'}
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <strong>Achats (${(achats||[]).length})</strong>
          <button class="btn btn-primary btn-sm" onclick="addAchatChantier('${id}')"><i class="fas fa-plus"></i></button>
        </div>
        ${(achats||[]).map(a=>`<div style="padding:8px;background:var(--bg-main);border-radius:6px;margin-bottom:6px;font-size:12px">
          <div style="font-weight:600">${a.description||'–'}</div>
          <div style="color:#dc2626;font-weight:700">${fmt(a.montant)}</div>
          <div style="color:var(--text-secondary)">${a.fournisseur||'–'}</div>
        </div>`).join('') || '<div style="font-size:12px;color:var(--text-secondary);text-align:center;padding:8px">Aucun achat</div>'}
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <strong>Main d'œuvre (${(mo||[]).length})</strong>
          <button class="btn btn-primary btn-sm" onclick="addMOChantier('${id}')"><i class="fas fa-plus"></i></button>
        </div>
        ${(mo||[]).map(m=>`<div style="padding:8px;background:var(--bg-main);border-radius:6px;margin-bottom:6px;font-size:12px">
          <div style="font-weight:600">${m.description||'–'}</div>
          <div style="color:#7c3aed;font-weight:700">${fmt(m.montant)}</div>
          <div style="color:var(--text-secondary)">${m.type||'–'}</div>
        </div>`).join('') || '<div style="font-size:12px;color:var(--text-secondary);text-align:center;padding:8px">Aucune M.O.</div>'}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Fermer</button>
      <button class="btn btn-primary" onclick="printChantierReport('${id}')"><i class="fas fa-print"></i> Rapport PDF</button>
    </div>`, 'modal-xl');
}

function addEntreeChantier(chId) {
  openModal(`
    <div class="modal-header"><h3 class="modal-title"><i class="fas fa-plus-circle" style="color:#16a34a;margin-right:8px"></i>Ajouter une entrée</h3><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
    <div class="form-group"><label class="form-label">Description</label><input id="ent-desc" class="form-input" placeholder="Acompte client..."/></div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Montant (DH)</label><input id="ent-montant" type="number" class="form-input" placeholder="0"/></div>
      <div class="form-group"><label class="form-label">Date</label><input id="ent-date" type="date" class="form-input" value="${new Date().toISOString().split('T')[0]}"/></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveEntreeChantier('${chId}')"><i class="fas fa-save"></i> Ajouter</button>
    </div>`);
}
async function saveEntreeChantier(chId) {
  await SB.insert('chantier_entrees', { company_id: AppState.currentCompany.id, chantier_id: chId, description: document.getElementById('ent-desc').value, montant: parseFloat(document.getElementById('ent-montant').value)||0, date: document.getElementById('ent-date').value });
  toast('Entrée ajoutée', 'success'); closeModal(); openChantierDetail(chId);
}

function addAchatChantier(chId) {
  openModal(`
    <div class="modal-header"><h3 class="modal-title"><i class="fas fa-shopping-cart" style="color:#2563eb;margin-right:8px"></i>Ajouter un achat</h3><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Description</label><input id="ach-desc" class="form-input" placeholder="Ciment, fer..."/></div>
      <div class="form-group"><label class="form-label">Fournisseur</label><input id="ach-four" class="form-input" placeholder="Lafarge..."/></div>
      <div class="form-group"><label class="form-label">Montant (DH)</label><input id="ach-montant" type="number" class="form-input" placeholder="0"/></div>
      <div class="form-group"><label class="form-label">Date</label><input id="ach-date" type="date" class="form-input" value="${new Date().toISOString().split('T')[0]}"/></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveAchatChantier('${chId}')"><i class="fas fa-save"></i> Ajouter</button>
    </div>`);
}
async function saveAchatChantier(chId) {
  await SB.insert('chantier_achats', { company_id: AppState.currentCompany.id, chantier_id: chId, description: document.getElementById('ach-desc').value, fournisseur: document.getElementById('ach-four').value, montant: parseFloat(document.getElementById('ach-montant').value)||0, date: document.getElementById('ach-date').value });
  toast('Achat ajouté', 'success'); closeModal(); openChantierDetail(chId);
}

function addMOChantier(chId) {
  openModal(`
    <div class="modal-header"><h3 class="modal-title"><i class="fas fa-hard-hat" style="color:#7c3aed;margin-right:8px"></i>Ajouter main d'œuvre</h3><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Description</label><input id="mo-desc" class="form-input" placeholder="Maçons, plombier..."/></div>
      <div class="form-group"><label class="form-label">Type</label>
        <select id="mo-type" class="form-select">
          <option value="journalier">Journalier</option>
          <option value="tache">À la tâche</option>
          <option value="sous_traitant">Sous-traitant</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Montant (DH)</label><input id="mo-montant" type="number" class="form-input" placeholder="0"/></div>
      <div class="form-group"><label class="form-label">Date</label><input id="mo-date" type="date" class="form-input" value="${new Date().toISOString().split('T')[0]}"/></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveMOChantier('${chId}')"><i class="fas fa-save"></i> Ajouter</button>
    </div>`);
}
async function saveMOChantier(chId) {
  await SB.insert('chantier_main_oeuvre', { company_id: AppState.currentCompany.id, chantier_id: chId, description: document.getElementById('mo-desc').value, type: document.getElementById('mo-type').value, montant: parseFloat(document.getElementById('mo-montant').value)||0, date: document.getElementById('mo-date').value });
  toast('Main d\'œuvre ajoutée', 'success'); closeModal(); openChantierDetail(chId);
}

// ===== PAIEMENTS =====
async function renderPaiements() {
  const cid = AppState.currentCompany?.id;
  const { data: paiements } = await SB.getAll('paiements', cid);
  const entrees = (paiements||[]).filter(p=>p.type==='entree').reduce((s,p)=>s+Number(p.montant),0);
  const sorties = (paiements||[]).filter(p=>p.type==='sortie').reduce((s,p)=>s+Number(p.montant),0);
  const content = document.getElementById('page-content');
  content.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div><h2 style="font-size:20px;font-weight:700">Paiements & Trésorerie</h2></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-success" onclick="openPaiementModal('entree')"><i class="fas fa-plus"></i> Entrée</button>
      <button class="btn btn-danger" onclick="openPaiementModal('sortie')"><i class="fas fa-minus"></i> Sortie</button>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px">
    ${statCard('Total entrées',fmt(entrees),'fa-arrow-down','#16a34a','up',`${(paiements||[]).filter(p=>p.type==='entree').length} opérations`)}
    ${statCard('Total sorties',fmt(sorties),'fa-arrow-up','#dc2626','down',`${(paiements||[]).filter(p=>p.type==='sortie').length} opérations`)}
    ${statCard('Solde net',fmt(entrees-sorties),'fa-balance-scale',entrees-sorties>=0?'#16a34a':'#dc2626','up','Trésorerie actuelle')}
  </div>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Référence</th><th>Catégorie</th><th>Montant</th><th>Actions</th></tr></thead>
      <tbody>
        ${!(paiements||[]).length?`<tr><td colspan="7"><div class="empty-state"><div class="icon">💰</div><h3>Aucun mouvement</h3></div></td></tr>`:(paiements||[]).map(p=>`<tr>
          <td>${fmtDate(p.date)}</td>
          <td><span class="badge ${p.type==='entree'?'badge-success':'badge-danger'}">${p.type==='entree'?'Entrée':'Sortie'}</span></td>
          <td>${p.description||'–'}</td>
          <td>${p.reference||'–'}</td>
          <td>${p.categorie||'–'}</td>
          <td style="font-weight:700;color:${p.type==='entree'?'#16a34a':'#dc2626'}">${p.type==='entree'?'+':'–'}${fmt(p.montant)}</td>
          <td><button class="btn btn-ghost btn-sm" onclick="deletePaiement('${p.id}')"><i class="fas fa-trash" style="color:#dc2626"></i></button></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

function openPaiementModal(type) {
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-${type==='entree'?'plus-circle':'minus-circle'}" style="color:${type==='entree'?'#16a34a':'#dc2626'};margin-right:8px"></i>${type==='entree'?'Entrée':'Sortie'} de trésorerie</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Description <span class="req">*</span></label><input id="pay-desc" class="form-input" placeholder="Description..."/></div>
      <div class="form-group"><label class="form-label">Montant (DH) <span class="req">*</span></label><input id="pay-amount" type="number" class="form-input" placeholder="0"/></div>
      <div class="form-group"><label class="form-label">Date</label><input id="pay-dt" type="date" class="form-input" value="${new Date().toISOString().split('T')[0]}"/></div>
      <div class="form-group"><label class="form-label">Référence</label><input id="pay-ref" class="form-input" placeholder="FAC-001..."/></div>
      <div class="form-group"><label class="form-label">Catégorie</label>
        <select id="pay-cat" class="form-select">
          <option>Facturation</option><option>Salaires</option><option>Fournisseurs</option><option>Chantier</option><option>Autre</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="savePaiement('${type}')"><i class="fas fa-save"></i> Enregistrer</button>
    </div>`);
}

async function savePaiement(type) {
  const desc = document.getElementById('pay-desc').value.trim();
  const montant = parseFloat(document.getElementById('pay-amount').value)||0;
  if (!desc || !montant) { toast('Remplissez tous les champs', 'danger'); return; }
  await SB.insert('paiements', { company_id: AppState.currentCompany.id, type, montant, description: desc, date: document.getElementById('pay-dt').value, reference: document.getElementById('pay-ref').value, categorie: document.getElementById('pay-cat').value });
  closeModal(); toast('Mouvement enregistré', 'success'); navigate('paiements');
}

async function deletePaiement(id) {
  confirmDialog('Supprimer ce mouvement ?', async () => { await SB.remove('paiements', id); toast('Supprimé', 'danger'); navigate('paiements'); });
}

// ===== STOCK =====
async function renderStock() {
  const cid = AppState.currentCompany?.id;
  const { data: produits } = await SB.getAll('produits', cid);
  const alertes = (produits||[]).filter(p=>Number(p.stock_actuel)<=Number(p.stock_min));
  const content = document.getElementById('page-content');
  content.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div><h2 style="font-size:20px;font-weight:700">Stock</h2><p style="color:var(--text-secondary);font-size:13px">${(produits||[]).length} produits${alertes.length?` — <span style="color:#dc2626">${alertes.length} alertes</span>`:''}</p></div>
    <button class="btn btn-primary" onclick="openProduitModal()"><i class="fas fa-plus"></i> Nouveau produit</button>
  </div>
  ${alertes.length?`<div style="background:rgba(220,38,38,0.08);border:1px solid #dc2626;border-radius:10px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:10px">
    <i class="fas fa-exclamation-triangle" style="color:#dc2626"></i>
    <span style="color:#dc2626;font-weight:600">${alertes.length} produit(s) en rupture de stock : ${alertes.map(p=>p.name).join(', ')}</span>
  </div>`:''}
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Produit</th><th>Catégorie</th><th>Stock actuel</th><th>Stock min</th><th>Prix achat</th><th>Prix vente</th><th>Statut</th><th>Actions</th></tr></thead>
      <tbody>
        ${!(produits||[]).length?`<tr><td colspan="8"><div class="empty-state"><div class="icon">📦</div><h3>Aucun produit</h3></div></td></tr>`:(produits||[]).map(p=>`<tr>
          <td style="font-weight:600">${p.name}</td>
          <td>${p.categorie||'–'}</td>
          <td style="font-weight:700;color:${Number(p.stock_actuel)<=Number(p.stock_min)?'#dc2626':'#16a34a'}">${p.stock_actuel} ${p.unite||''}</td>
          <td>${p.stock_min} ${p.unite||''}</td>
          <td>${fmt(p.prix_achat)}</td>
          <td>${fmt(p.prix_vente)}</td>
          <td><span class="badge ${Number(p.stock_actuel)<=Number(p.stock_min)?'badge-danger':'badge-success'}">${Number(p.stock_actuel)<=Number(p.stock_min)?'⚠️ Alerte':'OK'}</span></td>
          <td>
            <button class="btn btn-ghost btn-sm" onclick="openProduitModal('${p.id}')"><i class="fas fa-edit" style="color:#2563eb"></i></button>
            <button class="btn btn-ghost btn-sm" onclick="openMouvementStock('${p.id}','${p.name}')"><i class="fas fa-exchange-alt" style="color:#7c3aed"></i></button>
            <button class="btn btn-ghost btn-sm" onclick="deleteProduit('${p.id}')"><i class="fas fa-trash" style="color:#dc2626"></i></button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

async function openProduitModal(id=null) {
  let p = {};
  if (id) { const { data } = await SB.getOne('produits', id); p = data||{}; }
  openModal(`
    <div class="modal-header"><h3 class="modal-title"><i class="fas fa-box" style="color:#2563eb;margin-right:8px"></i>${id?'Modifier':'Nouveau'} produit</h3><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Nom <span class="req">*</span></label><input id="pr-name" class="form-input" value="${p.name||''}" placeholder="Ciment..."/></div>
      <div class="form-group"><label class="form-label">Catégorie</label><input id="pr-cat" class="form-input" value="${p.categorie||''}" placeholder="Matériaux..."/></div>
      <div class="form-group"><label class="form-label">Unité</label><input id="pr-unite" class="form-input" value="${p.unite||'unité'}" placeholder="kg, m², sac..."/></div>
      <div class="form-group"><label class="form-label">Stock actuel</label><input id="pr-stock" type="number" class="form-input" value="${p.stock_actuel||0}"/></div>
      <div class="form-group"><label class="form-label">Stock minimum</label><input id="pr-min" type="number" class="form-input" value="${p.stock_min||5}"/></div>
      <div class="form-group"><label class="form-label">Prix achat (DH)</label><input id="pr-achat" type="number" class="form-input" value="${p.prix_achat||0}"/></div>
      <div class="form-group"><label class="form-label">Prix vente (DH)</label><input id="pr-vente" type="number" class="form-input" value="${p.prix_vente||0}"/></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveProduit('${id||''}')"><i class="fas fa-save"></i> ${id?'Modifier':'Créer'}</button>
    </div>`);
}

async function saveProduit(id) {
  const name = document.getElementById('pr-name').value.trim();
  if (!name) { toast('Nom requis', 'danger'); return; }
  const item = { company_id: AppState.currentCompany.id, name, categorie: document.getElementById('pr-cat').value, unite: document.getElementById('pr-unite').value, stock_actuel: parseFloat(document.getElementById('pr-stock').value)||0, stock_min: parseFloat(document.getElementById('pr-min').value)||5, prix_achat: parseFloat(document.getElementById('pr-achat').value)||0, prix_vente: parseFloat(document.getElementById('pr-vente').value)||0 };
  const { error: pre } = id ? await SB.update('produits', id, item) : await SB.insert('produits', item);
  if (pre) { toast('Erreur : ' + pre.message, 'danger'); return; }
  toast(id ? 'Produit modifié' : 'Produit créé', 'success');
  closeModal(); navigate('stock');
}

async function deleteProduit(id) {
  confirmDialog('Supprimer ce produit ?', async () => { await SB.remove('produits', id); toast('Supprimé', 'danger'); navigate('stock'); });
}

function openMouvementStock(prodId, prodName) {
  openModal(`
    <div class="modal-header"><h3 class="modal-title"><i class="fas fa-exchange-alt" style="color:#7c3aed;margin-right:8px"></i>Mouvement – ${prodName}</h3><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
    <div class="form-group"><label class="form-label">Type de mouvement</label>
      <select id="mv-type" class="form-select">
        <option value="entree">Entrée stock (+)</option>
        <option value="sortie">Sortie stock (–)</option>
      </select>
    </div>
    <div class="form-group"><label class="form-label">Quantité</label><input id="mv-qte" type="number" class="form-input" placeholder="0" min="1"/></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveMouvementStock('${prodId}')"><i class="fas fa-save"></i> Enregistrer</button>
    </div>`);
}

async function saveMouvementStock(prodId) {
  const type = document.getElementById('mv-type').value;
  const qte = parseFloat(document.getElementById('mv-qte').value)||0;
  if (!qte) { toast('Quantité invalide', 'danger'); return; }
  const { data: p } = await SB.getOne('produits', prodId);
  const newStock = type === 'entree' ? Number(p.stock_actuel) + qte : Math.max(0, Number(p.stock_actuel) - qte);
  await SB.update('produits', prodId, { stock_actuel: newStock });
  closeModal(); toast('Stock mis à jour', 'success'); navigate('stock');
}

// ===== FOURNISSEURS =====
async function renderFournisseurs() {
  const cid = AppState.currentCompany?.id;
  const { data: fournisseurs } = await SB.getAll('fournisseurs', cid);
  const content = document.getElementById('page-content');
  content.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div><h2 style="font-size:20px;font-weight:700">Fournisseurs</h2><p style="color:var(--text-secondary);font-size:13px">${(fournisseurs||[]).length} fournisseurs</p></div>
    <button class="btn btn-primary" onclick="openFournisseurModal()"><i class="fas fa-plus"></i> Nouveau fournisseur</button>
  </div>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Nom</th><th>Contact</th><th>Téléphone</th><th>Email</th><th>Catégorie</th><th>Actions</th></tr></thead>
      <tbody>
        ${!(fournisseurs||[]).length?`<tr><td colspan="6"><div class="empty-state"><div class="icon">🚚</div><h3>Aucun fournisseur</h3></div></td></tr>`:(fournisseurs||[]).map(f=>`<tr>
          <td style="font-weight:600">${f.name}</td>
          <td>${f.contact||'–'}</td>
          <td>${f.phone||'–'}</td>
          <td>${f.email||'–'}</td>
          <td>${f.categorie||'–'}</td>
          <td>
            <button class="btn btn-ghost btn-sm" onclick="openFournisseurModal('${f.id}')"><i class="fas fa-edit" style="color:#2563eb"></i></button>
            <button class="btn btn-ghost btn-sm" onclick="deleteFournisseur('${f.id}')"><i class="fas fa-trash" style="color:#dc2626"></i></button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

async function openFournisseurModal(id=null) {
  let f = {};
  if (id) { const { data } = await SB.getOne('fournisseurs', id); f = data||{}; }
  openModal(`
    <div class="modal-header"><h3 class="modal-title"><i class="fas fa-truck" style="color:#2563eb;margin-right:8px"></i>${id?'Modifier':'Nouveau'} fournisseur</h3><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Nom <span class="req">*</span></label><input id="fo-name" class="form-input" value="${f.name||''}" placeholder="Lafarge Maroc..."/></div>
      <div class="form-group"><label class="form-label">Catégorie</label><input id="fo-cat" class="form-input" value="${f.categorie||''}" placeholder="Matériaux..."/></div>
      <div class="form-group"><label class="form-label">Contact</label><input id="fo-contact" class="form-input" value="${f.contact||''}" placeholder="Nom du contact"/></div>
      <div class="form-group"><label class="form-label">Téléphone</label><input id="fo-phone" class="form-input" value="${f.phone||''}" placeholder="06XXXXXXXX"/></div>
      <div class="form-group"><label class="form-label">Email</label><input id="fo-email" class="form-input" value="${f.email||''}" placeholder="email@fournisseur.ma"/></div>
      <div class="form-group"><label class="form-label">Notes</label><input id="fo-notes" class="form-input" value="${f.notes||''}" placeholder="Notes..."/></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveFournisseur('${id||''}')"><i class="fas fa-save"></i> ${id?'Modifier':'Créer'}</button>
    </div>`);
}

async function saveFournisseur(id) {
  const name = document.getElementById('fo-name').value.trim();
  if (!name) { toast('Nom requis', 'danger'); return; }
  const item = { company_id: AppState.currentCompany.id, name, categorie: document.getElementById('fo-cat').value, contact: document.getElementById('fo-contact').value, phone: document.getElementById('fo-phone').value, email: document.getElementById('fo-email').value, notes: document.getElementById('fo-notes').value };
  const { error: fre } = id ? await SB.update('fournisseurs', id, item) : await SB.insert('fournisseurs', item);
  if (fre) { toast('Erreur : ' + fre.message, 'danger'); return; }
  toast(id ? 'Fournisseur modifié' : 'Fournisseur créé', 'success');
  closeModal(); navigate('fournisseurs');
}

async function deleteFournisseur(id) {
  confirmDialog('Supprimer ce fournisseur ?', async () => { await SB.remove('fournisseurs', id); toast('Supprimé', 'danger'); navigate('fournisseurs'); });
}

// ===== AGENDA =====
async function renderAgenda() {
  const cid = AppState.currentCompany?.id;
  const { data: events } = await SB.getAll('agenda', cid);
  const content = document.getElementById('page-content');
  const typeMap = { rdv:'badge-info', reunion:'badge-warning', livraison:'badge-success', autre:'badge-secondary' };
  content.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div><h2 style="font-size:20px;font-weight:700">Agenda</h2></div>
    <button class="btn btn-primary" onclick="openAgendaModal()"><i class="fas fa-plus"></i> Nouvel événement</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
    ${!(events||[]).length?`<div class="card" style="text-align:center;padding:40px;grid-column:1/-1"><div style="font-size:48px">📅</div><h3>Aucun événement</h3></div>`:
    (events||[]).sort((a,b)=>new Date(a.date)-new Date(b.date)).map(ev=>`<div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <h3 style="font-weight:700;font-size:14px">${ev.titre}</h3>
        <span class="badge ${typeMap[ev.type]||'badge-secondary'}">${ev.type||'rdv'}</span>
      </div>
      <div style="color:var(--text-secondary);font-size:13px;margin-bottom:4px"><i class="fas fa-calendar"></i> ${fmtDate(ev.date)} ${ev.heure?'à '+ev.heure:''}</div>
      ${ev.notes?`<div style="font-size:12px;color:var(--text-secondary);margin-top:6px">${ev.notes}</div>`:''}
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn btn-secondary btn-sm" onclick="openAgendaModal('${ev.id}')"><i class="fas fa-edit"></i></button>
        <button class="btn btn-danger btn-sm" onclick="deleteAgenda('${ev.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`).join('')}
  </div>`;
}

async function openAgendaModal(id=null) {
  let ev = {};
  if (id) { const { data } = await SB.getOne('agenda', id); ev = data||{}; }
  openModal(`
    <div class="modal-header"><h3 class="modal-title"><i class="fas fa-calendar-alt" style="color:#2563eb;margin-right:8px"></i>${id?'Modifier':'Nouvel'} événement</h3><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
    <div class="form-grid-2">
      <div class="form-group" style="grid-column:1/-1"><label class="form-label">Titre <span class="req">*</span></label><input id="ag-titre" class="form-input" value="${ev.titre||''}" placeholder="Réunion chantier..."/></div>
      <div class="form-group"><label class="form-label">Date</label><input id="ag-date" type="date" class="form-input" value="${ev.date||new Date().toISOString().split('T')[0]}"/></div>
      <div class="form-group"><label class="form-label">Heure</label><input id="ag-heure" type="time" class="form-input" value="${ev.heure||'09:00'}"/></div>
      <div class="form-group"><label class="form-label">Type</label>
        <select id="ag-type" class="form-select">
          <option value="rdv" ${ev.type==='rdv'?'selected':''}>Rendez-vous</option>
          <option value="reunion" ${ev.type==='reunion'?'selected':''}>Réunion</option>
          <option value="livraison" ${ev.type==='livraison'?'selected':''}>Livraison</option>
          <option value="autre" ${ev.type==='autre'?'selected':''}>Autre</option>
        </select>
      </div>
      <div class="form-group" style="grid-column:1/-1"><label class="form-label">Notes</label><textarea id="ag-notes" class="form-textarea" placeholder="Notes...">${ev.notes||''}</textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveAgenda('${id||''}')"><i class="fas fa-save"></i> ${id?'Modifier':'Créer'}</button>
    </div>`);
}

async function saveAgenda(id) {
  const titre = document.getElementById('ag-titre').value.trim();
  if (!titre) { toast('Titre requis', 'danger'); return; }
  const item = { company_id: AppState.currentCompany.id, titre, date: document.getElementById('ag-date').value, heure: document.getElementById('ag-heure').value, type: document.getElementById('ag-type').value, notes: document.getElementById('ag-notes').value };
  const { error: ae } = id ? await SB.update('agenda', id, item) : await SB.insert('agenda', item);
  if (ae) { toast('Erreur : ' + ae.message, 'danger'); return; }
  toast(id ? 'Événement modifié' : 'Événement créé', 'success');
  closeModal(); navigate('agenda');
}

async function deleteAgenda(id) {
  confirmDialog('Supprimer cet événement ?', async () => { await SB.remove('agenda', id); toast('Supprimé', 'danger'); navigate('agenda'); });
}

// ===== RAPPORTS =====
async function renderRapports() {
  const cid = AppState.currentCompany?.id;
  const [{ data: factures }, { data: paiements }, { data: chantiers }] = await Promise.all([
    SB.getAll('factures', cid),
    SB.getAll('paiements', cid),
    SB.getAll('chantiers', cid),
  ]);
  const totalCA = (factures||[]).filter(f=>f.statut==='paye').reduce((s,f)=>s+Number(f.montant_ttc),0);
  const totalImpaye = (factures||[]).filter(f=>f.statut!=='paye').reduce((s,f)=>s+(Number(f.montant_ttc)-Number(f.montant_paye)),0);
  const entrees = (paiements||[]).filter(p=>p.type==='entree').reduce((s,p)=>s+Number(p.montant),0);
  const sorties = (paiements||[]).filter(p=>p.type==='sortie').reduce((s,p)=>s+Number(p.montant),0);
  const content = document.getElementById('page-content');
  content.innerHTML = `
  <h2 style="font-size:20px;font-weight:700;margin-bottom:20px">Rapports & Analyses</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px">
    ${statCard('CA encaissé',fmt(totalCA),'fa-chart-line','#16a34a','up',`${(factures||[]).filter(f=>f.statut==='paye').length} factures`)}
    ${statCard('Impayés',fmt(totalImpaye),'fa-exclamation-circle','#dc2626','down',`${(factures||[]).filter(f=>f.statut!=='paye').length} factures`)}
    ${statCard('Trésorerie',fmt(entrees-sorties),'fa-piggy-bank',entrees-sorties>=0?'#16a34a':'#dc2626','up','Solde actuel')}
    ${statCard('Chantiers actifs',(chantiers||[]).filter(c=>c.statut==='en_cours').length,'fa-hard-hat','#7c3aed','up',`${(chantiers||[]).length} total`)}
  </div>
  <div class="card">
    <h3 style="font-weight:700;margin-bottom:16px">Bilan financier</h3>
    <table style="width:100%;border-collapse:collapse">
      <tbody>
        <tr style="border-bottom:1px solid var(--border)"><td style="padding:12px;color:var(--text-secondary)">Chiffre d'affaires (factures payées)</td><td style="padding:12px;text-align:right;font-weight:700;color:#16a34a">${fmt(totalCA)}</td></tr>
        <tr style="border-bottom:1px solid var(--border)"><td style="padding:12px;color:var(--text-secondary)">Créances (impayés)</td><td style="padding:12px;text-align:right;font-weight:700;color:#dc2626">${fmt(totalImpaye)}</td></tr>
        <tr style="border-bottom:1px solid var(--border)"><td style="padding:12px;color:var(--text-secondary)">Total facturé</td><td style="padding:12px;text-align:right;font-weight:700">${fmt((factures||[]).reduce((s,f)=>s+Number(f.montant_ttc),0))}</td></tr>
        <tr style="border-bottom:1px solid var(--border)"><td style="padding:12px;color:var(--text-secondary)">Total entrées trésorerie</td><td style="padding:12px;text-align:right;font-weight:700;color:#16a34a">${fmt(entrees)}</td></tr>
        <tr style="border-bottom:1px solid var(--border)"><td style="padding:12px;color:var(--text-secondary)">Total sorties trésorerie</td><td style="padding:12px;text-align:right;font-weight:700;color:#dc2626">${fmt(sorties)}</td></tr>
        <tr style="background:var(--bg-main)"><td style="padding:12px;font-weight:700">Solde trésorerie net</td><td style="padding:12px;text-align:right;font-weight:800;font-size:18px;color:${entrees-sorties>=0?'#16a34a':'#dc2626'}">${fmt(entrees-sorties)}</td></tr>
      </tbody>
    </table>
  </div>`;
}

// ===== PARAMÈTRES – MODULE COMPLET =====
let _paramTab = 'societe';
let _paramProfiles = [];

async function renderParametres() {
  const cid = AppState.currentCompany?.id;
  const [{ data: profiles }] = await Promise.all([SB.getCompanyProfiles(cid)]);
  _paramProfiles = profiles || [];
  const co = AppState.currentCompany;
  const content = document.getElementById('page-content');

  // Calcul abonnement
  const planLabels = { basic:'Basique', business:'Business', enterprise:'Enterprise' };
  const planColors = { basic:'#64748b', business:'#2563eb', enterprise:'#7c3aed' };
  const plan = co?.plan || 'basic';
  const createdAt = co?.created_at ? new Date(co.created_at) : new Date();
  const now = new Date();
  const daysSince = Math.floor((now - createdAt) / 86400000);
  const trialDays = 30;
  const daysLeft = Math.max(0, trialDays - daysSince);

  // Style PDF sauvegardé
  const pdfStyle = JSON.parse(localStorage.getItem('batigest_pdf_style') || '{}');

  content.innerHTML = `
  <div class="param-header">
    <div>
      <h2 style="font-size:22px;font-weight:800;margin-bottom:4px"><i class="fas fa-cog" style="color:var(--primary);margin-right:10px"></i>Paramètres</h2>
      <p style="color:var(--text-secondary);font-size:13px">Gérez votre société, utilisateurs et préférences</p>
    </div>
  </div>

  <!-- ONGLETS -->
  <div class="param-tabs">
    <button class="param-tab ${_paramTab==='societe'?'active':''}" onclick="switchParamTab('societe')">
      <i class="fas fa-building"></i> Société
    </button>
    <button class="param-tab ${_paramTab==='utilisateurs'?'active':''}" onclick="switchParamTab('utilisateurs')">
      <i class="fas fa-users"></i> Utilisateurs <span class="param-tab-badge">${_paramProfiles.length}</span>
    </button>
    <button class="param-tab ${_paramTab==='pdf'?'active':''}" onclick="switchParamTab('pdf')">
      <i class="fas fa-file-pdf"></i> PDF & Style
    </button>
    <button class="param-tab ${_paramTab==='abonnement'?'active':''}" onclick="switchParamTab('abonnement')">
      <i class="fas fa-crown"></i> Abonnement
    </button>
    <button class="param-tab ${_paramTab==='securite'?'active':''}" onclick="switchParamTab('securite')">
      <i class="fas fa-shield-alt"></i> Sécurité
    </button>
  </div>

  <!-- CONTENU ONGLETS -->
  <div id="param-content">
    ${renderParamSociete(co)}
  </div>`;

  // Afficher le bon onglet
  if (_paramTab !== 'societe') switchParamTab(_paramTab, false);
}

function switchParamTab(tab, scroll=true) {
  _paramTab = tab;
  // Mettre à jour les boutons
  document.querySelectorAll('.param-tab').forEach(b => b.classList.remove('active'));
  const activeBtn = [...document.querySelectorAll('.param-tab')].find(b => b.onclick?.toString().includes(`'${tab}'`));
  if (activeBtn) activeBtn.classList.add('active');
  // Rendre le contenu
  const co = AppState.currentCompany;
  const c = document.getElementById('param-content');
  if (!c) return;
  const renders = {
    societe: () => renderParamSociete(co),
    utilisateurs: () => renderParamUtilisateurs(),
    pdf: () => renderParamPDF(co),
    abonnement: () => renderParamAbonnement(co),
    securite: () => renderParamSecurite(),
  };
  c.innerHTML = renders[tab] ? renders[tab]() : '';
  if (scroll) c.scrollIntoView({ behavior:'smooth', block:'start' });
}

// ---- Onglet Société ----
function renderParamSociete(co) {
  const logo = localStorage.getItem('batigest_logo_' + co?.id) || co?.logo || null;
  return `
  <div class="param-section">
    <div class="param-section-title"><i class="fas fa-image"></i> Logo de la société</div>
    <div style="display:flex;align-items:center;gap:20px;margin-bottom:24px">
      <div id="logo-preview" style="width:80px;height:80px;border-radius:14px;background:var(--bg-main);border:2px dashed var(--border);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">
        ${logo ? `<img src="${logo}" style="width:100%;height:100%;object-fit:contain"/>` : `<i class="fas fa-image" style="font-size:28px;color:var(--text-secondary)"></i>`}
      </div>
      <div>
        <label class="btn btn-secondary btn-sm" style="cursor:pointer"><i class="fas fa-upload"></i> Charger logo
          <input type="file" accept="image/*" style="display:none" onchange="uploadLogo(this)"/>
        </label>
        ${logo ? `<button class="btn btn-ghost btn-sm" onclick="removeLogo()" style="margin-left:8px;color:var(--danger)"><i class="fas fa-trash"></i> Supprimer</button>` : ''}
        <p style="font-size:11px;color:var(--text-secondary);margin-top:6px">PNG, JPG — max 2 Mo — apparaît sur les PDF</p>
      </div>
    </div>
  </div>

  <div class="param-section">
    <div class="param-section-title"><i class="fas fa-building"></i> Informations générales</div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Nom de la société <span class="req">*</span></label><input id="co-name" class="form-input" value="${co?.name||''}" placeholder="SAID TRAVAUX"/></div>
      <div class="form-group"><label class="form-label">Secteur d'activité</label><input id="co-secteur" class="form-input" value="${co?.secteur||''}" placeholder="BTP, Maçonnerie..."/></div>
      <div class="form-group"><label class="form-label"><i class="fas fa-envelope" style="color:var(--primary);margin-right:4px"></i>Email</label><input id="co-email" type="email" class="form-input" value="${co?.email||''}" placeholder="contact@société.ma"/></div>
      <div class="form-group"><label class="form-label"><i class="fas fa-phone" style="color:var(--success);margin-right:4px"></i>Téléphone</label><input id="co-phone" class="form-input" value="${co?.phone||''}" placeholder="+212 6xx xxx xxx"/></div>
      <div class="form-group"><label class="form-label"><i class="fas fa-map-marker-alt" style="color:var(--danger);margin-right:4px"></i>Adresse</label><input id="co-address" class="form-input" value="${co?.address||''}" placeholder="Rue, Quartier..."/></div>
      <div class="form-group"><label class="form-label"><i class="fas fa-city" style="color:var(--warning);margin-right:4px"></i>Ville</label><input id="co-city" class="form-input" value="${co?.city||''}" placeholder="Casablanca"/></div>
      <div class="form-group"><label class="form-label"><i class="fas fa-globe" style="color:#0891b2;margin-right:4px"></i>Site web</label><input id="co-website" class="form-input" value="${co?.website||''}" placeholder="www.société.ma"/></div>
      <div class="form-group"><label class="form-label"><i class="fas fa-fax" style="color:var(--secondary);margin-right:4px"></i>Fax</label><input id="co-fax" class="form-input" value="${co?.fax||''}" placeholder="+212 5xx xxx xxx"/></div>
    </div>
  </div>

  <div class="param-section">
    <div class="param-section-title"><i class="fas fa-file-contract"></i> Informations légales & financières</div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">ICE <span style="font-size:10px;color:var(--text-secondary)">(Identifiant Commun Entreprise)</span></label><input id="co-ice" class="form-input" value="${co?.ice||''}" placeholder="000000000000000"/></div>
      <div class="form-group"><label class="form-label">RC <span style="font-size:10px;color:var(--text-secondary)">(Registre du Commerce)</span></label><input id="co-rc" class="form-input" value="${co?.rc||''}" placeholder="12345"/></div>
      <div class="form-group"><label class="form-label">IF <span style="font-size:10px;color:var(--text-secondary)">(Identifiant Fiscal)</span></label><input id="co-if" class="form-input" value="${co?.if_number||''}" placeholder="12345678"/></div>
      <div class="form-group"><label class="form-label">CNSS</label><input id="co-cnss" class="form-input" value="${co?.cnss||''}" placeholder="12345678"/></div>
      <div class="form-group" style="grid-column:1/-1"><label class="form-label">RIB Bancaire <span style="font-size:10px;color:var(--text-secondary)">(Relevé d'Identité Bancaire)</span></label><input id="co-rib" class="form-input" value="${co?.rib||''}" placeholder="XXX XXXX XXXXXXXXXX XX"/></div>
      <div class="form-group"><label class="form-label">Banque</label><input id="co-bank" class="form-input" value="${co?.bank||''}" placeholder="Attijariwafa, BMCE..."/></div>
      <div class="form-group"><label class="form-label">Capital social (DH)</label><input id="co-capital" type="number" class="form-input" value="${co?.capital||''}" placeholder="100000"/></div>
    </div>
  </div>

  <div class="param-section">
    <div class="param-section-title"><i class="fas fa-align-left"></i> Mentions légales (bas de page PDF)</div>
    <div class="form-group"><textarea id="co-mentions" class="form-textarea" rows="3" placeholder="Ex: Société à Responsabilité Limitée (SARL) au capital de 100 000 DH — RC : 12345 — ICE : 000000000000000 — IF : 12345678">${co?.mentions||''}</textarea></div>
  </div>

  <div style="display:flex;gap:12px;flex-wrap:wrap">
    <button class="btn btn-primary" onclick="saveCompanySettings()"><i class="fas fa-save"></i> Enregistrer les modifications</button>
    <button class="btn btn-secondary" onclick="navigate('parametres')"><i class="fas fa-undo"></i> Annuler</button>
  </div>`;
}

// ---- Onglet Utilisateurs ----
function renderParamUtilisateurs() {
  const isAdmin = AppState.currentProfile?.role === 'admin';
  const statusColors = { active:'badge-success', inactive:'badge-danger', pending:'badge-warning' };
  const statusLabels = { active:'Actif', inactive:'Inactif', pending:'En attente' };
  return `
  <div class="param-section">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div>
        <div class="param-section-title" style="margin-bottom:4px"><i class="fas fa-users"></i> Équipe — ${_paramProfiles.length} membre(s)</div>
        <p style="font-size:12px;color:var(--text-secondary)">Gérez les accès à votre espace BatiGest Pro</p>
      </div>
      ${isAdmin ? `<button class="btn btn-primary" onclick="openNewUserModal()"><i class="fas fa-user-plus"></i> Ajouter un membre</button>` : ''}
    </div>
    <div class="users-grid">
      ${_paramProfiles.map(u => {
        const initials = (u.name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
        const colors = ['#2563eb','#7c3aed','#16a34a','#d97706','#dc2626','#0891b2'];
        const color = colors[u.name?.charCodeAt(0)%colors.length] || '#2563eb';
        const isCurrentUser = u.id === AppState.currentProfile?.id;
        return `
        <div class="user-card ${isCurrentUser?'user-card-me':''}">
          <div style="display:flex;align-items:flex-start;gap:12px">
            <div style="width:48px;height:48px;border-radius:14px;background:${color}22;border:2px solid ${color}44;display:flex;align-items:center;justify-content:center;color:${color};font-weight:800;font-size:16px;flex-shrink:0">${initials}</div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <div style="font-weight:700;font-size:15px">${u.name}</div>
                ${isCurrentUser ? '<span style="font-size:10px;background:#dbeafe;color:#1d4ed8;padding:1px 6px;border-radius:8px;font-weight:600">Vous</span>' : ''}
              </div>
              <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">${u.email}</div>
              <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
                <span class="badge ${u.role==='admin'?'badge-info':'badge-secondary'}">${u.role==='admin'?'👑 Admin':'👤 Utilisateur'}</span>
                <span class="badge ${statusColors[u.status]||'badge-secondary'}">${statusLabels[u.status]||u.status||'–'}</span>
              </div>
            </div>
          </div>
          ${isAdmin && !isCurrentUser ? `
          <div style="display:flex;gap:6px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
            <button class="btn btn-secondary btn-sm" onclick="openEditUserModal('${u.id}','${u.name}','${u.role}')"><i class="fas fa-edit"></i> Modifier</button>
            <button class="btn btn-secondary btn-sm" onclick="toggleUserStatus('${u.id}','${u.status}')" style="color:${u.status==='active'?'#d97706':'#16a34a'}">
              <i class="fas fa-${u.status==='active'?'pause':'play'}"></i> ${u.status==='active'?'Désactiver':'Activer'}
            </button>
            <button class="btn btn-ghost btn-sm" onclick="deleteUserConfirm('${u.id}','${u.name}')" style="color:var(--danger)"><i class="fas fa-trash"></i></button>
          </div>` : ''}
        </div>`;
      }).join('') || '<div class="empty-state"><div style="font-size:40px;margin-bottom:12px">👥</div><h3>Aucun utilisateur</h3></div>'}
    </div>
  </div>`;
}

// ---- Onglet PDF & Style ----
function renderParamPDF(co) {
  const s = JSON.parse(localStorage.getItem('batigest_pdf_style') || '{}');
  const appStyle = JSON.parse(localStorage.getItem('batigest_app_style') || '{}');
  return `
  <div class="param-section">
    <div class="param-section-title"><i class="fas fa-palette"></i> Style des documents PDF</div>
    <div class="form-grid-2">
      <div class="form-group">
        <label class="form-label">Couleur principale PDF</label>
        <div style="display:flex;gap:8px;align-items:center">
          <input type="color" id="pdf-color" value="${s.color||'#2563eb'}" style="width:48px;height:38px;border-radius:8px;border:1px solid var(--border);cursor:pointer;padding:2px"/>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${['#2563eb','#7c3aed','#16a34a','#dc2626','#d97706','#0891b2','#1e293b','#064e3b'].map(c=>`<div onclick="document.getElementById('pdf-color').value='${c}'" style="width:28px;height:28px;border-radius:6px;background:${c};cursor:pointer;border:2px solid ${s.color===c?'#fff':'transparent'};box-shadow:0 0 0 1px ${c}88"></div>`).join('')}
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Style du document</label>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
          ${[['moderne','fa-star','Moderne'],['classique','fa-certificate','Classique'],['minimaliste','fa-minus','Minimaliste']].map(([v,i,l])=>`
          <label style="cursor:pointer">
            <input type="radio" name="pdf-style" value="${v}" ${(s.style||'moderne')===v?'checked':''} style="display:none" onchange="document.querySelectorAll('.pdf-style-opt').forEach(x=>x.classList.remove('selected'));this.parentElement.querySelector('.pdf-style-opt').classList.add('selected')"/>
            <div class="pdf-style-opt ${(s.style||'moderne')===v?'selected':''}">
              <i class="fas ${i}" style="font-size:18px;margin-bottom:4px"></i><br/>${l}
            </div>
          </label>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Police du document</label>
        <select id="pdf-font" class="form-select">
          <option value="Inter" ${(s.font||'Inter')==='Inter'?'selected':''}>Inter (Moderne)</option>
          <option value="Georgia" ${s.font==='Georgia'?'selected':''}>Georgia (Classique)</option>
          <option value="Arial" ${s.font==='Arial'?'selected':''}>Arial (Standard)</option>
          <option value="Courier New" ${s.font==='Courier New'?'selected':''}>Courier (Monospace)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">TVA par défaut (%)</label>
        <input type="number" id="pdf-tva" class="form-input" value="${s.tva||20}" min="0" max="100"/>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label"><i class="fas fa-align-left"></i> En-tête PDF (introduction)</label>
      <textarea id="pdf-header-text" class="form-textarea" rows="2" placeholder="Texte affiché sous le nom de la société dans l'en-tête...">${s.headerText||''}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label"><i class="fas fa-shoe-prints"></i> Pied de page PDF</label>
      <textarea id="pdf-footer-text" class="form-textarea" rows="2" placeholder="Ex: Merci de votre confiance — Tél: +212 6xx xxx xxx — email@société.ma">${s.footerText||`${co?.name||''} — ${co?.phone||''} — ${co?.email||''}`}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label" style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" id="pdf-montant-lettres" ${s.montantLettres?'checked':''} style="width:16px;height:16px;accent-color:var(--primary)"/>
        Afficher le montant en lettres sur les PDF
      </label>
      <p style="font-size:11px;color:var(--text-secondary);margin-top:4px">Ex: "Dix mille cinq cents dirhams et zéro centime"</p>
    </div>
    <div class="form-group">
      <label class="form-label" style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" id="pdf-watermark" ${s.watermark?'checked':''} style="width:16px;height:16px;accent-color:var(--primary)"/>
        Filigrane "IMPAYÉE" sur les factures non réglées
      </label>
    </div>
    <button class="btn btn-primary" onclick="savePdfStyle()"><i class="fas fa-save"></i> Enregistrer le style PDF</button>
  </div>

  <div class="param-section">
    <div class="param-section-title"><i class="fas fa-paint-brush"></i> Thème de l'application</div>
    <div class="form-grid-2">
      <div>
        <label class="form-label">Couleur principale de l'interface</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
          ${[['#2563eb','Bleu'],['#7c3aed','Violet'],['#16a34a','Vert'],['#dc2626','Rouge'],['#d97706','Orange'],['#0891b2','Cyan'],['#db2777','Rose'],['#1e293b','Ardoise']].map(([c,n])=>`
          <button onclick="applyAppColor('${c}')" title="${n}" style="width:36px;height:36px;border-radius:10px;background:${c};border:3px solid ${(appStyle.color||'#2563eb')===c?'#fff':'transparent'};cursor:pointer;box-shadow:0 0 0 2px ${c}"></button>`).join('')}
        </div>
      </div>
      <div>
        <label class="form-label">Mode d'affichage</label>
        <div style="display:flex;gap:10px;margin-top:8px">
          <button onclick="setTheme('light')" class="btn ${AppState.theme==='light'?'btn-primary':'btn-secondary'}"><i class="fas fa-sun"></i> Clair</button>
          <button onclick="setTheme('dark')" class="btn ${AppState.theme==='dark'?'btn-primary':'btn-secondary'}"><i class="fas fa-moon"></i> Sombre</button>
        </div>
      </div>
    </div>
  </div>`;
}

// ---- Onglet Abonnement ----
function renderParamAbonnement(co) {
  const plan = co?.plan || 'basic';
  const createdAt = co?.created_at ? new Date(co.created_at) : new Date();
  const now = new Date();
  const daysSince = Math.floor((now - createdAt) / 86400000);
  const expiresAt = new Date(createdAt);
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  const daysLeft = Math.max(0, Math.ceil((expiresAt - now) / 86400000));
  const pct = Math.max(0, Math.min(100, Math.round(daysLeft / 365 * 100)));
  const planFeatures = {
    basic: ['✅ Devis & Factures', '✅ 3 Utilisateurs max', '✅ Clients & Chantiers', '✅ Stock de base', '❌ Rapports avancés', '❌ Support prioritaire'],
    business: ['✅ Tout Basic +', '✅ 10 Utilisateurs', '✅ Rapports complets', '✅ PDF personnalisé', '✅ Support prioritaire', '❌ API & Intégrations'],
    enterprise: ['✅ Tout Business +', '✅ Utilisateurs illimités', '✅ API & Intégrations', '✅ Personnalisation totale', '✅ Support dédié 24/7', '✅ Formation incluse'],
  };
  const planPrices = { basic:'Gratuit', business:'299 DH/mois', enterprise:'799 DH/mois' };
  const planColors2 = { basic:'#64748b', business:'#2563eb', enterprise:'#7c3aed' };
  return `
  <div class="param-section">
    <div class="param-section-title"><i class="fas fa-crown"></i> Votre abonnement actuel</div>
    <div class="plan-current-card" style="border-left:4px solid ${planColors2[plan]}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
        <div>
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px">Plan actuel</div>
          <div style="font-size:28px;font-weight:900;color:${planColors2[plan]}">${plan.charAt(0).toUpperCase()+plan.slice(1)}</div>
          <div style="font-size:14px;color:var(--text-secondary);margin-top:4px">${planPrices[plan]}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:13px;color:var(--text-secondary)">Expiration</div>
          <div style="font-size:22px;font-weight:800;color:${daysLeft<30?'#dc2626':daysLeft<90?'#d97706':'#16a34a'}">${daysLeft} jours</div>
          <div style="font-size:12px;color:var(--text-secondary)">jusqu'au ${expiresAt.toLocaleDateString('fr-FR')}</div>
        </div>
      </div>
      <div style="margin-top:16px">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);margin-bottom:6px">
          <span>Temps restant</span><span style="font-weight:600;color:${daysLeft<30?'#dc2626':'var(--text-primary)'}">${pct}%</span>
        </div>
        <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">
          <div style="height:100%;border-radius:4px;background:${daysLeft<30?'#dc2626':daysLeft<90?'#d97706':planColors2[plan]};width:${pct}%;transition:width 0.5s"></div>
        </div>
      </div>
      ${daysLeft < 30 ? `<div style="margin-top:12px;padding:10px 14px;background:rgba(220,38,38,0.08);border-radius:8px;border-left:3px solid #dc2626;font-size:13px;color:#dc2626"><i class="fas fa-exclamation-triangle"></i> Votre abonnement expire bientôt ! Contactez votre administrateur pour le renouveler.</div>` : ''}
    </div>
  </div>

  <div class="param-section">
    <div class="param-section-title"><i class="fas fa-list-check"></i> Fonctionnalités de votre plan</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px">
      ${(planFeatures[plan]||[]).map(f=>`<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--bg-main);border-radius:8px;font-size:13px">${f}</div>`).join('')}
    </div>
  </div>

  <div class="param-section">
    <div class="param-section-title"><i class="fas fa-rocket"></i> Passer à un plan supérieur</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px">
      ${[['business','Business','299 DH/mois','#2563eb'],['enterprise','Enterprise','799 DH/mois','#7c3aed']].filter(([p])=>p!==plan).map(([p,n,price,col])=>`
      <div style="border:2px solid ${col};border-radius:16px;padding:20px;background:${col}08">
        <div style="font-size:18px;font-weight:800;color:${col};margin-bottom:4px">${n}</div>
        <div style="font-size:22px;font-weight:900;margin-bottom:12px">${price}</div>
        ${(planFeatures[p]||[]).slice(0,4).map(f=>`<div style="font-size:12px;margin-bottom:4px">${f}</div>`).join('')}
        <button class="btn btn-primary btn-sm" style="margin-top:12px;background:${col};width:100%;justify-content:center" onclick="toast('Contactez votre Super Admin pour changer de plan','info')"><i class="fas fa-arrow-up"></i> Passer à ${n}</button>
      </div>`).join('')}
    </div>
    <p style="font-size:12px;color:var(--text-secondary);margin-top:12px"><i class="fas fa-info-circle"></i> Pour changer de plan, contactez l'administrateur BatiGest Pro.</p>
  </div>`;
}

// ---- Onglet Sécurité ----
function renderParamSecurite() {
  const u = AppState.currentProfile;
  return `
  <div class="param-section">
    <div class="param-section-title"><i class="fas fa-key"></i> Changer le mot de passe</div>
    <div style="max-width:420px">
      <div class="form-group">
        <label class="form-label">Nouveau mot de passe</label>
        <div style="position:relative">
          <input type="password" id="new-pwd" class="form-input" placeholder="Minimum 8 caractères" style="padding-right:40px"/>
          <button type="button" onclick="toggleFieldPwd('new-pwd','eye-new')" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-secondary)"><i class="fas fa-eye" id="eye-new"></i></button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Confirmer le mot de passe</label>
        <div style="position:relative">
          <input type="password" id="confirm-pwd" class="form-input" placeholder="Répéter le mot de passe" style="padding-right:40px"/>
          <button type="button" onclick="toggleFieldPwd('confirm-pwd','eye-confirm')" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-secondary)"><i class="fas fa-eye" id="eye-confirm"></i></button>
        </div>
      </div>
      <div id="pwd-strength" style="display:none;margin-bottom:12px"></div>
      <button class="btn btn-primary" onclick="changePassword()"><i class="fas fa-save"></i> Mettre à jour le mot de passe</button>
    </div>
  </div>

  <div class="param-section">
    <div class="param-section-title"><i class="fas fa-database"></i> Sauvegarde des données</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
      <div style="padding:16px;background:var(--bg-main);border-radius:12px;border:1px solid var(--border)">
        <div style="font-size:24px;margin-bottom:8px">📊</div>
        <div style="font-weight:700;margin-bottom:4px">Export Données</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">Télécharger toutes vos données en JSON</div>
        <button class="btn btn-secondary btn-sm" onclick="exportData()"><i class="fas fa-download"></i> Exporter JSON</button>
      </div>
      <div style="padding:16px;background:var(--bg-main);border-radius:12px;border:1px solid var(--border)">
        <div style="font-size:24px;margin-bottom:8px">📋</div>
        <div style="font-weight:700;margin-bottom:4px">Export CSV</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">Clients, factures, devis en CSV</div>
        <button class="btn btn-secondary btn-sm" onclick="exportCSV()"><i class="fas fa-file-csv"></i> Exporter CSV</button>
      </div>
      <div style="padding:16px;background:var(--bg-main);border-radius:12px;border:1px solid var(--border)">
        <div style="font-size:24px;margin-bottom:8px">🕒</div>
        <div style="font-weight:700;margin-bottom:4px">Dernière sauvegarde</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">Données synchronisées en temps réel sur Supabase</div>
        <span class="badge badge-success"><i class="fas fa-check-circle"></i> Cloud synchronisé</span>
      </div>
    </div>
  </div>

  <div class="param-section">
    <div class="param-section-title"><i class="fas fa-user-circle"></i> Informations du compte</div>
    <div style="padding:16px;background:var(--bg-main);border-radius:12px;border:1px solid var(--border);max-width:420px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <div style="width:52px;height:52px;border-radius:14px;background:var(--primary);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:20px">${(u?.name||'?')[0].toUpperCase()}</div>
        <div>
          <div style="font-weight:700;font-size:16px">${u?.name||'–'}</div>
          <div style="font-size:12px;color:var(--text-secondary)">${u?.email||'–'}</div>
          <span class="badge badge-info" style="margin-top:4px">${u?.role==='admin'?'👑 Admin':'👤 Utilisateur'}</span>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Nom d'affichage</label>
        <input id="profile-name" class="form-input" value="${u?.name||''}"/>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="updateProfileName()"><i class="fas fa-save"></i> Mettre à jour le nom</button>
    </div>
  </div>`;
}

// ===== FONCTIONS PARAMÈTRES =====

function uploadLogo(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { toast('Image trop grande (max 2 Mo)', 'danger'); return; }
  const reader = new FileReader();
  reader.onload = async e => {
    const b64 = e.target.result;
    // Sauvegarder en localStorage (accès rapide)
    localStorage.setItem('batigest_logo_' + AppState.currentCompany.id, b64);
    // Sauvegarder aussi dans Supabase pour synchronisation multi-appareils
    await SB.updateCompany(AppState.currentCompany.id, { logo: b64 });
    AppState.currentCompany.logo = b64;
    const preview = document.getElementById('logo-preview');
    if (preview) preview.innerHTML = `<img src="${b64}" style="width:100%;height:100%;object-fit:contain"/>`;
    toast('✅ Logo chargé et synchronisé !', 'success');
  };
  reader.readAsDataURL(file);
}

async function removeLogo() {
  localStorage.removeItem('batigest_logo_' + AppState.currentCompany?.id);
  // Supprimer aussi dans Supabase
  await SB.updateCompany(AppState.currentCompany?.id, { logo: null });
  if (AppState.currentCompany) AppState.currentCompany.logo = null;
  switchParamTab('societe', false);
  toast('Logo supprimé', 'info');
}

async function saveCompanySettings() {
  const cid = AppState.currentCompany?.id;
  const updates = {
    name: document.getElementById('co-name')?.value || AppState.currentCompany.name,
    email: document.getElementById('co-email')?.value || '',
    phone: document.getElementById('co-phone')?.value || '',
    city: document.getElementById('co-city')?.value || '',
    address: document.getElementById('co-address')?.value || '',
    website: document.getElementById('co-website')?.value || '',
    fax: document.getElementById('co-fax')?.value || '',
    secteur: document.getElementById('co-secteur')?.value || '',
    ice: document.getElementById('co-ice')?.value || '',
    rc: document.getElementById('co-rc')?.value || '',
    if_number: document.getElementById('co-if')?.value || '',
    cnss: document.getElementById('co-cnss')?.value || '',
    rib: document.getElementById('co-rib')?.value || '',
    bank: document.getElementById('co-bank')?.value || '',
    capital: parseFloat(document.getElementById('co-capital')?.value) || null,
    mentions: document.getElementById('co-mentions')?.value || '',
  };
  const btn = document.querySelector('.param-section .btn-primary');
  if (btn) { btn.disabled=true; btn.innerHTML='<span class="loading-spinner"></span> Enregistrement...'; }
  const { data, error } = await SB.updateCompany(cid, updates);
  if (btn) { btn.disabled=false; btn.innerHTML='<i class="fas fa-save"></i> Enregistrer les modifications'; }
  if (error) { toast('Erreur : ' + (error.message||'inconnue'), 'danger'); return; }
  if (data) AppState.currentCompany = data;
  toast('✅ Paramètres de la société sauvegardés !', 'success');
}

function savePdfStyle() {
  const style = {
    color: document.getElementById('pdf-color')?.value || '#2563eb',
    style: document.querySelector('input[name="pdf-style"]:checked')?.value || 'moderne',
    font: document.getElementById('pdf-font')?.value || 'Inter',
    tva: parseFloat(document.getElementById('pdf-tva')?.value) || 20,
    headerText: document.getElementById('pdf-header-text')?.value || '',
    footerText: document.getElementById('pdf-footer-text')?.value || '',
    montantLettres: document.getElementById('pdf-montant-lettres')?.checked || false,
    watermark: document.getElementById('pdf-watermark')?.checked || false,
  };
  localStorage.setItem('batigest_pdf_style', JSON.stringify(style));
  toast('✅ Style PDF sauvegardé !', 'success');
}

function applyAppColor(color) {
  document.documentElement.style.setProperty('--primary', color);
  // Calculer une couleur plus sombre
  const darker = color + 'cc';
  document.documentElement.style.setProperty('--primary-dark', darker);
  const appStyle = { color };
  localStorage.setItem('batigest_app_style', JSON.stringify(appStyle));
  toast('Couleur appliquée !', 'success');
  switchParamTab('pdf', false);
}

function toggleFieldPwd(fieldId, eyeId) {
  const f = document.getElementById(fieldId);
  const e = document.getElementById(eyeId);
  if (!f || !e) return;
  f.type = f.type === 'password' ? 'text' : 'password';
  e.className = f.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
}

async function changePassword() {
  const pwd = document.getElementById('new-pwd')?.value;
  const confirm = document.getElementById('confirm-pwd')?.value;
  if (!pwd || pwd.length < 8) { toast('Mot de passe trop court (min 8 caractères)', 'danger'); return; }
  if (pwd !== confirm) { toast('Les mots de passe ne correspondent pas', 'danger'); return; }
  const { error } = await _supa.auth.updateUser({ password: pwd });
  if (error) { toast('Erreur : ' + error.message, 'danger'); return; }
  toast('✅ Mot de passe mis à jour avec succès !', 'success');
  document.getElementById('new-pwd').value = '';
  document.getElementById('confirm-pwd').value = '';
}

async function updateProfileName() {
  const name = document.getElementById('profile-name')?.value?.trim();
  if (!name) { toast('Nom invalide', 'danger'); return; }
  const { error } = await SB.updateProfile(AppState.currentProfile.id, { name });
  if (error) { toast('Erreur : ' + error.message, 'danger'); return; }
  AppState.currentProfile.name = name;
  toast('✅ Nom mis à jour !', 'success');
  renderSidebar();
}

async function exportData() {
  const cid = AppState.currentCompany?.id;
  const [clients, chantiers, devis, factures, paiements] = await Promise.all([
    SB.getAll('clients', cid), SB.getAll('chantiers', cid),
    SB.getAll('devis', cid), SB.getAll('factures', cid), SB.getAll('paiements', cid),
  ]);
  const data = { societe: AppState.currentCompany, clients: clients.data, chantiers: chantiers.data, devis: devis.data, factures: factures.data, paiements: paiements.data, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `batigest_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click(); toast('Export JSON téléchargé', 'success');
}

async function exportCSV() {
  const cid = AppState.currentCompany?.id;
  const { data: factures } = await SB.getAll('factures', cid);
  if (!factures?.length) { toast('Aucune donnée à exporter', 'warning'); return; }
  const headers = ['Numéro','Client','Date','Échéance','Montant TTC','Payé','Statut'];
  const rows = factures.map(f => [f.numero, f.client_nom, f.date, f.date_echeance||'', f.montant_ttc, f.montant_paye, f.statut]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v||''}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `factures_${new Date().toISOString().split('T')[0]}.csv`;
  a.click(); toast('Export CSV téléchargé', 'success');
}

function openNewUserModal() {
  openModal(`
    <div class="modal-header"><h3 class="modal-title"><i class="fas fa-user-plus" style="margin-right:8px;color:#2563eb"></i>Nouvel utilisateur</h3><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Nom complet <span class="req">*</span></label><input id="nu-name" class="form-input" placeholder="Prénom Nom"/></div>
      <div class="form-group"><label class="form-label">Email <span class="req">*</span></label><input id="nu-email" type="email" class="form-input" placeholder="email@société.ma"/></div>
      <div class="form-group"><label class="form-label">Mot de passe <span class="req">*</span></label><input id="nu-pass" type="password" class="form-input" placeholder="Minimum 8 caractères"/></div>
      <div class="form-group"><label class="form-label">Rôle</label>
        <select id="nu-role" class="form-select">
          <option value="user">👤 Utilisateur</option>
          <option value="admin">👑 Administrateur</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="createNewUser()"><i class="fas fa-user-plus"></i> Créer l'utilisateur</button>
    </div>`);
}

function openEditUserModal(id, name, role) {
  openModal(`
    <div class="modal-header"><h3 class="modal-title"><i class="fas fa-user-edit" style="margin-right:8px;color:#2563eb"></i>Modifier l'utilisateur</h3><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
    <div class="form-group"><label class="form-label">Nom complet</label><input id="eu-name" class="form-input" value="${name}"/></div>
    <div class="form-group"><label class="form-label">Rôle</label>
      <select id="eu-role" class="form-select">
        <option value="user" ${role==='user'?'selected':''}>👤 Utilisateur</option>
        <option value="admin" ${role==='admin'?'selected':''}>👑 Administrateur</option>
      </select>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveEditUser('${id}')"><i class="fas fa-save"></i> Enregistrer</button>
    </div>`);
}

async function saveEditUser(id) {
  const name = document.getElementById('eu-name')?.value?.trim();
  const role = document.getElementById('eu-role')?.value;
  if (!name) { toast('Nom requis', 'danger'); return; }
  const { error } = await SB.updateProfile(id, { name, role });
  if (error) { toast('Erreur : ' + error.message, 'danger'); return; }
  closeModal(); toast('Utilisateur modifié', 'success');
  const cid = AppState.currentCompany?.id;
  const { data } = await SB.getCompanyProfiles(cid);
  _paramProfiles = data || [];
  switchParamTab('utilisateurs', false);
}

async function toggleUserStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  const { error } = await SB.updateProfile(id, { status: newStatus });
  if (error) { toast('Erreur : ' + error.message, 'danger'); return; }
  toast(newStatus === 'active' ? 'Utilisateur activé' : 'Utilisateur désactivé', 'info');
  const cid = AppState.currentCompany?.id;
  const { data } = await SB.getCompanyProfiles(cid);
  _paramProfiles = data || [];
  switchParamTab('utilisateurs', false);
}

function deleteUserConfirm(id, name) {
  confirmDialog(`Supprimer l'utilisateur <strong>${name}</strong> ? Cette action est irréversible.`, async () => {
    const { error } = await SB.deleteProfile(id);
    if (error) { toast('Erreur : ' + error.message, 'danger'); return; }
    toast(`Utilisateur ${name} supprimé`, 'danger');
    const cid = AppState.currentCompany?.id;
    const { data } = await SB.getCompanyProfiles(cid);
    _paramProfiles = data || [];
    switchParamTab('utilisateurs', false);
  });
}

async function createNewUser() {
  const name = document.getElementById('nu-name').value.trim();
  const email = document.getElementById('nu-email').value.trim();
  const pass = document.getElementById('nu-pass').value;
  const role = document.getElementById('nu-role').value;
  if (!name || !email || !pass) { toast('Remplissez tous les champs', 'danger'); return; }
  if (pass.length < 6) { toast('Mot de passe trop court (min 6 caractères)', 'danger'); return; }

  // Vérifier quota abonnement
  const plan = AppState.currentCompany?.plan || 'basic';
  const quotas = { basic: 3, pro: 5, business: 10, enterprise: 999 };
  const quota = quotas[plan] || 3;
  if (_paramProfiles.length >= quota) {
    toast(`⚠️ Quota atteint : le plan ${plan} autorise ${quota} utilisateurs max. Contactez le Super Admin pour passer à un plan supérieur.`, 'warning');
    return;
  }

  const btn = document.querySelector('.modal-footer .btn-primary');
  if (btn) { btn.disabled=true; btn.innerHTML='<span class="loading-spinner"></span> Création...'; }

  // Essayer d'abord la création directe sans confirmation email (via endpoint serveur)
  let userId = null;
  const { data: adminData, error: adminErr } = await SB.adminCreateCompanyUser(email, pass);

  if (adminErr && adminErr.code === 'SETUP_REQUIRED') {
    // Service non configuré : fallback sur signUp standard + message d'info
    const { data: signUpData, error: signUpErr } = await SB.signUp(email, pass);
    if (signUpErr) {
      if (btn) { btn.disabled=false; btn.innerHTML='<i class="fas fa-user-plus"></i> Créer l\'utilisateur'; }
      toast('Erreur : ' + signUpErr.message, 'danger'); return;
    }
    userId = signUpData?.user?.id;
    // Créer le profil
    const { error: pe } = await SB.createProfile({ id: userId, company_id: AppState.currentCompany.id, name, email, role, status: 'active' });
    if (pe) { toast('Compte créé mais profil échoué : ' + pe.message, 'warning'); }
    else {
      closeModal();
      toast(`✅ ${name} ajouté ! ⚠️ Il doit confirmer son email avant de pouvoir se connecter. (Pour éviter ça, désactivez la confirmation email dans Supabase → Auth → Settings)`, 'info');
    }
  } else if (adminErr) {
    if (btn) { btn.disabled=false; btn.innerHTML='<i class="fas fa-user-plus"></i> Créer l\'utilisateur'; }
    toast('Erreur : ' + adminErr.message, 'danger'); return;
  } else {
    // Succès via endpoint admin — email validé automatiquement
    userId = adminData?.user?.id;
    const { error: pe } = await SB.createProfile({ id: userId, company_id: AppState.currentCompany.id, name, email, role, status: 'active' });
    if (pe) { toast('Compte créé mais profil échoué : ' + pe.message, 'warning'); }
    else {
      closeModal();
      toast(`✅ ${name} ajouté et validé automatiquement — peut se connecter immédiatement !`, 'success');
    }
  }

  const cid = AppState.currentCompany?.id;
  const { data: profiles } = await SB.getCompanyProfiles(cid);
  _paramProfiles = profiles || [];
  switchParamTab('utilisateurs', false);
}

// ===== PDF (délégué à pdf.js) =====
function printDevis(id) { if (window.printDevisPDF) window.printDevisPDF(id); else toast('Module PDF non chargé', 'warning'); }
function printFacture(id) { if (window.printFacturePDF) window.printFacturePDF(id); else toast('Module PDF non chargé', 'warning'); }
function printChantierReport(id) { if (window.printChantierPDF) window.printChantierPDF(id); else toast('Module PDF non chargé', 'warning'); }

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  setTheme(AppState.theme);
  initApp();
});
