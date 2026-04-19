// ===== BATIGEST PRO – MODULE PDF IMPRESSION =====
// Utilise window.print() avec une feuille de style dédiée pour un rendu PDF professionnel

// ===== UTILITAIRES =====
function pdfFmt(n) {
  return Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' DH';
}
function pdfFmtDate(d) {
  if (!d) return '–';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}
function pdfFmtDateShort(d) {
  if (!d) return '–';
  return new Date(d).toLocaleDateString('fr-FR');
}

// Récupère le logo de la société (base64 stocké en localStorage)
function getCompanyLogo(company) {
  const logo = localStorage.getItem('batigest_logo_' + company.id);
  return logo || null;
}

// ===== STYLES CSS COMMUNS POUR TOUS LES PDF =====
function getPdfBaseStyles() {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: 'Inter', 'Segoe UI', sans-serif;
      background: #fff;
      color: #1e293b;
      font-size: 13px;
      line-height: 1.5;
    }

    .pdf-page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #fff;
      position: relative;
      display: flex;
      flex-direction: column;
    }

    /* ===== EN-TÊTE ===== */
    .pdf-header {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      color: #fff;
      padding: 32px 36px 28px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 24px;
      position: relative;
      overflow: hidden;
    }

    .pdf-header::before {
      content: '';
      position: absolute;
      top: -40px; right: -40px;
      width: 180px; height: 180px;
      border-radius: 50%;
      background: rgba(37,99,235,0.15);
    }
    .pdf-header::after {
      content: '';
      position: absolute;
      bottom: -60px; right: 80px;
      width: 120px; height: 120px;
      border-radius: 50%;
      background: rgba(124,58,237,0.1);
    }

    .pdf-header-left { flex: 1; z-index: 1; }
    .pdf-header-right { text-align: right; z-index: 1; }

    .pdf-company-logo {
      width: 70px; height: 70px;
      border-radius: 14px;
      object-fit: contain;
      background: #fff;
      padding: 4px;
      margin-bottom: 10px;
    }

    .pdf-company-logo-placeholder {
      width: 58px; height: 58px;
      border-radius: 14px;
      background: #2563eb;
      display: flex; align-items: center; justify-content: center;
      font-size: 28px;
      margin-bottom: 10px;
      color: #fff;
      font-weight: 800;
      letter-spacing: -1px;
    }

    .pdf-company-name {
      font-size: 20px;
      font-weight: 800;
      color: #fff;
      margin-bottom: 3px;
      letter-spacing: -0.3px;
    }

    .pdf-company-info {
      font-size: 11.5px;
      color: rgba(255,255,255,0.7);
      line-height: 1.7;
    }

    .pdf-doc-type {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #60a5fa;
      margin-bottom: 6px;
    }

    .pdf-doc-number {
      font-size: 28px;
      font-weight: 900;
      color: #fff;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }

    .pdf-doc-date {
      font-size: 12px;
      color: rgba(255,255,255,0.7);
      line-height: 1.8;
    }

    /* ===== BANDEAU COULEUR ===== */
    .pdf-color-band {
      height: 5px;
      background: linear-gradient(90deg, #2563eb, #7c3aed, #06b6d4);
    }

    /* ===== CORPS ===== */
    .pdf-body {
      padding: 28px 36px;
      flex: 1;
    }

    /* ===== INFOS CLIENT / DESTINATAIRE ===== */
    .pdf-parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 28px;
    }

    .pdf-party-card {
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 18px;
      position: relative;
    }

    .pdf-party-card.highlighted {
      border-color: #2563eb;
      background: #f0f7ff;
    }

    .pdf-party-label {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #2563eb;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .pdf-party-label::before {
      content: '';
      width: 16px; height: 2px;
      background: #2563eb;
      border-radius: 1px;
    }

    .pdf-party-name {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }

    .pdf-party-details {
      font-size: 12px;
      color: #64748b;
      line-height: 1.7;
    }

    /* ===== TABLEAU LIGNES ===== */
    .pdf-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin-bottom: 20px;
      border-radius: 10px;
      overflow: hidden;
      border: 1.5px solid #e2e8f0;
    }

    .pdf-table thead tr {
      background: linear-gradient(135deg, #1e293b, #0f172a);
    }

    .pdf-table thead th {
      padding: 12px 14px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.85);
      text-align: left;
    }

    .pdf-table thead th:last-child { text-align: right; }
    .pdf-table thead th:nth-child(2), .pdf-table thead th:nth-child(3) { text-align: center; }

    .pdf-table tbody tr:nth-child(even) { background: #f8fafc; }
    .pdf-table tbody tr:hover { background: #f0f7ff; }

    .pdf-table tbody td {
      padding: 11px 14px;
      font-size: 12.5px;
      color: #334155;
      border-top: 1px solid #f1f5f9;
      vertical-align: top;
    }

    .pdf-table tbody td:last-child { text-align: right; font-weight: 600; color: #1e293b; }
    .pdf-table tbody td:nth-child(2), .pdf-table tbody td:nth-child(3) { text-align: center; }

    .pdf-table tfoot td {
      padding: 10px 14px;
      font-size: 12.5px;
      border-top: 1px solid #e2e8f0;
    }

    /* ===== TOTAUX ===== */
    .pdf-totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 24px;
    }

    .pdf-totals-box {
      width: 280px;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
    }

    .pdf-total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 12.5px;
    }

    .pdf-total-row:last-child { border-bottom: none; }

    .pdf-total-row.highlight {
      background: linear-gradient(135deg, #1e293b, #0f172a);
      color: #fff;
    }

    .pdf-total-row .label { color: #64748b; }
    .pdf-total-row.highlight .label { color: rgba(255,255,255,0.75); }
    .pdf-total-row .value { font-weight: 700; color: #1e293b; }
    .pdf-total-row.highlight .value { color: #fff; font-size: 15px; font-weight: 800; }
    .pdf-total-row.paid .value { color: #16a34a; font-weight: 700; }
    .pdf-total-row.remaining .value { color: #dc2626; font-weight: 700; }

    /* ===== STATUT BADGE ===== */
    .pdf-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.3px;
    }

    .pdf-status-badge::before {
      content: '';
      width: 6px; height: 6px;
      border-radius: 50%;
    }

    .badge-paye { background: #dcfce7; color: #15803d; }
    .badge-paye::before { background: #16a34a; }
    .badge-non_paye { background: #fee2e2; color: #dc2626; }
    .badge-non_paye::before { background: #dc2626; }
    .badge-partiel { background: #fef3c7; color: #d97706; }
    .badge-partiel::before { background: #d97706; }
    .badge-accepte { background: #dcfce7; color: #15803d; }
    .badge-accepte::before { background: #16a34a; }
    .badge-en_attente { background: #fef3c7; color: #d97706; }
    .badge-en_attente::before { background: #d97706; }

    /* ===== NOTES / CONDITIONS ===== */
    .pdf-notes {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px 18px;
      margin-bottom: 20px;
    }

    .pdf-notes-title {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 6px;
    }

    .pdf-notes-text {
      font-size: 12px;
      color: #475569;
      line-height: 1.7;
    }

    /* ===== INFOS CHANTIER ===== */
    .pdf-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin-bottom: 22px;
    }

    .pdf-info-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
    }

    .pdf-info-label {
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 3px;
    }

    .pdf-info-value {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
    }

    /* ===== BARRE BUDGET ===== */
    .pdf-budget-bar-container {
      background: #e2e8f0;
      border-radius: 6px;
      height: 10px;
      overflow: hidden;
      margin: 6px 0 4px;
    }

    .pdf-budget-bar {
      height: 100%;
      border-radius: 6px;
    }

    .pdf-budget-bar.green { background: linear-gradient(90deg, #22c55e, #16a34a); }
    .pdf-budget-bar.orange { background: linear-gradient(90deg, #f97316, #ea580c); }
    .pdf-budget-bar.red { background: linear-gradient(90deg, #ef4444, #dc2626); }

    /* ===== SECTION FINANCIÈRE CHANTIER ===== */
    .pdf-fin-summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 22px;
    }

    .pdf-fin-card {
      border-radius: 12px;
      padding: 14px;
      text-align: center;
    }

    .pdf-fin-card.blue { background: #eff6ff; border: 1.5px solid #bfdbfe; }
    .pdf-fin-card.green { background: #f0fdf4; border: 1.5px solid #bbf7d0; }
    .pdf-fin-card.red { background: #fff1f2; border: 1.5px solid #fecaca; }
    .pdf-fin-card.purple { background: #faf5ff; border: 1.5px solid #e9d5ff; }

    .pdf-fin-card .fin-val {
      font-size: 17px;
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 3px;
    }

    .pdf-fin-card.blue .fin-val { color: #2563eb; }
    .pdf-fin-card.green .fin-val { color: #16a34a; }
    .pdf-fin-card.red .fin-val { color: #dc2626; }
    .pdf-fin-card.purple .fin-val { color: #7c3aed; }

    .pdf-fin-card .fin-lbl {
      font-size: 9.5px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* ===== PIED DE PAGE ===== */
    .pdf-footer {
      border-top: 2px solid #f1f5f9;
      padding: 16px 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f8fafc;
      margin-top: auto;
    }

    .pdf-footer-left {
      font-size: 10.5px;
      color: #94a3b8;
      line-height: 1.6;
    }

    .pdf-footer-center {
      font-size: 10px;
      color: #94a3b8;
      text-align: center;
    }

    .pdf-footer-right {
      font-size: 10.5px;
      color: #94a3b8;
      text-align: right;
    }

    .pdf-footer-brand {
      font-size: 10px;
      color: #cbd5e1;
      font-weight: 600;
      text-align: center;
      margin-top: 4px;
    }

    /* ===== SIGNATURE / CACHET ===== */
    .pdf-signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 28px;
      margin-bottom: 20px;
    }

    .pdf-signature-box {
      border: 1.5px dashed #cbd5e1;
      border-radius: 10px;
      padding: 20px;
      text-align: center;
      min-height: 80px;
    }

    .pdf-signature-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 4px;
    }

    .pdf-signature-name {
      font-size: 12px;
      color: #475569;
    }

    /* ===== WATERMARK ===== */
    .pdf-watermark {
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 80px;
      font-weight: 900;
      color: rgba(220,38,38,0.06);
      white-space: nowrap;
      pointer-events: none;
      z-index: 0;
      letter-spacing: 5px;
    }

    /* ===== DIVIDERS ===== */
    .pdf-section-title {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: #475569;
      padding: 8px 0;
      margin: 16px 0 10px;
      border-bottom: 2px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .pdf-section-title::before {
      content: '';
      width: 4px; height: 14px;
      background: #2563eb;
      border-radius: 2px;
    }

    /* ===== PRINT MEDIA ===== */
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .pdf-page { margin: 0; width: 100%; }
      @page { size: A4; margin: 0; }
    }
  `;
}

// ===== GÉNÉRATION EN-TÊTE SOCIÉTÉ =====
function buildPdfHeader(company, docType, docNumber, docDate, extra = '') {
  const logo = getCompanyLogo(company);
  const initial = (company.name || 'B').charAt(0).toUpperCase();

  return `
    <div class="pdf-header">
      <div class="pdf-header-left">
        ${logo
          ? `<img src="${logo}" class="pdf-company-logo" alt="Logo"/>`
          : `<div class="pdf-company-logo-placeholder">${initial}</div>`
        }
        <div class="pdf-company-name">${company.name || 'Ma Société'}</div>
        <div class="pdf-company-info">
          ${company.email ? `📧 ${company.email}<br/>` : ''}
          ${company.phone ? `📞 ${company.phone}<br/>` : ''}
          ${company.city ? `📍 ${company.city}` : ''}
          ${company.address ? `, ${company.address}` : ''}
          ${company.ice ? `<br/>ICE : ${company.ice}` : ''}
          ${company.rc ? ` | RC : ${company.rc}` : ''}
          ${company.if_num ? ` | IF : ${company.if_num}` : ''}
        </div>
      </div>
      <div class="pdf-header-right">
        <div class="pdf-doc-type">${docType}</div>
        <div class="pdf-doc-number">${docNumber}</div>
        <div class="pdf-doc-date">
          <strong>Date :</strong> ${pdfFmtDate(docDate)}<br/>
          ${extra}
        </div>
      </div>
    </div>
    <div class="pdf-color-band"></div>`;
}

// ===== PIED DE PAGE =====
function buildPdfFooter(company) {
  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  return `
    <div class="pdf-footer">
      <div class="pdf-footer-left">
        <strong>${company.name || ''}</strong><br/>
        ${company.city || ''} ${company.phone ? '– ' + company.phone : ''}
      </div>
      <div style="text-align:center">
        <div class="pdf-footer-center">Document généré le ${date}</div>
        <div class="pdf-footer-brand">BatiGest Pro – Gestion BTP & Commerce</div>
      </div>
      <div class="pdf-footer-right">
        ${company.ice ? `ICE : ${company.ice}<br/>` : ''}
        ${company.rc ? `RC : ${company.rc}<br/>` : ''}
        ${company.bank ? `RIB : ${company.bank}` : ''}
      </div>
    </div>`;
}

// ===== IMPRESSION DEVIS (Supabase async) =====
async function printDevisPDF(devisId) {
  const company = AppState.currentCompany;
  if (!company) { toast('Aucune société chargée', 'danger'); return; }
  const { data: devis } = await SB.getOne('devis', devisId);
  if (!devis) { toast('Devis introuvable', 'danger'); return; }

  let client = { name: devis.client_nom || '–' };
  if (devis.client_id) {
    const { data: cl } = await SB.getOne('clients', devis.client_id);
    if (cl) client = cl;
  }

  const validiteVal = devis.date_validite || devis.validite || null;
  const validite = validiteVal ? `<strong>Validité :</strong> ${pdfFmtDate(validiteVal)}<br/>` : '';
  const statuts = { accepte: 'badge-accepte', en_attente: 'badge-en_attente', refuse: 'badge-non_paye', expire: 'badge-non_paye' };
  const statutLabel = { accepte: '✓ Accepté', en_attente: '⏳ En attente', refuse: '✗ Refusé', expire: 'Expiré' };

  const lignesHTML = (devis.lignes || []).map((l, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${l.designation || '–'}</td>
      <td>${Number(l.qte || 1).toLocaleString('fr-MA')}</td>
      <td style="text-align:right">${pdfFmt(l.prix)}</td>
      <td>${pdfFmt((l.qte || 1) * (l.prix || 0))}</td>
    </tr>`).join('');

  const tva = devis.tva || 20;
  const ht = devis.montant_ht || 0;
  const tvaAmt = ht * tva / 100;
  const ttc = devis.montant_ttc || ht + tvaAmt;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Devis ${devis.numero}</title>
  <style>${getPdfBaseStyles()}</style>
</head>
<body>
  <div class="pdf-page">
    ${buildPdfHeader(company, 'DEVIS', devis.numero, devis.date, validite)}
    <div class="pdf-body">
      <div class="pdf-parties">
        <div class="pdf-party-card">
          <div class="pdf-party-label">Émetteur</div>
          <div class="pdf-party-name">${company.name}</div>
          <div class="pdf-party-details">
            ${company.email || ''}<br/>
            ${company.phone || ''}<br/>
            ${company.city || ''}
          </div>
        </div>
        <div class="pdf-party-card highlighted">
          <div class="pdf-party-label">Destinataire</div>
          <div class="pdf-party-name">${client.name}</div>
          <div class="pdf-party-details">
            ${client.email || ''}<br/>
            ${client.phone || ''}<br/>
            ${client.city || ''}
          </div>
        </div>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div class="pdf-section-title">Détail des prestations</div>
        <span class="pdf-status-badge ${statuts[devis.statut] || 'badge-en_attente'}">${statutLabel[devis.statut] || devis.statut}</span>
      </div>

      <table class="pdf-table">
        <thead>
          <tr>
            <th style="width:32px">#</th>
            <th>Désignation / Description</th>
            <th style="width:70px;text-align:center">Qté</th>
            <th style="width:100px;text-align:right">Prix unit.</th>
            <th style="width:110px;text-align:right">Total HT</th>
          </tr>
        </thead>
        <tbody>${lignesHTML}</tbody>
      </table>

      <div class="pdf-totals">
        <div class="pdf-totals-box">
          <div class="pdf-total-row">
            <span class="label">Montant HT</span>
            <span class="value">${pdfFmt(ht)}</span>
          </div>
          <div class="pdf-total-row">
            <span class="label">TVA (${tva}%)</span>
            <span class="value">${pdfFmt(tvaAmt)}</span>
          </div>
          <div class="pdf-total-row highlight">
            <span class="label">Total TTC</span>
            <span class="value">${pdfFmt(ttc)}</span>
          </div>
        </div>
      </div>

      ${devis.notes ? `<div class="pdf-notes"><div class="pdf-notes-title">📝 Notes & Conditions</div><div class="pdf-notes-text">${devis.notes}</div></div>` : ''}

      <div class="pdf-notes" style="background:#fffbeb;border-color:#fde68a">
        <div class="pdf-notes-title">⚠️ Conditions de validité</div>
        <div class="pdf-notes-text">Ce devis est valable jusqu'au <strong>${pdfFmtDate(validiteVal) || 'date non précisée'}</strong>. Passé ce délai, les prix peuvent être révisés. Ce document n'est pas une facture.</div>
      </div>

      <div class="pdf-signatures">
        <div class="pdf-signature-box">
          <div class="pdf-signature-label">Signature client</div>
          <div class="pdf-signature-name">Bon pour accord – Date & Cachet</div>
          <div style="margin-top:40px;border-top:1px solid #e2e8f0;padding-top:8px;font-size:11px;color:#94a3b8">${client.name}</div>
        </div>
        <div class="pdf-signature-box">
          <div class="pdf-signature-label">Signature prestataire</div>
          <div class="pdf-signature-name">Cachet & Signature autorisée</div>
          <div style="margin-top:40px;border-top:1px solid #e2e8f0;padding-top:8px;font-size:11px;color:#94a3b8">${company.name}</div>
        </div>
      </div>
    </div>
    ${buildPdfFooter(company)}
  </div>
</body>
</html>`;

  openPdfWindow(html, `Devis_${devis.numero}`);
}
window.printDevisPDF = printDevisPDF;

// ===== IMPRESSION FACTURE (Supabase async) =====
async function printFacturePDF(factureId) {
  const company = AppState.currentCompany;
  if (!company) { toast('Aucune société chargée', 'danger'); return; }
  const { data: facture } = await SB.getOne('factures', factureId);
  if (!facture) { toast('Facture introuvable', 'danger'); return; }

  let client = { name: facture.client_nom || '–' };
  if (facture.client_id) {
    const { data: cl } = await SB.getOne('clients', facture.client_id);
    if (cl) client = cl;
  }
  const statuts = { paye: 'badge-paye', non_paye: 'badge-non_paye', partiel: 'badge-partiel' };
  const statutLabel = { paye: '✓ Payée', non_paye: '✗ Impayée', partiel: '◑ Paiement partiel' };

  const tva = facture.tva || 20;
  const ht = facture.montant_ht || 0;
  const tvaAmt = ht * tva / 100;
  const ttc = facture.montant_ttc || ht + tvaAmt;
  const paye = facture.montant_paye || 0;
  const reste = ttc - paye;

  const lignesHTML = (facture.lignes || []).map((l, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${l.designation || '–'}</td>
      <td>${Number(l.qte || 1).toLocaleString('fr-MA')}</td>
      <td style="text-align:right">${pdfFmt(l.prix)}</td>
      <td>${pdfFmt((l.qte || 1) * (l.prix || 0))}</td>
    </tr>`).join('');

  const isFullyPaid = facture.statut === 'paye';

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Facture ${facture.numero}</title>
  <style>${getPdfBaseStyles()}</style>
</head>
<body>
  ${isFullyPaid ? '' : `<div class="pdf-watermark">${facture.statut === 'partiel' ? 'PARTIEL' : 'IMPAYÉE'}</div>`}
  <div class="pdf-page">
    ${buildPdfHeader(company, 'FACTURE', facture.numero, facture.date,
      `<strong>Échéance :</strong> ${pdfFmtDate(facture.date_echeance || facture.echeance)}<br/>`
    )}
    <div class="pdf-body">
      <div class="pdf-parties">
        <div class="pdf-party-card">
          <div class="pdf-party-label">Émetteur</div>
          <div class="pdf-party-name">${company.name}</div>
          <div class="pdf-party-details">
            ${company.email || ''}<br/>
            ${company.phone || ''}<br/>
            ${company.city || ''}
            ${company.ice ? `<br/>ICE : ${company.ice}` : ''}
          </div>
        </div>
        <div class="pdf-party-card highlighted">
          <div class="pdf-party-label">Facturé à</div>
          <div class="pdf-party-name">${client.name}</div>
          <div class="pdf-party-details">
            ${client.email || ''}<br/>
            ${client.phone || ''}<br/>
            ${client.city || ''}
          </div>
        </div>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div class="pdf-section-title">Détail des prestations / Travaux</div>
        <span class="pdf-status-badge ${statuts[facture.statut] || 'badge-non_paye'}">${statutLabel[facture.statut] || facture.statut}</span>
      </div>

      <table class="pdf-table">
        <thead>
          <tr>
            <th style="width:32px">#</th>
            <th>Désignation / Description</th>
            <th style="width:70px;text-align:center">Qté</th>
            <th style="width:100px;text-align:right">Prix unit. HT</th>
            <th style="width:110px;text-align:right">Total HT</th>
          </tr>
        </thead>
        <tbody>${lignesHTML}</tbody>
      </table>

      <div class="pdf-totals">
        <div class="pdf-totals-box">
          <div class="pdf-total-row">
            <span class="label">Montant HT</span>
            <span class="value">${pdfFmt(ht)}</span>
          </div>
          <div class="pdf-total-row">
            <span class="label">TVA (${tva}%)</span>
            <span class="value">${pdfFmt(tvaAmt)}</span>
          </div>
          <div class="pdf-total-row highlight">
            <span class="label">Total TTC</span>
            <span class="value">${pdfFmt(ttc)}</span>
          </div>
          ${paye > 0 ? `
          <div class="pdf-total-row paid">
            <span class="label">Déjà payé</span>
            <span class="value">– ${pdfFmt(paye)}</span>
          </div>
          <div class="pdf-total-row remaining">
            <span class="label">Reste à payer</span>
            <span class="value">${pdfFmt(reste)}</span>
          </div>` : ''}
        </div>
      </div>

      ${company.bank ? `
      <div class="pdf-notes" style="background:#f0fdf4;border-color:#bbf7d0">
        <div class="pdf-notes-title">🏦 Informations bancaires</div>
        <div class="pdf-notes-text"><strong>RIB :</strong> ${company.bank}<br/><strong>Banque :</strong> ${company.bank_name || ''}</div>
      </div>` : ''}

      <div class="pdf-notes">
        <div class="pdf-notes-title">📋 Conditions de paiement</div>
        <div class="pdf-notes-text">Paiement à réception de la facture ou au plus tard le <strong>${pdfFmtDate(facture.date_echeance || facture.echeance)}</strong>. Tout retard de paiement entraîne des pénalités conformément à la législation en vigueur.</div>
      </div>

      <div class="pdf-signatures" style="margin-top:20px">
        <div class="pdf-signature-box">
          <div class="pdf-signature-label">Accusé de réception</div>
          <div class="pdf-signature-name">Reçu la facture – Date & Signature</div>
          <div style="margin-top:40px;border-top:1px solid #e2e8f0;padding-top:8px;font-size:11px;color:#94a3b8">${client.name}</div>
        </div>
        <div class="pdf-signature-box">
          <div class="pdf-signature-label">Cachet & Signature</div>
          <div class="pdf-signature-name">Responsable facturation</div>
          <div style="margin-top:40px;border-top:1px solid #e2e8f0;padding-top:8px;font-size:11px;color:#94a3b8">${company.name}</div>
        </div>
      </div>
    </div>
    ${buildPdfFooter(company)}
  </div>
</body>
</html>`;

  openPdfWindow(html, `Facture_${facture.numero}`);
}
window.printFacturePDF = printFacturePDF;

// ===== RAPPORT CHANTIER (Supabase async) =====
async function printChantierPDF(chantierId) {
  const company = AppState.currentCompany;
  if (!company) { toast('Aucune société chargée', 'danger'); return; }
  const { data: chantier } = await SB.getOne('chantiers', chantierId);
  if (!chantier) { toast('Chantier introuvable', 'danger'); return; }

  const [{ data: entrees }, { data: achats }, { data: mdo }] = await Promise.all([
    SB.getWhere('chantier_entrees', 'chantier_id', chantierId),
    SB.getWhere('chantier_achats', 'chantier_id', chantierId),
    SB.getWhere('chantier_main_oeuvre', 'chantier_id', chantierId),
  ]);

  const totalEntrees = (entrees||[]).reduce((s, e) => s + Number(e.montant||0), 0);
  const totalAchats = (achats||[]).reduce((s, a) => s + Number(a.montant||0), 0);
  const totalMdo = (mdo||[]).reduce((s, m) => s + Number(m.montant||0), 0);
  const totalSorties = totalAchats + totalMdo;
  const resultat = totalEntrees - totalSorties;
  const pctBudget = chantier.budget > 0 ? Math.round(totalSorties / chantier.budget * 100) : 0;
  const barColor = pctBudget < 70 ? 'green' : pctBudget <= 100 ? 'orange' : 'red';

  const statuts = { en_cours: ['🔵', 'En cours'], termine: ['🟢', 'Terminé'], pause: ['🟡', 'En pause'], annule: ['🔴', 'Annulé'] };
  const [sIcon, sLabel] = statuts[chantier.statut] || ['⚪', chantier.statut];

  const typesMdo = { journalier: 'Journalier', a_la_tache: 'À la tâche', prestataire: 'Prestataire' };

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Rapport Chantier – ${chantier.nom}</title>
  <style>${getPdfBaseStyles()}</style>
</head>
<body>
  <div class="pdf-page">
    ${buildPdfHeader(company, 'RAPPORT DE CHANTIER', chantier.nom, new Date().toISOString().split('T')[0],
      `<strong>Statut :</strong> ${sIcon} ${sLabel}<br/>
       <strong>Période :</strong> ${pdfFmtDateShort(chantier.date_debut)} → ${pdfFmtDateShort(chantier.date_fin)}`
    )}
    <div class="pdf-body">

      <!-- INFOS CHANTIER -->
      <div class="pdf-section-title">Informations générales</div>
      <div class="pdf-info-grid">
        <div class="pdf-info-item">
          <div class="pdf-info-label">Client</div>
          <div class="pdf-info-value">${chantier.client_nom || '–'}</div>
        </div>
        <div class="pdf-info-item">
          <div class="pdf-info-label">Date début</div>
          <div class="pdf-info-value">${pdfFmtDateShort(chantier.date_debut)}</div>
        </div>
        <div class="pdf-info-item">
          <div class="pdf-info-label">Date fin prévue</div>
          <div class="pdf-info-value">${pdfFmtDateShort(chantier.date_fin)}</div>
        </div>
        <div class="pdf-info-item">
          <div class="pdf-info-label">Budget alloué</div>
          <div class="pdf-info-value" style="color:#2563eb">${pdfFmt(chantier.budget)}</div>
        </div>
        <div class="pdf-info-item">
          <div class="pdf-info-label">Budget utilisé</div>
          <div class="pdf-info-value" style="color:${barColor === 'green' ? '#16a34a' : barColor === 'orange' ? '#d97706' : '#dc2626'}">${pctBudget}%</div>
        </div>
        <div class="pdf-info-item">
          <div class="pdf-info-label">Statut</div>
          <div class="pdf-info-value">${sIcon} ${sLabel}</div>
        </div>
      </div>

      ${chantier.description ? `
      <div class="pdf-notes" style="margin-bottom:18px">
        <div class="pdf-notes-title">Description</div>
        <div class="pdf-notes-text">${chantier.description}</div>
      </div>` : ''}

      <!-- BILAN FINANCIER -->
      <div class="pdf-section-title">Bilan financier</div>
      <div class="pdf-fin-summary">
        <div class="pdf-fin-card blue">
          <div class="fin-val">${pdfFmt(chantier.budget)}</div>
          <div class="fin-lbl">Budget total</div>
        </div>
        <div class="pdf-fin-card green">
          <div class="fin-val">${pdfFmt(totalEntrees)}</div>
          <div class="fin-lbl">Total entrées</div>
        </div>
        <div class="pdf-fin-card red">
          <div class="fin-val">${pdfFmt(totalSorties)}</div>
          <div class="fin-lbl">Total dépenses</div>
        </div>
        <div class="pdf-fin-card ${resultat >= 0 ? 'green' : 'red'}">
          <div class="fin-val">${pdfFmt(resultat)}</div>
          <div class="fin-lbl">${resultat >= 0 ? 'Bénéfice' : 'Perte'}</div>
        </div>
      </div>

      <!-- BARRE BUDGET -->
      <div style="margin-bottom:22px">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:5px;font-weight:600">
          <span>Consommation budget</span>
          <span style="color:${barColor === 'green' ? '#16a34a' : barColor === 'orange' ? '#d97706' : '#dc2626'};font-weight:700">${pctBudget}% – ${pdfFmt(totalSorties)} / ${pdfFmt(chantier.budget)}</span>
        </div>
        <div class="pdf-budget-bar-container">
          <div class="pdf-budget-bar ${barColor}" style="width:${Math.min(pctBudget, 100)}%"></div>
        </div>
        ${pctBudget > 100 ? `<div style="margin-top:6px;color:#dc2626;font-size:11px;font-weight:700">⚠️ Budget dépassé de ${pdfFmt(totalSorties - chantier.budget)}</div>` : ''}
      </div>

      <!-- ENTRÉES -->
      ${(entrees||[]).length > 0 ? `
      <div class="pdf-section-title">Entrées – Avances client</div>
      <table class="pdf-table" style="margin-bottom:18px">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th style="text-align:right">Montant</th>
          </tr>
        </thead>
        <tbody>
          ${(entrees||[]).map(e => `<tr>
            <td>${pdfFmtDateShort(e.date)}</td>
            <td>${e.description || '–'}</td>
            <td style="color:#16a34a;text-align:right;font-weight:600">${pdfFmt(e.montant)}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr style="background:#f0fdf4">
            <td colspan="2" style="font-weight:700;color:#15803d;padding:10px 14px">Total entrées</td>
            <td style="text-align:right;font-weight:800;color:#15803d;padding:10px 14px">${pdfFmt(totalEntrees)}</td>
          </tr>
        </tfoot>
      </table>` : ''}

      <!-- ACHATS -->
      ${(achats||[]).length > 0 ? `
      <div class="pdf-section-title">Achats & Matériaux</div>
      <table class="pdf-table" style="margin-bottom:18px">
        <thead>
          <tr>
            <th>Date</th>
            <th>Fournisseur</th>
            <th>Produit / Description</th>
            <th style="text-align:right">Montant</th>
          </tr>
        </thead>
        <tbody>
          ${(achats||[]).map(a => `<tr>
            <td>${pdfFmtDateShort(a.date)}</td>
            <td style="font-weight:500">${a.fournisseur || '–'}</td>
            <td>${a.produit || '–'}</td>
            <td style="color:#dc2626;text-align:right;font-weight:600">${pdfFmt(a.montant)}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr style="background:#fff1f2">
            <td colspan="3" style="font-weight:700;color:#dc2626;padding:10px 14px">Total achats</td>
            <td style="text-align:right;font-weight:800;color:#dc2626;padding:10px 14px">${pdfFmt(totalAchats)}</td>
          </tr>
        </tfoot>
      </table>` : ''}

      <!-- MAIN D'ŒUVRE -->
      ${(mdo||[]).length > 0 ? `
      <div class="pdf-section-title">Main d'œuvre</div>
      <table class="pdf-table" style="margin-bottom:18px">
        <thead>
          <tr>
            <th>Date</th>
            <th>Nom / Équipe</th>
            <th>Type</th>
            <th>Description</th>
            <th style="text-align:right">Montant</th>
          </tr>
        </thead>
        <tbody>
          ${(mdo||[]).map(m => `<tr>
            <td>${pdfFmtDateShort(m.date)}</td>
            <td style="font-weight:500">${m.nom}</td>
            <td style="font-size:11px;color:#7c3aed;font-weight:600">${typesMdo[m.type] || m.type}</td>
            <td style="color:#64748b;font-size:11.5px">${m.description || '–'}</td>
            <td style="color:#dc2626;text-align:right;font-weight:600">${pdfFmt(m.montant)}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr style="background:#faf5ff">
            <td colspan="4" style="font-weight:700;color:#7c3aed;padding:10px 14px">Total main d'œuvre</td>
            <td style="text-align:right;font-weight:800;color:#7c3aed;padding:10px 14px">${pdfFmt(totalMdo)}</td>
          </tr>
        </tfoot>
      </table>` : ''}

      <!-- RÉCAPITULATIF -->
      <div class="pdf-section-title">Récapitulatif des dépenses</div>
      <div class="pdf-totals" style="justify-content:flex-start">
        <div style="width:100%;border:1.5px solid #e2e8f0;border-radius:12px;overflow:hidden">
          <div class="pdf-total-row" style="background:#f8fafc">
            <span class="label" style="color:#1e293b;font-weight:600">Achats & Matériaux</span>
            <span class="value" style="color:#dc2626">${pdfFmt(totalAchats)} (${totalSorties > 0 ? Math.round(totalAchats / totalSorties * 100) : 0}%)</span>
          </div>
          <div class="pdf-total-row" style="background:#f8fafc">
            <span class="label" style="color:#1e293b;font-weight:600">Main d'œuvre</span>
            <span class="value" style="color:#dc2626">${pdfFmt(totalMdo)} (${totalSorties > 0 ? Math.round(totalMdo / totalSorties * 100) : 0}%)</span>
          </div>
          <div class="pdf-total-row" style="background:#fff1f2">
            <span class="label" style="color:#dc2626;font-weight:700">Total dépenses</span>
            <span class="value" style="color:#dc2626;font-size:15px">${pdfFmt(totalSorties)}</span>
          </div>
          <div class="pdf-total-row" style="background:#f0fdf4">
            <span class="label" style="color:#16a34a;font-weight:700">Total entrées</span>
            <span class="value" style="color:#16a34a;font-size:15px">${pdfFmt(totalEntrees)}</span>
          </div>
          <div class="pdf-total-row highlight">
            <span class="label">${resultat >= 0 ? '✓ Bénéfice net' : '✗ Perte nette'}</span>
            <span class="value">${pdfFmt(Math.abs(resultat))}</span>
          </div>
        </div>
      </div>

      <div class="pdf-signatures">
        <div class="pdf-signature-box">
          <div class="pdf-signature-label">Responsable chantier</div>
          <div class="pdf-signature-name">Signature & Cachet</div>
          <div style="margin-top:40px;border-top:1px solid #e2e8f0;padding-top:8px;font-size:11px;color:#94a3b8">${company.name}</div>
        </div>
        <div class="pdf-signature-box">
          <div class="pdf-signature-label">Validation client</div>
          <div class="pdf-signature-name">Lu et approuvé</div>
          <div style="margin-top:40px;border-top:1px solid #e2e8f0;padding-top:8px;font-size:11px;color:#94a3b8">${chantier.client_nom || '–'}</div>
        </div>
      </div>
    </div>
    ${buildPdfFooter(company)}
  </div>
</body>
</html>`;

  openPdfWindow(html, `Rapport_${chantier.nom.replace(/\s+/g, '_')}`);
}
window.printChantierPDF = printChantierPDF;

// ===== FENÊTRE PDF =====
function openPdfWindow(html, filename) {
  const win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
  if (!win) { toast('Autorisez les pop-ups pour imprimer', 'warning'); return; }
  win.document.open();
  win.document.write(html);
  win.document.close();
  setTimeout(() => {
    win.focus();
    win.print();
  }, 800);
}
