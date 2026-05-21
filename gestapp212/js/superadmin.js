/* ============================================================
   GestionApp 212 — Super Admin Module
   100% connecté Supabase via Netlify Functions
   ============================================================ */

/**
 * Normalise une société Supabase (snake_case) → format local (bi-compatibilité)
 * Supabase : status, subscription_end, city
 * Local UI : statut, abonnement_fin, ville
 */
function normalizeCompany(c) {
  if (!c) return c;
  return {
    ...c,
    // Statut : accepte les deux formes
    statut:         c.statut         || c.status         || 'actif',
    status:         c.status         || c.statut         || 'actif',
    // Abonnement fin : accepte les deux formes
    abonnement_fin: c.abonnement_fin || c.subscription_end || c.abonnementFin || null,
    subscription_end: c.subscription_end || c.abonnement_fin || c.abonnementFin || null,
    abonnementFin:  c.abonnementFin  || c.subscription_end || c.abonnement_fin || null,
    // Dates début
    abonnement_debut: c.abonnement_debut || c.start_date || c.abonnementDebut || null,
    start_date:     c.start_date      || c.abonnement_debut || null,
    // Ville/City
    ville:          c.ville          || c.city            || null,
    city:           c.city           || c.ville           || null,
    // Plan (garder la casse originale)
    plan:           c.plan           || 'Starter',
    // ICE
    ice:            c.ice            || null,
    // Nom
    name:           c.name           || '(Sans nom)',
  };
}

/**
 * Normalise un profil utilisateur Supabase
 */
function normalizeProfile(p) {
  if (!p) return p;
  return {
    ...p,
    name:      p.name      || p.full_name || p.email || '?',
    full_name: p.full_name || p.name      || p.email || '?',
    role:      p.role      || 'lecture',
    is_active: p.is_active ?? true,
    company_id: p.company_id || p.companyId || null,
    companyId:  p.companyId  || p.company_id || null,
  };
}

async function renderSuperAdmin() {
  if (App.currentUser?.role !== 'superadmin') {
    document.getElementById('page-content').innerHTML = '<div class="alert alert-danger"><i class="fas fa-lock"></i> Accès refusé — Super Admin uniquement</div>';
    return;
  }

  showFullscreenLoader('Chargement données Super Admin...');

  try {
    // Recharger les données fraîches depuis Supabase
    const saData = await sbLoadSuperAdminData();
    // Normaliser les données Supabase → format local (bi-compatible)
    App.data.companies = (saData.companies || App.data.companies || []).map(normalizeCompany);
    App.data.profiles  = (saData.profiles  || []).map(normalizeProfile);
    App.data.auditLogs = saData.auditLogs || [];
  } catch (err) {
    console.warn('Supabase non disponible, utilisation données en mémoire:', err.message);
    // Normaliser même les données locales
    if (App.data.companies) App.data.companies = App.data.companies.map(normalizeCompany);
    if (!App.data.companies) App.data.companies = [];
  } finally {
    hideFullscreenLoader();
  }

  const companies = App.data.companies || [];
  const profiles  = App.data.profiles  || [];
  const totalUsers = profiles.filter(p => p.role !== 'superadmin').length;
  const activeCompanies = companies.filter(c => c.statut === 'actif').length;
  const expiringCompanies = companies.filter(c => {
    if (!c.abonnement_fin && !c.abonnementFin) return false;
    const exp = new Date(c.abonnement_fin || c.abonnementFin);
    return exp >= new Date() && (exp - new Date()) / 86400000 <= 30;
  });

  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-title" style="color:#c0392b">
        <i class="fas fa-crown" style="color:#f39c12"></i>
        <span>Super Admin — GestionApp 212</span>
        <span class="badge badge-info" style="font-size:12px;margin-left:8px">Supabase Connecté</span>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="showCreateCompanyModal()">
          <i class="fas fa-plus"></i> Nouvelle société
        </button>
        <button class="btn btn-accent btn-sm" onclick="refreshSuperAdminData()">
          <i class="fas fa-sync-alt"></i> Actualiser
        </button>
        <button class="btn btn-ghost btn-sm" onclick="exportBackup()">
          <i class="fas fa-download"></i> Backup
        </button>
      </div>
    </div>

    <!-- Alerte domaine non-Netlify : masquée si domaine custom valide -->

    <!-- KPIs -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#fef9e7;color:#f39c12"><i class="fas fa-building"></i></div>
        <div class="kpi-info">
          <div class="kpi-value">${companies.length}</div>
          <div class="kpi-label">Sociétés totales</div>
          <div class="kpi-trend" style="color:var(--success)"><i class="fas fa-check-circle"></i> ${activeCompanies} actives</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#d5f5e3;color:#27ae60"><i class="fas fa-users"></i></div>
        <div class="kpi-info">
          <div class="kpi-value">${totalUsers}</div>
          <div class="kpi-label">Utilisateurs actifs</div>
          <div class="kpi-trend" style="color:var(--info)"><i class="fas fa-user-shield"></i> Gérés via Supabase Auth</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:${expiringCompanies.length > 0 ? '#fdecea':'#d5f5e3'};color:${expiringCompanies.length > 0 ? '#e74c3c':'#27ae60'}">
          <i class="fas fa-calendar-times"></i>
        </div>
        <div class="kpi-info">
          <div class="kpi-value">${expiringCompanies.length}</div>
          <div class="kpi-label">Abonnements ≤ 30j</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#fdecea;color:#e74c3c"><i class="fas fa-ban"></i></div>
        <div class="kpi-info">
          <div class="kpi-value">${companies.filter(c=>c.statut==='bloque'||c.statut==='suspendu').length}</div>
          <div class="kpi-label">Sociétés bloquées/suspendues</div>
        </div>
      </div>
    </div>

    ${expiringCompanies.length > 0 ? `
    <div class="alert alert-warning mb-3">
      <i class="fas fa-exclamation-triangle"></i>
      <div><strong>Abonnements expirant bientôt (≤ 30 jours) :</strong>
        ${expiringCompanies.map(c=>`<br>• ${c.name} — expire le <strong>${formatDate(c.abonnement_fin||c.abonnementFin)}</strong>`).join('')}
      </div>
    </div>` : ''}

    <!-- Tableau sociétés -->
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-building"></i> Gestion des sociétés</h3>
        <div style="font-size:12px;color:var(--text-muted)">
          <i class="fas fa-database" style="color:#27ae60"></i> Données en temps réel — Supabase
        </div>
      </div>
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Société</th><th>ICE</th><th>Plan</th>
              <th>Utilisateurs</th><th>Abonnement</th>
              <th>Statut</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${companies.length === 0 ? '<tr><td colspan="7" class="text-center text-muted" style="padding:30px"><i class="fas fa-building" style="font-size:24px;opacity:.3"></i><br>Aucune société — Créez la première !</td></tr>' : ''}
            ${companies.map(c => {
              const coProfiles = profiles.filter(p => p.company_id === c.id);
              const adminProfile = coProfiles.find(p => p.role === 'admin');
              const expired = (c.abonnement_fin||c.abonnementFin) && new Date(c.abonnement_fin||c.abonnementFin) < new Date();
              const expiring = !expired && (c.abonnement_fin||c.abonnementFin) && (new Date(c.abonnement_fin||c.abonnementFin)-new Date())/86400000 <= 30;
              return `
              <tr>
                <td>
                  <strong>${c.name}</strong>
                  <br><small class="text-muted">${c.ville||''} ${c.email ? '· '+c.email : ''}</small>
                </td>
                <td><code style="font-size:11px">${c.ice||'—'}</code></td>
                <td>
                  <span class="badge ${c.plan==='Enterprise'?'badge-danger':c.plan==='Pro'?'badge-primary':'badge-secondary'}">${c.plan||'Starter'}</span>
                </td>
                <td>
                  <div style="font-size:13px">
                    <strong>${coProfiles.length}</strong> user(s)
                    ${adminProfile ? `<br><small class="text-muted"><i class="fas fa-user-shield"></i> ${adminProfile.email}</small>` : '<br><small class="text-muted text-danger">Pas d\'admin</small>'}
                  </div>
                </td>
                <td style="color:${expired?'var(--danger)':expiring?'var(--warning)':''}">
                  ${(c.abonnement_fin||c.abonnementFin) ? formatDate(c.abonnement_fin||c.abonnementFin) : '—'}
                  ${expired ? '<br><span class="badge badge-danger">Expiré</span>' : ''}
                  ${expiring ? '<br><span class="badge badge-warning">Expire bientôt</span>' : ''}
                </td>
                <td>${getStatusBadge(c.statut||'actif')}</td>
                <td>
                  <div style="display:flex;gap:3px;flex-wrap:wrap">
                    <button class="btn btn-ghost btn-xs" onclick="editCompany('${c.id}')" title="Modifier"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-success btn-xs" onclick="setCompanyStatus('${c.id}','activer')" title="Activer"><i class="fas fa-check"></i></button>
                    <button class="btn btn-warning btn-xs" onclick="setCompanyStatus('${c.id}','suspendre')" title="Suspendre"><i class="fas fa-pause"></i></button>
                    <button class="btn btn-danger btn-xs" onclick="setCompanyStatus('${c.id}','bloquer')" title="Bloquer"><i class="fas fa-ban"></i></button>
                    <button class="btn btn-accent btn-xs" onclick="showSACreateUserModal('${c.id}')" title="Ajouter utilisateur"><i class="fas fa-user-plus"></i></button>
                    <button class="btn btn-ghost btn-xs" onclick="showCompanyStats('${c.id}')" title="Statistiques"><i class="fas fa-chart-bar"></i></button>
                    <button class="btn btn-ghost btn-xs" onclick="showRenewModal('${c.id}')" title="Renouveler abonnement"><i class="fas fa-calendar-plus"></i></button>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Utilisateurs par société -->
    ${profiles.length > 0 ? `
    <div class="card mt-3">
      <div class="card-header"><h3><i class="fas fa-users"></i> Tous les utilisateurs</h3></div>
      <div class="table-responsive" style="max-height:350px;overflow-y:auto">
        <table class="table">
          <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Société</th><th>Statut</th></tr></thead>
          <tbody>
            ${profiles.filter(p=>p.role!=='superadmin').map(p => {
              const co = companies.find(c=>c.id===p.company_id);
              return `<tr>
                <td>${p.name||'—'}</td>
                <td><small>${p.email}</small></td>
                <td><span class="badge badge-info">${p.role}</span></td>
                <td><small>${co?.name||'—'}</small></td>
                <td>${p.is_active ? '<span class="badge badge-success">Actif</span>' : '<span class="badge badge-danger">Inactif</span>'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}

    <!-- Audit Log -->
    <div class="card mt-3">
      <div class="card-header"><h3><i class="fas fa-history"></i> Audit Log Global</h3></div>
      <div class="table-responsive" style="max-height:300px;overflow-y:auto">
        <table class="table">
          <thead><tr><th>Date</th><th>Société</th><th>Utilisateur</th><th>Action</th><th>Détail</th></tr></thead>
          <tbody>
            ${getAuditLog(50).map(l => `
              <tr>
                <td style="font-size:11px;white-space:nowrap">${l.created_at ? formatDate(l.created_at) : (l.date||'')}</td>
                <td style="font-size:12px">${(App.data.companies||[]).find(c=>c.id===l.company_id)?.name || l.company || '—'}</td>
                <td>${l.user_name || l.user || '—'}</td>
                <td><span class="badge badge-info">${l.action}</span></td>
                <td style="font-size:12px">${l.detail||''}</td>
              </tr>`
            ).join('')}
            ${getAuditLog(50).length===0 ? '<tr><td colspan="5" class="text-center text-muted" style="padding:20px">Aucun log</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Créer/Modifier Société -->
    <div id="create-company-modal" class="modal-overlay" style="display:none">
      <div class="modal-box modal-lg">
        <div class="modal-header">
          <h3><i class="fas fa-building"></i> <span id="co-modal-title">Nouvelle société</span></h3>
          <button onclick="closeModal('create-company-modal')" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="edit-co-id">
          <div class="alert alert-info" id="co-admin-section">
            <i class="fas fa-info-circle"></i>
            <div>Un compte admin sera créé automatiquement et l'email de connexion sera envoyé.</div>
          </div>
          <h4 style="margin-bottom:12px;color:var(--navy)"><i class="fas fa-building"></i> Informations société</h4>
          <div class="form-row">
            <div class="form-group"><label>Nom société *</label><input type="text" id="new-co-nom" class="form-control" placeholder="BTP Excellence SARL"></div>
            <div class="form-group"><label>ICE (15 chiffres)</label><input type="text" id="new-co-ice" class="form-control" maxlength="15" placeholder="001234567890123"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Ville</label><input type="text" id="new-co-ville" class="form-control" placeholder="Casablanca"></div>
            <div class="form-group"><label>Email société</label><input type="email" id="new-co-email" class="form-control" placeholder="contact@societe.ma"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Plan</label>
              <select id="new-co-plan" class="form-control">
                <option value="Starter">Starter — 5 users, modules de base</option>
                <option value="Pro">Pro — 15 users, tous les modules</option>
                <option value="Enterprise">Enterprise — Illimité + support dédié</option>
              </select>
            </div>
            <div class="form-group"><label>Durée abonnement</label>
              <select id="new-co-duree" class="form-control">
                <option value="1">1 mois (test)</option>
                <option value="6">6 mois</option>
                <option value="12" selected>12 mois (1 an)</option>
                <option value="24">24 mois (2 ans)</option>
              </select>
            </div>
          </div>

          <h4 style="margin:16px 0 12px;color:var(--navy)" id="admin-section-title"><i class="fas fa-user-shield"></i> Compte admin principal</h4>
          <div id="admin-fields">
            <div class="form-row">
              <div class="form-group"><label>Nom complet admin *</label><input type="text" id="new-admin-nom" class="form-control" placeholder="Mohammed Alami"></div>
              <div class="form-group"><label>Email admin *</label><input type="email" id="new-admin-email" class="form-control" placeholder="admin@societe.ma"></div>
            </div>
            <div class="form-group">
              <label>Mot de passe temporaire *</label>
              <div style="display:flex;gap:8px">
                <input type="text" id="new-admin-pw" class="form-control" value="${generatePassword()}">
                <button class="btn btn-ghost btn-sm" onclick="refreshAdminPw()" title="Générer nouveau mot de passe"><i class="fas fa-sync-alt"></i></button>
                <button class="btn btn-ghost btn-sm" onclick="copyAdminPw()" title="Copier"><i class="fas fa-copy"></i></button>
              </div>
              <small class="text-muted">Ce mot de passe sera partagé avec l'administrateur — il devra le changer à la première connexion</small>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button onclick="closeModal('create-company-modal')" class="btn btn-ghost">Annuler</button>
          <button onclick="saveCompany()" class="btn btn-primary" id="btn-save-company">
            <i class="fas fa-save"></i> <span id="btn-save-text">Créer société + Admin</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Ajouter Utilisateur -->
    <div id="create-user-modal" class="modal-overlay" style="display:none">
      <div class="modal-box" style="max-width:500px">
        <div class="modal-header">
          <h3><i class="fas fa-user-plus"></i> Ajouter un utilisateur</h3>
          <button onclick="closeModal('create-user-modal')" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="new-user-co-id">
          <div id="new-user-co-name" class="alert alert-info" style="margin-bottom:16px"></div>
          <div class="form-group"><label>Nom complet *</label><input type="text" id="new-user-nom" class="form-control"></div>
          <div class="form-group"><label>Email *</label><input type="email" id="new-user-email" class="form-control"></div>
          <div class="form-group"><label>Rôle</label>
            <select id="new-user-role" class="form-control">
              <option value="admin">Admin</option>
              <option value="manager" selected>Manager</option>
              <option value="commercial">Commercial</option>
              <option value="technicien">Technicien</option>
              <option value="lecture">Lecture seule</option>
            </select>
          </div>
          <div class="form-group"><label>Mot de passe temporaire *</label>
            <div style="display:flex;gap:8px">
              <input type="text" id="new-user-pw" class="form-control" value="${generatePassword()}">
              <button class="btn btn-ghost btn-sm" onclick="document.getElementById('new-user-pw').value=generatePassword()"><i class="fas fa-sync-alt"></i></button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button onclick="closeModal('create-user-modal')" class="btn btn-ghost">Annuler</button>
          <button onclick="createSAUser()" class="btn btn-primary"><i class="fas fa-user-plus"></i> Créer l'utilisateur</button>
        </div>
      </div>
    </div>

    <!-- Modal Renouveler abonnement -->
    <div id="renew-modal" class="modal-overlay" style="display:none">
      <div class="modal-box" style="max-width:420px">
        <div class="modal-header">
          <h3><i class="fas fa-calendar-plus"></i> Renouveler l'abonnement</h3>
          <button onclick="closeModal('renew-modal')" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="renew-co-id">
          <div id="renew-co-name" class="alert alert-info"></div>
          <div class="form-group"><label>Durée du renouvellement</label>
            <select id="renew-duree" class="form-control">
              <option value="1">1 mois</option>
              <option value="3">3 mois</option>
              <option value="6">6 mois</option>
              <option value="12" selected>12 mois (1 an)</option>
              <option value="24">24 mois (2 ans)</option>
            </select>
          </div>
          <div class="form-group"><label>Nouveau plan (optionnel)</label>
            <select id="renew-plan" class="form-control">
              <option value="">Garder le plan actuel</option>
              <option value="Starter">Starter</option>
              <option value="Pro">Pro</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button onclick="closeModal('renew-modal')" class="btn btn-ghost">Annuler</button>
          <button onclick="renewCompany()" class="btn btn-success"><i class="fas fa-check"></i> Renouveler</button>
        </div>
      </div>
    </div>
  `;
}

// ── HELPERS ────────────────────────────────────────────────
function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function refreshAdminPw() {
  document.getElementById('new-admin-pw').value = generatePassword();
}
function copyAdminPw() {
  const val = document.getElementById('new-admin-pw').value;
  navigator.clipboard?.writeText(val).then(() => showToast('Mot de passe copié !', 'info'));
}

async function refreshSuperAdminData() {
  await renderSuperAdmin();
  showToast('Données actualisées', 'success');
}

// ── CRÉER/MODIFIER SOCIÉTÉ ─────────────────────────────────
function showCreateCompanyModal(companyData = null) {
  const isEdit = !!companyData;
  document.getElementById('edit-co-id').value = companyData?.id || '';
  document.getElementById('co-modal-title').textContent = isEdit ? 'Modifier la société' : 'Nouvelle société';
  document.getElementById('btn-save-text').textContent = isEdit ? 'Enregistrer' : 'Créer société + Admin';
  document.getElementById('co-admin-section').style.display = isEdit ? 'none' : 'flex';
  document.getElementById('admin-fields').style.display = isEdit ? 'none' : 'block';
  document.getElementById('admin-section-title').style.display = isEdit ? 'none' : 'block';

  document.getElementById('new-co-nom').value   = companyData?.name || '';
  document.getElementById('new-co-ice').value   = companyData?.ice || '';
  document.getElementById('new-co-ville').value = companyData?.ville || '';
  document.getElementById('new-co-email').value = companyData?.email || '';
  document.getElementById('new-co-plan').value  = companyData?.plan || 'Starter';
  openModal('create-company-modal');
}

async function saveCompany() {
  const nom   = document.getElementById('new-co-nom').value.trim();
  const editId = document.getElementById('edit-co-id').value;

  if (!nom) { showToast('Nom de société requis', 'error'); return; }

  const companyData = {
    name:  nom,
    ice:   document.getElementById('new-co-ice').value.trim() || null,
    ville: document.getElementById('new-co-ville').value.trim() || null,
    email: document.getElementById('new-co-email').value.trim() || null,
    plan:  document.getElementById('new-co-plan').value,
  };

  const btn = document.getElementById('btn-save-company');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Traitement...';

  try {
    if (editId) {
      // ── MODIFIER ─────────────────────────────────────────
      const idx = App.data.companies?.findIndex(c => c.id === editId);
      if (idx > -1) Object.assign(App.data.companies[idx], companyData);

      if (!App.isDemoMode) {
        try {
          // Mapper les champs locaux → Supabase (snake_case)
          const sbData = {
            name:   companyData.name,
            ice:    companyData.ice,
            city:   companyData.ville,
            email:  companyData.email,
            plan:   companyData.plan,
          };
          await sbManageCompany('update', editId, sbData);
        } catch(e) {
          console.warn('sbManageCompany update:', e.message);
          // Pas bloquant : la modif locale est déjà appliquée
        }
      }
      showToast(`✅ Société "${nom}" modifiée !`, 'success');
      closeModal('create-company-modal');

    } else {
      // ── CRÉER NOUVELLE SOCIÉTÉ ────────────────────────────
      const adminNom   = document.getElementById('new-admin-nom').value.trim();
      const adminEmail = document.getElementById('new-admin-email').value.trim();
      const adminPw    = document.getElementById('new-admin-pw').value;
      const duree      = parseInt(document.getElementById('new-co-duree').value) || 12;

      if (!adminNom || !adminEmail || !adminPw) {
        showToast('Nom, email et mot de passe admin requis', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> <span id="btn-save-text">Créer société + Admin</span>';
        return;
      }

      // Calculer la date de fin
      const finDate = new Date();
      finDate.setMonth(finDate.getMonth() + duree);
      // Champs locaux (UI)
      companyData.abonnement_debut = today();
      companyData.abonnement_fin   = finDate.toISOString().split('T')[0];
      companyData.statut           = 'actif';
      // Champs Supabase (snake_case) – envoyés à la fonction Netlify
      companyData.start_date        = today();
      companyData.subscription_end  = finDate.toISOString().split('T')[0];
      companyData.status            = 'actif';
      companyData.city              = companyData.ville;

      let resultCompany = null;
      let resultAdmin   = null;

      // Detecter si les fonctions Netlify sont disponibles
      // ✅ Accepte : netlify.app, localhost, 127.0.0.1, digital-pro.live, gestapp.*
      const isOnNetlify = window.location.hostname.includes('netlify.app') ||
                          window.location.hostname === 'localhost' ||
                          window.location.hostname === '127.0.0.1' ||
                          window.location.hostname.includes('digital-pro.live') ||
                          window.location.hostname.includes('gestapp');

      if (!isOnNetlify) {
        showToast(
          `⚠️ Fonctions serveur indisponibles sur ce domaine (${window.location.hostname})`,
          'warning', 6000
        );
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> <span id="btn-save-text">Créer société + Admin</span>';
        return;
      }

      if (!App.isDemoMode) {
        // ── Mode production : essai Netlify Function, fallback Supabase direct ──
        let netlifyFailed = false;
        let netlifyFailReason = null;

        // TENTATIVE 1 : via Netlify Function (si les variables env sont présentes)
        try {
          btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Création en cours...';
          const result = await sbCreateCompany(companyData, {
            name: adminNom, email: adminEmail, password: adminPw
          });
          resultCompany = result.company;
          resultAdmin   = result.admin;
          if (resultCompany) resultCompany._savedToDb = true;
        } catch(e) {
          console.warn('[saveCompany] Netlify Function échouée:', e.message, 'code:', e.code, 'status:', e.status);
          netlifyFailed = true;
          netlifyFailReason = e;

          // ── Session expirée → ne pas continuer ─────────────────────
          if (e.code === 'NETLIFY_NO_AUTH') {
            showToast(
              `❌ Session expirée.<br><small>Rechargez la page (F5) et reconnectez-vous.</small>`,
              'error', 8000
            );
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> <span id="btn-save-text">Créer société + Admin</span>';
            return;
          }

          // ── Email déjà utilisé ──────────────────────────────────────
          if (e.status === 409) {
            showToast(`❌ L'email "${adminEmail}" est déjà utilisé dans Supabase.`, 'error', 8000);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> <span id="btn-save-text">Créer société + Admin</span>';
            return;
          }
        }

        // TENTATIVE 2 : si Netlify a échoué → créer la société directement via Supabase REST
        // (possible car on est connecté avec un token utilisateur superadmin)
        if (netlifyFailed && !resultCompany) {
          const isEnvMissing = netlifyFailReason?.code === 'ENV_MISSING' ||
            netlifyFailReason?.message?.includes('ENV_MISSING') ||
            netlifyFailReason?.message?.includes('manquantes') ||
            (netlifyFailReason?.status === 500 && (
              netlifyFailReason?.message?.includes('Variables') ||
              netlifyFailReason?.message?.includes('configuration')
            ));

          // ✅ IMPORTANT : "Failed to fetch" = fonctions Netlify non déployées
          // → on tente aussi le fallback Supabase direct dans ce cas
          const isNetworkError = netlifyFailReason?.message?.includes('Failed to fetch') ||
            netlifyFailReason?.message?.includes('fetch') ||
            netlifyFailReason?.name === 'TypeError' ||
            netlifyFailReason?.code === 'NETLIFY_NOT_FOUND';

          if (isEnvMissing || netlifyFailReason?.status === 500 || isNetworkError) {
            // Fallback : création directe via Supabase (RLS autorise le superadmin)
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Création via Supabase...';
            if (isNetworkError) {
              showToast('⚠️ Fonctions Netlify non déployées — création directe via Supabase...', 'warning', 4000);
            } else {
              showToast('⚠️ Variables Netlify manquantes — tentative de création directe en cours...', 'warning', 4000);
            }

            try {
              const sbResult = await _createCompanyDirectly(companyData, {
                name: adminNom, email: adminEmail, password: adminPw
              });
              resultCompany = sbResult.company;
              resultAdmin   = sbResult.admin;
              console.info('[saveCompany] Création directe Supabase réussie:', sbResult);
            } catch(sbErr) {
              console.error('[saveCompany] Fallback Supabase échoué:', sbErr.message);
              _showEnvMissingGuide();
              btn.disabled = false;
              btn.innerHTML = '<i class="fas fa-save"></i> <span id="btn-save-text">Créer société + Admin</span>';
              return;
            }
          } else {
            // Autre erreur Netlify non identifiée → fallback local
            showToast(`⚠️ Netlify indisponible : ${netlifyFailReason?.message}<br><small>Société créée localement uniquement.</small>`, 'warning', 8000);
          }
        }
      }

      // ── Fallback : créer localement si Netlify indisponible ou mode démo ──
      if (!resultCompany) {
        resultCompany = {
          ...companyData,
          id:   genId(),
          name: nom,
          created_at: today(),
          _savedToDb: false,
        };
        resultAdmin = { name: adminNom, email: adminEmail, role: 'admin', password: adminPw };

        if (App.isDemoMode) {
          showToast(`⚠️ Mode démo — société créée localement uniquement`, 'warning', 6000);
        }
      }

      // Normaliser + ajouter à la liste locale
      resultCompany = normalizeCompany(resultCompany);
      if (!App.data.companies) App.data.companies = [];
      App.data.companies.unshift(resultCompany);

      closeModal('create-company-modal');
      showToast(
        `✅ Société "${nom}" créée !<br>Admin: ${adminEmail}<br>Mot de passe: ${adminPw}`,
        'success', 10000
      );
      _showCreationSummary(resultCompany, resultAdmin);
    }

    await renderSuperAdmin();

  } catch (err) {
    console.error('Save company error:', err);
    showToast(`Erreur: ${err.message}`, 'error', 8000);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> <span id="btn-save-text">Créer société + Admin</span>';
  }
}

// ── CRÉATION DIRECTE VIA SUPABASE (fallback si Netlify ENV manquantes) ─────
// Crée la société en utilisant le token utilisateur connecté (pas de service_role)
// → nécessite que RLS autorise INSERT sur companies pour superadmin
async function _createCompanyDirectly(companyData, adminData) {
  const sb = getSupabase();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) throw new Error('Session Supabase expirée — reconnectez-vous');

  // 1. Créer la société
  const { data: company, error: coErr } = await sb.from('companies').insert({
    name:             companyData.name,
    plan:             companyData.plan             || 'Starter',
    status:           companyData.status           || 'actif',
    ice:              companyData.ice              || null,
    city:             companyData.city || companyData.ville || null,
    phone:            companyData.phone            || null,
    address:          companyData.address          || null,
    subscription_end: companyData.subscription_end || companyData.abonnement_fin || null,
    start_date:       companyData.start_date       || companyData.abonnement_debut || new Date().toISOString().split('T')[0],
    created_at:       new Date().toISOString(),
    updated_at:       new Date().toISOString(),
  }).select().single();

  if (coErr) {
    console.error('[_createCompanyDirectly] Insert company:', coErr);
    throw new Error('Création société Supabase : ' + (coErr.message || coErr.code || JSON.stringify(coErr)));
  }

  // 2. Créer le profil admin (sans créer un vrai compte Auth — nécessite service_role)
  // On crée uniquement le profil avec l'ID de la société, sans compte Auth
  // L'admin devra être créé manuellement via Supabase ou quand les env vars seront configurées
  const adminRecord = {
    email:      adminData.email,
    name:       adminData.name,
    full_name:  adminData.name,
    role:       'admin',
    company_id: company.id,
    is_active:  true,
    _needsAuthAccount: true,  // signal : pas de compte Auth créé
    _savedToDb: true,
  };

  // Tenter d'insérer le profil (peut échouer si pas d'ID Auth)
  // On utilise un UUID temporaire basé sur l'email pour le profil
  try {
    const tempId = 'pending-' + Date.now() + '-' + Math.random().toString(36).substr(2,8);
    const { error: profErr } = await sb.from('profiles').insert({
      id:         tempId,
      email:      adminData.email,
      full_name:  adminData.name,
      name:       adminData.name,
      role:       'admin',
      company_id: company.id,
      is_active:  false,  // inactif jusqu'à création compte Auth
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (!profErr) {
      adminRecord.id = tempId;
      adminRecord.is_active = false;
    }
  } catch(profErr) {
    console.warn('[_createCompanyDirectly] Profil non créé (normal sans service_role):', profErr);
  }

  return {
    company: { ...company, _savedToDb: true, _directCreate: true },
    admin:   { ...adminRecord, password: adminData.password, _needsNetlify: true },
  };
}

// ── GUIDE : Variables d'env Netlify manquantes ────────────────────────────
function _showEnvMissingGuide() {
  const ANON_KEY = typeof SUPABASE_ANON !== 'undefined' ? SUPABASE_ANON : '(voir supabase-client.js)';
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = 'display:flex;z-index:9999';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:600px;max-height:90vh;overflow-y:auto">
      <div class="modal-header" style="background:#fff3cd;border-bottom:1px solid #ffc107">
        <h3 style="color:#856404">
          <i class="fas fa-exclamation-triangle" style="color:#f6ad55"></i>
          Variables d'environnement Netlify manquantes
        </h3>
      </div>
      <div class="modal-body" style="font-size:14px">

        <div style="background:#fdecea;border:1px solid #f5c6cb;border-radius:8px;padding:12px 16px;margin-bottom:16px">
          <strong style="color:#c0392b">⚠️ Problème détecté</strong><br>
          Les fonctions Netlify n'ont pas accès aux clés Supabase.<br>
          <small>Erreur : <code>No API key found in request</code> ou <code>ENV_MISSING</code></small>
        </div>

        <p><strong>Pour résoudre le problème, suivez ces étapes :</strong></p>

        <div style="background:#f8f9fa;border-radius:8px;padding:14px;margin-bottom:12px">
          <p style="margin:0 0 8px;font-weight:600;color:#2c3e50">
            1️⃣ Ouvrez Netlify → Site settings → Environment variables
          </p>
          <a href="https://app.netlify.com/sites/helpful-rugelach-c0465d/settings/env"
             target="_blank"
             style="display:inline-block;background:#00ad9f;color:white;padding:6px 14px;border-radius:6px;text-decoration:none;font-size:13px">
            <i class="fas fa-external-link-alt"></i> Ouvrir Netlify env vars
          </a>
        </div>

        <div style="background:#f8f9fa;border-radius:8px;padding:14px;margin-bottom:12px">
          <p style="margin:0 0 10px;font-weight:600;color:#2c3e50">2️⃣ Ajoutez ces 4 variables</p>

          <div style="font-family:monospace;font-size:12px;background:#1a2332;color:#e2e8f0;border-radius:6px;padding:12px;line-height:1.8">
            <div><span style="color:#68d391">SUPABASE_URL</span> = <span style="color:#fbd38d">https://mfyhktnzjodaqfocupcn.supabase.co</span></div>
            <div style="margin-top:6px"><span style="color:#68d391">SUPABASE_ANON_KEY</span> = <span style="color:#fbd38d;font-size:10px;word-break:break-all">${ANON_KEY.substring(0,40)}...</span></div>
            <div style="margin-top:6px"><span style="color:#68d391">SUPABASE_SERVICE_ROLE_KEY</span> = <span style="color:#fc8181">[votre clé service_role dans Supabase API settings]</span></div>
            <div style="margin-top:6px"><span style="color:#68d391">SITE_URL</span> = <span style="color:#fbd38d">https://helpful-rugelach-c0465d.netlify.app</span></div>
          </div>

          <p style="margin:10px 0 0;font-size:12px;color:#718096">
            <i class="fas fa-info-circle"></i>
            La <code>SERVICE_ROLE_KEY</code> se trouve dans Supabase →
            <a href="https://supabase.com/dashboard/project/mfyhktnzjodaqfocupcn/settings/api"
               target="_blank" style="color:#3182ce">Project Settings → API</a>
            (section "Project API keys" → service_role)
          </p>
        </div>

        <div style="background:#f8f9fa;border-radius:8px;padding:14px;margin-bottom:12px">
          <p style="margin:0 0 8px;font-weight:600;color:#2c3e50">3️⃣ Redéployez le site</p>
          <p style="margin:0;font-size:13px;color:#718096">
            Après avoir ajouté les variables, allez dans
            <a href="https://app.netlify.com/sites/helpful-rugelach-c0465d/deploys"
               target="_blank" style="color:#3182ce">Netlify → Deploys</a>
            et cliquez <strong>"Trigger deploy → Deploy site"</strong><br>
            <em>OU</em> refaites un drag & drop de votre dossier.
          </p>
        </div>

        <div style="background:#e8f4fd;border:1px solid #bee3f8;border-radius:8px;padding:10px 14px;font-size:12px;color:#2c5282">
          <i class="fas fa-lightbulb"></i>
          <strong>Astuce :</strong> Ouvrez
          <a href="/diagnostic.html" target="_blank" style="color:#3182ce">diagnostic.html</a>
          après le redéploiement — les tests Netlify Functions doivent tous afficher ✅ OK.
        </div>
      </div>
      <div class="modal-footer">
        <button onclick="this.closest('.modal-overlay').remove()" class="btn btn-primary">
          <i class="fas fa-check"></i> Compris
        </button>
        <a href="https://app.netlify.com/sites/helpful-rugelach-c0465d/settings/env"
           target="_blank" class="btn btn-accent" style="text-decoration:none">
          <i class="fas fa-external-link-alt"></i> Ouvrir Netlify
        </a>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function _showCreationSummary(company, admin) {
  // Vérification : UUID Supabase (36 chars avec tirets) → sauvegardé en base
  const looksLikeUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(company.id || '');
  const savedInDB  = looksLikeUUID && !App.isDemoMode && company._savedToDb;
  const directMode = !!company._directCreate;  // créé sans compte Auth (fallback)
  const needsNetlify = !!admin._needsNetlify;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:520px">
      <div class="modal-header">
        <h3><i class="fas fa-check-circle" style="color:var(--success)"></i> Société créée !</h3>
      </div>
      <div class="modal-body">

        <!-- Indicateur base/local/direct -->
        ${savedInDB && !directMode
          ? `<div style="background:#f0fff4;border:1px solid #9ae6b4;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:#276749;display:flex;align-items:center;gap:8px">
               <i class="fas fa-database" style="color:#48bb78"></i>
               <span><strong>✅ Sauvegardée en base Supabase</strong> — compte admin actif, connexion immédiate possible</span>
             </div>`
          : savedInDB && directMode
          ? `<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:12px 14px;margin-bottom:14px;font-size:13px;color:#856404">
               <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                 <i class="fas fa-exclamation-triangle" style="color:#f6ad55"></i>
                 <strong>Société créée en base — compte Admin incomplet</strong>
               </div>
               <small>La société est bien dans Supabase, mais le compte utilisateur Auth n'a <strong>pas pu être créé</strong> (nécessite <code>SUPABASE_SERVICE_ROLE_KEY</code> dans Netlify).<br>
               <strong>Action requise :</strong> Configurez les variables Netlify, puis créez l'admin via le bouton "Créer utilisateur" de cette société.</small>
             </div>`
          : `<div style="background:#fdecea;border:1px solid #f5c6cb;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:#721c24;display:flex;align-items:center;gap:8px">
               <i class="fas fa-hdd" style="color:#e55353"></i>
               <span><strong>Sauvegardée localement uniquement</strong> — sera perdue si vous rechargez la page sans Netlify configuré</span>
             </div>`
        }

        <div class="alert alert-success" style="margin-bottom:12px">
          <i class="fas fa-building"></i>
          <div>
            <strong>${esc(company.name)}</strong> — Plan ${company.plan || 'Starter'}<br>
            Statut: <strong>Actif</strong>
            ${company.abonnement_fin || company.subscription_end
              ? `<br><small>Abonnement jusqu'au : ${formatDate(company.abonnement_fin || company.subscription_end)}</small>`
              : ''}
          </div>
        </div>

        <div class="alert alert-info" style="margin-bottom:12px">
          <i class="fas fa-user-shield"></i>
          <div>
            <strong>Compte administrateur :</strong><br>
            Email : <code style="background:#e8f4fd;padding:2px 6px;border-radius:4px">${esc(admin.email)}</code><br>
            Mot de passe : <code style="background:#f0f4f8;padding:2px 6px;border-radius:4px;font-weight:700;color:#1a2332">${esc(admin.password || admin.temp_password || '(voir formulaire)')}</code><br>
            <small style="color:#e53e3e;margin-top:4px;display:block">
              ⚠ Notez ces identifiants — ils ne seront plus affichés.<br>
              ${savedInDB && !directMode
                ? "✅ L'admin peut se connecter immédiatement."
                : needsNetlify
                ? "⚙️ Le compte Auth sera créé quand <code>SUPABASE_SERVICE_ROLE_KEY</code> sera configurée sur Netlify."
                : "L'admin pourra se connecter une fois Netlify configuré."}
            </small>
          </div>
        </div>

        ${savedInDB && !directMode
          ? `<p style="font-size:12px;color:#718096;text-align:center;margin-top:8px">
               Se connecter sur : <a href="${window.location.origin}/" target="_blank" style="color:#3182ce">${window.location.origin}/</a>
             </p>`
          : `<div style="background:#f0f4f8;border-radius:6px;padding:12px 14px;font-size:12px;color:#4a5568;margin-top:4px">
               <strong>🔧 Pour activer complètement les fonctions de création en base :</strong><br>
               <ol style="margin:8px 0 0 16px;line-height:2">
                 <li>Ajoutez sur Netlify : <code>SUPABASE_SERVICE_ROLE_KEY</code> et <code>SUPABASE_ANON_KEY</code></li>
                 <li>Redéployez le site (Netlify → Deploys → Trigger deploy)</li>
               </ol>
               <a href="/netlify-env-setup.html" target="_blank" style="color:#3182ce;font-size:11px;margin-top:6px;display:inline-block">
                 <i class="fas fa-external-link-alt"></i> Ouvrir le guide de configuration
               </a>
             </div>`
        }
      </div>
      <div class="modal-footer">
        <button onclick="this.closest('.modal-overlay').remove()" class="btn btn-primary">
          <i class="fas fa-check"></i> Compris
        </button>
        ${!savedInDB || directMode ? `
        <a href="/netlify-env-setup.html" target="_blank" class="btn btn-accent" style="text-decoration:none">
          <i class="fas fa-cog"></i> Configurer Netlify
        </a>` : ''}
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function editCompany(id) {
  const c = App.data.companies?.find(c => c.id === id);
  if (c) showCreateCompanyModal(c);
}

// ── STATUT SOCIÉTÉ ─────────────────────────────────────────
async function setCompanyStatus(id, action) {
  const c = App.data.companies?.find(c => c.id === id);
  if (!c) return;
  const messages = { activer:'activer', suspendre:'suspendre', bloquer:'bloquer' };
  // Mapper les actions UI → actions Netlify
  const actionMap = { activer: 'activate', suspendre: 'suspend', bloquer: 'suspend' };
  showConfirm(`Voulez-vous ${messages[action]} la société "${c.name}" ?`, async () => {
    try {
      const netlifyAction = actionMap[action] || action;
      const result = await sbManageCompany(netlifyAction, id);
      // Mettre à jour localement (snake_case ET camelCase)
      const idx = App.data.companies.findIndex(co=>co.id===id);
      const newStatus = result.company?.status || result.company?.statut ||
                        (action==='activer'?'actif':action==='suspendre'?'suspendu':'bloque');
      if (idx>-1) {
        App.data.companies[idx].statut = newStatus;
        App.data.companies[idx].status = newStatus;
      }
      await renderSuperAdmin();
      showToast(result.message || `Société ${action}e !`, action==='activer'?'success':'warning');
    } catch (err) {
      console.warn('setCompanyStatus fallback local:', err.message);
      // Fallback : mise à jour locale seulement
      const idx = App.data.companies.findIndex(co=>co.id===id);
      const newStatus = action==='activer'?'actif':action==='suspendre'?'suspendu':'bloque';
      if (idx>-1) { App.data.companies[idx].statut = newStatus; App.data.companies[idx].status = newStatus; }
      await renderSuperAdmin();
      showToast(`Société ${action}e (localement)`, 'warning');
    }
  }, action==='bloquer'?'danger':'warning');
}

// ── AJOUTER UTILISATEUR ────────────────────────────────────
function showSACreateUserModal(companyId) {
  const co = App.data.companies?.find(c=>c.id===companyId);
  document.getElementById('new-user-co-id').value = companyId;
  document.getElementById('new-user-co-name').innerHTML = `<i class="fas fa-building"></i> Société: <strong>${co?.name||companyId}</strong>`;
  document.getElementById('new-user-nom').value   = '';
  document.getElementById('new-user-email').value = '';
  document.getElementById('new-user-pw').value    = generatePassword();
  openModal('create-user-modal');
}

async function createSAUser() {
  const nom       = document.getElementById('new-user-nom').value.trim();
  const email     = document.getElementById('new-user-email').value.trim();
  const pw        = document.getElementById('new-user-pw').value;
  const role      = document.getElementById('new-user-role').value;
  const companyId = document.getElementById('new-user-co-id').value;

  if (!nom || !email || !pw) { showToast('Tous les champs requis', 'error'); return; }

  try {
    const result = await sbCreateUser({
      action: 'create',        // requis par la fonction Netlify
      name: nom,
      email,
      password: pw,
      role,
      company_id: companyId,
    });
    // Ajouter l'utilisateur dans les données locales
    if (!App.data.profiles) App.data.profiles = [];
    const newUser = result.user || { id: genId(), email, name: nom, full_name: nom, role, company_id: companyId, is_active: true };
    const existsIdx = App.data.profiles.findIndex(p => p.email === email);
    if (existsIdx > -1) App.data.profiles[existsIdx] = { ...App.data.profiles[existsIdx], ...newUser };
    else App.data.profiles.push(newUser);
    closeModal('create-user-modal');
    showToast(
      `✅ <strong>${role} "${nom}" créé dans Supabase !</strong><br>` +
      `📧 Email : ${email}<br>🔑 Mot de passe : <code>${pw}</code>`,
      'success', 10000
    );
    await renderSuperAdmin();
  } catch (err) {
    console.error('createSAUser error:', err.message);
    let msg = err.message || 'Erreur inconnue';
    if (msg.includes('déjà utilisé') || msg.includes('already')) {
      msg = `❌ L'email <strong>${email}</strong> est déjà utilisé dans Supabase.`;
    } else if (msg.includes('401') || msg.includes('authentifié') || msg.includes('Token')) {
      msg = '❌ Session expirée. Rechargez la page et reconnectez-vous.';
    } else if (msg.includes('403') || msg.includes('Accès refusé')) {
      msg = '❌ Accès refusé — vérifiez que votre compte est superadmin dans Supabase.';
    } else if (msg.includes('NETLIFY_NOT_FOUND') || msg.includes('404')) {
      msg = '❌ Fonctions Netlify non déployées. Publiez via l\'onglet Publish.';
    } else if (msg.includes('configuration') || msg.includes('500') || msg.includes('env')) {
      msg = '❌ Erreur serveur — vérifiez les variables SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY dans Netlify.';
    }
    showToast(msg, 'error', 8000);
  }
}

// ── RENOUVELER ABONNEMENT ──────────────────────────────────
function showRenewModal(companyId) {
  const co = App.data.companies?.find(c=>c.id===companyId);
  document.getElementById('renew-co-id').value = companyId;
  document.getElementById('renew-co-name').innerHTML = `<i class="fas fa-building"></i> <strong>${co?.name}</strong> — Abonnement actuel jusqu'au ${formatDate(co?.abonnement_fin||co?.abonnementFin)||'N/A'}`;
  openModal('renew-modal');
}

async function renewCompany() {
  const companyId = document.getElementById('renew-co-id').value;
  const mois      = parseInt(document.getElementById('renew-duree').value);
  const newPlan   = document.getElementById('renew-plan').value;

  try {
    const result = await sbManageCompany('renouveler', companyId, { mois, plan: newPlan || undefined });
    const idx = App.data.companies?.findIndex(c=>c.id===companyId);
    if (idx>-1) Object.assign(App.data.companies[idx], result.company);
    closeModal('renew-modal');
    showToast(result.message || `Abonnement renouvelé ${mois} mois !`, 'success');
    await renderSuperAdmin();
  } catch (err) {
    showToast(`Erreur: ${err.message}`, 'error');
  }
}

// ── EXPORT BACKUP ──────────────────────────────────────────
function exportBackup() {
  try {
    const backup = {
      version:   '3.9',
      date:      new Date().toISOString(),
      companies: App.data.companies || [],
      profiles:  App.data.profiles  || [],
      auditLogs: (App.data.auditLogs || []).slice(0, 100),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `gestionapp-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ Backup exporté', 'success', 3000);
  } catch(e) {
    showToast('Erreur export: ' + e.message, 'error');
  }
}

// ── STATS SOCIÉTÉ ──────────────────────────────────────────
async function showCompanyStats(companyId) {
  const co = App.data.companies?.find(c=>c.id===companyId);
  try {
    showFullscreenLoader('Chargement stats...');
    const coData = await sbLoadCompanyData(companyId);
    hideFullscreenLoader();

    const stats = {
      clients:  (coData.clients||[]).length,
      devis:    (coData.devis||[]).length,
      factures: (coData.factures||[]).length,
      chantiers:(coData.chantiers||[]).length,
      ca: (coData.factures||[]).filter(f=>f.statut==='paye').reduce((s,f)=>s+(f.total_ttc||f.totalTTC||0),0),
      impaye: (coData.factures||[]).filter(f=>f.statut==='impaye').reduce((s,f)=>s+(f.reste_a_payer||f.resteAPayer||0),0),
    };

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-box" style="max-width:500px">
        <div class="modal-header">
          <h3><i class="fas fa-chart-bar"></i> Stats — ${co?.name}</h3>
          <button onclick="this.closest('.modal-overlay').remove()" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
            <div class="kpi-card"><div class="kpi-icon" style="background:#dbeafe;color:#2563eb"><i class="fas fa-users"></i></div><div class="kpi-info"><div class="kpi-value">${stats.clients}</div><div class="kpi-label">Clients</div></div></div>
            <div class="kpi-card"><div class="kpi-icon" style="background:#d1fae5;color:#059669"><i class="fas fa-file-alt"></i></div><div class="kpi-info"><div class="kpi-value">${stats.devis}</div><div class="kpi-label">Devis</div></div></div>
            <div class="kpi-card"><div class="kpi-icon" style="background:#fef3c7;color:#d97706"><i class="fas fa-hard-hat"></i></div><div class="kpi-info"><div class="kpi-value">${stats.chantiers}</div><div class="kpi-label">Chantiers</div></div></div>
          </div>
          <div class="alert alert-success mt-3"><i class="fas fa-money-bill-wave"></i><div><strong>CA Encaissé:</strong> ${formatMAD(stats.ca)}</div></div>
          <div class="alert alert-warning"><i class="fas fa-exclamation-triangle"></i><div><strong>Impayés:</strong> ${formatMAD(stats.impaye)}</div></div>
        </div>
        <div class="modal-footer">
          <button onclick="this.closest('.modal-overlay').remove()" class="btn btn-primary">Fermer</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  } catch (err) {
    hideFullscreenLoader();
    showToast('Erreur chargement stats: ' + err.message, 'error');
  }
}
