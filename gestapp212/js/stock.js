/* ============================================================
   GestionApp 212 — Stock Module
   ============================================================ */
function renderStock() {
  const stock = getCompanyData('stock');
  const alertes = stock.filter(s => (s.quantite||0) <= (s.seuil_alerte||s.seuilAlerte||0));
  const valeurTotale = stock.reduce((s,i)=>(s+(i.quantite||0)*(i.prix_unitaire||i.prixUnitaire||0)),0);

  const cats = [...new Set(stock.map(s=>s.categorie).filter(Boolean))];

  function catClass(cat) {
    const map = {'Gros Œuvre':'badge-info','Finitions':'badge-purple','Électricité':'badge-warning'};
    return map[cat] || 'badge-secondary';
  }

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title"><i class="fas fa-boxes"></i> Stock & Matériaux</div>
        <div class="page-subtitle">Gestion et suivi des stocks</div>
      </div>
      <button class="btn btn-primary" onclick="openStockModal()"><i class="fas fa-plus"></i> Ajouter article</button>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#d6eaf8;color:#2980b9"><i class="fas fa-layer-group"></i></div>
        <div class="kpi-info"><div class="kpi-value">${stock.length}</div><div class="kpi-label">Articles</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#fdecea;color:#e74c3c"><i class="fas fa-exclamation-triangle"></i></div>
        <div class="kpi-info"><div class="kpi-value">${alertes.length}</div><div class="kpi-label">Alertes seuil</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#d5f5e3;color:#27ae60"><i class="fas fa-tags"></i></div>
        <div class="kpi-info"><div class="kpi-value">${cats.length}</div><div class="kpi-label">Catégories</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#fef9e7;color:#f39c12"><i class="fas fa-coins"></i></div>
        <div class="kpi-info"><div class="kpi-value">${formatMAD(valeurTotale)}</div><div class="kpi-label">Valeur stock</div></div>
      </div>
    </div>

    ${alertes.length > 0 ? `
    <div class="alert alert-warning mb-16">
      <i class="fas fa-exclamation-triangle"></i>
      <div><strong>Alerte stock !</strong> ${alertes.length} article(s) en dessous du seuil : ${alertes.map(a=>esc(a.designation)).join(', ')}</div>
    </div>` : ''}

    <!-- Tableau stock -->
    <div class="table-wrapper">
      <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <strong style="font-size:14px">Articles en stock (${stock.length})</strong>
        <input class="search-input" style="max-width:240px" placeholder="Rechercher…" oninput="filterStock(this.value)"/>
      </div>
      <div class="table-responsive">
        <table id="stock-table">
          <thead>
            <tr>
              <th>Désignation</th>
              <th>Référence</th>
              <th>Catégorie</th>
              <th>Qté</th>
              <th>Seuil</th>
              <th>Prix unit.</th>
              <th>Valeur</th>
              <th>Emplacement</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${stock.map(s => {
              const isAlerte = (s.quantite||0) <= (s.seuil_alerte||s.seuilAlerte||0);
              return `<tr data-search="${esc((s.designation||'').toLowerCase())} ${esc((s.reference||'').toLowerCase())} ${esc((s.categorie||'').toLowerCase())}">
                <td>
                  <div style="font-weight:600">${esc(s.designation)}</div>
                  ${isAlerte?'<div style="font-size:10px;color:var(--danger);font-weight:600"><i class="fas fa-exclamation-triangle"></i> Stock bas</div>':''}
                </td>
                <td><code style="font-size:11px;background:#f8f9fa;padding:2px 6px;border-radius:3px">${esc(s.reference||'—')}</code></td>
                <td><span class="badge ${catClass(s.categorie)}">${esc(s.categorie||'—')}</span></td>
                <td style="font-weight:600;color:${isAlerte?'var(--danger)':'var(--text-primary)'}">${s.quantite||0} ${esc(s.unite||'')}</td>
                <td style="color:var(--text-muted)">${s.seuil_alerte||s.seuilAlerte||0}</td>
                <td>${formatMAD(s.prix_unitaire||s.prixUnitaire||0)}</td>
                <td style="font-weight:600">${formatMAD((s.quantite||0)*(s.prix_unitaire||s.prixUnitaire||0))}</td>
                <td style="font-size:12px;color:var(--text-muted)">${esc(s.emplacement||'—')}</td>
                <td>
                  <button class="btn btn-ghost btn-sm" onclick="openStockModal('${s.id}')"><i class="fas fa-edit"></i></button>
                  <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="deleteStock('${s.id}')"><i class="fas fa-trash"></i></button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      ${stock.length===0?`<div class="empty-state"><i class="fas fa-boxes"></i><h3>Aucun article en stock</h3></div>`:''}
    </div>`;
}

function filterStock(q) {
  const rows = document.querySelectorAll('#stock-table tbody tr');
  rows.forEach(r => {
    r.style.display = (r.dataset.search||'').includes(q.toLowerCase()) ? '' : 'none';
  });
}

function openStockModal(id=null) {
  const stock = getCompanyData('stock');
  const s = id ? stock.find(x=>x.id===id) : null;

  showModal(`
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal-box">
        <div class="modal-header">
          <span><i class="fas fa-boxes" style="color:var(--accent)"></i> ${s?'Modifier':'Nouvel'} article</span>
          <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label required">Désignation</label>
            <input id="st-desig" class="form-control" value="${esc(s?.designation||'')}" placeholder="Ex: Ciment Portland 50kg"/>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Référence</label>
              <input id="st-ref" class="form-control" value="${esc(s?.reference||'')}" placeholder="CIM-001"/>
            </div>
            <div class="form-group">
              <label class="form-label">Catégorie</label>
              <select id="st-cat" class="form-control">
                ${['Gros Œuvre','Finitions','Électricité','Plomberie','Menuiserie','Autre'].map(c=>
                  `<option value="${c}" ${(s?.categorie||'Gros Œuvre')===c?'selected':''}>${c}</option>`
                ).join('')}
              </select>
            </div>
          </div>
          <div class="form-row-3">
            <div class="form-group">
              <label class="form-label">Quantité</label>
              <input id="st-qty" class="form-control" type="number" min="0" value="${s?.quantite||0}"/>
            </div>
            <div class="form-group">
              <label class="form-label">Unité</label>
              <select id="st-unite" class="form-control">
                ${['sac','m²','m³','ml','barre','bidon','rouleau','u','kg','litre'].map(u=>
                  `<option value="${u}" ${(s?.unite||'u')===u?'selected':''}>${u}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Seuil alerte</label>
              <input id="st-seuil" class="form-control" type="number" min="0" value="${s?.seuil_alerte||s?.seuilAlerte||10}"/>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Prix unitaire (DH)</label>
              <input id="st-prix" class="form-control" type="number" min="0" value="${s?.prix_unitaire||s?.prixUnitaire||0}"/>
            </div>
            <div class="form-group">
              <label class="form-label">Emplacement</label>
              <input id="st-empl" class="form-control" value="${esc(s?.emplacement||'')}" placeholder="Hangar A"/>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
          <button class="btn btn-primary" onclick="saveStock('${id||''}')"><i class="fas fa-save"></i> Enregistrer</button>
        </div>
      </div>
    </div>`);
}

function saveStock(id) {
  const desig = document.getElementById('st-desig').value.trim();
  if (!desig) { showToast('Désignation requise','error'); return; }
  const obj = {
    id: id||'st-'+Date.now(),
    company_id: App.currentCompany?.id||'c1', companyId: App.currentCompany?.id||'c1',
    designation: desig,
    reference:   document.getElementById('st-ref').value.trim(),
    categorie:   document.getElementById('st-cat').value,
    quantite:    parseInt(document.getElementById('st-qty').value)||0,
    unite:       document.getElementById('st-unite').value,
    seuil_alerte:parseInt(document.getElementById('st-seuil').value)||0,
    seuilAlerte: parseInt(document.getElementById('st-seuil').value)||0,
    prix_unitaire: parseFloat(document.getElementById('st-prix').value)||0,
    prixUnitaire:  parseFloat(document.getElementById('st-prix').value)||0,
    emplacement: document.getElementById('st-empl').value.trim(),
    mouvements:  [],
    created_at:  new Date().toISOString().split('T')[0],
  };
  if (!App.data.stock) App.data.stock = [];
  if (id) { const i=App.data.stock.findIndex(s=>s.id===id); if(i>=0)App.data.stock[i]=obj; }
  else App.data.stock.push(obj);
  closeModal();
  showToast(id?'Article modifié':'Article ajouté','success');
  renderStock();
}

function deleteStock(id) {
  if (!confirm('Supprimer cet article ?')) return;
  App.data.stock=(App.data.stock||[]).filter(s=>s.id!==id);
  showToast('Article supprimé','success');
  renderStock();
}
