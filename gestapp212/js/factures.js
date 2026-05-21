/* ============================================================
   FACTURES MODULE - Relances auto, QR Code
============================================================ */
function renderFactures() {
  const factures = getCompanyData('factures');
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fas fa-file-invoice-dollar"></i> Factures</div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" onclick="runRelancesAuto()"><i class="fas fa-bell"></i> Relances auto</button>
        <button class="btn btn-ghost btn-sm" onclick="exportFEC()"><i class="fas fa-download"></i> Export FEC</button>
        ${canDo('create','factures') ? `<button class="btn btn-primary" onclick="showFactureModal()"><i class="fas fa-plus"></i> Nouvelle facture</button>` : ''}
      </div>
    </div>

    <!-- Stats rapides -->
    <div class="stats-row mb-3">
      <div class="stat-item"><div class="stat-item-value" style="color:var(--success)">${formatMAD(factures.filter(f=>f.statut==='paye').reduce((s,f)=>s+(f.totalTTC??f.total_ttc??0),0))}</div><div class="stat-item-label">Payées</div></div>
      <div class="stat-item"><div class="stat-item-value" style="color:var(--warning)">${formatMAD(factures.filter(f=>f.statut==='partiellement_paye').reduce((s,f)=>s+(f.resteAPayer??f.reste_a_payer??0),0))}</div><div class="stat-item-label">Partielles</div></div>
      <div class="stat-item"><div class="stat-item-value" style="color:var(--danger)">${formatMAD(factures.filter(f=>f.statut==='impaye').reduce((s,f)=>s+(f.totalTTC??f.total_ttc??0),0))}</div><div class="stat-item-label">Impayées</div></div>
      <div class="stat-item"><div class="stat-item-value">${factures.length}</div><div class="stat-item-label">Total factures</div></div>
    </div>

    <div class="filter-bar">
      <input type="text" id="fact-search" class="form-control" placeholder="Rechercher..." oninput="filterFactures()" style="max-width:250px">
      <select id="fact-statut" class="form-control" onchange="filterFactures()" style="max-width:160px">
        <option value="">Tous statuts</option>
        <option value="impaye">Impayées</option>
        <option value="partiellement_paye">Partielles</option>
        <option value="paye">Payées</option>
        <option value="avoir">Avoirs</option>
      </select>
      <select id="fact-type" class="form-control" onchange="filterFactures()" style="max-width:160px">
        <option value="">Tous types</option>
        <option value="standard">Standard</option>
        <option value="acompte">Acompte</option>
        <option value="finale">Finale</option>
        <option value="avoir">Avoir</option>
      </select>
    </div>

    <div class="card">
      <div class="table-responsive">
        <table class="table">
          <thead><tr><th></th><th>N°</th><th>Client</th><th>Date</th><th>Échéance</th><th>Total TTC</th><th>Reste</th><th>Type</th><th>Statut</th><th>Relance</th><th>Actions</th></tr></thead>
          <tbody id="fact-tbody">${renderFacturesRows(factures)}</tbody>
        </table>
      </div>
    </div>

    <!-- Facture Modal -->
    <div id="facture-modal" class="modal-overlay" style="display:none">
      <div class="modal-box modal-xl">
        <div class="modal-header">
          <h3 id="fact-modal-title"><i class="fas fa-file-invoice-dollar"></i> Nouvelle facture</h3>
          <button onclick="closeModal('facture-modal')" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="fact-id">
          <div class="form-row">
            <div class="form-group">
              <label>Type *</label>
              <select id="fact-type-sel" class="form-control">
                <option value="standard">Standard</option>
                <option value="acompte">Acompte</option>
                <option value="finale">Finale</option>
                <option value="avoir">Avoir</option>
              </select>
            </div>
            <div class="form-group">
              <label>Client *</label>
              <select id="fact-client" class="form-control">
                <option value="">-- Sélectionner --</option>
                ${getCompanyData('clients').map(c => `<option value="${c.id}">${c.nom}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Objet *</label>
              <input type="text" id="fact-objet" class="form-control" placeholder="Travaux de...">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Date *</label>
              <input type="date" id="fact-date" class="form-control" value="${today()}">
            </div>
            <div class="form-group">
              <label>Date d'échéance</label>
              <input type="date" id="fact-echeance" class="form-control">
            </div>
            <div class="form-group">
              <label>Statut</label>
              <select id="fact-statut-sel" class="form-control">
                <option value="impaye">Impayée</option>
                <option value="partiellement_paye">Partiel</option>
                <option value="paye">Payée</option>
              </select>
            </div>
          </div>
          <!-- Lignes (réutilise le même système) -->
          <div class="card mb-3">
            <div class="card-header">
              <h3 style="font-size:14px"><i class="fas fa-list"></i> Lignes</h3>
              <button class="btn btn-ghost btn-sm" onclick="addFactureLine()"><i class="fas fa-plus"></i> Ajouter</button>
            </div>
            <div class="table-responsive">
              <table class="table"><thead><tr><th>#</th><th>Désignation</th><th>Qté</th><th>P.U. HT</th><th>TVA</th><th>Total TTC</th><th></th></tr></thead>
              <tbody id="fact-lines-tbody"></tbody></table>
            </div>
          </div>
          <div style="display:flex;justify-content:flex-end">
            <div style="min-width:280px">
              <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)"><span>HT</span><strong id="f-total-ht">0,00 MAD</strong></div>
              <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)"><span>TVA</span><strong id="f-total-tva">0,00 MAD</strong></div>
              <div style="display:flex;justify-content:space-between;padding:10px 0;font-size:18px;color:var(--primary);font-weight:800"><span>TTC</span><strong id="f-total-ttc">0,00 MAD</strong></div>
            </div>
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea id="fact-notes" class="form-control" rows="2"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button onclick="closeModal('facture-modal')" class="btn btn-ghost">Annuler</button>
          <button onclick="saveFacture()" class="btn btn-primary" id="btn-save-facture"><i class="fas fa-save"></i> Enregistrer</button>
        </div>
      </div>
    </div>

    <!-- Paiement Modal -->
    <div id="paiement-modal" class="modal-overlay" style="display:none">
      <div class="modal-box" style="max-width:520px">
        <div class="modal-header">
          <h3><i class="fas fa-credit-card"></i> Ajouter un paiement</h3>
          <button onclick="closeModal('paiement-modal')" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="pmt-facture-id">
          <div class="alert alert-info" id="pmt-info"></div>
          <div class="form-row">
            <div class="form-group">
              <label>Montant *</label>
              <input type="number" id="pmt-montant" class="form-control" min="0" step="0.01">
            </div>
            <div class="form-group">
              <label>Mode de paiement</label>
              <select id="pmt-mode" class="form-control">
                <option value="especes">Espèces</option>
                <option value="virement">Virement bancaire</option>
                <option value="cheque">Chèque</option>
                <option value="carte">Carte bancaire</option>
                <option value="cashplus">CashPlus</option>
                <option value="wafacash">Wafacash</option>
                <option value="effet">Effet de commerce</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Date</label>
              <input type="date" id="pmt-date" class="form-control" value="${today()}">
            </div>
            <div class="form-group">
              <label>Référence</label>
              <input type="text" id="pmt-ref" class="form-control" placeholder="Numéro de chèque, virement...">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button onclick="closeModal('paiement-modal')" class="btn btn-ghost">Annuler</button>
          <button onclick="savePaiement()" class="btn btn-success"><i class="fas fa-check"></i> Confirmer paiement</button>
        </div>
      </div>
    </div>
  `;
  _factureLines = [];
  addFactureLine();
}

function renderFacturesRows(factures) {
  if (factures.length === 0) return `<tr><td colspan="11" class="text-center text-muted" style="padding:30px">Aucune facture</td></tr>`;
  return factures.map(f => {
    // Compatibilité snake_case (Supabase) + camelCase (mock)
    const clientNom  = f.clientNom   || f.client_nom   || '—';
    const totalTTC   = f.totalTTC    ?? f.total_ttc    ?? 0;
    const resteAPayer= f.resteAPayer ?? f.reste_a_payer ?? 0;
    const date       = f.date        || f.date_facture  || '';
    const echeance   = f.dateEcheance|| f.date_echeance || '';
    const isFav = isFavorite('factures', f.id);
    const relanceLevel = getRelanceLevel(f);
    return `
      <tr class="${f.statut === 'impaye' ? 'relance-level-' + relanceLevel : ''}">
        <td><button class="star-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('factures','${f.id}','${f.numero}')"><i class="fas fa-star"></i></button></td>
        <td><strong>${f.numero}</strong></td>
        <td>${clientNom}</td>
        <td>${formatDate(date)}</td>
        <td style="color:${echeance && new Date(echeance) < new Date() && f.statut==='impaye' ? 'var(--danger)' : ''}">${echeance ? formatDate(echeance) : '—'}</td>
        <td style="font-weight:600">${formatMAD(totalTTC)}</td>
        <td style="color:${resteAPayer > 0 ? 'var(--danger)' : 'var(--success)'};font-weight:600">${resteAPayer > 0 ? formatMAD(resteAPayer) : '✓'}</td>
        <td><span class="badge badge-secondary">${f.type || 'standard'}</span></td>
        <td>${getStatusBadge(f.statut)}</td>
        <td>${relanceLevel > 0 ? `<span class="badge badge-${relanceLevel >= 3 ? 'danger' : 'warning'}">R${relanceLevel}</span>` : '—'}</td>
        <td>
          <div style="display:flex;gap:3px;flex-wrap:wrap">
            ${f.statut !== 'avoir' && f.statut !== 'paye' ? `<button class="btn btn-success btn-xs" onclick="showPaiementModal('${f.id}')" title="Paiement"><i class="fas fa-plus-circle"></i></button>` : ''}
            <button class="btn btn-ghost btn-xs" onclick="previewFacture('${f.id}')" title="Aperçu PDF / Imprimer"><i class="fas fa-file-pdf" style="color:#e53e3e"></i></button>
            <button class="btn btn-ghost btn-xs" onclick="sendFactureEmail('${f.id}')" title="Email"><i class="fas fa-envelope"></i></button>
            <button class="btn btn-ghost btn-xs" onclick="showQRCode('${f.id}')" title="QR Code"><i class="fas fa-qrcode"></i></button>
            <button class="btn btn-ghost btn-xs" onclick="showHistoryModal('factures','${f.id}','${f.numero}')" title="Historique"><i class="fas fa-history"></i></button>
            ${canDo('edit','factures') && f.statut !== 'valide' ? `<button class="btn btn-ghost btn-xs" onclick="editFacture('${f.id}')"><i class="fas fa-edit"></i></button>` : ''}
            ${canDo('validate','factures') && f.statut !== 'valide' ? `<button class="btn btn-accent btn-xs" onclick="validerFacture('${f.id}')" title="Valider"><i class="fas fa-check-double"></i></button>` : ''}
            ${canDo('delete','factures') && f.statut !== 'valide' && f.statut !== 'paye' ? `<button class="btn btn-ghost btn-xs text-danger" onclick="deleteFacture('${f.id}')"><i class="fas fa-trash"></i></button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterFactures() {
  const q = document.getElementById('fact-search')?.value.toLowerCase() || '';
  const statut = document.getElementById('fact-statut')?.value || '';
  const type = document.getElementById('fact-type')?.value || '';
  let factures = getCompanyData('factures');
  if (q) factures = factures.filter(f => `${f.numero} ${f.clientNom} ${f.objet}`.toLowerCase().includes(q));
  if (statut) factures = factures.filter(f => f.statut === statut);
  if (type) factures = factures.filter(f => f.type === type);
  const tbody = document.getElementById('fact-tbody');
  if (tbody) tbody.innerHTML = renderFacturesRows(factures);
}

// Relance levels
function getRelanceLevel(f) {
  const ech = f.dateEcheance || f.date_echeance;
  if (f.statut !== 'impaye' || !ech) return 0;
  const days = Math.floor((Date.now() - new Date(ech)) / 86400000);
  if (days >= 60) return 4;
  if (days >= 30) return 3;
  if (days >= 15) return 2;
  if (days >= 7) return 1;
  return 0;
}

function runRelancesAuto() {
  const factures = getCompanyData('factures').filter(f => f.statut === 'impaye');
  let relances = 0;
  factures.forEach(f => {
    const level = getRelanceLevel(f);
    if (level > 0 && (!f.lastRelanceLevel || f.lastRelanceLevel < level)) {
      f.lastRelanceLevel = level;
      f.lastRelanceDate = today();
      relances++;
      addHistory('factures', f.id, `Relance niveau ${level}`, `Auto: J+${[7,15,30,60][level-1]}`);
    }
  });
  if (relances > 0) {
    showToast(`${relances} relance(s) générée(s)`, 'success');
    addAuditLog('Relances', `${relances} relances automatiques envoyées`);
    renderFactures();
  } else {
    showToast('Aucune nouvelle relance nécessaire', 'info');
  }
}

// Facture lines
let _factureLines = [];

function addFactureLine(data = null) {
  const id = genId();
  _factureLines.push({ id, designation: data?.designation || '', quantite: data?.quantite || 1, prixUnitaire: data?.prixUnitaire || 0, tva: data?.tva || 20 });
  renderFactureLines();
}

function renderFactureLines() {
  const tbody = document.getElementById('fact-lines-tbody');
  if (!tbody) return;
  tbody.innerHTML = _factureLines.map((l, i) => {
    const ht = l.prixUnitaire * l.quantite;
    const ttc = calcTTC(ht, l.tva);
    return `
      <tr data-fact-line-id="${l.id}">
        <td>${i + 1}</td>
        <td><input type="text" class="form-control" value="${escHtml(l.designation)}" onchange="updateFactLine('${l.id}','designation',this.value)" placeholder="Désignation" style="min-width:150px"></td>
        <td><input type="number" class="form-control" style="width:70px" value="${l.quantite}" min="0" step="0.01" onchange="updateFactLine('${l.id}','quantite',+this.value)"></td>
        <td><input type="number" class="form-control" style="width:100px" value="${l.prixUnitaire}" min="0" step="0.01" onchange="updateFactLine('${l.id}','prixUnitaire',+this.value)"></td>
        <td><select class="form-control" style="width:75px" onchange="updateFactLine('${l.id}','tva',+this.value)">
          ${[20,14,10,7,0].map(t => `<option value="${t}" ${l.tva===t?'selected':''}>${t}%</option>`).join('')}
        </select></td>
        <td style="font-weight:600;white-space:nowrap" class="fact-line-ttc">${formatMAD(ttc)}</td>
        <td><button class="btn btn-ghost btn-xs text-danger" onclick="removeFactLine('${l.id}')"><i class="fas fa-times"></i></button></td>
      </tr>
    `;
  }).join('');
  updateFactureTotals();
}

function updateFactLine(id, field, value) {
  const l = _factureLines.find(l => l.id === id);
  if (!l) return;
  l[field] = value;
  // Ne pas re-render le tableau — mettre à jour seulement les totaux
  const ht  = l.prixUnitaire * l.quantite;
  const ttc = calcTTC(ht, l.tva);
  const row = document.querySelector(`[data-fact-line-id="${id}"]`);
  if (row) { const el = row.querySelector('.fact-line-ttc'); if (el) el.textContent = formatMAD(ttc); }
  updateFactureTotals();
}

function removeFactLine(id) {
  _factureLines = _factureLines.filter(l => l.id !== id);
  renderFactureLines();
}

function updateFactureTotals() {
  let totalHT = 0, totalTVA = 0;
  _factureLines.forEach(l => {
    const ht = l.prixUnitaire * l.quantite;
    totalHT += ht;
    totalTVA += calcTVA(ht, l.tva);
  });
  const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = formatMAD(v); };
  el('f-total-ht', totalHT); el('f-total-tva', totalTVA); el('f-total-ttc', totalHT + totalTVA);
}

function showFactureModal(data = null) {
  document.getElementById('fact-id').value = data?.id || '';
  document.getElementById('fact-type-sel').value = data?.type || 'standard';
  // Compatibilité snake_case + camelCase
  const clientIdVal = data?.clientId    || data?.client_id    || '';
  const dateVal     = data?.date        || data?.date_facture  || today();
  const echeanceVal = data?.dateEcheance|| data?.date_echeance || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  document.getElementById('fact-client').value       = clientIdVal;
  document.getElementById('fact-objet').value        = data?.objet || '';
  document.getElementById('fact-date').value         = dateVal;
  document.getElementById('fact-echeance').value     = echeanceVal;
  document.getElementById('fact-statut-sel').value   = data?.statut || 'impaye';
  document.getElementById('fact-notes').value        = data?.notes || '';
  _factureLines = data?.lignes ? data.lignes.map(l => ({...l, id: genId()})) : [];
  if (_factureLines.length === 0) addFactureLine();
  else renderFactureLines();
  // Lock if validated
  const saveBtn = document.getElementById('btn-save-facture');
  if (data?.statut === 'valide' && saveBtn) { saveBtn.disabled = true; saveBtn.title = 'Facture validée — non modifiable'; }
  document.getElementById('fact-modal-title').innerHTML = `<i class="fas fa-file-invoice-dollar"></i> ${data ? 'Modifier facture' : 'Nouvelle facture'}`;
  openModal('facture-modal');
}

async function saveFacture() {
  const clientId = document.getElementById('fact-client').value;
  const objet = document.getElementById('fact-objet').value.trim();
  if (!clientId || !objet) { showToast('Client et objet requis', 'error'); return; }
  const id = document.getElementById('fact-id').value;
  const cid = App.currentCompany?.id || App.currentUser?.companyId;
  if (!App.data.factures) App.data.factures = [];
  const client = App.data.clients?.find(c => c.id === clientId);
  
  let totalHT = 0, totalTVA = 0;
  _factureLines.forEach(l => { const ht = l.prixUnitaire * l.quantite; totalHT += ht; totalTVA += calcTVA(ht, l.tva); });
  const totalTTC = Math.round((totalHT + totalTVA) * 100) / 100;
  const statutSel = document.getElementById('fact-statut-sel').value;
  
  const sbData = {
    company_id:   cid,
    client_id:    clientId,
    client_nom:   client?.nom || '',
    objet,
    type:         document.getElementById('fact-type-sel').value,
    date_facture: document.getElementById('fact-date').value,
    date_echeance:document.getElementById('fact-echeance').value || null,
    statut:       statutSel,
    notes:        document.getElementById('fact-notes').value,
    lignes:       _factureLines.map(l => ({...l})),
    total_ht:     Math.round(totalHT * 100) / 100,
    total_tva:    Math.round(totalTVA * 100) / 100,
    total_ttc:    totalTTC,
    montant_paye: statutSel === 'paye' ? totalTTC : 0,
    reste_a_payer:statutSel === 'paye' ? 0 : totalTTC,
    paiements:    [],
  };

  const localData = {
    ...sbData,
    clientId, clientNom: client?.nom || '',
    date: sbData.date_facture, dateEcheance: sbData.date_echeance,
    totalHT: sbData.total_ht, totalTVA: sbData.total_tva, totalTTC,
    montantPaye: sbData.montant_paye, resteAPayer: sbData.reste_a_payer,
    companyId: cid,
  };

  const btn = document.getElementById('btn-save-facture');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }

  try {
    if (!App.isDemoMode && cid) {
      if (id) {
        const saved = await sbUpdate('factures', id, sbData);
        const idx = App.data.factures.findIndex(f => f.id === id);
        if (idx > -1) App.data.factures[idx] = normalizeFacture({ ...App.data.factures[idx], ...saved, ...localData });
        addHistory('factures', id, 'Modification', client?.nom);
      } else {
        const numero = await genNumeroSafe('F', 'factures');
        const saved = await sbInsert('factures', { ...sbData, numero });
        App.data.factures.push(normalizeFacture({ ...saved, ...localData, numero }));
        addHistory('factures', saved.id, 'Création', `Facture: ${numero}`);
      }
    } else {
      if (id) {
        const idx = App.data.factures.findIndex(f => f.id === id);
        if (idx > -1) { App.data.factures[idx] = { ...App.data.factures[idx], ...localData }; addHistory('factures', id, 'Modification', client?.nom); }
      } else {
        const newF = { ...localData, id: genId(), numero: genNumero('F', App.data.factures), createdAt: today() };
        App.data.factures.push(newF);
        addHistory('factures', newF.id, 'Création', `Facture: ${newF.numero}`);
      }
    }
    addAuditLog('Facture', `${id ? 'Modifiée' : 'Créée'}: ${client?.nom}`);
    if (App.isDemoMode && typeof persistSave === 'function') persistSave();
    closeModal('facture-modal');
    renderFactures();
    generateNotifications();
    showToast('Facture enregistrée !', 'success');
  } catch(err) {
    console.error('saveFacture error:', err);
    showToast('Erreur sauvegarde: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Enregistrer'; }
  }
}

function editFacture(id) {
  const f = App.data.factures?.find(f => f.id === id);
  if (f?.statut === 'valide') { showToast('Facture validée — non modifiable. Créez un avoir.', 'error'); return; }
  if (f) showFactureModal(f);
}

function validerFacture(id) {
  const f = App.data.factures?.find(f => f.id === id);
  showConfirm(`Valider la facture ${f?.numero} ? Elle ne pourra plus être modifiée ou supprimée.`, async () => {
    f.statut = 'valide';
    try { if (!App.isDemoMode) await sbUpdate('factures', id, { statut: 'valide' }); } catch(e) {}
    addHistory('factures', id, 'Validée', 'Facture verrouillée');
    addAuditLog('Facture', `Validée: ${f.numero}`);
    renderFactures();
    showToast('Facture validée !', 'success');
  }, 'warning');
}

function deleteFacture(id) {
  const f = App.data.factures?.find(f => f.id === id);
  if (f?.statut === 'valide' || f?.statut === 'paye') { showToast('Impossible de supprimer une facture validée/payée. Créez un avoir.', 'error'); return; }
  showConfirm(`Supprimer la facture ${f?.numero} ?`, async () => {
    try {
      if (!App.isDemoMode) await sbDelete('factures', id);
    } catch(e) {
      showToast('Erreur suppression: ' + e.message, 'error');
      return;
    }
    App.data.factures = App.data.factures.filter(f => f.id !== id);
    addAuditLog('Facture', `Supprimée: ${f?.numero}`);
    if (App.isDemoMode && typeof persistSave === 'function') persistSave();
    renderFactures();
    showToast('Facture supprimée', 'success');
  });
}

function showPaiementModal(factureId) {
  const f = App.data.factures?.find(f => f.id === factureId);
  if (!f) return;
  // Compatibilité snake_case + camelCase
  const ttc   = f.totalTTC    ?? f.total_ttc    ?? 0;
  const reste = f.resteAPayer ?? f.reste_a_payer ?? ttc;
  document.getElementById('pmt-facture-id').value = factureId;
  document.getElementById('pmt-montant').value    = reste > 0 ? reste : ttc;
  document.getElementById('pmt-date').value        = today();
  document.getElementById('pmt-ref').value         = '';
  document.getElementById('pmt-info').innerHTML    = `<i class="fas fa-info-circle"></i> <strong>${f.numero}</strong> — Total TTC: ${formatMAD(ttc)} | Reste: <strong style="color:var(--danger)">${formatMAD(reste > 0 ? reste : ttc)}</strong>`;
  openModal('paiement-modal');
}

async function savePaiement() {
  const factureId = document.getElementById('pmt-facture-id').value;
  const montant = parseFloat(document.getElementById('pmt-montant').value);
  if (!montant || montant <= 0) { showToast('Montant invalide', 'error'); return; }
  const f = App.data.factures?.find(f => f.id === factureId);
  if (!f) return;
  
  if (!f.paiements) f.paiements = [];
  const pmt = { id: genId(), montant, mode: document.getElementById('pmt-mode').value, date: document.getElementById('pmt-date').value, reference: document.getElementById('pmt-ref').value };
  f.paiements.push(pmt);
  
  const totalTTC = f.total_ttc || f.totalTTC || 0;
  f.montant_paye = (f.montant_paye || f.montantPaye || 0) + montant;
  f.montantPaye  = f.montant_paye;
  f.reste_a_payer = Math.max(0, totalTTC - f.montant_paye);
  f.resteAPayer   = f.reste_a_payer;
  
  if (f.reste_a_payer <= 0.01) { f.statut = 'paye'; f.reste_a_payer = 0; f.resteAPayer = 0; }
  else if (f.montant_paye > 0) { f.statut = 'partiellement_paye'; }

  const btn = document.querySelector('#paiement-modal .btn-success');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }

  try {
    if (!App.isDemoMode) {
      // Mettre à jour la facture ET créer un enregistrement paiement dans Supabase
      await sbUpdate('factures', factureId, {
        paiements:    f.paiements,
        montant_paye: f.montant_paye,
        reste_a_payer:f.reste_a_payer,
        statut:       f.statut,
      });
      // Enregistrer dans la table paiements
      const cid = App.currentCompany?.id || App.currentUser?.companyId;
      const pmtSb = await sbInsert('paiements', {
        company_id:   cid,
        facture_id:   factureId,
        client_id:    f.client_id || f.clientId,
        client_nom:   f.client_nom || f.clientNom,
        montant,
        mode:         pmt.mode,
        date_paiement:pmt.date,
        reference:    pmt.reference,
      });
      if (!App.data.paiements) App.data.paiements = [];
      App.data.paiements.push({ ...pmtSb, montantPaye: montant, mode: pmt.mode });
    }
    addHistory('factures', f.id, 'Paiement', `${formatMAD(montant)} (${pmt.mode})`);
    addAuditLog('Paiement', `${formatMAD(montant)} sur facture ${f.numero}`);
    closeModal('paiement-modal');
    renderFactures();
    generateNotifications();
    showToast(`Paiement de ${formatMAD(montant)} enregistré !`, 'success');
  } catch(err) {
    console.error('savePaiement error:', err);
    showToast('Erreur paiement: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Confirmer paiement'; }
  }
}

function showQRCode(id) {
  const f = App.data.factures?.find(f => f.id === id);
  if (!f) return;
  
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div class="modal-box modal-sm" style="text-align:center">
      <div class="modal-header"><h3><i class="fas fa-qrcode"></i> QR Code — ${f.numero}</h3><button onclick="this.closest('.modal-overlay').remove()" class="modal-close">&times;</button></div>
      <div class="modal-body">
        <div id="qr-container" style="display:flex;justify-content:center;margin:16px 0"></div>
        <p style="font-size:12px;color:var(--text-muted)">Facture: ${f.numero}<br>Client: ${f.clientNom}<br>Montant: ${formatMAD(f.totalTTC)}</p>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  
  setTimeout(() => {
    try {
      new QRCode(document.getElementById('qr-container'), {
        text: `FACTURE:${f.numero}|CLIENT:${f.clientNom}|MONTANT:${f.totalTTC}|DATE:${f.date}`,
        width: 200, height: 200, colorDark: '#1e3a5f', colorLight: '#ffffff',
      });
    } catch(e) {
      document.getElementById('qr-container').innerHTML = `<p style="color:var(--text-muted);font-size:12px">Librairie QR non disponible hors ligne</p>`;
    }
  }, 100);
  
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

function sendFactureEmail(id) {
  const f = App.data.factures?.find(f => f.id === id);
  if (!f) return;
  // Compatibilité snake_case + camelCase pour clientId
  const clientId = f.clientId || f.client_id;
  const client   = App.data.clients?.find(c => c.id === clientId);
  const ttc      = f.totalTTC ?? f.total_ttc ?? 0;
  const echeance = f.dateEcheance || f.date_echeance;
  showEmailModal(
    client?.email || '',
    `Facture ${f.numero} — ${f.objet}`,
    `Bonjour,\n\nVeuillez trouver ci-joint notre facture ${f.numero} d'un montant de ${formatMAD(ttc)}, échéance ${echeance ? formatDate(echeance) : 'à réception'}.\n\nCordialement,\n${App.currentCompany?.name || 'GestionApp'}`,
    `${f.numero}.pdf`,
    () => { addHistory('factures', f.id, 'Email envoyé', `À: ${client?.email}`); }
  );
}

function previewFacture(id) {
  const f = App.data.factures?.find(f => f.id === id);
  if (!f) return;
  const clientId = f.clientId || f.client_id;
  const client   = App.data.clients?.find(c => c.id === clientId);
  generateFacturePDF(f, client);
}

function exportFEC() {
  const factures = getCompanyData('factures').filter(f => f.statut !== 'avoir');
  let csv = 'JournalCode;EcritureDate;CompteNum;CompteLib;PieceRef;PieceDate;EcritureLib;Debit;Credit\n';
  factures.forEach(f => {
    const d = (f.date || '').replace(/-/g, '');
    csv += `VT;${d};411000;${f.clientNom};${f.numero};${d};${f.objet};${f.totalTTC?.toFixed(2) || '0.00'};0.00\n`;
    csv += `VT;${d};706000;Ventes;${f.numero};${d};${f.objet};0.00;${f.totalHT?.toFixed(2) || '0.00'}\n`;
    csv += `VT;${d};445710;TVA collectée;${f.numero};${d};${f.objet};0.00;${f.totalTVA?.toFixed(2) || '0.00'}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `FEC_${today()}.csv`; a.click();
  URL.revokeObjectURL(url);
  addAuditLog('Export FEC', `${factures.length} factures exportées`);
  showToast('Export FEC téléchargé !', 'success');
}
