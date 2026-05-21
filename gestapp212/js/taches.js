/* ============================================================
   GestionApp 212 — Tâches Module
   ============================================================ */
function renderTaches() {
  const taches = getCompanyData('taches');
  const today  = new Date().toISOString().split('T')[0];

  const todo    = taches.filter(t => t.statut === 'todo');
  const enCours = taches.filter(t => t.statut === 'en-cours');
  const done    = taches.filter(t => t.statut === 'done');

  const prioriteClass = { haute:'badge-danger', moyenne:'badge-warning', basse:'badge-success' };
  const prioriteLabel = { haute:'🔴 Haute', moyenne:'🟡 Moyenne', basse:'🟢 Basse' };
  const moduleLabel   = { devis:'Devis', facture:'Facture', chantier:'Chantier', autre:'Autre' };

  function tacheCard(t) {
    const isLate = t.echeance && t.echeance < today && t.statut !== 'done';
    return `
    <div class="kanban-card" style="${isLate?'border-left:3px solid var(--danger)':''}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px">
        <div style="font-size:13px;font-weight:600;flex:1">${esc(t.titre)}</div>
        <span class="badge ${prioriteClass[t.priorite]||'badge-secondary'}" style="font-size:10px">${prioriteLabel[t.priorite]||t.priorite}</span>
      </div>
      ${t.description||t.desc ? `<div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px">${esc(t.description||t.desc)}</div>` : ''}
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px">
        <div style="font-size:10px;color:var(--text-muted)">
          ${t.assigne||t.assignee ? `<i class="fas fa-user"></i> ${esc(t.assigne||t.assignee)}` : ''}
          ${t.echeance||t.due_date ? `&nbsp;<i class="fas fa-calendar ${isLate?'text-danger':''}"></i> <span style="${isLate?'color:var(--danger);font-weight:600':''}">${formatDate(t.echeance||t.due_date)}</span>` : ''}
        </div>
        <div style="display:flex;gap:4px">
          ${t.statut !== 'done' ? `<button class="btn btn-ghost btn-sm" style="padding:3px 7px;font-size:10px" onclick="moveTache('${t.id}','done')"><i class="fas fa-check"></i></button>` : ''}
          <button class="btn btn-ghost btn-sm" style="padding:3px 7px;font-size:10px" onclick="openTacheModal('${t.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-ghost btn-sm" style="padding:3px 7px;font-size:10px;color:var(--danger)" onclick="deleteTache('${t.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>`;
  }

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title"><i class="fas fa-tasks"></i> Tâches</div>
        <div class="page-subtitle">Gestion des tâches par priorité et statut</div>
      </div>
      <button class="btn btn-primary" onclick="openTacheModal()">
        <i class="fas fa-plus"></i> Nouvelle tâche
      </button>
    </div>

    <!-- Stats -->
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:24px">
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#fdecea;color:#e74c3c"><i class="fas fa-exclamation-circle"></i></div>
        <div class="kpi-info"><div class="kpi-value">${taches.filter(t=>t.priorite==='haute'&&t.statut!=='done').length}</div><div class="kpi-label">Haute priorité</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#fef9e7;color:#f39c12"><i class="fas fa-hourglass-half"></i></div>
        <div class="kpi-info"><div class="kpi-value">${enCours.length}</div><div class="kpi-label">En cours</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#d5f5e3;color:#27ae60"><i class="fas fa-check-circle"></i></div>
        <div class="kpi-info"><div class="kpi-value">${done.length}</div><div class="kpi-label">Terminées</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#fdecea;color:#e74c3c"><i class="fas fa-calendar-times"></i></div>
        <div class="kpi-info"><div class="kpi-value">${taches.filter(t=>t.echeance&&t.echeance<today&&t.statut!=='done').length}</div><div class="kpi-label">En retard</div></div>
      </div>
    </div>

    <!-- Kanban -->
    <div class="kanban-board">
      <div class="kanban-col">
        <div class="kanban-col-header" style="border-color:#95a5a6;color:#7f8c8d">
          <span>📋 À faire (${todo.length})</span>
        </div>
        <div class="kanban-cards">
          ${todo.length ? todo.map(tacheCard).join('') : '<div style="text-align:center;padding:20px;font-size:12px;color:var(--text-muted)">Aucune tâche</div>'}
        </div>
      </div>
      <div class="kanban-col">
        <div class="kanban-col-header" style="border-color:#f39c12;color:#e08e0b">
          <span>⏳ En cours (${enCours.length})</span>
        </div>
        <div class="kanban-cards">
          ${enCours.length ? enCours.map(tacheCard).join('') : '<div style="text-align:center;padding:20px;font-size:12px;color:var(--text-muted)">Aucune tâche</div>'}
        </div>
      </div>
      <div class="kanban-col" style="opacity:.75">
        <div class="kanban-col-header" style="border-color:#27ae60;color:#229a54">
          <span>✅ Terminées (${done.length})</span>
        </div>
        <div class="kanban-cards">
          ${done.length ? done.map(tacheCard).join('') : '<div style="text-align:center;padding:20px;font-size:12px;color:var(--text-muted)">Aucune</div>'}
        </div>
      </div>
    </div>`;
}

function openTacheModal(id = null) {
  const taches = getCompanyData('taches');
  const t = id ? taches.find(t=>t.id===id) : null;
  const today = new Date().toISOString().split('T')[0];

  showModal(`
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal-box">
        <div class="modal-header">
          <span><i class="fas fa-tasks" style="color:var(--accent)"></i> ${t ? 'Modifier' : 'Nouvelle'} tâche</span>
          <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label required">Titre</label>
            <input id="ta-titre" class="form-control" type="text" value="${esc(t?.titre||'')}" placeholder="Titre de la tâche"/>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Priorité</label>
              <select id="ta-prio" class="form-control">
                ${['haute','moyenne','basse'].map(p=>`<option value="${p}" ${(t?.priorite||'moyenne')===p?'selected':''}>${{haute:'🔴 Haute',moyenne:'🟡 Moyenne',basse:'🟢 Basse'}[p]}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Statut</label>
              <select id="ta-statut" class="form-control">
                ${['todo','en-cours','done'].map(s=>`<option value="${s}" ${(t?.statut||'todo')===s?'selected':''}>${{todo:'À faire','en-cours':'En cours',done:'Terminée'}[s]}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Assigné à</label>
              <input id="ta-assigne" class="form-control" type="text" value="${esc(t?.assigne||t?.assignee||'')}" placeholder="Nom…"/>
            </div>
            <div class="form-group">
              <label class="form-label">Échéance</label>
              <input id="ta-echeance" class="form-control" type="date" value="${t?.echeance||t?.due_date||today}"/>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea id="ta-desc" class="form-control" rows="3">${esc(t?.description||t?.desc||'')}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
          <button class="btn btn-primary" onclick="saveTache('${id||''}')"><i class="fas fa-save"></i> Enregistrer</button>
        </div>
      </div>
    </div>`);
}

function saveTache(id) {
  const titre = document.getElementById('ta-titre').value.trim();
  if (!titre) { showToast('Titre requis', 'error'); return; }
  const obj = {
    id: id || 'ta-' + Date.now(),
    company_id: App.currentCompany?.id||'c1', companyId: App.currentCompany?.id||'c1',
    titre, statut: document.getElementById('ta-statut').value,
    priorite: document.getElementById('ta-prio').value,
    assigne: document.getElementById('ta-assigne').value.trim(),
    assignee: document.getElementById('ta-assigne').value.trim(),
    echeance: document.getElementById('ta-echeance').value,
    due_date: document.getElementById('ta-echeance').value,
    description: document.getElementById('ta-desc').value.trim(),
    desc: document.getElementById('ta-desc').value.trim(),
    created_at: new Date().toISOString().split('T')[0],
  };
  if (!App.data.taches) App.data.taches = [];
  if (id) { const i=App.data.taches.findIndex(t=>t.id===id); if(i>=0) App.data.taches[i]=obj; }
  else App.data.taches.push(obj);
  closeModal();
  showToast(id?'Tâche modifiée':'Tâche ajoutée', 'success');
  renderTaches();
}

function moveTache(id, statut) {
  if (!App.data.taches) return;
  const t = App.data.taches.find(t=>t.id===id);
  if (t) { t.statut = statut; renderTaches(); }
}

function deleteTache(id) {
  if (!confirm('Supprimer cette tâche ?')) return;
  App.data.taches = (App.data.taches||[]).filter(t=>t.id!==id);
  showToast('Tâche supprimée', 'success');
  renderTaches();
}
