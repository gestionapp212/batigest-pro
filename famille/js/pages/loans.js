// =====================================================
// Family Cash Flow — Loans / Credits Page
// =====================================================

let loansData = [];

async function loadLoansPage() {
  AppState.currentPage = 'loans';
  renderLoansLayout(); // rendu rapide
  await refreshLoansData();
}

async function refreshLoansData() {
  if (DB.isDemoMode()) {
    loansData = [
      { id:'l1', name:'Crédit Voiture Toyota', total_amount:80000,  monthly_payment:2200, start_date:'2023-01-01', months_total:48,  status:'active',    notes:'Banque CIH' },
      { id:'l2', name:'Crédit Immobilier',     total_amount:500000, monthly_payment:5500, start_date:'2022-06-01', months_total:240, status:'active',    notes:'Crédit du Maroc' },
      { id:'l3', name:'Prêt personnel',        total_amount:15000,  monthly_payment:1500, start_date:'2024-06-01', months_total:12,  status:'completed', notes:'Famille' },
    ];
  } else {
    try {
      loansData = await DB.getPrets(AppState.user?.id);
    } catch (err) {
      console.error('Erreur prêts:', err);
      showToast('Erreur chargement des crédits', 'error');
      loansData = [];
    }
  }
  renderLoansLayout();
}

function renderLoansLayout() {
  const activeLoans = loansData.filter(l => l.status === 'active');
  const completedLoans = loansData.filter(l => l.status === 'completed');

  const totalMonthly = activeLoans.reduce((s, l) => s + l.monthly_payment, 0);
  const totalDebt    = activeLoans.reduce((s, l) => {
    const elapsed   = monthsElapsed(l.start_date);
    const remaining = Math.max(0, l.months_total - elapsed);
    return s + (remaining * l.monthly_payment);
  }, 0);

  const html = `
  <div class="fade-in">

    <!-- KPIs -->
    <div class="kpi-grid" style="margin-bottom:24px;">
      <div class="kpi-card red">
        <div class="kpi-header">
          <div class="kpi-icon"><i class="fas fa-hand-holding-dollar"></i></div>
        </div>
        <div class="kpi-value">${activeLoans.length}</div>
        <div class="kpi-label">Crédits actifs</div>
      </div>
      <div class="kpi-card amber">
        <div class="kpi-header">
          <div class="kpi-icon"><i class="fas fa-calendar-day"></i></div>
        </div>
        <div class="kpi-value">${formatCurrencyShort(totalMonthly)}</div>
        <div class="kpi-label">Mensualités totales</div>
      </div>
      <div class="kpi-card blue">
        <div class="kpi-header">
          <div class="kpi-icon"><i class="fas fa-sack-dollar"></i></div>
        </div>
        <div class="kpi-value">${formatCurrencyShort(totalDebt)}</div>
        <div class="kpi-label">Reste à rembourser</div>
      </div>
      <div class="kpi-card green">
        <div class="kpi-header">
          <div class="kpi-icon"><i class="fas fa-check-circle"></i></div>
        </div>
        <div class="kpi-value">${completedLoans.length}</div>
        <div class="kpi-label">Crédits soldés</div>
      </div>
    </div>

    <!-- Active Loans -->
    <div class="section-header">
      <div class="section-title">Crédits en cours</div>
      <button class="btn btn-primary btn-sm" onclick="openLoanModal()">
        <i class="fas fa-plus"></i> Ajouter un crédit
      </button>
    </div>

    ${activeLoans.length > 0 ? `
    <div style="display:flex;flex-direction:column;gap:16px;margin-bottom:24px;">
      ${activeLoans.map(l => renderLoanCard(l)).join('')}
    </div>` : `
    <div class="empty-state card" style="margin-bottom:24px;">
      <div class="empty-icon">🏦</div>
      <div class="empty-title">Aucun crédit actif</div>
      <div class="empty-desc">Ajoutez vos crédits pour suivre vos remboursements</div>
      <button class="btn btn-primary" onclick="openLoanModal()">
        <i class="fas fa-plus"></i> Ajouter un crédit
      </button>
    </div>`}

    ${completedLoans.length > 0 ? `
    <div class="section-header">
      <div class="section-title" style="color:var(--text-muted);">Crédits soldés (${completedLoans.length})</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px;">
      ${completedLoans.map(l => renderLoanCard(l, true)).join('')}
    </div>` : ''}

    <!-- Chart -->
    <div class="card" style="margin-top:24px;">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-chart-bar" style="color:var(--primary);"></i> Mensualités par crédit</div>
      </div>
      <div class="chart-wrapper" style="height:220px;">
        <canvas id="loans-chart"></canvas>
      </div>
    </div>

  </div>

  <!-- Modal -->
  <div class="modal-overlay" id="loan-modal">
    <div class="modal" style="max-width:560px;">
      <div class="modal-header">
        <h3 class="modal-title">Ajouter un crédit</h3>
        <button class="modal-close" onclick="closeLoanModal()"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <form id="loan-form" onsubmit="saveLoan(event)">
          <div class="form-group">
            <label class="form-label">Nom / Objet du crédit <span class="required">*</span></label>
            <input type="text" id="loan-name" class="form-input" placeholder="Ex: Crédit Voiture" required>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Montant total <span class="required">*</span></label>
              <input type="number" id="loan-total" class="form-input" placeholder="0.00" min="0" step="0.01" required>
            </div>
            <div class="form-group">
              <label class="form-label">Mensualité <span class="required">*</span></label>
              <input type="number" id="loan-monthly" class="form-input" placeholder="0.00" min="0" step="0.01" required>
            </div>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Date de début <span class="required">*</span></label>
              <input type="date" id="loan-start" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label">Durée (mois) <span class="required">*</span></label>
              <input type="number" id="loan-months" class="form-input" placeholder="Ex: 48" min="1" required>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Notes</label>
            <input type="text" id="loan-notes" class="form-input" placeholder="Ex: Banque CIH, taux 5%">
          </div>
          <div id="loan-preview" style="background:var(--primary-bg);border-radius:var(--radius);padding:12px;margin-top:4px;font-size:13px;display:none;">
            <strong>Aperçu :</strong>
            <span id="loan-preview-text"></span>
          </div>
          <div class="modal-footer" style="padding:0;margin-top:12px;">
            <button type="button" class="btn btn-ghost" onclick="closeLoanModal()">Annuler</button>
            <button type="submit" class="btn btn-primary" id="loan-save-btn">
              <i class="fas fa-check"></i> Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>`;

  renderLayout(html, 'Crédits & Dettes', `${activeLoans.length} actif(s) · ${formatCurrency(totalMonthly)}/mois`);

  setTimeout(() => renderLoansChart(activeLoans), 100);

  // Loan preview calculator
  ['loan-total','loan-monthly','loan-months'].forEach(id => {
    el(id)?.addEventListener('input', updateLoanPreview);
  });
}

function monthsElapsed(startDate) {
  const start = new Date(startDate);
  const now = new Date();
  return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
}

function renderLoanCard(l, completed = false) {
  const elapsed   = monthsElapsed(l.start_date);
  const remaining = Math.max(0, l.months_total - elapsed);
  const progress  = pct(Math.min(elapsed, l.months_total), l.months_total);
  const paid      = Math.min(elapsed, l.months_total) * l.monthly_payment;
  const leftAmt   = remaining * l.monthly_payment;

  return `
  <div class="card" style="${completed ? 'opacity:0.75;' : ''}">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
      <div>
        <h4 style="font-size:15px;font-weight:700;margin-bottom:4px;">${l.name}</h4>
        <div style="font-size:12px;color:var(--text-muted);">
          ${l.notes || ''} · Début: ${formatDate(l.start_date)} · ${l.months_total} mois
        </div>
      </div>
      <div style="display:flex;gap:6px;align-items:center;">
        <span class="badge ${completed ? 'badge-blue' : 'badge-green'}">${completed ? 'Soldé ✅' : 'En cours'}</span>
        ${!completed ? `<button class="btn btn-ghost btn-sm btn-icon" onclick="markLoanComplete('${l.id}')" data-tooltip="Marquer comme soldé">
          <i class="fas fa-check" style="color:var(--secondary);font-size:11px;"></i>
        </button>` : ''}
        <button class="btn btn-ghost btn-sm btn-icon" onclick="deleteLoan('${l.id}')" data-tooltip="Supprimer">
          <i class="fas fa-trash-alt" style="color:var(--danger);font-size:11px;"></i>
        </button>
      </div>
    </div>

    <!-- Progress -->
    <div style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;">
        <span style="color:var(--text-muted);">Progression du remboursement</span>
        <span style="font-weight:700;color:${progress >= 75 ? 'var(--secondary)' : 'var(--primary)'};">${progress}%</span>
      </div>
      <div class="progress-bar" style="height:10px;">
        <div class="progress-fill ${progress >= 75 ? 'green' : progress >= 40 ? 'blue' : 'amber'}"
             style="width:${progress}%;"></div>
      </div>
    </div>

    <!-- Stats grid -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
      <div style="text-align:center;padding:10px;background:var(--bg-hover);border-radius:var(--radius);">
        <div style="font-size:13px;font-weight:700;color:var(--text);">${formatCurrencyShort(l.total_amount)}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Montant total</div>
      </div>
      <div style="text-align:center;padding:10px;background:var(--secondary-bg);border-radius:var(--radius);">
        <div style="font-size:13px;font-weight:700;color:var(--secondary);">${formatCurrencyShort(paid)}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Remboursé</div>
      </div>
      <div style="text-align:center;padding:10px;background:var(--danger-bg);border-radius:var(--radius);">
        <div style="font-size:13px;font-weight:700;color:var(--danger);">${formatCurrencyShort(leftAmt)}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Restant</div>
      </div>
      <div style="text-align:center;padding:10px;background:var(--accent-bg);border-radius:var(--radius);">
        <div style="font-size:13px;font-weight:700;color:var(--accent);">${remaining}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Mois restants</div>
      </div>
    </div>

    <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-light);display:flex;justify-content:space-between;font-size:13px;">
      <span style="color:var(--text-muted);">Mensualité</span>
      <strong style="color:var(--primary);">${formatCurrency(l.monthly_payment)} / mois</strong>
    </div>
  </div>`;
}

function renderLoansChart(loans) {
  const canvas = el('loans-chart');
  if (!canvas || !loans.length) return;
  const ctx = canvas.getContext('2d');
  const isDark = AppState.theme === 'dark';
  const textColor = isDark ? '#94A3B8' : '#64748B';

  if (canvas._chart) canvas._chart.destroy();
  canvas._chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: loans.map(l => l.name.length > 20 ? l.name.slice(0,20)+'…' : l.name),
      datasets: [{
        label: 'Mensualité',
        data: loans.map(l => l.monthly_payment),
        backgroundColor: 'rgba(37,99,235,0.8)',
        borderRadius: 6,
      },{
        label: 'Montant restant',
        data: loans.map(l => {
          const r = Math.max(0, l.months_total - monthsElapsed(l.start_date));
          return r * l.monthly_payment;
        }),
        backgroundColor: 'rgba(239,68,68,0.5)',
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position:'top', labels:{ color:textColor, font:{size:11}, boxWidth:10 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` } }
      },
      scales: {
        x: { grid:{display:false}, ticks:{color:textColor, font:{size:11}} },
        y: { grid:{color: isDark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)'},
             ticks:{color:textColor, callback: v=>formatCurrencyShort(v), font:{size:11}} }
      }
    }
  });
}

function updateLoanPreview() {
  const total   = parseFloat(el('loan-total')?.value);
  const monthly = parseFloat(el('loan-monthly')?.value);
  const months  = parseInt(el('loan-months')?.value);

  const preview = el('loan-preview');
  const text    = el('loan-preview-text');

  if (total && monthly && months && preview && text) {
    const totalPaid = monthly * months;
    const interest  = totalPaid - total;
    preview.style.display = 'block';
    text.textContent = ` Total remboursé: ${formatCurrency(totalPaid)} · Intérêts: ${formatCurrency(Math.max(0,interest))} · Fin: ${formatDate(addMonths(isoDate(), months))}`;
  }
}

function openLoanModal() {
  el('loan-modal')?.classList.add('open');
  if (el('loan-start')) el('loan-start').value = isoDate();
}

function closeLoanModal() {
  el('loan-modal')?.classList.remove('open');
  el('loan-form')?.reset();
  const p = el('loan-preview');
  if (p) p.style.display = 'none';
}

async function saveLoan(e) {
  e.preventDefault();
  const name    = el('loan-name')?.value;
  const total   = parseFloat(el('loan-total')?.value);
  const monthly = parseFloat(el('loan-monthly')?.value);
  const start   = el('loan-start')?.value;
  const months  = parseInt(el('loan-months')?.value);
  const notes   = el('loan-notes')?.value;
  const btn     = el('loan-save-btn');

  if (!name || !total || !monthly || !start || !months) { showToast('Remplissez tous les champs', 'error'); return; }
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sauvegarde...'; }

  if (DB.isDemoMode()) {
    loansData.unshift({ id:'l'+Date.now(), name, total_amount:total, monthly_payment:monthly, start_date:start, months_total:months, status:'active', notes });
    showToast(`Crédit "${name}" ajouté ! (démo)`, 'info');
    closeLoanModal(); renderLoansLayout();
  } else {
    try {
      const saved = await DB.addPret({ name, total_amount: total, monthly_payment: monthly, start_date: start, months_total: months, notes, status: 'active' });
      loansData.unshift(saved);
      showToast(`✅ Crédit "${name}" enregistré !`, 'success');
      closeLoanModal(); renderLoansLayout();
    } catch (err) {
      showToast(`Erreur : ${err.message}`, 'error');
    }
  }
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Enregistrer'; }
}

async function markLoanComplete(id) {
  const l = loansData.find(l => l.id === id);
  if (!l) return;
  if (DB.isDemoMode()) {
    l.status = 'completed'; showToast('Crédit soldé ✅', 'success'); renderLoansLayout(); return;
  }
  try {
    await DB.updatePret(id, { status: 'completed' });
    l.status = 'completed'; showToast('Crédit marqué comme soldé ✅', 'success'); renderLoansLayout();
  } catch (err) { showToast(`Erreur : ${err.message}`, 'error'); }
}

async function deleteLoan(id) {
  if (!confirm('Supprimer ce crédit ?')) return;
  if (DB.isDemoMode()) {
    loansData = loansData.filter(l => l.id !== id);
    showToast('Crédit supprimé', 'info'); renderLoansLayout(); return;
  }
  try {
    await DB.deletePret(id);
    loansData = loansData.filter(l => l.id !== id);
    showToast('Crédit supprimé', 'info'); renderLoansLayout();
  } catch (err) { showToast(`Erreur suppression : ${err.message}`, 'error'); }
}
