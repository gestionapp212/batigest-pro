// ============================================================
//  Espace Famille
// ============================================================

const Family = {
  members: [],
  family: null,

  async render() {
    document.getElementById('app').innerHTML = Components.dashboardLayout(Components.spinner(), '/dashboard/family');
    if (window.lucide) lucide.createIcons();
    await this.load();
  },

  async load() {
    const familyId = Auth.currentFamily?.family_id;
    const [fRes, mRes] = await Promise.all([
      db.from('families').select('*').eq('id', familyId).single(),
      db.from('family_members').select('*, profiles(full_name, email)').eq('family_id', familyId).order('joined_at'),
    ]);
    this.family = fRes.data;
    this.members = mRes.data || [];
    this.renderContent();
  },

  renderContent() {
    const role = Auth.currentFamily?.role || 'member';
    const isAdmin = role === 'admin';
    const inviteCode = this.family?.id?.slice(0, 8).toUpperCase() || '--------';
    const myId = Auth.currentUser?.id;

    document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Espace Famille</h1>
        <p class="page-sub">Gérez les membres et accès de votre famille</p>
      </div>
      ${isAdmin ? `<button class="btn btn--primary" onclick="Family.showInvite()"><i data-lucide="user-plus"></i> Inviter</button>` : ''}
    </div>

    <!-- Carte famille -->
    <div class="family-hero">
      <div class="family-hero__icon"><i data-lucide="users"></i></div>
      <div class="family-hero__info">
        <h2 class="family-hero__name">${this.family?.name || 'Ma Famille'}</h2>
        <p class="family-hero__meta">${this.members.length} membre(s) · Créée le ${Utils.dateShort(this.family?.created_at)}</p>
      </div>
      <div class="family-hero__stats">
        <div class="fh-stat"><div class="fh-stat__val">${this.members.length}</div><div class="fh-stat__lbl">Membres</div></div>
        <div class="fh-stat"><div class="fh-stat__val">${this.members.filter(m=>m.role==='admin').length}</div><div class="fh-stat__lbl">Admins</div></div>
        <div class="fh-stat"><div class="fh-stat__val">${this.members.filter(m=>m.role==='member').length}</div><div class="fh-stat__lbl">Membres simples</div></div>
      </div>
    </div>

    <!-- Code d'invitation (admin) -->
    ${isAdmin ? `
    <div class="card">
      <div class="card-header"><h2 class="card-title"><i data-lucide="link"></i> Code d'invitation</h2></div>
      <div class="invite-box">
        <div class="invite-code" id="invite-code">${inviteCode}</div>
        <button class="btn btn--primary" onclick="Family.copyCode('${inviteCode}')">
          <i data-lucide="copy"></i> Copier le code
        </button>
      </div>
      <p class="invite-hint">Partagez ce code avec les personnes que vous souhaitez inviter. Elles devront créer un compte puis entrer ce code.</p>
    </div>` : ''}

    <!-- Liste des membres -->
    <div class="card">
      <div class="card-header"><h2 class="card-title"><i data-lucide="users"></i> Membres</h2></div>
      <div class="member-list">
        ${this.members.map(m => {
          const profile = m.profiles || {};
          const name = profile.full_name || profile.email || 'Utilisateur';
          const email = profile.email || '—';
          const isMe = m.user_id === myId;
          const roleBadge = {
            admin: '<span class="badge badge--yellow">👑 Admin</span>',
            manager: '<span class="badge badge--blue">🛡️ Gestionnaire</span>',
            member: '<span class="badge" style="background:var(--bg-secondary);color:var(--text-muted)">👤 Membre</span>',
          }[m.role] || '';
          return `<div class="member-item">
            <div class="member-avatar" style="background:${Utils.avatarColor(email)}">${Utils.initials(profile.full_name, email)}</div>
            <div class="member-info">
              <div class="member-name">${name}${isMe ? ' <span class="badge badge--green">Vous</span>' : ''}</div>
              <div class="member-email">${email}</div>
              <div class="member-since">Membre depuis ${Utils.dateShort(m.joined_at)}</div>
            </div>
            <div class="member-actions">
              ${roleBadge}
              ${isAdmin && !isMe ? `
              <select class="form-input form-input--sm" onchange="Family.changeRole('${m.id}', this.value)">
                <option value="member" ${m.role==='member'?'selected':''}>Membre</option>
                <option value="manager" ${m.role==='manager'?'selected':''}>Gestionnaire</option>
                <option value="admin" ${m.role==='admin'?'selected':''}>Admin</option>
              </select>
              <button class="btn-icon btn-icon--danger" onclick="Family.removeMember('${m.id}')" title="Retirer"><i data-lucide="user-x"></i></button>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Guide des rôles -->
    <div class="card">
      <div class="card-header"><h2 class="card-title"><i data-lucide="shield"></i> Guide des rôles</h2></div>
      <div class="roles-grid">
        ${[
          { label:'👑 Admin', color:'#f59e0b', perms:['Gérer les membres','Inviter / retirer','Modifier les rôles','Toutes les actions'] },
          { label:'🛡️ Gestionnaire', color:'#3b82f6', perms:['Ajouter / modifier données','Voir tous les rapports','Gérer les budgets','Pas de gestion membres'] },
          { label:'👤 Membre', color:'#6b7280', perms:['Ajouter ses dépenses','Voir son tableau de bord','Accès lecture rapports','Accès limité'] },
        ].map(r => `<div class="role-card" style="border-color:${r.color}30">
          <div class="role-card__title" style="color:${r.color}">${r.label}</div>
          <ul class="role-card__list">
            ${r.perms.map(p => `<li>✓ ${p}</li>`).join('')}
          </ul>
        </div>`).join('')}
      </div>
    </div>`;

    if (window.lucide) lucide.createIcons();
  },

  copyCode(code) {
    navigator.clipboard?.writeText(code).catch(() => {});
    Utils.toast('Code d\'invitation copié ! ' + code, 'success');
  },

  showInvite() {
    const code = this.family?.id?.slice(0, 8).toUpperCase();
    Components.showModal(`
    <div class="modal">
      <div class="modal-header">
        <h3>Inviter un membre</h3>
        <button onclick="closeModal()"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        <p class="text-muted mb-4">Partagez ce code avec la personne à inviter. Elle devra créer un compte sur <strong>famille.chan-pro.com</strong> et entrer ce code lors de l'onboarding.</p>
        <div class="invite-box">
          <div class="invite-code">${code}</div>
          <button class="btn btn--primary" onclick="Family.copyCode('${code}');closeModal()">
            <i data-lucide="copy"></i> Copier et fermer
          </button>
        </div>
        <div class="alert alert--info" style="margin-top:1rem">
          💡 L'invité devra : <strong>1)</strong> Créer un compte → <strong>2)</strong> Entrer le code <strong>${code}</strong> lors de la création de famille
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn--ghost" onclick="closeModal()">Fermer</button>
      </div>
    </div>`);
  },

  async changeRole(memberId, newRole) {
    const { error } = await db.from('family_members').update({ role: newRole }).eq('id', memberId);
    if (error) { Utils.toast('Erreur : ' + error.message, 'error'); return; }
    Utils.toast('Rôle mis à jour !', 'success');
    await this.load();
  },

  async removeMember(memberId) {
    if (!confirm('Retirer ce membre de la famille ?')) return;
    const { error } = await db.from('family_members').delete().eq('id', memberId);
    if (error) { Utils.toast('Erreur : ' + error.message, 'error'); return; }
    Utils.toast('Membre retiré', 'info');
    await this.load();
  },
};
window.Family = Family;
