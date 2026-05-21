// =====================================================
// Family Cash Flow — Utilities
// =====================================================

// ── Currency ──
const CURRENCIES = {
  MAD: { symbol: 'DH',  name: 'Dirham marocain', locale: 'fr-MA' },
  EUR: { symbol: '€',   name: 'Euro',             locale: 'fr-FR' },
  USD: { symbol: '$',   name: 'Dollar US',        locale: 'en-US' },
  GBP: { symbol: '£',   name: 'Livre sterling',   locale: 'en-GB' },
  XOF: { symbol: 'CFA', name: 'Franc CFA',        locale: 'fr-SN' },
};

function formatCurrency(amount, currency) {
  const cur = currency || AppState.currency || 'MAD';
  const info = CURRENCIES[cur] || CURRENCIES.MAD;
  const num = parseFloat(amount) || 0;
  return `${num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${info.symbol}`;
}

function formatCurrencyShort(amount, currency) {
  const cur = currency || AppState.currency || 'MAD';
  const info = CURRENCIES[cur] || CURRENCIES.MAD;
  const num = parseFloat(amount) || 0;
  if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(1)}M ${info.symbol}`;
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(1)}K ${info.symbol}`;
  return `${num.toFixed(0)} ${info.symbol}`;
}

// ── Dates ──
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateLong(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatMonth(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function getMonthYear(date) {
  const d = date || new Date();
  return {
    month: d.getMonth() + 1,
    year: d.getFullYear(),
    label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    shortLabel: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
  };
}

function isoDate(date) {
  const d = date || new Date();
  return d.toISOString().split('T')[0];
}

function daysUntil(dateStr) {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0,0,0,0);
  target.setHours(0,0,0,0);
  return Math.round((target - today) / 86400000);
}

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return isoDate(d);
}

// ── Constants ──
const MONTHS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
];

const EXPENSE_CATEGORIES = [
  { value: 'alimentation', label: 'Alimentation',  icon: '🍽️', color: '#10B981' },
  { value: 'transport',    label: 'Transport',      icon: '🚗', color: '#3B82F6' },
  { value: 'sante',        label: 'Santé',          icon: '🏥', color: '#EF4444' },
  { value: 'education',    label: 'Éducation',      icon: '📚', color: '#8B5CF6' },
  { value: 'loisirs',      label: 'Loisirs',        icon: '🎭', color: '#F59E0B' },
  { value: 'logement',     label: 'Logement',       icon: '🏠', color: '#6366F1' },
  { value: 'vetements',    label: 'Vêtements',      icon: '👔', color: '#EC4899' },
  { value: 'electricite',  label: 'Électricité',    icon: '⚡', color: '#F97316' },
  { value: 'eau',          label: 'Eau',            icon: '💧', color: '#06B6D4' },
  { value: 'internet',     label: 'Internet',       icon: '📶', color: '#84CC16' },
  { value: 'autre',        label: 'Autre',          icon: '📦', color: '#64748B' },
];

const INCOME_CATEGORIES = [
  { value: 'salaire',   label: 'Salaire',   icon: '💼', color: '#10B981' },
  { value: 'commerce',  label: 'Commerce',  icon: '🏪', color: '#3B82F6' },
  { value: 'freelance', label: 'Freelance', icon: '💻', color: '#8B5CF6' },
  { value: 'transfert', label: 'Transfert', icon: '💸', color: '#F59E0B' },
  { value: 'loyer',     label: 'Loyer reçu',icon: '🏢', color: '#06B6D4' },
  { value: 'autre',     label: 'Autre',     icon: '💰', color: '#64748B' },
];

const PAYMENT_METHODS = [
  { value: 'cash',     label: 'Espèces',        icon: '💵' },
  { value: 'card',     label: 'Carte bancaire',  icon: '💳' },
  { value: 'transfer', label: 'Virement',        icon: '🏦' },
  { value: 'check',    label: 'Chèque',          icon: '📝' },
  { value: 'mobile',   label: 'Paiement mobile', icon: '📱' },
];

const FREQUENCIES = [
  { value: 'weekly',    label: 'Hebdomadaire', perMonth: 4.33 },
  { value: 'monthly',   label: 'Mensuel',      perMonth: 1 },
  { value: 'quarterly', label: 'Trimestriel',  perMonth: 1/3 },
  { value: 'yearly',    label: 'Annuel',       perMonth: 1/12 },
];

const LOAN_STATUS = [
  { value: 'active',    label: 'En cours',   color: 'green' },
  { value: 'completed', label: 'Remboursé',  color: 'blue'  },
  { value: 'late',      label: 'En retard',  color: 'red'   },
];

// ── Helpers ──
function getCategoryInfo(value, type) {
  const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return list.find(c => c.value === value) || { label: value, icon: '📦', color: '#64748B' };
}

function getPaymentMethodInfo(value) {
  return PAYMENT_METHODS.find(m => m.value === value) || { label: value, icon: '💵' };
}

function getFrequencyInfo(value) {
  return FREQUENCIES.find(f => f.value === value) || FREQUENCIES[1];
}

function calcMonthlyEquivalent(amount, frequency) {
  const freq = getFrequencyInfo(frequency);
  return amount * freq.perMonth;
}

// ── App State ──
const AppState = {
  user: null,
  profile: null,
  family: null,
  familyMembers: [],
  currency: 'MAD',
  language: 'fr',
  theme: localStorage.getItem('fcf-theme') || 'light',
  currentPage: 'dashboard',
  currentMonth: new Date().getMonth() + 1,
  currentYear: new Date().getFullYear(),
  alerts: { subscriptions: 0, loans: 0, budgets: 0 },
};

// ── Toast Notifications ──
function showToast(message, type = 'info', duration = 3500) {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── DOM helpers ──
function el(id) { return document.getElementById(id); }
function qs(selector) { return document.querySelector(selector); }
function qsa(selector) { return document.querySelectorAll(selector); }

function renderHTML(containerId, html) {
  const container = el(containerId) || el('app');
  if (container) container.innerHTML = html;
}

function setLoading(show) {
  const screen = el('loading-screen');
  if (screen) screen.style.display = show ? 'flex' : 'none';
}

// ── Theme ──
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  AppState.theme = theme;
  localStorage.setItem('fcf-theme', theme);
}

function toggleTheme() {
  const next = AppState.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  // Update icon
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.innerHTML = next === 'dark'
    ? '<i class="fas fa-sun"></i>'
    : '<i class="fas fa-moon"></i>';
}

// ── Sidebar ──
function openSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = el('sidebar-overlay');
  if (sidebar) sidebar.classList.add('open');
  if (overlay) overlay.classList.remove('hidden');
}

function closeSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = el('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.add('hidden');
}

// ── Number utils ──
function pct(part, total) {
  if (!total) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

// ── Select options builder ──
function buildOptions(list, selectedValue, valueKey = 'value', labelKey = 'label') {
  return list.map(item =>
    `<option value="${item[valueKey]}" ${item[valueKey] === selectedValue ? 'selected' : ''}>${item[labelKey]}</option>`
  ).join('');
}

// Apply saved theme on load
applyTheme(AppState.theme);
