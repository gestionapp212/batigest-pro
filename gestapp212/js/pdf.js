/* ============================================================
   GestionApp 212 — PDF Generator v2.0
   Génère et imprime Devis & Factures sans librairie externe
   Utilise window.print() avec une fenêtre dédiée
   ============================================================ */

// ── Couleur principale depuis les préférences société ────────
function _pdfColor() {
  return App.currentCompany?.pdfColor || App.currentCompany?.pdf_color || '#1e3a5f';
}
function _pdfTemplate() {
  return App.currentCompany?.pdfTemplate || App.currentCompany?.pdf_template || 'classique';
}
function _pdfLogo() {
  return App.currentCompany?.logo || localStorage.getItem('ga_logo_' + (App.currentCompany?.id||'')) || '';
}

// ── Formater un montant MAD ───────────────────────────────────
function _fmtMAD(n) {
  const v = parseFloat(n) || 0;
  return new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + ' MAD';
}

// ── Calcul lignes devis/facture ───────────────────────────────
function _calcLigne(l) {
  const pu  = parseFloat(l.prixUnitaire || l.prix_unitaire) || 0;
  const qty = parseFloat(l.quantite) || 1;
  const rem = parseFloat(l.remise || 0);
  const tva = parseFloat(l.tva || 20);
  const ht  = pu * qty * (1 - rem / 100);
  return { pu, qty, rem, tva, ht, ttc: ht * (1 + tva / 100) };
}

// ── CSS commun pour tous les templates ───────────────────────
function _pdfCSS(color) {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', Arial, sans-serif; font-size: 12px; color: #1a202c; background: #fff; }
    @page { size: A4; margin: 15mm 15mm 20mm 15mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }
    .pdf-wrap { max-width: 780px; margin: 0 auto; padding: 20px; }

    /* ── Header ── */
    .pdf-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 3px solid ${color}; }
    .pdf-logo { max-width: 120px; max-height: 60px; object-fit: contain; }
    .pdf-logo-placeholder { width: 120px; height: 60px; background: ${color}; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 22px; font-weight: 700; }
    .pdf-company-info { text-align: right; font-size: 11px; line-height: 1.7; color: #4a5568; }
    .pdf-company-name { font-size: 16px; font-weight: 700; color: ${color}; }

    /* ── Titre document ── */
    .pdf-doc-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .pdf-doc-type { font-size: 26px; font-weight: 700; color: ${color}; text-transform: uppercase; letter-spacing: 1px; }
    .pdf-doc-meta { text-align: right; font-size: 11px; color: #4a5568; line-height: 1.8; }
    .pdf-doc-num { font-size: 15px; font-weight: 600; color: #1a202c; }

    /* ── Parties (émetteur / destinataire) ── */
    .pdf-parties { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .pdf-party { background: #f7fafc; border-radius: 8px; padding: 14px 16px; border-left: 4px solid ${color}; }
    .pdf-party-label { font-size: 10px; font-weight: 700; color: ${color}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .pdf-party-name { font-size: 13px; font-weight: 600; color: #1a202c; margin-bottom: 4px; }
    .pdf-party-detail { font-size: 11px; color: #4a5568; line-height: 1.6; }

    /* ── Objet ── */
    .pdf-objet { background: ${color}; color: #fff; border-radius: 6px; padding: 10px 16px; margin-bottom: 20px; font-size: 13px; font-weight: 500; }
    .pdf-objet span { opacity: .75; font-size: 11px; margin-right: 8px; }

    /* ── Tableau lignes ── */
    .pdf-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
    .pdf-table thead tr { background: ${color}; color: #fff; }
    .pdf-table thead th { padding: 9px 10px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: .5px; }
    .pdf-table thead th:last-child, .pdf-table tbody td:last-child { text-align: right; }
    .pdf-table tbody tr:nth-child(even) { background: #f7fafc; }
    .pdf-table tbody tr:hover { background: #ebf4ff; }
    .pdf-table tbody td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; color: #2d3748; vertical-align: top; }
    .pdf-table tfoot td { padding: 8px 10px; font-weight: 600; }
    .pdf-table .num { text-align: right; }
    .pdf-table .designation { font-weight: 500; }
    .pdf-table .designation small { display: block; color: #718096; font-weight: 400; margin-top: 2px; }

    /* ── Totaux ── */
    .pdf-totals { display: flex; justify-content: flex-end; margin-bottom: 24px; }
    .pdf-totals-box { min-width: 260px; }
    .pdf-total-row { display: flex; justify-content: space-between; padding: 5px 12px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
    .pdf-total-row:last-child { background: ${color}; color: #fff; font-size: 14px; font-weight: 700; border-radius: 0 0 6px 6px; padding: 10px 12px; border: none; }
    .pdf-total-row.tva { color: #718096; }

    /* ── Statut ── */
    .pdf-status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .badge-green  { background: #c6f6d5; color: #276749; }
    .badge-orange { background: #feebc8; color: #9c4221; }
    .badge-red    { background: #fed7d7; color: #9b2c2c; }
    .badge-blue   { background: #bee3f8; color: #2a4a7f; }
    .badge-gray   { background: #e2e8f0; color: #4a5568; }

    /* ── Notes & Conditions ── */
    .pdf-notes { background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 12px 14px; margin-bottom: 16px; font-size: 11px; color: #744210; }
    .pdf-notes strong { display: block; margin-bottom: 4px; color: #92400e; }
    .pdf-conditions { font-size: 10px; color: #718096; border-top: 1px solid #e2e8f0; padding-top: 10px; line-height: 1.6; }

    /* ── Signature ── */
    .pdf-signature { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
    .pdf-sign-box { border: 2px dashed #e2e8f0; border-radius: 8px; padding: 16px; min-height: 80px; text-align: center; font-size: 11px; color: #a0aec0; }
    .pdf-sign-box strong { display: block; margin-bottom: 8px; color: #4a5568; font-size: 12px; }
    .pdf-sign-img { max-width: 160px; max-height: 60px; }

    /* ── Footer ── */
    .pdf-footer { text-align: center; font-size: 10px; color: #a0aec0; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 20px; line-height: 1.6; }
    .pdf-footer strong { color: ${color}; }

    /* ── Bouton imprimer (hors impression) ── */
    .print-btn-bar { display: flex; gap: 10px; justify-content: center; padding: 16px; background: #f7fafc; border-bottom: 1px solid #e2e8f0; }
    .print-btn { padding: 10px 24px; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .print-btn.primary { background: ${color}; color: #fff; }
    .print-btn.ghost { background: #e2e8f0; color: #4a5568; }
  `;
}

// ── Construire l'HTML d'un Devis ─────────────────────────────
function _buildDevisHTML(d, client) {
  const co    = App.currentCompany || {};
  const color = _pdfColor();
  const logo  = _pdfLogo();
  const lignes = d.lignes || [];

  let totalHT  = 0, totalTVA = 0;
  const lignesHTML = lignes.map((l, i) => {
    const c = _calcLigne(l);
    totalHT  += c.ht;
    totalTVA += c.ht * c.tva / 100;
    return `
      <tr>
        <td class="num" style="color:#718096;font-size:10px">${i+1}</td>
        <td class="designation">
          ${l.designation || '—'}
          ${l.description ? `<small>${l.description}</small>` : ''}
        </td>
        <td class="num">${l.unite || 'u'}</td>
        <td class="num">${parseFloat(l.quantite||1).toLocaleString('fr-MA')}</td>
        <td class="num">${_fmtMAD(l.prixUnitaire||0)}</td>
        ${c.rem > 0 ? `<td class="num">${c.rem}%</td>` : '<td class="num">—</td>'}
        <td class="num">${c.tva}%</td>
        <td class="num" style="font-weight:600">${_fmtMAD(c.ht)}</td>
      </tr>`;
  }).join('');

  const totalTTC = totalHT + totalTVA;
  const statusMap = { brouillon:'badge-gray', envoye:'badge-blue', accepte:'badge-green', refuse:'badge-red', annule:'badge-red' };
  const statusLabel = { brouillon:'Brouillon', envoye:'Envoyé', accepte:'Accepté', refuse:'Refusé', annule:'Annulé' };

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Devis ${d.numero || ''} — ${co.name || 'GestionApp'}</title>
<style>${_pdfCSS(color)}</style>
</head>
<body>

<div class="print-btn-bar no-print">
  <button class="print-btn primary" onclick="window.print()">🖨️ Imprimer / Enregistrer PDF</button>
  <button class="print-btn ghost" onclick="window.close()">✕ Fermer</button>
</div>

<div class="pdf-wrap">
  <!-- HEADER -->
  <div class="pdf-header">
    <div>
      ${logo
        ? `<img src="${logo}" class="pdf-logo" alt="Logo">`
        : `<div class="pdf-logo-placeholder">${(co.name||'G').slice(0,2).toUpperCase()}</div>`
      }
    </div>
    <div class="pdf-company-info">
      <div class="pdf-company-name">${co.name || 'Votre Société'}</div>
      ${co.adresse ? `<div>${co.adresse}${co.ville ? ', ' + co.ville : ''}</div>` : ''}
      ${co.telephone ? `<div>Tél : ${co.telephone}</div>` : ''}
      ${co.email ? `<div>${co.email}</div>` : ''}
      ${co.ice ? `<div>ICE : ${co.ice}</div>` : ''}
      ${co.rc ? `<div>RC : ${co.rc}</div>` : ''}
    </div>
  </div>

  <!-- TITRE -->
  <div class="pdf-doc-title">
    <div>
      <div class="pdf-doc-type">Devis</div>
      <div class="pdf-doc-num">${d.numero || 'D-XXXX-XXXX'}</div>
      ${d.statut ? `<span class="pdf-status-badge ${statusMap[d.statut]||'badge-gray'}">${statusLabel[d.statut]||d.statut}</span>` : ''}
    </div>
    <div class="pdf-doc-meta">
      <div><strong>Date :</strong> ${formatDate(d.date_devis || d.dateDevis || today())}</div>
      ${d.dateValidite || d.date_validite ? `<div><strong>Valable jusqu'au :</strong> ${formatDate(d.dateValidite || d.date_validite)}</div>` : ''}
    </div>
  </div>

  <!-- PARTIES -->
  <div class="pdf-parties">
    <div class="pdf-party">
      <div class="pdf-party-label">De</div>
      <div class="pdf-party-name">${co.name || '—'}</div>
      <div class="pdf-party-detail">
        ${co.adresse ? co.adresse + '<br>' : ''}
        ${co.ville || ''}${co.telephone ? '<br>Tél : ' + co.telephone : ''}
        ${co.email ? '<br>' + co.email : ''}
      </div>
    </div>
    <div class="pdf-party">
      <div class="pdf-party-label">À</div>
      <div class="pdf-party-name">${client?.nom || d.client_nom || d.clientNom || '—'}</div>
      <div class="pdf-party-detail">
        ${client?.ice ? 'ICE : ' + client.ice + '<br>' : ''}
        ${client?.adresse ? client.adresse + '<br>' : ''}
        ${client?.ville || ''}${client?.telephone ? '<br>Tél : ' + client.telephone : ''}
        ${client?.email ? '<br>' + client.email : ''}
      </div>
    </div>
  </div>

  <!-- OBJET -->
  ${d.objet ? `<div class="pdf-objet"><span>Objet :</span>${d.objet}</div>` : ''}

  <!-- TABLEAU LIGNES -->
  <table class="pdf-table">
    <thead>
      <tr>
        <th style="width:30px">#</th>
        <th>Désignation</th>
        <th class="num">Unité</th>
        <th class="num">Qté</th>
        <th class="num">P.U. HT</th>
        <th class="num">Remise</th>
        <th class="num">TVA</th>
        <th class="num">Total HT</th>
      </tr>
    </thead>
    <tbody>${lignesHTML || '<tr><td colspan="8" style="text-align:center;padding:20px;color:#a0aec0">Aucune ligne</td></tr>'}</tbody>
  </table>

  <!-- TOTAUX -->
  <div class="pdf-totals">
    <div class="pdf-totals-box">
      <div class="pdf-total-row"><span>Total HT</span><span>${_fmtMAD(d.total_ht || d.totalHT || totalHT)}</span></div>
      <div class="pdf-total-row tva"><span>TVA (~20%)</span><span>${_fmtMAD(d.total_tva || d.totalTVA || totalTVA)}</span></div>
      <div class="pdf-total-row"><span>Total TTC</span><span>${_fmtMAD(d.total_ttc || d.totalTTC || totalTTC)}</span></div>
    </div>
  </div>

  <!-- NOTES -->
  ${d.notes ? `<div class="pdf-notes"><strong>📝 Notes :</strong>${d.notes}</div>` : ''}

  <!-- SIGNATURES -->
  <div class="pdf-signature">
    <div class="pdf-sign-box">
      <strong>Signature client</strong>
      ${d.signature_url ? `<br><img src="${d.signature_url}" class="pdf-sign-img" alt="Signature">` : 'Lu et approuvé'}
    </div>
    <div class="pdf-sign-box">
      <strong>Cachet & Signature</strong>
      ${co.name || ''}
    </div>
  </div>

  <!-- CONDITIONS -->
  <div class="pdf-conditions">
    ${co.rib ? `<strong>RIB :</strong> ${co.rib} &nbsp;|&nbsp; ` : ''}
    Devis valable 30 jours à compter de la date d'émission.
    ${co.pdfFooter || co.pdf_footer ? '<br>' + (co.pdfFooter || co.pdf_footer) : ''}
  </div>

  <!-- FOOTER -->
  <div class="pdf-footer">
    <strong>${co.name || 'GestionApp 212'}</strong>
    ${co.ice ? ` &nbsp;·&nbsp; ICE : ${co.ice}` : ''}
    ${co.rc  ? ` &nbsp;·&nbsp; RC : ${co.rc}` : ''}
    <br>Document généré par GestionApp 212 — ${new Date().toLocaleDateString('fr-FR')}
  </div>
</div>
</body>
</html>`;
}

// ── Construire l'HTML d'une Facture ──────────────────────────
function _buildFactureHTML(f, client) {
  const co    = App.currentCompany || {};
  const color = _pdfColor();
  const logo  = _pdfLogo();
  const lignes = f.lignes || [];

  let totalHT = 0, totalTVA = 0;
  const lignesHTML = lignes.map((l, i) => {
    const c = _calcLigne(l);
    totalHT  += c.ht;
    totalTVA += c.ht * c.tva / 100;
    return `
      <tr>
        <td class="num" style="color:#718096;font-size:10px">${i+1}</td>
        <td class="designation">${l.designation || '—'}</td>
        <td class="num">${l.unite || 'u'}</td>
        <td class="num">${parseFloat(l.quantite||1).toLocaleString('fr-MA')}</td>
        <td class="num">${_fmtMAD(l.prixUnitaire || l.prix_unitaire || 0)}</td>
        <td class="num">${c.tva}%</td>
        <td class="num" style="font-weight:600">${_fmtMAD(c.ht)}</td>
      </tr>`;
  }).join('');

  const totalTTC = parseFloat(f.total_ttc || f.totalTTC) || (totalHT + totalTVA);
  const montantPaye = parseFloat(f.montant_paye || f.montantPaye) || 0;
  const resteAPayer = parseFloat(f.reste_a_payer || f.resteAPayer) ?? (totalTTC - montantPaye);

  const statusMap = { impaye:'badge-red', partiellement_paye:'badge-orange', paye:'badge-green', valide:'badge-blue', avoir:'badge-gray' };
  const statusLabel = { impaye:'Impayée', partiellement_paye:'Partiellement payée', paye:'Payée', valide:'Validée', avoir:'Avoir' };

  const paiementsHTML = (f.paiements || []).map(p => `
    <tr>
      <td>${formatDate(p.date)}</td>
      <td>${p.mode || '—'}</td>
      <td>${p.reference || '—'}</td>
      <td class="num" style="font-weight:600;color:#276749">${_fmtMAD(p.montant)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Facture ${f.numero || ''} — ${co.name || 'GestionApp'}</title>
<style>${_pdfCSS(color)}</style>
</head>
<body>

<div class="print-btn-bar no-print">
  <button class="print-btn primary" onclick="window.print()">🖨️ Imprimer / Enregistrer PDF</button>
  <button class="print-btn ghost" onclick="window.close()">✕ Fermer</button>
</div>

<div class="pdf-wrap">
  <!-- HEADER -->
  <div class="pdf-header">
    <div>
      ${logo
        ? `<img src="${logo}" class="pdf-logo" alt="Logo">`
        : `<div class="pdf-logo-placeholder">${(co.name||'G').slice(0,2).toUpperCase()}</div>`
      }
    </div>
    <div class="pdf-company-info">
      <div class="pdf-company-name">${co.name || 'Votre Société'}</div>
      ${co.adresse ? `<div>${co.adresse}${co.ville ? ', ' + co.ville : ''}</div>` : ''}
      ${co.telephone ? `<div>Tél : ${co.telephone}</div>` : ''}
      ${co.email ? `<div>${co.email}</div>` : ''}
      ${co.ice ? `<div>ICE : ${co.ice}</div>` : ''}
      ${co.rc  ? `<div>RC : ${co.rc}</div>` : ''}
    </div>
  </div>

  <!-- TITRE -->
  <div class="pdf-doc-title">
    <div>
      <div class="pdf-doc-type">${f.type === 'avoir' ? 'Avoir' : f.type === 'acompte' ? 'Facture d\'Acompte' : 'Facture'}</div>
      <div class="pdf-doc-num">${f.numero || 'F-XXXX-XXXX'}</div>
      ${f.statut ? `<span class="pdf-status-badge ${statusMap[f.statut]||'badge-gray'}">${statusLabel[f.statut]||f.statut}</span>` : ''}
    </div>
    <div class="pdf-doc-meta">
      <div><strong>Date :</strong> ${formatDate(f.date_facture || f.dateFacture || today())}</div>
      ${f.date_echeance || f.dateEcheance ? `<div><strong>Échéance :</strong> ${formatDate(f.date_echeance || f.dateEcheance)}</div>` : ''}
      ${f.devis_id ? `<div><strong>Réf. Devis :</strong> ${f.devis_id}</div>` : ''}
    </div>
  </div>

  <!-- PARTIES -->
  <div class="pdf-parties">
    <div class="pdf-party">
      <div class="pdf-party-label">Émetteur</div>
      <div class="pdf-party-name">${co.name || '—'}</div>
      <div class="pdf-party-detail">
        ${co.adresse ? co.adresse + '<br>' : ''}
        ${co.ville || ''}${co.telephone ? '<br>Tél : ' + co.telephone : ''}
        ${co.email ? '<br>' + co.email : ''}
      </div>
    </div>
    <div class="pdf-party">
      <div class="pdf-party-label">Client</div>
      <div class="pdf-party-name">${client?.nom || f.client_nom || f.clientNom || '—'}</div>
      <div class="pdf-party-detail">
        ${client?.ice ? 'ICE : ' + client.ice + '<br>' : ''}
        ${client?.adresse ? client.adresse + '<br>' : ''}
        ${client?.ville || ''}${client?.telephone ? '<br>Tél : ' + client.telephone : ''}
        ${client?.email ? '<br>' + client.email : ''}
      </div>
    </div>
  </div>

  <!-- OBJET -->
  ${f.objet ? `<div class="pdf-objet"><span>Objet :</span>${f.objet}</div>` : ''}

  <!-- TABLEAU LIGNES -->
  <table class="pdf-table">
    <thead>
      <tr>
        <th style="width:30px">#</th>
        <th>Désignation</th>
        <th class="num">Unité</th>
        <th class="num">Qté</th>
        <th class="num">P.U. HT</th>
        <th class="num">TVA</th>
        <th class="num">Total HT</th>
      </tr>
    </thead>
    <tbody>${lignesHTML || '<tr><td colspan="7" style="text-align:center;padding:20px;color:#a0aec0">Aucune ligne</td></tr>'}</tbody>
  </table>

  <!-- TOTAUX -->
  <div class="pdf-totals">
    <div class="pdf-totals-box">
      <div class="pdf-total-row"><span>Total HT</span><span>${_fmtMAD(f.total_ht || f.totalHT || totalHT)}</span></div>
      <div class="pdf-total-row tva"><span>TVA</span><span>${_fmtMAD(f.total_tva || f.totalTVA || totalTVA)}</span></div>
      <div class="pdf-total-row"><span>Total TTC</span><span>${_fmtMAD(totalTTC)}</span></div>
      ${montantPaye > 0 ? `<div class="pdf-total-row" style="color:#276749"><span>Déjà payé</span><span>- ${_fmtMAD(montantPaye)}</span></div>` : ''}
      ${resteAPayer > 0 ? `<div class="pdf-total-row" style="background:#fed7d7;color:#9b2c2c;font-weight:700;border-radius:0 0 6px 6px"><span>Reste à payer</span><span>${_fmtMAD(resteAPayer)}</span></div>` : ''}
    </div>
  </div>

  <!-- PAIEMENTS -->
  ${(f.paiements || []).length > 0 ? `
  <div style="margin-bottom:20px">
    <h4 style="font-size:12px;font-weight:600;color:#4a5568;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e2e8f0">
      <span style="color:${color}">●</span> Historique des paiements
    </h4>
    <table class="pdf-table" style="font-size:11px">
      <thead><tr><th>Date</th><th>Mode</th><th>Référence</th><th class="num">Montant</th></tr></thead>
      <tbody>${paiementsHTML}</tbody>
    </table>
  </div>` : ''}

  <!-- NOTES -->
  ${f.notes ? `<div class="pdf-notes"><strong>📝 Notes :</strong>${f.notes}</div>` : ''}

  <!-- SIGNATURES -->
  <div class="pdf-signature">
    <div class="pdf-sign-box">
      <strong>Bon pour accord — Client</strong>
      Lu et approuvé
    </div>
    <div class="pdf-sign-box">
      <strong>Cachet & Signature</strong>
      ${co.name || ''}
    </div>
  </div>

  <!-- CONDITIONS -->
  <div class="pdf-conditions">
    ${co.rib ? `<strong>RIB :</strong> ${co.rib} &nbsp;|&nbsp; ` : ''}
    Paiement à réception de facture sauf accord préalable.
    Tout retard de paiement entraîne des pénalités selon les conditions générales.
    ${co.pdfFooter || co.pdf_footer ? '<br>' + (co.pdfFooter || co.pdf_footer) : ''}
  </div>

  <!-- FOOTER -->
  <div class="pdf-footer">
    <strong>${co.name || 'GestionApp 212'}</strong>
    ${co.ice ? ` &nbsp;·&nbsp; ICE : ${co.ice}` : ''}
    ${co.rc  ? ` &nbsp;·&nbsp; RC : ${co.rc}` : ''}
    <br>Document généré par GestionApp 212 — ${new Date().toLocaleDateString('fr-FR')}
  </div>
</div>
</body>
</html>`;
}

// ── Ouvrir le PDF dans une nouvelle fenêtre (avec fallback modal) ─
function _openPDFWindow(html, title = 'Document') {
  // Essayer d'abord d'ouvrir dans une nouvelle fenêtre
  let win = null;
  try {
    win = window.open('', '_blank', 'width=960,height=750,scrollbars=yes,resizable=yes,toolbar=no,menubar=yes');
  } catch(e) { win = null; }

  if (win && !win.closed) {
    try {
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.document.title = title;
      win.focus();
      return;
    } catch(e) {
      try { win.close(); } catch(e2) {}
      win = null;
    }
  }

  // Fallback : afficher le PDF dans une modale in-page avec iframe blob
  showToast('⚠️ Popup bloquée — affichage en modale (autorisez les popups pour impression directe)', 'warning', 5000);
  _showPDFModal(html, title);
}

// ── Fallback : affiche le PDF dans une modale plein-écran ──────
function _showPDFModal(html, title) {
  // Créer un blob URL pour l'iframe
  let iframeSrc = '';
  try {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    iframeSrc = URL.createObjectURL(blob);
  } catch(e) {
    // Si blob n'est pas supporté, utiliser data URI (tronqué pour les gros fichiers)
    iframeSrc = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
  }

  const modalId = 'pdf-preview-modal';
  // Supprimer l'ancienne modale si présente
  const old = document.getElementById(modalId);
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = modalId;
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.85); z-index: 99999;
    display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
  `;

  modal.innerHTML = `
    <div style="width:100%;max-width:960px;height:100vh;display:flex;flex-direction:column">
      <!-- Barre d'outils -->
      <div style="background:#1a2332;color:#fff;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;border-bottom:2px solid #2d4a6e">
        <span style="font-weight:600;font-size:14px"><i class="fas fa-file-pdf" style="color:#fc8181;margin-right:8px"></i>${title}</span>
        <div style="display:flex;gap:8px;align-items:center">
          <button onclick="document.getElementById('pdf-preview-iframe').contentWindow.print()"
            style="padding:7px 16px;background:#2b6cb0;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:12px;font-weight:600">
            <i class="fas fa-print"></i> Imprimer
          </button>
          <button onclick="(function(){
            var a=document.createElement('a');
            a.href=document.getElementById('pdf-preview-iframe').src;
            a.download='${title.replace(/[^a-zA-Z0-9 \-\_]/g,'')}.pdf';
            a.click();
          })()"
            style="padding:7px 16px;background:#276749;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:12px;font-weight:600">
            <i class="fas fa-download"></i> Télécharger
          </button>
          <button onclick="(function(){var m=document.getElementById('pdf-preview-modal');if(m){URL.revokeObjectURL(document.getElementById('pdf-preview-iframe').src);m.remove();}})()"
            style="padding:7px 14px;background:#4a5568;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:12px;font-weight:600">
            <i class="fas fa-times"></i> Fermer
          </button>
        </div>
      </div>
      <!-- iframe PDF -->
      <iframe id="pdf-preview-iframe" src="${iframeSrc}"
        style="flex:1;width:100%;border:none;background:#fff"
        onload="this.style.opacity=1" style="opacity:0;transition:opacity 0.3s">
      </iframe>
    </div>
  `;

  document.body.appendChild(modal);

  // Fermer avec Escape
  const handler = (e) => {
    if (e.key === 'Escape') {
      const m = document.getElementById(modalId);
      if (m) {
        try { URL.revokeObjectURL(document.getElementById('pdf-preview-iframe')?.src); } catch(e) {}
        m.remove();
      }
      document.removeEventListener('keydown', handler);
    }
  };
  document.addEventListener('keydown', handler);
}

// ── API PUBLIQUE ─────────────────────────────────────────────

/**
 * Afficher/imprimer un Devis en PDF
 */
function generateDevisPDF(devis, client) {
  if (!devis) { showToast('Devis introuvable', 'error'); return; }
  const html = _buildDevisHTML(devis, client || null);
  _openPDFWindow(html, `Devis ${devis.numero || ''}`);
}

/**
 * Afficher/imprimer une Facture en PDF
 */
function generateFacturePDF(facture, client) {
  if (!facture) { showToast('Facture introuvable', 'error'); return; }
  const html = _buildFactureHTML(facture, client || null);
  _openPDFWindow(html, `Facture ${facture.numero || ''}`);
}

/**
 * Imprimer directement sans ouvrir la fenêtre prévisualisation
 */
function printDocument(type, id) {
  let doc, client;
  if (type === 'devis') {
    doc = App.data.devis?.find(d => d.id === id);
    const cid = doc?.clientId || doc?.client_id;
    client = App.data.clients?.find(c => c.id === cid);
    generateDevisPDF(doc, client);
  } else if (type === 'facture') {
    doc = App.data.factures?.find(f => f.id === id);
    const cid = doc?.clientId || doc?.client_id;
    client = App.data.clients?.find(c => c.id === cid);
    generateFacturePDF(doc, client);
  }
}
