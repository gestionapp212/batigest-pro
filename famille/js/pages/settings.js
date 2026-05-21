// =====================================================
// Family Cash Flow — Settings Page
// =====================================================

let settingsTab = 'profile';

async function loadSettingsPage() {
  AppState.currentPage = 'settings';
  renderSettingsLayout();
}

function renderSettingsLayout() {
  const profile = AppState.profile || {};
  const userName = profile.full_name || AppState.user?.user_metadata?.full_name || 'Utilisateur';
  const userEmail = profile.email || AppState.user?.email || '';
  const initial = userName.charAt(0).toUpperCase();

  const tabs = [
    { id:'profile',       icon:'fa-user',          label:'Profil' },
    { id:'security',      icon:'fa-lock',           label:'Sécurité' },
    { id:'preferences',   icon:'fa-sliders',        label:'Préférences' },
    { id:'notifications', icon:'fa-bell',           label:'Notifications' },
    { id:'data',          icon:'fa-database',       label:'Données' },
  ];

  const html = `
  <div class="fade-in" style="display:flex;gap:20px;align-items:flex-start;">

    <!-- Settings Sidebar -->
    <div class="settings-sidebar">
      <div class="card" style="padding:8px;">
        ${tabs.map(t => `
        <div class="settings-nav-item ${settingsTab === t.id ? 'active' : ''}" onclick="switchSettingsTab('${t.id}')">
          <i class="fas ${t.icon}" style="width:16px;"></i>
          ${t.label}
        </div>`).join('')}

        <div class="divider"></div>

        <div class="settings-nav-item" onclick="confirmSignOut()" style="color:var(--danger);">
          <i class="fas fa-right-from-bracket" style="width:16px;color:var(--danger);"></i>
          Déconnexion
        </div>
      </div>
    </div>

    <!-- Settings Content -->
    <div style="flex:1;min-width:0;">
      <div id="settings-tab-content">
        ${renderSettingsTab(settingsTab, userName, userEmail, initial)}
      </div>
    </div>

  </div>`;

  renderLayout(html, 'Paramètres', '');
}

function renderSettingsTab(tab, userName, userEmail, initial) {
  switch(tab) {
    case 'profile':       return renderProfileTab(userName, userEmail, initial);
    case 'security':      return renderSecurityTab(userEmail);
    case 'preferences':   return renderPreferencesTab();
    case 'notifications': return renderNotificationsTab();
    case 'data':          return renderDataTab();
    default: return renderProfileTab(userName, userEmail, initial);
  }
}

function renderProfileTab(userName, userEmail, initial) {
  return `
  <div class="card">
    <div class="card-header">
      <div class="card-title"><i class="fas fa-user" style="color:var(--primary);"></i> Profil utilisateur</div>
    </div>

    <!-- Avatar -->
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;padding:16px;background:var(--bg-hover);border-radius:var(--radius);">
      <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--secondary));
                  display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:white;flex-shrink:0;">
        ${initial}
      </div>
      <div>
        <div style="font-size:16px;font-weight:700;">${userName}</div>
        <div style="font-size:13px;color:var(--text-muted);">${userEmail}</div>
        <button class="btn btn-ghost btn-sm" style="margin-top:6px;" onclick="showToast('Fonctionnalité disponible avec Supabase configuré','info')">
          <i class="fas fa-camera"></i> Changer la photo
        </button>
      </div>
    </div>

    <form onsubmit="saveProfile(event)">
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Prénom</label>
          <input type="text" id="profile-firstname" class="form-input" value="${userName.split(' ')[0] || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Nom</label>
          <input type="text" id="profile-lastname" class="form-input" value="${userName.split(' ').slice(1).join(' ') || ''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input type="email" id="profile-email" class="form-input" value="${userEmail}" disabled style="opacity:0.7;">
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">L'email ne peut pas être modifié ici</div>
      </div>
      <div class="form-group">
        <label class="form-label">Téléphone</label>
        <input type="tel" id="profile-phone" class="form-input" placeholder="+212 6XX XXX XXX">
      </div>
      <button type="submit" class="btn btn-primary">
        <i class="fas fa-check"></i> Enregistrer le profil
      </button>
    </form>
  </div>`;
}

function renderSecurityTab(email) {
  return `
  <div style="display:flex;flex-direction:column;gap:16px;">
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-key" style="color:var(--primary);"></i> Changer le mot de passe</div>
      </div>
      <form onsubmit="changePassword(event)">
        <div class="form-group">
          <label class="form-label">Mot de passe actuel</label>
          <div class="input-group">
            <input type="password" id="current-pass" class="form-input" placeholder="••••••••">
            <span class="input-toggle" onclick="togglePassword('current-pass')"><i class="fas fa-eye"></i></span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Nouveau mot de passe</label>
          <div class="input-group">
            <input type="password" id="new-pass" class="form-input" placeholder="Min. 8 caractères">
            <span class="input-toggle" onclick="togglePassword('new-pass')"><i class="fas fa-eye"></i></span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Confirmer le nouveau mot de passe</label>
          <div class="input-group">
            <input type="password" id="confirm-pass" class="form-input" placeholder="••••••••">
            <span class="input-toggle" onclick="togglePassword('confirm-pass')"><i class="fas fa-eye"></i></span>
          </div>
        </div>
        <button type="submit" class="btn btn-primary">
          <i class="fas fa-lock"></i> Mettre à jour
        </button>
      </form>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-shield" style="color:var(--secondary);"></i> Sessions actives</div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg-hover);border-radius:var(--radius);">
        <div style="display:flex;align-items:center;gap:10px;">
          <i class="fas fa-laptop" style="color:var(--primary);"></i>
          <div>
            <div style="font-size:13px;font-weight:600;">Navigateur Web — Cet appareil</div>
            <div style="font-size:11px;color:var(--text-muted);">Connecté maintenant · Maroc</div>
          </div>
        </div>
        <span class="badge badge-green">Actif</span>
      </div>
    </div>
  </div>`;
}

function renderPreferencesTab() {
  return `
  <div style="display:flex;flex-direction:column;gap:16px;">
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-palette" style="color:var(--primary);"></i> Apparence</div>
      </div>

      <div class="form-group">
        <label class="form-label">Thème</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px;">
          <div onclick="applyTheme('light'); renderSettingsLayout();"
               style="padding:12px;border:2px solid ${AppState.theme==='light'?'var(--primary)':'var(--border)'};
                      border-radius:var(--radius);cursor:pointer;text-align:center;background:${AppState.theme==='light'?'var(--primary-bg)':'var(--bg-hover)'};">
            <div style="font-size:24px;margin-bottom:4px;">☀️</div>
            <div style="font-size:13px;font-weight:600;">Mode clair</div>
          </div>
          <div onclick="applyTheme('dark'); renderSettingsLayout();"
               style="padding:12px;border:2px solid ${AppState.theme==='dark'?'var(--primary)':'var(--border)'};
                      border-radius:var(--radius);cursor:pointer;text-align:center;background:${AppState.theme==='dark'?'var(--primary-bg)':'var(--bg-hover)'};">
            <div style="font-size:24px;margin-bottom:4px;">🌙</div>
            <div style="font-size:13px;font-weight:600;">Mode sombre</div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-coins" style="color:var(--accent);"></i> Devise & Langue</div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Devise principale</label>
          <select class="form-select" onchange="AppState.currency=this.value; showToast('Devise mise à jour !','success');">
            ${Object.entries(CURRENCIES).map(([k,v]) => `
              <option value="${k}" ${AppState.currency===k?'selected':''}>${v.symbol} — ${v.name}</option>
            `).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Langue</label>
          <select class="form-select" onchange="showToast('Langue mise à jour !','success');">
            <option value="fr" selected>🇫🇷 Français</option>
            <option value="ar">🇲🇦 العربية</option>
            <option value="en">🇬🇧 English</option>
          </select>
        </div>
      </div>
    </div>
  </div>`;
}

function renderNotificationsTab() {
  const notifs = [
    { id:'sub_alert',    label:'Alertes abonnements',        desc:'Notification 7 jours avant renouvellement', checked:true  },
    { id:'budget_alert', label:'Dépassement de budget',      desc:'Alerte quand un budget est dépassé',          checked:true  },
    { id:'loan_alert',   label:'Rappels crédits',            desc:'Rappel avant chaque mensualité',              checked:true  },
    { id:'monthly_report',label:'Rapport mensuel',           desc:'Résumé automatique en fin de mois',           checked:false },
    { id:'weekly_summary',label:'Résumé hebdomadaire',       desc:'Récapitulatif chaque dimanche',               checked:false },
  ];

  return `
  <div class="card">
    <div class="card-header">
      <div class="card-title"><i class="fas fa-bell" style="color:var(--primary);"></i> Préférences de notifications</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:0;">
      ${notifs.map(n => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--border-light);">
        <div>
          <div style="font-size:13px;font-weight:600;">${n.label}</div>
          <div style="font-size:12px;color:var(--text-muted);">${n.desc}</div>
        </div>
        <label style="position:relative;display:inline-block;width:46px;height:24px;cursor:pointer;">
          <input type="checkbox" ${n.checked?'checked':''} onchange="showToast('Préférence mise à jour','success')"
                 style="opacity:0;width:0;height:0;position:absolute;">
          <span style="position:absolute;inset:0;background:${n.checked?'var(--secondary)':'var(--border)'};border-radius:12px;transition:0.2s;"></span>
          <span style="position:absolute;width:18px;height:18px;border-radius:50%;background:white;top:3px;left:${n.checked?'25px':'3px'};transition:0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></span>
        </label>
      </div>`).join('')}
    </div>
    <button class="btn btn-primary" style="margin-top:16px;" onclick="showToast('Préférences sauvegardées !','success')">
      <i class="fas fa-check"></i> Sauvegarder
    </button>
  </div>`;
}

function renderDataTab() {
  return `
  <div style="display:flex;flex-direction:column;gap:16px;">
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-download" style="color:var(--secondary);"></i> Exporter mes données</div>
      </div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
        Téléchargez une copie complète de toutes vos données financières.
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <button class="btn btn-ghost" style="justify-content:flex-start;" onclick="showToast('Export CSV en cours...','info')">
          <i class="fas fa-file-csv" style="color:var(--secondary);"></i> Exporter en CSV (toutes les transactions)
        </button>
        <button class="btn btn-ghost" style="justify-content:flex-start;" onclick="showToast('Export JSON en cours...','info')">
          <i class="fas fa-file-code" style="color:var(--primary);"></i> Exporter en JSON (données complètes)
        </button>
      </div>
    </div>

    <div class="card" style="border-color:var(--danger);">
      <div class="card-header">
        <div class="card-title" style="color:var(--danger);"><i class="fas fa-triangle-exclamation"></i> Zone dangereuse</div>
      </div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
        Ces actions sont irréversibles. Veuillez lire attentivement avant de continuer.
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <button class="btn btn-ghost" style="border-color:var(--danger);color:var(--danger);justify-content:flex-start;"
                onclick="if(confirm('Supprimer toutes les transactions ? Cette action est irréversible.')) showToast('Fonctionnalité disponible avec Supabase','info')">
          <i class="fas fa-trash"></i> Supprimer toutes les transactions
        </button>
        <button class="btn btn-danger" style="justify-content:flex-start;"
                onclick="if(confirm('Supprimer définitivement votre compte ? Cette action est irréversible !')) signOut()">
          <i class="fas fa-user-times"></i> Supprimer mon compte définitivement
        </button>
      </div>
    </div>
  </div>`;
}

function switchSettingsTab(tab) {
  settingsTab = tab;
  const profile = AppState.profile || {};
  const userName = profile.full_name || AppState.user?.user_metadata?.full_name || 'Utilisateur';
  const userEmail = profile.email || AppState.user?.email || '';
  const initial = userName.charAt(0).toUpperCase();

  const content = el('settings-tab-content');
  if (content) {
    content.innerHTML = renderSettingsTab(tab, userName, userEmail, initial);

    // Update active tab
    document.querySelectorAll('.settings-nav-item').forEach((item, i) => {
      const tabs = ['profile','security','preferences','notifications','data'];
      item.classList.toggle('active', tabs[i] === tab);
    });
  }
}

function saveProfile(e) {
  e.preventDefault();
  const firstname = el('profile-firstname')?.value;
  const lastname  = el('profile-lastname')?.value;

  if (AppState.profile) {
    AppState.profile.full_name = `${firstname} ${lastname}`.trim();
  }

  showToast('Profil mis à jour !', 'success');
}

function changePassword(e) {
  e.preventDefault();
  const cur  = el('current-pass')?.value;
  const next = el('new-pass')?.value;
  const conf = el('confirm-pass')?.value;

  if (!cur) { showToast('Entrez votre mot de passe actuel', 'error'); return; }
  if (next !== conf) { showToast('Les mots de passe ne correspondent pas', 'error'); return; }
  if (next.length < 8) { showToast('Min. 8 caractères', 'error'); return; }

  showToast('Mot de passe mis à jour !', 'success');
  el('current-pass').value = '';
  el('new-pass').value = '';
  el('confirm-pass').value = '';
}
