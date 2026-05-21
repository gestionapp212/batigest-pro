/* ============================================================
   GestionApp 212 — Agenda Module
   ============================================================ */
function renderAgenda() {
  const agenda = getCompanyData('agenda');
  const today  = new Date();
  const now    = today.toISOString().split('T')[0];

  // Trier par date
  const sorted = [...agenda].sort((a,b) => (a.date||'').localeCompare(b.date||''));
  const upcoming = sorted.filter(e => (e.date||'') >= now);
  const past     = sorted.filter(e => (e.date||'') < now);

  const typeColors = { chantier:'#27ae60', rdv:'#2980b9', echeance:'#e74c3c', tache:'#f39c12', autre:'#8e44ad' };
  const typeLabels = { chantier:'Chantier', rdv:'RDV', echeance:'Échéance', tache:'Tâche', autre:'Autre' };

  function evtCard(e) {
    const isPast = e.date < now;
    const colorBg = e.color || e.couleur || typeColors[e.type] || '#95a5a6';
    return `
    <div class="card" style="margin-bottom:10px;border-left:4px solid ${colorBg};opacity:${isPast?.7:1}">
      <div style="padding:14px 16px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span class="badge" style="background:${colorBg}20;color:${colorBg}">${typeLabels[e.type]||e.type}</span>
            ${isPast ? '<span class="badge badge-secondary">Passé</span>' : ''}
          </div>
          <div style="font-weight:600;font-size:14px;color:var(--text-primary)">${esc(e.titre||e.title)}</div>
          ${e.description ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:3px">${esc(e.description)}</div>` : ''}
          <div style="margin-top:6px;display:flex;align-items:center;gap:12px;font-size:12px;color:var(--text-muted)">
            <span><i class="fas fa-calendar" style="color:${colorBg}"></i> ${formatDate(e.date)}</span>
            ${e.heure ? `<span><i class="fas fa-clock"></i> ${e.heure}</span>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn btn-ghost btn-sm" onclick="editAgendaEvent('${e.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="deleteAgendaEvent('${e.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>`;
  }

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title"><i class="fas fa-calendar-alt"></i> Agenda</div>
        <div class="page-subtitle">Planification et suivi des événements</div>
      </div>
      <button class="btn btn-primary" onclick="openAgendaModal()">
        <i class="fas fa-plus"></i> Nouvel événement
      </button>
    </div>

    <!-- KPIs rapides -->
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#fef9e7;color:#f39c12"><i class="fas fa-calendar-day"></i></div>
        <div class="kpi-info"><div class="kpi-value">${upcoming.length}</div><div class="kpi-label">À venir</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#d6eaf8;color:#2980b9"><i class="fas fa-handshake"></i></div>
        <div class="kpi-info"><div class="kpi-value">${agenda.filter(e=>e.type==='rdv').length}</div><div class="kpi-label">RDV</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#fdecea;color:#e74c3c"><i class="fas fa-exclamation-circle"></i></div>
        <div class="kpi-info"><div class="kpi-value">${upcoming.filter(e=>e.type==='echeance').length}</div><div class="kpi-label">Échéances</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#d5f5e3;color:#27ae60"><i class="fas fa-hard-hat"></i></div>
        <div class="kpi-info"><div class="kpi-value">${agenda.filter(e=>e.type==='chantier').length}</div><div class="kpi-label">Chantiers</div></div>
      </div>
    </div>

    <div class="grid-2">
      <!-- Événements à venir -->
      <div>
        <h3 style="font-size:15px;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px">
          <i class="fas fa-arrow-right" style="color:var(--accent)"></i> À venir (${upcoming.length})
        </h3>
        ${upcoming.length === 0
          ? `<div class="empty-state" style="padding:40px 20px"><i class="fas fa-calendar-check"></i><p>Aucun événement à venir</p></div>`
          : upcoming.map(evtCard).join('')}
      </div>
      <!-- Événements passés -->
      <div>
        <h3 style="font-size:15px;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px;color:var(--text-muted)">
          <i class="fas fa-history"></i> Passés (${past.length})
        </h3>
        ${past.length === 0
          ? `<div class="empty-state" style="padding:40px 20px"><i class="fas fa-calendar"></i><p>Aucun événement passé</p></div>`
          : past.slice(-5).reverse().map(evtCard).join('')}
      </div>
    </div>`;
}

function openAgendaModal(evtId = null) {
  const events = getCompanyData('agenda');
  const evt = evtId ? events.find(e=>e.id===evtId) : null;
  const today = new Date().toISOString().split('T')[0];
  const typeColors = { chantier:'#27ae60', rdv:'#2980b9', echeance:'#e74c3c', tache:'#f39c12', autre:'#8e44ad' };

  const html = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal-box">
        <div class="modal-header">
          <span><i class="fas fa-calendar-plus" style="color:var(--accent)"></i> ${evt ? 'Modifier' : 'Nouvel'} événement</span>
          <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label required">Titre</label>
              <input id="ag-titre" class="form-control" type="text" value="${esc(evt?.titre||evt?.title||'')}" placeholder="Ex: RDV client Hassan Benali"/>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label required">Type</label>
              <select id="ag-type" class="form-control">
                ${['rdv','chantier','echeance','tache','autre'].map(t =>
                  `<option value="${t}" ${(evt?.type||'rdv')===t?'selected':''}>${{rdv:'RDV',chantier:'Chantier',echeance:'Échéance',tache:'Tâche',autre:'Autre'}[t]}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label required">Date</label>
              <input id="ag-date" class="form-control" type="date" value="${evt?.date||today}"/>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Heure</label>
              <input id="ag-heure" class="form-control" type="time" value="${evt?.heure||''}"/>
            </div>
            <div class="form-group">
              <label class="form-label">Couleur</label>
              <select id="ag-color" class="form-control">
                ${Object.entries(typeColors).map(([k,v]) =>
                  `<option value="${v}" ${(evt?.color||evt?.couleur||v)===v?'selected':''}>${{rdv:'RDV Bleu',chantier:'Chantier Vert',echeance:'Échéance Rouge',tache:'Tâche Orange',autre:'Autre Violet'}[k]}</option>`
                ).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea id="ag-desc" class="form-control" rows="3" placeholder="Notes…">${esc(evt?.description||'')}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
          <button class="btn btn-primary" onclick="saveAgendaEvent('${evtId||''}')">
            <i class="fas fa-save"></i> Enregistrer
          </button>
        </div>
      </div>
    </div>`;
  showModal(html);
}

function editAgendaEvent(id) { openAgendaModal(id); }

function saveAgendaEvent(id) {
  const titre = document.getElementById('ag-titre').value.trim();
  const date  = document.getElementById('ag-date').value;
  if (!titre || !date) { showToast('Titre et date requis', 'error'); return; }

  const newEvt = {
    id:          id || 'ag-' + Date.now(),
    company_id:  App.currentCompany?.id || 'c1',
    companyId:   App.currentCompany?.id || 'c1',
    titre, title: titre,
    type:        document.getElementById('ag-type').value,
    date,
    heure:       document.getElementById('ag-heure').value || '',
    description: document.getElementById('ag-desc').value.trim(),
    color:       document.getElementById('ag-color').value,
    couleur:     document.getElementById('ag-color').value,
    custom:      true,
    created_at:  new Date().toISOString().split('T')[0],
  };

  if (!App.data.agenda) App.data.agenda = [];
  if (id) {
    const idx = App.data.agenda.findIndex(e=>e.id===id);
    if (idx >= 0) App.data.agenda[idx] = newEvt;
  } else {
    App.data.agenda.push(newEvt);
  }

  closeModal();
  showToast(id ? 'Événement modifié' : 'Événement ajouté', 'success');
  renderAgenda();
}

function deleteAgendaEvent(id) {
  if (!confirm('Supprimer cet événement ?')) return;
  if (!App.data.agenda) return;
  App.data.agenda = App.data.agenda.filter(e=>e.id!==id);
  showToast('Événement supprimé', 'success');
  renderAgenda();
}

/* Les helpers (esc, formatDate, formatMAD, etc.) sont définis dans utils.js */
