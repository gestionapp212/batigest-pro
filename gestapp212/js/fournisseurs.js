/* ============================================================
   FOURNISSEURS MODULE — v4.0 DEFINITIF (Supabase persistence)
   Correction: colonnes notes/conditions robustes avec fallback
============================================================ */
function renderFournisseurs() {
  const fournisseurs = getCompanyData('fournisseurs');
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fas fa-truck"></i> Fournisseurs</div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" onclick="showImportModal('fournisseurs')"><i class="fas fa-file-import"></i> Importer</button>
        <button class="btn btn-primary" onclick="showFournisseurModal()"><i class="fas fa-plus"></i> Nouveau fournisseur</button>
      </div>
    </div>

    <div class="filter-bar">
      <input type="text" id="fourn-search" class="form-control" placeholder="Rechercher..." oninput="filterFournisseurs()" style="max-width:250px">
      <select id="fourn-cat" class="form-control" onchange="filterFournisseurs()" style="max-width:160px">
        <option value="">Toutes catégories</option>
        ${[...new Set(fournisseurs.map(f => f.categorie).filter(Boolean))].map(c => `<option value="${c}">${c}</option>`).join('')}
      </select>
    </div>

    <div class="card">
      <div class="table-responsive">
        <table class="table">
          <thead><tr><th></th><th>Nom</th><th>ICE</th><th>Catégorie</th><th>Contact</th><th>Téléphone</th><th>Email</th><th>Total achats</th><th>Actions</th></tr></thead>
          <tbody id="fourn-tbody">${renderFournisseursRows(fournisseurs)}</tbody>
        </table>
      </div>
    </div>

    <!-- Fournisseur Modal -->
    <div id="fourn-modal" class="modal-overlay" style="display:none">
      <div class="modal-box modal-lg">
        <div class="modal-header">
          <h3 id="fourn-modal-title"><i class="fas fa-truck"></i> Nouveau fournisseur</h3>
          <button onclick="closeModal('fourn-modal')" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="fourn-id">
          <div class="form-row">
            <div class="form-group"><label>Nom / Raison sociale *</label><input type="text" id="fourn-nom" class="form-control" placeholder="SARL Matériaux Maroc"></div>
            <div class="form-group"><label>ICE</label><input type="text" id="fourn-ice" class="form-control" placeholder="000000000000000" maxlength="15"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>RC</label><input type="text" id="fourn-rc" class="form-control"></div>
            <div class="form-group"><label>Identifiant Fiscal</label><input type="text" id="fourn-if" class="form-control"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Catégorie</label>
              <select id="fourn-cat-sel" class="form-control">
                <option value="Matériaux">Matériaux construction</option>
                <option value="Électricité">Électricité</option>
                <option value="Plomberie">Plomberie</option>
                <option value="Outillage">Outillage</option>
                <option value="Transport">Transport</option>
                <option value="Sous-traitant">Sous-traitant</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
            <div class="form-group"><label>Contact principal</label><input type="text" id="fourn-contact" class="form-control" placeholder="Nom du responsable"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Téléphone</label><input type="tel" id="fourn-tel" class="form-control"></div>
            <div class="form-group"><label>Email</label><input type="email" id="fourn-email" class="form-control"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Adresse</label><input type="text" id="fourn-adresse" class="form-control"></div>
            <div class="form-group"><label>Ville</label>
              <select id="fourn-ville" class="form-control">
                <option value="">--</option>
                ${['Casablanca','Rabat','Marrakech','Fès','Agadir','Tanger','Meknès','Oujda'].map(v => `<option value="${v}">${v}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group"><label>Conditions de paiement</label>
            <select id="fourn-conditions" class="form-control">
              <option value="comptant">Comptant</option>
              <option value="30j">30 jours</option>
              <option value="60j">60 jours</option>
              <option value="90j">90 jours</option>
            </select>
          </div>
          <div class="form-group"><label>Notes</label><textarea id="fourn-notes" class="form-control" rows="3" placeholder="Informations supplémentaires..."></textarea></div>
        </div>
        <div class="modal-footer">
          <button onclick="closeModal('fourn-modal')" class="btn btn-ghost">Annuler</button>
          <button onclick="saveFournisseur()" class="btn btn-primary" id="fourn-save-btn"><i class="fas fa-save"></i> Enregistrer</button>
        </div>
      </div>
    </div>
  `;
}

function renderFournisseursRows(fournisseurs) {
  if (fournisseurs.length === 0) return `<tr><td colspan="9" class="text-center text-muted" style="padding:30px">Aucun fournisseur. Cliquez sur "Nouveau fournisseur" pour en ajouter.</td></tr>`;
  return fournisseurs.map(f => {
    const totalAchats = getCompanyData('chantiers').reduce((total, c) => {
      return total + (c.achats || []).filter(a => a.fournisseur === f.nom).reduce((s, a) => s + (a.montant || 0), 0);
    }, 0);
    const isFav = isFavorite('fournisseurs', f.id);
    return `
      <tr>
        <td><button class="star-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('fournisseurs','${f.id}','${f.nom}')"><i class="fas fa-star"></i></button></td>
        <td><strong>${f.nom}</strong></td>
        <td><code style="font-size:11px">${f.ice || '—'}</code></td>
        <td><span class="badge badge-secondary">${f.categorie || '—'}</span></td>
        <td>${f.contact || '—'}</td>
        <td>${f.telephone || '—'}</td>
        <td>${f.email || '—'}</td>
        <td style="color:var(--accent);font-weight:600">${totalAchats > 0 ? formatMAD(totalAchats) : '—'}</td>
        <td>
          <div style="display:flex;gap:3px">
            <button class="btn btn-ghost btn-xs" onclick="editFournisseur('${f.id}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-ghost btn-xs" onclick="showHistoryModal('fournisseurs','${f.id}','${f.nom}')"><i class="fas fa-history"></i></button>
            <button class="btn btn-ghost btn-xs text-danger" onclick="deleteFournisseur('${f.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterFournisseurs() {
  const q   = document.getElementById('fourn-search')?.value.toLowerCase() || '';
  const cat = document.getElementById('fourn-cat')?.value || '';
  let fournisseurs = getCompanyData('fournisseurs');
  if (q)   fournisseurs = fournisseurs.filter(f => `${f.nom} ${f.ice} ${f.contact}`.toLowerCase().includes(q));
  if (cat) fournisseurs = fournisseurs.filter(f => f.categorie === cat);
  const tbody = document.getElementById('fourn-tbody');
  if (tbody) tbody.innerHTML = renderFournisseursRows(fournisseurs);
}

function showFournisseurModal(data = null) {
  document.getElementById('fourn-id').value      = data?.id      || '';
  document.getElementById('fourn-nom').value     = data?.nom     || '';
  document.getElementById('fourn-ice').value     = data?.ice     || '';
  document.getElementById('fourn-rc').value      = data?.rc      || '';
  document.getElementById('fourn-if').value      = data?.identifiant_fiscal || data?.identifiantFiscal || '';
  document.getElementById('fourn-contact').value = data?.contact || '';
  document.getElementById('fourn-tel').value     = data?.telephone || '';
  document.getElementById('fourn-email').value   = data?.email   || '';
  document.getElementById('fourn-adresse').value = data?.adresse || '';
  document.getElementById('fourn-notes').value   = data?.notes   || '';
  document.getElementById('fourn-cat-sel').value = data?.categorie   || 'Matériaux';
  document.getElementById('fourn-ville').value   = data?.ville   || '';
  document.getElementById('fourn-conditions').value = data?.conditions || 'comptant';
  document.getElementById('fourn-modal-title').innerHTML = `<i class="fas fa-truck"></i> ${data ? 'Modifier' : 'Nouveau'} fournisseur`;
  openModal('fourn-modal');
}

// ── Tentative d'enregistrement avec fallback progressif ───────
async function _sbSaveFournisseur(id, data) {
  // Tentative 1 : données complètes
  try {
    if (id) return await sbUpdate('fournisseurs', id, data);
    else    return await sbInsert('fournisseurs', data);
  } catch(e1) {
    const msg = e1.message || '';
    // Vérifier si c'est une erreur de colonnes manquantes
    const isSchemaMiss = msg.includes('notes') || msg.includes('conditions') ||
                         msg.includes('schema cache') || msg.includes('column') ||
                         msg.includes('contact') || msg.includes('adresse') ||
                         msg.includes('PGRST') || msg.includes('not found in the schema');

    if (!isSchemaMiss) throw e1; // Autre erreur → propager

    console.warn('[Fournisseur] Retry sans colonnes optionnelles. Erreur:', msg);

    // Tentative 2 : données minimales uniquement
    const minimal = {
      nom:       data.nom,
      company_id:data.company_id,
    };
    // Ajouter seulement les colonnes sûrement présentes
    const safeOptional = ['ice','rc','identifiant_fiscal','categorie','telephone','email','ville'];
    safeOptional.forEach(col => {
      if (data[col] !== undefined && data[col] !== null) minimal[col] = data[col];
    });

    if (id) return await sbUpdate('fournisseurs', id, minimal);
    else    return await sbInsert('fournisseurs', minimal);
  }
}

async function saveFournisseur() {
  const nom = (document.getElementById('fourn-nom').value || '').trim();
  if (!nom) { showToast('Nom requis', 'error'); return; }

  const id  = document.getElementById('fourn-id').value;
  const cid = App.currentUser?.companyId || App.currentUser?.company_id;
  if (!App.data.fournisseurs) App.data.fournisseurs = [];

  const identifiantFiscal = document.getElementById('fourn-if').value || '';

  // Données locales complètes
  const localData = {
    nom,
    ice:               document.getElementById('fourn-ice').value       || null,
    rc:                document.getElementById('fourn-rc').value        || null,
    identifiantFiscal,
    identifiant_fiscal:identifiantFiscal || null,
    categorie:         document.getElementById('fourn-cat-sel').value,
    contact:           document.getElementById('fourn-contact').value   || null,
    telephone:         document.getElementById('fourn-tel').value       || null,
    email:             document.getElementById('fourn-email').value     || null,
    adresse:           document.getElementById('fourn-adresse').value   || null,
    ville:             document.getElementById('fourn-ville').value     || null,
    conditions:        document.getElementById('fourn-conditions').value,
    notes:             document.getElementById('fourn-notes').value     || null,
    companyId: cid, company_id: cid,
  };

  // Données Supabase (snake_case)
  const sbData = {
    nom,
    ice:               localData.ice,
    rc:                localData.rc,
    identifiant_fiscal:localData.identifiant_fiscal,
    categorie:         localData.categorie,
    contact:           localData.contact,
    telephone:         localData.telephone,
    email:             localData.email,
    adresse:           localData.adresse,
    ville:             localData.ville,
    conditions:        localData.conditions,
    notes:             localData.notes,
    company_id:        cid,
  };

  // Nettoyer les null
  const cleanSbData = Object.fromEntries(
    Object.entries(sbData).filter(([, v]) => v !== null && v !== undefined)
  );

  const btn = document.getElementById('fourn-save-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...'; }

  try {
    if (id) {
      // Mise à jour
      const idx = App.data.fournisseurs.findIndex(f => f.id === id);
      if (idx > -1) {
        App.data.fournisseurs[idx] = { ...App.data.fournisseurs[idx], ...localData };
        addHistory('fournisseurs', id, 'Modification', nom);
      }

      if (!App.isDemoMode) {
        try {
          const updated = await _sbSaveFournisseur(id, cleanSbData);
          if (idx > -1 && updated) {
            App.data.fournisseurs[idx] = normalizeFournisseur({
              ...App.data.fournisseurs[idx], ...updated, ...localData
            });
          }
        } catch(sbErr) {
          console.error('[Fournisseur] Erreur Supabase update:', sbErr.message);
          showToast('Erreur sauvegarde: ' + sbErr.message, 'error');
          return;
        }
      }

    } else {
      // Création
      if (!App.isDemoMode) {
        try {
          const created = await _sbSaveFournisseur(null, cleanSbData);
          const norm    = normalizeFournisseur({ ...created, ...localData });
          App.data.fournisseurs.push(norm);
          addHistory('fournisseurs', norm.id, 'Création', nom);
        } catch(sbErr) {
          console.error('[Fournisseur] Erreur Supabase insert:', sbErr.message);
          showToast('Erreur sauvegarde: ' + sbErr.message, 'error');
          return;
        }
      } else {
        const newF = { ...localData, id: genId(), createdAt: today() };
        App.data.fournisseurs.push(newF);
        addHistory('fournisseurs', newF.id, 'Création', nom);
      }
    }

    addAuditLog('Fournisseur', `${id ? 'Modifié' : 'Créé'}: ${nom}`);
    closeModal('fourn-modal');
    renderFournisseurs();
    showToast('✅ Fournisseur enregistré !', 'success');

  } catch (e) {
    console.error('[saveFournisseur] Exception:', e);
    showToast('Erreur: ' + (e.message || 'Impossible de sauvegarder'), 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Enregistrer'; }
  }
}

function editFournisseur(id) {
  const f = App.data.fournisseurs?.find(f => f.id === id);
  if (f) showFournisseurModal(f);
}

async function deleteFournisseur(id) {
  const f = App.data.fournisseurs?.find(f => f.id === id);
  showConfirm(`Supprimer le fournisseur "${f?.nom}" ?`, async () => {
    App.data.fournisseurs = (App.data.fournisseurs || []).filter(f => f.id !== id);
    addAuditLog('Fournisseur', `Supprimé: ${f?.nom}`);
    renderFournisseurs();
    showToast('Fournisseur supprimé', 'success');

    if (!App.isDemoMode && id) {
      try { await sbDelete('fournisseurs', id); }
      catch (e) { console.warn('[Supabase] deleteFournisseur:', e.message); }
    }
  });
}
