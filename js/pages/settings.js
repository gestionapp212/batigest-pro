// ============================================================
//  Paramètres du compte
// ============================================================

const Settings = {
  profile: null,
  activeTab: 'profile',

  async render() {
    document.getElementById('app').innerHTML = Components.dashboardLayout(Components.spinner(), '/dashboard/settings');
    if (window.lucide) lucide.createIcons();
    await this.load();
  },

  async load() {
    const user = Auth.currentUser;
    const { data } = await db.from('profiles').select('*').eq('id', user.id).single();
    this.profile = { ...(data || {}), email: user.email };
    this.renderContent();
  },

  renderContent() {
    const p = this.profile;
    const tabs = [
      { id: 'profile',      icon: 'user',          label: 'Profil' },
      { id: 'security',     icon: 'lock',          label: 'Sécurité' },
      { id: 'notifications',icon: 'bell',          label: 'Notifications' },
      { id: 'subscription', icon: 'credit-card',   label: 'Abonnement' },
      { id: 'danger',       icon: 'alert-triangle', label: 'Zone dangereuse' },
    ];

    document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Paramètres</h1>
        <p class="page-sub">Gérez votre compte et préférences</p>
      </div>
    </div>

    <div class="settings-layout">
      <!-- Tabs -->
      <nav class="settings-nav">
        ${tabs.map(t => `
          <button class="settings-tab ${this.activeTab === t.id ? 'settings-tab--active' : ''} ${t.id === 'danger' ? 'settings-tab--danger' : ''}"
            onclick="Settings.setTab('${t.id}')">
            <i data-lucide="${t.icon}"></i>
            ${t.label}
          </button>`).join('')}
      </nav>

      <!-- Content -->
      <div class="settings-content" id="settings-panel">
        ${this.renderTab(this.activeTab)}
      </div>
    </div>`;

    if (window.lucide) lucide.createIcons();
  },

  setTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.settings-tab').forEach(el => {
      el.classList.toggle('settings-tab--active', el.getAttribute('onclick')?.includes(`'${tab}'`));
    });
    document.getElementById('settings-panel').innerHTML = this.renderTab(tab);
    if (window.lucide) lucide.createIcons();
  },

  renderTab(tab) {
    const p = this.profile;
    if (tab === 'profile') return `
      <div class="settings-card">
        <h3 class="settings-card__title"><i data-lucide="user"></i> Informations personnelles</h3>
        <div class="user-preview">
          <div class="user-avatar user-avatar--lg" style="background:${Utils.avatarColor(p.email)}">${Utils.initials(p.full_name, p.email)}</div>
          <div><div class="fw-bold">${p.full_name || 'Sans nom'}</div><div class="text-muted">${p.email}</div></div>
        </div>
        <div class="form-group">
          <label class="form-label">Nom complet</label>
          <input type="text" id="s-name" class="form-input" value="${p.full_name || ''}" placeholder="Votre nom complet" />
        </div>
        <div class="form-group">
          <label class="form-label">Email (non modifiable)</label>
          <input type="email" class="form-input" value="${p.email}" disabled />
        </div>
        <div class="form-group">
          <label class="form-label">Téléphone</label>
          <input type="tel" id="s-phone" class="form-input" value="${p.phone || ''}" placeholder="+212 6XX XXX XXX" />
        </div>
        <div class="form-group">
          <label class="form-label">Ville</label>
          <input type="text" id="s-city" class="form-input" value="${p.city || ''}" placeholder="Ex: Casablanca" />
        </div>
        <button class="btn btn--primary" onclick="Settings.saveProfile()"><i data-lucide="save"></i> Enregistrer</button>
      </div>`;

    if (tab === 'security') return `
      <div class="settings-card">
        <h3 class="settings-card__title"><i data-lucide="lock"></i> Changer le mot de passe</h3>
        <div class="form-group">
          <label class="form-label">Nouveau mot de passe</label>
          <div class="input-wrap">
            <input type="password" id="s-pw1" class="form-input" placeholder="Minimum 8 caractères" />
            <button type="button" class="input-toggle" onclick="Auth.togglePass('s-pw1',this)"><i data-lucide="eye"></i></button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Confirmer le mot de passe</label>
          <div class="input-wrap">
            <input type="password" id="s-pw2" class="form-input" placeholder="Répétez le mot de passe" />
            <button type="button" class="input-toggle" onclick="Auth.togglePass('s-pw2',this)"><i data-lucide="eye"></i></button>
          </div>
        </div>
        <div id="pw-strength"></div>
        <button class="btn btn--primary" onclick="Settings.changePassword()"><i data-lucide="shield"></i> Changer le mot de passe</button>

        <div class="settings-divider"></div>
        <h3 class="settings-card__title"><i data-lucide="globe"></i> Session active</h3>
        <div class="session-item">
          <div class="session-icon">🌐</div>
          <div><div class="fw-medium">Navigateur Web</div><div class="text-muted">Session actuelle · ${new Date().toLocaleDateString('fr-FR')}</div></div>
          <span class="badge badge--green">Active</span>
        </div>
      </div>`;

    if (tab === 'notifications') return `
      <div class="settings-card">
        <h3 class="settings-card__title"><i data-lucide="bell"></i> Notifications email</h3>
        ${['Alertes de budget dépassé','Rapport mensuel automatique','Nouveau membre dans la famille'].map((label, i) => `
          <div class="notif-row">
            <div><div class="fw-medium">${label}</div></div>
            <label class="toggle-switch">
              <input type="checkbox" checked />
              <span class="toggle-slider"></span>
            </label>
          </div>`).join('')}
        <div class="settings-divider"></div>
        <h3 class="settings-card__title"><i data-lucide="smartphone"></i> Notifications push</h3>
        ${['Nouvelles transactions','Dépassement de budget immédiat'].map(label => `
          <div class="notif-row">
            <div><div class="fw-medium">${label}</div></div>
            <label class="toggle-switch">
              <input type="checkbox" />
              <span class="toggle-slider"></span>
            </label>
          </div>`).join('')}
        <button class="btn btn--primary mt-4" onclick="Utils.toast('Préférences enregistrées !','success')"><i data-lucide="save"></i> Enregistrer</button>
      </div>`;

    if (tab === 'subscription') return `
      <div class="settings-card">
        <h3 class="settings-card__title"><i data-lucide="credit-card"></i> Mon abonnement</h3>
        <div class="sub-info-card">
          <div class="sub-info-card__header">
            <div>
              <div class="text-muted" style="font-size:.8rem">Plan actuel</div>
              <div class="fw-bold" style="font-size:1.25rem">Plan Standard</div>
            </div>
            <span class="badge badge--green">✅ Actif</span>
          </div>
        </div>
        <div class="settings-divider"></div>
        <h4 class="fw-semibold mb-3">🏦 Renouvellement par virement bancaire</h4>
        <p class="text-muted mb-3">Pour renouveler votre abonnement, effectuez un virement avec les informations ci-dessous. Votre abonnement sera activé sous 24-48h.</p>
        <div class="bank-info">
          <div class="bank-info__row"><span>Banque</span><strong>Attijariwafa Bank</strong></div>
          <div class="bank-info__row"><span>RIB</span><strong>007 780 0000123456789 01</strong></div>
          <div class="bank-info__row"><span>Bénéficiaire</span><strong>Family Cash Flow SARL</strong></div>
          <div class="bank-info__row"><span>Référence</span><strong style="color:var(--primary)">FCF-${Auth.currentFamily?.family_id?.slice(0,8).toUpperCase() || 'XXXXXXXX'}</strong></div>
        </div>
        <div class="alert alert--warning mt-3">⚠️ Mentionnez obligatoirement la référence dans le motif du virement. Envoyez le justificatif à <strong>billing@chan-pro.com</strong></div>
      </div>`;

    if (tab === 'danger') return `
      <div class="settings-card settings-card--danger">
        <h3 class="settings-card__title" style="color:#ef4444"><i data-lucide="alert-triangle"></i> Zone dangereuse</h3>
        <p class="text-muted mb-4">Ces actions sont irréversibles. Procédez avec prudence.</p>
        <div class="danger-action">
          <div>
            <div class="fw-medium">Se déconnecter</div>
            <div class="text-muted" style="font-size:.85rem">Terminer la session courante</div>
          </div>
          <button class="btn btn--ghost" onclick="Auth.logout()"><i data-lucide="log-out"></i> Déconnexion</button>
        </div>
        <div class="danger-action danger-action--red">
          <div>
            <div class="fw-medium" style="color:#ef4444">Supprimer mon compte</div>
            <div class="text-muted" style="font-size:.85rem">Suppression définitive et irréversible</div>
          </div>
          <button class="btn btn--danger" onclick="Settings.deleteAccount()"><i data-lucide="trash-2"></i> Supprimer</button>
        </div>
      </div>`;

    return '';
  },

  async saveProfile() {
    const { error } = await db.from('profiles').upsert({
      id: Auth.currentUser.id,
      full_name: document.getElementById('s-name')?.value || '',
      phone: document.getElementById('s-phone')?.value || '',
      city: document.getElementById('s-city')?.value || '',
      email: Auth.currentUser.email,
    });
    if (error) { Utils.toast('Erreur : ' + error.message, 'error'); return; }
    Utils.toast('Profil mis à jour !', 'success');
    await this.load();
  },

  async changePassword() {
    const pw1 = document.getElementById('s-pw1')?.value;
    const pw2 = document.getElementById('s-pw2')?.value;
    if (!pw1 || pw1.length < 8) { Utils.toast('Le mot de passe doit faire au moins 8 caractères', 'warning'); return; }
    if (pw1 !== pw2) { Utils.toast('Les mots de passe ne correspondent pas', 'error'); return; }
    const { error } = await db.auth.updateUser({ password: pw1 });
    if (error) { Utils.toast('Erreur : ' + error.message, 'error'); return; }
    Utils.toast('Mot de passe changé avec succès !', 'success');
    document.getElementById('s-pw1').value = '';
    document.getElementById('s-pw2').value = '';
  },

  deleteAccount() {
    if (!confirm('⚠️ ATTENTION : Cette action est IRRÉVERSIBLE.\n\nToutes vos données seront supprimées définitivement.\n\nÊtes-vous absolument certain ?')) return;
    Utils.toast('Contactez support@chan-pro.com pour supprimer votre compte.', 'info', 6000);
  },
};
window.Settings = Settings;
