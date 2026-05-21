/* ============================================================
   GestionApp 212 — Utils globaux
   Fonctions partagées par tous les modules
   ============================================================ */

/* ── ESCAPE HTML ─────────────────────────────────────────── */
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
// Alias escHtml → esc (utilisé dans devis.js, factures.js)
const escHtml = esc;

/* ── DATES ───────────────────────────────────────────────── */
function today() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(d) {
  if (!d) return '—';
  const s = String(d).split('T')[0];
  const parts = s.split('-');
  if (parts.length !== 3) return d;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatDateTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('fr-FR') + ' ' + dt.toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'});
}

function daysFromNow(dateStr) {
  if (!dateStr) return null;
  return Math.floor((new Date(dateStr) - new Date()) / 86400000);
}

/* ── NOMBRES / MONNAIE ───────────────────────────────────── */
function formatMAD(n) {
  const val = parseFloat(n) || 0;
  if (val >= 1000000) return (val/1000000).toFixed(1).replace(/\.0$/,'') + 'M MAD';
  if (val >= 1000) return (val/1000).toFixed(1).replace(/\.0$/,'') + 'k MAD';
  return new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 0 }).format(val) + ' MAD';
}

function formatMADFull(n) {
  return new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(n)||0) + ' MAD';
}

function formatNum(n) {
  return new Intl.NumberFormat('fr-FR').format(parseFloat(n)||0);
}

/* ── CALCULS TVA / TTC ───────────────────────────────────── */
/** Calcule le TTC depuis HT + taux TVA (ex: tva=20 pour 20%) */
function calcTTC(ht, tva) {
  return (parseFloat(ht) || 0) * (1 + (parseFloat(tva) || 0) / 100);
}
/** Calcule le montant TVA seul (utilisé dans devis.js updateDevisTotals) */
function calcTVA(ht, tva) {
  return (parseFloat(ht) || 0) * ((parseFloat(tva) || 0) / 100);
}
/** Alias calcTVAAmount = calcTVA */
const calcTVAAmount = calcTVA;
/** Calcule le HT depuis TTC */
function calcHT(ttc, tva) {
  const t = parseFloat(tva) || 0;
  return t === 0 ? (parseFloat(ttc) || 0) : (parseFloat(ttc) || 0) / (1 + t / 100);
}

/* ── DONNÉES SOCIÉTÉ ─────────────────────────────────────── */
function getCompanyData(key) {
  return App.data[key] || [];
}

/* ── TOAST NOTIFICATIONS ─────────────────────────────────── */
function showToast(msg, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = {
    success: 'check-circle',
    error:   'times-circle',
    warning: 'exclamation-triangle',
    info:    'info-circle'
  };
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<i class="fas fa-${icons[type]||'info-circle'}"></i><span>${msg}</span>`;
  t.onclick = () => t.remove();
  container.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(110%)'; t.style.transition='.3s ease'; setTimeout(()=>t.remove(),300); }, duration);
}

/* ── MODALES ─────────────────────────────────────────────── */
function showModal(html) {
  let m = document.getElementById('dynamic-modal');
  if (!m) { m = document.createElement('div'); m.id = 'dynamic-modal'; document.body.appendChild(m); }
  m.innerHTML = html;
  // Fermer avec Escape
  const handler = (e) => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', handler); } };
  document.addEventListener('keydown', handler);
}

function closeModal(id) {
  if (id) {
    // Fermer une modale spécifique par ID (style="display:none")
    const m = document.getElementById(id);
    if (m) { m.style.display = 'none'; return; }
  }
  // Fermer la modale dynamique par défaut
  const m = document.getElementById('dynamic-modal');
  if (m) m.innerHTML = '';
}

/* ── LOADER ──────────────────────────────────────────────── */
function showFullscreenLoader(txt = 'Chargement…') {
  const l = document.getElementById('fullscreen-loader');
  if (!l) return;
  l.style.display = 'flex';
  const t = document.getElementById('loader-text');
  if (t) t.textContent = txt;
}

function hideFullscreenLoader() {
  const l = document.getElementById('fullscreen-loader');
  if (l) l.style.display = 'none';
}

/* ── ERREUR LOGIN ────────────────────────────────────────── */
function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'flex';
  const msgEl = document.getElementById(id + '-msg');
  if (msgEl) msgEl.textContent = msg;
  else el.textContent = msg;
}

/* ── NOTIFICATIONS ───────────────────────────────────────── */
function toggleNotifications() {
  const p = document.getElementById('notif-panel');
  if (!p) return;
  p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

function markAllRead() {
  if (App.notifications) App.notifications.forEach(n => n.read = true);
  updateNotifBadge();
  renderNotifications();
}

function updateNotifBadge() {
  const unread = (App.notifications || []).filter(n => !n.read).length;
  const b = document.getElementById('notif-badge');
  if (b) { b.textContent = unread; b.style.display = unread > 0 ? 'flex' : 'none'; }
}

function renderNotifications() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  const notifs = App.notifications || [];
  if (notifs.length === 0) {
    list.innerHTML = '<div style="padding:20px;text-align:center;font-size:12px;color:#a0aec0"><i class="fas fa-bell-slash" style="display:block;font-size:24px;margin-bottom:8px"></i>Aucune notification</div>';
    return;
  }
  const iconBg = { warning:'#feebc8', danger:'#fed7d7', info:'#bee3f8', success:'#c6f6d5' };
  const iconColor = { warning:'#9c4221', danger:'#9b2c2c', info:'#2a4a7f', success:'#276749' };
  list.innerHTML = notifs.slice(0,10).map(n => `
    <div class="notif-item ${n.read?'':'unread'}" onclick="navigate('${n.module||'dashboard'}');toggleNotifications()">
      <div class="notif-icon" style="background:${iconBg[n.type]||'#e2e8f0'};color:${iconColor[n.type]||'#4a5568'}">
        <i class="fas fa-${n.icon||'bell'}"></i>
      </div>
      <div class="notif-body">
        <div class="notif-title">${esc(n.title)}</div>
        <div class="notif-text">${esc(n.text)}</div>
        <div class="notif-time">${n.time||''}</div>
      </div>
    </div>`).join('');
}

/* ── BADGES STATUTS ──────────────────────────────────────── */
const STATUS_MAP = {
  // Factures / devis
  actif:               ['badge-green',  '● Actif'],
  inactif:             ['badge-gray',   '● Inactif'],
  brouillon:           ['badge-gray',   'Brouillon'],
  envoye:              ['badge-blue',   'Envoyé'],
  accepte:             ['badge-green',  '✓ Accepté'],
  refuse:              ['badge-red',    '✗ Refusé'],
  annule:              ['badge-red',    'Annulé'],
  // Factures paiement
  paye:                ['badge-green',  '✓ Payé'],
  partiellement_paye:  ['badge-orange', '⬤ Partiel'],
  impaye:              ['badge-red',    '✗ Impayé'],
  avoir:               ['badge-purple', 'Avoir'],
  // Chantiers
  en_cours:            ['badge-blue',   '▶ En cours'],
  en_attente:          ['badge-orange', '⏸ En attente'],
  termine:             ['badge-green',  '✓ Terminé'],
  suspendu:            ['badge-gray',   '⏸ Suspendu'],
  // Pipeline
  contact:             ['badge-gray',   'Contact'],
  qualification:       ['badge-blue',   'Qualification'],
  proposition:         ['badge-purple', 'Proposition'],
  negociation:         ['badge-orange', 'Négociation'],
  gagne:               ['badge-green',  '🏆 Gagné'],
  perdu:               ['badge-red',    'Perdu'],
  // Tâches
  todo:                ['badge-gray',   'À faire'],
  'en-cours':          ['badge-orange', '▶ En cours'],
  done:                ['badge-green',  '✓ Terminée'],
  // Réclamations
  ouvert:              ['badge-red',    '! Ouvert'],
  en_cours_sav:        ['badge-orange', 'En cours'],
  resolu:              ['badge-green',  '✓ Résolu'],
  ferme:               ['badge-gray',   'Fermé'],
};

function statusBadge(statut) {
  if (!statut) return '<span class="badge badge-gray">—</span>';
  const [cls, label] = STATUS_MAP[statut] || ['badge-gray', statut];
  return `<span class="badge ${cls}">${label}</span>`;
}

/* ── TRUNCATE ────────────────────────────────────────────── */
function truncate(str, n = 40) {
  if (!str) return '';
  return str.length > n ? str.substring(0, n) + '…' : str;
}

/* ── INITIALES ───────────────────────────────────────────── */
function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

/* ── COULEUR AVATAR ──────────────────────────────────────── */
const AVATAR_COLORS = ['#3182ce','#38a169','#dd6b20','#805ad5','#d53f8c','#2c7a7b','#d69e2e','#e53e3e'];
function avatarColor(str) {
  if (!str) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

/* ── DEBOUNCE ────────────────────────────────────────────── */
function debounce(fn, delay = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

/* ── CONFIRM DIALOG ──────────────────────────────────────── */
function confirmDialog(msg, onConfirm, opts = {}) {
  const { title = 'Confirmation', danger = false } = opts;
  showModal(`
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal-box" style="max-width:380px">
        <div class="modal-header">
          <span><i class="fas fa-${danger?'exclamation-triangle':' question-circle'}" style="color:${danger?'#e53e3e':'#3182ce'}"></i> ${esc(title)}</span>
          <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body" style="font-size:14px;color:#4a5568;line-height:1.6">${esc(msg)}</div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
          <button class="btn ${danger?'btn-danger':'btn-primary'}" onclick="closeModal();(${onConfirm.toString()})()">
            ${danger?'<i class="fas fa-trash"></i> Supprimer':'<i class="fas fa-check"></i> Confirmer'}
          </button>
        </div>
      </div>
    </div>`);
}

/**
 * showConfirm — boîte de confirmation (alias raccourci de confirmDialog)
 * @param {string}   msg       Message à afficher
 * @param {Function} onConfirm Callback exécuté après confirmation
 * @param {string}   [type]    'danger' pour bouton rouge, autre pour bleu
 */
function showConfirm(msg, onConfirm, type = '') {
  const danger = type === 'danger' || type === 'warning';
  const dynId  = 'dynamic-modal';

  // Sauvegarder le callback dans un slot global temporaire
  window._pendingConfirm = onConfirm;

  let m = document.getElementById(dynId);
  if (!m) { m = document.createElement('div'); m.id = dynId; document.body.appendChild(m); }
  m.innerHTML = `
    <div class="modal-overlay" style="display:flex" onclick="if(event.target===this){closeModal();delete window._pendingConfirm;}">
      <div class="modal-box" style="max-width:400px">
        <div class="modal-header">
          <span style="font-size:15px;font-weight:600">
            <i class="fas fa-${danger ? 'exclamation-triangle' : 'question-circle'}"
               style="color:${danger ? '#e53e3e' : '#3182ce'};margin-right:8px"></i>
            Confirmation
          </span>
          <button class="modal-close" onclick="closeModal();delete window._pendingConfirm;"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body" style="font-size:14px;color:#4a5568;line-height:1.6;padding:20px">
          ${esc(msg)}
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal();delete window._pendingConfirm;">
            <i class="fas fa-times"></i> Annuler
          </button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}"
                  onclick="closeModal();if(window._pendingConfirm){window._pendingConfirm();delete window._pendingConfirm;}">
            ${danger ? '<i class="fas fa-trash"></i> Supprimer' : '<i class="fas fa-check"></i> Confirmer'}
          </button>
        </div>
      </div>
    </div>`;
}

/* ── PAGINATION ──────────────────────────────────────────── */
function buildPagination(current, total, pages, onPageChange) {
  if (pages <= 1) return '';
  let btns = '';
  btns += `<button class="page-btn" onclick="${onPageChange}(${current-1})" ${current===1?'disabled':''}><i class="fas fa-chevron-left"></i></button>`;
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - current) <= 1) {
      btns += `<button class="page-btn ${i===current?'active':''}" onclick="${onPageChange}(${i})">${i}</button>`;
    } else if (Math.abs(i - current) === 2) {
      btns += `<span style="padding:0 4px;color:#a0aec0">…</span>`;
    }
  }
  btns += `<button class="page-btn" onclick="${onPageChange}(${current+1})" ${current===pages?'disabled':''}><i class="fas fa-chevron-right"></i></button>`;
  btns += `<span style="font-size:11px;color:#a0aec0;margin-left:6px">${total} résultat(s)</span>`;
  return `<div class="pagination">${btns}</div>`;
}

/* ── TABLEAU VIDE ────────────────────────────────────────── */
function emptyState(icon = 'inbox', title = 'Aucun résultat', text = '') {
  return `<div class="empty-state"><i class="fas fa-${icon}"></i><h3>${title}</h3>${text?`<p>${text}</p>`:''}</div>`;
}

/* ── TABS NAVIGATION ─────────────────────────────────────── */
/**
 * Bascule vers l'onglet identifié par tabId.
 * Cherche le conteneur d'onglets le plus proche :
 *   1. .modal-body (si l'onglet est dans une modale)
 *   2. .card / .tabs-container / .tabs / .tab-wrapper (onglets de page)
 *   3. document.body en dernier recours (mais limité au parent le plus proche possible)
 */
function switchTab(event, tabId) {
  // Trouver le conteneur d'onglets le plus proche
  const btn = event.target.closest('.tab-btn') || event.target;
  const container = btn.closest('.modal-body')
    || btn.closest('.tabs-container')
    || btn.closest('.card')
    || (function() {
        // Remonter jusqu'à trouver un ancêtre qui contient aussi le tab-content cible
        let el = btn.parentElement;
        while (el && el !== document.body) {
          if (el.querySelector('#' + tabId)) return el;
          el = el.parentElement;
        }
        return document.getElementById('page-content') || document.body;
      })();

  // Désactiver tous les boutons et contenus dans ce conteneur
  container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  // Activer le bouton cliqué et l'onglet cible
  btn.classList.add('active');
  const targetTab = container.querySelector('#' + tabId) || document.getElementById(tabId);
  if (targetTab) targetTab.classList.add('active');
}

/**
 * Active directement un onglet sans événement (ex: depuis JS).
 */
function switchTabDirect(tabId, contextEl) {
  const context = contextEl || document.getElementById('page-content') || document.body;
  context.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  context.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const tab = document.getElementById(tabId);
  if (tab) {
    tab.classList.add('active');
    // Activer aussi le bouton correspondant
    const correspondingBtn = context.querySelector(`[onclick*="${tabId}"]`);
    if (correspondingBtn) correspondingBtn.classList.add('active');
  }
}

/* ── FERMER PANELS AU CLIC DEHORS ───────────────────────── */
document.addEventListener('click', function(e) {
  // Fermer panel notifications
  const notifPanel = document.getElementById('notif-panel');
  const notifWrapper = notifPanel?.closest('.notif-wrapper');
  if (notifPanel && notifWrapper && !notifWrapper.contains(e.target)) {
    notifPanel.style.display = 'none';
  }
});

/* ── GÉNÉRATION NUMÉRO (Devis / Facture) ─────────────────── */
/**
 * Génère un numéro unique du type "D-2026-0042" ou "F-2026-0042"
 * @param {string} prefix   'D' pour devis, 'F' pour facture
 * @param {Array}  existing Tableau existant (App.data.devis / App.data.factures)
 */
function genNumero(prefix, existing = []) {
  const year = new Date().getFullYear();
  // Trouver le numéro le plus élevé existant cette année
  let max = 0;
  (existing || []).forEach(item => {
    const num = item.numero || item.number || '';
    const match = num.match(new RegExp(`^${prefix}-${year}-(\\d+)$`));
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  });
  const seq = String(max + 1).padStart(4, '0');
  return `${prefix}-${year}-${seq}`;
}

/* ── FORMATAGE NUMÉRO POUR AFFICHAGE ──────────────────────── */
function formatNumero(n) {
  if (!n) return '—';
  return String(n);
}

/* ── TÉLÉPHONE / ICE / RC ─────────────────────────────────── */
function formatPhone(p) {
  if (!p) return '—';
  return String(p).replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

/* ── AUDIT LOG LOCAL ─────────────────────────────────────── */
/**
 * Retourne les N derniers logs depuis App.data.auditLogs (ou []).
 * Chaque log est normalisé en { date, user, action, detail, company, module }.
 * @param {number} limit  Nombre max de logs à retourner (défaut 100)
 */
function getAuditLog(limit = 100) {
  const raw = App?.data?.auditLogs || [];
  return raw.slice(0, limit).map(l => ({
    id:      l.id      || '',
    date:    l.created_at
               ? new Date(l.created_at).toLocaleString('fr-FR', { dateStyle:'short', timeStyle:'short' })
               : (l.date || '—'),
    user:    l.user_name || l.userName || l.user || '—',
    action:  l.action   || '—',
    detail:  l.detail   || l.description || '—',
    company: l.company_name || l.companyName || l.company || '—',
    module:  l.module   || '—',
  }));
}

/* ── IMPORT BACKUP ───────────────────────────────────────── */
/**
 * Restaure des données depuis un fichier JSON exporté.
 * Utilisé par l'onglet Sauvegarde dans parametres.js.
 * @param {Event} event  Événement change de l'input file
 */
function importBackup(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const backup = JSON.parse(e.target.result);
      if (!backup || typeof backup !== 'object') throw new Error('Format invalide');

      // Restaurer chaque module présent dans le backup
      const restored = [];
      const modules = backup.modules || Object.keys(backup.data || {});
      modules.forEach(m => {
        const arr = (backup.data || backup)[m];
        if (Array.isArray(arr)) {
          App.data[m] = arr;
          restored.push(m);
        }
      });

      // Rafraîchir le module courant
      if (typeof navigate === 'function' && App.currentModule) {
        navigate(App.currentModule);
      }

      showToast(
        `✅ Restauré : ${restored.join(', ')} (${restored.length} module(s))`,
        'success', 5000
      );
    } catch(err) {
      showToast('❌ Fichier invalide : ' + err.message, 'error', 5000);
    }
    // Réinitialiser l'input pour permettre un nouvel import
    if (event.target) event.target.value = '';
  };
  reader.readAsText(file);
}
