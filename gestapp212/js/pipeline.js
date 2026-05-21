/* ============================================================
   GestionApp 212 — Pipeline Commercial
   ============================================================ */
function renderPipeline() {
  const pipeline = getCompanyData('pipeline');

  const etapes = [
    { id:'contact',      label:'Contact',        color:'#95a5a6' },
    { id:'qualification',label:'Qualification',  color:'#3498db' },
    { id:'proposition',  label:'Proposition',    color:'#9b59b6' },
    { id:'negociation',  label:'Négociation',    color:'#f39c12' },
    { id:'gagne',        label:'Gagné 🎉',       color:'#27ae60' },
    { id:'perdu',        label:'Perdu',          color:'#e74c3c' },
  ];

  const total = pipeline.reduce((s,p)=>s+(p.montant||0)*(p.probabilite||0)/100, 0);
  const gagnes = pipeline.filter(p=>p.etape==='gagne');
  const caGagne = gagnes.reduce((s,p)=>s+(p.montant||0),0);

  function dealCard(p) {
    const etape = etapes.find(e=>e.id===p.etape)||etapes[0];
    return `
    <div class="kanban-card" onclick="openPipelineModal('${p.id}')">
      <div style="font-weight:600;font-size:13px;margin-bottom:6px">${esc(p.nom)}</div>
      <div style="font-size:11px;color:var(--text-secondary);margin-bottom:6px">
        <i class="fas fa-user"></i> ${esc(p.client_nom||p.clientNom||'—')}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span style="font-weight:700;color:var(--accent);font-size:13px">${formatMAD(p.montant)}</span>
        <span class="badge" style="background:${etape.color}20;color:${etape.color};font-size:10px">${p.probabilite||0}%</span>
      </div>
      ${p.date_cloture ? `<div style="font-size:10px;color:var(--text-muted);margin-top:6px"><i class="fas fa-calendar"></i> Clôture: ${formatDate(p.date_cloture)}</div>` : ''}
    </div>`;
  }

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title"><i class="fas fa-filter"></i> Pipeline Commercial</div>
        <div class="page-subtitle">Suivi des opportunités commerciales</div>
      </div>
      <button class="btn btn-primary" onclick="openPipelineModal()"><i class="fas fa-plus"></i> Nouvelle opportunité</button>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#fef9e7;color:#f39c12"><i class="fas fa-funnel-dollar"></i></div>
        <div class="kpi-info"><div class="kpi-value">${pipeline.length}</div><div class="kpi-label">Opportunités</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#d6eaf8;color:#2980b9"><i class="fas fa-chart-line"></i></div>
        <div class="kpi-info"><div class="kpi-value">${formatMAD(total)}</div><div class="kpi-label">Pipeline pondéré</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#d5f5e3;color:#27ae60"><i class="fas fa-trophy"></i></div>
        <div class="kpi-info"><div class="kpi-value">${formatMAD(caGagne)}</div><div class="kpi-label">CA Gagné</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#f4ecf7;color:#8e44ad"><i class="fas fa-percentage"></i></div>
        <div class="kpi-info">
          <div class="kpi-value">${pipeline.length > 0 ? Math.round(gagnes.length/pipeline.length*100) : 0}%</div>
          <div class="kpi-label">Taux de réussite</div>
        </div>
      </div>
    </div>

    <!-- Kanban -->
    <div class="kanban-board">
      ${etapes.map(etape => {
        const deals = pipeline.filter(p=>p.etape===etape.id);
        const total = deals.reduce((s,p)=>s+(p.montant||0),0);
        return `
        <div class="kanban-col">
          <div class="kanban-col-header" style="border-color:${etape.color};color:${etape.color}">
            <span>${etape.label} (${deals.length})</span>
            <span style="font-size:10px;font-weight:400">${total>0?formatMAD(total):''}</span>
          </div>
          <div class="kanban-cards">
            ${deals.length ? deals.map(dealCard).join('') : `<div style="text-align:center;padding:20px;font-size:12px;color:var(--text-muted)">Aucune</div>`}
            <button class="btn btn-ghost btn-sm" style="width:100%;justify-content:center;margin-top:4px" onclick="openPipelineModal(null,'${etape.id}')">
              <i class="fas fa-plus"></i>
            </button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

function openPipelineModal(id=null, etapeInit='contact') {
  const pipeline = getCompanyData('pipeline');
  const clients  = getCompanyData('clients');
  const p = id ? pipeline.find(x=>x.id===id) : null;
  const etapes = ['contact','qualification','proposition','negociation','gagne','perdu'];
  const etapesLabels = {contact:'Contact',qualification:'Qualification',proposition:'Proposition',negociation:'Négociation',gagne:'Gagné',perdu:'Perdu'};

  showModal(`
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal-box">
        <div class="modal-header">
          <span><i class="fas fa-funnel-dollar" style="color:var(--accent)"></i> ${p?'Modifier':'Nouvelle'} opportunité</span>
          <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label required">Nom de l'opportunité</label>
            <input id="pi-nom" class="form-control" value="${esc(p?.nom||'')}" placeholder="Ex: Construction villa Marrakech"/>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Client</label>
              <select id="pi-client" class="form-control">
                <option value="">— Sélectionner —</option>
                ${clients.map(c=>`<option value="${c.id}" ${(p?.client_id||p?.clientId)===c.id?'selected':''}>${esc(c.nom)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Étape</label>
              <select id="pi-etape" class="form-control">
                ${etapes.map(e=>`<option value="${e}" ${(p?.etape||etapeInit)===e?'selected':''}>${etapesLabels[e]}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Montant (DH)</label>
              <input id="pi-montant" class="form-control" type="number" value="${p?.montant||''}" placeholder="0"/>
            </div>
            <div class="form-group">
              <label class="form-label">Probabilité (%)</label>
              <input id="pi-proba" class="form-control" type="number" min="0" max="100" value="${p?.probabilite||50}"/>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Date de clôture</label>
              <input id="pi-cloture" class="form-control" type="date" value="${p?.date_cloture||''}"/>
            </div>
            <div class="form-group">
              <label class="form-label">Source</label>
              <input id="pi-source" class="form-control" value="${esc(p?.source||'')}" placeholder="Bouche à oreille…"/>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          ${id ? `<button class="btn btn-danger btn-sm" onclick="deletePipeline('${id}')"><i class="fas fa-trash"></i></button>` : ''}
          <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
          <button class="btn btn-primary" onclick="savePipeline('${id||''}')"><i class="fas fa-save"></i> Enregistrer</button>
        </div>
      </div>
    </div>`);
}

function savePipeline(id) {
  const nom = document.getElementById('pi-nom').value.trim();
  if (!nom) { showToast('Nom requis', 'error'); return; }
  const clients  = getCompanyData('clients');
  const cliId    = document.getElementById('pi-client').value;
  const client   = clients.find(c=>c.id===cliId);
  const obj = {
    id: id||'pi-'+Date.now(),
    company_id: App.currentCompany?.id||'c1', companyId: App.currentCompany?.id||'c1',
    nom, client_id: cliId, clientId: cliId,
    client_nom: client?.nom||'', clientNom: client?.nom||'',
    etape: document.getElementById('pi-etape').value,
    montant: parseFloat(document.getElementById('pi-montant').value)||0,
    probabilite: parseInt(document.getElementById('pi-proba').value)||0,
    date_cloture: document.getElementById('pi-cloture').value,
    source: document.getElementById('pi-source').value.trim(),
    created_at: new Date().toISOString().split('T')[0],
  };
  if (!App.data.pipeline) App.data.pipeline = [];
  if (id) { const i=App.data.pipeline.findIndex(p=>p.id===id); if(i>=0)App.data.pipeline[i]=obj; }
  else App.data.pipeline.push(obj);
  closeModal();
  showToast(id?'Opportunité modifiée':'Opportunité créée','success');
  renderPipeline();
}

function deletePipeline(id) {
  if (!confirm('Supprimer cette opportunité ?')) return;
  App.data.pipeline=(App.data.pipeline||[]).filter(p=>p.id!==id);
  closeModal();
  showToast('Supprimé','success');
  renderPipeline();
}
