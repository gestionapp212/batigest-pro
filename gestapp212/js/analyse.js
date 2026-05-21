/* ============================================================
   GestionApp 212 — Analyse & Statistiques Module
   ============================================================ */
function renderAnalyse() {
  const factures  = getCompanyData('factures');
  const devis     = getCompanyData('devis');
  const chantiers = getCompanyData('chantiers');
  const clients   = getCompanyData('clients');
  const pipeline  = getCompanyData('pipeline');

  const caTotal  = factures.filter(f=>f.statut!=='avoir').reduce((s,f)=>s+(f.total_ttc||f.totalTTC||0),0);
  const caPaye   = factures.filter(f=>f.statut==='paye').reduce((s,f)=>s+(f.total_ttc||f.totalTTC||0),0);
  const impayeTotal = factures.filter(f=>f.statut==='impaye').reduce((s,f)=>s+(f.reste_a_payer||f.resteAPayer||f.total_ttc||f.totalTTC||0),0);
  const devisAcceptes = devis.filter(d=>d.statut==='accepte');
  const txConverssion = devis.length > 0 ? Math.round(devisAcceptes.length/devis.length*100) : 0;
  const pipelineTotal = pipeline.reduce((s,p)=>s+(p.montant||0)*(p.probabilite||0)/100,0);

  // CA par mois (6 derniers mois)
  const mois = [];
  const caMois = [];
  for (let i=5; i>=0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth()-i);
    const m = d.getMonth();
    const y = d.getFullYear();
    mois.push(d.toLocaleDateString('fr-FR',{month:'short',year:'2-digit'}));
    const ca = factures
      .filter(f => { const fd=new Date(f.date_facture||f.created_at||''); return fd.getMonth()===m && fd.getFullYear()===y && f.statut!=='avoir'; })
      .reduce((s,f)=>s+(f.total_ttc||f.totalTTC||0),0);
    caMois.push(ca);
  }

  // Top clients
  const clientCA = {};
  factures.forEach(f => {
    const k = f.client_nom||f.clientNom||'Inconnu';
    clientCA[k] = (clientCA[k]||0) + (f.total_ttc||f.totalTTC||0);
  });
  const topClients = Object.entries(clientCA).sort((a,b)=>b[1]-a[1]).slice(0,5);

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title"><i class="fas fa-chart-bar"></i> Analyse & Statistiques</div>
        <div class="page-subtitle">Vue globale de la performance commerciale</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="renderAnalyse()"><i class="fas fa-sync-alt"></i> Actualiser</button>
    </div>

    <!-- KPIs principaux -->
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#d6eaf8;color:#2980b9"><i class="fas fa-chart-line"></i></div>
        <div class="kpi-info"><div class="kpi-value">${formatMAD(caTotal)}</div><div class="kpi-label">CA Total Facturé</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#d5f5e3;color:#27ae60"><i class="fas fa-check-circle"></i></div>
        <div class="kpi-info"><div class="kpi-value">${formatMAD(caPaye)}</div><div class="kpi-label">CA Encaissé</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#fdecea;color:#e74c3c"><i class="fas fa-exclamation-triangle"></i></div>
        <div class="kpi-info"><div class="kpi-value">${formatMAD(impayeTotal)}</div><div class="kpi-label">Impayés</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#fef9e7;color:#f39c12"><i class="fas fa-funnel-dollar"></i></div>
        <div class="kpi-info"><div class="kpi-value">${formatMAD(pipelineTotal)}</div><div class="kpi-label">Pipeline pondéré</div></div>
      </div>
    </div>

    <!-- Stats secondaires -->
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#f4ecf7;color:#8e44ad"><i class="fas fa-percentage"></i></div>
        <div class="kpi-info"><div class="kpi-value">${txConverssion}%</div><div class="kpi-label">Taux conversion devis</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#d5f5e3;color:#27ae60"><i class="fas fa-hard-hat"></i></div>
        <div class="kpi-info"><div class="kpi-value">${chantiers.filter(c=>c.statut==='en_cours').length}</div><div class="kpi-label">Chantiers actifs</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#d6eaf8;color:#2980b9"><i class="fas fa-users"></i></div>
        <div class="kpi-info"><div class="kpi-value">${clients.length}</div><div class="kpi-label">Clients</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#fef9e7;color:#f39c12"><i class="fas fa-file-invoice"></i></div>
        <div class="kpi-info"><div class="kpi-value">${factures.filter(f=>f.statut==='impaye').length}</div><div class="kpi-label">Factures impayées</div></div>
      </div>
    </div>

    <div class="grid-2" style="gap:20px">
      <!-- Graphique CA mensuel -->
      <div class="card">
        <div class="card-header"><strong><i class="fas fa-chart-bar" style="color:var(--accent)"></i> CA Mensuel (6 derniers mois)</strong></div>
        <div class="card-body" style="height:260px">
          <canvas id="chart-ca"></canvas>
        </div>
      </div>

      <!-- Top clients -->
      <div class="card">
        <div class="card-header"><strong><i class="fas fa-star" style="color:var(--warning)"></i> Top 5 Clients</strong></div>
        <div class="card-body">
          ${topClients.length === 0
            ? '<div class="empty-state" style="padding:30px"><i class="fas fa-users"></i><p>Aucune donnée</p></div>'
            : topClients.map(([nom,ca],i) => {
                const maxCA = topClients[0][1];
                const pct = maxCA > 0 ? Math.round(ca/maxCA*100) : 0;
                const colors = ['#f39c12','#2980b9','#27ae60','#8e44ad','#e74c3c'];
                return `
                <div style="margin-bottom:14px">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
                    <div style="display:flex;align-items:center;gap:8px">
                      <div style="width:22px;height:22px;background:${colors[i]};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff">${i+1}</div>
                      <span style="font-weight:600;font-size:13px">${esc(nom)}</span>
                    </div>
                    <span style="font-weight:700;color:${colors[i]}">${formatMAD(ca)}</span>
                  </div>
                  <div class="progress-bar-outer">
                    <div class="progress-bar-inner" style="width:${pct}%;background:${colors[i]}"></div>
                  </div>
                </div>`;
              }).join('')}
        </div>
      </div>
    </div>

    <!-- Statuts factures / devis -->
    <div class="grid-2" style="gap:20px;margin-top:20px">
      <div class="card">
        <div class="card-header"><strong>Répartition factures</strong></div>
        <div class="card-body">
          ${renderStatRow('Payées',factures.filter(f=>f.statut==='paye').length,factures.length,'var(--success)')}
          ${renderStatRow('Partiellement payées',factures.filter(f=>f.statut==='partiellement_paye').length,factures.length,'var(--warning)')}
          ${renderStatRow('Impayées',factures.filter(f=>f.statut==='impaye').length,factures.length,'var(--danger)')}
          ${renderStatRow('Brouillon',factures.filter(f=>f.statut==='brouillon').length,factures.length,'var(--text-muted)')}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><strong>Répartition devis</strong></div>
        <div class="card-body">
          ${renderStatRow('Acceptés',devis.filter(d=>d.statut==='accepte').length,devis.length,'var(--success)')}
          ${renderStatRow('Envoyés',devis.filter(d=>d.statut==='envoye').length,devis.length,'var(--info)')}
          ${renderStatRow('Brouillons',devis.filter(d=>d.statut==='brouillon').length,devis.length,'var(--text-muted)')}
          ${renderStatRow('Refusés',devis.filter(d=>d.statut==='refuse').length,devis.length,'var(--danger)')}
        </div>
      </div>
    </div>`;

  // Initialiser Chart.js
  setTimeout(() => {
    const ctx = document.getElementById('chart-ca');
    if (!ctx || typeof Chart === 'undefined') return;
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: mois,
        datasets: [{
          label: 'CA (DH)',
          data: caMois,
          backgroundColor: 'rgba(230,126,34,.7)',
          borderColor: '#e67e22',
          borderWidth: 2,
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { callback: v => formatMAD(v) } },
          x: { grid: { display: false } }
        }
      }
    });
  }, 100);
}

function renderStatRow(label, val, total, color) {
  const pct = total > 0 ? Math.round(val/total*100) : 0;
  return `
  <div style="margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:13px">
      <span>${label}</span>
      <span style="font-weight:600;color:${color}">${val} (${pct}%)</span>
    </div>
    <div class="progress-bar-outer">
      <div class="progress-bar-inner" style="width:${pct}%;background:${color}"></div>
    </div>
  </div>`;
}
