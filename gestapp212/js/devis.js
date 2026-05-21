/* ============================================================
   DEVIS MODULE - Templates BTP, Signature, Comparaison
============================================================ */

// BTP Templates
const BTP_TEMPLATES = [
  { id: 'maconnerie', label: '🧱 Maçonnerie', items: [
    { designation: 'Fondations en béton armé', unite: 'm³', prixUnitaire: 850, tva: 20 },
    { designation: 'Maçonnerie briques creuses', unite: 'm²', prixUnitaire: 180, tva: 20 },
    { designation: 'Dallage béton e=12cm', unite: 'm²', prixUnitaire: 120, tva: 20 },
    { designation: 'Enduit intérieur ciment', unite: 'm²', prixUnitaire: 65, tva: 20 },
    { designation: 'Main d\'œuvre maçon', unite: 'jour', prixUnitaire: 350, tva: 20 },
  ]},
  { id: 'electricite', label: '⚡ Électricité', items: [
    { designation: 'Tableau électrique 24 modules', unite: 'u', prixUnitaire: 1200, tva: 20 },
    { designation: 'Câble 2.5mm² rouge/noir', unite: 'ml', prixUnitaire: 12, tva: 20 },
    { designation: 'Prise de courant 16A', unite: 'u', prixUnitaire: 45, tva: 20 },
    { designation: 'Interrupteur va-et-vient', unite: 'u', prixUnitaire: 38, tva: 20 },
    { designation: 'Luminaire LED 12W', unite: 'u', prixUnitaire: 85, tva: 20 },
  ]},
  { id: 'plomberie', label: '🔧 Plomberie', items: [
    { designation: 'Tuyau PVC D110', unite: 'ml', prixUnitaire: 25, tva: 20 },
    { designation: 'Robinet mitigeur lavabo', unite: 'u', prixUnitaire: 280, tva: 20 },
    { designation: 'WC suspendu complet', unite: 'u', prixUnitaire: 1800, tva: 20 },
    { designation: 'Chauffe-eau 100L', unite: 'u', prixUnitaire: 2400, tva: 20 },
    { designation: 'Main d\'œuvre plombier', unite: 'jour', prixUnitaire: 400, tva: 20 },
  ]},
  { id: 'peinture', label: '🎨 Peinture', items: [
    { designation: 'Peinture intérieure blanche', unite: 'm²', prixUnitaire: 35, tva: 20 },
    { designation: 'Peinture façade', unite: 'm²', prixUnitaire: 55, tva: 20 },
    { designation: 'Sous-couche primaire', unite: 'm²', prixUnitaire: 15, tva: 20 },
    { designation: 'Enduit de lissage', unite: 'm²', prixUnitaire: 25, tva: 20 },
    { designation: 'Main d\'œuvre peintre', unite: 'jour', prixUnitaire: 300, tva: 20 },
  ]},
  { id: 'carrelage', label: '🏠 Carrelage', items: [
    { designation: 'Carrelage sol 60x60', unite: 'm²', prixUnitaire: 95, tva: 20 },
    { designation: 'Faïence mural 30x60', unite: 'm²', prixUnitaire: 75, tva: 20 },
    { designation: 'Colle carrelage', unite: 'sac', prixUnitaire: 45, tva: 20 },
    { designation: 'Joint carrelage', unite: 'sac', prixUnitaire: 25, tva: 20 },
    { designation: 'Main d\'œuvre carreleur', unite: 'jour', prixUnitaire: 380, tva: 20 },
  ]},
  { id: 'menuiserie', label: '🚪 Menuiserie', items: [
    { designation: 'Porte intérieure HDF 90cm', unite: 'u', prixUnitaire: 1200, tva: 20 },
    { designation: 'Fenêtre PVC 120x120', unite: 'u', prixUnitaire: 2800, tva: 20 },
    { designation: 'Porte blindée entrée', unite: 'u', prixUnitaire: 5500, tva: 20 },
    { designation: 'Volet roulant électrique', unite: 'u', prixUnitaire: 1800, tva: 20 },
    { designation: 'Pose menuiserie', unite: 'u', prixUnitaire: 200, tva: 20 },
  ]},
];

function renderDevis() {
  const devis = getCompanyData('devis');
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fas fa-file-alt"></i> Devis</div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" onclick="showCompareDevis()"><i class="fas fa-balance-scale"></i> Comparer</button>
        ${canDo('create','devis') ? `<button class="btn btn-primary" onclick="showDevisModal()"><i class="fas fa-plus"></i> Nouveau devis</button>` : ''}
      </div>
    </div>

    <div class="filter-bar">
      <input type="text" id="devis-search" class="form-control" placeholder="Rechercher..." oninput="filterDevis()" style="max-width:250px">
      <select id="devis-statut-filter" class="form-control" onchange="filterDevis()" style="max-width:160px">
        <option value="">Tous les statuts</option>
        <option value="brouillon">Brouillon</option>
        <option value="envoye">Envoyé</option>
        <option value="accepte">Accepté</option>
        <option value="refuse">Refusé</option>
      </select>
    </div>

    <div class="card">
      <div class="card-header"><h3><i class="fas fa-list"></i> Liste des devis (${devis.length})</h3></div>
      <div class="table-responsive">
        <table class="table">
          <thead><tr><th></th><th>N°</th><th>Client</th><th>Objet</th><th>Date</th><th>Validité</th><th>Total TTC</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody id="devis-tbody">${renderDevisRows(devis)}</tbody>
        </table>
      </div>
    </div>

    <!-- Devis Form Modal -->
    <div id="devis-modal" class="modal-overlay" style="display:none">
      <div class="modal-box modal-xl">
        <div class="modal-header">
          <h3 id="devis-modal-title"><i class="fas fa-file-alt"></i> Nouveau devis</h3>
          <button onclick="closeModal('devis-modal')" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="devis-id">
          <div class="grid-2 mb-3">
            <div class="form-group">
              <label>Client *</label>
              <select id="devis-client" class="form-control">
                <option value="">-- Sélectionner --</option>
                ${getCompanyData('clients').map(c => `<option value="${c.id}" data-email="${c.email || ''}">${c.nom}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Objet / Titre *</label>
              <input type="text" id="devis-objet" class="form-control" placeholder="Travaux de rénovation...">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Date</label>
              <input type="date" id="devis-date" class="form-control" value="${today()}">
            </div>
            <div class="form-group">
              <label>Validité jusqu'au</label>
              <input type="date" id="devis-validite" class="form-control">
            </div>
            <div class="form-group">
              <label>Statut</label>
              <select id="devis-statut" class="form-control">
                <option value="brouillon">Brouillon</option>
                <option value="envoye">Envoyé</option>
                <option value="accepte">Accepté</option>
                <option value="refuse">Refusé</option>
              </select>
            </div>
          </div>

          <!-- Template BTP -->
          <div class="mb-3">
            <label style="font-size:13px;font-weight:600;display:block;margin-bottom:8px">Modèle BTP rapide :</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              ${BTP_TEMPLATES.map(t => `<button class="btn-demo" onclick="loadTemplate('${t.id}')">${t.label}</button>`).join('')}
              <button class="btn-demo" onclick="clearLines()">🗑️ Vider</button>
            </div>
          </div>

          <!-- Lignes -->
          <div class="card mb-3">
            <div class="card-header" style="justify-content:space-between">
              <h3 style="font-size:14px"><i class="fas fa-list"></i> Lignes du devis</h3>
              <button class="btn btn-ghost btn-sm" onclick="addDevisLine()"><i class="fas fa-plus"></i> Ajouter ligne</button>
            </div>
            <div class="table-responsive">
              <table class="table" id="devis-lines-table">
                <thead><tr><th>#</th><th>Désignation</th><th>Unité</th><th>Qté</th><th>Prix U. HT</th><th>Remise %</th><th>TVA</th><th>Total TTC</th><th></th></tr></thead>
                <tbody id="devis-lines-tbody"></tbody>
              </table>
            </div>
          </div>

          <!-- Totaux -->
          <div style="display:flex;justify-content:flex-end">
            <div style="min-width:300px">
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
                <span>Total HT</span><strong id="d-total-ht">0,00 MAD</strong>
              </div>
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
                <span>TVA</span><strong id="d-total-tva">0,00 MAD</strong>
              </div>
              <div style="display:flex;justify-content:space-between;padding:10px 0;font-size:18px;color:var(--primary);font-weight:800">
                <span>Total TTC</span><strong id="d-total-ttc">0,00 MAD</strong>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>Notes / Conditions</label>
            <textarea id="devis-notes" class="form-control" rows="3" placeholder="Validité 30 jours, paiement à la commande..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button onclick="closeModal('devis-modal')" class="btn btn-ghost">Annuler</button>
          <button onclick="saveDevis('brouillon')" class="btn btn-ghost"><i class="fas fa-save"></i> Brouillon</button>
          <button onclick="saveDevis('envoye')" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Enregistrer & Envoyer</button>
        </div>
      </div>
    </div>

    <!-- Compare Modal -->
    <div id="compare-modal" class="modal-overlay" style="display:none">
      <div class="modal-box modal-xl">
        <div class="modal-header">
          <h3><i class="fas fa-balance-scale"></i> Comparaison de devis</h3>
          <button onclick="closeModal('compare-modal')" class="modal-close">&times;</button>
        </div>
        <div class="modal-body" id="compare-body"></div>
      </div>
    </div>
  `;
  initDevisLines();
}

function renderDevisRows(devis) {
  if (devis.length === 0) return `<tr><td colspan="9" class="text-center text-muted" style="padding:30px">Aucun devis</td></tr>`;
  return devis.map(d => {
    // Compatibilité snake_case (Supabase) ET camelCase (mock)
    const clientNom = d.clientNom || d.client_nom || '—';
    const totalTTC  = d.totalTTC  ?? d.total_ttc  ?? 0;
    const date      = d.date      || d.date_devis  || '';
    const dateVal   = d.dateValidite || d.date_validite || '';
    const isFav = isFavorite('devis', d.id);
    return `
      <tr>
        <td><button class="star-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('devis','${d.id}','${d.numero}')"><i class="fas fa-star"></i></button></td>
        <td><strong>${d.numero}</strong></td>
        <td>${clientNom}</td>
        <td>${d.objet || '—'}</td>
        <td>${formatDate(date)}</td>
        <td>${dateVal ? formatDate(dateVal) : '—'}</td>
        <td style="font-weight:600">${formatMAD(totalTTC)}</td>
        <td>${getStatusBadge(d.statut)}</td>
        <td>
          <div style="display:flex;gap:3px;flex-wrap:wrap">
            <button class="btn btn-ghost btn-xs" onclick="editDevis('${d.id}')" title="Modifier"><i class="fas fa-edit"></i></button>
            <button class="btn btn-ghost btn-xs" onclick="previewDevis('${d.id}')" title="Aperçu PDF / Imprimer"><i class="fas fa-file-pdf" style="color:#e53e3e"></i></button>
            <button class="btn btn-ghost btn-xs" onclick="sendDevisEmail('${d.id}')" title="Email"><i class="fas fa-envelope"></i></button>
            <button class="btn btn-ghost btn-xs" onclick="signDevis('${d.id}')" title="Signer"><i class="fas fa-signature"></i></button>
            ${canDo('create','factures') ? `<button class="btn btn-success btn-xs" onclick="convertToFacture('${d.id}')" title="→ Facture"><i class="fas fa-file-invoice-dollar"></i></button>` : ''}
            ${canDo('delete','devis') ? `<button class="btn btn-ghost btn-xs text-danger" onclick="deleteDevis('${d.id}')" title="Supprimer"><i class="fas fa-trash"></i></button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterDevis() {
  const q = document.getElementById('devis-search')?.value.toLowerCase() || '';
  const statut = document.getElementById('devis-statut-filter')?.value || '';
  let devis = getCompanyData('devis');
  if (q) devis = devis.filter(d => `${d.numero} ${d.clientNom||d.client_nom||''} ${d.objet||''}`.toLowerCase().includes(q));
  if (statut) devis = devis.filter(d => d.statut === statut);
  const tbody = document.getElementById('devis-tbody');
  if (tbody) tbody.innerHTML = renderDevisRows(devis);
}

// Lines management
let _devisLines = [];

function initDevisLines() {
  _devisLines = [];
  addDevisLine();
}

function addDevisLine(data = null) {
  const id = genId();
  _devisLines.push({ id, designation: data?.designation || '', unite: data?.unite || 'u', quantite: data?.quantite || 1, prixUnitaire: data?.prixUnitaire || 0, remise: data?.remise || 0, tva: data?.tva || 20 });
  renderDevisLines();
}

function renderDevisLines() {
  const tbody = document.getElementById('devis-lines-tbody');
  if (!tbody) return;
  tbody.innerHTML = _devisLines.map((l, i) => {
    const ht = l.prixUnitaire * l.quantite * (1 - l.remise / 100);
    const ttc = calcTTC(ht, l.tva);
    // data-line-id permet de cibler la ligne sans re-render
    return `
      <tr data-line-id="${l.id}">
        <td>${i + 1}</td>
        <td><input type="text" class="form-control" style="min-width:180px" value="${escHtml(l.designation)}" onchange="updateLine('${l.id}','designation',this.value)" placeholder="Désignation"></td>
        <td><select class="form-control" style="width:80px" onchange="updateLine('${l.id}','unite',this.value)">
          ${['u','m²','ml','m³','kg','t','sac','jour','forfait'].map(u => `<option ${l.unite===u?'selected':''}>${u}</option>`).join('')}
        </select></td>
        <td><input type="number" class="form-control" style="width:70px" value="${l.quantite}" min="0" step="0.01" onchange="updateLine('${l.id}','quantite',+this.value)"></td>
        <td><input type="number" class="form-control" style="width:100px" value="${l.prixUnitaire}" min="0" step="0.01" onchange="updateLine('${l.id}','prixUnitaire',+this.value)"></td>
        <td><input type="number" class="form-control" style="width:65px" value="${l.remise}" min="0" max="100" onchange="updateLine('${l.id}','remise',+this.value)"></td>
        <td><select class="form-control" style="width:75px" onchange="updateLine('${l.id}','tva',+this.value)">
          ${[20,14,10,7,0].map(t => `<option value="${t}" ${l.tva===t?'selected':''}>${t}%</option>`).join('')}
        </select></td>
        <td style="font-weight:600;white-space:nowrap" class="line-ttc">${formatMAD(ttc)}</td>
        <td><button class="btn btn-ghost btn-xs text-danger" onclick="removeLine('${l.id}')"><i class="fas fa-times"></i></button></td>
      </tr>
    `;
  }).join('');
  updateDevisTotals();
}

function updateLine(id, field, value) {
  const l = _devisLines.find(l => l.id === id);
  if (!l) return;
  l[field] = value;

  // ⚠️ BUG FIX : NE PAS re-render toute la table (perd le focus du champ)
  // On met à jour uniquement le total TTC de la ligne + les totaux globaux
  const ht  = l.prixUnitaire * l.quantite * (1 - l.remise / 100);
  const ttc = calcTTC(ht, l.tva);
  const row = document.querySelector(`[data-line-id="${id}"]`);
  if (row) {
    const ttcEl = row.querySelector('.line-ttc');
    if (ttcEl) ttcEl.textContent = formatMAD(ttc);
  }
  updateDevisTotals();
}

function removeLine(id) {
  _devisLines = _devisLines.filter(l => l.id !== id);
  renderDevisLines();
}

function clearLines() { _devisLines = []; addDevisLine(); }

function updateDevisTotals() {
  let totalHT = 0, totalTVA = 0;
  _devisLines.forEach(l => {
    const ht = l.prixUnitaire * l.quantite * (1 - l.remise / 100);
    totalHT += ht;
    totalTVA += calcTVA(ht, l.tva);
  });
  const totalTTC = totalHT + totalTVA;
  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = formatMAD(val); };
  el('d-total-ht', totalHT); el('d-total-tva', totalTVA); el('d-total-ttc', totalTTC);
}

function loadTemplate(templateId) {
  const tpl = BTP_TEMPLATES.find(t => t.id === templateId);
  if (!tpl) return;
  _devisLines = [];
  tpl.items.forEach(item => addDevisLine(item));
  showToast(`Template ${tpl.label} chargé !`, 'success');
}

function showDevisModal(data = null) {
  document.getElementById('devis-id').value = data?.id || '';
  // Compatibilité snake_case + camelCase
  const clientIdVal   = data?.clientId    || data?.client_id    || '';
  const dateVal       = data?.date        || data?.date_devis   || today();
  const dateValidite  = data?.dateValidite|| data?.date_validite|| '';
  document.getElementById('devis-client').value    = clientIdVal;
  document.getElementById('devis-objet').value     = data?.objet || '';
  document.getElementById('devis-date').value      = dateVal;
  document.getElementById('devis-validite').value  = dateValidite;
  document.getElementById('devis-statut').value    = data?.statut || 'brouillon';
  document.getElementById('devis-notes').value     = data?.notes || '';
  _devisLines = data?.lignes ? data.lignes.map(l => ({...l, id: genId()})) : [];
  if (_devisLines.length === 0) addDevisLine();
  else renderDevisLines();
  document.getElementById('devis-modal-title').innerHTML = `<i class="fas fa-file-alt"></i> ${data ? 'Modifier devis' : 'Nouveau devis'}`;
  openModal('devis-modal');
}

async function saveDevis(statut) {
  const clientId = document.getElementById('devis-client').value;
  const objet = document.getElementById('devis-objet').value.trim();
  if (!clientId || !objet) { showToast('Client et objet requis', 'error'); return; }
  
  const client = App.data.clients?.find(c => c.id === clientId);
  const id = document.getElementById('devis-id').value;
  const cid = App.currentCompany?.id || App.currentUser?.companyId;
  if (!App.data.devis) App.data.devis = [];
  
  let totalHT = 0, totalTVA = 0;
  _devisLines.forEach(l => {
    const ht = l.prixUnitaire * l.quantite * (1 - l.remise / 100);
    totalHT += ht;
    totalTVA += calcTVA(ht, l.tva);
  });

  const statutFinal = document.getElementById('devis-statut').value || statut;
  
  // Données au format Supabase (snake_case)
  const sbData = {
    company_id:    cid,
    client_id:     clientId,
    client_nom:    client?.nom || '',
    objet,
    date_devis:    document.getElementById('devis-date').value,
    date_validite: document.getElementById('devis-validite').value || null,
    statut:        statutFinal,
    notes:         document.getElementById('devis-notes').value,
    lignes:        _devisLines.map(l => ({ ...l })),
    total_ht:      Math.round(totalHT * 100) / 100,
    total_tva:     Math.round(totalTVA * 100) / 100,
    total_ttc:     Math.round((totalHT + totalTVA) * 100) / 100,
  };

  // Données en mémoire (camelCase + snake_case pour compatibilité)
  const localData = {
    ...sbData,
    clientId, clientNom: client?.nom || '',
    date: sbData.date_devis, dateValidite: sbData.date_validite,
    totalHT: sbData.total_ht, totalTVA: sbData.total_tva, totalTTC: sbData.total_ttc,
    companyId: cid,
  };

  const btn = document.querySelector('#devis-modal .btn-primary');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sauvegarde...'; }
  
  try {
    if (!App.isDemoMode && cid) {
      // ── MODE SUPABASE : sauvegarde persistante ─────────────
      if (id) {
        const saved = await sbUpdate('devis', id, sbData);
        const idx = App.data.devis.findIndex(d => d.id === id);
        if (idx > -1) App.data.devis[idx] = normalizeDevis({ ...App.data.devis[idx], ...saved, ...localData });
        addHistory('devis', id, 'Modification', `Statut: ${statutFinal}`);
      } else {
        const numero = await genNumeroSafe('D', 'devis');
        const saved = await sbInsert('devis', { ...sbData, numero });
        const newD = normalizeDevis({ ...saved, ...localData, numero });
        App.data.devis.push(newD);
        addHistory('devis', newD.id, 'Création', `Devis: ${numero}`);
      }
    } else {
      // ── MODE DÉMO : mémoire seulement ─────────────────────
      if (id) {
        const idx = App.data.devis.findIndex(d => d.id === id);
        if (idx > -1) { App.data.devis[idx] = { ...App.data.devis[idx], ...localData }; addHistory('devis', id, 'Modification', `Statut: ${statutFinal}`); }
      } else {
        const newD = { ...localData, id: genId(), numero: genNumero('D', App.data.devis), createdAt: today() };
        App.data.devis.push(newD);
        addHistory('devis', newD.id, 'Création', `Devis: ${newD.numero}`);
      }
    }

    addAuditLog('Devis', `${id ? 'Modifié' : 'Créé'}: ${client?.nom}`);
    if (App.isDemoMode && typeof persistSave === 'function') persistSave();
    closeModal('devis-modal');
    renderDevis();
    showToast('Devis enregistré !', 'success');
    if (statutFinal === 'envoye') sendDevisEmail(id || App.data.devis[App.data.devis.length - 1]?.id);

  } catch(err) {
    console.error('saveDevis error:', err);
    showToast('Erreur sauvegarde: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enregistrer & Envoyer'; }
  }
}

async function deleteDevisAsync(id) {
  try {
    if (!App.isDemoMode) await sbDelete('devis', id);
  } catch(e) { console.warn('Delete devis Supabase:', e.message); }
}

function editDevis(id) {
  const d = App.data.devis?.find(d => d.id === id);
  if (d) showDevisModal(d);
}

function deleteDevis(id) {
  const d = App.data.devis?.find(d => d.id === id);
  showConfirm(`Supprimer le devis "${d?.numero}" ?`, async () => {
    await deleteDevisAsync(id);
    App.data.devis = App.data.devis.filter(d => d.id !== id);
    addAuditLog('Devis', `Supprimé: ${d?.numero}`);
    if (App.isDemoMode && typeof persistSave === 'function') persistSave();
    renderDevis();
    showToast('Devis supprimé', 'success');
  });
}

function sendDevisEmail(id) {
  const d = App.data.devis?.find(d => d.id === id);
  if (!d) return;
  const cid = d.clientId || d.client_id;
  const client = App.data.clients?.find(c => c.id === cid);
  const ttc = d.totalTTC ?? d.total_ttc ?? 0;
  showEmailModal(
    client?.email || '',
    `Devis ${d.numero} — ${d.objet}`,
    `Bonjour,\n\nVeuillez trouver ci-joint notre devis ${d.numero} d'un montant de ${formatMAD(ttc)}.\n\nCordialement,\n${App.currentCompany?.name || 'GestionApp'}`,
    `${d.numero}.pdf`,
    async () => {
      if (d.statut === 'brouillon') {
        d.statut = 'envoye';
        // ── Persister dans Supabase ──
        if (!App.isDemoMode) {
          try { await sbUpdate('devis', d.id, { statut: 'envoye' }); }
          catch(e) { console.warn('sendDevisEmail Supabase:', e.message); }
        }
        addHistory('devis', d.id, 'Email envoyé', `À: ${client?.email}`);
        renderDevis();
      }
    }
  );
}

function signDevis(id) {
  const d = App.data.devis?.find(d => d.id === id);
  if (!d) return;
  showSignatureModal(async (signatureData) => {
    d.signature     = signatureData;
    d.signatureDate = today();
    d.statut        = 'accepte';
    // ── Persister dans Supabase ──
    if (!App.isDemoMode) {
      try {
        await sbUpdate('devis', d.id, {
          statut:         'accepte',
          signature_url:  signatureData,
        });
      } catch(e) { console.warn('signDevis Supabase:', e.message); }
    }
    addHistory('devis', d.id, 'Signé électroniquement', `Le ${formatDate(today())}`);
    addAuditLog('Devis', `Signé: ${d.numero}`);
    renderDevis();
    showToast(`Devis ${d.numero} signé et accepté !`, 'success');
  });
}

function previewDevis(id) {
  const d = App.data.devis?.find(d => d.id === id);
  if (!d) return;
  const cid    = d.clientId || d.client_id;
  const client = App.data.clients?.find(c => c.id === cid);
  generateDevisPDF(d, client);
}

async function convertToFacture(id) {
  const d = App.data.devis?.find(d => d.id === id);
  if (!d) return;
  if (!App.data.factures) App.data.factures = [];
  const cid = App.currentCompany?.id || App.currentUser?.companyId;
  const echeance = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const sbData = {
    company_id:   cid,
    devis_id:     d.id,
    client_id:    d.client_id || d.clientId,
    client_nom:   d.client_nom || d.clientNom,
    objet:        d.objet,
    type:         'standard',
    date_facture: today(),
    date_echeance:echeance,
    lignes:       d.lignes?.map(l => ({...l})) || [],
    total_ht:     d.total_ht || d.totalHT || 0,
    total_tva:    d.total_tva || d.totalTVA || 0,
    total_ttc:    d.total_ttc || d.totalTTC || 0,
    statut:       'impaye',
    montant_paye: 0,
    reste_a_payer:d.total_ttc || d.totalTTC || 0,
    paiements:    [],
  };

  try {
    let newF;
    if (!App.isDemoMode && cid) {
      const numero = genNumero('F', App.data.factures);
      const saved = await sbInsert('factures', { ...sbData, numero });
      newF = { ...saved, ...sbData, numero,
        clientId: sbData.client_id, clientNom: sbData.client_nom,
        date: sbData.date_facture, dateEcheance: sbData.date_echeance,
        totalHT: sbData.total_ht, totalTVA: sbData.total_tva, totalTTC: sbData.total_ttc,
        montantPaye: 0, resteAPayer: sbData.reste_a_payer, companyId: cid,
      };
      // Marquer le devis comme accepté dans Supabase
      await sbUpdate('devis', d.id, { statut: 'accepte' });
    } else {
      newF = { ...sbData, id: genId(), numero: genNumero('F', App.data.factures),
        clientId: sbData.client_id, clientNom: sbData.client_nom,
        date: sbData.date_facture, dateEcheance: sbData.date_echeance,
        totalHT: sbData.total_ht, totalTVA: sbData.total_tva, totalTTC: sbData.total_ttc,
        montantPaye: 0, resteAPayer: sbData.reste_a_payer, companyId: cid,
        createdAt: today(),
      };
    }
    App.data.factures.push(newF);
    d.statut = 'accepte';
    if (d.total_ttc === undefined) d.total_ttc = sbData.total_ttc; // sync
    addHistory('factures', newF.id, 'Créée depuis devis', `Devis: ${d.numero}`);
    addAuditLog('Facture', `Créée depuis devis ${d.numero}`);
    showToast(`✅ Facture ${newF.numero} créée depuis ${d.numero}`, 'success');
    renderDevis();
  } catch(err) {
    console.error('convertToFacture error:', err);
    showToast('Erreur conversion: ' + err.message, 'error');
  }
}

function showCompareDevis() {
  const devis = getCompanyData('devis');
  const body = document.getElementById('compare-body');
  if (!body) {
    // Need to open the modal first
    openModal('compare-modal');
    return;
  }
  body.innerHTML = `
    <div class="form-row mb-3">
      <div class="form-group">
        <label>Devis A</label>
        <select id="cmp-a" class="form-control">
          <option value="">-- Sélectionner --</option>
          ${devis.map(d => `<option value="${d.id}">${d.numero} — ${d.clientNom}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Devis B</label>
        <select id="cmp-b" class="form-control">
          <option value="">-- Sélectionner --</option>
          ${devis.map(d => `<option value="${d.id}">${d.numero} — ${d.clientNom}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" style="align-self:flex-end">
        <button class="btn btn-primary" onclick="doCompare()"><i class="fas fa-balance-scale"></i> Comparer</button>
      </div>
    </div>
    <div id="cmp-result"></div>
  `;
  openModal('compare-modal');
}

function doCompare() {
  const idA = document.getElementById('cmp-a').value;
  const idB = document.getElementById('cmp-b').value;
  if (!idA || !idB || idA === idB) { showToast('Sélectionnez 2 devis différents', 'error'); return; }
  const a = App.data.devis?.find(d => d.id === idA);
  const b = App.data.devis?.find(d => d.id === idB);
  const result = document.getElementById('cmp-result');
  result.innerHTML = `
    <div class="grid-2">
      <div class="card">
        <div class="card-header" style="background:rgba(30,58,95,0.05)"><h3 style="color:var(--primary)">${a.numero} — ${a.clientNom}</h3></div>
        <div class="card-body">
          <p><strong>Objet:</strong> ${a.objet}</p>
          <p><strong>Date:</strong> ${formatDate(a.date)}</p>
          <p><strong>Statut:</strong> ${getStatusBadge(a.statut)}</p>
          <p><strong>HT:</strong> ${formatMAD(a.totalHT)}</p>
          <p><strong>TVA:</strong> ${formatMAD(a.totalTVA)}</p>
          <p style="font-size:18px;font-weight:800;color:var(--primary)">TTC: ${formatMAD(a.totalTTC)}</p>
          <p><strong>Lignes:</strong> ${a.lignes?.length || 0}</p>
        </div>
      </div>
      <div class="card">
        <div class="card-header" style="background:rgba(41,128,185,0.05)"><h3 style="color:var(--accent)">${b.numero} — ${b.clientNom}</h3></div>
        <div class="card-body">
          <p><strong>Objet:</strong> ${b.objet}</p>
          <p><strong>Date:</strong> ${formatDate(b.date)}</p>
          <p><strong>Statut:</strong> ${getStatusBadge(b.statut)}</p>
          <p><strong>HT:</strong> ${formatMAD(b.totalHT)}</p>
          <p><strong>TVA:</strong> ${formatMAD(b.totalTVA)}</p>
          <p style="font-size:18px;font-weight:800;color:var(--accent)">TTC: ${formatMAD(b.totalTTC)}</p>
          <p><strong>Lignes:</strong> ${b.lignes?.length || 0}</p>
        </div>
      </div>
    </div>
    <div class="card mt-3">
      <div class="card-body">
        <p style="font-size:16px;font-weight:700">
          ${a.totalTTC > b.totalTTC
            ? `<span style="color:var(--accent)">${b.numero}</span> est moins cher de <span style="color:var(--success)">${formatMAD(a.totalTTC - b.totalTTC)}</span>`
            : a.totalTTC < b.totalTTC
            ? `<span style="color:var(--primary)">${a.numero}</span> est moins cher de <span style="color:var(--success)">${formatMAD(b.totalTTC - a.totalTTC)}</span>`
            : `Les deux devis ont le même montant`
          }
        </p>
      </div>
    </div>
  `;
}
