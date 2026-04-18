// ===== SUPER ADMIN – BATIGEST PRO (Supabase) =====

const SA = {
  user: null,
  profile: null,
  page: 'dashboard',
  theme: localStorage.getItem('theme') || 'light',
  data: { companies: [], users: [] },
};

// ========== UTILITAIRES ==========
function fmt(n) { return Number(n || 0).toLocaleString('fr-MA') + ' DH'; }
function fmtDate(d) { if (!d) return '–'; return new Date(d).toLocaleDateString('fr-FR'); }

function saToast(msg, type = 'success') {
  const colors = { success: '#16a34a', danger: '#dc2626', warning: '#d97706', info: '#2563eb' };
  const icons = { success: 'fa-check-circle', danger: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  let c = document.getElementById('sa-toast-container');
  if (!c) { c = document.createElement('div'); c.id = 'sa-toast-container'; c.className = 'toast-container'; document.body.appendChild(c); }
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<i class="fas ${icons[type]}" style="color:${colors[type]}"></i><span style="flex:1">${msg}</span><button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:var(--text-secondary)"><i class="fas fa-times"></i></button>`;
  c.appendChild(t);
  setTimeout(() => t.style.opacity = '0', 3500);
  setTimeout(() => t.remove(), 3800);
}

function saModal(html, size = '') {
  closeSaModal();
  const o = document.createElement('div');
  o.className = 'modal-overlay'; o.id = 'sa-modal-overlay';
  o.innerHTML = `<div class="modal ${size}" id="sa-modal-box">${html}</div>`;
  o.addEventListener('click', e => { if (e.target === o) closeSaModal(); });
  document.body.appendChild(o);
}
function closeSaModal() { const e = document.getElementById('sa-modal-overlay'); if (e) e.remove(); }

function saConfirm(msg, onOk) {
  saModal(`
    <div class="modal-header"><h3 class="modal-title"><i class="fas fa-question-circle" style="color:#d97706;margin-right:8px"></i>Confirmation</h3>
    <button class="modal-close" onclick="closeSaModal()"><i class="fas fa-times"></i></button></div>
    <p style="color:var(--text-secondary);margin-bottom:24px">${msg}</p>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeSaModal()">Annuler</button>
      <button class="btn btn-danger" onclick="closeSaModal();(${onOk.toString()})()"><i class="fas fa-trash"></i> Confirmer</button>
    </div>`);
}

function setTheme(t) {
  SA.theme = t; localStorage.setItem('theme', t);
  document.documentElement.setAttribute('data-theme', t);
}

// ========== AUTH SUPABASE ==========
async function saLogin(email, pass) {
  const { data, error } = await SB.signIn(email, pass);
  if (error) return { error: error.message };

  const { data: profile, error: pe } = await SB.getProfile(data.user.id);
  if (pe || !profile || profile.role !== 'super_admin') {
    await SB.signOut();
    return { error: 'Accès réservé aux Super Administrateurs.' };
  }
  SA.user = data.user;
  SA.profile = profile;
  return { ok: true };
}

async function saLogout() {
  await SB.signOut();
  SA.user = null; SA.profile = null;
  renderSA();
}

// ========== RENDU PRINCIPAL ==========
async function renderSA() {
  setTheme(SA.theme);
  const root = document.getElementById('sa-root');
  if (!root) return;

  // Vérifier session existante
  const session = await SB.getSession();
  if (session) {
    const { data: profile } = await SB.getProfile(session.user.id);
    if (profile && profile.role === 'super_admin') {
      SA.user = session.user;
      SA.profile = profile;
      await renderSADashboard();
      return;
    }
    await SB.signOut();
  }
  renderSALogin();
}

function renderSALogin() {
  document.getElementById('sa-root').innerHTML = `
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1e3a5f 100%);padding:20px">
    <div style="width:100%;max-width:420px">
      <div style="text-align:center;margin-bottom:32px">
        <div style="width:72px;height:72px;background:rgba(255,255,255,0.15);border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 16px;backdrop-filter:blur(10px)">👑</div>
        <h1 style="color:#fff;font-size:28px;font-weight:800;margin-bottom:4px">Super Admin</h1>
        <p style="color:#a5b4fc;font-size:14px">Panneau d'administration BatiGest Pro</p>
      </div>
      <div style="background:rgba(255,255,255,0.08);backdrop-filter:blur(20px);border-radius:20px;padding:32px;border:1px solid rgba(255,255,255,0.15)">
        <div id="sa-login-error" style="display:none;background:rgba(220,38,38,0.15);border:1px solid rgba(220,38,38,0.3);border-radius:10px;padding:12px 14px;margin-bottom:16px;color:#fca5a5;font-size:13px">
          <i class="fas fa-exclamation-circle" style="margin-right:6px"></i><span id="sa-err-msg">Identifiants incorrects</span>
        </div>
        <form id="sa-login-form">
          <div style="margin-bottom:16px">
            <label style="display:block;color:#c7d2fe;font-size:13px;font-weight:600;margin-bottom:6px">Email administrateur</label>
            <div style="position:relative">
              <i class="fas fa-envelope" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#818cf8"></i>
              <input type="email" id="sa-email" style="width:100%;padding:12px 12px 12px 36px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:10px;color:#fff;font-size:14px;outline:none;box-sizing:border-box" placeholder="admin@batigest.ma" required/>
            </div>
          </div>
          <div style="margin-bottom:24px">
            <label style="display:block;color:#c7d2fe;font-size:13px;font-weight:600;margin-bottom:6px">Mot de passe</label>
            <div style="position:relative">
              <i class="fas fa-lock" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#818cf8"></i>
              <input type="password" id="sa-password" style="width:100%;padding:12px 40px 12px 36px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:10px;color:#fff;font-size:14px;outline:none;box-sizing:border-box" placeholder="••••••••" required/>
              <button type="button" onclick="toggleSaPwd()" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#818cf8"><i class="fas fa-eye" id="sa-eye"></i></button>
            </div>
          </div>
          <button type="submit" id="sa-login-btn" style="width:100%;padding:14px;background:linear-gradient(135deg,#4f46e5,#7c3aed);border:none;border-radius:10px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">
            <i class="fas fa-sign-in-alt"></i> Accéder au panneau
          </button>
        </form>
        <div style="margin-top:20px;padding:12px;background:rgba(99,102,241,0.15);border-radius:8px;border:1px solid rgba(99,102,241,0.3);font-size:12px;color:#a5b4fc;text-align:center">
          <i class="fas fa-shield-alt" style="margin-right:6px"></i>Accès réservé aux administrateurs de la plateforme
        </div>
      </div>
    </div>
  </div>`;

  document.getElementById('sa-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('sa-email').value.trim();
    const pass = document.getElementById('sa-password').value;
    const btn = document.getElementById('sa-login-btn');
    const errEl = document.getElementById('sa-login-error');
    errEl.style.display = 'none';
    btn.innerHTML = '<span class="loading-spinner"></span> Connexion...';
    btn.disabled = true;
    const result = await saLogin(email, pass);
    if (result.error) {
      document.getElementById('sa-err-msg').textContent = result.error;
      errEl.style.display = 'block';
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Accéder au panneau';
      btn.disabled = false;
    } else {
      await renderSADashboard();
    }
  });
}

function toggleSaPwd() {
  const inp = document.getElementById('sa-password');
  const eye = document.getElementById('sa-eye');
  if (inp.type === 'password') { inp.type = 'text'; eye.className = 'fas fa-eye-slash'; }
  else { inp.type = 'password'; eye.className = 'fas fa-eye'; }
}

// ========== DASHBOARD SUPER ADMIN ==========
async function renderSADashboard() {
  const root = document.getElementById('sa-root');
  root.innerHTML = `
  <div style="display:flex;min-height:100vh">
    <!-- Sidebar -->
    <div id="sa-sidebar" style="width:240px;background:linear-gradient(180deg,#1e1b4b,#312e81);padding:20px 0;display:flex;flex-direction:column;flex-shrink:0">
      <div style="padding:0 16px 20px;border-bottom:1px solid rgba(255,255,255,0.1)">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:36px;height:36px;background:rgba(255,255,255,0.15);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px">👑</div>
          <div>
            <div style="color:#fff;font-weight:800;font-size:13px">BatiGest Pro</div>
            <div style="color:#a5b4fc;font-size:10px">Super Admin</div>
          </div>
        </div>
      </div>
      <nav style="flex:1;padding:16px 8px">
        ${[
          { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
          { id: 'companies', icon: 'fa-building', label: 'Sociétés' },
          { id: 'users', icon: 'fa-users', label: 'Utilisateurs' },
          { id: 'create-company', icon: 'fa-plus-circle', label: 'Nouvelle société' },
        ].map(item => `
          <div class="sa-nav-item" id="nav-${item.id}" onclick="saNavigate('${item.id}')"
            style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;cursor:pointer;margin-bottom:4px;color:#c7d2fe;transition:all 0.2s">
            <i class="fas ${item.icon}" style="width:16px;text-align:center"></i>
            <span style="font-size:13px;font-weight:500">${item.label}</span>
          </div>`).join('')}
      </nav>
      <div style="padding:12px 16px;border-top:1px solid rgba(255,255,255,0.1)">
        <div style="color:#c7d2fe;font-size:12px;font-weight:600;margin-bottom:4px">${SA.profile?.name || 'Super Admin'}</div>
        <div style="color:#818cf8;font-size:11px;margin-bottom:12px">${SA.user?.email || ''}</div>
        <button onclick="saLogout()" style="width:100%;padding:8px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);border-radius:8px;color:#fca5a5;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">
          <i class="fas fa-sign-out-alt"></i> Déconnexion
        </button>
      </div>
    </div>
    <!-- Main -->
    <div style="flex:1;overflow-y:auto;background:var(--bg-main)">
      <div style="padding:24px;max-width:1200px;margin:0 auto" id="sa-content">
        <div style="display:flex;align-items:center;justify-content:center;height:200px">
          <div class="loading-spinner"></div>
        </div>
      </div>
    </div>
  </div>`;

  await saNavigate('dashboard');
}

async function saNavigate(page) {
  SA.page = page;
  // Highlight nav
  document.querySelectorAll('.sa-nav-item').forEach(el => {
    el.style.background = 'transparent';
    el.style.color = '#c7d2fe';
  });
  const activeNav = document.getElementById('nav-' + page);
  if (activeNav) { activeNav.style.background = 'rgba(255,255,255,0.12)'; activeNav.style.color = '#fff'; }

  const content = document.getElementById('sa-content');
  content.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:200px"><div class="loading-spinner"></div></div>`;

  if (page === 'dashboard') await renderSAStats(content);
  else if (page === 'companies') await renderSACompanies(content);
  else if (page === 'users') await renderSAUsers(content);
  else if (page === 'create-company') renderCreateCompanyForm(content);
}

// ========== STATISTIQUES ==========
async function renderSAStats(content) {
  const [companiesRes, usersRes] = await Promise.all([SB.getAllCompanies(), SB.getAllUsers()]);
  const companies = companiesRes.data || [];
  const users = usersRes.data || [];

  const active = companies.filter(c => c.status === 'active').length;
  const suspended = companies.filter(c => c.status === 'suspended').length;
  const activeUsers = users.filter(u => u.status === 'active').length;

  content.innerHTML = `
    <div style="margin-bottom:28px">
      <h2 style="font-size:22px;font-weight:800;color:var(--text-primary);margin-bottom:4px">
        <i class="fas fa-chart-pie" style="color:#4f46e5;margin-right:8px"></i>Tableau de bord
      </h2>
      <p style="color:var(--text-secondary);font-size:13px">Vue globale de la plateforme BatiGest Pro</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:28px">
      ${saStatCard('Sociétés totales', companies.length, 'fa-building', '#4f46e5')}
      ${saStatCard('Sociétés actives', active, 'fa-check-circle', '#16a34a')}
      ${saStatCard('Sociétés suspendues', suspended, 'fa-ban', '#dc2626')}
      ${saStatCard('Utilisateurs actifs', activeUsers, 'fa-users', '#0284c7')}
    </div>
    <div style="background:var(--bg-card);border-radius:16px;padding:20px;border:1px solid var(--border)">
      <h3 style="font-size:16px;font-weight:700;margin-bottom:16px;color:var(--text-primary)">
        <i class="fas fa-building" style="color:#4f46e5;margin-right:6px"></i>Dernières sociétés inscrites
      </h3>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:1px solid var(--border)">
              <th style="text-align:left;padding:8px 12px;font-size:12px;color:var(--text-secondary);font-weight:600">SOCIÉTÉ</th>
              <th style="text-align:left;padding:8px 12px;font-size:12px;color:var(--text-secondary);font-weight:600">PLAN</th>
              <th style="text-align:left;padding:8px 12px;font-size:12px;color:var(--text-secondary);font-weight:600">STATUT</th>
              <th style="text-align:left;padding:8px 12px;font-size:12px;color:var(--text-secondary);font-weight:600">DATE</th>
            </tr>
          </thead>
          <tbody>
            ${companies.slice(0, 5).map(co => `
              <tr style="border-bottom:1px solid var(--border)">
                <td style="padding:10px 12px;font-weight:600;color:var(--text-primary)">${co.name}</td>
                <td style="padding:10px 12px">${planBadge(co.plan)}</td>
                <td style="padding:10px 12px">${statusBadge(co.status)}</td>
                <td style="padding:10px 12px;color:var(--text-secondary);font-size:12px">${fmtDate(co.created_at)}</td>
              </tr>`).join('') || `<tr><td colspan="4" style="padding:20px;text-align:center;color:var(--text-secondary)">Aucune société</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;
}

function saStatCard(label, val, icon, color) {
  return `<div style="background:var(--bg-card);border-radius:14px;padding:20px;border:1px solid var(--border);display:flex;align-items:center;gap:14px">
    <div style="width:48px;height:48px;background:${color}22;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <i class="fas ${icon}" style="color:${color};font-size:20px"></i>
    </div>
    <div>
      <div style="font-size:26px;font-weight:800;color:var(--text-primary)">${val}</div>
      <div style="font-size:12px;color:var(--text-secondary)">${label}</div>
    </div>
  </div>`;
}

function planBadge(plan) {
  const map = { basic: ['#64748b', 'Basic'], pro: ['#2563eb', 'Pro'], business: ['#7c3aed', 'Business'] };
  const [color, label] = map[plan] || ['#64748b', plan || '–'];
  return `<span style="background:${color}22;color:${color};padding:3px 8px;border-radius:20px;font-size:11px;font-weight:600">${label}</span>`;
}

function statusBadge(status) {
  return status === 'active'
    ? `<span style="background:#16a34a22;color:#16a34a;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:600"><i class="fas fa-check" style="margin-right:3px"></i>Actif</span>`
    : `<span style="background:#dc262622;color:#dc2626;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:600"><i class="fas fa-ban" style="margin-right:3px"></i>Suspendu</span>`;
}

// ========== GESTION SOCIÉTÉS ==========
async function renderSACompanies(content) {
  const { data: companies } = await SB.getAllCompanies();

  content.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <div>
        <h2 style="font-size:22px;font-weight:800;color:var(--text-primary);margin-bottom:4px">
          <i class="fas fa-building" style="color:#4f46e5;margin-right:8px"></i>Gestion des sociétés
        </h2>
        <p style="color:var(--text-secondary);font-size:13px">${(companies || []).length} société(s) sur la plateforme</p>
      </div>
      <button class="btn btn-primary" onclick="saNavigate('create-company')">
        <i class="fas fa-plus"></i> Nouvelle société
      </button>
    </div>
    <div style="background:var(--bg-card);border-radius:16px;border:1px solid var(--border);overflow:hidden">
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead style="background:var(--bg-main)">
            <tr>
              <th style="text-align:left;padding:12px 16px;font-size:12px;color:var(--text-secondary);font-weight:600">SOCIÉTÉ</th>
              <th style="text-align:left;padding:12px 16px;font-size:12px;color:var(--text-secondary);font-weight:600">CONTACT</th>
              <th style="text-align:left;padding:12px 16px;font-size:12px;color:var(--text-secondary);font-weight:600">PLAN</th>
              <th style="text-align:left;padding:12px 16px;font-size:12px;color:var(--text-secondary);font-weight:600">STATUT</th>
              <th style="text-align:left;padding:12px 16px;font-size:12px;color:var(--text-secondary);font-weight:600">DATE</th>
              <th style="text-align:center;padding:12px 16px;font-size:12px;color:var(--text-secondary);font-weight:600">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            ${(companies || []).map(co => `
              <tr style="border-top:1px solid var(--border)" id="co-row-${co.id}">
                <td style="padding:12px 16px">
                  <div style="font-weight:700;color:var(--text-primary)">${co.name}</div>
                  <div style="font-size:11px;color:var(--text-secondary)">${co.city || ''}</div>
                </td>
                <td style="padding:12px 16px">
                  <div style="font-size:13px;color:var(--text-primary)">${co.email || '–'}</div>
                  <div style="font-size:11px;color:var(--text-secondary)">${co.phone || ''}</div>
                </td>
                <td style="padding:12px 16px">${planBadge(co.plan)}</td>
                <td style="padding:12px 16px">${statusBadge(co.status)}</td>
                <td style="padding:12px 16px;font-size:12px;color:var(--text-secondary)">${fmtDate(co.created_at)}</td>
                <td style="padding:12px 16px;text-align:center">
                  <div style="display:flex;gap:6px;justify-content:center">
                    <button class="btn btn-sm btn-secondary" onclick="editCompany('${co.id}')" title="Modifier">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm ${co.status === 'active' ? 'btn-warning' : 'btn-success'}" 
                      onclick="toggleCompanyStatus('${co.id}','${co.status}')" title="${co.status === 'active' ? 'Suspendre' : 'Activer'}">
                      <i class="fas ${co.status === 'active' ? 'fa-ban' : 'fa-check'}"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCompanySA('${co.id}')" title="Supprimer">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>`).join('') || `<tr><td colspan="6" style="padding:40px;text-align:center;color:var(--text-secondary)">
                <i class="fas fa-building" style="font-size:32px;margin-bottom:12px;display:block;opacity:0.3"></i>
                Aucune société enregistrée
              </td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;
}

async function toggleCompanyStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
  const { data, error } = await SB.updateCompany(id, { status: newStatus });
  if (error) { saToast('Erreur lors de la mise à jour', 'danger'); return; }
  saToast(`Société ${newStatus === 'active' ? 'activée' : 'suspendue'}`, 'success');
  await saNavigate('companies');
}

async function deleteCompanySA(id) {
  saConfirm('Supprimer cette société et tous ses utilisateurs ?', async () => {
    const { error } = await SB.deleteCompany(id);
    if (error) { saToast('Erreur lors de la suppression : ' + error.message, 'danger'); return; }
    saToast('Société supprimée', 'success');
    await saNavigate('companies');
  });
}

async function editCompany(id) {
  const { data: co } = await SB.getCompany(id);
  if (!co) { saToast('Société introuvable', 'danger'); return; }
  saModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-building" style="margin-right:8px;color:#4f46e5"></i>Modifier la société</h3>
      <button class="modal-close" onclick="closeSaModal()"><i class="fas fa-times"></i></button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div class="form-group" style="grid-column:1/-1"><label class="form-label">Nom <span class="req">*</span></label><input id="ec-name" class="form-input" value="${co.name || ''}"/></div>
      <div class="form-group"><label class="form-label">Email</label><input id="ec-email" class="form-input" value="${co.email || ''}"/></div>
      <div class="form-group"><label class="form-label">Téléphone</label><input id="ec-phone" class="form-input" value="${co.phone || ''}"/></div>
      <div class="form-group"><label class="form-label">Ville</label><input id="ec-city" class="form-input" value="${co.city || ''}"/></div>
      <div class="form-group"><label class="form-label">Plan</label>
        <select id="ec-plan" class="form-select">
          <option value="basic" ${co.plan === 'basic' ? 'selected' : ''}>Basic</option>
          <option value="pro" ${co.plan === 'pro' ? 'selected' : ''}>Pro</option>
          <option value="business" ${co.plan === 'business' ? 'selected' : ''}>Business</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Statut</label>
        <select id="ec-status" class="form-select">
          <option value="active" ${co.status === 'active' ? 'selected' : ''}>Actif</option>
          <option value="suspended" ${co.status === 'suspended' ? 'selected' : ''}>Suspendu</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeSaModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveEditCompany('${co.id}')"><i class="fas fa-save"></i> Sauvegarder</button>
    </div>`, 'modal-lg');
}

async function saveEditCompany(id) {
  const updates = {
    name: document.getElementById('ec-name').value.trim(),
    email: document.getElementById('ec-email').value.trim(),
    phone: document.getElementById('ec-phone').value.trim(),
    city: document.getElementById('ec-city').value.trim(),
    plan: document.getElementById('ec-plan').value,
    status: document.getElementById('ec-status').value,
  };
  if (!updates.name) { saToast('Le nom est requis', 'danger'); return; }
  const { error } = await SB.updateCompany(id, updates);
  if (error) { saToast('Erreur : ' + error.message, 'danger'); return; }
  closeSaModal();
  saToast('Société mise à jour', 'success');
  await saNavigate('companies');
}

// ========== GESTION UTILISATEURS ==========
async function renderSAUsers(content) {
  const { data: users } = await SB.getAllUsers();
  const { data: companies } = await SB.getAllCompanies();
  const coMap = {};
  (companies || []).forEach(c => coMap[c.id] = c.name);

  content.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <div>
        <h2 style="font-size:22px;font-weight:800;color:var(--text-primary);margin-bottom:4px">
          <i class="fas fa-users" style="color:#4f46e5;margin-right:8px"></i>Tous les utilisateurs
        </h2>
        <p style="color:var(--text-secondary);font-size:13px">${(users || []).length} utilisateur(s)</p>
      </div>
    </div>
    <div style="background:var(--bg-card);border-radius:16px;border:1px solid var(--border);overflow:hidden">
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead style="background:var(--bg-main)">
            <tr>
              <th style="text-align:left;padding:12px 16px;font-size:12px;color:var(--text-secondary);font-weight:600">UTILISATEUR</th>
              <th style="text-align:left;padding:12px 16px;font-size:12px;color:var(--text-secondary);font-weight:600">SOCIÉTÉ</th>
              <th style="text-align:left;padding:12px 16px;font-size:12px;color:var(--text-secondary);font-weight:600">RÔLE</th>
              <th style="text-align:left;padding:12px 16px;font-size:12px;color:var(--text-secondary);font-weight:600">STATUT</th>
              <th style="text-align:center;padding:12px 16px;font-size:12px;color:var(--text-secondary);font-weight:600">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            ${(users || []).filter(u => u.role !== 'super_admin').map(u => `
              <tr style="border-top:1px solid var(--border)">
                <td style="padding:12px 16px">
                  <div style="font-weight:600;color:var(--text-primary)">${u.name}</div>
                  <div style="font-size:11px;color:var(--text-secondary)">${u.email}</div>
                </td>
                <td style="padding:12px 16px;font-size:13px;color:var(--text-secondary)">${coMap[u.company_id] || '–'}</td>
                <td style="padding:12px 16px">
                  <span class="badge ${u.role === 'admin' ? 'badge-info' : 'badge-secondary'}">${u.role === 'admin' ? 'Admin' : 'Utilisateur'}</span>
                </td>
                <td style="padding:12px 16px">${statusBadge(u.status || 'active')}</td>
                <td style="padding:12px 16px;text-align:center">
                  <button class="btn btn-sm btn-danger" onclick="deleteUserSA('${u.id}')" title="Supprimer">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>`).join('') || `<tr><td colspan="5" style="padding:40px;text-align:center;color:var(--text-secondary)">Aucun utilisateur</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;
}

async function deleteUserSA(id) {
  saConfirm('Supprimer cet utilisateur ?', async () => {
    const { error } = await SB.deleteProfile(id);
    if (error) { saToast('Erreur : ' + error.message, 'danger'); return; }
    saToast('Utilisateur supprimé', 'success');
    await saNavigate('users');
  });
}

// ========== CRÉER SOCIÉTÉ ==========
function renderCreateCompanyForm(content) {
  content.innerHTML = `
    <div style="max-width:680px">
      <div style="margin-bottom:24px">
        <h2 style="font-size:22px;font-weight:800;color:var(--text-primary);margin-bottom:4px">
          <i class="fas fa-plus-circle" style="color:#4f46e5;margin-right:8px"></i>Créer une nouvelle société
        </h2>
        <p style="color:var(--text-secondary);font-size:13px">Un compte admin sera automatiquement créé pour la société</p>
      </div>
      <div style="background:var(--bg-card);border-radius:16px;padding:24px;border:1px solid var(--border)">
        <h3 style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid var(--border)">
          <i class="fas fa-building" style="margin-right:6px;color:#4f46e5"></i>Informations société
        </h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px">
          <div class="form-group" style="grid-column:1/-1"><label class="form-label">Nom de la société <span class="req">*</span></label><input id="nc-name" class="form-input" placeholder="Ex: BTP Maroc SARL"/></div>
          <div class="form-group"><label class="form-label">Email</label><input id="nc-email" type="email" class="form-input" placeholder="contact@société.ma"/></div>
          <div class="form-group"><label class="form-label">Téléphone</label><input id="nc-phone" class="form-input" placeholder="0522..."/></div>
          <div class="form-group"><label class="form-label">Ville</label><input id="nc-city" class="form-input" placeholder="Casablanca"/></div>
          <div class="form-group"><label class="form-label">Plan</label>
            <select id="nc-plan" class="form-select">
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="business">Business</option>
            </select>
          </div>
        </div>
        <h3 style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid var(--border)">
          <i class="fas fa-user-shield" style="margin-right:6px;color:#2563eb"></i>Compte administrateur
        </h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div class="form-group" style="grid-column:1/-1"><label class="form-label">Nom de l'admin <span class="req">*</span></label><input id="nc-admin-name" class="form-input" placeholder="Prénom Nom"/></div>
          <div class="form-group"><label class="form-label">Email admin <span class="req">*</span></label><input id="nc-admin-email" type="email" class="form-input" placeholder="admin@société.ma"/></div>
          <div class="form-group"><label class="form-label">Mot de passe <span class="req">*</span></label><input id="nc-admin-pass" type="password" class="form-input" placeholder="Min. 6 caractères"/></div>
        </div>
        <div id="nc-error" style="display:none;color:#dc2626;font-size:13px;padding:10px;background:rgba(220,38,38,0.08);border-radius:8px;margin-top:12px;border-left:3px solid #dc2626"></div>
        <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end">
          <button class="btn btn-secondary" onclick="saNavigate('companies')">Annuler</button>
          <button class="btn btn-primary" onclick="createCompanySA()" id="nc-btn">
            <i class="fas fa-plus"></i> Créer la société
          </button>
        </div>
      </div>
    </div>`;
}

async function createCompanySA() {
  const name = document.getElementById('nc-name').value.trim();
  const email = document.getElementById('nc-email').value.trim();
  const phone = document.getElementById('nc-phone').value.trim();
  const city = document.getElementById('nc-city').value.trim();
  const plan = document.getElementById('nc-plan').value;
  const adminName = document.getElementById('nc-admin-name').value.trim();
  const adminEmail = document.getElementById('nc-admin-email').value.trim();
  const adminPass = document.getElementById('nc-admin-pass').value;
  const errEl = document.getElementById('nc-error');
  const btn = document.getElementById('nc-btn');

  errEl.style.display = 'none';
  if (!name || !adminName || !adminEmail || !adminPass) {
    errEl.textContent = 'Veuillez remplir tous les champs obligatoires.';
    errEl.style.display = 'block'; return;
  }
  if (adminPass.length < 6) {
    errEl.textContent = 'Le mot de passe doit contenir au moins 6 caractères.';
    errEl.style.display = 'block'; return;
  }

  btn.innerHTML = '<span class="loading-spinner"></span> Création en cours...';
  btn.disabled = true;

  try {
    // 1. Créer la société
    const { data: company, error: ce } = await SB.createCompany({ name, email, phone, city, plan, status: 'active' });
    if (ce) throw new Error('Erreur création société : ' + ce.message);

    // 2. Créer le compte auth admin
    const { data: authData, error: ae } = await SB.signUp(adminEmail, adminPass);
    if (ae) throw new Error('Erreur création compte : ' + ae.message);

    // 3. Créer le profil admin
    const { error: pe } = await SB.createProfile({
      id: authData.user.id,
      company_id: company.id,
      name: adminName,
      email: adminEmail,
      role: 'admin',
      status: 'active',
    });
    if (pe) throw new Error('Erreur création profil : ' + pe.message);

    saToast(`✅ Société "${name}" créée ! Admin : ${adminEmail}`, 'success');
    await saNavigate('companies');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
    btn.innerHTML = '<i class="fas fa-plus"></i> Créer la société';
    btn.disabled = false;
  }
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  setTheme(SA.theme);
  renderSA();
});
