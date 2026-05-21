/* ============================================================
   PARAMETRES MODULE — v4.0 DEFINITIF
   Société, Utilisateurs, PDF, Backup, 2FA
   Corrections: création user, logo persistant, société Supabase
============================================================ */

// ── Switcher d'onglets dédié Paramètres ──────────────────────
function switchParamTab(event, tabId) {
  const wrapper = document.getElementById('param-tabs-wrapper');
  if (!wrapper) return;
  // Désactiver tous les boutons et contenus dans ce wrapper
  wrapper.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  wrapper.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  // Activer le bouton cliqué
  const btn = event.target.closest('.tab-btn') || event.target;
  btn.classList.add('active');
  // Activer le contenu cible
  const target = wrapper.querySelector('#' + tabId);
  if (target) target.classList.add('active');
}

// ── Génération de mot de passe fort ──────────────────────────
function generateStrongPassword(length = 12) {
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower   = 'abcdefghjkmnpqrstuvwxyz';
  const digits  = '23456789';
  const special = '@#$!%?&';
  const all     = upper + lower + digits + special;
  let pwd = '';
  pwd += upper [Math.floor(Math.random() * upper.length)];
  pwd += lower [Math.floor(Math.random() * lower.length)];
  pwd += digits[Math.floor(Math.random() * digits.length)];
  pwd += special[Math.floor(Math.random() * special.length)];
  for (let i = 4; i < length; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  return pwd.split('').sort(() => Math.random() - 0.5).join('');
}

function renderParametres() {
  // Restaurer les préférences PDF depuis localStorage si non chargées depuis Supabase
  if (!App.currentCompany) App.currentCompany = {};
  const pdfPrefsKey = 'ga_pdf_prefs_' + (App.currentCompany?.id || 'default');
  if (!App.currentCompany.pdfColor) {
    try {
      const stored = localStorage.getItem(pdfPrefsKey);
      if (stored) {
        const prefs = JSON.parse(stored);
        Object.assign(App.currentCompany, {
          pdfColor:    App.currentCompany.pdfColor    || prefs.pdfColor,
          pdfTemplate: App.currentCompany.pdfTemplate || prefs.pdfTemplate,
          pdfWatermark:App.currentCompany.pdfWatermark|| prefs.pdfWatermark,
          pdfFooter:   App.currentCompany.pdfFooter   || prefs.pdfFooter,
          pdf_color:   App.currentCompany.pdfColor    || prefs.pdfColor,
          pdf_template:App.currentCompany.pdfTemplate || prefs.pdfTemplate,
        });
      }
    } catch(e) {}
  }

  const co = App.currentCompany || {};
  const content = document.getElementById('page-content');

  const companyUsers = (App.data.profiles || []).filter(p =>
    p.company_id === (App.currentUser?.companyId || App.currentUser?.company_id) ||
    p.companyId  === (App.currentUser?.companyId || App.currentUser?.company_id)
  );

  content.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fas fa-cog"></i> Paramètres</div>
    </div>

    <div id="param-tabs-wrapper">
    <div class="tabs">
      <button class="tab-btn active" onclick="switchParamTab(event,'param-societe')"><i class="fas fa-building"></i> Société</button>
      ${canDo('edit','parametres') ? `<button class="tab-btn" onclick="switchParamTab(event,'param-users');_refreshUsersList()"><i class="fas fa-users"></i> Utilisateurs</button>` : ''}
      <button class="tab-btn" onclick="switchParamTab(event,'param-pdf')"><i class="fas fa-file-pdf"></i> Templates PDF</button>
      <button class="tab-btn" onclick="switchParamTab(event,'param-securite')"><i class="fas fa-shield-alt"></i> Sécurité</button>
      <button class="tab-btn" onclick="switchParamTab(event,'param-backup')"><i class="fas fa-database"></i> Sauvegarde</button>
      <button class="tab-btn" onclick="switchParamTab(event,'param-audit')"><i class="fas fa-history"></i> Audit Log</button>
    </div>

    <!-- SOCIÉTÉ -->
    <div id="param-societe" class="tab-content active">
      <div class="card">
        <div class="card-header"><h3><i class="fas fa-building"></i> Informations société</h3></div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label>Logo</label>
              <div style="display:flex;align-items:center;gap:12px">
                <div id="logo-preview" style="width:80px;height:80px;border:2px dashed var(--border);border-radius:12px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#f8f9fa">
                  ${co.logo ? `<img src="${co.logo}" style="width:100%;height:100%;object-fit:cover" id="logo-img-preview">` : '<i class="fas fa-image" style="font-size:24px;color:var(--text-muted)" id="logo-icon-placeholder"></i>'}
                </div>
                <div>
                  <input type="file" id="logo-file" accept="image/*" style="display:none" onchange="handleLogoUpload(event)">
                  <button class="btn btn-ghost btn-sm" onclick="document.getElementById('logo-file').click()"><i class="fas fa-upload"></i> Télécharger logo</button>
                  ${co.logo ? `<button class="btn btn-ghost btn-sm text-danger" onclick="removeLogo()" style="margin-left:6px"><i class="fas fa-trash"></i> Supprimer</button>` : ''}
                </div>
              </div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Nom de la société *</label><input type="text" id="co-nom" class="form-control" value="${co.name || ''}"></div>
            <div class="form-group"><label>ICE (15 chiffres)</label><input type="text" id="co-ice" class="form-control" value="${co.ice || ''}" maxlength="15" oninput="this.value=this.value.replace(/\\D/g,'')"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>RC</label><input type="text" id="co-rc" class="form-control" value="${co.rc || ''}"></div>
            <div class="form-group"><label>Identifiant Fiscal</label><input type="text" id="co-if" class="form-control" value="${co.identifiant_fiscal || co.identifiantFiscal || ''}"></div>
            <div class="form-group"><label>Patente</label><input type="text" id="co-patente" class="form-control" value="${co.patente || ''}"></div>
            <div class="form-group"><label>CNSS</label><input type="text" id="co-cnss" class="form-control" value="${co.cnss || ''}"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Adresse</label><input type="text" id="co-adresse" class="form-control" value="${co.adresse || co.address || ''}"></div>
            <div class="form-group"><label>Ville</label><input type="text" id="co-ville" class="form-control" value="${co.ville || co.city || ''}"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Téléphone</label><input type="tel" id="co-tel" class="form-control" value="${co.telephone || co.phone || ''}"></div>
            <div class="form-group"><label>Email</label><input type="email" id="co-email" class="form-control" value="${co.email || ''}"></div>
          </div>
          <div class="form-group"><label>RIB Bancaire</label><input type="text" id="co-rib" class="form-control" value="${co.rib || ''}" placeholder="IBAN ou RIB pour les factures"></div>
          <button onclick="saveSociete()" class="btn btn-primary" id="btn-save-societe"><i class="fas fa-save"></i> Enregistrer</button>
        </div>
      </div>
    </div>

    <!-- UTILISATEURS -->
    <div id="param-users" class="tab-content">
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-users"></i> Gestion des utilisateurs</h3>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${!App.isDemoMode ? `
            <button class="btn btn-ghost btn-sm" onclick="testNetlifyFunction()" id="btn-test-netlify" title="Vérifier la connexion serveur">
              <i class="fas fa-plug"></i> Tester connexion
            </button>` : ''}
            <button class="btn btn-primary" onclick="showCreateUserModal()">
              <i class="fas fa-user-plus"></i> Créer un utilisateur
            </button>
          </div>
        </div>
        ${App.isDemoMode ? `<div style="display:flex;align-items:center;gap:8px;padding:10px 16px;background:#fff3cd;color:#856404;border-bottom:1px solid #ffeeba;font-size:13px"><i class="fas fa-info-circle"></i> Mode démo — les utilisateurs créés sont sauvegardés localement uniquement.</div>` : ''}
        <div id="users-status-msg" style="display:none;padding:10px 16px;font-size:13px;border-radius:4px;margin:8px 16px"></div>
        <div class="table-responsive">
          <table class="table" id="users-table">
            <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody id="users-tbody">
              <tr><td colspan="5" class="text-center" style="padding:20px"><i class="fas fa-spinner fa-spin"></i> Chargement...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- PDF TEMPLATES -->
    <div id="param-pdf" class="tab-content">
      <div class="card">
        <div class="card-header"><h3><i class="fas fa-file-pdf"></i> Personnalisation des documents PDF</h3></div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label>Couleur principale</label>
              <div style="display:flex;align-items:center;gap:10px">
                <input type="color" id="pdf-color" class="form-control" style="width:60px;height:40px;padding:2px" value="${co.pdfColor || co.pdf_color || '#1e3a5f'}" onchange="updatePDFPreview()">
                <span id="pdf-color-hex">${co.pdfColor || co.pdf_color || '#1e3a5f'}</span>
              </div>
            </div>
            <div class="form-group">
              <label>Template</label>
              <select id="pdf-template" class="form-control" onchange="updatePDFPreview()">
                <option value="classique" ${(co.pdfTemplate||co.pdf_template) === 'classique' ? 'selected' : ''}>Classique</option>
                <option value="moderne" ${(co.pdfTemplate||co.pdf_template) === 'moderne' ? 'selected' : ''}>Moderne</option>
                <option value="minimaliste" ${(co.pdfTemplate||co.pdf_template) === 'minimaliste' ? 'selected' : ''}>Minimaliste</option>
                <option value="elegant" ${(co.pdfTemplate||co.pdf_template) === 'elegant' ? 'selected' : ''}>Élégant</option>
                <option value="btp" ${(co.pdfTemplate||co.pdf_template) === 'btp' ? 'selected' : ''}>BTP Pro</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Filigrane (texte)</label>
            <input type="text" id="pdf-watermark" class="form-control" value="${co.pdfWatermark || co.pdf_watermark || ''}" placeholder="Ex: CONFIDENTIEL, BROUILLON" oninput="updatePDFPreview()">
          </div>
          <div class="form-group">
            <label>Texte de pied de page</label>
            <textarea id="pdf-footer" class="form-control" rows="2" placeholder="RIB, conditions générales..." oninput="updatePDFPreview()">${co.pdfFooter || co.pdf_footer || ''}</textarea>
          </div>
          <div class="mb-3">
            <label style="font-weight:600;margin-bottom:10px;display:block"><i class="fas fa-eye"></i> Prévisualisation live</label>
            <div id="pdf-preview" style="border:1px solid var(--border);border-radius:12px;overflow:hidden;background:white">${renderPDFPreview(co)}</div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button onclick="savePDFSettings()" class="btn btn-primary"><i class="fas fa-save"></i> Enregistrer les paramètres PDF</button>
            <button onclick="testPDFPreview()" class="btn btn-ghost"><i class="fas fa-eye"></i> Voir un PDF exemple</button>
          </div>
        </div>
      </div>
    </div>

    <!-- SÉCURITÉ / 2FA -->
    <div id="param-securite" class="tab-content">
      <div class="card">
        <div class="card-header"><h3><i class="fas fa-shield-alt"></i> Sécurité du compte</h3></div>
        <div class="card-body">
          <div class="form-group">
            <label><i class="fas fa-lock"></i> Changer le mot de passe</label>
            <input type="password" id="pw-new" class="form-control mb-2" placeholder="Nouveau mot de passe (min 8 caractères)">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <input type="password" id="pw-confirm" class="form-control" placeholder="Confirmer le nouveau mot de passe">
              <button type="button" class="btn btn-ghost btn-sm" onclick="togglePwVisibility('pw-new','pw-confirm')" title="Afficher/Masquer"><i class="fas fa-eye"></i></button>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
              <button class="btn btn-ghost btn-sm" onclick="fillGeneratedPassword()"><i class="fas fa-magic"></i> Générer un mot de passe fort</button>
              <button class="btn btn-primary" onclick="changePassword()"><i class="fas fa-key"></i> Changer le mot de passe</button>
            </div>
            <div id="pw-strength" style="margin-top:8px;font-size:12px"></div>
          </div>
          <hr>
          <div class="form-group">
            <label><i class="fas fa-mobile-alt"></i> Authentification à deux facteurs (2FA)</label>
            <p class="text-muted" style="font-size:13px;margin-bottom:12px">La 2FA envoie un code de vérification à chaque connexion.</p>
            <div style="display:flex;align-items:center;gap:12px">
              <label class="switch-label">
                <input type="checkbox" id="twofa-toggle" ${App.currentUser?.twofa ? 'checked' : ''} onchange="toggle2FA(this.checked)">
                <span>Activer la 2FA</span>
              </label>
              <span id="twofa-status" class="badge ${App.currentUser?.twofa ? 'badge-success' : 'badge-secondary'}">${App.currentUser?.twofa ? 'Activée' : 'Désactivée'}</span>
            </div>
          </div>
          <hr>
          <div>
            <label><i class="fas fa-globe"></i> Interface</label>
            <div style="display:flex;gap:10px;margin-top:8px">
              <button class="btn ${App.lang === 'fr' ? 'btn-primary' : 'btn-ghost'}" onclick="setLangAndReload('fr')">🇫🇷 Français</button>
              <button class="btn ${App.lang === 'ar' ? 'btn-primary' : 'btn-ghost'}" onclick="setLangAndReload('ar')">🇲🇦 العربية</button>
              <button class="btn ${App.darkMode ? 'btn-primary' : 'btn-ghost'}" onclick="toggleDarkMode()"><i class="fas fa-moon"></i> Mode sombre</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SAUVEGARDE -->
    <div id="param-backup" class="tab-content">
      <div class="card">
        <div class="card-header"><h3><i class="fas fa-database"></i> Sauvegarde & Restauration</h3></div>
        <div class="card-body">
          <div class="alert alert-info"><i class="fas fa-info-circle"></i> Exportez vos données en JSON pour les sauvegarder ou les transférer.</div>
          <div class="form-group">
            <label>Modules à inclure dans la sauvegarde</label>
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px">
              ${['clients','devis','factures','chantiers','stock','fournisseurs','garanties','taches'].map(m => `
                <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
                  <input type="checkbox" class="backup-module" value="${m}" checked> ${t(m)}
                </label>
              `).join('')}
            </div>
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px">
            <button onclick="exportBackupFull()" class="btn btn-primary"><i class="fas fa-download"></i> Exporter sauvegarde complète</button>
            <button onclick="exportBackupSelected()" class="btn btn-accent"><i class="fas fa-download"></i> Exporter sélection</button>
            <div>
              <input type="file" id="restore-file" accept=".json" style="display:none" onchange="importBackup(event)">
              <button onclick="document.getElementById('restore-file').click()" class="btn btn-warning"><i class="fas fa-upload"></i> Restaurer depuis fichier</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- AUDIT LOG -->
    <div id="param-audit" class="tab-content">
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-history"></i> Audit Log</h3>
          <button class="btn btn-ghost btn-sm" onclick="exportAuditLog()"><i class="fas fa-download"></i> Exporter</button>
        </div>
        <div class="table-responsive" style="max-height:500px;overflow-y:auto">
          <table class="table">
            <thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Détail</th><th>Société</th></tr></thead>
            <tbody>
              ${getAuditLog(100).map(log => `
                <tr>
                  <td style="white-space:nowrap;font-size:12px">${log.date}</td>
                  <td>${log.user}</td>
                  <td><span class="badge badge-info">${log.action}</span></td>
                  <td style="font-size:12px">${log.detail}</td>
                  <td style="font-size:11px;color:var(--text-muted)">${log.company}</td>
                </tr>
              `).join('')}
              ${getAuditLog(100).length === 0 ? '<tr><td colspan="5" class="text-center text-muted" style="padding:20px">Aucune entrée</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    </div><!-- /#param-tabs-wrapper -->

    <!-- ── Modal Créer Utilisateur ── -->
    <div id="create-user-modal" class="modal-overlay" style="display:none">
      <div class="modal-box" style="max-width:560px">
        <div class="modal-header">
          <h3><i class="fas fa-user-plus"></i> Créer un utilisateur</h3>
          <button onclick="closeModal('create-user-modal')" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div id="create-user-alert" style="display:none;padding:12px 14px;border-radius:8px;margin-bottom:14px;font-size:13px;line-height:1.5"></div>
          <div class="form-group">
            <label>Nom complet *</label>
            <input type="text" id="new-user-nom" class="form-control" placeholder="Ex: Ahmed Benali" autocomplete="off">
          </div>
          <div class="form-group">
            <label>Email *</label>
            <input type="email" id="new-user-email" class="form-control" placeholder="ahmed@votresociete.ma" autocomplete="off">
          </div>
          <div class="form-group">
            <label>Rôle *</label>
            <select id="new-user-role" class="form-control">
              <option value="manager">Manager — Gestion complète (sans admin)</option>
              <option value="commercial">Commercial — Clients, Devis, Factures</option>
              <option value="technicien">Technicien — Chantiers, Stock, Tâches</option>
              <option value="lecture">Lecture seule — Consultation uniquement</option>
              <option value="admin">Admin — Accès complet</option>
            </select>
          </div>
          <div class="form-group">
            <label>Mot de passe *</label>
            <div style="display:flex;gap:8px;align-items:center">
              <input type="text" id="new-user-password" class="form-control"
                placeholder="Min. 6 caractères" style="font-family:monospace;letter-spacing:1px"
                autocomplete="new-password">
              <button type="button" class="btn btn-accent btn-sm" onclick="generateAndFillPassword()" title="Générer automatiquement">
                <i class="fas fa-magic"></i>
              </button>
              <button type="button" class="btn btn-ghost btn-sm" onclick="copyPassword()" title="Copier le mot de passe">
                <i class="fas fa-copy"></i>
              </button>
            </div>
            <div id="new-user-pw-info" style="font-size:12px;margin-top:6px;color:var(--text-muted)">
              Minimum 6 caractères. Cliquez sur <i class="fas fa-magic"></i> pour générer automatiquement.
            </div>
          </div>
          <div style="background:var(--bg-alt,#f8f9fa);border-radius:8px;padding:12px;font-size:12px;border:1px solid var(--border)">
            <i class="fas fa-info-circle" style="color:var(--accent)"></i>
            <strong>Information :</strong> L'utilisateur pourra se connecter avec cet email et ce mot de passe.
            Il peut changer son mot de passe dans <em>Paramètres → Sécurité</em>.
            La confirmation email est automatique (pas de vérification requise).
          </div>
        </div>
        <div class="modal-footer">
          <button onclick="closeModal('create-user-modal')" class="btn btn-ghost" id="create-user-cancel-btn">Annuler</button>
          <button onclick="createUser()" class="btn btn-primary" id="create-user-btn">
            <i class="fas fa-user-plus"></i> Créer l'utilisateur
          </button>
        </div>
      </div>
    </div>

    <!-- ── Modal Modifier Utilisateur ── -->
    <div id="edit-user-modal" class="modal-overlay" style="display:none">
      <div class="modal-box" style="max-width:520px">
        <div class="modal-header">
          <h3><i class="fas fa-user-edit"></i> Modifier l'utilisateur</h3>
          <button onclick="closeModal('edit-user-modal')" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="edit-user-id">
          <div class="form-group"><label>Nom complet *</label><input type="text" id="edit-user-nom" class="form-control"></div>
          <div class="form-group"><label>Email</label><input type="email" id="edit-user-email" class="form-control" readonly style="opacity:.6"></div>
          <div class="form-group"><label>Rôle</label>
            <select id="edit-user-role" class="form-control">
              <option value="admin">Admin — Accès complet</option>
              <option value="manager">Manager — Gestion complète</option>
              <option value="commercial">Commercial</option>
              <option value="technicien">Technicien</option>
              <option value="lecture">Lecture seule</option>
            </select>
          </div>
          <div class="form-group">
            <label>Nouveau mot de passe (optionnel)</label>
            <div style="display:flex;gap:8px;align-items:center">
              <input type="text" id="edit-user-password" class="form-control" placeholder="Laisser vide pour ne pas changer" style="font-family:monospace">
              <button type="button" class="btn btn-ghost btn-sm" onclick="generateAndFillEditPassword()" title="Générer"><i class="fas fa-magic"></i></button>
              <button type="button" class="btn btn-ghost btn-sm" onclick="copyEditPassword()" title="Copier"><i class="fas fa-copy"></i></button>
            </div>
          </div>
          <div class="form-group">
            <label>Statut</label>
            <select id="edit-user-actif" class="form-control">
              <option value="true">✅ Actif</option>
              <option value="false">🚫 Désactivé</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button onclick="closeModal('edit-user-modal')" class="btn btn-ghost">Annuler</button>
          <button onclick="updateUser()" class="btn btn-primary" id="edit-user-btn"><i class="fas fa-save"></i> Enregistrer</button>
        </div>
      </div>
    </div>
  `;

  const pwNew = document.getElementById('pw-new');
  if (pwNew) pwNew.addEventListener('input', checkPwStrength);

  // Charger les utilisateurs depuis Supabase après le rendu du DOM
  setTimeout(() => _loadAndRenderUsers(), 50);
}

// ── Chargement utilisateurs depuis Supabase ───────────────────
async function _loadAndRenderUsers() {
  const cid   = App.currentUser?.companyId || App.currentUser?.company_id;
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;

  // Afficher d'abord ce qu'on a en mémoire (données du login)
  const cached = (App.data.profiles || []).filter(p =>
    p.company_id === cid || p.companyId === cid
  );
  if (cached.length > 0) {
    tbody.innerHTML = renderUsersRows(cached);
  }

  // Recharger depuis Supabase si pas en mode démo
  if (!App.isDemoMode && cid) {
    try {
      // Requête directe via Supabase SDK (plus fiable que sbGetAll + filters)
      const { data: fresh, error } = await getSupabase()
        .from('profiles')
        .select('*')
        .eq('company_id', cid)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (fresh && fresh.length > 0) {
        // Fusionner avec les données en mémoire
        App.data.profiles = App.data.profiles || [];
        fresh.forEach(p => {
          const idx = App.data.profiles.findIndex(x => x.id === p.id);
          if (idx > -1) App.data.profiles[idx] = { ...App.data.profiles[idx], ...p };
          else App.data.profiles.push(p);
        });
        tbody.innerHTML = renderUsersRows(fresh);
      } else if (cached.length === 0) {
        tbody.innerHTML = renderUsersRows([]);
      }
    } catch(e) {
      console.warn('[Paramètres] Chargement utilisateurs:', e.message);
      // En cas d'erreur RLS, essayer avec les données en cache de finalizeLogin
      const allProfiles = App.data.profiles || [];
      const forCompany  = allProfiles.filter(p => p.company_id === cid || p.companyId === cid);
      if (forCompany.length > 0) {
        tbody.innerHTML = renderUsersRows(forCompany);
      } else if (cached.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:20px">
          <i class="fas fa-exclamation-triangle" style="color:var(--warning)"></i>
          Impossible de charger les utilisateurs. <a href="#" onclick="_loadAndRenderUsers();return false">Réessayer</a>
        </td></tr>`;
      }
    }
  } else if (App.isDemoMode) {
    // Mode démo : afficher les profils en mémoire
    const demoProfiles = (App.data.profiles || []).filter(p =>
      p.company_id === cid || p.companyId === cid
    );
    tbody.innerHTML = renderUsersRows(demoProfiles);
  }
}

// ── Rendu lignes utilisateurs ──────────────────────────────────
function renderUsersRows(users) {
  if (!users || users.length === 0) {
    return `<tr><td colspan="5" class="text-center text-muted" style="padding:20px">
      Aucun utilisateur. Cliquez sur "Créer un utilisateur" pour en ajouter.
    </td></tr>`;
  }
  return users.map(u => {
    const isMe = u.id === (App.currentUser?.id || App.currentUser?.userId);
    const nom  = u.full_name || u.name || u.email || '—';
    const role = u.role || 'utilisateur';
    const actif= u.is_active !== false && u.actif !== false;
    return `<tr>
      <td><strong>${nom}</strong></td>
      <td style="font-size:12px">${u.email || '—'}</td>
      <td><span class="badge badge-primary">${role}</span></td>
      <td><span class="badge ${actif ? 'badge-success' : 'badge-secondary'}">${actif ? '✅ Actif' : '🚫 Désactivé'}</span></td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-ghost btn-xs" onclick="editUserModal('${u.id}','${encodeURIComponent(nom)}','${u.email||''}','${role}','${actif}')">
            <i class="fas fa-edit"></i>
          </button>
          ${!isMe ? `<button class="btn btn-ghost btn-xs text-danger" onclick="toggleUserStatus('${u.id}','${!actif}')" title="${actif ? 'Désactiver' : 'Activer'}">
            <i class="fas fa-${actif ? 'ban' : 'check-circle'}"></i>
          </button>` : '<span style="font-size:11px;color:var(--text-muted)">(vous)</span>'}
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ── Rafraîchir la liste des utilisateurs ─────────────────────
function _refreshUsersList() {
  // Déléguer à _loadAndRenderUsers qui gère mode démo + Supabase
  if (typeof _loadAndRenderUsers === 'function') {
    _loadAndRenderUsers();
  } else {
    // Fallback direct
    const cid   = App.currentUser?.companyId || App.currentUser?.company_id;
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;
    const list = (App.data.profiles || []).filter(p =>
      p.company_id === cid || p.companyId === cid
    );
    tbody.innerHTML = renderUsersRows(list);
  }
}

// ── Afficher message dans l'onglet Users ─────────────────────
function _setUsersMsg(html, type = 'error') {
  const el = document.getElementById('users-status-msg');
  if (!el) return;
  const colors = {
    error:   { bg:'#f8d7da', color:'#721c24', border:'#f5c6cb' },
    success: { bg:'#d4edda', color:'#155724', border:'#c3e6cb' },
    warning: { bg:'#fff3cd', color:'#856404', border:'#ffeeba' },
    info:    { bg:'#d1ecf1', color:'#0c5460', border:'#bee5eb' },
  };
  const c = colors[type] || colors.info;
  el.style.cssText = `display:block;padding:10px 16px;font-size:13px;background:${c.bg};color:${c.color};border:1px solid ${c.border};border-radius:6px;margin:8px 16px`;
  el.innerHTML = html;
}

// ── Test connexion Netlify ────────────────────────────────────
async function testNetlifyFunction() {
  const btn = document.getElementById('btn-test-netlify');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Test...'; }
  _setUsersMsg('⏳ Test de connexion en cours...', 'info');
  try {
    const res = await callNetlifyFunction('create-user', { action: 'test' });
    _setUsersMsg(`✅ Connexion OK — <strong>${res.caller_email}</strong> (rôle: ${res.caller_role}) | company_id: ${res.company_id || '—'}`, 'success');
    showToast('Connexion serveur opérationnelle !', 'success');
  } catch(e) {
    _setUsersMsg(`❌ Erreur : ${e.message}<br><small>Vérifiez les variables d'env Netlify: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY</small>`, 'error');
    showToast('Erreur connexion: ' + e.message, 'error', 8000);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plug"></i> Tester connexion'; }
  }
}

// ── Alerte dans le modal création ────────────────────────────
function _showCreateUserAlert(msg, type = 'error') {
  const el = document.getElementById('create-user-alert');
  if (!el) return;
  const colors = {
    error:   { bg:'#f8d7da', color:'#721c24', border:'#f5c6cb' },
    success: { bg:'#d4edda', color:'#155724', border:'#c3e6cb' },
    warning: { bg:'#fff3cd', color:'#856404', border:'#ffeeba' },
  };
  const c = colors[type] || colors.error;
  el.style.cssText = `display:block;padding:12px 14px;border-radius:8px;margin-bottom:14px;font-size:13px;line-height:1.5;background:${c.bg};color:${c.color};border:1px solid ${c.border}`;
  el.innerHTML = msg;
}

// ── Modal création utilisateur ────────────────────────────────
function showCreateUserModal() {
  document.getElementById('new-user-nom').value      = '';
  document.getElementById('new-user-email').value    = '';
  document.getElementById('new-user-role').value     = 'manager';
  document.getElementById('new-user-password').value = '';
  document.getElementById('new-user-pw-info').innerHTML =
    'Minimum 6 caractères. Cliquez sur <i class="fas fa-magic"></i> pour générer automatiquement.';

  const alertEl = document.getElementById('create-user-alert');
  if (alertEl) { alertEl.style.display = 'none'; alertEl.innerHTML = ''; }

  const btn = document.getElementById('create-user-btn');
  if (btn) { btn.style.display = ''; btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus"></i> Créer l\'utilisateur'; }

  const cancelBtn = document.getElementById('create-user-cancel-btn');
  if (cancelBtn) cancelBtn.textContent = 'Annuler';

  openModal('create-user-modal');
}

function generateAndFillPassword() {
  const pwd = generateStrongPassword(12);
  document.getElementById('new-user-password').value = pwd;
  document.getElementById('new-user-pw-info').innerHTML =
    `<span style="color:var(--success)"><i class="fas fa-check-circle"></i> Mot de passe généré :</span>
     <strong style="font-family:monospace;background:var(--bg,#f5f5f5);padding:2px 8px;border-radius:4px;margin:0 6px;font-size:13px">${pwd}</strong>
     <button type="button" class="btn btn-ghost btn-xs" onclick="copyPassword()" style="margin-top:4px"><i class="fas fa-copy"></i> Copier</button>`;
}

function copyPassword() {
  const pwd = document.getElementById('new-user-password').value;
  if (!pwd) { showToast('Entrez ou générez d\'abord un mot de passe', 'warning'); return; }
  if (navigator.clipboard) {
    navigator.clipboard.writeText(pwd).then(() => showToast('✅ Mot de passe copié !', 'success'));
  } else {
    const el = document.getElementById('new-user-password');
    el.select(); document.execCommand('copy');
    showToast('Mot de passe copié !', 'success');
  }
}

// ── CRÉATION UTILISATEUR — VERSION DEFINITIVE ────────────────
async function createUser() {
  const nom   = (document.getElementById('new-user-nom').value || '').trim();
  const email = (document.getElementById('new-user-email').value || '').trim().toLowerCase();
  const role  = document.getElementById('new-user-role').value;
  const pwd   = (document.getElementById('new-user-password').value || '');

  // Validations
  if (!nom)  { _showCreateUserAlert('⚠️ Le nom complet est requis.'); return; }
  if (!email){ _showCreateUserAlert('⚠️ L\'email est requis.'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    _showCreateUserAlert('⚠️ Format email invalide (ex: nom@domaine.com)'); return;
  }
  if (!pwd)  { _showCreateUserAlert('⚠️ Le mot de passe est requis.'); return; }
  if (pwd.length < 6) { _showCreateUserAlert('⚠️ Mot de passe trop court (minimum 6 caractères).'); return; }

  const btn = document.getElementById('create-user-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Création en cours...'; }

  const cid = App.currentUser?.companyId || App.currentUser?.company_id;

  if (App.isDemoMode) {
    // Mode démo : créer localement sans Supabase
    const fakeUser = {
      id: genId(), full_name: nom, name: nom, email, role,
      company_id: cid, companyId: cid, is_active: true, actif: true,
    };
    if (!App.data.profiles) App.data.profiles = [];
    App.data.profiles.push(fakeUser);
    addAuditLog('Utilisateurs', `Créé (démo): ${email} (${role})`);
    _showCreateUserAlert(
      `✅ <strong>Utilisateur ajouté en mode démo</strong><br>
      <small style="color:#856404">Les données ne sont pas sauvegardées en base de données (mode démo).</small>`,
      'warning'
    );
    _refreshUsersList();
    const cancelBtn = document.getElementById('create-user-cancel-btn');
    if (cancelBtn) cancelBtn.textContent = '✔ Fermer';
    if (btn) btn.style.display = 'none';
    return;
  }

  // Mode production : appel Netlify
  try {
    _showCreateUserAlert('⏳ Création du compte en cours...', 'warning');

    // Vérifier la session d'abord
    let session = null;
    try {
      session = await sbGetSession();
    } catch(se) {
      console.warn('[createUser] getSession error:', se.message);
    }

    if (!session) {
      _showCreateUserAlert(
        '❌ <strong>Session expirée.</strong> Veuillez <a href="#" onclick="logout();return false;" style="color:inherit;font-weight:bold">vous reconnecter</a> puis réessayer.',
        'error'
      );
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus"></i> Créer l\'utilisateur'; }
      return;
    }

    // Appel à la fonction Netlify
    let res;
    try {
      res = await callNetlifyFunction('create-user', {
        action:     'create',
        name:       nom,
        email,
        password:   pwd,
        role,
        company_id: cid,
      });
    } catch (netlifyErr) {
      console.error('[createUser] Netlify error:', netlifyErr.message);
      let msg = netlifyErr.message || 'Erreur inconnue';

      if (msg.includes('already registered') || msg.includes('already been registered') || msg.toLowerCase().includes('already exists')) {
        msg = `❌ L'email <strong>${email}</strong> est déjà utilisé par un autre compte.`;
      } else if (msg.includes('401') || msg.includes('Non authentifié') || msg.includes('Token')) {
        msg = '❌ Session expirée. <a href="#" onclick="logout();return false;" style="font-weight:bold">Reconnectez-vous</a> et réessayez.';
      } else if (msg.includes('403') || msg.includes('Accès refusé') || msg.includes('autorisé')) {
        msg = `❌ Accès refusé. Votre rôle (<strong>${App.currentUser?.role || '?'}</strong>) ne permet pas de créer des utilisateurs. Rôle <strong>admin</strong> requis.`;
      } else if (msg.includes('Configuration serveur') || msg.includes('variables d\'environnement') || msg.includes('500')) {
        msg = `❌ Erreur de configuration serveur.<br>
          <small>Vérifiez les variables d'environnement Netlify :<br>
          • SUPABASE_URL<br>
          • SUPABASE_ANON_KEY<br>
          • SUPABASE_SERVICE_ROLE_KEY</small>`;
      } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('Failed to fetch')) {
        msg = '❌ Erreur réseau. Vérifiez votre connexion internet et que le site est bien déployé.';
      } else if (msg.includes('404') || msg.includes('not found') || msg.includes('Function')) {
        msg = '❌ Fonction Netlify introuvable. Redéployez le site sur Netlify.';
      } else {
        msg = `❌ Erreur: ${msg}`;
      }
      _showCreateUserAlert(msg, 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus"></i> Créer l\'utilisateur'; }
      return;
    }

    // Succès — construire le profil local
    const newProfile = {
      id:         res.user?.id || res.profile?.id || genId(),
      email,
      name:       nom,
      full_name:  nom,
      role,
      company_id: cid,
      companyId:  cid,
      is_active:  true,
    };
    // Enrichir avec les données retournées
    if (res.profile) Object.assign(newProfile, res.profile);

    if (!App.data.profiles) App.data.profiles = [];
    const existsIdx = App.data.profiles.findIndex(p => p.email === email);
    if (existsIdx > -1) App.data.profiles[existsIdx] = { ...App.data.profiles[existsIdx], ...newProfile };
    else App.data.profiles.push(newProfile);

    addAuditLog('Utilisateurs', `Créé: ${email} (${role})`);

    // Afficher les credentials dans le modal
    _showCreateUserAlert(
      `✅ <strong>Compte créé avec succès !</strong><br>
      <div style="margin-top:8px;padding:10px;background:white;border-radius:6px;border:1px solid #c3e6cb;font-family:monospace">
        <div style="margin-bottom:4px">👤 <strong>Nom :</strong> ${nom}</div>
        <div style="margin-bottom:4px">📧 <strong>Email :</strong> ${email}</div>
        <div style="margin-bottom:4px">🔑 <strong>Mot de passe :</strong> 
          <span style="background:#f8f9fa;padding:2px 8px;border-radius:4px">${pwd}</span>
          <button class="btn btn-ghost btn-xs" onclick="if(navigator.clipboard)navigator.clipboard.writeText('${pwd}').then(()=>showToast('Copié !','success'));else{showToast('${pwd}','info',10000)}" style="margin-left:6px">
            <i class="fas fa-copy"></i>
          </button>
        </div>
        <div>🎭 <strong>Rôle :</strong> ${role}</div>
      </div>
      <div style="margin-top:8px;font-size:11px;color:#666">⚠️ Notez ces informations — elles ne seront plus affichées.</div>`,
      'success'
    );

    // Rafraîchir la liste
    _refreshUsersList();

    // Réinitialiser les champs
    document.getElementById('new-user-nom').value      = '';
    document.getElementById('new-user-email').value    = '';
    document.getElementById('new-user-password').value = '';
    document.getElementById('new-user-role').value     = 'manager';
    document.getElementById('new-user-pw-info').innerHTML = 'Minimum 6 caractères.';

    // Changer bouton en "Fermer"
    if (btn) btn.style.display = 'none';
    const cancelBtn = document.getElementById('create-user-cancel-btn');
    if (cancelBtn) cancelBtn.textContent = '✔ Fermer';

  } catch (e) {
    console.error('[createUser] Exception inattendue:', e);
    _showCreateUserAlert('❌ Erreur inattendue: ' + (e.message || 'Veuillez réessayer.'), 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus"></i> Créer l\'utilisateur'; }
  }
}

// ── Modification utilisateur ──────────────────────────────────
function editUserModal(id, nomEnc, email, role, actif) {
  const nom = decodeURIComponent(nomEnc);
  document.getElementById('edit-user-id').value      = id;
  document.getElementById('edit-user-nom').value     = nom;
  document.getElementById('edit-user-email').value   = email;
  document.getElementById('edit-user-role').value    = role;
  document.getElementById('edit-user-actif').value   = actif;
  document.getElementById('edit-user-password').value= '';
  openModal('edit-user-modal');
}

function generateAndFillEditPassword() {
  const pwd = generateStrongPassword(12);
  document.getElementById('edit-user-password').value = pwd;
  showToast('Mot de passe généré ! Copiez-le avant de sauvegarder.', 'info');
}

function copyEditPassword() {
  const pwd = document.getElementById('edit-user-password').value;
  if (!pwd) { showToast('Générez d\'abord un mot de passe', 'warning'); return; }
  if (navigator.clipboard) {
    navigator.clipboard.writeText(pwd).then(() => showToast('Mot de passe copié !', 'success'));
  } else {
    showToast('Mot de passe: ' + pwd, 'info', 10000);
  }
}

async function updateUser() {
  const id   = document.getElementById('edit-user-id').value;
  const nom  = (document.getElementById('edit-user-nom').value || '').trim();
  const role = document.getElementById('edit-user-role').value;
  const actif= document.getElementById('edit-user-actif').value === 'true';
  const pwd  = (document.getElementById('edit-user-password').value || '');

  if (!nom) { showToast('Nom requis', 'error'); return; }

  const btn = document.getElementById('edit-user-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }

  const cid = App.currentUser?.companyId || App.currentUser?.company_id;

  try {
    if (!App.isDemoMode) {
      try {
        const payload = { action: 'update', user_id: id, name: nom, role, is_active: actif, company_id: cid };
        if (pwd && pwd.length >= 6) payload.password = pwd;
        await callNetlifyFunction('create-user', payload);
      } catch(ne) {
        console.warn('[updateUser Netlify]', ne.message);
        // Continuer avec la mise à jour locale même si Netlify échoue
      }
    }
    // Mise à jour locale toujours
    const idx = (App.data.profiles || []).findIndex(p => p.id === id);
    if (idx > -1) {
      App.data.profiles[idx] = {
        ...App.data.profiles[idx],
        full_name: nom, name: nom, role, is_active: actif
      };
    }
    addAuditLog('Utilisateurs', `Modifié: ${nom} (${role})`);
    closeModal('edit-user-modal');
    _refreshUsersList();
    showToast('✅ Utilisateur mis à jour !', 'success');
  } catch (e) {
    console.error('[updateUser]', e);
    showToast('Erreur: ' + (e.message || 'Mise à jour impossible'), 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Enregistrer'; }
  }
}

async function toggleUserStatus(userId, newStatus) {
  const cid  = App.currentUser?.companyId || App.currentUser?.company_id;
  const active = newStatus === 'true' || newStatus === true;
  try {
    if (!App.isDemoMode) {
      try {
        await callNetlifyFunction('create-user', {
          action: 'update', user_id: userId, is_active: active, company_id: cid
        });
      } catch(ne) { console.warn('[toggleUserStatus]', ne.message); }
    }
    const idx = (App.data.profiles || []).findIndex(p => p.id === userId);
    if (idx > -1) App.data.profiles[idx].is_active = active;
    addAuditLog('Utilisateurs', `Statut modifié: ${userId} → ${active ? 'actif' : 'désactivé'}`);
    _refreshUsersList();
    showToast(`Statut ${active ? 'activé' : 'désactivé'}`, 'success');
  } catch(e) {
    showToast('Erreur modification statut', 'error');
  }
}

// ── Changer son propre mot de passe ──────────────────────────
async function changePassword() {
  const newPw   = document.getElementById('pw-new').value;
  const confirm = document.getElementById('pw-confirm').value;
  if (!newPw || !confirm)    { showToast('Tous les champs sont requis', 'error'); return; }
  if (newPw.length < 8)      { showToast('Minimum 8 caractères', 'error'); return; }
  if (newPw !== confirm)     { showToast('Les mots de passe ne correspondent pas', 'error'); return; }

  try {
    if (!App.isDemoMode) {
      const { error } = await getSupabase().auth.updateUser({ password: newPw });
      if (error) throw error;
    } else {
      const u = (typeof DEMO_USERS !== 'undefined' ? DEMO_USERS : []).find(u => u.id === App.currentUser?.id);
      if (u) u.password = newPw;
    }
    addAuditLog('Sécurité', 'Mot de passe changé');
    showToast('✅ Mot de passe mis à jour avec succès !', 'success');
    document.getElementById('pw-new').value     = '';
    document.getElementById('pw-confirm').value = '';
    document.getElementById('pw-strength').innerHTML = '';
  } catch (e) {
    console.error('[changePassword]', e);
    showToast('Erreur: ' + (e.message || 'Impossible de changer le mot de passe'), 'error');
  }
}

function fillGeneratedPassword() {
  const pwd = generateStrongPassword(12);
  document.getElementById('pw-new').value     = pwd;
  document.getElementById('pw-confirm').value = pwd;
  checkPwStrength();
  showToast('Mot de passe généré ! Modifiez-le si besoin puis enregistrez.', 'info');
}

function togglePwVisibility(...ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.type = el.type === 'password' ? 'text' : 'password';
  });
}

function checkPwStrength() {
  const pw  = document.getElementById('pw-new')?.value || '';
  const div = document.getElementById('pw-strength');
  if (!div) return;
  let score = 0;
  if (pw.length >= 8)        score++;
  if (pw.length >= 12)       score++;
  if (/[A-Z]/.test(pw))      score++;
  if (/[0-9]/.test(pw))      score++;
  if (/[@#$!%?&]/.test(pw))  score++;
  const levels = ['','Faible','Moyen','Bon','Très bon','Excellent'];
  const colors = ['','var(--danger)','var(--warning)','var(--accent)','var(--success)','var(--success)'];
  div.innerHTML = pw.length > 0
    ? `<span style="color:${colors[score]||'var(--text-muted)'}"><i class="fas fa-shield-alt"></i> Force: <strong>${levels[score]||'Très faible'}</strong></span>`
    : '';
}

// ══════════════════════════════════════════════════════════════
// LOGO SOCIÉTÉ — Persistance robuste
// localStorage : survit au refresh de page
// Supabase : synchronisé avec la base de données
// ══════════════════════════════════════════════════════════════

function _getLogoKey() {
  return 'ga_logo_' + (App.currentCompany?.id || App.currentUser?.companyId || App.currentUser?.company_id || 'default');
}

function handleLogoUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  // Limite de taille : 1.2 MB pour rester sous les limites TEXT Supabase
  if (file.size > 1.2 * 1024 * 1024) {
    showToast('Image trop grande (max 1.2 MB). Compressez-la d\'abord.', 'error', 5000);
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target.result;

    // 1. Mise à jour immédiate en mémoire
    if (!App.currentCompany) App.currentCompany = {};
    App.currentCompany.logo = base64;

    // 2. Aperçu immédiat
    const preview = document.getElementById('logo-preview');
    if (preview) preview.innerHTML = `<img src="${base64}" style="width:100%;height:100%;object-fit:cover;border-radius:10px" id="logo-img-preview">`;

    // 3. Mise à jour sidebar
    updateUserUI();

    // 4. Sauvegarde localStorage (TOUJOURS — survit au refresh)
    try {
      localStorage.setItem(_getLogoKey(), base64);
      console.log('[Logo] Sauvegardé dans localStorage ✓');
    } catch(ex) {
      console.warn('[Logo] localStorage plein:', ex.message);
      // Essayer de compresser en réduisant la qualité
    }

    // 5. Sauvegarde Supabase
    if (!App.isDemoMode && App.currentCompany?.id) {
      try {
        await sbUpdate('companies', App.currentCompany.id, { logo: base64 });
        addAuditLog('Paramètres', 'Logo société sauvegardé dans Supabase');
        showToast('✅ Logo sauvegardé avec succès !', 'success');
      } catch (err) {
        console.warn('[Logo Supabase] Erreur:', err.message);
        // Logo déjà dans localStorage, sera rechargé au prochain démarrage
        showToast('Logo sauvegardé localement (rechargé automatiquement à la reconnexion).', 'warning', 5000);
      }
    } else {
      showToast('✅ Logo mis à jour !', 'success');
    }
  };

  reader.onerror = () => {
    showToast('Erreur de lecture du fichier image.', 'error');
  };

  reader.readAsDataURL(file);
  // Réinitialiser l'input pour permettre de recharger le même fichier
  event.target.value = '';
}

async function removeLogo() {
  const key = _getLogoKey();

  if (!App.currentCompany) App.currentCompany = {};
  App.currentCompany.logo = null;

  // Supprimer du localStorage
  try { localStorage.removeItem(key); } catch(e) {}

  // Supprimer dans Supabase
  if (!App.isDemoMode && App.currentCompany?.id) {
    try {
      await sbUpdate('companies', App.currentCompany.id, { logo: null });
    } catch(e) {
      console.warn('[removeLogo]', e.message);
    }
  }

  updateUserUI();
  renderParametres();
  showToast('Logo supprimé', 'info');
}

// ══════════════════════════════════════════════════════════════
// SOCIÉTÉ — Sauvegarde dans Supabase
// ══════════════════════════════════════════════════════════════
async function saveSociete() {
  const btn = document.getElementById('btn-save-societe');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...'; }

  if (!App.currentCompany) App.currentCompany = {};
  const cid = App.currentCompany.id || App.currentUser?.companyId || App.currentUser?.company_id;
  if (cid) App.currentCompany.id = cid;

  // Lire les valeurs du formulaire
  App.currentCompany.name              = (document.getElementById('co-nom')?.value || '').trim();
  App.currentCompany.ice               = (document.getElementById('co-ice')?.value || '').trim();
  App.currentCompany.rc                = (document.getElementById('co-rc')?.value || '').trim();
  App.currentCompany.identifiantFiscal = (document.getElementById('co-if')?.value || '').trim();
  App.currentCompany.identifiant_fiscal= App.currentCompany.identifiantFiscal;
  App.currentCompany.patente           = (document.getElementById('co-patente')?.value || '').trim();
  App.currentCompany.cnss              = (document.getElementById('co-cnss')?.value || '').trim();
  App.currentCompany.adresse           = (document.getElementById('co-adresse')?.value || '').trim();
  App.currentCompany.ville             = (document.getElementById('co-ville')?.value || '').trim();
  App.currentCompany.telephone         = (document.getElementById('co-tel')?.value || '').trim();
  App.currentCompany.email             = (document.getElementById('co-email')?.value || '').trim();
  App.currentCompany.rib               = (document.getElementById('co-rib')?.value || '').trim();

  // Mise à jour dans App.data.companies
  if (App.data.companies) {
    const idx = App.data.companies.findIndex(c => c.id === cid);
    if (idx > -1) App.data.companies[idx] = { ...App.data.companies[idx], ...App.currentCompany };
  }

  if (!App.isDemoMode && cid) {
    // Payload snake_case pour Supabase
    const payload = {
      name:              App.currentCompany.name              || null,
      ice:               App.currentCompany.ice               || null,
      rc:                App.currentCompany.rc                || null,
      identifiant_fiscal:App.currentCompany.identifiantFiscal || null,
      patente:           App.currentCompany.patente           || null,
      cnss:              App.currentCompany.cnss              || null,
      adresse:           App.currentCompany.adresse           || null,
      ville:             App.currentCompany.ville             || null,
      telephone:         App.currentCompany.telephone         || null,
      email:             App.currentCompany.email             || null,
      rib:               App.currentCompany.rib               || null,
    };
    // Inclure le logo s'il est présent
    if (App.currentCompany.logo !== undefined) {
      payload.logo = App.currentCompany.logo;
    }

    // Supprimer les null pour ne pas écraser des colonnes qui n'existent peut-être pas encore
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== null)
    );

    try {
      await sbUpdate('companies', cid, cleanPayload);
      console.log('[saveSociete] ✅ Sauvegardé dans Supabase');
    } catch (e) {
      console.error('[saveSociete] Erreur Supabase:', e.message, e);
      // Continuer quand même — données en mémoire
      showToast('Avertissement: Données sauvegardées localement seulement. Vérifiez votre connexion.', 'warning', 5000);
      updateUserUI();
      addAuditLog('Paramètres', 'Infos société mises à jour (local seulement)');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Enregistrer'; }
      return;
    }
  }

  updateUserUI();
  addAuditLog('Paramètres', `Infos société mises à jour: ${App.currentCompany.name || '?'}`);
  showToast('✅ Société enregistrée avec succès !', 'success');
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Enregistrer'; }
}

// ── PDF ───────────────────────────────────────────────────────
async function savePDFSettings() {
  if (!App.currentCompany) App.currentCompany = {};

  // Lire les valeurs depuis les champs
  const colorEl    = document.getElementById('pdf-color');
  const templateEl = document.getElementById('pdf-template');
  const watermarkEl= document.getElementById('pdf-watermark');
  const footerEl   = document.getElementById('pdf-footer');

  if (!colorEl) { showToast('Erreur: champs PDF introuvables', 'error'); return; }

  App.currentCompany.pdfColor      = colorEl.value;
  App.currentCompany.pdf_color     = colorEl.value;
  App.currentCompany.pdfTemplate   = templateEl?.value || 'classique';
  App.currentCompany.pdf_template  = App.currentCompany.pdfTemplate;
  App.currentCompany.pdfWatermark  = watermarkEl?.value || '';
  App.currentCompany.pdf_watermark = App.currentCompany.pdfWatermark;
  App.currentCompany.pdfFooter     = footerEl?.value || '';
  App.currentCompany.pdf_footer    = App.currentCompany.pdfFooter;

  // Sauvegarder aussi dans localStorage (persistance locale immédiate)
  try {
    const pdfPrefs = {
      pdfColor:    App.currentCompany.pdfColor,
      pdfTemplate: App.currentCompany.pdfTemplate,
      pdfWatermark:App.currentCompany.pdfWatermark,
      pdfFooter:   App.currentCompany.pdfFooter,
    };
    localStorage.setItem('ga_pdf_prefs_' + (App.currentCompany?.id || 'default'), JSON.stringify(pdfPrefs));
  } catch(lsErr) {
    console.warn('[savePDFSettings] localStorage:', lsErr.message);
  }

  // Mettre à jour aussi dans App.data.companies
  if (App.data.companies) {
    const cid = App.currentCompany.id;
    const idx = App.data.companies.findIndex(c => c.id === cid);
    if (idx > -1) App.data.companies[idx] = { ...App.data.companies[idx], ...App.currentCompany };
  }

  // Sauvegarder dans Supabase
  if (!App.isDemoMode && App.currentCompany?.id) {
    try {
      await sbUpdate('companies', App.currentCompany.id, {
        pdf_color:    App.currentCompany.pdfColor,
        pdf_template: App.currentCompany.pdfTemplate,
        pdf_watermark:App.currentCompany.pdfWatermark,
        pdf_footer:   App.currentCompany.pdfFooter,
      });
      console.log('[savePDFSettings] ✅ Sauvegardé dans Supabase');
    } catch(e) {
      console.warn('[savePDFSettings] Erreur Supabase:', e.message);
      // Ne pas bloquer - les données sont dans localStorage
    }
  }

  // Rafraîchir la prévisualisation avec toutes les nouvelles valeurs
  updatePDFPreview();

  addAuditLog('Paramètres', `Template PDF: ${App.currentCompany.pdfTemplate} / couleur: ${App.currentCompany.pdfColor}`);
  showToast('✅ Paramètres PDF enregistrés !', 'success');
}

function updatePDFPreview() {
  const colorEl    = document.getElementById('pdf-color');
  const templateEl = document.getElementById('pdf-template');
  const watermarkEl= document.getElementById('pdf-watermark');
  const footerEl   = document.getElementById('pdf-footer');
  const hexEl      = document.getElementById('pdf-color-hex');
  const previewEl  = document.getElementById('pdf-preview');

  const color    = colorEl?.value    || '#1e3a5f';
  const template = templateEl?.value || 'classique';
  const watermark= watermarkEl?.value|| '';
  const footer   = footerEl?.value   || '';

  if (hexEl)     hexEl.textContent = color;
  if (previewEl) previewEl.innerHTML = renderPDFPreview({
    pdfColor:    color,
    pdfTemplate: template,
    pdfWatermark:watermark,
    pdfFooter:   footer,
    name:        App.currentCompany?.name || '',
    ice:         App.currentCompany?.ice  || '',
    logo:        App.currentCompany?.logo || null,
    rib:         App.currentCompany?.rib  || '',
    telephone:   App.currentCompany?.telephone || '',
    email:       App.currentCompany?.email || '',
  });
}

function renderPDFPreview(co) {
  const color    = co?.pdfColor    || co?.pdf_color    || '#1e3a5f';
  const template = co?.pdfTemplate || co?.pdf_template || 'classique';
  const watermark= co?.pdfWatermark|| co?.pdf_watermark|| '';
  const footer   = co?.pdfFooter   || co?.pdf_footer   || '';
  const logo     = co?.logo || null;
  const nom      = co?.name || 'Votre Société';
  const ice      = co?.ice  || '';
  const rib      = co?.rib  || '';
  const tel      = co?.telephone || '';
  const email    = co?.email     || '';

  // Styles par template
  const headerStyle = {
    classique:   `border-bottom:3px solid ${color}`,
    moderne:     `background:${color};color:white;padding:14px;border-radius:8px 8px 0 0`,
    minimaliste: `border-bottom:1px solid #ccc`,
    elegant:     `border-bottom:4px double ${color}`,
    btp:         `background:#222;color:white;padding:14px`,
  }[template] || `border-bottom:3px solid ${color}`;

  const titleColor = ['moderne','btp'].includes(template) ? 'white' : color;
  const bgAlt      = template === 'minimaliste' ? '#fff' : '#f5f5f5';

  const logoHtml = logo
    ? `<img src="${logo}" style="max-height:50px;max-width:120px;object-fit:contain;display:block;margin-bottom:4px" alt="Logo">`
    : `<div style="width:50px;height:50px;background:${color}22;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:18px;margin-bottom:4px">🏢</div>`;

  const footerLines = [];
  if (nom) footerLines.push(`<strong style="color:${color}">${nom}</strong>`);
  if (rib) footerLines.push(`RIB: ${rib}`);
  if (ice) footerLines.push(`ICE: ${ice}`);
  if (tel) footerLines.push(`Tél: ${tel}`);
  if (email) footerLines.push(email);
  if (footer) footerLines.push(`<em>${footer}</em>`);
  const footerHtml = footerLines.length
    ? `<div style="border-top:2px solid ${color};padding-top:8px;margin-top:12px;font-size:10px;color:#555;text-align:center">${footerLines.join(' &nbsp;|&nbsp; ')}</div>`
    : '';

  const watermarkHtml = watermark
    ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:28px;font-weight:800;color:${color}22;pointer-events:none;white-space:nowrap;z-index:0">${watermark}</div>`
    : '';

  return `
    <div style="font-family:Arial,sans-serif;color:#333;font-size:12px;padding:16px;position:relative;min-height:200px">
      ${watermarkHtml}
      <div style="display:flex;justify-content:space-between;align-items:flex-start;${headerStyle};padding-bottom:12px;margin-bottom:16px">
        <div style="color:${titleColor}">
          ${logoHtml}
          <strong style="font-size:14px;color:${titleColor}">${nom || 'Votre Société'}</strong>
          ${ice ? `<div style="font-size:10px;opacity:.7">ICE: ${ice}</div>` : ''}
        </div>
        <div style="text-align:right">
          <div style="font-size:20px;font-weight:800;color:${titleColor};letter-spacing:2px">FACTURE</div>
          <div style="font-weight:700;margin:2px 0">F-2026-0001</div>
          <div style="font-size:10px;opacity:.7">${formatDate(today())}</div>
        </div>
      </div>
      <div style="background:${bgAlt};border-left:4px solid ${color};padding:8px 12px;border-radius:0 6px 6px 0;margin-bottom:12px">
        <div style="font-size:10px;color:#888;text-transform:uppercase">Client</div>
        <strong>BTP Construction SARL</strong>
        <div style="font-size:11px;color:#555">ICE: 001234567890123</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead><tr style="background:${color};color:white">
          <th style="padding:6px;text-align:left">Désignation</th>
          <th style="padding:6px">Qté</th>
          <th style="padding:6px">P.U. HT</th>
          <th style="padding:6px;text-align:right">Total TTC</th>
        </tr></thead>
        <tbody>
          <tr style="background:${bgAlt}">
            <td style="padding:6px">Maçonnerie briques creuses</td>
            <td style="padding:6px;text-align:center">50 m²</td>
            <td style="padding:6px;text-align:right">180,00</td>
            <td style="padding:6px;text-align:right;font-weight:700">10 800,00</td>
          </tr>
          <tr>
            <td style="padding:6px">Main d'œuvre maçon</td>
            <td style="padding:6px;text-align:center">5 j</td>
            <td style="padding:6px;text-align:right">350,00</td>
            <td style="padding:6px;text-align:right;font-weight:700">2 100,00</td>
          </tr>
        </tbody>
      </table>
      <div style="text-align:right;margin-top:10px;padding:8px;border-top:2px solid ${color}">
        <div>HT: 10 750,00 MAD &nbsp;|&nbsp; TVA (20%): 2 150,00 MAD</div>
        <div style="font-size:16px;font-weight:800;color:${color};margin-top:4px">TOTAL TTC: 12 900,00 MAD</div>
        <div style="font-size:10px;font-style:italic;color:#555;margin-top:4px">Arrêtée à la somme de : Douze mille neuf cents dirhams</div>
      </div>
      ${footerHtml}
    </div>
  `;
}

// ── 2FA / Langue ─────────────────────────────────────────────
function toggle2FA(enabled) {
  const demoUsers = (typeof DEMO_USERS !== 'undefined') ? DEMO_USERS : [];
  const u = demoUsers.find(u => u.id === App.currentUser?.id);
  if (u) { u.twofa = enabled; }
  if (App.currentUser) App.currentUser.twofa = enabled;
  const status = document.getElementById('twofa-status');
  if (status) {
    status.textContent  = enabled ? 'Activée' : 'Désactivée';
    status.className    = `badge ${enabled ? 'badge-success' : 'badge-secondary'}`;
  }
  addAuditLog('Sécurité', `2FA ${enabled ? 'activée' : 'désactivée'}`);
  showToast(`Authentification 2FA ${enabled ? 'activée' : 'désactivée'} !`, 'success');
}

function setLangAndReload(lang) {
  setLang(lang);
  if (typeof savePrefs === 'function') savePrefs();
  navigate(App.currentModule);
}

// ── Aperçu PDF exemple ────────────────────────────────────────
function testPDFPreview() {
  // Créer un devis exemple avec les paramètres actuels
  const co = App.currentCompany || {};
  const exampleDevis = {
    id: 'example',
    numero: 'D-2026-EXEMPLE',
    objet: 'Travaux de maçonnerie et finitions',
    date: today(),
    dateValidite: new Date(Date.now() + 30*86400000).toISOString().split('T')[0],
    clientNom: 'Société BTP Construction SARL',
    totalHT:  10750,
    totalTVA:  2150,
    totalTTC: 12900,
    notes: 'Conditions de règlement : 30 jours fin de mois.',
    lignes: [
      { designation: 'Maçonnerie briques creuses', unite: 'm²', quantite: 50, prixUnitaire: 180, tva: 20 },
      { designation: 'Enduit intérieur ciment', unite: 'm²', quantite: 30, prixUnitaire: 65, tva: 20 },
      { designation: "Main d'œuvre maçon", unite: 'jour', quantite: 5, prixUnitaire: 350, tva: 20 },
    ],
  };
  const exampleClient = {
    nom: 'BTP Construction SARL',
    ice: '001234567890123',
    adresse: '12 Rue Mohammed V',
    ville: 'Casablanca',
    telephone: '0522 000 000',
    email: 'contact@btpconstruction.ma',
  };
  if (typeof generateDevisPDF === 'function') {
    generateDevisPDF(exampleDevis, exampleClient);
  } else {
    showToast('Erreur: pdf-utils.js non chargé', 'error');
  }
}

// ── Sauvegarde ────────────────────────────────────────────────
function showInviteModal() { showCreateUserModal(); }
function exportBackupFull() { if (typeof exportBackup === 'function') exportBackup(); }

function exportBackupSelected() {
  const modules = [...document.querySelectorAll('.backup-module:checked')].map(c => c.value);
  const data = {};
  modules.forEach(m => { data[m] = App.data[m] || []; });
  const backup = {
    version: '4.0', exportDate: new Date().toISOString(),
    company: App.currentCompany?.name, modules, data
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `backup_${modules.join('_')}_${today()}.json`; a.click();
  URL.revokeObjectURL(url);
  showToast(`Sauvegarde de ${modules.length} module(s) téléchargée !`, 'success');
}

function exportAuditLog() {
  const logs = getAuditLog(1000);
  const csv  = ['Date,Utilisateur,Action,Detail,Societe',
    ...logs.map(l => `"${l.date}","${l.user}","${l.action}","${l.detail}","${l.company}"`)
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `audit_log_${today()}.csv`; a.click();
  URL.revokeObjectURL(url);
  showToast('Audit log exporté !', 'success');
}
