// =====================================================
// Family Cash Flow — Family Space Page
// =====================================================

async function loadFamilyPage() {
  AppState.currentPage = 'family';

  const members = [
    { id:'m1', name:'Ahmed Benali',  email:'ahmed@famille.ma',  role:'admin',  joined:'2024-01-15', avatar:'A', color:'#2563EB' },
    { id:'m2', name:'Fatima Benali', email:'fatima@famille.ma', role:'member', joined:'2024-01-20', avatar:'F', color:'#10B981' },
    { id:'m3', name:'Youssef Benali',email:'youssef@gmail.com', role:'reader', joined:'2024-03-10', avatar:'Y', color:'#F59E0B' },
  ];

  const inviteCode = AppState.family?.invitation_code || 'BEN-2024';
  const familyName = AppState.family?.name || 'Famille Benali';

  const roleLabels = { admin:'Administrateur', member:'Membre', reader:'Lecture seule' };
  const roleColors = { admin:'badge-blue', member:'badge-green', reader:'badge-gray' };

  const html = `
  <div class="fade-in">

    <!-- Family Info Card -->
    <div class="card" style="margin-bottom:20px;background:linear-gradient(135deg,#2563EB 0%,#1D4ED8 60%,#059669 100%);border:none;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
        <div style="color:white;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;opacity:0.75;margin-bottom:4px;">
            Espace Famille
          </div>
          <div style="font-size:24px;font-weight:800;margin-bottom:4px;">${familyName}</div>
          <div style="font-size:13px;opacity:0.8;">
            <i class="fas fa-users"></i> ${members.length} membre(s) · Créé en janvier 2024
          </div>
        </div>
        <div style="text-align:center;background:rgba(255,255,255,0.15);padding:16px 20px;border-radius:var(--radius-lg);backdrop-filter:blur(8px);">
          <div style="font-size:11px;color:rgba(255,255,255,0.75);font-weight:600;margin-bottom:6px;letter-spacing:0.05em;">
            CODE D'INVITATION
          </div>
          <div style="font-size:24px;font-weight:800;color:white;letter-spacing:0.1em;font-family:monospace;">
            ${inviteCode}
          </div>
          <button onclick="copyInviteCode('${inviteCode}')"
                  style="margin-top:8px;background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.3);
                         padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:5px;margin:8px auto 0;">
            <i class="fas fa-copy"></i> Copier
          </button>
        </div>
      </div>
    </div>

    <div class="grid-2">

      <!-- Members list -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-users" style="color:var(--primary);"></i> Membres (${members.length})</div>
          ${AppState.familyRole === 'admin' ? `
          <button class="btn btn-primary btn-sm" onclick="openInviteModal()">
            <i class="fas fa-user-plus"></i> Inviter
          </button>` : ''}
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;">
          ${members.map(m => `
          <div class="member-card">
            <div class="member-avatar" style="background:linear-gradient(135deg,${m.color},${m.color}99);">
              ${m.avatar}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:14px;font-weight:600;color:var(--text);">
                ${m.name}
                ${m.id === 'm1' ? '<span style="font-size:10px;color:var(--text-muted);margin-left:4px;">(vous)</span>' : ''}
              </div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:1px;">
                ${m.email}
              </div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">
                Membre depuis ${formatDateLong(m.joined)}
              </div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
              <span class="badge ${roleColors[m.role]}">${roleLabels[m.role]}</span>
              ${AppState.familyRole === 'admin' && m.id !== 'm1' ? `
              <div style="display:flex;gap:4px;">
                <button class="btn btn-ghost btn-sm" style="font-size:11px;padding:3px 8px;" onclick="changeRole('${m.id}', '${m.name}')">
                  <i class="fas fa-edit" style="font-size:10px;"></i> Rôle
                </button>
                <button class="btn btn-ghost btn-sm btn-icon" onclick="removeMember('${m.id}','${m.name}')" data-tooltip="Retirer">
                  <i class="fas fa-times" style="color:var(--danger);font-size:11px;"></i>
                </button>
              </div>` : ''}
            </div>
          </div>`).join('')}
        </div>
      </div>

      <!-- Right column -->
      <div>

        <!-- Roles explanation -->
        <div class="card" style="margin-bottom:16px;">
          <div class="card-header">
            <div class="card-title"><i class="fas fa-shield-halved" style="color:var(--accent);"></i> Rôles & Permissions</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:flex-start;gap:10px;padding:10px;background:var(--primary-bg);border-radius:var(--radius);">
              <span class="badge badge-blue">Administrateur</span>
              <div style="font-size:12px;color:var(--text-secondary);">
                Accès complet : gérer les membres, modifier les données, configurer l'espace famille
              </div>
            </div>
            <div style="display:flex;align-items:flex-start;gap:10px;padding:10px;background:var(--secondary-bg);border-radius:var(--radius);">
              <span class="badge badge-green">Membre</span>
              <div style="font-size:12px;color:var(--text-secondary);">
                Peut ajouter/modifier/supprimer des transactions, abonnements et crédits
              </div>
            </div>
            <div style="display:flex;align-items:flex-start;gap:10px;padding:10px;background:var(--bg-hover);border-radius:var(--radius);">
              <span class="badge badge-gray">Lecture seule</span>
              <div style="font-size:12px;color:var(--text-secondary);">
                Peut consulter les données mais ne peut pas les modifier
              </div>
            </div>
          </div>
        </div>

        <!-- Family stats -->
        <div class="card" style="margin-bottom:16px;">
          <div class="card-header">
            <div class="card-title"><i class="fas fa-chart-bar" style="color:var(--primary);"></i> Statistiques famille</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            ${[
              { icon:'💰', label:'Revenus avril', value:'19 500 DH', color:'var(--secondary)' },
              { icon:'🛒', label:'Dépenses avril', value:'10 600 DH', color:'var(--danger)' },
              { icon:'📱', label:'Abonnements', value:'5 actifs', color:'var(--primary)' },
              { icon:'🏦', label:'Crédits actifs', value:'2 en cours', color:'var(--accent)' },
            ].map(s => `
            <div style="padding:12px;background:var(--bg-hover);border-radius:var(--radius);text-align:center;">
              <div style="font-size:20px;margin-bottom:4px;">${s.icon}</div>
              <div style="font-size:15px;font-weight:700;color:${s.color};">${s.value}</div>
              <div style="font-size:11px;color:var(--text-muted);">${s.label}</div>
            </div>`).join('')}
          </div>
        </div>

        <!-- Danger zone -->
        ${AppState.familyRole === 'admin' ? `
        <div class="card" style="border-color:var(--danger);">
          <div class="card-header">
            <div class="card-title" style="color:var(--danger);"><i class="fas fa-triangle-exclamation"></i> Zone dangereuse</div>
          </div>
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">
            Ces actions sont irréversibles. Agissez avec prudence.
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <button class="btn btn-ghost" style="border-color:var(--danger);color:var(--danger);justify-content:flex-start;"
                    onclick="alert('Fonctionnalité disponible avec Supabase configuré')">
              <i class="fas fa-rotate"></i> Réinitialiser les données du mois
            </button>
            <button class="btn btn-ghost" style="border-color:var(--danger);color:var(--danger);justify-content:flex-start;"
                    onclick="alert('Fonctionnalité disponible avec Supabase configuré')">
              <i class="fas fa-trash-can"></i> Supprimer l'espace famille
            </button>
          </div>
        </div>` : ''}

      </div>
    </div>

  </div>

  <!-- Invite Modal -->
  <div class="modal-overlay" id="invite-modal">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Inviter un membre</h3>
        <button class="modal-close" onclick="el('invite-modal').classList.remove('open')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="alert alert-info" style="margin-bottom:16px;">
          <span class="alert-icon">ℹ️</span>
          <div>Partagez le code <strong>${inviteCode}</strong> ou envoyez une invitation par email</div>
        </div>
        <div class="form-group">
          <label class="form-label">Email du membre à inviter</label>
          <input type="email" id="invite-email" class="form-input" placeholder="exemple@email.com">
        </div>
        <div class="form-group">
          <label class="form-label">Rôle</label>
          <select id="invite-role" class="form-select">
            <option value="member">Membre</option>
            <option value="reader">Lecture seule</option>
          </select>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px;">
          <button class="btn btn-ghost" onclick="el('invite-modal').classList.remove('open')">Annuler</button>
          <button class="btn btn-primary" onclick="sendInvite()">
            <i class="fas fa-paper-plane"></i> Envoyer l'invitation
          </button>
        </div>
      </div>
    </div>
  </div>`;

  renderLayout(html, 'Espace Famille', familyName);
}

function copyInviteCode(code) {
  navigator.clipboard?.writeText(code).then(() => {
    showToast(`Code "${code}" copié dans le presse-papiers !`, 'success');
  }).catch(() => {
    showToast(`Code : ${code}`, 'info');
  });
}

function openInviteModal() {
  el('invite-modal')?.classList.add('open');
}

function sendInvite() {
  const email = el('invite-email')?.value;
  const role  = el('invite-role')?.value;
  if (!email) { showToast('Entrez un email', 'error'); return; }
  el('invite-modal')?.classList.remove('open');
  showToast(`Invitation envoyée à ${email} !`, 'success');
}

function changeRole(memberId, memberName) {
  const newRole = prompt(`Nouveau rôle pour ${memberName} :\n- admin (Administrateur)\n- member (Membre)\n- reader (Lecture seule)`, 'member');
  if (['admin','member','reader'].includes(newRole)) {
    showToast(`Rôle de ${memberName} mis à jour !`, 'success');
  }
}

function removeMember(memberId, memberName) {
  if (confirm(`Retirer ${memberName} de la famille ?`)) {
    showToast(`${memberName} a été retiré`, 'info');
  }
}
