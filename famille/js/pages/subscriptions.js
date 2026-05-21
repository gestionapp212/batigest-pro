// =====================================================
// Family Cash Flow — Subscriptions Page
// =====================================================

let subsData = [];

async function loadSubscriptionsPage() {
  AppState.currentPage = 'subscriptions';
  renderSubscriptionsLayout(); // rendu rapide skeleton
  await refreshSubsData();
}

async function refreshSubsData() {
  if (DB.isDemoMode()) {
    subsData = [
      { id:'s1', name:'Netflix',          amount:99,   frequency:'monthly',   next_date:'2025-04-20', active:true,  icon:'🎬', color:'#E50914' },
      { id:'s2', name:'Spotify',          amount:59,   frequency:'monthly',   next_date:'2025-04-18', active:true,  icon:'🎵', color:'#1DB954' },
      { id:'s3', name:'Eau & Électricité', amount:580,  frequency:'monthly',   next_date:'2025-04-25', active:true,  icon:'⚡', color:'#F59E0B' },
      { id:'s4', name:'Internet Fibre',   amount:299,  frequency:'monthly',   next_date:'2025-04-22', active:true,  icon:'📶', color:'#2563EB' },
      { id:'s5', name:'Assurance Auto',   amount:1200, frequency:'quarterly', next_date:'2025-04-28', active:true,  icon:'🚗', color:'#10B981' },
      { id:'s6', name:'Gym',              amount:300,  frequency:'monthly',   next_date:'2025-05-01', active:true,  icon:'💪', color:'#8B5CF6' },
      { id:'s7', name:'Amazon Prime',     amount:49,   frequency:'yearly',    next_date:'2025-11-15', active:false, icon:'📦', color:'#FF9900' },
    ];
  } else {
    try {
      subsData = await DB.getAbonnements(AppState.user?.id);
    } catch (err) {
      console.error('Erreur abonnements:', err);
      showToast('Erreur chargement abonnements', 'error');
      subsData = [];
    }
  }
  renderSubscriptionsLayout();
}

function renderSubscriptionsLayout() {
  const activeSubs = subsData.filter(s => s.active);
  const inactiveSubs = subsData.filter(s => !s.active);

  const totalMonthly = activeSubs.reduce((sum, s) => {
    return sum + calcMonthlyEquivalent(s.amount, s.frequency);
  }, 0);

  const totalAnnual = totalMonthly * 12;

  const urgentSubs = activeSubs.filter(s => daysUntil(s.next_date) <= 7);

  const html = `
  <div class="fade-in">

    <!-- Stats -->
    <div class="kpi-grid" style="margin-bottom:24px;">
      <div class="kpi-card blue">
        <div class="kpi-header">
          <div class="kpi-icon"><i class="fas fa-repeat"></i></div>
        </div>
        <div class="kpi-value">${activeSubs.length}</div>
        <div class="kpi-label">Abonnements actifs</div>
      </div>
      <div class="kpi-card amber">
        <div class="kpi-header">
          <div class="kpi-icon"><i class="fas fa-calendar-day"></i></div>
        </div>
        <div class="kpi-value">${formatCurrencyShort(totalMonthly)}</div>
        <div class="kpi-label">Coût mensuel total</div>
      </div>
      <div class="kpi-card red">
        <div class="kpi-header">
          <div class="kpi-icon"><i class="fas fa-calendar"></i></div>
        </div>
        <div class="kpi-value">${formatCurrencyShort(totalAnnual)}</div>
        <div class="kpi-label">Coût annuel total</div>
      </div>
      <div class="kpi-card ${urgentSubs.length > 0 ? 'red' : 'green'}">
        <div class="kpi-header">
          <div class="kpi-icon"><i class="fas fa-bell"></i></div>
        </div>
        <div class="kpi-value">${urgentSubs.length}</div>
        <div class="kpi-label">Renouvellements ≤ 7j</div>
      </div>
    </div>

    ${urgentSubs.length > 0 ? `
    <div class="alert alert-warning" style="margin-bottom:16px;">
      <span class="alert-icon">🔔</span>
      <div>
        <strong>Renouvellements proches :</strong>
        ${urgentSubs.map(s => `${s.name} (${formatDate(s.next_date)}, J-${Math.max(0,daysUntil(s.next_date))})`).join(' · ')}
      </div>
    </div>` : ''}

    <div class="grid-2">

      <!-- Active subscriptions -->
      <div>
        <div class="section-header">
          <div class="section-title">Abonnements actifs (${activeSubs.length})</div>
          <button class="btn btn-primary btn-sm" onclick="openSubModal()">
            <i class="fas fa-plus"></i> Ajouter
          </button>
        </div>

        ${activeSubs.length > 0 ? activeSubs.map(s => renderSubCard(s)).join('') : `
        <div class="empty-state">
          <div class="empty-icon">📱</div>
          <div class="empty-title">Aucun abonnement actif</div>
          <button class="btn btn-primary" onclick="openSubModal()">
            <i class="fas fa-plus"></i> Ajouter un abonnement
          </button>
        </div>`}

        ${inactiveSubs.length > 0 ? `
        <div class="section-header" style="margin-top:20px;">
          <div class="section-title" style="color:var(--text-muted);">Inactifs (${inactiveSubs.length})</div>
        </div>
        ${inactiveSubs.map(s => renderSubCard(s, true)).join('')}` : ''}
      </div>

      <!-- Summary & chart -->
      <div>
        <div class="card" style="margin-bottom:16px;">
          <div class="card-header">
            <div class="card-title"><i class="fas fa-chart-pie" style="color:var(--accent);"></i> Répartition mensuelle</div>
          </div>
          <div class="chart-wrapper" style="height:220px;">
            <canvas id="subs-chart"></canvas>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title"><i class="fas fa-calendar-check" style="color:var(--primary);"></i> Calendrier des renouvellements</div>
          </div>
          <div style="max-height:300px;overflow-y:auto;">
            ${[...activeSubs].sort((a,b) => new Date(a.next_date)-new Date(b.next_date)).map(s => {
              const days = daysUntil(s.next_date);
              const urgent = days <= 7;
              return `
              <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-light);">
                <div style="width:36px;height:36px;border-radius:var(--radius);background:${s.color}22;
                            display:flex;align-items:center;justify-content:center;font-size:18px;">${s.icon || '📱'}</div>
                <div style="flex:1;">
                  <div style="font-size:13px;font-weight:600;">${s.name}</div>
                  <div style="font-size:11px;color:var(--text-muted);">${formatDate(s.next_date)}</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:13px;font-weight:700;">${formatCurrency(s.amount)}</div>
                  <span class="badge ${urgent ? 'badge-red' : days <= 30 ? 'badge-amber' : 'badge-gray'}" style="font-size:10px;">
                    ${days <= 0 ? "Aujourd'hui" : `J-${days}`}
                  </span>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- Add modal -->
  <div class="modal-overlay" id="sub-modal">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Ajouter un abonnement</h3>
        <button class="modal-close" onclick="closeSubModal()"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <form id="sub-form" onsubmit="saveSub(event)">
          <div class="form-group">
            <label class="form-label">Nom <span class="required">*</span></label>
            <input type="text" id="sub-name" class="form-input" placeholder="Ex: Netflix, Eau..." required>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Montant <span class="required">*</span></label>
              <input type="number" id="sub-amount" class="form-input" placeholder="0.00" min="0" step="0.01" required>
            </div>
            <div class="form-group">
              <label class="form-label">Fréquence</label>
              <select id="sub-freq" class="form-select">
                ${FREQUENCIES.map(f => `<option value="${f.value}">${f.label}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Prochaine date <span class="required">*</span></label>
            <input type="date" id="sub-next" class="form-input" required>
          </div>
          <div class="modal-footer" style="padding:0;margin-top:8px;">
            <button type="button" class="btn btn-ghost" onclick="closeSubModal()">Annuler</button>
            <button type="submit" class="btn btn-primary" id="sub-save-btn">
              <i class="fas fa-check"></i> Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>`;

  renderLayout(html, 'Abonnements récurrents', `${activeSubs.length} actif(s) · ${formatCurrency(totalMonthly)}/mois`);

  setTimeout(() => renderSubsChart(activeSubs, totalMonthly), 100);
}

function renderSubCard(s, inactive = false) {
  const days = daysUntil(s.next_date);
  const monthly = calcMonthlyEquivalent(s.amount, s.frequency);
  const freq = getFrequencyInfo(s.frequency);

  return `
  <div class="sub-card ${inactive ? 'hidden-sub' : ''}" style="margin-bottom:10px;${inactive ? 'opacity:0.6;' : ''}">
    <div style="width:42px;height:42px;border-radius:var(--radius);background:${s.color || 'var(--primary)'}22;
                display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">
      ${s.icon || '📱'}
    </div>
    <div class="sub-info">
      <div class="sub-name">${s.name}</div>
      <div class="sub-meta">
        ${freq.label} · Prochain: ${formatDate(s.next_date)}
        ${!inactive ? `· Équivalent: ${formatCurrency(monthly)}/mois` : ''}
      </div>
    </div>
    <div style="text-align:right;flex-shrink:0;">
      <div style="font-weight:700;font-size:14px;">${formatCurrency(s.amount)}</div>
      ${!inactive ? `
      <span class="badge ${days <= 0 ? 'badge-red' : days <= 7 ? 'badge-red' : days <= 30 ? 'badge-amber' : 'badge-green'}" style="font-size:10px;">
        ${days <= 0 ? "Aujourd'hui" : `J-${days}`}
      </span>` : '<span class="badge badge-gray" style="font-size:10px;">Inactif</span>'}
    </div>
    <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">
      <button class="btn btn-ghost btn-sm btn-icon" onclick="toggleSub('${s.id}')" data-tooltip="${s.active ? 'Désactiver' : 'Activer'}">
        <i class="fas ${s.active ? 'fa-toggle-on' : 'fa-toggle-off'}" style="color:${s.active ? 'var(--secondary)' : 'var(--text-muted)'};"></i>
      </button>
      <button class="btn btn-ghost btn-sm btn-icon" onclick="deleteSub('${s.id}')" data-tooltip="Supprimer">
        <i class="fas fa-trash-alt" style="color:var(--danger);font-size:11px;"></i>
      </button>
    </div>
  </div>`;
}

function renderSubsChart(activeSubs, total) {
  const canvas = el('subs-chart');
  if (!canvas || !activeSubs.length) return;
  const ctx = canvas.getContext('2d');
  const isDark = AppState.theme === 'dark';

  const colors = ['#2563EB','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16'];
  const data = activeSubs.map((s,i) => ({
    label: s.name,
    amount: calcMonthlyEquivalent(s.amount, s.frequency),
    color: s.color || colors[i % colors.length]
  }));

  if (canvas._chart) canvas._chart.destroy();
  canvas._chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.label),
      datasets: [{
        data: data.map(d => d.amount),
        backgroundColor: data.map(d => d.color),
        borderWidth: 2,
        borderColor: isDark ? '#1E293B' : '#FFFFFF',
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: isDark?'#94A3B8':'#64748B', font:{size:11}, boxWidth:10 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${formatCurrency(ctx.raw)}/mois` } }
      },
      cutout: '60%'
    }
  });
}

function openSubModal() {
  el('sub-modal')?.classList.add('open');
  // Set default next date to next month 1st
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  if (el('sub-next')) el('sub-next').value = isoDate(d);
}

function closeSubModal() {
  el('sub-modal')?.classList.remove('open');
  el('sub-form')?.reset();
}

async function saveSub(e) {
  e.preventDefault();
  const name   = el('sub-name')?.value;
  const amount = parseFloat(el('sub-amount')?.value);
  const freq   = el('sub-freq')?.value;
  const next   = el('sub-next')?.value;
  const btn    = el('sub-save-btn');

  if (!name || !amount || !next) { showToast('Remplissez tous les champs', 'error'); return; }
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sauvegarde...'; }

  if (DB.isDemoMode()) {
    subsData.unshift({ id:'s'+Date.now(), name, amount, frequency:freq, next_date:next, active:true, icon:'📱', color:'#2563EB' });
    showToast(`Abonnement "${name}" ajouté ! (démo)`, 'info');
    closeSubModal(); renderSubscriptionsLayout();
  } else {
    try {
      const saved = await DB.addAbonnement({ name, amount, frequency: freq, next_date: next, active: true });
      subsData.unshift(saved);
      showToast(`✅ Abonnement "${name}" enregistré !`, 'success');
      closeSubModal(); renderSubscriptionsLayout();
    } catch (err) {
      showToast(`Erreur : ${err.message}`, 'error');
    }
  }
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Enregistrer'; }
}

async function toggleSub(id) {
  const s = subsData.find(s => s.id === id);
  if (!s) return;
  const newActive = !s.active;
  if (DB.isDemoMode()) {
    s.active = newActive; renderSubscriptionsLayout(); return;
  }
  try {
    await DB.updateAbonnement(id, { active: newActive });
    s.active = newActive; renderSubscriptionsLayout();
  } catch (err) { showToast(`Erreur : ${err.message}`, 'error'); }
}

async function deleteSub(id) {
  if (!confirm('Supprimer cet abonnement ?')) return;
  if (DB.isDemoMode()) {
    subsData = subsData.filter(s => s.id !== id);
    showToast('Abonnement supprimé', 'info'); renderSubscriptionsLayout(); return;
  }
  try {
    await DB.deleteAbonnement(id);
    subsData = subsData.filter(s => s.id !== id);
    showToast('Abonnement supprimé', 'info'); renderSubscriptionsLayout();
  } catch (err) { showToast(`Erreur suppression : ${err.message}`, 'error'); }
}
