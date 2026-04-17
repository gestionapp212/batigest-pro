// ============================================================
// BATIGEST PRO – Application SaaS Multi-Entreprise
// Version 1.0 – Full Frontend SPA
// ============================================================

'use strict';

// ===== ÉTAT GLOBAL =====
const State = {
  currentUser: null,
  currentCompany: null,
  currentPage: 'dashboard',
  theme: localStorage.getItem('theme') || 'light',
  lang: localStorage.getItem('lang') || 'fr',
  sidebarOpen: false,
  // Data stores (localStorage)
  data: {}
};

// ===== CONSTANTES =====
const PLANS = {
  basic:    { name: 'Basic',    price: 50,  maxUsers: 1,  color: '#64748b' },
  pro:      { name: 'Pro',      price: 100, maxUsers: 4,  color: '#2563eb' },
  business: { name: 'Business', price: 300, maxUsers: 10, color: '#7c3aed' }
};

const ROLES = { super_admin: 'Super Admin', admin: 'Admin', user: 'Utilisateur' };

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

// ===== STORAGE HELPERS =====
const DB = {
  get: (key) => {
    try { return JSON.parse(localStorage.getItem('bg_' + key) || 'null'); }
    catch { return null; }
  },
  set: (key, val) => localStorage.setItem('bg_' + key, JSON.stringify(val)),
  getList: (key) => DB.get(key) || [],
  addItem: (key, item) => {
    const list = DB.getList(key);
    item.id = item.id || genId();
    item.createdAt = item.createdAt || new Date().toISOString();
    list.push(item);
    DB.set(key, list);
    return item;
  },
  updateItem: (key, id, updates) => {
    const list = DB.getList(key);
    const idx = list.findIndex(i => i.id === id);
    if (idx !== -1) { list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() }; DB.set(key, list); return list[idx]; }
    return null;
  },
  deleteItem: (key, id) => {
    const list = DB.getList(key).filter(i => i.id !== id);
    DB.set(key, list);
  }
};

function genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 6); }
function fmtMoney(n) { return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 0 }).format(n || 0); }
function fmtDate(d) { if (!d) return '–'; return new Date(d).toLocaleDateString('fr-FR'); }
function fmtDateTime(d) { if (!d) return '–'; return new Date(d).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
function fmtNum(n) { return new Intl.NumberFormat('fr-FR').format(n || 0); }
function today() { return new Date().toISOString().split('T')[0]; }
function escHtml(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

// ===== INITIALISATION DONNÉES =====
function initSeedData() {
  if (DB.get('seeded')) return;

  // Super Admin
  const sa = { id: 'sa1', email: 'superadmin@batigest.ma', password: 'Admin@1234', role: 'super_admin', name: 'Super Admin', companyId: null };
  DB.set('users', [sa]);

  // Sociétés
  const companies = [
    { id: 'c1', name: 'BTP Maroc SARL', plan: 'business', status: 'active', email: 'contact@btpmaroc.ma', phone: '0522-123456', city: 'Casablanca', logo: '', createdAt: '2024-01-15T00:00:00.000Z', subscriptionEnd: '2025-12-31', siret: 'RC 12345' },
    { id: 'c2', name: 'Constructions Atlas', plan: 'pro', status: 'active', email: 'info@atlas.ma', phone: '0537-987654', city: 'Rabat', logo: '', createdAt: '2024-03-01T00:00:00.000Z', subscriptionEnd: '2025-09-30', siret: 'RC 67890' }
  ];
  DB.set('companies', companies);

  // Users par société
  const users = [
    { id: 'u1', companyId: 'c1', email: 'admin@btpmaroc.ma', password: 'Admin@1234', role: 'admin', name: 'Ahmed Benali', phone: '0661234567', status: 'active' },
    { id: 'u2', companyId: 'c1', email: 'user@btpmaroc.ma', password: 'User@1234', role: 'user', name: 'Mohamed Alaoui', phone: '0662345678', status: 'active' },
    { id: 'u3', companyId: 'c2', email: 'admin@atlas.ma', password: 'Admin@1234', role: 'admin', name: 'Khalid Mansouri', phone: '0663456789', status: 'active' },
    sa
  ];
  DB.set('users', users);

  // Clients c1
  const clients = [
    { id: 'cl1', companyId: 'c1', name: 'Rachid Benmoussa', email: 'rachid@gmail.com', phone: '0660111222', city: 'Casablanca', type: 'particulier', ice: '', rc: '', status: 'active' },
    { id: 'cl2', companyId: 'c1', name: 'Société Immosud', email: 'contact@immosud.ma', phone: '0522333444', city: 'Marrakech', type: 'société', ice: '001234567000001', rc: 'RC789', status: 'active' },
    { id: 'cl3', companyId: 'c1', name: 'Nadia Chraibi', email: 'nadia.c@yahoo.fr', phone: '0661555666', city: 'Rabat', type: 'particulier', ice: '', rc: '', status: 'active' },
    { id: 'cl4', companyId: 'c2', name: 'Groupe Hassan SA', email: 'info@hassan.ma', phone: '0537444555', city: 'Fès', type: 'société', ice: '009876543000001', rc: 'RC456', status: 'active' }
  ];
  DB.set('clients', clients);

  // Fournisseurs c1
  const fournisseurs = [
    { id: 'f1', companyId: 'c1', name: 'Ciment Asment', email: 'asment@ciment.ma', phone: '0522-999888', city: 'Settat', category: 'matériaux', ice: '002345678000001' },
    { id: 'f2', companyId: 'c1', name: 'Acier Atlas', email: 'info@acier-atlas.ma', phone: '0522-777666', city: 'Casablanca', category: 'métaux', ice: '003456789000001' },
    { id: 'f3', companyId: 'c1', name: 'Electricité Plus', email: 'ep@electric.ma', phone: '0661-888777', city: 'Casablanca', category: 'électricité', ice: '004567890000001' }
  ];
  DB.set('fournisseurs', fournisseurs);

  // Produits / Stock c1
  const produits = [
    { id: 'p1', companyId: 'c1', ref: 'CIM-001', name: 'Ciment Portland 50kg', category: 'matériaux', unit: 'sac', stock: 120, stockMin: 20, price: 65, fournisseurId: 'f1' },
    { id: 'p2', companyId: 'c1', ref: 'FER-001', name: 'Fer à béton 12mm', category: 'métaux', unit: 'kg', stock: 850, stockMin: 100, price: 8.5, fournisseurId: 'f2' },
    { id: 'p3', companyId: 'c1', ref: 'CAR-001', name: 'Carrelage 60x60', category: 'finitions', unit: 'm²', stock: 45, stockMin: 30, price: 120, fournisseurId: null },
    { id: 'p4', companyId: 'c1', ref: 'SAND-001', name: 'Sable fin', category: 'matériaux', unit: 'm³', stock: 18, stockMin: 10, price: 250, fournisseurId: 'f1' }
  ];
  DB.set('produits', produits);

  // Chantiers c1
  const chantiers = [
    {
      id: 'ch1', companyId: 'c1', name: 'Villa Résidentielle Anfa',
      clientId: 'cl1', budget: 850000,
      dateDebut: '2024-02-01', dateFin: '2024-09-30',
      status: 'en_cours', description: 'Construction villa 4 chambres',
      address: 'Anfa, Casablanca'
    },
    {
      id: 'ch2', companyId: 'c1', name: 'Immeuble Hay Riad R+5',
      clientId: 'cl2', budget: 3200000,
      dateDebut: '2024-05-01', dateFin: '2025-06-30',
      status: 'en_cours', description: 'Construction immeuble R+5',
      address: 'Hay Riad, Rabat'
    },
    {
      id: 'ch3', companyId: 'c1', name: 'Rénovation Bureau Bd Zerktouni',
      clientId: 'cl3', budget: 180000,
      dateDebut: '2024-01-15', dateFin: '2024-03-31',
      status: 'terminé', description: 'Rénovation bureaux',
      address: 'Bd Zerktouni, Casablanca'
    }
  ];
  DB.set('chantiers', chantiers);

  // Entrées chantier (avances client)
  const chantierEntrees = [
    { id: 'ce1', companyId: 'c1', chantierId: 'ch1', montant: 200000, description: 'Avance 1er décompte', date: '2024-02-15', mode: 'virement' },
    { id: 'ce2', companyId: 'c1', chantierId: 'ch1', montant: 150000, description: 'Avance 2ème décompte', date: '2024-04-20', mode: 'chèque' },
    { id: 'ce3', companyId: 'c1', chantierId: 'ch2', montant: 500000, description: 'Avance initiale', date: '2024-05-10', mode: 'virement' },
    { id: 'ce4', companyId: 'c1', chantierId: 'ch2', montant: 300000, description: 'Décompte R+1', date: '2024-07-15', mode: 'virement' }
  ];
  DB.set('chantierEntrees', chantierEntrees);

  // Achats chantier
  const chantierAchats = [
    { id: 'ca1', companyId: 'c1', chantierId: 'ch1', fournisseurId: 'f1', produit: 'Ciment Portland', montant: 32500, date: '2024-02-20', description: '500 sacs' },
    { id: 'ca2', companyId: 'c1', chantierId: 'ch1', fournisseurId: 'f2', produit: 'Fer à béton', montant: 68000, date: '2024-03-05', description: '8000kg' },
    { id: 'ca3', companyId: 'c1', chantierId: 'ch1', fournisseurId: 'f3', produit: 'Matériel électrique', montant: 15000, date: '2024-04-10', description: 'Câblage complet' },
    { id: 'ca4', companyId: 'c1', chantierId: 'ch2', fournisseurId: 'f1', produit: 'Ciment Portland', montant: 120000, date: '2024-05-20', description: 'Fondations' },
    { id: 'ca5', companyId: 'c1', chantierId: 'ch2', fournisseurId: 'f2', produit: 'Fer à béton HE', montant: 280000, date: '2024-06-10', description: 'Structure R+5' }
  ];
  DB.set('chantierAchats', chantierAchats);

  // Main d'oeuvre chantier
  const chantierMO = [
    { id: 'mo1', companyId: 'c1', chantierId: 'ch1', type: 'journalier', nom: 'Équipe maçonnerie', montant: 45000, jours: 30, tarifJour: 1500, date: '2024-03-01' },
    { id: 'mo2', companyId: 'c1', chantierId: 'ch1', type: 'tache', nom: 'Plombier Hassan', montant: 12000, description: 'Plomberie complète', date: '2024-04-15' },
    { id: 'mo3', companyId: 'c1', chantierId: 'ch2', type: 'prestataire', nom: 'STE Ferraillage Pro', montant: 85000, description: 'Ferraillage structure', date: '2024-06-01' },
    { id: 'mo4', companyId: 'c1', chantierId: 'ch2', type: 'journalier', nom: 'Équipe coffrage', montant: 60000, jours: 40, tarifJour: 1500, date: '2024-06-15' }
  ];
  DB.set('chantierMO', chantierMO);

  // Devis c1
  const devis = [
    { id: 'd1', companyId: 'c1', clientId: 'cl1', numero: 'DEV-2024-001', date: '2024-01-10', validite: '2024-02-10', status: 'accepté', lignes: [{ desc: 'Terrassement', qte: 1, unite: 'Fft', pu: 25000, tva: 20 }, { desc: 'Fondations', qte: 1, unite: 'Fft', pu: 85000, tva: 20 }], notes: 'TVA incluse', remise: 0 },
    { id: 'd2', companyId: 'c1', clientId: 'cl2', numero: 'DEV-2024-002', date: '2024-04-15', validite: '2024-05-15', status: 'envoyé', lignes: [{ desc: 'Structure immeuble R+5', qte: 1, unite: 'Fft', pu: 1800000, tva: 20 }], notes: '', remise: 5 },
    { id: 'd3', companyId: 'c1', clientId: 'cl3', numero: 'DEV-2024-003', date: '2024-07-01', validite: '2024-08-01', status: 'brouillon', lignes: [{ desc: 'Rénovation salle de bain', qte: 1, unite: 'Fft', pu: 45000, tva: 20 }], notes: '', remise: 0 }
  ];
  DB.set('devis', devis);

  // Factures c1
  const factures = [
    { id: 'fac1', companyId: 'c1', clientId: 'cl1', numero: 'FAC-2024-001', date: '2024-02-15', echeance: '2024-03-15', status: 'payée', lignes: [{ desc: 'Terrassement et fondations', qte: 1, unite: 'Fft', pu: 110000, tva: 20 }], devisId: 'd1', remise: 0, montantPaye: 132000 },
    { id: 'fac2', companyId: 'c1', clientId: 'cl1', numero: 'FAC-2024-002', date: '2024-05-10', echeance: '2024-06-10', status: 'payée', lignes: [{ desc: 'Gros oeuvre - avancement 50%', qte: 1, unite: 'Fft', pu: 180000, tva: 20 }], remise: 0, montantPaye: 216000 },
    { id: 'fac3', companyId: 'c1', clientId: 'cl2', numero: 'FAC-2024-003', date: '2024-06-01', echeance: '2024-07-01', status: 'partielle', lignes: [{ desc: 'Gros oeuvre immeuble - 1er décompte', qte: 1, unite: 'Fft', pu: 800000, tva: 20 }], remise: 5, montantPaye: 500000 },
    { id: 'fac4', companyId: 'c1', clientId: 'cl3', numero: 'FAC-2024-004', date: '2024-07-20', echeance: '2024-08-20', status: 'non payée', lignes: [{ desc: 'Rénovation complète appartement', qte: 1, unite: 'Fft', pu: 95000, tva: 20 }], remise: 0, montantPaye: 0 }
  ];
  DB.set('factures', factures);

  // Paiements
  const paiements = [
    { id: 'pay1', companyId: 'c1', type: 'entrée', reference: 'FAC-2024-001', montant: 132000, date: '2024-03-10', mode: 'virement', description: 'Paiement facture 001', clientId: 'cl1' },
    { id: 'pay2', companyId: 'c1', type: 'entrée', reference: 'FAC-2024-002', montant: 216000, date: '2024-06-05', mode: 'chèque', description: 'Paiement facture 002', clientId: 'cl1' },
    { id: 'pay3', companyId: 'c1', type: 'entrée', reference: 'FAC-2024-003', montant: 500000, date: '2024-07-01', mode: 'virement', description: 'Acompte partiel facture 003', clientId: 'cl2' },
    { id: 'pay4', companyId: 'c1', type: 'sortie', reference: 'FOUR-001', montant: 32500, date: '2024-02-25', mode: 'virement', description: 'Paiement fournisseur Ciment Asment', fournisseurId: 'f1' }
  ];
  DB.set('paiements', paiements);

  // Tâches
  const taches = [
    { id: 't1', companyId: 'c1', title: 'Réunion chantier Anfa', description: 'Réunion de suivi hebdomadaire', assigneId: 'u2', chantierId: 'ch1', status: 'en_cours', priority: 'haute', dueDate: '2024-08-10' },
    { id: 't2', companyId: 'c1', title: 'Commande ciment lot 2', description: 'Commander 300 sacs ciment Portland', assigneId: 'u1', status: 'à_faire', priority: 'normale', dueDate: '2024-08-15' },
    { id: 't3', companyId: 'c1', title: 'Envoi devis client Chraibi', description: 'Envoyer devis rénovation salle de bain', assigneId: 'u1', status: 'terminée', priority: 'haute', dueDate: '2024-07-20' }
  ];
  DB.set('taches', taches);

  DB.set('seeded', true);
}

// ===== AUTH =====
function login(email, password) {
  const users = DB.getList('users');
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return { success: false, error: 'Email ou mot de passe incorrect' };
  if (user.status === 'suspendu') return { success: false, error: 'Compte suspendu. Contactez votre administrateur.' };

  let company = null;
  if (user.companyId) {
    company = DB.getList('companies').find(c => c.id === user.companyId);
    if (company && company.status === 'suspendu') return { success: false, error: 'Votre société est suspendue.' };
  }

  State.currentUser = user;
  State.currentCompany = company;
  DB.set('session', { userId: user.id, companyId: user.companyId });

  return { success: true, user, company };
}

function logout() {
  State.currentUser = null;
  State.currentCompany = null;
  localStorage.removeItem('bg_session');
  renderApp();
}

function restoreSession() {
  const session = DB.get('session');
  if (!session) return false;
  const users = DB.getList('users');
  const user = users.find(u => u.id === session.userId);
  if (!user) return false;
  State.currentUser = user;
  if (session.companyId) {
    State.currentCompany = DB.getList('companies').find(c => c.id === session.companyId) || null;
  }
  return true;
}

// ===== HELPERS UI =====
function showToast(msg, type = 'success') {
  const icons = { success: 'fa-check-circle text-green-500', danger: 'fa-times-circle text-red-500', warning: 'fa-exclamation-triangle text-yellow-500', info: 'fa-info-circle text-blue-500' };
  const tc = document.getElementById('toast-container') || (() => {
    const el = document.createElement('div');
    el.id = 'toast-container';
    el.className = 'toast-container';
    document.body.appendChild(el);
    return el;
  })();
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<i class="fas ${icons[type]} text-lg"></i><span style="flex:1;font-size:14px;">${escHtml(msg)}</span><button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:16px;">✕</button>`;
  tc.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

function confirm(msg, onOk) {
  const ov = document.createElement('div');
  ov.className = 'modal-overlay';
  ov.innerHTML = `
    <div class="modal" style="max-width:380px;text-align:center;">
      <div style="font-size:40px;margin-bottom:12px;">⚠️</div>
      <h3 style="font-size:16px;font-weight:700;margin-bottom:8px;color:var(--text-primary);">Confirmer l'action</h3>
      <p style="font-size:14px;color:var(--text-secondary);margin-bottom:24px;">${escHtml(msg)}</p>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button class="btn btn-secondary" onclick="document.body.removeChild(this.closest('.modal-overlay'))">Annuler</button>
        <button class="btn btn-danger" id="confirm-ok">Confirmer</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  document.getElementById('confirm-ok').onclick = () => { document.body.removeChild(ov); onOk(); };
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function openModal(html) {
  const ov = document.createElement('div');
  ov.className = 'modal-overlay';
  ov.id = 'active-modal';
  ov.innerHTML = html;
  ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
}

// ===== RENDU PRINCIPAL =====
function renderApp() {
  const root = document.getElementById('root');
  if (!State.currentUser) {
    root.innerHTML = renderLoginPage();
    return;
  }
  if (State.currentUser.role === 'super_admin') {
    window.location.href = '/super-admin';
    return;
  }
  root.innerHTML = renderMainLayout();
  initSidebar();
  navigateTo(State.currentPage);
}

// ===== LOGIN PAGE =====
function renderLoginPage() {
  return `
<div id="login-page">
  <div class="login-left">
    <div class="login-hero">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:36px;">
        <div style="width:56px;height:56px;background:#2563eb;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:28px;">🏗️</div>
        <div>
          <div style="color:#fff;font-size:22px;font-weight:800;">BatiGest Pro</div>
          <div style="color:#94a3b8;font-size:12px;">Gestion BTP & Commerce</div>
        </div>
      </div>
      <h1>Gérez votre activité<br/><span style="color:#60a5fa;">avec précision</span></h1>
      <p>Plateforme SaaS complète pour la gestion de chantiers, facturation, stocks et équipes.</p>
      <ul class="feature-list">
        <li><span class="check"><i class="fas fa-check"></i></span> Suivi financier chantiers en temps réel</li>
        <li><span class="check"><i class="fas fa-check"></i></span> Facturation et devis professionnels</li>
        <li><span class="check"><i class="fas fa-check"></i></span> Gestion des stocks et fournisseurs</li>
        <li><span class="check"><i class="fas fa-check"></i></span> Rapports et analyses avancées</li>
        <li><span class="check"><i class="fas fa-check"></i></span> Multi-utilisateurs et multi-entreprises</li>
      </ul>
    </div>
  </div>
  <div class="login-right">
    <div class="login-box">
      <div class="login-logo">
        <div style="font-size:36px;">🏗️</div>
        <div style="font-weight:800;font-size:22px;color:var(--text-primary);margin-top:4px;">BatiGest Pro</div>
        <div style="color:var(--text-secondary);font-size:13px;">Connectez-vous à votre espace</div>
      </div>
      <div id="login-error" style="display:none;background:#fee2e2;color:#dc2626;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:16px;border:1px solid #fca5a5;"></div>
      <form id="login-form" onsubmit="handleLogin(event)">
        <div class="form-group">
          <label class="form-label">Email <span class="req">*</span></label>
          <input class="form-input" type="email" id="login-email" placeholder="votre@email.com" value="admin@btpmaroc.ma" required/>
        </div>
        <div class="form-group">
          <label class="form-label">Mot de passe <span class="req">*</span></label>
          <div style="position:relative;">
            <input class="form-input" type="password" id="login-password" placeholder="••••••••" value="Admin@1234" required style="padding-right:44px;"/>
            <button type="button" onclick="togglePwd()" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-secondary);"><i id="pwd-icon" class="fas fa-eye"></i></button>
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-lg" style="width:100%;">
          <i class="fas fa-sign-in-alt"></i> Se connecter
        </button>
      </form>
      <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--border);">
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;font-weight:600;">COMPTES DE DÉMONSTRATION :</div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          <button class="btn btn-secondary btn-sm" onclick="quickLogin('admin@btpmaroc.ma','Admin@1234')"><i class="fas fa-user-shield"></i> Admin – BTP Maroc</button>
          <button class="btn btn-secondary btn-sm" onclick="quickLogin('user@btpmaroc.ma','User@1234')"><i class="fas fa-user"></i> Utilisateur – BTP Maroc</button>
          <button class="btn btn-secondary btn-sm" onclick="quickLogin('superadmin@batigest.ma','Admin@1234')"><i class="fas fa-crown"></i> Super Admin</button>
        </div>
      </div>
    </div>
  </div>
</div>`;
}

function togglePwd() {
  const inp = document.getElementById('login-password');
  const icon = document.getElementById('pwd-icon');
  if (inp.type === 'password') { inp.type = 'text'; icon.className = 'fas fa-eye-slash'; }
  else { inp.type = 'password'; icon.className = 'fas fa-eye'; }
}

function quickLogin(email, pwd) {
  document.getElementById('login-email').value = email;
  document.getElementById('login-password').value = pwd;
  handleLogin(new Event('submit'));
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const result = login(email, password);
  if (!result.success) {
    const errEl = document.getElementById('login-error');
    errEl.textContent = result.error;
    errEl.style.display = 'block';
    return;
  }
  renderApp();
}

// ===== LAYOUT PRINCIPAL =====
function renderMainLayout() {
  const u = State.currentUser;
  const c = State.currentCompany;
  const plan = c ? PLANS[c.plan] : null;
  const initials = u.name.split(' ').map(w => w[0]).join('').toUpperCase().substr(0, 2);

  const navItems = getNavItems();
  let sidebarNav = '';
  let lastSection = '';

  navItems.forEach(item => {
    if (item.section && item.section !== lastSection) {
      sidebarNav += `<div class="nav-section-title">${item.section}</div>`;
      lastSection = item.section;
    }
    const badge = item.badge ? `<span class="nav-badge">${item.badge}</span>` : '';
    sidebarNav += `<div class="nav-item" id="nav-${item.id}" onclick="navigateTo('${item.id}')">
      <i class="fas ${item.icon} nav-icon"></i>
      <span>${item.label}</span>
      ${badge}
    </div>`;
  });

  return `
<div id="sidebar-overlay" class="sidebar-overlay" onclick="toggleSidebar()"></div>
<div id="app-layout">
  <aside id="sidebar">
    <div class="logo-area">
      <div class="logo-icon">🏗️</div>
      <div>
        <div class="logo-text">BatiGest Pro</div>
        <div class="logo-sub">v1.0</div>
      </div>
    </div>
    ${c ? `<div class="company-info" onclick="navigateTo('settings')">
      <div class="company-name">${escHtml(c.name)}</div>
      <div class="company-plan">
        <span class="plan-badge">${plan ? plan.name : ''}</span>
        <span>${c.status === 'active' ? '✅ Actif' : '⛔ Suspendu'}</span>
      </div>
    </div>` : ''}
    <nav>${sidebarNav}</nav>
    <div class="sidebar-footer">
      <div class="user-avatar-area">
        <div class="user-avatar">${initials}</div>
        <div style="flex:1;min-width:0;">
          <div style="color:#e2e8f0;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(u.name)}</div>
          <div style="color:#64748b;font-size:11px;">${ROLES[u.role]}</div>
        </div>
        <button onclick="logout()" style="background:none;border:none;cursor:pointer;color:#64748b;padding:4px;" title="Déconnexion"><i class="fas fa-sign-out-alt"></i></button>
      </div>
    </div>
  </aside>
  <div id="main-content">
    <header id="topbar">
      <button id="sidebar-toggle" onclick="toggleSidebar()"><i class="fas fa-bars"></i></button>
      <div class="page-title" id="page-title">Tableau de bord</div>
      <div class="topbar-actions">
        <button class="btn btn-ghost" onclick="toggleTheme()" title="Thème"><i class="fas fa-${State.theme === 'dark' ? 'sun' : 'moon'}"></i></button>
        <div class="user-avatar" style="cursor:default;">${initials}</div>
      </div>
    </header>
    <main id="page-content"></main>
  </div>
</div>`;
}

function getNavItems() {
  const role = State.currentUser?.role;
  const items = [
    { id: 'dashboard',    label: 'Tableau de bord',  icon: 'fa-chart-pie',        section: 'PRINCIPAL' },
    { id: 'chantiers',    label: 'Chantiers',         icon: 'fa-hard-hat',         section: 'MÉTIER' },
    { id: 'clients',      label: 'Clients',           icon: 'fa-users',            section: 'MÉTIER' },
    { id: 'devis',        label: 'Devis',             icon: 'fa-file-alt',         section: 'MÉTIER' },
    { id: 'factures',     label: 'Factures',          icon: 'fa-file-invoice-dollar', section: 'MÉTIER' },
    { id: 'paiements',    label: 'Paiements',         icon: 'fa-money-bill-wave',  section: 'FINANCE' },
    { id: 'rapports',     label: 'Rapports',          icon: 'fa-chart-bar',        section: 'FINANCE' },
    { id: 'stock',        label: 'Stock',             icon: 'fa-boxes',            section: 'OPÉRATIONS' },
    { id: 'fournisseurs', label: 'Fournisseurs',      icon: 'fa-truck',            section: 'OPÉRATIONS' },
    { id: 'taches',       label: 'Tâches',            icon: 'fa-tasks',            section: 'OPÉRATIONS' },
    { id: 'agenda',       label: 'Agenda',            icon: 'fa-calendar-alt',     section: 'OPÉRATIONS' },
  ];
  if (role === 'admin') {
    items.push({ id: 'settings', label: 'Paramètres', icon: 'fa-cog', section: 'ADMINISTRATION' });
  }
  return items;
}

function initSidebar() {
  // Already rendered
}

function toggleSidebar() {
  State.sidebarOpen = !State.sidebarOpen;
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  if (State.sidebarOpen) { sb?.classList.add('open'); ov?.classList.add('show'); }
  else { sb?.classList.remove('open'); ov?.classList.remove('show'); }
}

function toggleTheme() {
  State.theme = State.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', State.theme);
  document.documentElement.setAttribute('data-theme', State.theme);
  const btn = document.querySelector('#topbar .btn-ghost i');
  if (btn) btn.className = `fas fa-${State.theme === 'dark' ? 'sun' : 'moon'}`;
}

function navigateTo(page) {
  State.currentPage = page;
  // Update active nav
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const activeNav = document.getElementById('nav-' + page);
  if (activeNav) activeNav.classList.add('active');

  // Close mobile sidebar
  if (window.innerWidth <= 1024) {
    State.sidebarOpen = false;
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('show');
  }

  const pageContent = document.getElementById('page-content');
  const pageTitle = document.getElementById('page-title');
  if (!pageContent) return;

  const titles = {
    dashboard: 'Tableau de bord', chantiers: 'Chantiers', clients: 'Clients',
    devis: 'Devis', factures: 'Factures', paiements: 'Paiements',
    rapports: 'Rapports', stock: 'Gestion du Stock', fournisseurs: 'Fournisseurs',
    taches: 'Tâches', agenda: 'Agenda', settings: 'Paramètres'
  };

  if (pageTitle) pageTitle.textContent = titles[page] || page;

  const renderers = {
    dashboard: renderDashboard, chantiers: renderChantiers, clients: renderClients,
    devis: renderDevis, factures: renderFactures, paiements: renderPaiements,
    rapports: renderRapports, stock: renderStock, fournisseurs: renderFournisseurs,
    taches: renderTaches, agenda: renderAgenda, settings: renderSettings
  };

  const fn = renderers[page];
  if (fn) { pageContent.innerHTML = fn(); initPageCharts(page); }
  else { pageContent.innerHTML = `<div class="empty-state"><div class="icon">🚧</div><h3>Module en développement</h3><p>Cette section sera disponible prochainement.</p></div>`; }
}

function initPageCharts(page) {
  if (page === 'dashboard') initDashboardCharts();
  if (page === 'rapports') initRapportsCharts();
}

// ===== DASHBOARD =====
function renderDashboard() {
  const cid = State.currentCompany?.id;
  const factures = DB.getList('factures').filter(f => f.companyId === cid);
  const chantiers = DB.getList('chantiers').filter(c => c.companyId === cid);
  const clients = DB.getList('clients').filter(c => c.companyId === cid);
  const paiements = DB.getList('paiements').filter(p => p.companyId === cid);

  const totalCA = factures.reduce((s, f) => s + calcFactureTotal(f), 0);
  const totalPaye = paiements.filter(p => p.type === 'entrée').reduce((s, p) => s + p.montant, 0);
  const totalDepenses = paiements.filter(p => p.type === 'sortie').reduce((s, p) => s + p.montant, 0);
  const chantiersActifs = chantiers.filter(c => c.status === 'en_cours').length;

  // Monthly CA for chart
  const monthlyCA = Array(12).fill(0);
  const monthlyDep = Array(12).fill(0);
  factures.forEach(f => {
    const m = new Date(f.date).getMonth();
    monthlyCA[m] += calcFactureTotal(f);
  });
  paiements.filter(p => p.type === 'sortie').forEach(p => {
    const m = new Date(p.date).getMonth();
    monthlyDep[m] += p.montant;
  });

  const facImpayees = factures.filter(f => f.status !== 'payée').length;
  const taches = DB.getList('taches').filter(t => t.companyId === cid && t.status !== 'terminée');
  const stockAlerte = DB.getList('produits').filter(p => p.companyId === cid && p.stock <= p.stockMin);

  return `
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;">
  <div class="stat-card">
    <div class="stat-icon" style="background:#dbeafe;color:#2563eb;">💰</div>
    <div class="stat-info">
      <div class="stat-label">Chiffre d'Affaires</div>
      <div class="stat-value">${fmtMoney(totalCA)}</div>
      <div class="stat-change up"><i class="fas fa-arrow-up"></i> +12% vs mois dernier</div>
    </div>
  </div>
  <div class="stat-card">
    <div class="stat-icon" style="background:#dcfce7;color:#16a34a;">✅</div>
    <div class="stat-info">
      <div class="stat-label">Encaissements</div>
      <div class="stat-value">${fmtMoney(totalPaye)}</div>
      <div class="stat-change up"><i class="fas fa-arrow-up"></i> Reçus</div>
    </div>
  </div>
  <div class="stat-card">
    <div class="stat-icon" style="background:#fee2e2;color:#dc2626;">📉</div>
    <div class="stat-info">
      <div class="stat-label">Dépenses</div>
      <div class="stat-value">${fmtMoney(totalDepenses)}</div>
      <div class="stat-change down"><i class="fas fa-arrow-down"></i> Sorties</div>
    </div>
  </div>
  <div class="stat-card">
    <div class="stat-icon" style="background:#ede9fe;color:#7c3aed;">🏗️</div>
    <div class="stat-info">
      <div class="stat-label">Chantiers Actifs</div>
      <div class="stat-value">${chantiersActifs}</div>
      <div class="stat-change" style="color:#7c3aed;"><i class="fas fa-hard-hat"></i> En cours</div>
    </div>
  </div>
</div>

<div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:20px;">
  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h3 style="font-size:16px;font-weight:700;">Évolution CA vs Dépenses</h3>
      <span class="badge badge-info">2024</span>
    </div>
    <canvas id="chart-ca" height="200"></canvas>
  </div>
  <div class="card">
    <h3 style="font-size:16px;font-weight:700;margin-bottom:16px;">Répartition des paiements</h3>
    <canvas id="chart-pie" height="200"></canvas>
  </div>
</div>

<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px;">
  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <h3 style="font-size:15px;font-weight:700;">Chantiers en cours</h3>
      <button class="btn btn-secondary btn-sm" onclick="navigateTo('chantiers')">Voir tout</button>
    </div>
    ${chantiers.filter(c => c.status === 'en_cours').slice(0, 3).map(ch => {
      const entrees = DB.getList('chantierEntrees').filter(e => e.chantierId === ch.id).reduce((s, e) => s + e.montant, 0);
      const achats = DB.getList('chantierAchats').filter(a => a.chantierId === ch.id).reduce((s, a) => s + a.montant, 0);
      const mo = DB.getList('chantierMO').filter(m => m.chantierId === ch.id).reduce((s, m) => s + m.montant, 0);
      const sorties = achats + mo;
      const pct = ch.budget > 0 ? Math.round((sorties / ch.budget) * 100) : 0;
      const color = pct < 70 ? 'progress-green' : pct <= 100 ? 'progress-orange' : 'progress-red';
      return `<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border);">
        <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;margin-bottom:6px;">
          <span>${escHtml(ch.name)}</span>
          <span style="color:var(--text-secondary);">${pct}%</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar ${color}" style="width:${Math.min(pct,100)}%"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-secondary);margin-top:4px;">
          <span>${fmtMoney(sorties)} dépensé</span>
          <span>Budget: ${fmtMoney(ch.budget)}</span>
        </div>
      </div>`;
    }).join('')}
    ${chantiers.filter(c => c.status === 'en_cours').length === 0 ? '<p style="color:var(--text-secondary);font-size:13px;">Aucun chantier actif</p>' : ''}
  </div>
  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <h3 style="font-size:15px;font-weight:700;">Factures impayées <span class="badge badge-danger" style="font-size:12px;">${facImpayees}</span></h3>
      <button class="btn btn-secondary btn-sm" onclick="navigateTo('factures')">Voir</button>
    </div>
    ${factures.filter(f => f.status !== 'payée').slice(0, 4).map(f => {
      const cl = DB.getList('clients').find(c => c.id === f.clientId);
      const total = calcFactureTotal(f);
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;">
        <div>
          <div style="font-weight:600;">${escHtml(f.numero)}</div>
          <div style="color:var(--text-secondary);">${escHtml(cl?.name || '–')}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:700;color:var(--danger);">${fmtMoney(total)}</div>
          <span class="badge ${f.status === 'partielle' ? 'badge-warning' : 'badge-danger'}" style="font-size:10px;">${f.status}</span>
        </div>
      </div>`;
    }).join('')}
    ${facImpayees === 0 ? '<div class="empty-state" style="padding:20px;"><div class="icon" style="font-size:32px;">🎉</div><p>Toutes les factures sont payées !</p></div>' : ''}
  </div>
  <div class="card">
    <div style="margin-bottom:14px;">
      <h3 style="font-size:15px;font-weight:700;">Alertes</h3>
    </div>
    ${taches.length > 0 ? `<div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:10px 12px;margin-bottom:10px;font-size:13px;">
      <div style="font-weight:700;color:#92400e;margin-bottom:4px;"><i class="fas fa-tasks"></i> ${taches.length} tâche(s) en attente</div>
      <button class="btn btn-secondary btn-sm" onclick="navigateTo('taches')">Voir les tâches</button>
    </div>` : ''}
    ${stockAlerte.length > 0 ? `<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:10px 12px;margin-bottom:10px;font-size:13px;">
      <div style="font-weight:700;color:#991b1b;margin-bottom:4px;"><i class="fas fa-exclamation-triangle"></i> ${stockAlerte.length} produit(s) sous seuil</div>
      ${stockAlerte.slice(0,2).map(p => `<div style="color:#7f1d1d;">${escHtml(p.name)}: ${p.stock} ${p.unit}</div>`).join('')}
    </div>` : ''}
    <div style="background:#dbeafe;border:1px solid #93c5fd;border-radius:8px;padding:10px 12px;font-size:13px;">
      <div style="font-weight:700;color:#1e40af;"><i class="fas fa-users"></i> ${clients.length} clients</div>
      <div style="color:#1e40af;">${chantiers.length} chantiers total</div>
    </div>
  </div>
</div>`;
}

function initDashboardCharts() {
  const cid = State.currentCompany?.id;
  const factures = DB.getList('factures').filter(f => f.companyId === cid);
  const paiements = DB.getList('paiements').filter(p => p.companyId === cid);

  const monthlyCA = Array(12).fill(0);
  const monthlyDep = Array(12).fill(0);
  factures.forEach(f => { const m = new Date(f.date).getMonth(); monthlyCA[m] += calcFactureTotal(f); });
  paiements.filter(p => p.type === 'sortie').forEach(p => { const m = new Date(p.date).getMonth(); monthlyDep[m] += p.montant; });

  const isDark = State.theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  const ctxCA = document.getElementById('chart-ca');
  if (ctxCA) {
    new Chart(ctxCA, {
      type: 'bar',
      data: {
        labels: MONTHS,
        datasets: [
          { label: 'CA (DH)', data: monthlyCA, backgroundColor: 'rgba(37,99,235,0.7)', borderRadius: 5 },
          { label: 'Dépenses (DH)', data: monthlyDep, backgroundColor: 'rgba(220,38,38,0.6)', borderRadius: 5 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: textColor, font: { size: 12 } } } },
        scales: {
          x: { ticks: { color: textColor }, grid: { color: gridColor } },
          y: { ticks: { color: textColor, callback: v => (v/1000) + 'k' }, grid: { color: gridColor } }
        }
      }
    });
  }

  const totalPaye = paiements.filter(p => p.type === 'entrée').reduce((s, p) => s + p.montant, 0);
  const totalDep = paiements.filter(p => p.type === 'sortie').reduce((s, p) => s + p.montant, 0);
  const ctxPie = document.getElementById('chart-pie');
  if (ctxPie) {
    new Chart(ctxPie, {
      type: 'doughnut',
      data: {
        labels: ['Encaissements', 'Dépenses'],
        datasets: [{ data: [totalPaye, totalDep], backgroundColor: ['#22c55e', '#ef4444'], borderWidth: 0, hoverOffset: 4 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor, font: { size: 12 }, padding: 16 } },
          tooltip: { callbacks: { label: ctx => ` ${fmtMoney(ctx.raw)}` } }
        }
      }
    });
  }
}

// ===== CLIENTS =====
function renderClients() {
  const cid = State.currentCompany?.id;
  const clients = DB.getList('clients').filter(c => c.companyId === cid);

  return `
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
  <div>
    <h2 style="font-size:18px;font-weight:700;">Clients <span class="badge badge-info">${clients.length}</span></h2>
    <p style="color:var(--text-secondary);font-size:13px;margin-top:2px;">Gestion de votre portefeuille clients</p>
  </div>
  <button class="btn btn-primary" onclick="openClientModal()"><i class="fas fa-plus"></i> Nouveau client</button>
</div>
<div class="filters-bar">
  <div class="search-input-wrap" style="flex:1;">
    <i class="fas fa-search"></i>
    <input class="form-input" id="search-clients" placeholder="Rechercher un client..." oninput="filterTable('clients-tbody', this.value, [0,1,2])" style="padding-left:34px;"/>
  </div>
  <select class="form-select" style="width:160px;" onchange="filterByStatus('clients-tbody', this.value, 4)">
    <option value="">Tous les types</option>
    <option value="particulier">Particulier</option>
    <option value="société">Société</option>
  </select>
</div>
<div class="table-wrapper">
  <table>
    <thead>
      <tr>
        <th>Nom / Société</th>
        <th>Contact</th>
        <th>Ville</th>
        <th>ICE / RC</th>
        <th>Type</th>
        <th>Statut</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="clients-tbody">
      ${clients.map(cl => `
      <tr>
        <td><div style="font-weight:600;">${escHtml(cl.name)}</div></td>
        <td><div>${escHtml(cl.email)}</div><div style="color:var(--text-secondary);font-size:12px;">${escHtml(cl.phone)}</div></td>
        <td>${escHtml(cl.city)}</td>
        <td><div style="font-size:12px;">${escHtml(cl.ice || cl.rc || '–')}</div></td>
        <td><span class="badge ${cl.type === 'société' ? 'badge-purple' : 'badge-secondary'}">${escHtml(cl.type)}</span></td>
        <td><span class="badge ${cl.status === 'active' ? 'badge-success' : 'badge-danger'}">${cl.status === 'active' ? 'Actif' : 'Inactif'}</span></td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-secondary btn-sm" onclick="openClientModal('${cl.id}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-secondary btn-sm" onclick="viewClientHistory('${cl.id}')"><i class="fas fa-history"></i></button>
            <button class="btn btn-danger btn-sm" onclick="deleteClient('${cl.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>
${clients.length === 0 ? '<div class="empty-state"><div class="icon">👥</div><h3>Aucun client</h3><p>Commencez par ajouter votre premier client.</p></div>' : ''}`;
}

function openClientModal(id = null) {
  const cl = id ? DB.getList('clients').find(c => c.id === id) : null;
  openModal(`<div class="modal">
    <div class="modal-header">
      <h2 class="modal-title">${cl ? 'Modifier le client' : 'Nouveau client'}</h2>
      <button class="modal-close" onclick="document.getElementById('active-modal').remove()"><i class="fas fa-times"></i></button>
    </div>
    <form onsubmit="saveClient(event, '${id || ''}')">
      <div class="form-grid-2">
        <div class="form-group">
          <label class="form-label">Nom complet <span class="req">*</span></label>
          <input class="form-input" name="name" value="${escHtml(cl?.name || '')}" required/>
        </div>
        <div class="form-group">
          <label class="form-label">Type <span class="req">*</span></label>
          <select class="form-select" name="type" required>
            <option value="particulier" ${cl?.type === 'particulier' ? 'selected' : ''}>Particulier</option>
            <option value="société" ${cl?.type === 'société' ? 'selected' : ''}>Société</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-input" type="email" name="email" value="${escHtml(cl?.email || '')}"/>
        </div>
        <div class="form-group">
          <label class="form-label">Téléphone</label>
          <input class="form-input" name="phone" value="${escHtml(cl?.phone || '')}"/>
        </div>
        <div class="form-group">
          <label class="form-label">Ville</label>
          <input class="form-input" name="city" value="${escHtml(cl?.city || '')}"/>
        </div>
        <div class="form-group">
          <label class="form-label">ICE</label>
          <input class="form-input" name="ice" value="${escHtml(cl?.ice || '')}"/>
        </div>
        <div class="form-group">
          <label class="form-label">RC</label>
          <input class="form-input" name="rc" value="${escHtml(cl?.rc || '')}"/>
        </div>
        <div class="form-group">
          <label class="form-label">Statut</label>
          <select class="form-select" name="status">
            <option value="active" ${cl?.status !== 'inactif' ? 'selected' : ''}>Actif</option>
            <option value="inactif" ${cl?.status === 'inactif' ? 'selected' : ''}>Inactif</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal').remove()">Annuler</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Enregistrer</button>
      </div>
    </form>
  </div>`);
}

function saveClient(e, id) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  data.companyId = State.currentCompany.id;
  if (id) { DB.updateItem('clients', id, data); showToast('Client modifié avec succès'); }
  else { DB.addItem('clients', data); showToast('Client ajouté avec succès'); }
  document.getElementById('active-modal')?.remove();
  navigateTo('clients');
}

function deleteClient(id) {
  confirm('Supprimer ce client ? Cette action est irréversible.', () => {
    DB.deleteItem('clients', id);
    showToast('Client supprimé', 'warning');
    navigateTo('clients');
  });
}

function viewClientHistory(clientId) {
  const cl = DB.getList('clients').find(c => c.id === clientId);
  const devis = DB.getList('devis').filter(d => d.clientId === clientId);
  const factures = DB.getList('factures').filter(f => f.clientId === clientId);
  const totalFA = factures.reduce((s, f) => s + calcFactureTotal(f), 0);

  openModal(`<div class="modal modal-lg">
    <div class="modal-header">
      <h2 class="modal-title">Historique – ${escHtml(cl?.name)}</h2>
      <button class="modal-close" onclick="document.getElementById('active-modal').remove()"><i class="fas fa-times"></i></button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;">
      <div class="budget-stat"><div class="val" style="color:#2563eb;">${devis.length}</div><div class="lbl">Devis</div></div>
      <div class="budget-stat"><div class="val" style="color:#7c3aed;">${factures.length}</div><div class="lbl">Factures</div></div>
      <div class="budget-stat"><div class="val" style="color:#16a34a;">${fmtMoney(totalFA)}</div><div class="lbl">CA Total</div></div>
    </div>
    <h4 style="font-size:14px;font-weight:700;margin-bottom:10px;">Devis</h4>
    ${devis.length > 0 ? `<div class="table-wrapper" style="margin-bottom:16px;"><table><thead><tr><th>N°</th><th>Date</th><th>Montant</th><th>Statut</th></tr></thead><tbody>
      ${devis.map(d => `<tr><td>${escHtml(d.numero)}</td><td>${fmtDate(d.date)}</td><td>${fmtMoney(calcDevisTotal(d))}</td><td><span class="badge ${devisBadge(d.status)}">${d.status}</span></td></tr>`).join('')}
    </tbody></table></div>` : '<p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px;">Aucun devis</p>'}
    <h4 style="font-size:14px;font-weight:700;margin-bottom:10px;">Factures</h4>
    ${factures.length > 0 ? `<div class="table-wrapper"><table><thead><tr><th>N°</th><th>Date</th><th>Montant</th><th>Statut</th></tr></thead><tbody>
      ${factures.map(f => `<tr><td>${escHtml(f.numero)}</td><td>${fmtDate(f.date)}</td><td>${fmtMoney(calcFactureTotal(f))}</td><td><span class="badge ${factureBadge(f.status)}">${f.status}</span></td></tr>`).join('')}
    </tbody></table></div>` : '<p style="color:var(--text-secondary);font-size:13px;">Aucune facture</p>'}
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="document.getElementById('active-modal').remove()">Fermer</button>
    </div>
  </div>`);
}

// ===== DEVIS =====
function calcDevisTotal(d) {
  const ht = (d.lignes || []).reduce((s, l) => s + (l.qte * l.pu), 0);
  const remise = ht * (d.remise || 0) / 100;
  const htAR = ht - remise;
  const tva = htAR * 0.2;
  return htAR + tva;
}

function calcFactureTotal(f) {
  const ht = (f.lignes || []).reduce((s, l) => s + (l.qte * l.pu), 0);
  const remise = ht * (f.remise || 0) / 100;
  const htAR = ht - remise;
  const tva = (f.lignes || []).reduce((s, l) => s + (l.qte * l.pu * (l.tva || 20) / 100), 0);
  return htAR + tva * (1 - (f.remise || 0) / 100);
}

function devisBadge(s) {
  return { 'brouillon': 'badge-secondary', 'envoyé': 'badge-info', 'accepté': 'badge-success', 'refusé': 'badge-danger' }[s] || 'badge-secondary';
}
function factureBadge(s) {
  return { 'payée': 'badge-success', 'non payée': 'badge-danger', 'partielle': 'badge-warning', 'annulée': 'badge-secondary' }[s] || 'badge-secondary';
}

function renderDevis() {
  const cid = State.currentCompany?.id;
  const devisList = DB.getList('devis').filter(d => d.companyId === cid);
  const clients = DB.getList('clients').filter(c => c.companyId === cid);

  return `
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
  <div>
    <h2 style="font-size:18px;font-weight:700;">Devis <span class="badge badge-info">${devisList.length}</span></h2>
    <p style="color:var(--text-secondary);font-size:13px;margin-top:2px;">Création et suivi des devis</p>
  </div>
  <button class="btn btn-primary" onclick="openDevisModal()"><i class="fas fa-plus"></i> Nouveau devis</button>
</div>
<div class="filters-bar">
  <div class="search-input-wrap" style="flex:1;">
    <i class="fas fa-search"></i>
    <input class="form-input" placeholder="Rechercher..." oninput="filterTable('devis-tbody', this.value, [0,1])" style="padding-left:34px;"/>
  </div>
  <select class="form-select" style="width:160px;" onchange="filterByStatus('devis-tbody', this.value, 3)">
    <option value="">Tous les statuts</option>
    <option value="brouillon">Brouillon</option>
    <option value="envoyé">Envoyé</option>
    <option value="accepté">Accepté</option>
    <option value="refusé">Refusé</option>
  </select>
</div>
<div class="table-wrapper">
  <table>
    <thead>
      <tr><th>Numéro</th><th>Client</th><th>Date</th><th>Statut</th><th>Montant TTC</th><th>Actions</th></tr>
    </thead>
    <tbody id="devis-tbody">
      ${devisList.map(d => {
        const cl = clients.find(c => c.id === d.clientId);
        const total = calcDevisTotal(d);
        return `<tr>
          <td><span style="font-weight:700;color:var(--primary);">${escHtml(d.numero)}</span></td>
          <td>${escHtml(cl?.name || '–')}</td>
          <td>${fmtDate(d.date)}</td>
          <td><span class="badge ${devisBadge(d.status)}">${d.status}</span></td>
          <td style="font-weight:700;">${fmtMoney(total)}</td>
          <td>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-secondary btn-sm" onclick="openDevisModal('${d.id}')"><i class="fas fa-edit"></i></button>
              <button class="btn btn-success btn-sm" onclick="convertDevisToFacture('${d.id}')" title="Convertir en facture"><i class="fas fa-file-invoice"></i></button>
              <button class="btn btn-info btn-sm" style="background:#dbeafe;color:#2563eb;" onclick="previewDoc('devis','${d.id}')"><i class="fas fa-print"></i></button>
              <button class="btn btn-danger btn-sm" onclick="deleteDevis('${d.id}')"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>`;
}

function openDevisModal(id = null) {
  const d = id ? DB.getList('devis').find(x => x.id === id) : null;
  const clients = DB.getList('clients').filter(c => c.companyId === State.currentCompany?.id);
  const nextNum = 'DEV-' + new Date().getFullYear() + '-' + String(DB.getList('devis').length + 1).padStart(3, '0');
  const lignes = d?.lignes || [{ desc: '', qte: 1, unite: 'U', pu: 0, tva: 20 }];

  openModal(`<div class="modal modal-xl">
    <div class="modal-header">
      <h2 class="modal-title">${d ? 'Modifier devis' : 'Nouveau devis'}</h2>
      <button class="modal-close" onclick="document.getElementById('active-modal').remove()"><i class="fas fa-times"></i></button>
    </div>
    <form onsubmit="saveDevis(event, '${id || ''}')">
      <div class="form-grid-3">
        <div class="form-group">
          <label class="form-label">Numéro</label>
          <input class="form-input" name="numero" value="${escHtml(d?.numero || nextNum)}" required/>
        </div>
        <div class="form-group">
          <label class="form-label">Client <span class="req">*</span></label>
          <select class="form-select" name="clientId" required>
            <option value="">-- Sélectionner --</option>
            ${clients.map(c => `<option value="${c.id}" ${d?.clientId === c.id ? 'selected' : ''}>${escHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Date <span class="req">*</span></label>
          <input class="form-input" type="date" name="date" value="${d?.date || today()}" required/>
        </div>
        <div class="form-group">
          <label class="form-label">Validité jusqu'au</label>
          <input class="form-input" type="date" name="validite" value="${d?.validite || ''}"/>
        </div>
        <div class="form-group">
          <label class="form-label">Remise globale (%)</label>
          <input class="form-input" type="number" name="remise" value="${d?.remise || 0}" min="0" max="100"/>
        </div>
        <div class="form-group">
          <label class="form-label">Statut</label>
          <select class="form-select" name="status">
            <option value="brouillon" ${d?.status === 'brouillon' || !d ? 'selected' : ''}>Brouillon</option>
            <option value="envoyé" ${d?.status === 'envoyé' ? 'selected' : ''}>Envoyé</option>
            <option value="accepté" ${d?.status === 'accepté' ? 'selected' : ''}>Accepté</option>
            <option value="refusé" ${d?.status === 'refusé' ? 'selected' : ''}>Refusé</option>
          </select>
        </div>
      </div>
      <div style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <label class="form-label" style="margin:0;">Lignes du devis</label>
          <button type="button" class="btn btn-secondary btn-sm" onclick="addLigne('devis-lignes')"><i class="fas fa-plus"></i> Ajouter ligne</button>
        </div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Description</th><th style="width:80px;">Qté</th><th style="width:80px;">Unité</th><th style="width:100px;">P.U. HT</th><th style="width:80px;">TVA%</th><th style="width:100px;">Total HT</th><th style="width:40px;"></th></tr></thead>
            <tbody id="devis-lignes">
              ${lignes.map((l, i) => renderLigneRow(l, i)).join('')}
            </tbody>
          </table>
        </div>
        <div style="text-align:right;margin-top:12px;font-size:14px;" id="devis-totaux">
          ${calcTotauxHtml(lignes, d?.remise || 0)}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes / Conditions</label>
        <textarea class="form-textarea" name="notes">${escHtml(d?.notes || '')}</textarea>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal').remove()">Annuler</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Enregistrer</button>
      </div>
    </form>
  </div>`);
}

function renderLigneRow(l, i) {
  const totalHT = (l.qte || 0) * (l.pu || 0);
  return `<tr id="ligne-row-${i}">
    <td><input class="form-input" name="desc_${i}" value="${escHtml(l.desc || '')}" placeholder="Description" onchange="updateTotaux()"/></td>
    <td><input class="form-input" type="number" name="qte_${i}" value="${l.qte || 1}" min="0" step="0.01" onchange="updateTotaux()" style="text-align:right;"/></td>
    <td><select class="form-select" name="unite_${i}"><option ${l.unite==='U'?'selected':''}>U</option><option ${l.unite==='m²'?'selected':''}>m²</option><option ${l.unite==='ml'?'selected':''}>ml</option><option ${l.unite==='kg'?'selected':''}>kg</option><option ${l.unite==='Fft'?'selected':''}>Fft</option><option ${l.unite==='j'?'selected':''}>j</option></select></td>
    <td><input class="form-input" type="number" name="pu_${i}" value="${l.pu || 0}" min="0" step="0.01" onchange="updateTotaux()" style="text-align:right;"/></td>
    <td><input class="form-input" type="number" name="tva_${i}" value="${l.tva || 20}" min="0" max="100" onchange="updateTotaux()" style="text-align:right;"/></td>
    <td style="text-align:right;font-weight:600;" id="ligne-total-${i}">${fmtNum(totalHT)}</td>
    <td><button type="button" class="btn btn-ghost btn-sm" onclick="removeLigne(${i})" style="color:#dc2626;"><i class="fas fa-times"></i></button></td>
  </tr>`;
}

let ligneCount = 0;
function addLigne(tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const rows = tbody.querySelectorAll('tr');
  const i = rows.length;
  const row = document.createElement('tr');
  row.id = `ligne-row-${i}`;
  row.innerHTML = renderLigneRow({ desc: '', qte: 1, unite: 'U', pu: 0, tva: 20 }, i).replace(/<tr[^>]*>|<\/tr>/g, '');
  tbody.appendChild(row);
}

function removeLigne(i) {
  document.getElementById(`ligne-row-${i}`)?.remove();
  updateTotaux();
}

function updateTotaux() {
  const tbody = document.getElementById('devis-lignes') || document.getElementById('facture-lignes');
  if (!tbody) return;
  const rows = tbody.querySelectorAll('tr');
  let totalHT = 0, totalTVA = 0;
  rows.forEach((row, i) => {
    const qte = parseFloat(row.querySelector(`[name^="qte_"]`)?.value || 0);
    const pu = parseFloat(row.querySelector(`[name^="pu_"]`)?.value || 0);
    const tva = parseFloat(row.querySelector(`[name^="tva_"]`)?.value || 20);
    const ht = qte * pu;
    totalHT += ht;
    totalTVA += ht * tva / 100;
    const totalEl = row.querySelector(`[id^="ligne-total-"]`);
    if (totalEl) totalEl.textContent = fmtNum(ht);
  });
  const remiseEl = document.querySelector('[name="remise"]');
  const remise = parseFloat(remiseEl?.value || 0);
  const totDiv = document.getElementById('devis-totaux') || document.getElementById('facture-totaux');
  if (totDiv) totDiv.innerHTML = calcTotauxHtml([], remise, totalHT, totalTVA);
}

function calcTotauxHtml(lignes, remise = 0, htOverride = null, tvaOverride = null) {
  let totalHT = htOverride !== null ? htOverride : (lignes || []).reduce((s, l) => s + (l.qte * l.pu), 0);
  let totalTVA = tvaOverride !== null ? tvaOverride : (lignes || []).reduce((s, l) => s + (l.qte * l.pu * (l.tva || 20) / 100), 0);
  const remiseMontant = totalHT * remise / 100;
  const htAR = totalHT - remiseMontant;
  const tvaFinal = totalTVA * (1 - remise / 100);
  const ttc = htAR + tvaFinal;
  return `<div style="display:inline-block;text-align:right;background:var(--bg-main);padding:12px 16px;border-radius:10px;border:1px solid var(--border);min-width:240px;">
    <div style="display:flex;justify-content:space-between;gap:24px;margin-bottom:4px;font-size:13px;"><span>Total HT :</span><span>${fmtMoney(totalHT)}</span></div>
    ${remise > 0 ? `<div style="display:flex;justify-content:space-between;gap:24px;margin-bottom:4px;font-size:13px;color:#dc2626;"><span>Remise (${remise}%) :</span><span>- ${fmtMoney(remiseMontant)}</span></div>` : ''}
    <div style="display:flex;justify-content:space-between;gap:24px;margin-bottom:4px;font-size:13px;"><span>TVA :</span><span>${fmtMoney(tvaFinal)}</span></div>
    <div style="display:flex;justify-content:space-between;gap:24px;font-size:15px;font-weight:800;border-top:2px solid var(--border);padding-top:6px;margin-top:6px;"><span>Total TTC :</span><span style="color:var(--primary);">${fmtMoney(ttc)}</span></div>
  </div>`;
}

function getLignesFromForm(prefix) {
  const lignes = [];
  document.querySelectorAll(`[name^="desc_${prefix ? prefix + '_' : ''}"]`).forEach((el, i) => {
    const idx = el.name.replace(/^desc_/, '');
    const qte = parseFloat(document.querySelector(`[name="qte_${idx}"]`)?.value || 1);
    const pu = parseFloat(document.querySelector(`[name="pu_${idx}"]`)?.value || 0);
    const tva = parseFloat(document.querySelector(`[name="tva_${idx}"]`)?.value || 20);
    const unite = document.querySelector(`[name="unite_${idx}"]`)?.value || 'U';
    const desc = el.value;
    if (desc || pu > 0) lignes.push({ desc, qte, unite, pu, tva });
  });
  return lignes;
}

function saveDevis(e, id) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  data.companyId = State.currentCompany.id;
  data.lignes = getLignesFromForm('');
  data.remise = parseFloat(data.remise || 0);
  if (id) { DB.updateItem('devis', id, data); showToast('Devis modifié'); }
  else { DB.addItem('devis', data); showToast('Devis créé'); }
  document.getElementById('active-modal')?.remove();
  navigateTo('devis');
}

function deleteDevis(id) {
  confirm('Supprimer ce devis ?', () => { DB.deleteItem('devis', id); showToast('Devis supprimé', 'warning'); navigateTo('devis'); });
}

function convertDevisToFacture(devisId) {
  const d = DB.getList('devis').find(x => x.id === devisId);
  if (!d) return;
  const nextNum = 'FAC-' + new Date().getFullYear() + '-' + String(DB.getList('factures').length + 1).padStart(3, '0');
  const facture = {
    companyId: d.companyId, clientId: d.clientId,
    numero: nextNum, date: today(),
    echeance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'non payée', lignes: d.lignes, remise: d.remise,
    devisId: devisId, montantPaye: 0, notes: d.notes
  };
  DB.addItem('factures', facture);
  DB.updateItem('devis', devisId, { status: 'accepté' });
  showToast(`Facture ${nextNum} créée avec succès`);
  navigateTo('factures');
}

// ===== FACTURES =====
function renderFactures() {
  const cid = State.currentCompany?.id;
  const facturesList = DB.getList('factures').filter(f => f.companyId === cid);
  const clients = DB.getList('clients').filter(c => c.companyId === cid);
  const totalCA = facturesList.reduce((s, f) => s + calcFactureTotal(f), 0);
  const totalPaye = facturesList.filter(f => f.status === 'payée').reduce((s, f) => s + calcFactureTotal(f), 0);
  const totalImpaye = totalCA - totalPaye;

  return `
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
  <div>
    <h2 style="font-size:18px;font-weight:700;">Factures <span class="badge badge-info">${facturesList.length}</span></h2>
    <p style="color:var(--text-secondary);font-size:13px;margin-top:2px;">Gestion de la facturation client</p>
  </div>
  <button class="btn btn-primary" onclick="openFactureModal()"><i class="fas fa-plus"></i> Nouvelle facture</button>
</div>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px;">
  <div class="stat-card"><div class="stat-icon" style="background:#dbeafe;color:#2563eb;">💰</div><div class="stat-info"><div class="stat-label">CA Total</div><div class="stat-value" style="font-size:18px;">${fmtMoney(totalCA)}</div></div></div>
  <div class="stat-card"><div class="stat-icon" style="background:#dcfce7;color:#16a34a;">✅</div><div class="stat-info"><div class="stat-label">Encaissé</div><div class="stat-value" style="font-size:18px;color:#16a34a;">${fmtMoney(totalPaye)}</div></div></div>
  <div class="stat-card"><div class="stat-icon" style="background:#fee2e2;color:#dc2626;">⏳</div><div class="stat-info"><div class="stat-label">À recouvrir</div><div class="stat-value" style="font-size:18px;color:#dc2626;">${fmtMoney(totalImpaye)}</div></div></div>
</div>
<div class="filters-bar">
  <div class="search-input-wrap" style="flex:1;">
    <i class="fas fa-search"></i>
    <input class="form-input" placeholder="Rechercher..." oninput="filterTable('factures-tbody', this.value, [0,1])" style="padding-left:34px;"/>
  </div>
  <select class="form-select" style="width:160px;" onchange="filterByStatus('factures-tbody', this.value, 3)">
    <option value="">Tous les statuts</option>
    <option value="payée">Payée</option>
    <option value="non payée">Non payée</option>
    <option value="partielle">Partielle</option>
    <option value="annulée">Annulée</option>
  </select>
</div>
<div class="table-wrapper">
  <table>
    <thead><tr><th>Numéro</th><th>Client</th><th>Date</th><th>Statut</th><th>Total TTC</th><th>Payé</th><th>Reste</th><th>Actions</th></tr></thead>
    <tbody id="factures-tbody">
      ${facturesList.map(f => {
        const cl = clients.find(c => c.id === f.clientId);
        const total = calcFactureTotal(f);
        const paye = f.montantPaye || 0;
        const reste = total - paye;
        return `<tr>
          <td><span style="font-weight:700;color:var(--primary);">${escHtml(f.numero)}</span></td>
          <td>${escHtml(cl?.name || '–')}</td>
          <td>${fmtDate(f.date)}</td>
          <td><span class="badge ${factureBadge(f.status)}">${f.status}</span></td>
          <td style="font-weight:700;">${fmtMoney(total)}</td>
          <td style="color:var(--success);font-weight:600;">${fmtMoney(paye)}</td>
          <td style="color:${reste > 0 ? 'var(--danger)' : 'var(--success)'};font-weight:600;">${fmtMoney(reste)}</td>
          <td>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-secondary btn-sm" onclick="openFactureModal('${f.id}')"><i class="fas fa-edit"></i></button>
              ${f.status !== 'payée' ? `<button class="btn btn-success btn-sm" onclick="marquerPaye('${f.id}')" title="Marquer payée"><i class="fas fa-check"></i></button>` : ''}
              <button class="btn btn-info btn-sm" style="background:#dbeafe;color:#2563eb;" onclick="previewDoc('facture','${f.id}')"><i class="fas fa-print"></i></button>
              <button class="btn btn-danger btn-sm" onclick="deleteFacture('${f.id}')"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>`;
}

function openFactureModal(id = null) {
  const f = id ? DB.getList('factures').find(x => x.id === id) : null;
  const clients = DB.getList('clients').filter(c => c.companyId === State.currentCompany?.id);
  const nextNum = 'FAC-' + new Date().getFullYear() + '-' + String(DB.getList('factures').length + 1).padStart(3, '0');
  const lignes = f?.lignes || [{ desc: '', qte: 1, unite: 'U', pu: 0, tva: 20 }];

  openModal(`<div class="modal modal-xl">
    <div class="modal-header">
      <h2 class="modal-title">${f ? 'Modifier facture' : 'Nouvelle facture'}</h2>
      <button class="modal-close" onclick="document.getElementById('active-modal').remove()"><i class="fas fa-times"></i></button>
    </div>
    <form onsubmit="saveFacture(event, '${id || ''}')">
      <div class="form-grid-3">
        <div class="form-group">
          <label class="form-label">Numéro</label>
          <input class="form-input" name="numero" value="${escHtml(f?.numero || nextNum)}" required/>
        </div>
        <div class="form-group">
          <label class="form-label">Client <span class="req">*</span></label>
          <select class="form-select" name="clientId" required>
            <option value="">-- Sélectionner --</option>
            ${clients.map(c => `<option value="${c.id}" ${f?.clientId === c.id ? 'selected' : ''}>${escHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Date</label>
          <input class="form-input" type="date" name="date" value="${f?.date || today()}" required/>
        </div>
        <div class="form-group">
          <label class="form-label">Échéance</label>
          <input class="form-input" type="date" name="echeance" value="${f?.echeance || ''}"/>
        </div>
        <div class="form-group">
          <label class="form-label">Remise (%)</label>
          <input class="form-input" type="number" name="remise" value="${f?.remise || 0}" min="0" max="100"/>
        </div>
        <div class="form-group">
          <label class="form-label">Statut</label>
          <select class="form-select" name="status">
            <option value="non payée" ${f?.status === 'non payée' || !f ? 'selected' : ''}>Non payée</option>
            <option value="partielle" ${f?.status === 'partielle' ? 'selected' : ''}>Partielle</option>
            <option value="payée" ${f?.status === 'payée' ? 'selected' : ''}>Payée</option>
            <option value="annulée" ${f?.status === 'annulée' ? 'selected' : ''}>Annulée</option>
          </select>
        </div>
      </div>
      <div class="form-grid-2" style="margin-bottom:0;">
        <div class="form-group">
          <label class="form-label">Montant payé (DH)</label>
          <input class="form-input" type="number" name="montantPaye" value="${f?.montantPaye || 0}" min="0" step="0.01"/>
        </div>
      </div>
      <div style="margin:16px 0;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <label class="form-label" style="margin:0;">Lignes de facturation</label>
          <button type="button" class="btn btn-secondary btn-sm" onclick="addLigne('facture-lignes')"><i class="fas fa-plus"></i> Ajouter</button>
        </div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Description</th><th>Qté</th><th>Unité</th><th>P.U. HT</th><th>TVA%</th><th>Total HT</th><th></th></tr></thead>
            <tbody id="facture-lignes">
              ${lignes.map((l, i) => renderLigneRow(l, i)).join('')}
            </tbody>
          </table>
        </div>
        <div style="text-align:right;margin-top:12px;" id="facture-totaux">
          ${calcTotauxHtml(lignes, f?.remise || 0)}
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal').remove()">Annuler</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Enregistrer</button>
      </div>
    </form>
  </div>`);
}

function saveFacture(e, id) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  data.companyId = State.currentCompany.id;
  data.lignes = getLignesFromForm('');
  data.remise = parseFloat(data.remise || 0);
  data.montantPaye = parseFloat(data.montantPaye || 0);
  if (id) { DB.updateItem('factures', id, data); showToast('Facture modifiée'); }
  else { DB.addItem('factures', data); showToast('Facture créée'); }
  document.getElementById('active-modal')?.remove();
  navigateTo('factures');
}

function marquerPaye(id) {
  const f = DB.getList('factures').find(x => x.id === id);
  if (!f) return;
  const total = calcFactureTotal(f);
  DB.updateItem('factures', id, { status: 'payée', montantPaye: total });
  showToast('Facture marquée comme payée');
  navigateTo('factures');
}

function deleteFacture(id) {
  confirm('Supprimer cette facture ?', () => { DB.deleteItem('factures', id); showToast('Facture supprimée', 'warning'); navigateTo('factures'); });
}

// ===== CHANTIERS =====
function renderChantiers() {
  const cid = State.currentCompany?.id;
  const chantiers = DB.getList('chantiers').filter(c => c.companyId === cid);
  const clients = DB.getList('clients').filter(c => c.companyId === cid);

  const statusConfig = {
    'en_cours': { label: 'En cours', badge: 'badge-info', icon: '🔨' },
    'planifié': { label: 'Planifié', badge: 'badge-secondary', icon: '📋' },
    'terminé': { label: 'Terminé', badge: 'badge-success', icon: '✅' },
    'suspendu': { label: 'Suspendu', badge: 'badge-warning', icon: '⏸️' },
    'annulé': { label: 'Annulé', badge: 'badge-danger', icon: '❌' }
  };

  return `
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
  <div>
    <h2 style="font-size:18px;font-weight:700;">Chantiers <span class="badge badge-info">${chantiers.length}</span></h2>
    <p style="color:var(--text-secondary);font-size:13px;margin-top:2px;">Suivi financier et opérationnel des chantiers</p>
  </div>
  <button class="btn btn-primary" onclick="openChantierModal()"><i class="fas fa-plus"></i> Nouveau chantier</button>
</div>

<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">
  ${Object.entries(statusConfig).map(([k, v]) => {
    const n = chantiers.filter(c => c.status === k).length;
    return `<div class="card" style="text-align:center;padding:14px;">
      <div style="font-size:24px;">${v.icon}</div>
      <div style="font-size:22px;font-weight:800;margin:4px 0;">${n}</div>
      <div style="font-size:12px;color:var(--text-secondary);">${v.label}</div>
    </div>`;
  }).join('')}
</div>

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px;">
  ${chantiers.map(ch => {
    const cl = clients.find(c => c.id === ch.clientId);
    const entrees = DB.getList('chantierEntrees').filter(e => e.chantierId === ch.id).reduce((s, e) => s + e.montant, 0);
    const achats = DB.getList('chantierAchats').filter(a => a.chantierId === ch.id).reduce((s, a) => s + a.montant, 0);
    const mo = DB.getList('chantierMO').filter(m => m.chantierId === ch.id).reduce((s, m) => s + m.montant, 0);
    const sorties = achats + mo;
    const resultat = entrees - sorties;
    const pctBudget = ch.budget > 0 ? Math.round((sorties / ch.budget) * 100) : 0;
    const pctColor = pctBudget < 70 ? '#22c55e' : pctBudget <= 100 ? '#f97316' : '#ef4444';
    const cfg = statusConfig[ch.status] || statusConfig['planifié'];

    return `<div class="chantier-card" onclick="openChantierDetail('${ch.id}')">
      <div class="chantier-status-bar" style="background:${pctColor};opacity:0.3;"></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div>
          <h3 style="font-size:15px;font-weight:700;color:var(--text-primary);">${escHtml(ch.name)}</h3>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;"><i class="fas fa-user"></i> ${escHtml(cl?.name || '–')}</div>
        </div>
        <span class="badge ${cfg.badge}">${cfg.label}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px;">
        <div style="background:var(--bg-main);border-radius:8px;padding:8px;text-align:center;">
          <div style="font-size:11px;color:var(--text-secondary);">Entrées</div>
          <div style="font-weight:700;color:#16a34a;font-size:14px;">${fmtMoney(entrees)}</div>
        </div>
        <div style="background:var(--bg-main);border-radius:8px;padding:8px;text-align:center;">
          <div style="font-size:11px;color:var(--text-secondary);">Sorties</div>
          <div style="font-weight:700;color:#dc2626;font-size:14px;">${fmtMoney(sorties)}</div>
        </div>
      </div>
      <div style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
          <span style="color:var(--text-secondary);">Budget consommé</span>
          <span style="font-weight:700;color:${pctColor};">${pctBudget}%</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar ${pctBudget < 70 ? 'progress-green' : pctBudget <= 100 ? 'progress-orange' : 'progress-red'}" style="width:${Math.min(pctBudget, 100)}%"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-secondary);margin-top:3px;">
          <span>${fmtMoney(sorties)}</span>
          <span>/ ${fmtMoney(ch.budget)}</span>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:12px;color:var(--text-secondary);"><i class="fas fa-calendar"></i> ${fmtDate(ch.dateDebut)} – ${fmtDate(ch.dateFin)}</div>
        <div style="font-weight:700;font-size:14px;color:${resultat >= 0 ? '#16a34a' : '#dc2626'};">${resultat >= 0 ? '+' : ''}${fmtMoney(resultat)}</div>
      </div>
    </div>`;
  }).join('')}
</div>
${chantiers.length === 0 ? '<div class="empty-state"><div class="icon">🏗️</div><h3>Aucun chantier</h3><p>Commencez par créer votre premier chantier.</p></div>' : ''}`;
}

function openChantierModal(id = null) {
  const ch = id ? DB.getList('chantiers').find(x => x.id === id) : null;
  const clients = DB.getList('clients').filter(c => c.companyId === State.currentCompany?.id);

  openModal(`<div class="modal">
    <div class="modal-header">
      <h2 class="modal-title">${ch ? 'Modifier chantier' : 'Nouveau chantier'}</h2>
      <button class="modal-close" onclick="document.getElementById('active-modal').remove()"><i class="fas fa-times"></i></button>
    </div>
    <form onsubmit="saveChantier(event, '${id || ''}')">
      <div class="form-grid-2">
        <div class="form-group" style="grid-column:1/-1;">
          <label class="form-label">Nom du chantier <span class="req">*</span></label>
          <input class="form-input" name="name" value="${escHtml(ch?.name || '')}" required/>
        </div>
        <div class="form-group">
          <label class="form-label">Client <span class="req">*</span></label>
          <select class="form-select" name="clientId" required>
            <option value="">-- Sélectionner --</option>
            ${clients.map(c => `<option value="${c.id}" ${ch?.clientId === c.id ? 'selected' : ''}>${escHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Budget total (DH) <span class="req">*</span></label>
          <input class="form-input" type="number" name="budget" value="${ch?.budget || ''}" required min="0"/>
        </div>
        <div class="form-group">
          <label class="form-label">Date début</label>
          <input class="form-input" type="date" name="dateDebut" value="${ch?.dateDebut || today()}"/>
        </div>
        <div class="form-group">
          <label class="form-label">Date fin prévue</label>
          <input class="form-input" type="date" name="dateFin" value="${ch?.dateFin || ''}"/>
        </div>
        <div class="form-group">
          <label class="form-label">Adresse</label>
          <input class="form-input" name="address" value="${escHtml(ch?.address || '')}"/>
        </div>
        <div class="form-group">
          <label class="form-label">Statut</label>
          <select class="form-select" name="status">
            <option value="planifié" ${ch?.status === 'planifié' ? 'selected' : ''}>Planifié</option>
            <option value="en_cours" ${ch?.status === 'en_cours' || !ch ? 'selected' : ''}>En cours</option>
            <option value="suspendu" ${ch?.status === 'suspendu' ? 'selected' : ''}>Suspendu</option>
            <option value="terminé" ${ch?.status === 'terminé' ? 'selected' : ''}>Terminé</option>
            <option value="annulé" ${ch?.status === 'annulé' ? 'selected' : ''}>Annulé</option>
          </select>
        </div>
        <div class="form-group" style="grid-column:1/-1;">
          <label class="form-label">Description</label>
          <textarea class="form-textarea" name="description">${escHtml(ch?.description || '')}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal').remove()">Annuler</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Enregistrer</button>
      </div>
    </form>
  </div>`);
}

function saveChantier(e, id) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  data.companyId = State.currentCompany.id;
  data.budget = parseFloat(data.budget || 0);
  if (id) { DB.updateItem('chantiers', id, data); showToast('Chantier modifié'); }
  else { DB.addItem('chantiers', data); showToast('Chantier créé'); }
  document.getElementById('active-modal')?.remove();
  navigateTo('chantiers');
}

function openChantierDetail(chantierId) {
  const ch = DB.getList('chantiers').find(x => x.id === chantierId);
  if (!ch) return;
  const cid = State.currentCompany?.id;
  const cl = DB.getList('clients').find(c => c.id === ch.clientId);
  const fournisseurs = DB.getList('fournisseurs').filter(f => f.companyId === cid);
  const entrees = DB.getList('chantierEntrees').filter(e => e.chantierId === chantierId);
  const achats = DB.getList('chantierAchats').filter(a => a.chantierId === chantierId);
  const mo = DB.getList('chantierMO').filter(m => m.chantierId === chantierId);

  const totalEntrees = entrees.reduce((s, e) => s + e.montant, 0);
  const totalAchats = achats.reduce((s, a) => s + a.montant, 0);
  const totalMO = mo.reduce((s, m) => s + m.montant, 0);
  const totalSorties = totalAchats + totalMO;
  const resultat = totalEntrees - totalSorties;
  const pctBudget = ch.budget > 0 ? Math.round((totalSorties / ch.budget) * 100) : 0;
  const pctColor = pctBudget < 70 ? 'progress-green' : pctBudget <= 100 ? 'progress-orange' : 'progress-red';

  openModal(`<div class="modal modal-xl">
    <div class="modal-header">
      <div>
        <h2 class="modal-title">🏗️ ${escHtml(ch.name)}</h2>
        <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">Client: ${escHtml(cl?.name || '–')} | ${escHtml(ch.address || '')}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button class="btn btn-secondary btn-sm" onclick="openChantierModal('${ch.id}');document.getElementById('active-modal').remove()"><i class="fas fa-edit"></i></button>
        <button class="modal-close" onclick="document.getElementById('active-modal').remove()"><i class="fas fa-times"></i></button>
      </div>
    </div>

    <!-- Résumé financier -->
    <div class="budget-stats" style="margin-bottom:16px;">
      <div class="budget-stat"><div class="val" style="color:#2563eb;">${fmtMoney(ch.budget)}</div><div class="lbl">Budget</div></div>
      <div class="budget-stat"><div class="val" style="color:#16a34a;">${fmtMoney(totalEntrees)}</div><div class="lbl">Entrées</div></div>
      <div class="budget-stat"><div class="val" style="color:#dc2626;">${fmtMoney(totalSorties)}</div><div class="lbl">Sorties</div></div>
      <div class="budget-stat"><div class="val" style="color:${resultat >= 0 ? '#16a34a' : '#dc2626'};">${resultat >= 0 ? '+' : ''}${fmtMoney(resultat)}</div><div class="lbl">Résultat</div></div>
    </div>

    <!-- Barre budget -->
    <div style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;">
        <span style="font-weight:600;">Budget consommé: <span style="color:${pctBudget < 70 ? '#22c55e' : pctBudget <= 100 ? '#f97316' : '#ef4444'};">${pctBudget}%</span></span>
        <span style="color:var(--text-secondary);">${fmtMoney(totalSorties)} / ${fmtMoney(ch.budget)}</span>
      </div>
      <div class="progress-bar-container" style="height:14px;">
        <div class="progress-bar ${pctColor}" style="width:${Math.min(pctBudget, 100)}%"></div>
      </div>
      ${pctBudget > 100 ? '<div style="color:#dc2626;font-size:12px;margin-top:4px;font-weight:600;">⚠️ Dépassement de budget de '+fmtMoney(totalSorties - ch.budget)+'</div>' : ''}
    </div>

    <!-- Canvas graphique -->
    <div style="margin-bottom:16px;" id="ch-chart-wrap">
      <canvas id="ch-chart" height="120"></canvas>
    </div>

    <!-- TABS -->
    <div class="tabs-nav">
      <button class="tab-btn active" id="tab-entrees-btn" onclick="showChTab('entrees')"><i class="fas fa-arrow-down" style="color:#16a34a;"></i> Entrées (${entrees.length})</button>
      <button class="tab-btn" id="tab-achats-btn" onclick="showChTab('achats')"><i class="fas fa-shopping-cart" style="color:#dc2626;"></i> Achats (${achats.length})</button>
      <button class="tab-btn" id="tab-mo-btn" onclick="showChTab('mo')"><i class="fas fa-users" style="color:#f97316;"></i> Main d'œuvre (${mo.length})</button>
    </div>

    <!-- Tab: Entrées -->
    <div id="ch-tab-entrees">
      <div style="display:flex;justify-content:flex-end;margin-bottom:10px;">
        <button class="btn btn-success btn-sm" onclick="openEntreeModal('${chantierId}')"><i class="fas fa-plus"></i> Ajouter entrée</button>
      </div>
      ${entrees.length > 0 ? `<div class="table-wrapper"><table><thead><tr><th>Date</th><th>Description</th><th>Mode</th><th>Montant</th><th></th></tr></thead><tbody>
        ${entrees.map(e => `<tr><td>${fmtDate(e.date)}</td><td>${escHtml(e.description)}</td><td><span class="badge badge-info">${e.mode}</span></td><td style="font-weight:700;color:#16a34a;">${fmtMoney(e.montant)}</td><td><button class="btn btn-danger btn-sm" onclick="deleteChantierItem('chantierEntrees','${e.id}','${chantierId}')"><i class="fas fa-trash"></i></button></td></tr>`).join('')}
      </tbody></table></div>` : '<p style="color:var(--text-secondary);font-size:13px;padding:16px 0;">Aucune entrée enregistrée</p>'}
    </div>

    <!-- Tab: Achats -->
    <div id="ch-tab-achats" style="display:none;">
      <div style="display:flex;justify-content:flex-end;margin-bottom:10px;">
        <button class="btn btn-danger btn-sm" onclick="openAchatModal('${chantierId}')"><i class="fas fa-plus"></i> Ajouter achat</button>
      </div>
      ${achats.length > 0 ? `<div class="table-wrapper"><table><thead><tr><th>Date</th><th>Fournisseur</th><th>Produit</th><th>Description</th><th>Montant</th><th></th></tr></thead><tbody>
        ${achats.map(a => {
          const four = fournisseurs.find(f => f.id === a.fournisseurId);
          return `<tr><td>${fmtDate(a.date)}</td><td>${escHtml(four?.name || '–')}</td><td>${escHtml(a.produit)}</td><td style="font-size:12px;color:var(--text-secondary);">${escHtml(a.description || '')}</td><td style="font-weight:700;color:#dc2626;">${fmtMoney(a.montant)}</td><td><button class="btn btn-danger btn-sm" onclick="deleteChantierItem('chantierAchats','${a.id}','${chantierId}')"><i class="fas fa-trash"></i></button></td></tr>`;
        }).join('')}
      </tbody></table></div>` : '<p style="color:var(--text-secondary);font-size:13px;padding:16px 0;">Aucun achat enregistré</p>'}
    </div>

    <!-- Tab: Main d'oeuvre -->
    <div id="ch-tab-mo" style="display:none;">
      <div style="display:flex;justify-content:flex-end;margin-bottom:10px;">
        <button class="btn btn-warning btn-sm" onclick="openMOModal('${chantierId}')"><i class="fas fa-plus"></i> Ajouter MO</button>
      </div>
      ${mo.length > 0 ? `<div class="table-wrapper"><table><thead><tr><th>Date</th><th>Nom</th><th>Type</th><th>Détails</th><th>Montant</th><th></th></tr></thead><tbody>
        ${mo.map(m => `<tr><td>${fmtDate(m.date)}</td><td style="font-weight:600;">${escHtml(m.nom)}</td><td><span class="badge badge-secondary">${m.type}</span></td><td style="font-size:12px;color:var(--text-secondary);">${m.type === 'journalier' ? m.jours + 'j × ' + fmtMoney(m.tarifJour) : escHtml(m.description || '')}</td><td style="font-weight:700;color:#f97316;">${fmtMoney(m.montant)}</td><td><button class="btn btn-danger btn-sm" onclick="deleteChantierItem('chantierMO','${m.id}','${chantierId}')"><i class="fas fa-trash"></i></button></td></tr>`).join('')}
      </tbody></table></div>` : '<p style="color:var(--text-secondary);font-size:13px;padding:16px 0;">Aucune main d\'œuvre enregistrée</p>'}
    </div>

    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="document.getElementById('active-modal').remove()">Fermer</button>
      <button class="btn btn-primary" onclick="exportChantierPDF('${chantierId}')"><i class="fas fa-file-pdf"></i> Export PDF</button>
    </div>
  </div>`);

  // Init chart
  setTimeout(() => {
    const ctx = document.getElementById('ch-chart');
    if (ctx) {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Budget', 'Entrées clients', 'Achats', 'Main d\'œuvre', 'Résultat'],
          datasets: [{
            data: [ch.budget, totalEntrees, totalAchats, totalMO, Math.abs(resultat)],
            backgroundColor: ['#3b82f6', '#22c55e', '#ef4444', '#f97316', resultat >= 0 ? '#22c55e' : '#ef4444'],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmtMoney(ctx.raw) } } },
          scales: { y: { ticks: { callback: v => (v / 1000) + 'k DH', color: '#94a3b8' }, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { ticks: { color: '#94a3b8' }, grid: { display: false } } }
        }
      });
    }
  }, 100);
}

function showChTab(tab) {
  ['entrees', 'achats', 'mo'].forEach(t => {
    document.getElementById(`ch-tab-${t}`)?.style.setProperty('display', t === tab ? 'block' : 'none');
    document.getElementById(`tab-${t}-btn`)?.classList.toggle('active', t === tab);
  });
}

function deleteChantierItem(store, id, chantierId) {
  confirm('Supprimer cet élément ?', () => {
    DB.deleteItem(store, id);
    showToast('Supprimé', 'warning');
    document.getElementById('active-modal')?.remove();
    openChantierDetail(chantierId);
  });
}

function openEntreeModal(chantierId) {
  document.getElementById('active-modal')?.remove();
  openModal(`<div class="modal">
    <div class="modal-header">
      <h2 class="modal-title">Nouvelle entrée (Avance client)</h2>
      <button class="modal-close" onclick="openChantierDetail('${chantierId}');document.querySelectorAll('.modal-overlay').forEach((el,i,arr)=>{if(i<arr.length-1)el.remove()})"><i class="fas fa-times"></i></button>
    </div>
    <form onsubmit="saveEntree(event,'${chantierId}')">
      <div class="form-grid-2">
        <div class="form-group"><label class="form-label">Montant (DH) <span class="req">*</span></label><input class="form-input" type="number" name="montant" required min="0" step="0.01"/></div>
        <div class="form-group"><label class="form-label">Date <span class="req">*</span></label><input class="form-input" type="date" name="date" value="${today()}" required/></div>
        <div class="form-group"><label class="form-label">Mode de paiement</label><select class="form-select" name="mode"><option>virement</option><option>chèque</option><option>espèces</option><option>autre</option></select></div>
        <div class="form-group" style="grid-column:1/-1;"><label class="form-label">Description <span class="req">*</span></label><input class="form-input" name="description" required placeholder="Ex: Avance 1er décompte"/></div>
      </div>
      <div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="openChantierDetail('${chantierId}');document.querySelectorAll('.modal-overlay').forEach((el,i,arr)=>{if(i<arr.length-1)el.remove()})">Annuler</button><button type="submit" class="btn btn-success"><i class="fas fa-save"></i> Enregistrer</button></div>
    </form>
  </div>`);
}

function saveEntree(e, chantierId) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  data.companyId = State.currentCompany.id;
  data.chantierId = chantierId;
  data.montant = parseFloat(data.montant);
  DB.addItem('chantierEntrees', data);
  showToast('Entrée enregistrée');
  document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
  openChantierDetail(chantierId);
}

function openAchatModal(chantierId) {
  const fournisseurs = DB.getList('fournisseurs').filter(f => f.companyId === State.currentCompany?.id);
  document.getElementById('active-modal')?.remove();
  openModal(`<div class="modal">
    <div class="modal-header">
      <h2 class="modal-title">Nouvel achat</h2>
      <button class="modal-close" onclick="openChantierDetail('${chantierId}');document.querySelectorAll('.modal-overlay').forEach((el,i,arr)=>{if(i<arr.length-1)el.remove()})"><i class="fas fa-times"></i></button>
    </div>
    <form onsubmit="saveAchat(event,'${chantierId}')">
      <div class="form-grid-2">
        <div class="form-group"><label class="form-label">Fournisseur</label><select class="form-select" name="fournisseurId"><option value="">-- Aucun --</option>${fournisseurs.map(f => `<option value="${f.id}">${escHtml(f.name)}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Produit / Matériau <span class="req">*</span></label><input class="form-input" name="produit" required/></div>
        <div class="form-group"><label class="form-label">Montant (DH) <span class="req">*</span></label><input class="form-input" type="number" name="montant" required min="0" step="0.01"/></div>
        <div class="form-group"><label class="form-label">Date <span class="req">*</span></label><input class="form-input" type="date" name="date" value="${today()}" required/></div>
        <div class="form-group" style="grid-column:1/-1;"><label class="form-label">Description</label><input class="form-input" name="description" placeholder="Détails de l'achat"/></div>
      </div>
      <div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="openChantierDetail('${chantierId}');document.querySelectorAll('.modal-overlay').forEach((el,i,arr)=>{if(i<arr.length-1)el.remove()})">Annuler</button><button type="submit" class="btn btn-danger"><i class="fas fa-save"></i> Enregistrer</button></div>
    </form>
  </div>`);
}

function saveAchat(e, chantierId) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  data.companyId = State.currentCompany.id;
  data.chantierId = chantierId;
  data.montant = parseFloat(data.montant);
  DB.addItem('chantierAchats', data);
  showToast('Achat enregistré');
  document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
  openChantierDetail(chantierId);
}

function openMOModal(chantierId) {
  document.getElementById('active-modal')?.remove();
  openModal(`<div class="modal">
    <div class="modal-header">
      <h2 class="modal-title">Main d'œuvre</h2>
      <button class="modal-close" onclick="openChantierDetail('${chantierId}');document.querySelectorAll('.modal-overlay').forEach((el,i,arr)=>{if(i<arr.length-1)el.remove()})"><i class="fas fa-times"></i></button>
    </div>
    <form onsubmit="saveMO(event,'${chantierId}')">
      <div class="form-grid-2">
        <div class="form-group"><label class="form-label">Nom / Prestataire <span class="req">*</span></label><input class="form-input" name="nom" required/></div>
        <div class="form-group"><label class="form-label">Type <span class="req">*</span></label>
          <select class="form-select" name="type" onchange="toggleMOType(this.value)">
            <option value="journalier">Journalier</option>
            <option value="tache">À la tâche</option>
            <option value="prestataire">Prestataire</option>
          </select>
        </div>
        <div class="form-group" id="mo-jours-wrap"><label class="form-label">Nombre de jours</label><input class="form-input" type="number" name="jours" min="0" step="0.5" onchange="calcMO()"/></div>
        <div class="form-group" id="mo-tarif-wrap"><label class="form-label">Tarif/jour (DH)</label><input class="form-input" type="number" name="tarifJour" min="0" step="0.01" onchange="calcMO()"/></div>
        <div class="form-group"><label class="form-label">Montant total (DH) <span class="req">*</span></label><input class="form-input" type="number" name="montant" id="mo-montant" required min="0" step="0.01"/></div>
        <div class="form-group"><label class="form-label">Date <span class="req">*</span></label><input class="form-input" type="date" name="date" value="${today()}" required/></div>
        <div class="form-group" style="grid-column:1/-1;" id="mo-desc-wrap" style="display:none;"><label class="form-label">Description</label><input class="form-input" name="description" placeholder="Détails"/></div>
      </div>
      <div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="openChantierDetail('${chantierId}');document.querySelectorAll('.modal-overlay').forEach((el,i,arr)=>{if(i<arr.length-1)el.remove()})">Annuler</button><button type="submit" class="btn btn-warning"><i class="fas fa-save"></i> Enregistrer</button></div>
    </form>
  </div>`);
}

function toggleMOType(type) {
  const jours = document.getElementById('mo-jours-wrap');
  const tarif = document.getElementById('mo-tarif-wrap');
  if (type === 'journalier') { jours.style.display = ''; tarif.style.display = ''; }
  else { jours.style.display = 'none'; tarif.style.display = 'none'; }
}

function calcMO() {
  const jours = parseFloat(document.querySelector('[name="jours"]')?.value || 0);
  const tarif = parseFloat(document.querySelector('[name="tarifJour"]')?.value || 0);
  if (jours && tarif) {
    const montantEl = document.getElementById('mo-montant');
    if (montantEl) montantEl.value = jours * tarif;
  }
}

function saveMO(e, chantierId) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  data.companyId = State.currentCompany.id;
  data.chantierId = chantierId;
  data.montant = parseFloat(data.montant);
  if (data.jours) data.jours = parseFloat(data.jours);
  if (data.tarifJour) data.tarifJour = parseFloat(data.tarifJour);
  DB.addItem('chantierMO', data);
  showToast('Main d\'œuvre enregistrée');
  document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
  openChantierDetail(chantierId);
}

function exportChantierPDF(chantierId) {
  const ch = DB.getList('chantiers').find(x => x.id === chantierId);
  if (!ch) return;
  const cl = DB.getList('clients').find(c => c.id === ch.clientId);
  const entrees = DB.getList('chantierEntrees').filter(e => e.chantierId === chantierId);
  const achats = DB.getList('chantierAchats').filter(a => a.chantierId === chantierId);
  const mo = DB.getList('chantierMO').filter(m => m.chantierId === chantierId);
  const totalEntrees = entrees.reduce((s, e) => s + e.montant, 0);
  const totalAchats = achats.reduce((s, a) => s + a.montant, 0);
  const totalMO = mo.reduce((s, m) => s + m.montant, 0);
  const totalSorties = totalAchats + totalMO;
  const resultat = totalEntrees - totalSorties;
  const company = State.currentCompany;

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>Rapport Chantier</title><style>
    body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:30px;}
    h1{font-size:20px;color:#2563eb;} h2{font-size:15px;border-bottom:2px solid #2563eb;padding-bottom:6px;margin-top:20px;}
    table{width:100%;border-collapse:collapse;margin:10px 0;} th{background:#2563eb;color:#fff;padding:8px;text-align:left;}
    td{padding:7px 8px;border-bottom:1px solid #e2e8f0;} .total{font-weight:bold;font-size:15px;}
    .green{color:#16a34a;} .red{color:#dc2626;} .right{text-align:right;}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #e2e8f0;}
  </style></head><body>
  <div class="header">
    <div><h1>🏗️ BatiGest Pro</h1><div>${escHtml(company?.name || '')}</div></div>
    <div style="text-align:right;"><div style="font-size:18px;font-weight:bold;">RAPPORT CHANTIER</div><div>Généré le ${fmtDate(new Date())}</div></div>
  </div>
  <h2>Informations du chantier</h2>
  <table><tr><td><b>Nom:</b></td><td>${escHtml(ch.name)}</td><td><b>Client:</b></td><td>${escHtml(cl?.name || '–')}</td></tr>
  <tr><td><b>Budget:</b></td><td class="total">${fmtMoney(ch.budget)}</td><td><b>Statut:</b></td><td>${ch.status}</td></tr>
  <tr><td><b>Début:</b></td><td>${fmtDate(ch.dateDebut)}</td><td><b>Fin prévue:</b></td><td>${fmtDate(ch.dateFin)}</td></tr>
  <tr><td><b>Adresse:</b></td><td colspan="3">${escHtml(ch.address || '–')}</td></tr></table>
  <h2>Résumé Financier</h2>
  <table>
    <tr><th>Indicateur</th><th class="right">Montant</th></tr>
    <tr><td>Budget total</td><td class="right">${fmtMoney(ch.budget)}</td></tr>
    <tr><td>Total entrées (avances)</td><td class="right green">${fmtMoney(totalEntrees)}</td></tr>
    <tr><td>Total achats matériaux</td><td class="right red">${fmtMoney(totalAchats)}</td></tr>
    <tr><td>Total main d'œuvre</td><td class="right red">${fmtMoney(totalMO)}</td></tr>
    <tr><td><b>Total sorties</b></td><td class="right red"><b>${fmtMoney(totalSorties)}</b></td></tr>
    <tr><td class="total">RÉSULTAT NET</td><td class="right total ${resultat >= 0 ? 'green' : 'red'}">${resultat >= 0 ? '+' : ''}${fmtMoney(resultat)}</td></tr>
  </table>
  <h2>Détail des entrées</h2>
  <table><tr><th>Date</th><th>Description</th><th>Mode</th><th class="right">Montant</th></tr>
  ${entrees.map(e => `<tr><td>${fmtDate(e.date)}</td><td>${escHtml(e.description)}</td><td>${e.mode}</td><td class="right green">${fmtMoney(e.montant)}</td></tr>`).join('')}
  <tr><td colspan="3"><b>Total</b></td><td class="right green"><b>${fmtMoney(totalEntrees)}</b></td></tr></table>
  <h2>Détail des achats</h2>
  <table><tr><th>Date</th><th>Produit</th><th>Description</th><th class="right">Montant</th></tr>
  ${achats.map(a => `<tr><td>${fmtDate(a.date)}</td><td>${escHtml(a.produit)}</td><td>${escHtml(a.description || '')}</td><td class="right red">${fmtMoney(a.montant)}</td></tr>`).join('')}
  <tr><td colspan="3"><b>Total</b></td><td class="right red"><b>${fmtMoney(totalAchats)}</b></td></tr></table>
  <h2>Détail main d'œuvre</h2>
  <table><tr><th>Date</th><th>Nom</th><th>Type</th><th>Détails</th><th class="right">Montant</th></tr>
  ${mo.map(m => `<tr><td>${fmtDate(m.date)}</td><td>${escHtml(m.nom)}</td><td>${m.type}</td><td>${m.type === 'journalier' ? m.jours + 'j × ' + fmtMoney(m.tarifJour) : escHtml(m.description || '')}</td><td class="right red">${fmtMoney(m.montant)}</td></tr>`).join('')}
  <tr><td colspan="4"><b>Total</b></td><td class="right red"><b>${fmtMoney(totalMO)}</b></td></tr></table>
  <div style="text-align:center;margin-top:30px;color:#94a3b8;font-size:11px;">Généré par BatiGest Pro – ${escHtml(company?.name || '')}</div>
  <script>window.print();<\/script></body></html>`);
}

// ===== STOCK =====
function renderStock() {
  const cid = State.currentCompany?.id;
  const produits = DB.getList('produits').filter(p => p.companyId === cid);
  const alertes = produits.filter(p => p.stock <= p.stockMin);

  return `
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
  <div>
    <h2 style="font-size:18px;font-weight:700;">Stock <span class="badge badge-info">${produits.length}</span></h2>
    ${alertes.length > 0 ? `<div style="color:#dc2626;font-size:13px;margin-top:2px;"><i class="fas fa-exclamation-triangle"></i> ${alertes.length} produit(s) sous seuil minimum</div>` : ''}
  </div>
  <button class="btn btn-primary" onclick="openProduitModal()"><i class="fas fa-plus"></i> Nouveau produit</button>
</div>
<div class="filters-bar">
  <div class="search-input-wrap" style="flex:1;">
    <i class="fas fa-search"></i>
    <input class="form-input" placeholder="Rechercher produit..." oninput="filterTable('stock-tbody', this.value, [0,1,2])" style="padding-left:34px;"/>
  </div>
</div>
<div class="table-wrapper">
  <table>
    <thead><tr><th>Référence</th><th>Désignation</th><th>Catégorie</th><th>Unité</th><th>Stock actuel</th><th>Seuil min.</th><th>Prix unit.</th><th>Valeur stock</th><th>Actions</th></tr></thead>
    <tbody id="stock-tbody">
      ${produits.map(p => {
        const alerte = p.stock <= p.stockMin;
        const valeur = p.stock * p.price;
        return `<tr>
          <td><code style="background:var(--bg-main);padding:2px 6px;border-radius:4px;font-size:12px;">${escHtml(p.ref)}</code></td>
          <td style="font-weight:600;">${escHtml(p.name)}</td>
          <td><span class="badge badge-secondary">${escHtml(p.category)}</span></td>
          <td>${escHtml(p.unit)}</td>
          <td>
            <span style="font-weight:700;color:${alerte ? '#dc2626' : '#16a34a'};">${fmtNum(p.stock)}</span>
            ${alerte ? '<span class="badge badge-danger" style="font-size:9px;margin-left:4px;">ALERTE</span>' : ''}
          </td>
          <td style="color:var(--text-secondary);">${fmtNum(p.stockMin)}</td>
          <td>${fmtMoney(p.price)}</td>
          <td style="font-weight:600;">${fmtMoney(valeur)}</td>
          <td>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-success btn-sm" onclick="mouvementStock('${p.id}','entree')" title="Entrée stock"><i class="fas fa-arrow-down"></i></button>
              <button class="btn btn-warning btn-sm" onclick="mouvementStock('${p.id}','sortie')" title="Sortie stock"><i class="fas fa-arrow-up"></i></button>
              <button class="btn btn-secondary btn-sm" onclick="openProduitModal('${p.id}')"><i class="fas fa-edit"></i></button>
              <button class="btn btn-danger btn-sm" onclick="deleteProduit('${p.id}')"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>
<div style="margin-top:12px;padding:12px 16px;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;display:flex;gap:24px;flex-wrap:wrap;">
  <div style="font-size:13px;"><span style="color:var(--text-secondary);">Valeur totale stock: </span><span style="font-weight:700;color:var(--primary);">${fmtMoney(produits.reduce((s, p) => s + (p.stock * p.price), 0))}</span></div>
  <div style="font-size:13px;"><span style="color:var(--text-secondary);">Références: </span><span style="font-weight:700;">${produits.length}</span></div>
  <div style="font-size:13px;"><span style="color:var(--text-secondary);">Alertes: </span><span style="font-weight:700;color:#dc2626;">${alertes.length}</span></div>
</div>`;
}

function openProduitModal(id = null) {
  const p = id ? DB.getList('produits').find(x => x.id === id) : null;
  const fournisseurs = DB.getList('fournisseurs').filter(f => f.companyId === State.currentCompany?.id);
  openModal(`<div class="modal">
    <div class="modal-header">
      <h2 class="modal-title">${p ? 'Modifier produit' : 'Nouveau produit'}</h2>
      <button class="modal-close" onclick="document.getElementById('active-modal').remove()"><i class="fas fa-times"></i></button>
    </div>
    <form onsubmit="saveProduit(event,'${id || ''}')">
      <div class="form-grid-2">
        <div class="form-group"><label class="form-label">Référence <span class="req">*</span></label><input class="form-input" name="ref" value="${escHtml(p?.ref || '')}" required/></div>
        <div class="form-group"><label class="form-label">Désignation <span class="req">*</span></label><input class="form-input" name="name" value="${escHtml(p?.name || '')}" required/></div>
        <div class="form-group"><label class="form-label">Catégorie</label><input class="form-input" name="category" value="${escHtml(p?.category || '')}" placeholder="matériaux, métaux..."/></div>
        <div class="form-group"><label class="form-label">Unité</label><select class="form-select" name="unit"><option ${p?.unit==='sac'?'selected':''}>sac</option><option ${p?.unit==='kg'?'selected':''}>kg</option><option ${p?.unit==='m²'?'selected':''}>m²</option><option ${p?.unit==='m³'?'selected':''}>m³</option><option ${p?.unit==='ml'?'selected':''}>ml</option><option ${p?.unit==='U'?'selected':''}>U</option><option ${p?.unit==='litre'?'selected':''}>litre</option></select></div>
        <div class="form-group"><label class="form-label">Stock actuel</label><input class="form-input" type="number" name="stock" value="${p?.stock || 0}" min="0"/></div>
        <div class="form-group"><label class="form-label">Seuil minimum</label><input class="form-input" type="number" name="stockMin" value="${p?.stockMin || 0}" min="0"/></div>
        <div class="form-group"><label class="form-label">Prix unitaire (DH)</label><input class="form-input" type="number" name="price" value="${p?.price || 0}" min="0" step="0.01"/></div>
        <div class="form-group"><label class="form-label">Fournisseur principal</label><select class="form-select" name="fournisseurId"><option value="">-- Aucun --</option>${fournisseurs.map(f => `<option value="${f.id}" ${p?.fournisseurId === f.id ? 'selected' : ''}>${escHtml(f.name)}</option>`).join('')}</select></div>
      </div>
      <div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal').remove()">Annuler</button><button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Enregistrer</button></div>
    </form>
  </div>`);
}

function saveProduit(e, id) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  data.companyId = State.currentCompany.id;
  data.stock = parseFloat(data.stock || 0);
  data.stockMin = parseFloat(data.stockMin || 0);
  data.price = parseFloat(data.price || 0);
  if (id) { DB.updateItem('produits', id, data); showToast('Produit modifié'); }
  else { DB.addItem('produits', data); showToast('Produit ajouté'); }
  document.getElementById('active-modal')?.remove();
  navigateTo('stock');
}

function deleteProduit(id) {
  confirm('Supprimer ce produit ?', () => { DB.deleteItem('produits', id); showToast('Produit supprimé', 'warning'); navigateTo('stock'); });
}

function mouvementStock(produitId, type) {
  const p = DB.getList('produits').find(x => x.id === produitId);
  openModal(`<div class="modal" style="max-width:380px;">
    <div class="modal-header">
      <h2 class="modal-title">${type === 'entree' ? '📦 Entrée stock' : '📤 Sortie stock'}</h2>
      <button class="modal-close" onclick="document.getElementById('active-modal').remove()"><i class="fas fa-times"></i></button>
    </div>
    <div style="margin-bottom:16px;padding:12px;background:var(--bg-main);border-radius:8px;">
      <div style="font-weight:600;">${escHtml(p?.name)}</div>
      <div style="font-size:13px;color:var(--text-secondary);">Stock actuel: <b style="color:var(--primary);">${p?.stock} ${p?.unit}</b></div>
    </div>
    <form onsubmit="executeMouvementStock(event,'${produitId}','${type}')">
      <div class="form-group"><label class="form-label">Quantité <span class="req">*</span></label><input class="form-input" type="number" name="qte" required min="0.01" step="0.01" placeholder="0"/></div>
      <div class="form-group"><label class="form-label">Motif</label><input class="form-input" name="motif" placeholder="Raison du mouvement"/></div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal').remove()">Annuler</button>
        <button type="submit" class="btn ${type === 'entree' ? 'btn-success' : 'btn-warning'}"><i class="fas fa-save"></i> ${type === 'entree' ? 'Entrée' : 'Sortie'}</button>
      </div>
    </form>
  </div>`);
}

function executeMouvementStock(e, produitId, type) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const qte = parseFloat(fd.get('qte') || 0);
  const p = DB.getList('produits').find(x => x.id === produitId);
  if (!p) return;
  const newStock = type === 'entree' ? p.stock + qte : Math.max(0, p.stock - qte);
  DB.updateItem('produits', produitId, { stock: newStock });
  showToast(`${type === 'entree' ? 'Entrée' : 'Sortie'} de ${qte} ${p.unit} enregistrée`);
  document.getElementById('active-modal')?.remove();
  navigateTo('stock');
}

// ===== FOURNISSEURS =====
function renderFournisseurs() {
  const cid = State.currentCompany?.id;
  const fournisseurs = DB.getList('fournisseurs').filter(f => f.companyId === cid);

  return `
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
  <div><h2 style="font-size:18px;font-weight:700;">Fournisseurs <span class="badge badge-info">${fournisseurs.length}</span></h2></div>
  <button class="btn btn-primary" onclick="openFournisseurModal()"><i class="fas fa-plus"></i> Nouveau fournisseur</button>
</div>
<div class="filters-bar">
  <div class="search-input-wrap" style="flex:1;">
    <i class="fas fa-search"></i>
    <input class="form-input" placeholder="Rechercher fournisseur..." oninput="filterTable('fournisseurs-tbody', this.value, [0,1,2])" style="padding-left:34px;"/>
  </div>
</div>
<div class="table-wrapper">
  <table>
    <thead><tr><th>Nom</th><th>Catégorie</th><th>Contact</th><th>Ville</th><th>ICE</th><th>Total achats</th><th>Actions</th></tr></thead>
    <tbody id="fournisseurs-tbody">
      ${fournisseurs.map(f => {
        const achats = DB.getList('chantierAchats').filter(a => a.fournisseurId === f.id);
        const totalAchats = achats.reduce((s, a) => s + a.montant, 0);
        return `<tr>
          <td style="font-weight:600;">${escHtml(f.name)}</td>
          <td><span class="badge badge-secondary">${escHtml(f.category || '–')}</span></td>
          <td><div>${escHtml(f.email)}</div><div style="font-size:12px;color:var(--text-secondary);">${escHtml(f.phone)}</div></td>
          <td>${escHtml(f.city)}</td>
          <td><code style="font-size:11px;">${escHtml(f.ice || '–')}</code></td>
          <td style="font-weight:700;color:var(--primary);">${fmtMoney(totalAchats)}</td>
          <td>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-secondary btn-sm" onclick="openFournisseurModal('${f.id}')"><i class="fas fa-edit"></i></button>
              <button class="btn btn-danger btn-sm" onclick="deleteFournisseur('${f.id}')"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>`;
}

function openFournisseurModal(id = null) {
  const f = id ? DB.getList('fournisseurs').find(x => x.id === id) : null;
  openModal(`<div class="modal">
    <div class="modal-header">
      <h2 class="modal-title">${f ? 'Modifier fournisseur' : 'Nouveau fournisseur'}</h2>
      <button class="modal-close" onclick="document.getElementById('active-modal').remove()"><i class="fas fa-times"></i></button>
    </div>
    <form onsubmit="saveFournisseur(event,'${id || ''}')">
      <div class="form-grid-2">
        <div class="form-group"><label class="form-label">Nom <span class="req">*</span></label><input class="form-input" name="name" value="${escHtml(f?.name || '')}" required/></div>
        <div class="form-group"><label class="form-label">Catégorie</label><input class="form-input" name="category" value="${escHtml(f?.category || '')}" placeholder="matériaux, électricité..."/></div>
        <div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" name="email" value="${escHtml(f?.email || '')}"/></div>
        <div class="form-group"><label class="form-label">Téléphone</label><input class="form-input" name="phone" value="${escHtml(f?.phone || '')}"/></div>
        <div class="form-group"><label class="form-label">Ville</label><input class="form-input" name="city" value="${escHtml(f?.city || '')}"/></div>
        <div class="form-group"><label class="form-label">ICE</label><input class="form-input" name="ice" value="${escHtml(f?.ice || '')}"/></div>
      </div>
      <div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal').remove()">Annuler</button><button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Enregistrer</button></div>
    </form>
  </div>`);
}

function saveFournisseur(e, id) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  data.companyId = State.currentCompany.id;
  if (id) { DB.updateItem('fournisseurs', id, data); showToast('Fournisseur modifié'); }
  else { DB.addItem('fournisseurs', data); showToast('Fournisseur ajouté'); }
  document.getElementById('active-modal')?.remove();
  navigateTo('fournisseurs');
}

function deleteFournisseur(id) {
  confirm('Supprimer ce fournisseur ?', () => { DB.deleteItem('fournisseurs', id); showToast('Fournisseur supprimé', 'warning'); navigateTo('fournisseurs'); });
}

// ===== PAIEMENTS =====
function renderPaiements() {
  const cid = State.currentCompany?.id;
  const paiements = DB.getList('paiements').filter(p => p.companyId === cid);
  const entrees = paiements.filter(p => p.type === 'entrée').reduce((s, p) => s + p.montant, 0);
  const sorties = paiements.filter(p => p.type === 'sortie').reduce((s, p) => s + p.montant, 0);
  const solde = entrees - sorties;

  return `
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
  <div><h2 style="font-size:18px;font-weight:700;">Paiements & Trésorerie</h2></div>
  <button class="btn btn-primary" onclick="openPaiementModal()"><i class="fas fa-plus"></i> Nouveau paiement</button>
</div>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px;">
  <div class="stat-card"><div class="stat-icon" style="background:#dcfce7;color:#16a34a;">📥</div><div class="stat-info"><div class="stat-label">Entrées</div><div class="stat-value" style="font-size:20px;color:#16a34a;">${fmtMoney(entrees)}</div></div></div>
  <div class="stat-card"><div class="stat-icon" style="background:#fee2e2;color:#dc2626;">📤</div><div class="stat-info"><div class="stat-label">Sorties</div><div class="stat-value" style="font-size:20px;color:#dc2626;">${fmtMoney(sorties)}</div></div></div>
  <div class="stat-card"><div class="stat-icon" style="background:${solde >= 0 ? '#dbeafe' : '#fee2e2'};color:${solde >= 0 ? '#2563eb' : '#dc2626'};">💳</div><div class="stat-info"><div class="stat-label">Solde</div><div class="stat-value" style="font-size:20px;color:${solde >= 0 ? '#2563eb' : '#dc2626'};">${fmtMoney(solde)}</div></div></div>
</div>
<div class="table-wrapper">
  <table>
    <thead><tr><th>Date</th><th>Type</th><th>Référence</th><th>Description</th><th>Mode</th><th>Montant</th><th>Actions</th></tr></thead>
    <tbody>
      ${paiements.sort((a,b) => new Date(b.date) - new Date(a.date)).map(p => `<tr>
        <td>${fmtDate(p.date)}</td>
        <td><span class="badge ${p.type === 'entrée' ? 'badge-success' : 'badge-danger'}">${p.type === 'entrée' ? '📥 Entrée' : '📤 Sortie'}</span></td>
        <td><code style="font-size:11px;">${escHtml(p.reference || '–')}</code></td>
        <td style="color:var(--text-secondary);">${escHtml(p.description)}</td>
        <td><span class="badge badge-secondary">${p.mode}</span></td>
        <td style="font-weight:700;color:${p.type === 'entrée' ? '#16a34a' : '#dc2626'};">${p.type === 'entrée' ? '+' : '-'}${fmtMoney(p.montant)}</td>
        <td><button class="btn btn-danger btn-sm" onclick="deletePaiement('${p.id}')"><i class="fas fa-trash"></i></button></td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`;
}

function openPaiementModal() {
  const clients = DB.getList('clients').filter(c => c.companyId === State.currentCompany?.id);
  openModal(`<div class="modal">
    <div class="modal-header">
      <h2 class="modal-title">Nouveau paiement</h2>
      <button class="modal-close" onclick="document.getElementById('active-modal').remove()"><i class="fas fa-times"></i></button>
    </div>
    <form onsubmit="savePaiement(event)">
      <div class="form-grid-2">
        <div class="form-group"><label class="form-label">Type <span class="req">*</span></label>
          <select class="form-select" name="type" required>
            <option value="entrée">📥 Entrée</option>
            <option value="sortie">📤 Sortie</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Date <span class="req">*</span></label><input class="form-input" type="date" name="date" value="${today()}" required/></div>
        <div class="form-group"><label class="form-label">Montant (DH) <span class="req">*</span></label><input class="form-input" type="number" name="montant" required min="0" step="0.01"/></div>
        <div class="form-group"><label class="form-label">Mode</label>
          <select class="form-select" name="mode">
            <option>virement</option><option>chèque</option><option>espèces</option><option>carte bancaire</option><option>autre</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Référence</label><input class="form-input" name="reference" placeholder="N° facture, chèque..."/></div>
        <div class="form-group" style="grid-column:1/-1;"><label class="form-label">Description <span class="req">*</span></label><input class="form-input" name="description" required/></div>
      </div>
      <div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal').remove()">Annuler</button><button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Enregistrer</button></div>
    </form>
  </div>`);
}

function savePaiement(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  data.companyId = State.currentCompany.id;
  data.montant = parseFloat(data.montant);
  DB.addItem('paiements', data);
  showToast('Paiement enregistré');
  document.getElementById('active-modal')?.remove();
  navigateTo('paiements');
}

function deletePaiement(id) {
  confirm('Supprimer ce paiement ?', () => { DB.deleteItem('paiements', id); showToast('Paiement supprimé', 'warning'); navigateTo('paiements'); });
}

// ===== TÂCHES =====
function renderTaches() {
  const cid = State.currentCompany?.id;
  const taches = DB.getList('taches').filter(t => t.companyId === cid);
  const users = DB.getList('users').filter(u => u.companyId === cid);

  const cols = [
    { id: 'à_faire', label: 'À faire', color: '#94a3b8', icon: '📋' },
    { id: 'en_cours', label: 'En cours', color: '#2563eb', icon: '🔨' },
    { id: 'terminée', label: 'Terminée', color: '#16a34a', icon: '✅' }
  ];

  return `
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
  <div><h2 style="font-size:18px;font-weight:700;">Tâches <span class="badge badge-info">${taches.length}</span></h2></div>
  <button class="btn btn-primary" onclick="openTacheModal()"><i class="fas fa-plus"></i> Nouvelle tâche</button>
</div>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
  ${cols.map(col => {
    const colTaches = taches.filter(t => t.status === col.id);
    return `<div style="background:var(--bg-main);border-radius:12px;padding:16px;min-height:400px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px;">${col.icon} ${col.label}</div>
        <span class="badge badge-info">${colTaches.length}</span>
      </div>
      ${colTaches.map(t => {
        const assignee = users.find(u => u.id === t.assigneId);
        const priorityColor = { haute: '#dc2626', normale: '#2563eb', basse: '#94a3b8' }[t.priority] || '#94a3b8';
        const overdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'terminée';
        return `<div class="card" style="margin-bottom:10px;padding:14px;border-left:3px solid ${priorityColor};">
          <div style="font-weight:600;font-size:14px;margin-bottom:6px;">${escHtml(t.title)}</div>
          ${t.description ? `<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">${escHtml(t.description)}</div>` : ''}
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">
            <div style="font-size:11px;${overdue ? 'color:#dc2626;font-weight:700;' : 'color:var(--text-secondary);'}">
              ${t.dueDate ? (overdue ? '⚠️ ' : '📅 ') + fmtDate(t.dueDate) : ''}
            </div>
            ${assignee ? `<span style="font-size:11px;color:var(--text-secondary);"><i class="fas fa-user"></i> ${escHtml(assignee.name.split(' ')[0])}</span>` : ''}
          </div>
          <div style="display:flex;gap:4px;margin-top:8px;flex-wrap:wrap;">
            ${col.id !== 'à_faire' ? `<button class="btn btn-secondary btn-sm" onclick="moveTache('${t.id}','prev')" style="font-size:10px;padding:3px 7px;"><i class="fas fa-arrow-left"></i></button>` : ''}
            ${col.id !== 'terminée' ? `<button class="btn btn-secondary btn-sm" onclick="moveTache('${t.id}','next')" style="font-size:10px;padding:3px 7px;"><i class="fas fa-arrow-right"></i></button>` : ''}
            <button class="btn btn-secondary btn-sm" onclick="openTacheModal('${t.id}')" style="font-size:10px;padding:3px 7px;"><i class="fas fa-edit"></i></button>
            <button class="btn btn-danger btn-sm" onclick="deleteTache('${t.id}')" style="font-size:10px;padding:3px 7px;"><i class="fas fa-trash"></i></button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }).join('')}
</div>`;
}

function moveTache(id, dir) {
  const t = DB.getList('taches').find(x => x.id === id);
  if (!t) return;
  const order = ['à_faire', 'en_cours', 'terminée'];
  const idx = order.indexOf(t.status);
  const newIdx = dir === 'next' ? idx + 1 : idx - 1;
  if (newIdx < 0 || newIdx >= order.length) return;
  DB.updateItem('taches', id, { status: order[newIdx] });
  navigateTo('taches');
}

function openTacheModal(id = null) {
  const t = id ? DB.getList('taches').find(x => x.id === id) : null;
  const users = DB.getList('users').filter(u => u.companyId === State.currentCompany?.id);
  const chantiers = DB.getList('chantiers').filter(c => c.companyId === State.currentCompany?.id);
  openModal(`<div class="modal">
    <div class="modal-header">
      <h2 class="modal-title">${t ? 'Modifier tâche' : 'Nouvelle tâche'}</h2>
      <button class="modal-close" onclick="document.getElementById('active-modal').remove()"><i class="fas fa-times"></i></button>
    </div>
    <form onsubmit="saveTache(event,'${id || ''}')">
      <div class="form-group"><label class="form-label">Titre <span class="req">*</span></label><input class="form-input" name="title" value="${escHtml(t?.title || '')}" required/></div>
      <div class="form-grid-2">
        <div class="form-group"><label class="form-label">Assigné à</label>
          <select class="form-select" name="assigneId">
            <option value="">-- Non assigné --</option>
            ${users.map(u => `<option value="${u.id}" ${t?.assigneId === u.id ? 'selected' : ''}>${escHtml(u.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label class="form-label">Chantier lié</label>
          <select class="form-select" name="chantierId">
            <option value="">-- Aucun --</option>
            ${chantiers.map(c => `<option value="${c.id}" ${t?.chantierId === c.id ? 'selected' : ''}>${escHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label class="form-label">Priorité</label>
          <select class="form-select" name="priority">
            <option value="basse" ${t?.priority === 'basse' ? 'selected' : ''}>Basse</option>
            <option value="normale" ${t?.priority === 'normale' || !t ? 'selected' : ''}>Normale</option>
            <option value="haute" ${t?.priority === 'haute' ? 'selected' : ''}>Haute</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Échéance</label><input class="form-input" type="date" name="dueDate" value="${t?.dueDate || ''}"/></div>
        <div class="form-group"><label class="form-label">Statut</label>
          <select class="form-select" name="status">
            <option value="à_faire" ${t?.status === 'à_faire' || !t ? 'selected' : ''}>À faire</option>
            <option value="en_cours" ${t?.status === 'en_cours' ? 'selected' : ''}>En cours</option>
            <option value="terminée" ${t?.status === 'terminée' ? 'selected' : ''}>Terminée</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" name="description">${escHtml(t?.description || '')}</textarea></div>
      <div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal').remove()">Annuler</button><button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Enregistrer</button></div>
    </form>
  </div>`);
}

function saveTache(e, id) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  data.companyId = State.currentCompany.id;
  if (id) { DB.updateItem('taches', id, data); showToast('Tâche modifiée'); }
  else { DB.addItem('taches', data); showToast('Tâche créée'); }
  document.getElementById('active-modal')?.remove();
  navigateTo('taches');
}

function deleteTache(id) {
  confirm('Supprimer cette tâche ?', () => { DB.deleteItem('taches', id); showToast('Tâche supprimée', 'warning'); navigateTo('taches'); });
}

// ===== AGENDA =====
function renderAgenda() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();

  const taches = DB.getList('taches').filter(t => t.companyId === State.currentCompany?.id);

  let calCells = '';
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  for (let i = 0; i < firstDay; i++) calCells += '<div style="padding:8px;"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayTaches = taches.filter(t => t.dueDate === dateStr);
    const isToday = d === today;
    calCells += `<div style="padding:8px;border:1px solid var(--border);border-radius:8px;min-height:70px;background:${isToday ? 'rgba(37,99,235,0.1)' : 'var(--bg-card)'};${isToday ? 'border-color:#2563eb;' : ''}">
      <div style="font-weight:${isToday ? '800' : '600'};font-size:13px;color:${isToday ? '#2563eb' : 'var(--text-primary)'};">${d}</div>
      ${dayTaches.map(t => `<div style="font-size:10px;background:${t.priority === 'haute' ? '#fee2e2' : '#dbeafe'};color:${t.priority === 'haute' ? '#dc2626' : '#2563eb'};border-radius:3px;padding:1px 4px;margin-top:2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${escHtml(t.title)}</div>`).join('')}
    </div>`;
  }

  return `
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
  <h2 style="font-size:18px;font-weight:700;">Agenda – ${MONTHS[month]} ${year}</h2>
  <button class="btn btn-primary" onclick="openTacheModal()"><i class="fas fa-plus"></i> Nouvelle tâche</button>
</div>
<div class="card">
  <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:8px;">
    ${dayNames.map(d => `<div style="text-align:center;font-size:12px;font-weight:700;color:var(--text-secondary);padding:8px 0;">${d}</div>`).join('')}
  </div>
  <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">
    ${calCells}
  </div>
</div>
<div class="card" style="margin-top:16px;">
  <h3 style="font-size:15px;font-weight:700;margin-bottom:14px;">Tâches du mois</h3>
  ${taches.filter(t => t.dueDate?.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).map(t => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px;">
      <div>
        <span style="font-weight:600;">${escHtml(t.title)}</span>
        <span class="badge badge-secondary" style="margin-left:8px;">${t.status}</span>
      </div>
      <div style="color:var(--text-secondary);">${fmtDate(t.dueDate)}</div>
    </div>`).join('')}
</div>`;
}

// ===== RAPPORTS =====
function renderRapports() {
  const cid = State.currentCompany?.id;
  const factures = DB.getList('factures').filter(f => f.companyId === cid);
  const paiements = DB.getList('paiements').filter(p => p.companyId === cid);
  const chantiers = DB.getList('chantiers').filter(c => c.companyId === cid);

  const monthlyCA = Array(12).fill(0);
  const monthlyPaye = Array(12).fill(0);
  factures.forEach(f => { const m = new Date(f.date).getMonth(); monthlyCA[m] += calcFactureTotal(f); });
  paiements.filter(p => p.type === 'entrée').forEach(p => { const m = new Date(p.date).getMonth(); monthlyPaye[m] += p.montant; });

  const totalCA = factures.reduce((s, f) => s + calcFactureTotal(f), 0);
  const totalPaye = paiements.filter(p => p.type === 'entrée').reduce((s, p) => s + p.montant, 0);
  const totalDep = paiements.filter(p => p.type === 'sortie').reduce((s, p) => s + p.montant, 0);
  const benefice = totalPaye - totalDep;

  return `
<div style="margin-bottom:20px;">
  <h2 style="font-size:18px;font-weight:700;">Rapports & Analyses</h2>
  <p style="color:var(--text-secondary);font-size:13px;margin-top:2px;">Vue d'ensemble de votre activité</p>
</div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px;">
  <div class="stat-card"><div class="stat-icon" style="background:#dbeafe;color:#2563eb;">💰</div><div class="stat-info"><div class="stat-label">CA Total</div><div class="stat-value" style="font-size:18px;">${fmtMoney(totalCA)}</div></div></div>
  <div class="stat-card"><div class="stat-icon" style="background:#dcfce7;color:#16a34a;">✅</div><div class="stat-info"><div class="stat-label">Encaissé</div><div class="stat-value" style="font-size:18px;color:#16a34a;">${fmtMoney(totalPaye)}</div></div></div>
  <div class="stat-card"><div class="stat-icon" style="background:#fee2e2;color:#dc2626;">📤</div><div class="stat-info"><div class="stat-label">Dépenses</div><div class="stat-value" style="font-size:18px;color:#dc2626;">${fmtMoney(totalDep)}</div></div></div>
  <div class="stat-card"><div class="stat-icon" style="background:${benefice >= 0 ? '#dcfce7' : '#fee2e2'};color:${benefice >= 0 ? '#16a34a' : '#dc2626'};">📊</div><div class="stat-info"><div class="stat-label">Bénéfice net</div><div class="stat-value" style="font-size:18px;color:${benefice >= 0 ? '#16a34a' : '#dc2626'};">${fmtMoney(benefice)}</div></div></div>
</div>
<div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:20px;">
  <div class="card">
    <h3 style="font-size:15px;font-weight:700;margin-bottom:14px;">CA Mensuel 2024</h3>
    <canvas id="chart-rapports-ca" height="220"></canvas>
  </div>
  <div class="card">
    <h3 style="font-size:15px;font-weight:700;margin-bottom:14px;">Analyse financière</h3>
    <canvas id="chart-rapports-pie" height="220"></canvas>
  </div>
</div>
<div class="card">
  <h3 style="font-size:15px;font-weight:700;margin-bottom:14px;">Performance par chantier</h3>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Chantier</th><th>Budget</th><th>Entrées</th><th>Sorties</th><th>Résultat</th><th>Budget utilisé</th></tr></thead>
      <tbody>
        ${chantiers.map(ch => {
          const entrees = DB.getList('chantierEntrees').filter(e => e.chantierId === ch.id).reduce((s, e) => s + e.montant, 0);
          const achats = DB.getList('chantierAchats').filter(a => a.chantierId === ch.id).reduce((s, a) => s + a.montant, 0);
          const mo = DB.getList('chantierMO').filter(m => m.chantierId === ch.id).reduce((s, m) => s + m.montant, 0);
          const sorties = achats + mo;
          const resultat = entrees - sorties;
          const pct = ch.budget > 0 ? Math.round((sorties / ch.budget) * 100) : 0;
          return `<tr>
            <td style="font-weight:600;">${escHtml(ch.name)}</td>
            <td>${fmtMoney(ch.budget)}</td>
            <td style="color:#16a34a;font-weight:600;">${fmtMoney(entrees)}</td>
            <td style="color:#dc2626;font-weight:600;">${fmtMoney(sorties)}</td>
            <td style="font-weight:700;color:${resultat >= 0 ? '#16a34a' : '#dc2626'};">${resultat >= 0 ? '+' : ''}${fmtMoney(resultat)}</td>
            <td>
              <div style="display:flex;align-items:center;gap:8px;">
                <div class="progress-bar-container" style="flex:1;height:8px;">
                  <div class="progress-bar ${pct < 70 ? 'progress-green' : pct <= 100 ? 'progress-orange' : 'progress-red'}" style="width:${Math.min(pct, 100)}%"></div>
                </div>
                <span style="font-size:12px;font-weight:700;color:${pct < 70 ? '#16a34a' : pct <= 100 ? '#f97316' : '#dc2626'};">${pct}%</span>
              </div>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>
</div>`;
}

function initRapportsCharts() {
  const cid = State.currentCompany?.id;
  const factures = DB.getList('factures').filter(f => f.companyId === cid);
  const paiements = DB.getList('paiements').filter(p => p.companyId === cid);

  const monthlyCA = Array(12).fill(0);
  factures.forEach(f => { const m = new Date(f.date).getMonth(); monthlyCA[m] += calcFactureTotal(f); });
  const totalPaye = paiements.filter(p => p.type === 'entrée').reduce((s, p) => s + p.montant, 0);
  const totalDep = paiements.filter(p => p.type === 'sortie').reduce((s, p) => s + p.montant, 0);
  const totalCA = factures.reduce((s, f) => s + calcFactureTotal(f), 0);

  const isDark = State.theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  const ctxCA = document.getElementById('chart-rapports-ca');
  if (ctxCA) new Chart(ctxCA, {
    type: 'line',
    data: { labels: MONTHS, datasets: [{ label: 'CA (DH)', data: monthlyCA, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)', fill: true, tension: 0.4, borderWidth: 2 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: textColor } } }, scales: { x: { ticks: { color: textColor }, grid: { color: 'rgba(0,0,0,0.05)' } }, y: { ticks: { color: textColor, callback: v => (v/1000) + 'k' }, grid: { color: 'rgba(0,0,0,0.05)' } } } }
  });

  const ctxPie = document.getElementById('chart-rapports-pie');
  if (ctxPie) new Chart(ctxPie, {
    type: 'pie',
    data: {
      labels: ['Encaissé', 'Non encaissé', 'Dépenses'],
      datasets: [{ data: [totalPaye, Math.max(0, totalCA - totalPaye), totalDep], backgroundColor: ['#22c55e', '#fbbf24', '#ef4444'], borderWidth: 0 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: textColor, padding: 12 } }, tooltip: { callbacks: { label: ctx => ` ${fmtMoney(ctx.raw)}` } } } }
  });
}

// ===== PARAMÈTRES =====
function renderSettings() {
  const cid = State.currentCompany?.id;
  const company = State.currentCompany;
  const users = DB.getList('users').filter(u => u.companyId === cid);
  const plan = PLANS[company?.plan] || PLANS.basic;

  return `
<div class="tabs-nav">
  <button class="tab-btn active" id="stab-company-btn" onclick="showSettingsTab('company')"><i class="fas fa-building"></i> Société</button>
  <button class="tab-btn" id="stab-users-btn" onclick="showSettingsTab('users')"><i class="fas fa-users"></i> Utilisateurs</button>
  <button class="tab-btn" id="stab-subscription-btn" onclick="showSettingsTab('subscription')"><i class="fas fa-credit-card"></i> Abonnement</button>
  <button class="tab-btn" id="stab-prefs-btn" onclick="showSettingsTab('prefs')"><i class="fas fa-sliders-h"></i> Préférences</button>
</div>

<!-- Tab Société -->
<div id="stab-company">
  <div class="card">
    <h3 style="font-size:16px;font-weight:700;margin-bottom:20px;">Informations de la société</h3>
    <form onsubmit="saveCompanyInfo(event)">
      <div class="form-grid-2">
        <div class="form-group"><label class="form-label">Nom de la société</label><input class="form-input" name="name" value="${escHtml(company?.name || '')}"/></div>
        <div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" name="email" value="${escHtml(company?.email || '')}"/></div>
        <div class="form-group"><label class="form-label">Téléphone</label><input class="form-input" name="phone" value="${escHtml(company?.phone || '')}"/></div>
        <div class="form-group"><label class="form-label">Ville</label><input class="form-input" name="city" value="${escHtml(company?.city || '')}"/></div>
        <div class="form-group"><label class="form-label">RC</label><input class="form-input" name="siret" value="${escHtml(company?.siret || '')}"/></div>
        <div class="form-group"><label class="form-label">ICE</label><input class="form-input" name="ice" value="${escHtml(company?.ice || '')}"/></div>
      </div>
      <div class="form-group"><label class="form-label">Adresse complète</label><textarea class="form-textarea" name="address">${escHtml(company?.address || '')}</textarea></div>
      <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Sauvegarder</button>
    </form>
  </div>
</div>

<!-- Tab Utilisateurs -->
<div id="stab-users" style="display:none;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
    <div>
      <h3 style="font-size:16px;font-weight:700;">Utilisateurs</h3>
      <div style="font-size:13px;color:var(--text-secondary);">${users.length} / ${plan.maxUsers} utilisateurs (plan ${plan.name})</div>
    </div>
    ${users.length < plan.maxUsers ? `<button class="btn btn-primary" onclick="openUserModal()"><i class="fas fa-plus"></i> Ajouter</button>` : `<span class="badge badge-warning">Limite atteinte</span>`}
  </div>
  <div class="progress-bar-container" style="margin-bottom:16px;">
    <div class="progress-bar ${users.length >= plan.maxUsers ? 'progress-red' : users.length >= plan.maxUsers * 0.7 ? 'progress-orange' : 'progress-green'}" style="width:${Math.round((users.length / plan.maxUsers) * 100)}%"></div>
  </div>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Statut</th><th>Actions</th></tr></thead>
      <tbody>
        ${users.map(u => `<tr>
          <td style="font-weight:600;">${escHtml(u.name)}</td>
          <td>${escHtml(u.email)}</td>
          <td><span class="badge badge-purple">${ROLES[u.role]}</span></td>
          <td><span class="badge ${u.status !== 'suspendu' ? 'badge-success' : 'badge-danger'}">${u.status !== 'suspendu' ? 'Actif' : 'Suspendu'}</span></td>
          <td>
            <div style="display:flex;gap:6px;">
              ${u.id !== State.currentUser?.id ? `<button class="btn btn-secondary btn-sm" onclick="openUserModal('${u.id}')"><i class="fas fa-edit"></i></button>
              <button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}')"><i class="fas fa-trash"></i></button>` : '<span style="color:var(--text-secondary);font-size:12px;">Compte actif</span>'}
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
</div>

<!-- Tab Abonnement -->
<div id="stab-subscription" style="display:none;">
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;">
    ${Object.entries(PLANS).map(([key, p]) => {
      const isCurrent = company?.plan === key;
      return `<div class="plan-card ${isCurrent ? 'featured' : ''}">
        ${isCurrent ? '<div class="plan-badge-top">Plan actuel</div>' : ''}
        <div style="font-size:28px;margin-bottom:8px;">${key === 'basic' ? '🥉' : key === 'pro' ? '🥈' : '🥇'}</div>
        <h3 style="font-size:20px;font-weight:800;">${p.name}</h3>
        <div style="font-size:32px;font-weight:900;color:var(--primary);margin:12px 0;">${p.price}<span style="font-size:14px;font-weight:500;"> DH/mois</span></div>
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:20px;">${p.maxUsers} utilisateur${p.maxUsers > 1 ? 's' : ''} max</div>
        <ul style="text-align:left;font-size:13px;color:var(--text-secondary);list-style:none;margin-bottom:20px;">
          <li style="padding:4px 0;"><i class="fas fa-check" style="color:#16a34a;margin-right:8px;"></i>Tous les modules</li>
          <li style="padding:4px 0;"><i class="fas fa-check" style="color:#16a34a;margin-right:8px;"></i>${p.maxUsers} utilisateur${p.maxUsers > 1 ? 's' : ''}</li>
          <li style="padding:4px 0;"><i class="fas fa-check" style="color:#16a34a;margin-right:8px;"></i>Support email</li>
          ${key !== 'basic' ? '<li style="padding:4px 0;"><i class="fas fa-check" style="color:#16a34a;margin-right:8px;"></i>Rapports avancés</li>' : ''}
        </ul>
        ${!isCurrent ? `<button class="btn btn-primary btn-lg" style="width:100%;" onclick="changePlan('${key}')">Choisir ce plan</button>` : `<button class="btn btn-secondary btn-lg" style="width:100%;" disabled>Plan actuel</button>`}
      </div>`;
    }).join('')}
  </div>
  <div class="card" style="margin-top:20px;">
    <h3 style="font-size:15px;font-weight:700;margin-bottom:12px;">Informations d'abonnement</h3>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
      <div><div style="font-size:12px;color:var(--text-secondary);">Plan actuel</div><div style="font-weight:700;">${plan.name}</div></div>
      <div><div style="font-size:12px;color:var(--text-secondary);">Expire le</div><div style="font-weight:700;">${fmtDate(company?.subscriptionEnd)}</div></div>
      <div><div style="font-size:12px;color:var(--text-secondary);">Statut</div><div><span class="badge badge-success">Actif</span></div></div>
    </div>
  </div>
</div>

<!-- Tab Préférences -->
<div id="stab-prefs" style="display:none;">
  <div class="card">
    <h3 style="font-size:16px;font-weight:700;margin-bottom:20px;">Préférences</h3>
    <div style="display:flex;flex-direction:column;gap:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:16px;background:var(--bg-main);border-radius:10px;">
        <div>
          <div style="font-weight:600;">Mode sombre</div>
          <div style="font-size:13px;color:var(--text-secondary);">Activer le thème sombre</div>
        </div>
        <button class="btn ${State.theme === 'dark' ? 'btn-primary' : 'btn-secondary'}" onclick="toggleTheme()">
          <i class="fas fa-${State.theme === 'dark' ? 'sun' : 'moon'}"></i> ${State.theme === 'dark' ? 'Clair' : 'Sombre'}
        </button>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:16px;background:var(--bg-main);border-radius:10px;">
        <div>
          <div style="font-weight:600;">Réinitialiser les données</div>
          <div style="font-size:13px;color:var(--text-secondary);">Effacer toutes les données de démonstration</div>
        </div>
        <button class="btn btn-danger" onclick="resetAllData()"><i class="fas fa-trash-alt"></i> Réinitialiser</button>
      </div>
    </div>
  </div>
</div>`;
}

function showSettingsTab(tab) {
  ['company', 'users', 'subscription', 'prefs'].forEach(t => {
    document.getElementById(`stab-${t}`)?.style.setProperty('display', t === tab ? 'block' : 'none');
    document.getElementById(`stab-${t}-btn`)?.classList.toggle('active', t === tab);
  });
}

function saveCompanyInfo(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  DB.updateItem('companies', State.currentCompany.id, data);
  State.currentCompany = { ...State.currentCompany, ...data };
  showToast('Informations société sauvegardées');
}

function openUserModal(id = null) {
  const u = id ? DB.getList('users').find(x => x.id === id) : null;
  openModal(`<div class="modal">
    <div class="modal-header">
      <h2 class="modal-title">${u ? 'Modifier utilisateur' : 'Nouvel utilisateur'}</h2>
      <button class="modal-close" onclick="document.getElementById('active-modal').remove()"><i class="fas fa-times"></i></button>
    </div>
    <form onsubmit="saveUser(event,'${id || ''}')">
      <div class="form-grid-2">
        <div class="form-group"><label class="form-label">Nom complet <span class="req">*</span></label><input class="form-input" name="name" value="${escHtml(u?.name || '')}" required/></div>
        <div class="form-group"><label class="form-label">Email <span class="req">*</span></label><input class="form-input" type="email" name="email" value="${escHtml(u?.email || '')}" required/></div>
        ${!u ? `<div class="form-group"><label class="form-label">Mot de passe <span class="req">*</span></label><input class="form-input" type="password" name="password" required/></div>` : ''}
        <div class="form-group"><label class="form-label">Rôle</label>
          <select class="form-select" name="role">
            <option value="user" ${u?.role === 'user' ? 'selected' : ''}>Utilisateur</option>
            <option value="admin" ${u?.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Téléphone</label><input class="form-input" name="phone" value="${escHtml(u?.phone || '')}"/></div>
        <div class="form-group"><label class="form-label">Statut</label>
          <select class="form-select" name="status">
            <option value="active" ${u?.status !== 'suspendu' ? 'selected' : ''}>Actif</option>
            <option value="suspendu" ${u?.status === 'suspendu' ? 'selected' : ''}>Suspendu</option>
          </select>
        </div>
      </div>
      <div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal').remove()">Annuler</button><button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Enregistrer</button></div>
    </form>
  </div>`);
}

function saveUser(e, id) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  data.companyId = State.currentCompany.id;
  if (id) { DB.updateItem('users', id, data); showToast('Utilisateur modifié'); }
  else { DB.addItem('users', data); showToast('Utilisateur créé'); }
  document.getElementById('active-modal')?.remove();
  navigateTo('settings');
}

function deleteUser(id) {
  confirm('Supprimer cet utilisateur ?', () => { DB.deleteItem('users', id); showToast('Utilisateur supprimé', 'warning'); navigateTo('settings'); });
}

function changePlan(plan) {
  DB.updateItem('companies', State.currentCompany.id, { plan });
  State.currentCompany.plan = plan;
  showToast(`Plan changé vers ${PLANS[plan].name}`);
  navigateTo('settings');
}

function resetAllData() {
  confirm('Réinitialiser TOUTES les données ? Cette action est irréversible.', () => {
    localStorage.removeItem('bg_seeded');
    initSeedData();
    showToast('Données réinitialisées', 'info');
  });
}

// ===== DOCUMENT PREVIEW (PDF) =====
function previewDoc(type, id) {
  const company = State.currentCompany;
  let doc;
  if (type === 'devis') doc = DB.getList('devis').find(x => x.id === id);
  else doc = DB.getList('factures').find(x => x.id === id);
  if (!doc) return;

  const cl = DB.getList('clients').find(c => c.id === doc.clientId);
  const lignes = doc.lignes || [];
  const totalHT = lignes.reduce((s, l) => s + (l.qte * l.pu), 0);
  const remise = totalHT * (doc.remise || 0) / 100;
  const htAR = totalHT - remise;
  const tva = htAR * 0.2;
  const ttc = htAR + tva;

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>${type === 'devis' ? 'Devis' : 'Facture'} – ${doc.numero}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:13px;color:#111;margin:0;padding:30px;}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;padding-bottom:20px;border-bottom:3px solid #2563eb;}
    .company-name{font-size:22px;font-weight:bold;color:#2563eb;} .doc-title{font-size:24px;font-weight:bold;text-align:right;}
    .doc-num{font-size:16px;color:#64748b;text-align:right;}
    .parties{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-bottom:24px;}
    .party-box{background:#f8fafc;border-radius:8px;padding:14px;} .party-label{font-weight:bold;font-size:11px;color:#64748b;text-transform:uppercase;margin-bottom:6px;}
    table{width:100%;border-collapse:collapse;margin:16px 0;} th{background:#2563eb;color:#fff;padding:10px;text-align:left;font-size:12px;}
    td{padding:9px 10px;border-bottom:1px solid #e2e8f0;} .right{text-align:right;}
    .totals{margin-left:auto;width:280px;} .total-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;}
    .total-ttc{display:flex;justify-content:space-between;padding:10px 0;font-size:16px;font-weight:bold;border-top:2px solid #2563eb;color:#2563eb;}
    .footer{text-align:center;margin-top:30px;padding-top:16px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:11px;}
  </style></head><body>
  <div class="header">
    <div><div class="company-name">🏗️ ${escHtml(company?.name || 'BatiGest Pro')}</div><div style="color:#64748b;">${escHtml(company?.email || '')}</div><div style="color:#64748b;">${escHtml(company?.phone || '')}</div></div>
    <div><div class="doc-title">${type === 'devis' ? 'DEVIS' : 'FACTURE'}</div><div class="doc-num">${doc.numero}</div><div style="text-align:right;color:#64748b;">Date: ${fmtDate(doc.date)}</div>${type === 'devis' ? `<div style="text-align:right;color:#64748b;">Validité: ${fmtDate(doc.validite)}</div>` : `<div style="text-align:right;color:#64748b;">Échéance: ${fmtDate(doc.echeance)}</div>`}</div>
  </div>
  <div class="parties">
    <div class="party-box"><div class="party-label">Émetteur</div><div style="font-weight:600;">${escHtml(company?.name || '')}</div>${company?.siret ? `<div>RC: ${escHtml(company.siret)}</div>` : ''}</div>
    <div class="party-box"><div class="party-label">Client</div><div style="font-weight:600;">${escHtml(cl?.name || '–')}</div>${cl?.email ? `<div>${escHtml(cl.email)}</div>` : ''}${cl?.phone ? `<div>${escHtml(cl.phone)}</div>` : ''}${cl?.ice ? `<div>ICE: ${escHtml(cl.ice)}</div>` : ''}</div>
  </div>
  <table>
    <thead><tr><th>Description</th><th>Qté</th><th>Unité</th><th class="right">P.U. HT</th><th class="right">Total HT</th></tr></thead>
    <tbody>
      ${lignes.map(l => `<tr><td>${escHtml(l.desc)}</td><td>${l.qte}</td><td>${l.unite}</td><td class="right">${fmtMoney(l.pu)}</td><td class="right">${fmtMoney(l.qte * l.pu)}</td></tr>`).join('')}
    </tbody>
  </table>
  <div style="display:flex;justify-content:flex-end;margin-top:16px;">
    <div class="totals">
      <div class="total-row"><span>Total HT:</span><span>${fmtMoney(totalHT)}</span></div>
      ${doc.remise > 0 ? `<div class="total-row" style="color:#dc2626;"><span>Remise (${doc.remise}%):</span><span>- ${fmtMoney(remise)}</span></div>` : ''}
      <div class="total-row"><span>TVA (20%):</span><span>${fmtMoney(tva)}</span></div>
      <div class="total-ttc"><span>TOTAL TTC:</span><span>${fmtMoney(ttc)}</span></div>
    </div>
  </div>
  ${doc.notes ? `<div style="margin-top:20px;padding:12px;background:#f8fafc;border-radius:8px;"><b>Notes:</b> ${escHtml(doc.notes)}</div>` : ''}
  <div class="footer">BatiGest Pro – ${escHtml(company?.name || '')} | ${escHtml(company?.email || '')}</div>
  <script>window.print();<\/script></body></html>`);
}

// ===== FILTRES TABLE =====
function filterTable(tbodyId, query, cols) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const q = query.toLowerCase();
  tbody.querySelectorAll('tr').forEach(row => {
    const cells = row.querySelectorAll('td');
    const match = !q || cols.some(i => cells[i]?.textContent.toLowerCase().includes(q));
    row.style.display = match ? '' : 'none';
  });
}

function filterByStatus(tbodyId, value, colIdx) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.querySelectorAll('tr').forEach(row => {
    const cell = row.querySelectorAll('td')[colIdx];
    const match = !value || cell?.textContent.toLowerCase().includes(value.toLowerCase());
    row.style.display = match ? '' : 'none';
  });
}

// ===== INITIALISATION =====
function init() {
  // Appliquer le thème
  document.documentElement.setAttribute('data-theme', State.theme);
  // Initialiser les données
  initSeedData();
  // Restaurer session
  restoreSession();
  // Rendre l'app
  renderApp();
}

// Lancer
init();
