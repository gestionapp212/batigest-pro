/* ============================================================
   CLIENTS MODULE (CRM)
============================================================ */
function renderClients() {
  const clients = getCompanyData('clients');
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fas fa-users"></i> Clients</div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" onclick="showImportModal('clients')"><i class="fas fa-file-import"></i> Importer CSV</button>
        <button class="btn btn-ghost btn-sm" onclick="exportClients()"><i class="fas fa-download"></i> Exporter</button>
        ${canDo('create','clients') ? `<button class="btn btn-primary" onclick="showClientModal()"><i class="fas fa-plus"></i> Nouveau client</button>` : ''}
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <input type="text" id="client-search" class="form-control" placeholder="Rechercher (nom, ICE, ville...)" oninput="filterClients()" style="max-width:300px">
      <select id="client-type" class="form-control" onchange="filterClients()" style="max-width:180px">
        <option value="">Tous les types</option>
        <option value="entreprise">Entreprise</option>
        <option value="particulier">Particulier</option>
        <option value="prospect">Prospect</option>
      </select>
      <select id="client-ville" class="form-control" onchange="filterClients()" style="max-width:160px">
        <option value="">Toutes les villes</option>
        ${[...new Set(clients.map(c => c.ville).filter(Boolean))].map(v => `<option value="${v}">${v}</option>`).join('')}
      </select>
    </div>

    <!-- Clients Table -->
    <div class="card">
      <div class="card-header">
        <h3><i class="fas fa-list"></i> Liste des clients (<span id="clients-count">${clients.length}</span>)</h3>
      </div>
      <div class="table-responsive">
        <table class="table table-striped" id="clients-table">
          <thead>
            <tr>
              <th></th>
              <th>Nom / Entreprise</th>
              <th>ICE</th>
              <th>Ville</th>
              <th>Téléphone</th>
              <th>Email</th>
              <th>Type</th>
              <th>CA Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="clients-tbody">
            ${renderClientsRows(clients)}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Client Modal -->
    <div id="client-modal" class="modal-overlay" style="display:none">
      <div class="modal-box modal-lg">
        <div class="modal-header">
          <h3 id="client-modal-title"><i class="fas fa-user-plus"></i> Nouveau client</h3>
          <button onclick="closeModal('client-modal')" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="client-id">
          <div class="tabs">
            <button class="tab-btn active" onclick="switchTab(event,'client-tab-info')"><i class="fas fa-info-circle"></i> Informations</button>
            <button class="tab-btn" onclick="switchTab(event,'client-tab-contacts')"><i class="fas fa-phone"></i> Contacts</button>
            <button class="tab-btn" onclick="switchTab(event,'client-tab-notes')"><i class="fas fa-sticky-note"></i> Notes</button>
          </div>
          <div id="client-tab-info" class="tab-content active">
            <div class="form-row">
              <div class="form-group">
                <label>Type *</label>
                <select id="client-type-sel" class="form-control" onchange="toggleClientType()">
                  <option value="entreprise">Entreprise</option>
                  <option value="particulier">Particulier</option>
                  <option value="prospect">Prospect</option>
                </select>
              </div>
              <div class="form-group">
                <label>Nom / Raison sociale *</label>
                <input type="text" id="client-nom" class="form-control" placeholder="BTP Construction SARL">
              </div>
            </div>
            <div id="client-entreprise-fields">
              <div class="form-row">
                <div class="form-group">
                  <label>ICE (15 chiffres)</label>
                  <input type="text" id="client-ice" class="form-control" placeholder="000000000000000" maxlength="15" oninput="validateICE(this)">
                  <small id="ice-status" class="text-muted"></small>
                </div>
                <div class="form-group">
                  <label>RC</label>
                  <input type="text" id="client-rc" class="form-control" placeholder="123456">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Identifiant Fiscal (IF)</label>
                  <input type="text" id="client-if" class="form-control" placeholder="12345678">
                </div>
                <div class="form-group">
                  <label>Patente</label>
                  <input type="text" id="client-patente" class="form-control">
                </div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Téléphone</label>
                <input type="tel" id="client-tel" class="form-control" placeholder="06 12 34 56 78">
              </div>
              <div class="form-group">
                <label>Email</label>
                <input type="email" id="client-email" class="form-control" placeholder="contact@entreprise.ma">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Adresse</label>
                <input type="text" id="client-adresse" class="form-control" placeholder="123 Rue Mohammed V">
              </div>
              <div class="form-group">
                <label>Ville</label>
                <select id="client-ville-sel" class="form-control">
                  <option value="">Sélectionner</option>
                  ${['Casablanca','Rabat','Marrakech','Fès','Agadir','Tanger','Meknès','Oujda','Kénitra','Tétouan'].map(v => `<option value="${v}">${v}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>
          <div id="client-tab-contacts" class="tab-content">
            <p class="text-muted mb-2">Contacts additionnels</p>
            <div id="client-contacts-list">
              <div class="form-row" style="background:var(--bg);padding:12px;border-radius:8px;margin-bottom:10px">
                <div class="form-group"><label>Nom</label><input type="text" class="form-control contact-nom" placeholder="Contact 1"></div>
                <div class="form-group"><label>Fonction</label><input type="text" class="form-control contact-fonction" placeholder="Directeur"></div>
                <div class="form-group"><label>Téléphone</label><input type="tel" class="form-control contact-tel"></div>
                <div class="form-group"><label>Email</label><input type="email" class="form-control contact-email"></div>
              </div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="addContactRow()"><i class="fas fa-plus"></i> Ajouter un contact</button>
          </div>
          <div id="client-tab-notes" class="tab-content">
            <div class="form-group">
              <label>Notes internes</label>
              <textarea id="client-notes" class="form-control" rows="6" placeholder="Informations importantes, préférences client..."></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button onclick="closeModal('client-modal')" class="btn btn-ghost">Annuler</button>
          <button onclick="saveClient()" class="btn btn-primary"><i class="fas fa-save"></i> Enregistrer</button>
        </div>
      </div>
    </div>

    <!-- Client Detail Modal -->
    <div id="client-detail-modal" class="modal-overlay" style="display:none">
      <div class="modal-box modal-lg">
        <div class="modal-header">
          <h3 id="client-detail-title"><i class="fas fa-user"></i> Fiche client</h3>
          <button onclick="closeModal('client-detail-modal')" class="modal-close">&times;</button>
        </div>
        <div class="modal-body" id="client-detail-body"></div>
      </div>
    </div>
  `;
}

function renderClientsRows(clients) {
  if (clients.length === 0) return `<tr><td colspan="9" class="text-center text-muted" style="padding:40px">Aucun client trouvé</td></tr>`;
  return clients.map(c => {
    const ca = getCompanyData('factures').filter(f => (f.clientId || f.client_id) === c.id && f.statut === 'paye').reduce((s, f) => s + (f.totalTTC ?? f.total_ttc ?? 0), 0);
    const isFav = isFavorite('clients', c.id);
    return `
      <tr>
        <td><button class="star-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('clients','${c.id}','${c.nom}')"><i class="fas fa-star"></i></button></td>
        <td><strong>${c.nom}</strong></td>
        <td><code style="font-size:11px">${c.ice || '—'}</code></td>
        <td>${c.ville || '—'}</td>
        <td>${c.telephone || '—'}</td>
        <td>${c.email || '—'}</td>
        <td>${getStatusBadge(c.statut || 'actif')}</td>
        <td style="color:var(--success);font-weight:600">${ca > 0 ? formatMAD(ca) : '—'}</td>
        <td>
          <div style="display:flex;gap:4px">
            <button class="btn btn-ghost btn-xs" onclick="viewClient('${c.id}')" title="Voir"><i class="fas fa-eye"></i></button>
            ${canDo('edit','clients') ? `<button class="btn btn-ghost btn-xs" onclick="editClient('${c.id}')" title="Modifier"><i class="fas fa-edit"></i></button>` : ''}
            <button class="btn btn-ghost btn-xs" onclick="showHistoryModal('clients','${c.id}','${c.nom}')" title="Historique"><i class="fas fa-history"></i></button>
            ${canDo('delete','clients') ? `<button class="btn btn-ghost btn-xs text-danger" onclick="deleteClient('${c.id}')" title="Supprimer"><i class="fas fa-trash"></i></button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterClients() {
  const q = document.getElementById('client-search')?.value.toLowerCase() || '';
  const type = document.getElementById('client-type')?.value || '';
  const ville = document.getElementById('client-ville')?.value || '';
  let clients = getCompanyData('clients');
  if (q) clients = clients.filter(c => `${c.nom} ${c.ice} ${c.email} ${c.ville}`.toLowerCase().includes(q));
  if (type) clients = clients.filter(c => c.statut === type || c.type === type);
  if (ville) clients = clients.filter(c => c.ville === ville);
  const tbody = document.getElementById('clients-tbody');
  if (tbody) tbody.innerHTML = renderClientsRows(clients);
  const count = document.getElementById('clients-count');
  if (count) count.textContent = clients.length;
}

function validateICE(input) {
  const v = input.value.replace(/\D/g, '');
  input.value = v;
  const status = document.getElementById('ice-status');
  if (status) {
    if (v.length === 0) { status.textContent = ''; return; }
    if (v.length === 15) { status.textContent = '✓ ICE valide'; status.style.color = 'var(--success)'; }
    else { status.textContent = `${v.length}/15 chiffres`; status.style.color = 'var(--danger)'; }
  }
}

function toggleClientType() {
  const type = document.getElementById('client-type-sel').value;
  const fields = document.getElementById('client-entreprise-fields');
  fields.style.display = type === 'particulier' ? 'none' : 'block';
}

function addContactRow() {
  const list = document.getElementById('client-contacts-list');
  const div = document.createElement('div');
  div.className = 'form-row';
  div.style.cssText = 'background:var(--bg);padding:12px;border-radius:8px;margin-bottom:10px';
  div.innerHTML = `
    <div class="form-group"><label>Nom</label><input type="text" class="form-control contact-nom"></div>
    <div class="form-group"><label>Fonction</label><input type="text" class="form-control contact-fonction"></div>
    <div class="form-group"><label>Téléphone</label><input type="tel" class="form-control contact-tel"></div>
    <div class="form-group"><label>Email</label><input type="email" class="form-control contact-email"></div>
    <button class="btn btn-ghost btn-xs" style="align-self:flex-end" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
  `;
  list.appendChild(div);
}

function showClientModal(data = null) {
  document.getElementById('client-id').value = data?.id || '';
  document.getElementById('client-type-sel').value = data?.type || 'entreprise';
  document.getElementById('client-nom').value = data?.nom || '';
  document.getElementById('client-ice').value = data?.ice || '';
  document.getElementById('client-rc').value = data?.rc || '';
  document.getElementById('client-if').value = data?.identifiant_fiscal || data?.identifiantFiscal || '';
  document.getElementById('client-patente').value = data?.patente || '';
  document.getElementById('client-tel').value = data?.telephone || '';
  document.getElementById('client-email').value = data?.email || '';
  document.getElementById('client-adresse').value = data?.adresse || '';
  document.getElementById('client-ville-sel').value = data?.ville || '';
  document.getElementById('client-notes').value = data?.notes || '';
  document.getElementById('client-modal-title').innerHTML = `<i class="fas fa-${data ? 'edit' : 'user-plus'}"></i> ${data ? 'Modifier' : 'Nouveau'} client`;
  toggleClientType();
  switchTabDirect('client-tab-info');
  openModal('client-modal');
}

async function saveClient() {
  const nom = document.getElementById('client-nom').value.trim();
  if (!nom) { showToast('Nom requis', 'error'); return; }
  const id = document.getElementById('client-id').value;
  // Récupérer company_id depuis toutes les sources possibles
  const cid = App.currentCompany?.id || App.currentUser?.companyId || App.currentUser?.company_id;
  
  if (!cid && !App.isDemoMode) {
    showToast('❌ Société non identifiée. Rechargez la page (F5) et reconnectez-vous.', 'error', 5000);
    return;
  }
  
  const contacts = [];
  document.querySelectorAll('#client-contacts-list .form-row').forEach(row => {
    const n = row.querySelector('.contact-nom')?.value.trim();
    if (n) contacts.push({ nom: n, fonction: row.querySelector('.contact-fonction')?.value, tel: row.querySelector('.contact-tel')?.value, email: row.querySelector('.contact-email')?.value });
  });

  const typeVal   = document.getElementById('client-type-sel').value;
  const statutVal  = typeVal === 'prospect' ? 'prospect' : 'actif';

  const sbData = {
    company_id:         cid,
    nom,
    // Champs fiscaux marocains
    ice:                document.getElementById('client-ice').value       || null,
    rc:                 document.getElementById('client-rc').value        || null,
    identifiant_fiscal: document.getElementById('client-if').value        || null,
    patente:            document.getElementById('client-patente').value   || null,
    // Coordonnées
    telephone:          document.getElementById('client-tel').value       || null,
    email:              document.getElementById('client-email').value     || null,
    adresse:            document.getElementById('client-adresse').value   || null,
    ville:              document.getElementById('client-ville-sel').value || null,
    // Classification
    type:               typeVal,
    statut:             statutVal,
    // Contacts JSON et notes
    contacts:           JSON.stringify(contacts),
    notes:              document.getElementById('client-notes').value     || null,
  };
  // localData = copie pour le state local (contacts en tableau JS, pas JSON string)
  const localData = { ...sbData, companyId: cid, contacts, contacts_arr: contacts };
  
  if (!App.data.clients) App.data.clients = [];
  try {
    if (!App.isDemoMode && cid) {
      if (id) {
        const saved = await sbUpdate('clients', id, sbData);
        const idx = App.data.clients.findIndex(c => c.id === id);
        if (idx > -1) App.data.clients[idx] = { ...App.data.clients[idx], ...saved, ...localData };
        addHistory('clients', id, 'Modification', nom);
      } else {
        const saved = await sbInsert('clients', sbData);
        App.data.clients.push({ ...saved, ...localData });
        addHistory('clients', saved.id, 'Création', nom);
      }
    } else {
      if (id) {
        const idx = App.data.clients.findIndex(c => c.id === id);
        if (idx > -1) { App.data.clients[idx] = { ...App.data.clients[idx], ...localData }; addHistory('clients', id, 'Modification', nom); }
      } else {
        const newC = { ...localData, id: genId(), createdAt: today() };
        App.data.clients.push(newC);
        addHistory('clients', newC.id, 'Création', nom);
      }
    }
    addAuditLog('Client', `${id ? 'Modifié' : 'Créé'}: ${nom}`);
    if (App.isDemoMode && typeof persistSave === 'function') persistSave();
    closeModal('client-modal');
    renderClients();
    showToast('Client enregistré !', 'success');
  } catch(err) {
    console.error('saveClient error:', err);
    showToast('Erreur sauvegarde: ' + err.message, 'error');
  }
}

function viewClient(id) {
  const c = App.data.clients?.find(c => c.id === id);
  if (!c) return;
  // Compatibilité snake_case + camelCase pour client_id
  const factures = getCompanyData('factures').filter(f => (f.clientId || f.client_id) === id);
  const devis    = getCompanyData('devis').filter(d => (d.clientId || d.client_id) === id);
  const ca = factures.filter(f => f.statut === 'paye').reduce((s, f) => s + (f.totalTTC ?? f.total_ttc ?? 0), 0);
  
  document.getElementById('client-detail-title').innerHTML = `<i class="fas fa-user"></i> ${c.nom}`;
  document.getElementById('client-detail-body').innerHTML = `
    <div class="stats-row mb-3">
      <div class="stat-item"><div class="stat-item-value" style="color:var(--success)">${formatMAD(ca)}</div><div class="stat-item-label">CA Total</div></div>
      <div class="stat-item"><div class="stat-item-value">${factures.length}</div><div class="stat-item-label">Factures</div></div>
      <div class="stat-item"><div class="stat-item-value">${devis.length}</div><div class="stat-item-label">Devis</div></div>
    </div>
    <div class="grid-2">
      <div>
        <h4 style="margin-bottom:12px;font-size:14px">Informations</h4>
        ${c.ice ? `<p><strong>ICE:</strong> ${c.ice}</p>` : ''}
        ${c.rc ? `<p><strong>RC:</strong> ${c.rc}</p>` : ''}
        ${(c.identifiant_fiscal || c.identifiantFiscal) ? `<p><strong>IF:</strong> ${c.identifiant_fiscal || c.identifiantFiscal}</p>` : ''}
        <p><strong>Tél:</strong> ${c.telephone || '—'}</p>
        <p><strong>Email:</strong> ${c.email || '—'}</p>
        <p><strong>Ville:</strong> ${c.ville || '—'}</p>
        <p><strong>Adresse:</strong> ${c.adresse || '—'}</p>
      </div>
      <div>
        <h4 style="margin-bottom:12px;font-size:14px">Dernières factures</h4>
        ${factures.slice(0, 4).map(f => `
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:12px">${f.numero}</span>
            ${getStatusBadge(f.statut)}
            <span style="font-size:12px;font-weight:600">${formatMAD(f.totalTTC)}</span>
          </div>
        `).join('')}
        ${factures.length === 0 ? '<p class="text-muted">Aucune facture</p>' : ''}
      </div>
    </div>
    ${c.notes ? `<div class="alert alert-info mt-3"><i class="fas fa-sticky-note"></i> ${c.notes}</div>` : ''}
    <div class="modal-footer" style="margin:0 -24px -24px;border-radius:0 0 16px 16px">
      <button onclick="navigate('devis')" class="btn btn-outline-primary btn-sm"><i class="fas fa-file-alt"></i> Créer devis</button>
      <button onclick="showHistoryModal('clients','${c.id}','${c.nom}')" class="btn btn-ghost btn-sm"><i class="fas fa-history"></i> Historique</button>
      <button onclick="editClient('${c.id}')" class="btn btn-primary btn-sm"><i class="fas fa-edit"></i> Modifier</button>
    </div>
  `;
  openModal('client-detail-modal');
}

function editClient(id) {
  const c = App.data.clients?.find(c => c.id === id);
  if (c) { closeModal('client-detail-modal'); showClientModal(c); }
}

function deleteClient(id) {
  const c = App.data.clients?.find(c => c.id === id);
  showConfirm(`Supprimer le client "${c?.nom}" ?`, async () => {
    try {
      if (!App.isDemoMode) await sbDelete('clients', id);
    } catch(e) {
      showToast('Erreur suppression: ' + e.message, 'error');
      return;
    }
    App.data.clients = App.data.clients.filter(c => c.id !== id);
    addAuditLog('Client', `Supprimé: ${c?.nom}`);
    if (App.isDemoMode && typeof persistSave === 'function') persistSave();
    renderClients();
    showToast('Client supprimé', 'success');
  });
}

function exportClients() {
  const clients = getCompanyData('clients');
  const csv = ['Nom,ICE,RC,Telephone,Email,Ville,Type,Statut', ...clients.map(c => `"${c.nom}","${c.ice||''}","${c.rc||''}","${c.telephone||''}","${c.email||''}","${c.ville||''}","${c.type||''}","${c.statut||''}"`)]
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `clients_${today()}.csv`; a.click();
  URL.revokeObjectURL(url);
  addAuditLog('Export', `Clients exportés: ${clients.length}`);
  showToast(`${clients.length} clients exportés`, 'success');
}

// Note: switchTab et switchTabDirect sont définis dans utils.js (fonctions globales)
