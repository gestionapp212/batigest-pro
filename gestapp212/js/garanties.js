/* ============================================================
   GestionApp 212 — Garanties & SAV Module
   ============================================================ */
function renderGaranties() {
  const garanties    = getCompanyData('garanties');
  const reclamations = getCompanyData('reclamations');
  const today = new Date().toISOString().split('T')[0];

  const expirantes = garanties.filter(g => {
    const fin = g.date_fin || g.dateFin;
    if (!fin) return false;
    const diff = (new Date(fin) - new Date()) / 86400000;
    return diff >= 0 && diff <= 90;
  });

  const typeLabel = { decennale:'Décennale (10 ans)', biennale:'Biennale (2 ans)', parfait_achevement:'Parfait achèvement (1 an)', autre:'Autre' };
  const prioriteClass = { haute:'badge-danger', moyenne:'badge-warning', basse:'badge-success' };
  const statutReclClass = { ouvert:'badge-danger', en_cours:'badge-warning', resolu:'badge-success', ferme:'badge-secondary' };
  const statutReclLabel = { ouvert:'Ouvert', en_cours:'En cours', resolu:'Résolu', ferme:'Fermé' };

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title"><i class="fas fa-shield-alt"></i> Garanties & SAV</div>
        <div class="page-subtitle">Suivi des garanties et réclamations clients</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" onclick="openGarantieModal()"><i class="fas fa-plus"></i> Garantie</button>
        <button class="btn btn-primary" onclick="openReclamationModal()"><i class="fas fa-plus"></i> Réclamation</button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#d5f5e3;color:#27ae60"><i class="fas fa-shield-alt"></i></div>
        <div class="kpi-info"><div class="kpi-value">${garanties.length}</div><div class="kpi-label">Garanties actives</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#fef9e7;color:#f39c12"><i class="fas fa-calendar-times"></i></div>
        <div class="kpi-info"><div class="kpi-value">${expirantes.length}</div><div class="kpi-label">Expirent dans 90j</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#fdecea;color:#e74c3c"><i class="fas fa-exclamation-circle"></i></div>
        <div class="kpi-info"><div class="kpi-value">${reclamations.filter(r=>r.statut==='ouvert').length}</div><div class="kpi-label">Réclamations ouvertes</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#d6eaf8;color:#2980b9"><i class="fas fa-check-circle"></i></div>
        <div class="kpi-info"><div class="kpi-value">${reclamations.filter(r=>r.statut==='resolu').length}</div><div class="kpi-label">Réclamations résolues</div></div>
      </div>
    </div>

    ${expirantes.length > 0 ? `
    <div class="alert alert-warning">
      <i class="fas fa-exclamation-triangle"></i>
      <div><strong>Attention !</strong> ${expirantes.length} garantie(s) expirent dans moins de 90 jours.</div>
    </div>` : ''}

    <!-- Garanties -->
    <div class="card mb-16" style="margin-bottom:20px">
      <div class="card-header"><strong>Garanties (${garanties.length})</strong></div>
      ${garanties.length === 0
        ? '<div class="empty-state"><i class="fas fa-shield-alt"></i><p>Aucune garantie enregistrée</p></div>'
        : `<div class="table-responsive"><table>
          <thead><tr><th>Chantier</th><th>Client</th><th>Type</th><th>Début</th><th>Fin</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>
          ${garanties.map(g => {
            const fin = g.date_fin||g.dateFin;
            const diff = fin ? Math.floor((new Date(fin)-new Date())/86400000) : null;
            const expiresBientot = diff !== null && diff >= 0 && diff <= 90;
            const expire = diff !== null && diff < 0;
            return `<tr>
              <td style="font-weight:600">${esc(g.chantier_nom||g.chantierNom||'—')}</td>
              <td>${esc(g.client_nom||g.clientNom||'—')}</td>
              <td><span class="badge badge-info">${typeLabel[g.type]||g.type}</span></td>
              <td>${formatDate(g.date_debut||g.dateDebut)}</td>
              <td style="${expiresBientot?'color:var(--warning);font-weight:600':''} ${expire?'color:var(--danger);font-weight:600':''}">${formatDate(fin)}</td>
              <td>${expire?'<span class="badge badge-danger">Expirée</span>':expiresBientot?'<span class="badge badge-warning">Expire bientôt</span>':'<span class="badge badge-success">Active</span>'}</td>
              <td>
                <button class="btn btn-ghost btn-sm" onclick="openGarantieModal('${g.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="deleteGarantie('${g.id}')"><i class="fas fa-trash"></i></button>
              </td>
            </tr>`;
          }).join('')}
          </tbody>
        </table></div>`}
    </div>

    <!-- Réclamations -->
    <div class="card">
      <div class="card-header"><strong>Réclamations SAV (${reclamations.length})</strong></div>
      ${reclamations.length === 0
        ? '<div class="empty-state"><i class="fas fa-comments"></i><p>Aucune réclamation</p></div>'
        : `<div class="table-responsive"><table>
          <thead><tr><th>Client</th><th>Chantier</th><th>Description</th><th>Priorité</th><th>Statut</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
          ${reclamations.map(r => `<tr>
            <td style="font-weight:600">${esc(r.client_nom||r.clientNom||'—')}</td>
            <td>${esc(r.chantier_nom||r.chantierNom||'—')}</td>
            <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.description||'—')}</td>
            <td><span class="badge ${prioriteClass[r.priorite]||'badge-secondary'}">${r.priorite||'—'}</span></td>
            <td><span class="badge ${statutReclClass[r.statut]||'badge-secondary'}">${statutReclLabel[r.statut]||r.statut}</span></td>
            <td>${formatDate(r.date||r.created_at)}</td>
            <td>
              <button class="btn btn-ghost btn-sm" onclick="openReclamationModal('${r.id}')"><i class="fas fa-edit"></i></button>
              <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="deleteReclamation('${r.id}')"><i class="fas fa-trash"></i></button>
            </td>
          </tr>`).join('')}
          </tbody>
        </table></div>`}
    </div>`;
}

function openGarantieModal(id=null) {
  const garanties = getCompanyData('garanties');
  const chantiers = getCompanyData('chantiers');
  const g = id ? garanties.find(x=>x.id===id) : null;
  const today = new Date().toISOString().split('T')[0];

  showModal(`
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal-box">
        <div class="modal-header">
          <span><i class="fas fa-shield-alt" style="color:var(--accent)"></i> ${g?'Modifier':'Nouvelle'} garantie</span>
          <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Chantier</label>
              <select id="ga-chantier" class="form-control" onchange="autoFillGarantie(this.value)">
                <option value="">— Sélectionner —</option>
                ${chantiers.map(c=>`<option value="${c.id}" ${(g?.chantier_id||g?.chantierId)===c.id?'selected':''}>${esc(c.nom)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Type de garantie</label>
              <select id="ga-type" class="form-control">
                ${['decennale','biennale','parfait_achevement','autre'].map(t=>
                  `<option value="${t}" ${(g?.type||'decennale')===t?'selected':''}>${{decennale:'Décennale (10 ans)',biennale:'Biennale (2 ans)',parfait_achevement:'Parfait achèvement (1 an)',autre:'Autre'}[t]}</option>`
                ).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Date début</label>
              <input id="ga-debut" class="form-control" type="date" value="${g?.date_debut||g?.dateDebut||today}"/>
            </div>
            <div class="form-group">
              <label class="form-label">Date fin</label>
              <input id="ga-fin" class="form-control" type="date" value="${g?.date_fin||g?.dateFin||''}"/>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea id="ga-desc" class="form-control" rows="3">${esc(g?.description||'')}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
          <button class="btn btn-primary" onclick="saveGarantie('${id||''}')"><i class="fas fa-save"></i> Enregistrer</button>
        </div>
      </div>
    </div>`);
}

function autoFillGarantie(chantierId) {
  const chantiers = getCompanyData('chantiers');
  const c = chantiers.find(x=>x.id===chantierId);
  if (c?.date_fin) document.getElementById('ga-debut').value = c.date_fin;
}

function saveGarantie(id) {
  const chantiers = getCompanyData('chantiers');
  const chantierId = document.getElementById('ga-chantier').value;
  const chantier   = chantiers.find(c=>c.id===chantierId);
  const obj = {
    id: id||'ga-'+Date.now(),
    company_id: App.currentCompany?.id||'c1',
    chantier_id: chantierId, chantierId,
    chantier_nom: chantier?.nom||'', chantierNom: chantier?.nom||'',
    client_nom: chantier?.client_nom||chantier?.clientNom||'', clientNom: chantier?.client_nom||chantier?.clientNom||'',
    type: document.getElementById('ga-type').value,
    date_debut: document.getElementById('ga-debut').value, dateDebut: document.getElementById('ga-debut').value,
    date_fin: document.getElementById('ga-fin').value, dateFin: document.getElementById('ga-fin').value,
    description: document.getElementById('ga-desc').value.trim(),
    created_at: new Date().toISOString().split('T')[0],
  };
  if (!App.data.garanties) App.data.garanties = [];
  if (id) { const i=App.data.garanties.findIndex(g=>g.id===id); if(i>=0)App.data.garanties[i]=obj; }
  else App.data.garanties.push(obj);
  closeModal();
  showToast(id?'Garantie modifiée':'Garantie ajoutée','success');
  renderGaranties();
}

function deleteGarantie(id) {
  if (!confirm('Supprimer cette garantie ?')) return;
  App.data.garanties=(App.data.garanties||[]).filter(g=>g.id!==id);
  showToast('Supprimé','success');
  renderGaranties();
}

function openReclamationModal(id=null) {
  const reclamations = getCompanyData('reclamations');
  const chantiers = getCompanyData('chantiers');
  const clients   = getCompanyData('clients');
  const r = id ? reclamations.find(x=>x.id===id) : null;

  showModal(`
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal-box">
        <div class="modal-header">
          <span><i class="fas fa-comments" style="color:var(--accent)"></i> ${r?'Modifier':'Nouvelle'} réclamation</span>
          <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Client</label>
              <select id="re-client" class="form-control">
                <option value="">— Sélectionner —</option>
                ${clients.map(c=>`<option value="${c.id}" ${(r?.client_id||r?.clientId)===c.id?'selected':''}>${esc(c.nom)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Chantier</label>
              <select id="re-chantier" class="form-control">
                <option value="">— Sélectionner —</option>
                ${chantiers.map(c=>`<option value="${c.id}" ${(r?.chantier_id||r?.chantierId)===c.id?'selected':''}>${esc(c.nom)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label required">Description du problème</label>
            <textarea id="re-desc" class="form-control" rows="3" placeholder="Décrivez le problème…">${esc(r?.description||'')}</textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Priorité</label>
              <select id="re-prio" class="form-control">
                ${['haute','moyenne','basse'].map(p=>`<option value="${p}" ${(r?.priorite||'moyenne')===p?'selected':''}>${{haute:'🔴 Haute',moyenne:'🟡 Moyenne',basse:'🟢 Basse'}[p]}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Statut</label>
              <select id="re-statut" class="form-control">
                ${['ouvert','en_cours','resolu','ferme'].map(s=>`<option value="${s}" ${(r?.statut||'ouvert')===s?'selected':''}>${{ouvert:'Ouvert',en_cours:'En cours',resolu:'Résolu',ferme:'Fermé'}[s]}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Solution apportée</label>
            <textarea id="re-solution" class="form-control" rows="2">${esc(r?.solution||'')}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
          <button class="btn btn-primary" onclick="saveReclamation('${id||''}')"><i class="fas fa-save"></i> Enregistrer</button>
        </div>
      </div>
    </div>`);
}

function saveReclamation(id) {
  const desc = document.getElementById('re-desc').value.trim();
  if (!desc) { showToast('Description requise','error'); return; }
  const chantiers = getCompanyData('chantiers');
  const clients   = getCompanyData('clients');
  const cliId     = document.getElementById('re-client').value;
  const chanId    = document.getElementById('re-chantier').value;
  const cli = clients.find(c=>c.id===cliId);
  const chan= chantiers.find(c=>c.id===chanId);
  const obj = {
    id: id||'rec-'+Date.now(),
    company_id: App.currentCompany?.id||'c1',
    client_id: cliId, clientId: cliId,
    client_nom: cli?.nom||'', clientNom: cli?.nom||'',
    chantier_id: chanId, chantierId: chanId,
    chantier_nom: chan?.nom||'', chantierNom: chan?.nom||'',
    description: desc,
    priorite: document.getElementById('re-prio').value,
    statut: document.getElementById('re-statut').value,
    solution: document.getElementById('re-solution').value.trim(),
    date: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString().split('T')[0],
  };
  if (!App.data.reclamations) App.data.reclamations = [];
  if (id) { const i=App.data.reclamations.findIndex(r=>r.id===id); if(i>=0)App.data.reclamations[i]=obj; }
  else App.data.reclamations.push(obj);
  closeModal();
  showToast(id?'Réclamation modifiée':'Réclamation créée','success');
  renderGaranties();
}

function deleteReclamation(id) {
  if (!confirm('Supprimer cette réclamation ?')) return;
  App.data.reclamations=(App.data.reclamations||[]).filter(r=>r.id!==id);
  showToast('Supprimé','success');
  renderGaranties();
}
