/* ============================================================
   CHANTIERS MODULE — v3.6 (Supabase persistence)
   Kanban, Employés, Prestataires, Achats, Photos, Journal
============================================================ */
function renderChantiers() {
  const chantiers = getCompanyData('chantiers');
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fas fa-hard-hat"></i> Chantiers</div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" onclick="chantiersView('list')"><i class="fas fa-list"></i> Liste</button>
        <button class="btn btn-ghost btn-sm" onclick="chantiersView('kanban')"><i class="fas fa-columns"></i> Kanban</button>
        ${canDo('create','chantiers') ? `<button class="btn btn-primary" onclick="showChantierModal()"><i class="fas fa-plus"></i> Nouveau chantier</button>` : ''}
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-row mb-3">
      <div class="stat-item"><div class="stat-item-value" style="color:var(--warning)">${chantiers.filter(c=>c.statut==='en_attente').length}</div><div class="stat-item-label">En attente</div></div>
      <div class="stat-item"><div class="stat-item-value" style="color:var(--accent)">${chantiers.filter(c=>c.statut==='en_cours').length}</div><div class="stat-item-label">En cours</div></div>
      <div class="stat-item"><div class="stat-item-value" style="color:var(--success)">${chantiers.filter(c=>c.statut==='termine').length}</div><div class="stat-item-label">Terminés</div></div>
      <div class="stat-item"><div class="stat-item-value">${formatMAD(chantiers.reduce((s,c)=>s+(c.budget||0),0))}</div><div class="stat-item-label">Budget total</div></div>
    </div>

    <!-- Default list view -->
    <div id="chantiers-view">${renderChantiersKanban(chantiers)}</div>

    <!-- Chantier Modal (creation/edit) -->
    <div id="chantier-modal" class="modal-overlay" style="display:none">
      <div class="modal-box modal-lg">
        <div class="modal-header">
          <h3 id="ch-modal-title"><i class="fas fa-hard-hat"></i> Nouveau chantier</h3>
          <button onclick="closeModal('chantier-modal')" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="ch-id">
          <div class="form-row">
            <div class="form-group">
              <label>Nom du chantier *</label>
              <input type="text" id="ch-nom" class="form-control" placeholder="Villa Résidentielle - Hay Hassani">
            </div>
            <div class="form-group">
              <label>Client *</label>
              <select id="ch-client" class="form-control">
                <option value="">-- Sélectionner --</option>
                ${getCompanyData('clients').map(c => `<option value="${c.id}">${c.nom}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Adresse</label>
              <input type="text" id="ch-adresse" class="form-control" placeholder="Rue et quartier">
            </div>
            <div class="form-group">
              <label>Ville</label>
              <select id="ch-ville" class="form-control">
                <option value="">--</option>
                ${['Casablanca','Rabat','Marrakech','Fès','Agadir','Tanger'].map(v=>`<option value="${v}">${v}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Date début</label><input type="date" id="ch-debut" class="form-control" value="${today()}"></div>
            <div class="form-group"><label>Date fin prévue</label><input type="date" id="ch-fin" class="form-control"></div>
            <div class="form-group"><label>Statut</label>
              <select id="ch-statut" class="form-control">
                <option value="en_attente">En attente</option>
                <option value="en_cours">En cours</option>
                <option value="termine">Terminé</option>
                <option value="suspendu">Suspendu</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Budget prévu (MAD)</label><input type="number" id="ch-budget" class="form-control" min="0" step="100" placeholder="0"></div>
            <div class="form-group"><label>Avancement %</label><input type="number" id="ch-avancement" class="form-control" min="0" max="100" placeholder="0"></div>
          </div>
          <div class="form-group"><label>Description</label><textarea id="ch-desc" class="form-control" rows="3"></textarea></div>
        </div>
        <div class="modal-footer">
          <button onclick="closeModal('chantier-modal')" class="btn btn-ghost">Annuler</button>
          <button onclick="saveChantier()" class="btn btn-primary"><i class="fas fa-save"></i> Enregistrer</button>
        </div>
      </div>
    </div>

    <!-- Chantier Detail Modal -->
    <div id="chantier-detail-modal" class="modal-overlay" style="display:none">
      <div class="modal-box modal-xl" style="max-height:90vh;overflow-y:auto">
        <div class="modal-header">
          <h3 id="ch-detail-title"><i class="fas fa-hard-hat"></i> Détail chantier</h3>
          <button onclick="closeModal('chantier-detail-modal')" class="modal-close">&times;</button>
        </div>
        <div class="modal-body" id="ch-detail-body"></div>
      </div>
    </div>
  `;
}

function renderChantiersKanban(chantiers) {
  const cols = [
    { key: 'en_attente', label: 'En attente', color: '#95a5a6' },
    { key: 'en_cours',   label: 'En cours',   color: '#2980b9' },
    { key: 'suspendu',   label: 'Suspendu',   color: '#f39c12' },
    { key: 'termine',    label: 'Terminé',    color: '#27ae60' },
  ];
  return `<div class="kanban-board">${cols.map(col => {
    const items = chantiers.filter(c => c.statut === col.key);
    return `
      <div class="kanban-col" data-statut="${col.key}" ondrop="dropChantier(event,'${col.key}')" ondragover="event.preventDefault()">
        <div class="kanban-col-header">
          <span style="color:${col.color}"><i class="fas fa-circle" style="font-size:8px"></i> ${col.label}</span>
          <span class="kanban-col-count">${items.length}</span>
        </div>
        <div class="kanban-cards">
          ${items.map(c => `
            <div class="kanban-card" draggable="true" ondragstart="dragChantier(event,'${c.id}')">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
                <strong style="font-size:13px">${c.nom}</strong>
                <div style="display:flex;gap:3px">
                  <button class="btn btn-ghost btn-xs" onclick="openChantierDetail('${c.id}')" title="Détails"><i class="fas fa-folder-open"></i></button>
                  <button class="btn btn-ghost btn-xs" onclick="editChantier('${c.id}')" title="Modifier"><i class="fas fa-edit"></i></button>
                  <button class="btn btn-ghost btn-xs text-danger" onclick="deleteChantier('${c.id}')" title="Supprimer"><i class="fas fa-trash"></i></button>
                </div>
              </div>
              <p style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${c.clientNom || c.client_nom || '—'} · ${c.ville || ''}</p>
              <div class="progress-bar mb-1"><div class="progress-fill" style="width:${c.avancement||0}%;background:${col.color}"></div></div>
              <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted)">
                <span>${c.avancement || 0}%</span>
                <span>${c.budget ? formatMAD(c.budget) : ''}</span>
                <span class="${c.budgetReel > c.budget * 0.9 ? 'text-danger' : ''}">
                  ${c.budgetReel ? '💰 ' + formatMAD(c.budgetReel) : ''}
                </span>
              </div>
            </div>
          `).join('')}
          ${items.length === 0 ? '<div class="kanban-drop-zone">Déposer ici</div>' : ''}
        </div>
      </div>
    `;
  }).join('')}</div>`;
}

function chantiersView(type) {
  const chantiers = getCompanyData('chantiers');
  const el = document.getElementById('chantiers-view');
  if (!el) return;
  if (type === 'kanban') el.innerHTML = renderChantiersKanban(chantiers);
  else el.innerHTML = renderChantiersList(chantiers);
}

function renderChantiersList(chantiers) {
  return `<div class="card">
    <div class="table-responsive"><table class="table">
      <thead><tr><th>Nom</th><th>Client</th><th>Ville</th><th>Début</th><th>Fin</th><th>Budget</th><th>Avancement</th><th>Statut</th><th>Actions</th></tr></thead>
      <tbody>${chantiers.map(c => `
        <tr>
          <td><strong>${c.nom}</strong></td>
          <td>${c.clientNom || c.client_nom || '—'}</td>
          <td>${c.ville || '—'}</td>
          <td>${formatDate(c.dateDebut || c.date_debut)}</td>
          <td>${(c.dateFin || c.date_fin) ? formatDate(c.dateFin || c.date_fin) : '—'}</td>
          <td>${c.budget ? formatMAD(c.budget) : '—'}</td>
          <td><div class="progress-bar" style="width:100px"><div class="progress-fill" style="width:${c.avancement||0}%;background:var(--accent)"></div></div><small>${c.avancement||0}%</small></td>
          <td>${getStatusBadge(c.statut)}</td>
          <td><div style="display:flex;gap:3px">
            <button class="btn btn-ghost btn-xs" onclick="openChantierDetail('${c.id}')"><i class="fas fa-folder-open"></i></button>
            <button class="btn btn-ghost btn-xs" onclick="editChantier('${c.id}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-ghost btn-xs text-danger" onclick="deleteChantier('${c.id}')"><i class="fas fa-trash"></i></button>
          </div></td>
        </tr>
      `).join('')}</tbody>
    </table></div>
  </div>`;
}

let _dragChantierId = null;
function dragChantier(event, id) { _dragChantierId = id; }
async function dropChantier(event, statut) {
  event.preventDefault();
  if (!_dragChantierId) return;
  const c = App.data.chantiers?.find(c => c.id === _dragChantierId);
  if (c) {
    const old = c.statut;
    c.statut = statut;
    addHistory('chantiers', c.id, 'Changement statut', `→ ${statut}`);

    if (!App.isDemoMode && c.id) {
      try {
        await sbUpdate('chantiers', c.id, { statut });
      } catch (e) {
        console.warn('[Supabase] dropChantier:', e.message);
        c.statut = old;
        showToast('Erreur mise à jour statut', 'error');
      }
    }
  }
  _dragChantierId = null;
  renderChantiers();
}

function showChantierModal(data = null) {
  document.getElementById('ch-id').value = data?.id || '';
  document.getElementById('ch-nom').value = data?.nom || '';
  document.getElementById('ch-client').value = data?.clientId || data?.client_id || '';
  document.getElementById('ch-adresse').value = data?.adresse || '';
  document.getElementById('ch-ville').value = data?.ville || '';
  document.getElementById('ch-debut').value = data?.dateDebut || data?.date_debut || today();
  document.getElementById('ch-fin').value = data?.dateFin || data?.date_fin || '';
  document.getElementById('ch-statut').value = data?.statut || 'en_attente';
  document.getElementById('ch-budget').value = data?.budget || '';
  document.getElementById('ch-avancement').value = data?.avancement || 0;
  document.getElementById('ch-desc').value = data?.description || '';
  document.getElementById('ch-modal-title').innerHTML = `<i class="fas fa-hard-hat"></i> ${data ? 'Modifier' : 'Nouveau'} chantier`;
  openModal('chantier-modal');
}

async function saveChantier() {
  const nom      = document.getElementById('ch-nom').value.trim();
  const clientId = document.getElementById('ch-client').value;
  if (!nom || !clientId) { showToast('Nom et client requis', 'error'); return; }

  const id  = document.getElementById('ch-id').value;
  const cid = App.currentUser?.companyId || App.currentUser?.company_id || 'c1';
  const client = App.data.clients?.find(c => c.id === clientId);
  if (!App.data.chantiers) App.data.chantiers = [];

  const localData = {
    nom,
    clientId, clientNom: client?.nom || '',
    client_id: clientId, client_nom: client?.nom || '',
    adresse:    document.getElementById('ch-adresse').value,
    ville:      document.getElementById('ch-ville').value,
    dateDebut:  document.getElementById('ch-debut').value,
    date_debut: document.getElementById('ch-debut').value,
    dateFin:    document.getElementById('ch-fin').value,
    date_fin:   document.getElementById('ch-fin').value,
    statut:     document.getElementById('ch-statut').value,
    budget:     parseFloat(document.getElementById('ch-budget').value) || 0,
    avancement: parseInt(document.getElementById('ch-avancement').value) || 0,
    description:document.getElementById('ch-desc').value,
    companyId:  cid, company_id: cid,
  };

  // Objet envoyé à Supabase (snake_case)
  const sbData = {
    nom,
    client_id:   clientId,
    client_nom:  client?.nom || '',
    adresse:     localData.adresse,
    ville:       localData.ville,
    date_debut:  localData.dateDebut || null,
    date_fin:    localData.dateFin   || null,
    statut:      localData.statut,
    budget:      localData.budget,
    avancement:  localData.avancement,
    description: localData.description,
    company_id:  cid,
    // On stocke employés/achats/etc en JSONB dans Supabase
    employes:    id ? undefined : [],
    prestataires:id ? undefined : [],
    achats:      id ? undefined : [],
    photos:      id ? undefined : [],
    journal:     id ? undefined : [],
    budget_reel: 0,
  };

  const btn = document.querySelector('#chantier-modal .btn-primary');
  if (btn) btn.disabled = true;

  try {
    if (id) {
      const idx = App.data.chantiers.findIndex(c => c.id === id);
      if (idx > -1) {
        App.data.chantiers[idx] = { ...App.data.chantiers[idx], ...localData };
        addHistory('chantiers', id, 'Modification', nom);
      }
      if (!App.isDemoMode) {
        const updated = await sbUpdate('chantiers', id, sbData);
        if (idx > -1 && updated) App.data.chantiers[idx] = normalizeChantier({ ...App.data.chantiers[idx], ...updated });
      }
    } else {
      if (!App.isDemoMode) {
        const created = await sbInsert('chantiers', { ...sbData, employes: [], prestataires: [], achats: [], photos: [], journal: [], budget_reel: 0 });
        const norm = normalizeChantier(created);
        App.data.chantiers.push(norm);
        addHistory('chantiers', norm.id, 'Création', nom);
      } else {
        const newC = { ...localData, id: genId(), createdAt: today(), employes: [], prestataires: [], achats: [], photos: [], journal: [], budgetReel: 0 };
        App.data.chantiers.push(newC);
        addHistory('chantiers', newC.id, 'Création', nom);
      }
    }
    addAuditLog('Chantier', `${id ? 'Modifié' : 'Créé'}: ${nom}`);
    if (App.isDemoMode && typeof persistSave === 'function') persistSave();
    closeModal('chantier-modal');
    renderChantiers();
    showToast('Chantier enregistré !', 'success');
  } catch (e) {
    console.error('[Supabase] saveChantier:', e);
    showToast('Erreur: ' + (e.message || 'Impossible de sauvegarder'), 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

function editChantier(id) {
  const c = App.data.chantiers?.find(c => c.id === id);
  if (c) showChantierModal(c);
}

async function deleteChantier(id) {
  const c = App.data.chantiers?.find(c => c.id === id);
  showConfirm(`Supprimer le chantier "${c?.nom}" ?`, async () => {
    App.data.chantiers = App.data.chantiers.filter(c => c.id !== id);
    addAuditLog('Chantier', `Supprimé: ${c?.nom}`);
    if (App.isDemoMode && typeof persistSave === 'function') persistSave();
    renderChantiers();
    showToast('Chantier supprimé', 'success');

    if (!App.isDemoMode && id) {
      try { await sbDelete('chantiers', id); }
      catch (e) { console.warn('[Supabase] deleteChantier:', e.message); }
    }
  });
}

// ── HELPER : Sauvegarde d'un chantier entier après modification des sous-données ──
async function _saveChantierSub(c) {
  if (!App.isDemoMode && c.id) {
    try {
      await sbUpdate('chantiers', c.id, {
        employes:     c.employes     || [],
        prestataires: c.prestataires || [],
        achats:       c.achats       || [],
        photos:       c.photos       || [],
        journal:      c.journal      || [],
        budget_reel:  c.budgetReel   || 0,
        avancement:   c.avancement   || 0,
      });
    } catch (e) {
      console.warn('[Supabase] _saveChantierSub:', e.message);
    }
  }
}

// CHANTIER DETAIL
function openChantierDetail(id) {
  const c = App.data.chantiers?.find(c => c.id === id);
  if (!c) return;
  document.getElementById('ch-detail-title').innerHTML = `<i class="fas fa-hard-hat"></i> ${c.nom}`;
  renderChantierDetailBody(c);
  openModal('chantier-detail-modal');
}

function renderChantierDetailBody(c) {
  const body = document.getElementById('ch-detail-body');
  const totalEmployes    = (c.employes    || []).reduce((s, e) => s + (e.joursTravailles * e.tauxJour - (e.avance || 0)), 0);
  const totalPrestataires= (c.prestataires|| []).reduce((s, p) => s + ((p.montant || 0) - (p.avance || 0)), 0);
  const totalAchats      = (c.achats      || []).reduce((s, a) => s + (a.montant || 0), 0);
  c.budgetReel = totalEmployes + totalPrestataires + totalAchats;
  const budgetPct   = c.budget > 0 ? Math.round((c.budgetReel / c.budget) * 100) : 0;
  const budgetColor = budgetPct > 90 ? 'var(--danger)' : budgetPct > 70 ? 'var(--warning)' : 'var(--success)';

  body.innerHTML = `
    <div class="stats-row mb-3">
      <div class="stat-item"><div class="stat-item-value">${c.avancement || 0}%</div><div class="stat-item-label">Avancement</div></div>
      <div class="stat-item"><div class="stat-item-value">${formatMAD(c.budget || 0)}</div><div class="stat-item-label">Budget prévu</div></div>
      <div class="stat-item"><div class="stat-item-value" style="color:${budgetColor}">${formatMAD(c.budgetReel)}</div><div class="stat-item-label">Dépenses réelles</div></div>
      <div class="stat-item"><div class="stat-item-value" style="color:${c.budget - c.budgetReel >= 0 ? 'var(--success)' : 'var(--danger)'}">${formatMAD(Math.abs(c.budget - c.budgetReel))}</div><div class="stat-item-label">${c.budget - c.budgetReel >= 0 ? 'Reste budget' : 'Dépassement'}</div></div>
    </div>

    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab(event,'cht-employes')"><i class="fas fa-users"></i> Employés (${(c.employes||[]).length})</button>
      <button class="tab-btn" onclick="switchTab(event,'cht-prestataires')"><i class="fas fa-handshake"></i> Prestataires (${(c.prestataires||[]).length})</button>
      <button class="tab-btn" onclick="switchTab(event,'cht-achats')"><i class="fas fa-shopping-cart"></i> Achats (${(c.achats||[]).length})</button>
      <button class="tab-btn" onclick="switchTab(event,'cht-photos')"><i class="fas fa-camera"></i> Photos (${(c.photos||[]).length})</button>
      <button class="tab-btn" onclick="switchTab(event,'cht-journal')"><i class="fas fa-book"></i> Journal</button>
    </div>

    <!-- EMPLOYES -->
    <div id="cht-employes" class="tab-content active">
      <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
        <button class="btn btn-primary btn-sm" onclick="showAddEmployeModal('${c.id}')"><i class="fas fa-plus"></i> Ajouter employé</button>
      </div>
      <div class="table-responsive">
        <table class="table">
          <thead><tr><th>Nom</th><th>Rôle</th><th>Jours</th><th>Taux/Jour</th><th>Montant brut</th><th>Avance versée</th><th>Reste à payer</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            ${(c.employes||[]).length === 0 ? '<tr><td colspan="9" class="text-center text-muted" style="padding:20px">Aucun employé</td></tr>' : ''}
            ${(c.employes||[]).map(e => {
              const brut  = e.joursTravailles * e.tauxJour;
              const reste = brut - (e.avance || 0);
              return `
                <tr>
                  <td><strong>${e.nom}</strong></td>
                  <td>${e.role || '—'}</td>
                  <td>${e.joursTravailles}</td>
                  <td>${formatMAD(e.tauxJour)}</td>
                  <td>${formatMAD(brut)}</td>
                  <td style="color:var(--warning)">${formatMAD(e.avance || 0)}</td>
                  <td style="color:${reste > 0 ? 'var(--danger)' : 'var(--success)'};font-weight:600">${formatMAD(reste)}</td>
                  <td><span class="badge ${reste === 0 ? 'badge-success' : reste < brut * 0.5 ? 'badge-warning' : 'badge-danger'}">${reste === 0 ? 'Soldé' : 'Partiel'}</span></td>
                  <td>
                    <button class="btn btn-success btn-xs" onclick="payEmploye('${c.id}','${e.id}')" title="Payer"><i class="fas fa-plus-circle"></i></button>
                    <button class="btn btn-ghost btn-xs" onclick="genContratEmploye('${c.id}','${e.id}')"><i class="fas fa-file-pdf"></i></button>
                    <button class="btn btn-ghost btn-xs text-danger" onclick="deleteEmploye('${c.id}','${e.id}')"><i class="fas fa-times"></i></button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      ${c.employes?.length > 0 ? `<div class="alert alert-info"><i class="fas fa-info-circle"></i> Total employés: ${formatMAD(totalEmployes)} | Avances versées: ${formatMAD((c.employes||[]).reduce((s,e)=>s+(e.avance||0),0))}</div>` : ''}
    </div>

    <!-- PRESTATAIRES -->
    <div id="cht-prestataires" class="tab-content">
      <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
        <button class="btn btn-primary btn-sm" onclick="showAddPrestataire('${c.id}')"><i class="fas fa-plus"></i> Ajouter prestataire</button>
      </div>
      <div class="table-responsive">
        <table class="table">
          <thead><tr><th>Société/Nom</th><th>Prestation</th><th>Montant</th><th>Avance</th><th>Reste</th><th>Statut</th><th>Justificatif</th><th></th></tr></thead>
          <tbody>
            ${(c.prestataires||[]).length === 0 ? '<tr><td colspan="8" class="text-center text-muted" style="padding:20px">Aucun prestataire</td></tr>' : ''}
            ${(c.prestataires||[]).map(p => {
              const reste = (p.montant || 0) - (p.avance || 0);
              return `
                <tr>
                  <td><strong>${p.nom}</strong></td>
                  <td>${p.prestation || '—'}</td>
                  <td>${formatMAD(p.montant || 0)}</td>
                  <td style="color:var(--warning)">${formatMAD(p.avance || 0)}</td>
                  <td style="color:${reste > 0 ? 'var(--danger)' : 'var(--success)'};font-weight:600">${formatMAD(reste)}</td>
                  <td><span class="badge ${reste === 0 ? 'badge-success' : 'badge-warning'}">${reste === 0 ? 'Soldé' : 'En cours'}</span></td>
                  <td>${p.justificatif ? `<span class="badge badge-info"><i class="fas fa-paperclip"></i> ${p.justificatif}</span>` : '—'}</td>
                  <td>
                    <button class="btn btn-success btn-xs" onclick="payPrestataire('${c.id}','${p.id}')" title="Avance"><i class="fas fa-plus-circle"></i></button>
                    <button class="btn btn-ghost btn-xs text-danger" onclick="deletePrestataire('${c.id}','${p.id}')"><i class="fas fa-times"></i></button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- ACHATS -->
    <div id="cht-achats" class="tab-content">
      <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
        <button class="btn btn-primary btn-sm" onclick="showAddAchat('${c.id}')"><i class="fas fa-plus"></i> Ajouter achat</button>
      </div>
      <div class="table-responsive">
        <table class="table">
          <thead><tr><th>Date</th><th>Désignation</th><th>Montant</th><th>Type justificatif</th><th>Fournisseur</th><th>Référence</th><th></th></tr></thead>
          <tbody>
            ${(c.achats||[]).length === 0 ? '<tr><td colspan="7" class="text-center text-muted" style="padding:20px">Aucun achat</td></tr>' : ''}
            ${(c.achats||[]).map(a => `
              <tr>
                <td>${formatDate(a.date)}</td>
                <td><strong>${a.designation}</strong></td>
                <td style="font-weight:600">${formatMAD(a.montant)}</td>
                <td><span class="badge ${a.typeJustificatif === 'facture' ? 'badge-success' : a.typeJustificatif === 'bon' ? 'badge-info' : 'badge-secondary'}">${a.typeJustificatif || 'sans justificatif'}</span></td>
                <td>${a.fournisseur || '—'}</td>
                <td><code style="font-size:11px">${a.reference || '—'}</code></td>
                <td><button class="btn btn-ghost btn-xs text-danger" onclick="deleteAchat('${c.id}','${a.id}')"><i class="fas fa-times"></i></button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${c.achats?.length > 0 ? `<div class="card-footer text-right"><strong>Total achats: ${formatMAD(totalAchats)}</strong></div>` : ''}
    </div>

    <!-- PHOTOS -->
    <div id="cht-photos" class="tab-content">
      <div style="display:flex;justify-content:space-between;margin-bottom:12px">
        <select id="photo-filter" class="form-control" style="max-width:160px" onchange="filterChantierPhotos('${c.id}')">
          <option value="">Toutes catégories</option>
          <option value="avant">Avant travaux</option>
          <option value="pendant">Pendant travaux</option>
          <option value="apres">Après travaux</option>
          <option value="probleme">Problème</option>
          <option value="securite">Sécurité</option>
        </select>
        <button class="btn btn-primary btn-sm" onclick="addChantierPhoto('${c.id}')"><i class="fas fa-camera"></i> Ajouter photo</button>
      </div>
      <div class="photo-grid" id="chantier-photos-grid">
        ${(c.photos||[]).map(p => `
          <div class="photo-item" title="${p.caption || ''}">
            <div style="background:var(--bg);width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:12px;text-align:center">
              <i class="fas fa-image" style="font-size:28px;color:var(--text-muted);margin-bottom:8px"></i>
              <span style="font-size:11px;font-weight:600">${p.caption || 'Photo'}</span>
              <span class="badge badge-info" style="margin-top:4px;font-size:10px">${p.categorie || 'autre'}</span>
              <span style="font-size:10px;color:var(--text-muted);margin-top:4px">${formatDate(p.date)}</span>
            </div>
          </div>
        `).join('')}
        ${(c.photos||[]).length === 0 ? '<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-camera"></i><p>Aucune photo</p></div>' : ''}
      </div>
    </div>

    <!-- JOURNAL -->
    <div id="cht-journal" class="tab-content">
      <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
        <button class="btn btn-primary btn-sm" onclick="addJournalEntry('${c.id}')"><i class="fas fa-plus"></i> Entrée journal</button>
      </div>
      <div class="timeline">
        ${(c.journal||[]).length === 0 ? '<p class="text-muted">Aucune entrée</p>' : ''}
        ${[...(c.journal||[])].reverse().map(j => `
          <div class="timeline-item">
            <div class="timeline-dot"><i class="fas fa-pen"></i></div>
            <div class="timeline-content">
              <strong>${j.titre || 'Entrée'}</strong>
              <span>${j.contenu}</span>
              <span class="timeline-time"><i class="fas fa-user"></i> ${j.auteur} · ${formatDate(j.date)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ── Employé ──────────────────────────────────────────────────
function showAddEmployeModal(chantierId) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay'; overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:500px">
      <div class="modal-header"><h3><i class="fas fa-user-plus"></i> Ajouter un employé</h3><button onclick="this.closest('.modal-overlay').remove()" class="modal-close">&times;</button></div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group"><label>Nom *</label><input type="text" id="emp-nom" class="form-control"></div>
          <div class="form-group"><label>Rôle</label><input type="text" id="emp-role" class="form-control" placeholder="Maçon, Électricien..."></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Jours travaillés</label><input type="number" id="emp-jours" class="form-control" value="1" min="0" step="0.5"></div>
          <div class="form-group"><label>Taux/Jour (MAD)</label><input type="number" id="emp-taux" class="form-control" value="300" min="0"></div>
        </div>
        <div class="form-group"><label>Avance déjà versée (MAD)</label><input type="number" id="emp-avance" class="form-control" value="0" min="0"></div>
        <div class="form-group"><label>Téléphone</label><input type="tel" id="emp-tel" class="form-control"></div>
      </div>
      <div class="modal-footer">
        <button onclick="this.closest('.modal-overlay').remove()" class="btn btn-ghost">Annuler</button>
        <button onclick="saveEmploye('${chantierId}',this)" class="btn btn-primary"><i class="fas fa-save"></i> Ajouter</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

async function saveEmploye(chantierId, btn) {
  const nom = document.getElementById('emp-nom').value.trim();
  if (!nom) { showToast('Nom requis', 'error'); return; }
  const c = App.data.chantiers?.find(c => c.id === chantierId);
  if (!c) return;
  if (!c.employes) c.employes = [];
  c.employes.push({ id: genId(), nom, role: document.getElementById('emp-role').value, joursTravailles: parseFloat(document.getElementById('emp-jours').value) || 1, tauxJour: parseFloat(document.getElementById('emp-taux').value) || 0, avance: parseFloat(document.getElementById('emp-avance').value) || 0, telephone: document.getElementById('emp-tel').value });
  btn.closest('.modal-overlay').remove();
  await _saveChantierSub(c);
  openChantierDetail(chantierId);
  showToast('Employé ajouté !', 'success');
}

async function payEmploye(chantierId, empId) {
  const c = App.data.chantiers?.find(c => c.id === chantierId);
  const e = c?.employes?.find(e => e.id === empId);
  if (!e) return;
  const montant = parseFloat(prompt(`Avance pour ${e.nom} (Reste: ${formatMAD((e.joursTravailles * e.tauxJour) - (e.avance || 0))})`) || '0');
  if (montant > 0) {
    e.avance = (e.avance || 0) + montant;
    await _saveChantierSub(c);
    openChantierDetail(chantierId);
    showToast(`Avance de ${formatMAD(montant)} enregistrée`, 'success');
  }
}

async function deleteEmploye(chantierId, empId) {
  const c = App.data.chantiers?.find(c => c.id === chantierId);
  if (c) {
    c.employes = c.employes.filter(e => e.id !== empId);
    await _saveChantierSub(c);
    openChantierDetail(chantierId);
  }
}

function genContratEmploye(chantierId, empId) {
  const c = App.data.chantiers?.find(c => c.id === chantierId);
  const e = c?.employes?.find(e => e.id === empId);
  if (!e) return;
  const win = window.open('', '_blank', 'width=800,height=600');
  win.document.write(`<html><head><title>Contrat - ${e.nom}</title><style>body{font-family:Arial;padding:40px;max-width:700px;margin:0 auto}h1{color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:8px}p{line-height:1.8}@media print{button{display:none}}</style></head><body>
    <h1>Contrat de Travail</h1>
    <p><strong>Entre:</strong> ${App.currentCompany?.name || 'GestionApp'} (Employeur)<br><strong>Et:</strong> ${e.nom} (Employé)</p>
    <p><strong>Poste:</strong> ${e.role || 'Ouvrier'}<br><strong>Chantier:</strong> ${c.nom}<br><strong>Taux journalier:</strong> ${formatMAD(e.tauxJour)}<br><strong>Date de début:</strong> ${formatDate(c.dateDebut || c.date_debut)}</p>
    <p>L'employé s'engage à effectuer les travaux conformément aux instructions de l'employeur dans le respect des règles de sécurité en vigueur sur le chantier.</p>
    <div style="margin-top:60px;display:flex;justify-content:space-between">
      <div><strong>Signature Employeur</strong><br><br><br>___________________</div>
      <div><strong>Signature Employé</strong><br><br><br>___________________</div>
    </div>
    <div style="margin-top:24px;text-align:center"><button onclick="window.print()" style="padding:10px 20px;background:#1e3a5f;color:white;border:none;border-radius:8px;cursor:pointer">🖨️ Imprimer</button></div>
  </body></html>`);
  win.document.close();
}

// ── Prestataire ──────────────────────────────────────────────
function showAddPrestataire(chantierId) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay'; overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:500px">
      <div class="modal-header"><h3><i class="fas fa-handshake"></i> Ajouter un prestataire</h3><button onclick="this.closest('.modal-overlay').remove()" class="modal-close">&times;</button></div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group"><label>Nom / Société *</label><input type="text" id="prest-nom" class="form-control"></div>
          <div class="form-group"><label>Prestation</label><input type="text" id="prest-prestation" class="form-control" placeholder="Plomberie, Électricité..."></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Montant contrat (MAD)</label><input type="number" id="prest-montant" class="form-control" min="0" value="0"></div>
          <div class="form-group"><label>Avance versée (MAD)</label><input type="number" id="prest-avance" class="form-control" min="0" value="0"></div>
        </div>
        <div class="form-group"><label>Type de document</label>
          <select id="prest-justif" class="form-control">
            <option value="">Sans document</option>
            <option value="contrat">Contrat signé</option>
            <option value="devis">Devis accepté</option>
            <option value="bon">Bon de commande</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button onclick="this.closest('.modal-overlay').remove()" class="btn btn-ghost">Annuler</button>
        <button onclick="savePrestataire('${chantierId}',this)" class="btn btn-primary"><i class="fas fa-save"></i> Ajouter</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

async function savePrestataire(chantierId, btn) {
  const nom = document.getElementById('prest-nom').value.trim();
  if (!nom) { showToast('Nom requis', 'error'); return; }
  const c = App.data.chantiers?.find(c => c.id === chantierId);
  if (!c) return;
  if (!c.prestataires) c.prestataires = [];
  c.prestataires.push({ id: genId(), nom, prestation: document.getElementById('prest-prestation').value, montant: parseFloat(document.getElementById('prest-montant').value) || 0, avance: parseFloat(document.getElementById('prest-avance').value) || 0, justificatif: document.getElementById('prest-justif').value });
  btn.closest('.modal-overlay').remove();
  await _saveChantierSub(c);
  openChantierDetail(chantierId);
  showToast('Prestataire ajouté !', 'success');
}

async function payPrestataire(chantierId, prestId) {
  const c = App.data.chantiers?.find(c => c.id === chantierId);
  const p = c?.prestataires?.find(p => p.id === prestId);
  if (!p) return;
  const montant = parseFloat(prompt(`Avance pour ${p.nom}`) || '0');
  if (montant > 0) {
    p.avance = (p.avance || 0) + montant;
    await _saveChantierSub(c);
    openChantierDetail(chantierId);
    showToast(`Avance de ${formatMAD(montant)} enregistrée`, 'success');
  }
}

async function deletePrestataire(chantierId, prestId) {
  const c = App.data.chantiers?.find(c => c.id === chantierId);
  if (c) {
    c.prestataires = c.prestataires.filter(p => p.id !== prestId);
    await _saveChantierSub(c);
    openChantierDetail(chantierId);
  }
}

// ── Achat ────────────────────────────────────────────────────
function showAddAchat(chantierId) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay'; overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:500px">
      <div class="modal-header"><h3><i class="fas fa-shopping-cart"></i> Ajouter un achat</h3><button onclick="this.closest('.modal-overlay').remove()" class="modal-close">&times;</button></div>
      <div class="modal-body">
        <div class="form-group"><label>Désignation *</label><input type="text" id="ach-desig" class="form-control" placeholder="Ciment, Fer à béton..."></div>
        <div class="form-row">
          <div class="form-group"><label>Montant (MAD) *</label><input type="number" id="ach-montant" class="form-control" min="0" step="0.01"></div>
          <div class="form-group"><label>Date</label><input type="date" id="ach-date" class="form-control" value="${today()}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Type de justificatif</label>
            <select id="ach-type" class="form-control">
              <option value="facture">Facture officielle</option>
              <option value="bon">Bon d'achat</option>
              <option value="ticket">Ticket de caisse</option>
              <option value="sans">Sans justificatif</option>
            </select>
          </div>
          <div class="form-group"><label>Fournisseur</label><input type="text" id="ach-fournisseur" class="form-control" placeholder="Nom du fournisseur"></div>
        </div>
        <div class="form-group"><label>Référence</label><input type="text" id="ach-ref" class="form-control" placeholder="N° facture ou bon"></div>
      </div>
      <div class="modal-footer">
        <button onclick="this.closest('.modal-overlay').remove()" class="btn btn-ghost">Annuler</button>
        <button onclick="saveAchat('${chantierId}',this)" class="btn btn-primary"><i class="fas fa-save"></i> Ajouter</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

async function saveAchat(chantierId, btn) {
  const desig   = document.getElementById('ach-desig').value.trim();
  const montant = parseFloat(document.getElementById('ach-montant').value);
  if (!desig || !montant) { showToast('Désignation et montant requis', 'error'); return; }
  const c = App.data.chantiers?.find(c => c.id === chantierId);
  if (!c) return;
  if (!c.achats) c.achats = [];
  c.achats.push({ id: genId(), designation: desig, montant, date: document.getElementById('ach-date').value, typeJustificatif: document.getElementById('ach-type').value, fournisseur: document.getElementById('ach-fournisseur').value, reference: document.getElementById('ach-ref').value });
  btn.closest('.modal-overlay').remove();
  await _saveChantierSub(c);
  openChantierDetail(chantierId);
  showToast('Achat enregistré !', 'success');
}

async function deleteAchat(chantierId, achatId) {
  const c = App.data.chantiers?.find(c => c.id === chantierId);
  if (c) {
    c.achats = c.achats.filter(a => a.id !== achatId);
    await _saveChantierSub(c);
    openChantierDetail(chantierId);
  }
}

// ── Photos ───────────────────────────────────────────────────
async function addChantierPhoto(chantierId) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*'; input.multiple = true;
  input.onchange = async (e) => {
    const files = Array.from(e.target.files);
    const c = App.data.chantiers?.find(c => c.id === chantierId);
    if (!c) return;
    if (!c.photos) c.photos = [];
    const cat = prompt('Catégorie? (avant/pendant/apres/probleme/securite)', 'pendant') || 'pendant';
    files.forEach(f => {
      c.photos.push({ id: genId(), caption: f.name, categorie: cat, date: today(), nom: f.name });
    });
    await _saveChantierSub(c);
    openChantierDetail(chantierId);
    showToast(`${files.length} photo(s) ajoutée(s)`, 'success');
  };
  input.click();
}

function filterChantierPhotos(chantierId) {}

// ── Journal ──────────────────────────────────────────────────
async function addJournalEntry(chantierId) {
  const titre   = prompt('Titre de l\'entrée:');
  if (!titre) return;
  const contenu = prompt('Contenu:');
  if (!contenu) return;
  const c = App.data.chantiers?.find(c => c.id === chantierId);
  if (!c) return;
  if (!c.journal) c.journal = [];
  c.journal.push({ id: genId(), titre, contenu, auteur: App.currentUser?.name || App.currentUser?.full_name || 'Inconnu', date: today() });
  await _saveChantierSub(c);
  openChantierDetail(chantierId);
  showToast('Entrée journal ajoutée !', 'success');
}
