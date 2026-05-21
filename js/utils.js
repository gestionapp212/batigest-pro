// ============================================================
//  Utilitaires globaux
// ============================================================

const Utils = {

  // Format monétaire
  currency(amount, cur = window.FCF_CONFIG.CURRENCY) {
    const n = parseFloat(amount) || 0;
    return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + cur;
  },

  // Format date longue
  dateLong(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  },

  // Format date courte
  dateShort(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR');
  },

  // Nom du mois
  monthName(index) {
    return ['Janvier','Février','Mars','Avril','Mai','Juin',
            'Juillet','Août','Septembre','Octobre','Novembre','Décembre'][index];
  },

  // Mois court
  monthShort(index) {
    return ['Jan','Fév','Mar','Avr','Mai','Jun',
            'Jul','Aoû','Sep','Oct','Nov','Déc'][index];
  },

  // Date YYYY-MM-DD pour input[type=date]
  todayISO() {
    return new Date().toISOString().split('T')[0];
  },

  // Initiales
  initials(name, email) {
    if (name && name.trim()) {
      return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) return email[0].toUpperCase();
    return '?';
  },

  // Couleur aléatoire déterministe par chaîne
  avatarColor(str) {
    const colors = [
      '#6366f1','#8b5cf6','#ec4899','#f59e0b',
      '#10b981','#3b82f6','#ef4444','#14b8a6',
    ];
    let hash = 0;
    for (const c of (str || 'X')) hash = (hash * 31 + c.charCodeAt(0)) & 0xfffffff;
    return colors[hash % colors.length];
  },

  // Toast notification
  toast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const id = 'toast-' + Date.now();
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.id = id;
    toast.className = `toast toast-${type} toast-enter`;
    toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${message}</span><button onclick="Utils.removeToast('${id}')">✕</button>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 400);
    }, duration);
  },

  removeToast(id) {
    const t = document.getElementById(id);
    if (t) { t.classList.add('toast-exit'); setTimeout(() => t.remove(), 400); }
  },

  // Génère un ID court
  shortId() {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  },

  // Catégories dépenses
  EXPENSE_CATS: [
    { value: 'alimentation', label: 'Alimentation', icon: '🍽️', color: '#f59e0b' },
    { value: 'transport',    label: 'Transport',    icon: '🚗', color: '#3b82f6' },
    { value: 'sante',        label: 'Santé',        icon: '🏥', color: '#ef4444' },
    { value: 'education',    label: 'Éducation',    icon: '📚', color: '#8b5cf6' },
    { value: 'loisirs',      label: 'Loisirs',      icon: '🎭', color: '#ec4899' },
    { value: 'logement',     label: 'Logement',     icon: '🏠', color: '#14b8a6' },
    { value: 'vetements',    label: 'Vêtements',    icon: '👔', color: '#6366f1' },
    { value: 'factures',     label: 'Factures',     icon: '📄', color: '#f97316' },
    { value: 'autre',        label: 'Autre',        icon: '📦', color: '#6b7280' },
  ],

  // Catégories revenus
  INCOME_CATS: [
    { value: 'salaire',   label: 'Salaire',   icon: '💼', color: '#10b981' },
    { value: 'commerce',  label: 'Commerce',  icon: '🏪', color: '#3b82f6' },
    { value: 'freelance', label: 'Freelance', icon: '💻', color: '#8b5cf6' },
    { value: 'transfert', label: 'Transfert', icon: '💸', color: '#f59e0b' },
    { value: 'location',  label: 'Location',  icon: '🏘️', color: '#14b8a6' },
    { value: 'autre',     label: 'Autre',     icon: '💰', color: '#6b7280' },
  ],

  PAYMENT_METHODS: [
    { value: 'cash',     label: '💵 Espèces' },
    { value: 'card',     label: '💳 Carte bancaire' },
    { value: 'transfer', label: '🏦 Virement' },
    { value: 'check',    label: '📋 Chèque' },
    { value: 'mobile',   label: '📱 Paiement mobile' },
  ],

  FREQUENCIES: [
    { value: 'weekly',    label: 'Hebdomadaire' },
    { value: 'monthly',   label: 'Mensuel' },
    { value: 'quarterly', label: 'Trimestriel' },
    { value: 'yearly',    label: 'Annuel' },
  ],

  getCat(value, type = 'expense') {
    const list = type === 'expense' ? this.EXPENSE_CATS : this.INCOME_CATS;
    return list.find(c => c.value === value) || { label: value, icon: '📦', color: '#6b7280' };
  },

  // Pourcentage
  pct(part, total) {
    if (!total) return 0;
    return Math.round((part / total) * 100);
  },

  // Construire un select HTML
  selectOptions(list, selected, emptyLabel = '') {
    let html = emptyLabel ? `<option value="">${emptyLabel}</option>` : '';
    list.forEach(item => {
      const val = typeof item === 'string' ? item : item.value;
      const lbl = typeof item === 'string' ? item : (item.icon ? item.icon + ' ' + item.label : item.label);
      html += `<option value="${val}" ${val === selected ? 'selected' : ''}>${lbl}</option>`;
    });
    return html;
  },
};

window.Utils = Utils;
