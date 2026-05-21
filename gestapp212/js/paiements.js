/* ============================================================
   GestionApp 212 — Paiements Module (stub — géré depuis Factures)
   ============================================================ */
function renderPaiements() {
  const paiements = getCompanyData('paiements');
  const factures  = getCompanyData('factures');

  const totalEncaisse = paiements.reduce((s,p)=>s+(p.montant||0),0);
  const modeLabel = { virement:'Virement', cheque:'Chèque', especes:'Espèces', cb:'Carte bancaire' };

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title"><i class="fas fa-credit-card"></i> Paiements</div>
        <div class="page-subtitle">Historique des encaissements</div>
      </div>
      <button class="btn btn-primary" onclick="navigate('factures')"><i class="fas fa-file-invoice-dollar"></i> Gérer les factures</button>
    </div>

    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#d5f5e3;color:#27ae60"><i class="fas fa-money-bill-wave"></i></div>
        <div class="kpi-info"><div class="kpi-value">${formatMAD(totalEncaisse)}</div><div class="kpi-label">Total encaissé</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#d6eaf8;color:#2980b9"><i class="fas fa-receipt"></i></div>
        <div class="kpi-info"><div class="kpi-value">${paiements.length}</div><div class="kpi-label">Paiements</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#fdecea;color:#e74c3c"><i class="fas fa-exclamation-circle"></i></div>
        <div class="kpi-info">
          <div class="kpi-value">${formatMAD(factures.filter(f=>f.statut==='impaye').reduce((s,f)=>s+(f.reste_a_payer||f.resteAPayer||f.total_ttc||f.totalTTC||0),0))}</div>
          <div class="kpi-label">Reste à encaisser</div>
        </div>
      </div>
    </div>

    <div class="table-wrapper">
      <div style="padding:14px 16px;border-bottom:1px solid var(--border)">
        <strong style="font-size:14px">Historique des paiements (${paiements.length})</strong>
      </div>
      ${paiements.length === 0
        ? '<div class="empty-state"><i class="fas fa-credit-card"></i><h3>Aucun paiement enregistré</h3><p>Les paiements sont créés depuis les factures.</p></div>'
        : `<div class="table-responsive"><table>
          <thead>
            <tr><th>Date</th><th>Client</th><th>Facture</th><th>Mode</th><th>Référence</th><th>Montant</th></tr>
          </thead>
          <tbody>
          ${[...paiements].sort((a,b)=>(b.date_paie||b.created_at||'').localeCompare(a.date_paie||a.created_at||'')).map(p => {
            const facture = factures.find(f=>f.id===p.facture_id||f.id===p.factureId);
            return `<tr>
              <td>${formatDate(p.date_paie||p.created_at)}</td>
              <td style="font-weight:600">${esc(p.client_nom||'—')}</td>
              <td><span class="badge badge-info">${esc(facture?.numero||'—')}</span></td>
              <td><span class="badge badge-secondary">${modeLabel[p.mode]||p.mode||'—'}</span></td>
              <td style="font-size:12px;color:var(--text-muted)">${esc(p.reference||'—')}</td>
              <td style="font-weight:700;color:var(--success)">${formatMAD(p.montant)}</td>
            </tr>`;
          }).join('')}
          </tbody>
        </table></div>`}
    </div>`;
}
