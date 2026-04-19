// ===== SUPER ADMIN – BATIGEST PRO =====

// Cache des données pour éviter re-fetch constants
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
  setTimeout(() => t.style.opacity = '0', 4000);
  setTimeout(() => t.remove(), 4300);
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
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-exclamation-triangle" style="color:#d97706;margin-right:8px"></i>Confirmation</h3>
      <button class="modal-close" onclick="closeSaModal()"><i class="fas fa-times"></i></button>
    </div>
    <p style="color:var(--text-secondary);margin-bottom:24px;line-height:1.6">${msg}</p>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeSaModal()">Annuler</button>
      <button class="btn btn-danger" id="sa-confirm-ok"><i class="fas fa-trash"></i> Confirmer</button>
    </div>`);
  document.getElementById('sa-confirm-ok').addEventListener('click', () => {
    closeSaModal();
    onOk();
  });
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

  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('sb-') || key.startsWith('supabase.auth')) && key !== 'sb-sa-auth') {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));

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
    <div style="flex:1;overflow-y:auto;background:var(--bg-main)">
      <div style="padding:24px;max-width:1200px;margin:0 auto" id="sa-content">
        <div style="display:flex;align-items:center;justify-content:center;height:200px"><div class="loading-spinner"></div></div>
      </div>
    </div>
  </div>`;

  await saNavigate('dashboard');
}

async function saNavigate(page) {
  SA.page = page;
  document.querySelectorAll('.sa-nav-item').forEach(el => {
    el.style.background = 'transparent'; el.style.color = '#c7d2fe';
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
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:8px 12px;font-size:12px;color:var(--text-secondary)">SOCIÉTÉ</th>
            <th style="text-align:left;padding:8px 12px;font-size:12px;color:var(--text-secondary)">PLAN</th>
            <th style="text-align:left;padding:8px 12px;font-size:12px;color:var(--text-secondary)">STATUT</th>
            <th style="text-align:left;padding:8px 12px;font-size:12px;color:var(--text-secondary)">DATE</th>
          </tr>
        </thead>
        <tbody>
          ${companies.slice(0, 5).map(co => `
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:10px 12px;font-weight:600;color:var(--text-primary)">${_esc(co.name)}</td>
              <td style="padding:10px 12px">${planBadge(co.plan)}</td>
              <td style="padding:10px 12px">${statusBadge(co.status)}</td>
              <td style="padding:10px 12px;color:var(--text-secondary);font-size:12px">${fmtDate(co.created_at)}</td>
            </tr>`).join('') || `<tr><td colspan="4" style="padding:20px;text-align:center;color:var(--text-secondary)">Aucune société</td></tr>`}
        </tbody>
      </table>
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
  const map = { basic: ['#64748b', 'Basic'], pro: ['#2563eb', 'Pro'], business: ['#7c3aed', 'Business'], enterprise: ['#0891b2', 'Enterprise'] };
  const [color, label] = map[plan] || ['#64748b', plan || '–'];
  return `<span style="background:${color}22;color:${color};padding:3px 8px;border-radius:20px;font-size:11px;font-weight:600">${label}</span>`;
}

function statusBadge(status) {
  return (status === 'active' || !status)
    ? `<span style="background:#16a34a22;color:#16a34a;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:600"><i class="fas fa-check" style="margin-right:3px"></i>Actif</span>`
    : `<span style="background:#dc262622;color:#dc2626;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:600"><i class="fas fa-ban" style="margin-right:3px"></i>Suspendu</span>`;
}

// Échapper HTML pour éviter injection
function _esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ========== GESTION SOCIÉTÉS ==========
async function renderSACompanies(content) {
  const { data: companies } = await SB.getAllCompanies();
  SA.data.companies = companies || [];

  content.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="font-size:22px;font-weight:800;color:var(--text-primary);margin-bottom:4px">
          <i class="fas fa-building" style="color:#4f46e5;margin-right:8px"></i>Gestion des sociétés
        </h2>
        <p style="color:var(--text-secondary);font-size:13px">${(companies||[]).length} société(s)</p>
      </div>
      <button class="btn btn-primary" onclick="saNavigate('create-company')"><i class="fas fa-plus"></i> Nouvelle société</button>
    </div>
    <div style="background:var(--bg-card);border-radius:16px;border:1px solid var(--border);overflow:hidden">
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse" id="companies-table">
          <thead style="background:var(--bg-main)">
            <tr>
              <th style="text-align:left;padding:12px 16px;font-size:12px;color:var(--text-secondary)">SOCIÉTÉ</th>
              <th style="text-align:left;padding:12px 16px;font-size:12px;color:var(--text-secondary)">CONTACT</th>
              <th style="text-align:left;padding:12px 16px;font-size:12px;color:var(--text-secondary)">PLAN</th>
              <th style="text-align:left;padding:12px 16px;font-size:12px;color:var(--text-secondary)">STATUT</th>
              <th style="text-align:left;padding:12px 16px;font-size:12px;color:var(--text-secondary)">DATE</th>
              <th style="text-align:center;padding:12px 16px;font-size:12px;color:var(--text-secondary)">ACTIONS</th>
            </tr>
          </thead>
          <tbody id="companies-tbody">
            ${(companies||[]).length === 0 ? `<tr><td colspan="6" style="padding:40px;text-align:center;color:var(--text-secondary)"><i class="fas fa-building" style="font-size:32px;margin-bottom:12px;display:block;opacity:0.3"></i>Aucune société</td></tr>` : ''}
            ${(companies||[]).map(co => {
              const safeId = isValidUUID(co.id) ? co.id : '';
              return `
              <tr style="border-top:1px solid var(--border)">
                <td style="padding:12px 16px">
                  <div style="font-weight:700;color:var(--text-primary)">${_esc(co.name)}</div>
                  <div style="font-size:11px;color:var(--text-secondary)">${_esc(co.city||'')}</div>
                </td>
                <td style="padding:12px 16px">
                  <div style="font-size:13px">${_esc(co.email||'–')}</div>
                  <div style="font-size:11px;color:var(--text-secondary)">${_esc(co.phone||'')}</div>
                </td>
                <td style="padding:12px 16px">${planBadge(co.plan)}</td>
                <td style="padding:12px 16px">${statusBadge(co.status)}</td>
                <td style="padding:12px 16px;font-size:12px;color:var(--text-secondary)">${fmtDate(co.created_at)}</td>
                <td style="padding:12px 16px">
                  <div style="display:flex;gap:5px;justify-content:center;flex-wrap:wrap">
                    ${safeId ? `
                    <button class="btn btn-sm btn-secondary sa-edit-co" data-id="${safeId}" title="Modifier"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm ${co.status==='active'?'btn-warning':'btn-success'} sa-toggle-co" data-id="${safeId}" data-status="${_esc(co.status||'active')}" title="${co.status==='active'?'Suspendre':'Activer'}">
                      <i class="fas ${co.status==='active'?'fa-ban':'fa-check'}"></i>
                    </button>
                    <button class="btn btn-sm btn-info sa-link-user" data-id="${safeId}" data-name="${_esc(co.name)}" title="Ajouter utilisateur"><i class="fas fa-user-plus"></i></button>
                    <button class="btn btn-sm btn-danger sa-delete-co" data-id="${safeId}" data-name="${_esc(co.name)}" title="Supprimer"><i class="fas fa-trash"></i></button>
                    ` : `<span style="font-size:11px;color:#dc2626">ID invalide</span>`}
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  // Event delegation - pas d'inline onclick
  document.getElementById('companies-tbody').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (!isValidUUID(id)) { saToast('ID société invalide', 'danger'); return; }

    if (btn.classList.contains('sa-edit-co')) { await editCompany(id); }
    else if (btn.classList.contains('sa-toggle-co')) { await toggleCompanyStatus(id, btn.dataset.status); }
    else if (btn.classList.contains('sa-link-user')) { await linkUserToCompany(id, btn.dataset.name); }
    else if (btn.classList.contains('sa-delete-co')) { await deleteCompanySA(id, btn.dataset.name); }
  });
}

async function toggleCompanyStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
  const { error } = await SB.updateCompany(id, { status: newStatus });
  if (error) { saToast('Erreur : ' + error.message, 'danger'); return; }
  saToast(`Société ${newStatus === 'active' ? '✅ activée' : '🔒 suspendue'}`, newStatus === 'active' ? 'success' : 'warning');
  await saNavigate('companies');
}

async function deleteCompanySA(id, name) {
  saConfirm(`⚠️ Supprimer définitivement <strong>${_esc(name)}</strong> et TOUS ses utilisateurs ?<br/><span style="font-size:12px;color:#dc2626">Cette action est irréversible.</span>`, async () => {
    const btn = document.getElementById('sa-confirm-ok');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="loading-spinner"></span> Suppression...'; }

    // 1. Récupérer les profils pour supprimer leurs comptes Auth
    const { data: profiles } = await SB.getCompanyProfiles(id);
    const profileIds = (profiles || []).map(p => p.id).filter(isValidUUID);

    // 2. Supprimer les profils DB
    const { error: pe } = await SB.deleteProfilesByCompany(id);
    if (pe) { saToast('Erreur profils : ' + pe.message, 'danger'); return; }

    // 3. Supprimer les comptes Auth
    let authOk = 0, authFail = 0;
    for (const uid of profileIds) {
      const { error: ae } = await SB.adminDeleteUser(uid);
      if (ae) authFail++; else authOk++;
    }

    // 4. Supprimer la société
    const { error } = await SB.deleteCompany(id);
    if (error) { saToast('Erreur société : ' + error.message, 'danger'); return; }

    if (authFail > 0) {
      saToast(`Société supprimée. ⚠️ ${authOk} compte(s) Auth supprimés, ${authFail} échoué(s). Vérifiez Supabase → Auth → Users.`, 'warning');
    } else {
      saToast(`✅ Société et ${profileIds.length} utilisateur(s) supprimés définitivement`, 'success');
    }
    await saNavigate('companies');
  });
}

async function editCompany(id) {
  const { data: co } = await SB.getCompany(id);
  if (!co) { saToast('Société introuvable', 'danger'); return; }
  saModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-building" style="margin-right:8px;color:#4f46e5"></i>Modifier – ${_esc(co.name)}</h3>
      <button class="modal-close" onclick="closeSaModal()"><i class="fas fa-times"></i></button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div class="form-group" style="grid-column:1/-1"><label class="form-label">Nom <span class="req">*</span></label><input id="ec-name" class="form-input" value="${_esc(co.name||'')}"/></div>
      <div class="form-group"><label class="form-label">Email</label><input id="ec-email" class="form-input" value="${_esc(co.email||'')}"/></div>
      <div class="form-group"><label class="form-label">Téléphone</label><input id="ec-phone" class="form-input" value="${_esc(co.phone||'')}"/></div>
      <div class="form-group"><label class="form-label">Ville</label><input id="ec-city" class="form-input" value="${_esc(co.city||'')}"/></div>
      <div class="form-group"><label class="form-label">Plan</label>
        <select id="ec-plan" class="form-select">
          ${['basic','pro','business','enterprise'].map(p => `<option value="${p}" ${co.plan===p?'selected':''}>${p.charAt(0).toUpperCase()+p.slice(1)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Statut</label>
        <select id="ec-status" class="form-select">
          <option value="active" ${co.status==='active'?'selected':''}>✅ Actif</option>
          <option value="suspended" ${co.status==='suspended'?'selected':''}>🔒 Suspendu</option>
        </select>
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label">Date d'expiration abonnement</label>
        <input type="date" id="ec-expiry" class="form-input" value="${co.expires_at ? co.expires_at.split('T')[0] : ''}"/>
        <p style="font-size:11px;color:var(--text-secondary);margin-top:4px">Laisser vide = pas d'expiration</p>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeSaModal()">Annuler</button>
      <button class="btn btn-primary" id="ec-save-btn"><i class="fas fa-save"></i> Sauvegarder</button>
    </div>`, 'modal-lg');

  document.getElementById('ec-save-btn').addEventListener('click', async () => {
    const updates = {
      name: document.getElementById('ec-name').value.trim(),
      email: document.getElementById('ec-email').value.trim(),
      phone: document.getElementById('ec-phone').value.trim(),
      city: document.getElementById('ec-city').value.trim(),
      plan: document.getElementById('ec-plan').value,
      status: document.getElementById('ec-status').value,
      expires_at: document.getElementById('ec-expiry').value || null,
    };
    if (!updates.name) { saToast('Nom requis', 'danger'); return; }
    const btn = document.getElementById('ec-save-btn');
    btn.disabled = true; btn.innerHTML = '<span class="loading-spinner"></span>';
    const { error } = await SB.updateCompany(id, updates);
    if (error) { saToast('Erreur : ' + error.message, 'danger'); btn.disabled=false; btn.innerHTML='<i class="fas fa-save"></i> Sauvegarder'; return; }
    closeSaModal();
    saToast('✅ Société mise à jour', 'success');
    await saNavigate('companies');
  });
}

// ========== LIER UTILISATEUR À SOCIÉTÉ ==========
async function linkUserToCompany(companyId, companyName) {
  const { data: users } = await SB.getAllUsers();
  const unlinked = (users || []).filter(u => !u.company_id && u.role !== 'super_admin');

  saModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-user-plus" style="margin-right:8px;color:#2563eb"></i>Ajouter un utilisateur à ${_esc(companyName)}</h3>
      <button class="modal-close" onclick="closeSaModal()"><i class="fas fa-times"></i></button>
    </div>
    <p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px">Créer un nouveau compte admin ou lier un compte existant.</p>
    
    <!-- Création nouveau compte -->
    <div style="background:var(--bg-main);border-radius:10px;padding:16px;margin-bottom:16px;border:1px solid var(--border)">
      <div style="font-weight:700;font-size:13px;margin-bottom:12px;color:var(--text-primary)"><i class="fas fa-user-plus" style="margin-right:6px;color:#2563eb"></i>Créer un nouveau compte</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group" style="grid-column:1/-1"><label class="form-label">Nom <span class="req">*</span></label><input id="new-link-name" class="form-input" placeholder="Prénom Nom"/></div>
        <div class="form-group"><label class="form-label">Email <span class="req">*</span></label><input id="new-link-email" type="email" class="form-input" placeholder="admin@societe.ma"/></div>
        <div class="form-group"><label class="form-label">Mot de passe <span class="req">*</span></label><input id="new-link-pass" type="password" class="form-input" placeholder="Min 6 caractères"/></div>
        <div class="form-group"><label class="form-label">Rôle</label>
          <select id="new-link-role" class="form-select">
            <option value="admin">👑 Admin</option>
            <option value="user">👤 Utilisateur</option>
          </select>
        </div>
      </div>
      <div id="link-err" style="display:none;color:#dc2626;font-size:12px;margin-top:8px;padding:8px;background:rgba(220,38,38,0.08);border-radius:6px"></div>
      <button class="btn btn-primary btn-sm" id="do-create-link-btn" style="margin-top:10px"><i class="fas fa-plus"></i> Créer et lier</button>
    </div>

    ${unlinked.length > 0 ? `
    <!-- Lier compte existant -->
    <div style="background:var(--bg-main);border-radius:10px;padding:16px;border:1px solid var(--border)">
      <div style="font-weight:700;font-size:13px;margin-bottom:12px;color:var(--text-primary)"><i class="fas fa-link" style="margin-right:6px;color:#16a34a"></i>Lier un compte existant</div>
      <div class="form-group">
        <select id="link-user-select" class="form-select">
          <option value="">-- Sélectionner --</option>
          ${unlinked.map(u => `<option value="${u.id}">${_esc(u.name)} (${_esc(u.email)})</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-success btn-sm" id="do-link-btn" style="margin-top:8px"><i class="fas fa-link"></i> Lier cet utilisateur</button>
    </div>` : ''}
  `);

  document.getElementById('do-create-link-btn').addEventListener('click', async () => {
    await doCreateAndLink(companyId);
  });

  if (unlinked.length > 0) {
    document.getElementById('do-link-btn').addEventListener('click', async () => {
      await doLinkUser(companyId);
    });
  }
}

async function doLinkUser(companyId) {
  const userId = document.getElementById('link-user-select').value;
  if (!userId || !isValidUUID(userId)) { saToast('Sélectionnez un utilisateur valide', 'warning'); return; }
  const { error } = await SB.updateProfile(userId, { company_id: companyId, role: 'admin' });
  if (error) { saToast('Erreur : ' + error.message, 'danger'); return; }
  closeSaModal();
  saToast('✅ Utilisateur lié à la société !', 'success');
  await saNavigate('companies');
}

async function doCreateAndLink(companyId) {
  const name = document.getElementById('new-link-name')?.value?.trim();
  const email = document.getElementById('new-link-email')?.value?.trim();
  const pass = document.getElementById('new-link-pass')?.value;
  const role = document.getElementById('new-link-role')?.value || 'admin';
  const errEl = document.getElementById('link-err');
  errEl.style.display = 'none';

  if (!name || !email || !pass) { errEl.textContent = 'Tous les champs sont requis'; errEl.style.display = 'block'; return; }
  if (pass.length < 6) { errEl.textContent = 'Mot de passe trop court (min 6 car.)'; errEl.style.display = 'block'; return; }

  const btn = document.getElementById('do-create-link-btn');
  btn.disabled = true; btn.innerHTML = '<span class="loading-spinner"></span> Création...';

  let userId = null;
  let confirmedDirectly = false;

  // Essayer via API Admin (sans confirmation email)
  const { data: adminData, error: adminErr } = await SB.adminCreateUser(email, pass);
  if (!adminErr && adminData?.user?.id) {
    userId = adminData.user.id;
    confirmedDirectly = true;
  } else {
    // Fallback: signUp standard
    const { data: sd, error: se } = await SB.signUp(email, pass);
    if (se) { errEl.textContent = 'Erreur Auth : ' + se.message; errEl.style.display = 'block'; btn.disabled=false; btn.innerHTML='<i class="fas fa-plus"></i> Créer et lier'; return; }
    userId = sd?.user?.id;
  }

  if (!userId || !isValidUUID(userId)) {
    errEl.textContent = 'ID utilisateur non reçu de Supabase'; errEl.style.display = 'block';
    btn.disabled=false; btn.innerHTML='<i class="fas fa-plus"></i> Créer et lier'; return;
  }

  const { error: pe } = await SB.createProfile({ id: userId, company_id: companyId, name, email, role, status: 'active' });
  if (pe) { errEl.textContent = 'Erreur profil : ' + pe.message; errEl.style.display = 'block'; btn.disabled=false; btn.innerHTML='<i class="fas fa-plus"></i> Créer et lier'; return; }

  closeSaModal();
  saToast(confirmedDirectly
    ? `✅ ${name} créé et validé — peut se connecter immédiatement !`
    : `${name} créé. ⚠️ Confirmation email requise (configurez la service_role_key)`, confirmedDirectly ? 'success' : 'warning');
  await saNavigate('companies');
}

// ========== GESTION UTILISATEURS ==========
async function renderSAUsers(content) {
  const [{ data: users }, { data: companies }] = await Promise.all([SB.getAllUsers(), SB.getAllCompanies()]);
  SA.data.users = users || [];
  const coMap = {};
  (companies || []).forEach(c => coMap[c.id] = c.name);

  content.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="font-size:22px;font-weight:800;color:var(--text-primary);margin-bottom:4px">
          <i class="fas fa-users" style="color:#4f46e5;margin-right:8px"></i>Tous les utilisateurs
        </h2>
        <p style="color:var(--text-secondary);font-size:13px">${(users||[]).filter(u=>u.role!=='super_admin').length} utilisateur(s)</p>
      </div>
    </div>
    <div style="background:var(--bg-card);border-radius:16px;border:1px solid var(--border);overflow:hidden">
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead style="background:var(--bg-main)">
            <tr>
              <th style="text-align:left;padding:12px 16px;font-size:12px;color:var(--text-secondary)">UTILISATEUR</th>
              <th style="text-align:left;padding:12px 16px;font-size:12px;color:var(--text-secondary)">SOCIÉTÉ</th>
              <th style="text-align:left;padding:12px 16px;font-size:12px;color:var(--text-secondary)">RÔLE</th>
              <th style="text-align:left;padding:12px 16px;font-size:12px;color:var(--text-secondary)">STATUT</th>
              <th style="text-align:center;padding:12px 16px;font-size:12px;color:var(--text-secondary)">ACTIONS</th>
            </tr>
          </thead>
          <tbody id="users-tbody">
            ${(users||[]).filter(u => u.role !== 'super_admin').length === 0
              ? `<tr><td colspan="5" style="padding:40px;text-align:center;color:var(--text-secondary)">Aucun utilisateur</td></tr>` : ''}
            ${(users||[]).filter(u => u.role !== 'super_admin').map(u => {
              const initials = (u.name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
              const colors = ['#2563eb','#7c3aed','#16a34a','#d97706','#dc2626','#0891b2'];
              const col = colors[(u.name||'A').charCodeAt(0) % colors.length];
              const isSuspended = u.status === 'suspended';
              const safeId = isValidUUID(u.id) ? u.id : '';
              return `
              <tr style="border-top:1px solid var(--border)${isSuspended ? ';opacity:0.65' : ''}">
                <td style="padding:12px 16px">
                  <div style="display:flex;align-items:center;gap:10px">
                    <div style="width:36px;height:36px;border-radius:10px;background:${col}22;border:2px solid ${col}44;display:flex;align-items:center;justify-content:center;color:${col};font-weight:800;font-size:13px;flex-shrink:0">${_esc(initials)}</div>
                    <div>
                      <div style="font-weight:600;color:var(--text-primary)">${_esc(u.name||'–')}</div>
                      <div style="font-size:11px;color:var(--text-secondary)">${_esc(u.email||'–')}</div>
                    </div>
                  </div>
                </td>
                <td style="padding:12px 16px;font-size:13px">${coMap[u.company_id] ? _esc(coMap[u.company_id]) : '<span style="color:#dc2626;font-size:11px">Sans société</span>'}</td>
                <td style="padding:12px 16px">
                  <span class="badge ${u.role==='admin'?'badge-info':'badge-secondary'}">${u.role==='admin'?'👑 Admin':'👤 Utilisateur'}</span>
                </td>
                <td style="padding:12px 16px">
                  ${isSuspended
                    ? `<span style="background:#dc262622;color:#dc2626;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:600"><i class="fas fa-ban" style="margin-right:3px"></i>Suspendu</span>`
                    : `<span style="background:#16a34a22;color:#16a34a;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:600"><i class="fas fa-check" style="margin-right:3px"></i>Actif</span>`}
                </td>
                <td style="padding:12px 16px">
                  <div style="display:flex;gap:5px;justify-content:center">
                    ${safeId ? `
                    <button class="btn btn-sm btn-info sa-validate-user"
                      data-id="${safeId}" title="Valider le compte Auth (permet la connexion)"
                      style="padding:4px 8px;font-size:11px">
                      <i class="fas fa-check-double"></i> Valider
                    </button>
                    <button class="btn btn-sm ${isSuspended?'btn-success':'btn-warning'} sa-toggle-user" 
                      data-id="${safeId}" data-status="${isSuspended?'suspended':'active'}"
                      title="${isSuspended?'Activer':'Suspendre'}">
                      <i class="fas ${isSuspended?'fa-check':'fa-ban'}"></i>
                      ${isSuspended?'Activer':'Suspendre'}
                    </button>
                    <button class="btn btn-sm btn-danger sa-delete-user" data-id="${safeId}" data-name="${_esc(u.name||'')}" title="Supprimer">
                      <i class="fas fa-trash"></i>
                    </button>
                    ` : `<span style="font-size:10px;color:#dc2626">ID invalide</span>`}
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  // Event delegation
  document.getElementById('users-tbody').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (!isValidUUID(id)) { saToast('ID invalide', 'danger'); return; }
    if (btn.classList.contains('sa-validate-user')) { await validateUserAuth(id); }
    else if (btn.classList.contains('sa-toggle-user')) { await toggleUserStatusSA(id, btn.dataset.status); }
    else if (btn.classList.contains('sa-delete-user')) { await deleteUserSA(id, btn.dataset.name); }
  });
}

async function toggleUserStatusSA(userId, currentStatus) {
  const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
  const { error } = await SB.updateProfile(userId, { status: newStatus });
  if (error) { saToast('Erreur : ' + error.message, 'danger'); return; }
  saToast(newStatus === 'active' ? '✅ Utilisateur activé — peut se connecter' : '🔒 Utilisateur suspendu — accès bloqué', newStatus === 'active' ? 'success' : 'warning');
  await saNavigate('users');
}

async function validateUserAuth(userId) {
  saConfirm('Valider le compte Auth de cet utilisateur ? (confirme l\'email et permet la connexion)', async () => {
    const { error } = await SB.adminConfirmUser(userId);
    if (error) {
      saToast(`⚠️ Validation Auth échouée : ${error.message}. Configurez SUPABASE_SERVICE_KEY dans Cloudflare.`, 'warning');
    } else {
      saToast('✅ Compte Auth validé ! L\'utilisateur peut maintenant se connecter.', 'success');
    }
    await saNavigate('users');
  });
}

async function deleteUserSA(id, name) {
  saConfirm(`Supprimer définitivement <strong>${_esc(name)}</strong> ?<br/><span style="font-size:12px;color:var(--text-secondary)">Profil DB + compte Auth Supabase</span>`, async () => {
    // 1. Supprimer profil DB
    const { error: pe } = await SB.deleteProfile(id);
    if (pe) { saToast('Erreur profil : ' + pe.message, 'danger'); return; }

    // 2. Supprimer Auth via API Admin
    const { error: ae } = await SB.adminDeleteUser(id);
    if (ae) {
      saToast(`Profil supprimé. ⚠️ Auth non supprimé : ${ae.message}`, 'warning');
    } else {
      saToast('✅ Utilisateur supprimé définitivement', 'success');
    }
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
        <p style="color:var(--text-secondary);font-size:13px">Un compte admin sera automatiquement créé et validé</p>
      </div>
      <div style="background:var(--bg-card);border-radius:16px;padding:24px;border:1px solid var(--border)">
        <h3 style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid var(--border)">
          <i class="fas fa-building" style="margin-right:6px;color:#4f46e5"></i>Informations société
        </h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px">
          <div class="form-group" style="grid-column:1/-1"><label class="form-label">Nom <span class="req">*</span></label><input id="nc-name" class="form-input" placeholder="Ex: BTP Maroc SARL"/></div>
          <div class="form-group"><label class="form-label">Email</label><input id="nc-email" type="email" class="form-input" placeholder="contact@societe.ma"/></div>
          <div class="form-group"><label class="form-label">Téléphone</label><input id="nc-phone" class="form-input" placeholder="0522..."/></div>
          <div class="form-group"><label class="form-label">Ville</label><input id="nc-city" class="form-input" placeholder="Casablanca"/></div>
          <div class="form-group"><label class="form-label">Plan</label>
            <select id="nc-plan" class="form-select">
              <option value="basic">Basic (3 utilisateurs)</option>
              <option value="pro">Pro (5 utilisateurs)</option>
              <option value="business" selected>Business (10 utilisateurs)</option>
              <option value="enterprise">Enterprise (illimité)</option>
            </select>
          </div>
          <div class="form-group"><label class="form-label">Expiration abonnement</label>
            <input type="date" id="nc-expiry" class="form-input"/>
          </div>
        </div>
        <h3 style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid var(--border)">
          <i class="fas fa-user-shield" style="margin-right:6px;color:#2563eb"></i>Compte administrateur
        </h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div class="form-group" style="grid-column:1/-1"><label class="form-label">Nom de l'admin <span class="req">*</span></label><input id="nc-admin-name" class="form-input" placeholder="Prénom Nom"/></div>
          <div class="form-group"><label class="form-label">Email admin <span class="req">*</span></label><input id="nc-admin-email" type="email" class="form-input" placeholder="admin@societe.ma"/></div>
          <div class="form-group"><label class="form-label">Mot de passe <span class="req">*</span></label><input id="nc-admin-pass" type="password" class="form-input" placeholder="Min. 6 caractères"/></div>
        </div>
        <div id="nc-error" style="display:none;color:#dc2626;font-size:13px;padding:10px;background:rgba(220,38,38,0.08);border-radius:8px;margin-top:12px;border-left:3px solid #dc2626"></div>
        <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end">
          <button class="btn btn-secondary" onclick="saNavigate('companies')">Annuler</button>
          <button class="btn btn-primary" id="nc-btn"><i class="fas fa-plus"></i> Créer la société</button>
        </div>
      </div>
    </div>`;

  document.getElementById('nc-btn').addEventListener('click', createCompanySA);
}

async function createCompanySA() {
  const name = document.getElementById('nc-name').value.trim();
  const email = document.getElementById('nc-email').value.trim();
  const phone = document.getElementById('nc-phone').value.trim();
  const city = document.getElementById('nc-city').value.trim();
  const plan = document.getElementById('nc-plan').value;
  const expiry = document.getElementById('nc-expiry').value;
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
    const coData = { name, email, phone, city, plan, status: 'active' };
    if (expiry) coData.expires_at = expiry;
    const { data: company, error: ce } = await SB.createCompany(coData);
    if (ce) throw new Error('Erreur société : ' + ce.message);

    // 2. Créer le compte Auth (sans confirmation email via API Admin)
    let userId = null;
    let directConfirm = false;

    const { data: adminData, error: adminErr } = await SB.adminCreateUser(adminEmail, adminPass);
    if (!adminErr && adminData?.user?.id) {
      userId = adminData.user.id;
      directConfirm = true;
    } else {
      // Fallback: signUp standard
      const { data: signUpData, error: ae } = await SB.signUp(adminEmail, adminPass);
      if (ae) throw new Error('Erreur création compte : ' + ae.message);
      userId = signUpData?.user?.id;
    }

    if (!userId || !isValidUUID(userId)) throw new Error('ID utilisateur invalide reçu de Supabase');

    // 3. Créer le profil admin
    const { error: pe } = await SB.createProfile({
      id: userId,
      company_id: company.id,
      name: adminName,
      email: adminEmail,
      role: 'admin',
      status: 'active',
    });
    if (pe) throw new Error('Erreur profil : ' + pe.message);

    saToast(
      directConfirm
        ? `✅ Société "${name}" créée ! Admin ${adminEmail} peut se connecter immédiatement.`
        : `Société "${name}" créée. ⚠️ Admin doit confirmer son email.`,
      directConfirm ? 'success' : 'warning'
    );
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
