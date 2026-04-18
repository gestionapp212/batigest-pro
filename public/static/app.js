// ===== BATIGEST PRO – APPLICATION PRINCIPALE =====

// ===== STATE GLOBAL =====
const AppState = {
  currentUser: null,
  currentCompany: null,
  currentPage: 'dashboard',
  theme: localStorage.getItem('theme') || 'light',
  lang: localStorage.getItem('lang') || 'fr',
  db: null,
};

// ===== BASE DE DONNÉES LOCALE (IndexedDB simulé via localStorage) =====
const DB = {
  get(key) {
    try { return JSON.parse(localStorage.getItem('batigest_' + key) || 'null'); }
    catch { return null; }
  },
  set(key, value) {
    localStorage.setItem('batigest_' + key, JSON.stringify(value));
  },
  getAll(key) {
    return this.get(key) || [];
  },
  push(key, item) {
    const arr = this.getAll(key);
    item.id = item.id || Date.now() + Math.random().toString(36).substr(2, 5);
    item.created_at = item.created_at || new Date().toISOString();
    arr.push(item);
    this.set(key, arr);
    return item;
  },
  update(key, id, updates) {
    const arr = this.getAll(key);
    const idx = arr.findIndex(x => x.id == id);
    if (idx >= 0) { arr[idx] = { ...arr[idx], ...updates, updated_at: new Date().toISOString() }; this.set(key, arr); return arr[idx]; }
    return null;
  },
  delete(key, id) {
    const arr = this.getAll(key).filter(x => x.id != id);
    this.set(key, arr);
  },
  findByCompany(key, company_id) {
    return this.getAll(key).filter(x => x.company_id === company_id);
  }
};

// ===== SEED DATA =====
function initDemoData() {
  if (DB.get('initialized')) return;

  // Companies
  const company1 = { id: 'c1', name: 'BTP Maroc SARL', email: 'contact@btpmaroc.ma', phone: '0522001122', city: 'Casablanca', plan: 'business', status: 'active', logo: '', created_at: '2024-01-01' };
  const company2 = { id: 'c2', name: 'Services Plus SARL', email: 'info@servicesplus.ma', phone: '0537001133', city: 'Rabat', plan: 'pro', status: 'active', logo: '', created_at: '2024-02-01' };
  DB.set('companies', [company1, company2]);

  // Users
  const users = [
    { id: 'u0', company_id: null, name: 'Said Hamdaoui', email: 'said.gamdaoui1984@gmail.com', password: 'said1984@', role: 'super_admin', status: 'active' },
    { id: 'u1', company_id: 'c1', name: 'Ahmed Benali', email: 'admin@btpmaroc.ma', password: 'admin123', role: 'admin', status: 'active' },
    { id: 'u2', company_id: 'c1', name: 'Karim Idrissi', email: 'karim@btpmaroc.ma', password: 'user123', role: 'user', status: 'active' },
    { id: 'u3', company_id: 'c2', name: 'Sara Tazi', email: 'admin@servicesplus.ma', password: 'admin123', role: 'admin', status: 'active' },
  ];
  DB.set('users', users);

  // Clients c1
  const clients = [
    { id: 'cl1', company_id: 'c1', name: 'Mohamed Alaoui', email: 'alaoui@email.com', phone: '0661001100', city: 'Casablanca', type: 'particulier', created_at: '2024-01-15' },
    { id: 'cl2', company_id: 'c1', name: 'Société Immobilière Atlas', email: 'atlas@email.com', phone: '0522112233', city: 'Marrakech', type: 'entreprise', created_at: '2024-02-01' },
    { id: 'cl3', company_id: 'c1', name: 'Fatima Zahra Bennis', email: 'fbennis@email.com', phone: '0675223344', city: 'Fès', type: 'particulier', created_at: '2024-03-10' },
    { id: 'cl4', company_id: 'c2', name: 'Karim Mansouri', email: 'kmansouri@email.com', phone: '0661334455', city: 'Rabat', type: 'particulier', created_at: '2024-01-20' },
  ];
  DB.set('clients', clients);

  // Fournisseurs
  const fournisseurs = [
    { id: 'f1', company_id: 'c1', name: 'Lafarge Maroc', contact: 'Directeur Commercial', phone: '0522445566', email: 'laf@lafarge.ma', categorie: 'Matériaux', created_at: '2024-01-10' },
    { id: 'f2', company_id: 'c1', name: 'Profilé Acier Maroc', contact: 'Ahmed Rouicha', phone: '0661556677', email: 'pam@email.ma', categorie: 'Métallurgie', created_at: '2024-01-12' },
    { id: 'f3', company_id: 'c1', name: 'Electro BTP', contact: 'Youssef Filali', phone: '0672667788', email: 'ebtp@email.ma', categorie: 'Electricité', created_at: '2024-02-05' },
  ];
  DB.set('fournisseurs', fournisseurs);

  // Chantiers
  const chantiers = [
    { id: 'ch1', company_id: 'c1', nom: 'Villa Résidentielle Alaoui', client_id: 'cl1', client_nom: 'Mohamed Alaoui', budget: 850000, date_debut: '2024-03-01', date_fin: '2024-09-30', statut: 'en_cours', description: 'Construction villa R+1 avec piscine', created_at: '2024-03-01' },
    { id: 'ch2', company_id: 'c1', nom: 'Immeuble Atlas R+4', client_id: 'cl2', client_nom: 'Société Immobilière Atlas', budget: 3500000, date_debut: '2024-01-15', date_fin: '2025-06-30', statut: 'en_cours', description: 'Immeuble résidentiel 4 étages', created_at: '2024-01-15' },
    { id: 'ch3', company_id: 'c1', nom: 'Rénovation Bureau Fès', client_id: 'cl3', client_nom: 'Fatima Zahra Bennis', budget: 120000, date_debut: '2024-04-01', date_fin: '2024-05-15', statut: 'termine', description: 'Rénovation complète bureaux', created_at: '2024-04-01' },
  ];
  DB.set('chantiers', chantiers);

  // Chantier Entrées
  const entrées = [
    { id: 'ce1', company_id: 'c1', chantier_id: 'ch1', montant: 200000, date: '2024-03-05', description: 'Avance chantier 1er versement', created_at: '2024-03-05' },
    { id: 'ce2', company_id: 'c1', chantier_id: 'ch1', montant: 150000, date: '2024-05-10', description: '2ème tranche', created_at: '2024-05-10' },
    { id: 'ce3', company_id: 'c1', chantier_id: 'ch2', montant: 1000000, date: '2024-02-01', description: 'Avance initiale', created_at: '2024-02-01' },
    { id: 'ce4', company_id: 'c1', chantier_id: 'ch2', montant: 500000, date: '2024-04-15', description: '2ème versement', created_at: '2024-04-15' },
    { id: 'ce5', company_id: 'c1', chantier_id: 'ch3', montant: 80000, date: '2024-04-05', description: 'Paiement total', created_at: '2024-04-05' },
  ];
  DB.set('chantier_entrees', entrées);

  // Chantier Achats
  const achats = [
    { id: 'ca1', company_id: 'c1', chantier_id: 'ch1', fournisseur: 'Lafarge Maroc', produit: 'Ciment 50kg x 500', montant: 45000, date: '2024-03-10', created_at: '2024-03-10' },
    { id: 'ca2', company_id: 'c1', chantier_id: 'ch1', fournisseur: 'Profilé Acier Maroc', produit: 'Ferraille béton armé', montant: 78000, date: '2024-04-01', created_at: '2024-04-01' },
    { id: 'ca3', company_id: 'c1', chantier_id: 'ch2', fournisseur: 'Lafarge Maroc', produit: 'Ciment, sable, gravier', montant: 180000, date: '2024-02-10', created_at: '2024-02-10' },
    { id: 'ca4', company_id: 'c1', chantier_id: 'ch2', fournisseur: 'Electro BTP', produit: 'Câblage électrique', montant: 65000, date: '2024-03-20', created_at: '2024-03-20' },
    { id: 'ca5', company_id: 'c1', chantier_id: 'ch3', fournisseur: 'Profilé Acier Maroc', produit: 'Menuiserie aluminium', montant: 35000, date: '2024-04-08', created_at: '2024-04-08' },
  ];
  DB.set('chantier_achats', achats);

  // Chantier Main d'œuvre
  const mdo = [
    { id: 'cm1', company_id: 'c1', chantier_id: 'ch1', nom: 'Équipe maçonnerie', type: 'journalier', montant: 32000, date: '2024-03-15', description: '20 jours x 8 ouvriers', created_at: '2024-03-15' },
    { id: 'cm2', company_id: 'c1', chantier_id: 'ch1', nom: 'Plombier Hassan', type: 'a_la_tache', montant: 18000, date: '2024-05-01', description: 'Plomberie complète villa', created_at: '2024-05-01' },
    { id: 'cm3', company_id: 'c1', chantier_id: 'ch2', nom: 'Société BTP Express', type: 'prestataire', montant: 250000, date: '2024-02-15', description: 'Gros œuvre étages 1-2', created_at: '2024-02-15' },
    { id: 'cm4', company_id: 'c1', chantier_id: 'ch2', nom: 'Équipe coffrage', type: 'journalier', montant: 45000, date: '2024-04-01', description: '30 jours x 5 ouvriers', created_at: '2024-04-01' },
    { id: 'cm5', company_id: 'c1', chantier_id: 'ch3', nom: 'Peintre Rachid', type: 'a_la_tache', montant: 12000, date: '2024-04-15', description: 'Peinture intérieure', created_at: '2024-04-15' },
  ];
  DB.set('chantier_main_oeuvre', mdo);

  // Devis
  const devis = [
    { id: 'd1', company_id: 'c1', numero: 'DEV-2024-001', client_id: 'cl1', client_nom: 'Mohamed Alaoui', date: '2024-02-20', validite: '2024-03-20', statut: 'accepte', montant_ht: 820000, tva: 20, montant_ttc: 984000, lignes: [{ designation: 'Construction villa R+1', qte: 1, prix: 820000 }], notes: '' },
    { id: 'd2', company_id: 'c1', numero: 'DEV-2024-002', client_id: 'cl3', client_nom: 'Fatima Zahra Bennis', date: '2024-03-25', validite: '2024-04-25', statut: 'accepte', montant_ht: 110000, tva: 20, montant_ttc: 132000, lignes: [{ designation: 'Rénovation bureaux', qte: 1, prix: 110000 }], notes: '' },
    { id: 'd3', company_id: 'c1', numero: 'DEV-2024-003', client_id: 'cl2', client_nom: 'Société Immobilière Atlas', date: '2024-04-10', validite: '2024-05-10', statut: 'en_attente', montant_ht: 500000, tva: 20, montant_ttc: 600000, lignes: [{ designation: 'Extension bâtiment', qte: 1, prix: 500000 }], notes: '' },
  ];
  DB.set('devis', devis);

  // Factures
  const factures = [
    { id: 'fac1', company_id: 'c1', numero: 'FAC-2024-001', client_id: 'cl1', client_nom: 'Mohamed Alaoui', date: '2024-03-01', echeance: '2024-04-01', statut: 'partiel', montant_ht: 820000, tva: 20, montant_ttc: 984000, montant_paye: 350000, lignes: [{ designation: 'Construction villa R+1', qte: 1, prix: 820000 }] },
    { id: 'fac2', company_id: 'c1', numero: 'FAC-2024-002', client_id: 'cl3', client_nom: 'Fatima Zahra Bennis', date: '2024-04-05', echeance: '2024-05-05', statut: 'paye', montant_ht: 110000, tva: 20, montant_ttc: 132000, montant_paye: 132000, lignes: [{ designation: 'Rénovation bureaux', qte: 1, prix: 110000 }] },
    { id: 'fac3', company_id: 'c1', numero: 'FAC-2024-003', client_id: 'cl2', client_nom: 'Société Immobilière Atlas', date: '2024-02-01', echeance: '2024-03-01', statut: 'non_paye', montant_ht: 840000, tva: 20, montant_ttc: 1008000, montant_paye: 0, lignes: [{ designation: 'Immeuble Atlas - Phase 1', qte: 1, prix: 840000 }] },
  ];
  DB.set('factures', factures);

  // Produits/Stock
  const produits = [
    { id: 'p1', company_id: 'c1', nom: 'Ciment CPJ 45', unite: 'sac', quantite: 320, seuil_alerte: 100, prix_achat: 75, prix_vente: 90, categorie: 'Matériaux' },
    { id: 'p2', company_id: 'c1', nom: 'Sable fin', unite: 'm³', quantite: 45, seuil_alerte: 20, prix_achat: 120, prix_vente: 150, categorie: 'Matériaux' },
    { id: 'p3', company_id: 'c1', nom: 'Gravier 15/25', unite: 'm³', quantite: 12, seuil_alerte: 15, prix_achat: 140, prix_vente: 170, categorie: 'Matériaux' },
    { id: 'p4', company_id: 'c1', nom: 'Brique creuse 12', unite: 'unité', quantite: 5000, seuil_alerte: 1000, prix_achat: 2.5, prix_vente: 3.2, categorie: 'Maçonnerie' },
    { id: 'p5', company_id: 'c1', nom: 'Rond à béton ø12', unite: 'kg', quantite: 850, seuil_alerte: 200, prix_achat: 12, prix_vente: 15, categorie: 'Métallurgie' },
  ];
  DB.set('produits', produits);

  // Paiements
  const paiements = [
    { id: 'pay1', company_id: 'c1', type: 'entree', montant: 350000, date: '2024-03-05', description: 'Acompte FAC-2024-001', reference: 'FAC-2024-001', categorie: 'Facturation', created_at: '2024-03-05' },
    { id: 'pay2', company_id: 'c1', type: 'entree', montant: 132000, date: '2024-04-10', description: 'Règlement FAC-2024-002', reference: 'FAC-2024-002', categorie: 'Facturation', created_at: '2024-04-10' },
    { id: 'pay3', company_id: 'c1', type: 'sortie', montant: 45000, date: '2024-03-12', description: 'Achat ciment Lafarge', reference: 'ACH-001', categorie: 'Achats', created_at: '2024-03-12' },
    { id: 'pay4', company_id: 'c1', type: 'sortie', montant: 78000, date: '2024-04-03', description: 'Ferraille Profilé Acier', reference: 'ACH-002', categorie: 'Achats', created_at: '2024-04-03' },
    { id: 'pay5', company_id: 'c1', type: 'sortie', montant: 32000, date: '2024-03-20', description: 'Paie équipe maçonnerie', reference: 'SAL-001', categorie: 'Salaires', created_at: '2024-03-20' },
  ];
  DB.set('paiements', paiements);

  // Tâches
  const taches = [
    { id: 't1', company_id: 'c1', titre: 'Commander ciment chantier villa', description: '', assigne_a: 'u2', priorite: 'haute', statut: 'en_cours', date_echeance: '2024-05-20', chantier_id: 'ch1', created_at: '2024-05-10' },
    { id: 't2', company_id: 'c1', titre: 'Envoyer facture Atlas', description: 'Envoyer FAC-2024-003 par email', assigne_a: 'u1', priorite: 'normale', statut: 'termine', date_echeance: '2024-02-05', chantier_id: 'ch2', created_at: '2024-02-01' },
    { id: 't3', company_id: 'c1', titre: 'Réunion chantier Atlas', description: 'Point avancement mensuel', assigne_a: 'u1', priorite: 'haute', statut: 'a_faire', date_echeance: '2024-05-25', chantier_id: 'ch2', created_at: '2024-05-12' },
  ];
  DB.set('taches', taches);

  // Agenda
  const agenda = [
    { id: 'ag1', company_id: 'c1', titre: 'Réunion chantier Villa Alaoui', date: '2024-05-20', heure: '09:00', type: 'reunion', notes: 'Point d\'avancement et vérification travaux' },
    { id: 'ag2', company_id: 'c1', titre: 'Livraison ciment Lafarge', date: '2024-05-22', heure: '14:00', type: 'livraison', notes: '500 sacs ciment CPJ45' },
    { id: 'ag3', company_id: 'c1', titre: 'Rendez-vous client Atlas', date: '2024-05-25', heure: '11:00', type: 'rdv', notes: 'Présentation plans étages 3-4' },
  ];
  DB.set('agenda', agenda);

  DB.set('initialized', true);
}

// ===== FORMATAGE =====
function fmt(n) {
  if (n == null) return '0';
  return Number(n).toLocaleString('fr-MA') + ' DH';
}
function fmtNum(n) {
  return Number(n).toLocaleString('fr-MA');
}
function fmtDate(d) {
  if (!d) return '–';
  return new Date(d).toLocaleDateString('fr-FR');
}
function fmtDateInput(d) {
  if (!d) return '';
  return d.split('T')[0];
}

// ===== TOAST =====
function toast(msg, type = 'success') {
  const icons = { success: 'fa-check-circle', danger: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  const colors = { success: '#16a34a', danger: '#dc2626', warning: '#d97706', info: '#2563eb' };
  const container = document.getElementById('toast-container') || (() => {
    const c = document.createElement('div');
    c.id = 'toast-container';
    c.className = 'toast-container';
    document.body.appendChild(c);
    return c;
  })();
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<i class="fas ${icons[type]}" style="color:${colors[type]}"></i><span style="flex:1">${msg}</span><button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:var(--text-secondary)"><i class="fas fa-times"></i></button>`;
  container.appendChild(t);
  setTimeout(() => t.style.opacity = '0', 3500);
  setTimeout(() => t.remove(), 3800);
}

// ===== MODAL =====
function openModal(html, size = '') {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-overlay';
  overlay.innerHTML = `<div class="modal ${size}" id="modal-box">${html}</div>`;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
}
function closeModal() {
  const el = document.getElementById('modal-overlay');
  if (el) el.remove();
}

// ===== CONFIRM =====
function confirm(msg, onOk) {
  openModal(`
    <div class="modal-header"><h3 class="modal-title"><i class="fas fa-question-circle text-yellow-500 mr-2"></i>Confirmation</h3>
    <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
    <p style="color:var(--text-secondary);margin-bottom:24px">${msg}</p>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-danger" id="confirm-ok-btn">Confirmer</button>
    </div>`);
  document.getElementById('confirm-ok-btn').onclick = () => { closeModal(); onOk(); };
}

// ===== THEME =====
function setTheme(t) {
  AppState.theme = t;
  localStorage.setItem('theme', t);
  document.documentElement.setAttribute('data-theme', t);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.innerHTML = t === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

// ===== AUTH =====
function login(email, password) {
  const users = DB.getAll('users');
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return false;
  if (user.status !== 'active') { toast('Compte désactivé. Contactez l\'administrateur.', 'danger'); return false; }
  AppState.currentUser = user;
  DB.set('session', user);
  if (user.role !== 'super_admin') {
    const companies = DB.getAll('companies');
    const company = companies.find(c => c.id === user.company_id);
    if (!company || company.status !== 'active') { toast('Société suspendue. Contactez le support.', 'danger'); return false; }
    AppState.currentCompany = company;
    DB.set('session_company', company);
    // Check user limit
    const companyUsers = users.filter(u => u.company_id === user.company_id && u.status === 'active');
    const limits = { basic: 1, pro: 4, business: 10 };
    // allowed
  }
  return true;
}

function logout() {
  DB.set('session', null);
  DB.set('session_company', null);
  AppState.currentUser = null;
  AppState.currentCompany = null;
  renderApp();
}

function checkSession() {
  const user = DB.get('session');
  if (user) {
    AppState.currentUser = user;
    if (user.role !== 'super_admin') {
      AppState.currentCompany = DB.get('session_company');
    }
    return true;
  }
  return false;
}

// ===== ROUTER =====
function navigate(page) {
  AppState.currentPage = page;
  renderPage(page);
  // Update sidebar active
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  // Close sidebar on mobile
  if (window.innerWidth <= 1024) {
    document.getElementById('sidebar')?.classList.remove('open');
    document.querySelector('.sidebar-overlay')?.classList.remove('show');
  }
  // Update page title
  const titles = {
    dashboard: 'Tableau de bord', clients: 'Clients', chantiers: 'Chantiers',
    devis: 'Devis', factures: 'Factures', stock: 'Stock', fournisseurs: 'Fournisseurs',
    paiements: 'Paiements & Trésorerie', taches: 'Tâches', agenda: 'Agenda',
    rapports: 'Rapports', parametres: 'Paramètres'
  };
  const el = document.getElementById('page-title');
  if (el) el.textContent = titles[page] || page;
}

// ===== RENDER APP =====
function renderApp() {
  const root = document.getElementById('root');
  if (!checkSession()) {
    root.innerHTML = renderLoginPage();
    bindLoginEvents();
    return;
  }
  root.innerHTML = `
    <div id="app-layout">
      ${renderSidebar()}
      <div id="main-content">
        ${renderTopbar()}
        <div id="page-content"></div>
      </div>
    </div>
    <div class="sidebar-overlay" onclick="toggleSidebar()"></div>
    <div id="toast-container" class="toast-container"></div>
  `;
  setTheme(AppState.theme);
  bindSidebarEvents();
  navigate(AppState.currentPage || 'dashboard');
}

// ===== LOGIN PAGE =====
function renderLoginPage() {
  return `
  <div id="login-page">
    <div class="login-left">
      <div class="login-hero">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:32px">
          <div style="width:56px;height:56px;background:var(--primary);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:28px">🏗️</div>
          <div>
            <div style="color:#fff;font-size:22px;font-weight:800">BatiGest Pro</div>
            <div style="color:#94a3b8;font-size:13px">Gestion BTP & Commerce</div>
          </div>
        </div>
        <h1>Gérez vos chantiers<br/><span style="color:#60a5fa">en toute simplicité</span></h1>
        <p>Plateforme SaaS complète pour la gestion des chantiers BTP, facturation, stock et suivi financier en temps réel.</p>
        <ul class="feature-list">
          <li><span class="check"><i class="fas fa-check"></i></span>Suivi financier complet des chantiers</li>
          <li><span class="check"><i class="fas fa-check"></i></span>Gestion clients, devis et factures</li>
          <li><span class="check"><i class="fas fa-check"></i></span>Contrôle stock et fournisseurs</li>
          <li><span class="check"><i class="fas fa-check"></i></span>Tableau de bord avec graphiques</li>
          <li><span class="check"><i class="fas fa-check"></i></span>Multi-société et multi-utilisateurs</li>
        </ul>
      </div>
    </div>
    <div class="login-right">
      <div class="login-box">
        <div class="login-logo">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <div style="width:40px;height:40px;background:var(--primary);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px">🏗️</div>
            <span style="font-size:20px;font-weight:800;color:var(--text-primary)">BatiGest Pro</span>
          </div>
          <h2 style="font-size:24px;font-weight:700;color:var(--text-primary);margin-bottom:4px">Connexion</h2>
          <p style="color:var(--text-secondary);font-size:14px">Accédez à votre espace de gestion</p>
        </div>
        <form id="login-form">
          <div class="form-group">
            <label class="form-label">Adresse email</label>
            <div style="position:relative">
              <i class="fas fa-envelope" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-secondary);font-size:13px"></i>
              <input type="email" id="login-email" class="form-input" style="padding-left:36px" placeholder="votre@email.com" required/>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Mot de passe</label>
            <div style="position:relative">
              <i class="fas fa-lock" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-secondary);font-size:13px"></i>
              <input type="password" id="login-password" class="form-input" style="padding-left:36px;padding-right:40px" placeholder="••••••••" required/>
              <button type="button" onclick="togglePwd()" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-secondary)"><i class="fas fa-eye" id="pwd-eye"></i></button>
            </div>
          </div>
          <div id="login-error" style="display:none;color:var(--danger);font-size:13px;margin-bottom:12px;padding:10px;background:rgba(220,38,38,0.08);border-radius:8px;border-left:3px solid var(--danger)">
            <i class="fas fa-exclamation-circle"></i> Email ou mot de passe incorrect
          </div>
          <button type="submit" class="btn btn-primary btn-lg" style="width:100%;justify-content:center;margin-bottom:16px" id="login-btn">
            <i class="fas fa-sign-in-alt"></i> Se connecter
          </button>
        </form>
        <div style="background:var(--bg-main);border-radius:10px;padding:12px 14px;border:1px solid var(--border);display:flex;align-items:center;gap:10px">
          <i class="fas fa-info-circle" style="color:#2563eb;font-size:14px"></i>
          <span style="font-size:12px;color:var(--text-secondary)">Contactez votre administrateur pour obtenir vos identifiants de connexion.</span>
        </div>
      </div>
    </div>
  </div>
  <style>
    .demo-acc { display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;transition:background 0.2s; }
    .demo-acc:hover { background:var(--border); }
  </style>`;
}

function bindLoginEvents() {
  document.getElementById('login-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');
    btn.innerHTML = '<span class="loading-spinner"></span> Connexion...';
    btn.disabled = true;
    setTimeout(() => {
      const ok = login(email, password);
      if (ok) { renderApp(); }
      else {
        document.getElementById('login-error').style.display = 'block';
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
        btn.disabled = false;
      }
    }, 600);
  });
}

function togglePwd() {
  const inp = document.getElementById('login-password');
  const eye = document.getElementById('pwd-eye');
  if (inp.type === 'password') { inp.type = 'text'; eye.className = 'fas fa-eye-slash'; }
  else { inp.type = 'password'; eye.className = 'fas fa-eye'; }
}

function setDemo(email, pass) {
  document.getElementById('login-email').value = email;
  document.getElementById('login-password').value = pass;
}

// ===== SIDEBAR =====
function renderSidebar() {
  const u = AppState.currentUser;
  const co = AppState.currentCompany;
  const isAdmin = u.role === 'admin' || u.role === 'super_admin';
  const planLabels = { basic: 'Basic', pro: 'Pro', business: 'Business' };
  const planLabel = co ? (planLabels[co.plan] || co.plan) : '';

  const nav = [
    { page: 'dashboard', icon: 'fa-chart-pie', label: 'Tableau de bord', section: 'PRINCIPAL' },
    { page: 'chantiers', icon: 'fa-hard-hat', label: 'Chantiers', section: null },
    { page: 'clients', icon: 'fa-users', label: 'Clients', section: null },
    { page: 'devis', icon: 'fa-file-alt', label: 'Devis', section: null },
    { page: 'factures', icon: 'fa-file-invoice-dollar', label: 'Factures', section: 'COMMERCE' },
    { page: 'paiements', icon: 'fa-wallet', label: 'Paiements', section: null },
    { page: 'stock', icon: 'fa-boxes', label: 'Stock', section: 'GESTION' },
    { page: 'fournisseurs', icon: 'fa-truck', label: 'Fournisseurs', section: null },
    { page: 'taches', icon: 'fa-tasks', label: 'Tâches', section: 'ORGANISATION' },
    { page: 'agenda', icon: 'fa-calendar-alt', label: 'Agenda', section: null },
    { page: 'rapports', icon: 'fa-chart-bar', label: 'Rapports', section: null },
    ...(isAdmin ? [{ page: 'parametres', icon: 'fa-cog', label: 'Paramètres', section: 'ADMIN' }] : []),
  ];

  let html = `<div id="sidebar">
    <div class="logo-area">
      <div class="logo-icon">🏗️</div>
      <div><div class="logo-text">BatiGest Pro</div><div class="logo-sub">v1.0 – Gestion BTP</div></div>
    </div>`;
  if (co) {
    html += `<div class="company-info" onclick="navigate('parametres')">
      <div class="company-name">${co.name}</div>
      <div class="company-plan"><span class="plan-badge">${planLabel}</span><span>${co.city || ''}</span></div>
    </div>`;
  }
  html += '<nav>';
  let lastSection = null;
  nav.forEach(item => {
    if (item.section && item.section !== lastSection) {
      html += `<div class="nav-section-title">${item.section}</div>`;
      lastSection = item.section;
    }
    html += `<div class="nav-item" data-page="${item.page}" onclick="navigate('${item.page}')">
      <i class="fas ${item.icon} nav-icon"></i><span>${item.label}</span>
    </div>`;
  });
  html += `</nav>
    <div class="sidebar-footer">
      <div class="user-avatar-area">
        <div class="user-avatar">${u.name.charAt(0)}</div>
        <div style="flex:1;overflow:hidden">
          <div style="color:#e2e8f0;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.name}</div>
          <div style="color:#94a3b8;font-size:11px">${u.role}</div>
        </div>
        <button class="btn-ghost" onclick="logout()" title="Déconnexion" style="color:#94a3b8;padding:4px;background:none;border:none;cursor:pointer">
          <i class="fas fa-sign-out-alt"></i>
        </button>
      </div>
    </div>
  </div>`;
  return html;
}

// ===== TOPBAR =====
function renderTopbar() {
  const u = AppState.currentUser;
  return `<div id="topbar">
    <button id="sidebar-toggle" onclick="toggleSidebar()"><i class="fas fa-bars"></i></button>
    <h1 class="page-title" id="page-title">Tableau de bord</h1>
    <div class="topbar-actions">
      <button class="btn btn-ghost btn-sm" id="theme-toggle" onclick="setTheme(AppState.theme==='dark'?'light':'dark')" title="Changer le thème">
        <i class="fas fa-moon"></i>
      </button>
      <div style="display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg-main);cursor:pointer" onclick="navigate('parametres')">
        <div class="user-avatar" style="width:28px;height:28px;font-size:12px">${u.name.charAt(0)}</div>
        <span style="font-size:13px;font-weight:600;color:var(--text-primary)">${u.name}</span>
      </div>
    </div>
  </div>`;
}

function toggleSidebar() {
  const s = document.getElementById('sidebar');
  const o = document.querySelector('.sidebar-overlay');
  if (s) s.classList.toggle('open');
  if (o) o.classList.toggle('show');
}

function bindSidebarEvents() {
  setTheme(AppState.theme);
}

// ===== RENDER PAGE =====
function renderPage(page) {
  const content = document.getElementById('page-content');
  if (!content) return;
  const pages = {
    dashboard: renderDashboard,
    chantiers: renderChantiers,
    clients: renderClients,
    devis: renderDevis,
    factures: renderFactures,
    stock: renderStock,
    fournisseurs: renderFournisseurs,
    paiements: renderPaiements,
    taches: renderTaches,
    agenda: renderAgenda,
    rapports: renderRapports,
    parametres: renderParametres,
  };
  if (pages[page]) {
    content.innerHTML = pages[page]();
    if (page === 'dashboard') initCharts();
  } else {
    content.innerHTML = `<div class="empty-state"><div class="icon">🚧</div><h3>Page en construction</h3><p>Cette section sera bientôt disponible</p></div>`;
  }
}

// ===== DASHBOARD =====
function renderDashboard() {
  const cid = AppState.currentCompany?.id;
  if (!cid) return '<div class="empty-state"><div class="icon">⚠️</div><h3>Aucune société</h3></div>';
  const factures = DB.findByCompany('factures', cid);
  const chantiers = DB.findByCompany('chantiers', cid);
  const clients = DB.findByCompany('clients', cid);
  const paiements = DB.findByCompany('paiements', cid);
  const taches = DB.findByCompany('taches', cid);
  const achats = DB.findByCompany('chantier_achats', cid);
  const mdo = DB.findByCompany('chantier_main_oeuvre', cid);

  const totalCA = factures.filter(f => f.statut === 'paye').reduce((s, f) => s + f.montant_ttc, 0);
  const totalDepenses = [...achats, ...mdo].reduce((s, x) => s + x.montant, 0);
  const resultat = totalCA - totalDepenses;
  const facturesImpayees = factures.filter(f => f.statut === 'non_paye').reduce((s, f) => s + (f.montant_ttc - f.montant_paye), 0);
  const chantiersActifs = chantiers.filter(c => c.statut === 'en_cours').length;
  const tachesEnCours = taches.filter(t => t.statut !== 'termine').length;

  // Monthly data for chart
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'];
  const caData = [120000, 180000, 132000, 210000, 175000, 220000];
  const depData = [90000, 140000, 115000, 165000, 130000, 170000];

  return `
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px">
    ${statCard('Chiffre d\'affaires', fmt(totalCA), 'fa-chart-line', '#2563eb', 'up', '+12% ce mois')}
    ${statCard('Dépenses', fmt(totalDepenses), 'fa-arrow-down-circle', '#dc2626', 'down', '+5% ce mois')}
    ${statCard('Résultat net', fmt(resultat), 'fa-balance-scale', resultat >= 0 ? '#16a34a' : '#dc2626', resultat >= 0 ? 'up' : 'down', resultat >= 0 ? 'Bénéfice' : 'Perte')}
    ${statCard('Impayés', fmt(facturesImpayees), 'fa-exclamation-circle', '#d97706', 'down', `${factures.filter(f=>f.statut!=='paye').length} factures`)}
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px">
    ${miniStatCard('Chantiers actifs', chantiersActifs, 'fa-hard-hat', '#7c3aed', 'chantiers')}
    ${miniStatCard('Clients', clients.length, 'fa-users', '#2563eb', 'clients')}
    ${miniStatCard('Tâches ouvertes', tachesEnCours, 'fa-tasks', '#d97706', 'taches')}
    ${miniStatCard('Factures', factures.length, 'fa-file-invoice', '#16a34a', 'factures')}
  </div>
  <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:24px">
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h3 style="font-weight:700;font-size:16px">Évolution CA vs Dépenses</h3>
        <span class="badge badge-info">6 derniers mois</span>
      </div>
      <canvas id="chartCA" height="100"></canvas>
    </div>
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h3 style="font-weight:700;font-size:16px">Répartition dépenses</h3>
      </div>
      <canvas id="chartDep" height="140"></canvas>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h3 style="font-weight:700;font-size:16px"><i class="fas fa-hard-hat" style="color:#7c3aed;margin-right:8px"></i>Chantiers récents</h3>
        <button class="btn btn-secondary btn-sm" onclick="navigate('chantiers')">Voir tout</button>
      </div>
      ${chantiers.slice(0,3).map(ch => {
        const ent = DB.findByCompany('chantier_entrees', cid).filter(e => e.chantier_id === ch.id).reduce((s,e)=>s+e.montant,0);
        const ach = DB.findByCompany('chantier_achats', cid).filter(a => a.chantier_id === ch.id).reduce((s,a)=>s+a.montant,0);
        const m = DB.findByCompany('chantier_main_oeuvre', cid).filter(a => a.chantier_id === ch.id).reduce((s,a)=>s+a.montant,0);
        const sorties = ach + m;
        const pct = ch.budget > 0 ? Math.round(sorties / ch.budget * 100) : 0;
        const pctColor = pct < 70 ? 'progress-green' : pct <= 100 ? 'progress-orange' : 'progress-red';
        const statusBadge = { en_cours: 'badge-info', termine: 'badge-success', pause: 'badge-warning', annule: 'badge-danger' };
        return `<div style="padding:12px;border:1px solid var(--border);border-radius:10px;margin-bottom:10px;cursor:pointer" onclick="navigate('chantiers')">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-weight:600;font-size:14px">${ch.nom}</span>
            <span class="badge ${statusBadge[ch.statut] || 'badge-secondary'}">${ch.statut.replace('_',' ')}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);margin-bottom:6px">
            <span>Budget: ${fmt(ch.budget)}</span><span>Dépensé: ${fmt(sorties)} (${pct}%)</span>
          </div>
          <div class="progress-bar-container"><div class="progress-bar ${pctColor}" style="width:${Math.min(pct,100)}%"></div></div>
        </div>`;
      }).join('')}
    </div>
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h3 style="font-weight:700;font-size:16px"><i class="fas fa-file-invoice-dollar" style="color:#dc2626;margin-right:8px"></i>Factures récentes</h3>
        <button class="btn btn-secondary btn-sm" onclick="navigate('factures')">Voir tout</button>
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>N°</th><th>Client</th><th>Montant</th><th>Statut</th></tr></thead>
          <tbody>
          ${factures.slice(0,5).map(f => {
            const stMap = { paye: ['badge-success','Payé'], non_paye: ['badge-danger','Impayé'], partiel: ['badge-warning','Partiel'] };
            const [cls, lbl] = stMap[f.statut] || ['badge-secondary', f.statut];
            return `<tr onclick="navigate('factures')" style="cursor:pointer">
              <td style="font-weight:600">${f.numero}</td>
              <td>${f.client_nom}</td>
              <td style="font-weight:600">${fmt(f.montant_ttc)}</td>
              <td><span class="badge ${cls}">${lbl}</span></td>
            </tr>`;
          }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  <script>
    window._chartCAData = ${JSON.stringify(caData)};
    window._chartDepData = ${JSON.stringify(depData)};
    window._chartMonths = ${JSON.stringify(months)};
  </script>`;
}

function statCard(label, value, icon, color, trend, change) {
  return `<div class="stat-card">
    <div class="stat-icon" style="background:${color}20"><i class="fas ${icon}" style="color:${color}"></i></div>
    <div class="stat-info">
      <div class="stat-label">${label}</div>
      <div class="stat-value">${value}</div>
      <div class="stat-change ${trend}"><i class="fas fa-arrow-${trend === 'up' ? 'up' : 'down'}"></i> ${change}</div>
    </div>
  </div>`;
}

function miniStatCard(label, value, icon, color, page) {
  return `<div class="card" style="cursor:pointer;text-align:center" onclick="navigate('${page}')">
    <div style="font-size:32px;margin-bottom:6px"><i class="fas ${icon}" style="color:${color}"></i></div>
    <div style="font-size:28px;font-weight:800;color:var(--text-primary)">${value}</div>
    <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">${label}</div>
  </div>`;
}

function initCharts() {
  setTimeout(() => {
    const months = window._chartMonths || ['Jan','Fév','Mar','Avr','Mai','Jun'];
    const caData = window._chartCAData || [0,0,0,0,0,0];
    const depData = window._chartDepData || [0,0,0,0,0,0];
    const isDark = AppState.theme === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    const ca = document.getElementById('chartCA');
    if (ca) {
      if (ca._chart) ca._chart.destroy();
      ca._chart = new Chart(ca, {
        type: 'bar',
        data: {
          labels: months,
          datasets: [
            { label: 'CA (DH)', data: caData, backgroundColor: 'rgba(37,99,235,0.7)', borderRadius: 6 },
            { label: 'Dépenses (DH)', data: depData, backgroundColor: 'rgba(220,38,38,0.7)', borderRadius: 6 },
          ]
        },
        options: {
          responsive: true, plugins: { legend: { labels: { color: textColor } } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, callback: v => (v/1000)+'k' } }
          }
        }
      });
    }

    const dep = document.getElementById('chartDep');
    if (dep) {
      if (dep._chart) dep._chart.destroy();
      dep._chart = new Chart(dep, {
        type: 'doughnut',
        data: {
          labels: ['Achats matériaux', 'Main d\'œuvre', 'Sous-traitance', 'Divers'],
          datasets: [{ data: [35, 30, 25, 10], backgroundColor: ['#2563eb','#7c3aed','#16a34a','#d97706'], borderWidth: 0 }]
        },
        options: {
          responsive: true, cutout: '65%',
          plugins: { legend: { position: 'bottom', labels: { color: textColor, padding: 10, font: { size: 11 } } } }
        }
      });
    }
  }, 100);
}

// ===== CHANTIERS =====
function renderChantiers() {
  const cid = AppState.currentCompany?.id;
  const chantiers = DB.findByCompany('chantiers', cid);
  const selectedId = AppState.selectedChantier;
  if (selectedId) return renderChantierDetail(selectedId);

  return `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div>
      <h2 style="font-size:20px;font-weight:700">Chantiers</h2>
      <p style="color:var(--text-secondary);font-size:13px">${chantiers.length} chantier(s) au total</p>
    </div>
    <button class="btn btn-primary" onclick="openNewChantierModal()"><i class="fas fa-plus"></i> Nouveau chantier</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px">
    ${chantiers.length === 0 ? `<div class="empty-state" style="grid-column:1/-1"><div class="icon">🏗️</div><h3>Aucun chantier</h3><p>Créez votre premier chantier</p><button class="btn btn-primary" style="margin-top:16px" onclick="openNewChantierModal()"><i class="fas fa-plus"></i> Créer un chantier</button></div>` :
    chantiers.map(ch => renderChantierCard(ch, cid)).join('')}
  </div>`;
}

function renderChantierCard(ch, cid) {
  const entrees = DB.findByCompany('chantier_entrees', cid).filter(e => e.chantier_id === ch.id).reduce((s,e)=>s+e.montant,0);
  const achats = DB.findByCompany('chantier_achats', cid).filter(a => a.chantier_id === ch.id).reduce((s,a)=>s+a.montant,0);
  const mdo = DB.findByCompany('chantier_main_oeuvre', cid).filter(a => a.chantier_id === ch.id).reduce((s,a)=>s+a.montant,0);
  const sorties = achats + mdo;
  const resultat = entrees - sorties;
  const pctBudget = ch.budget > 0 ? Math.round(sorties / ch.budget * 100) : 0;
  const pctColor = pctBudget < 70 ? '#22c55e' : pctBudget <= 100 ? '#f97316' : '#ef4444';
  const pctClass = pctBudget < 70 ? 'progress-green' : pctBudget <= 100 ? 'progress-orange' : 'progress-red';

  const statusMap = {
    en_cours: ['badge-info', 'fa-spinner', 'En cours'],
    termine: ['badge-success', 'fa-check-circle', 'Terminé'],
    pause: ['badge-warning', 'fa-pause-circle', 'En pause'],
    annule: ['badge-danger', 'fa-times-circle', 'Annulé']
  };
  const [sCls, sIcon, sLabel] = statusMap[ch.statut] || ['badge-secondary', 'fa-circle', ch.statut];

  return `
  <div class="chantier-card" onclick="openChantierDetail('${ch.id}')">
    <div style="height:4px;border-radius:4px;background:${pctColor};margin:-20px -20px 16px;border-radius:12px 12px 0 0;opacity:0.7"></div>
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
      <div>
        <h3 style="font-weight:700;font-size:15px;margin-bottom:3px">${ch.nom}</h3>
        <div style="font-size:12px;color:var(--text-secondary)"><i class="fas fa-user" style="margin-right:4px"></i>${ch.client_nom}</div>
      </div>
      <span class="badge ${sCls}"><i class="fas ${sIcon}" style="margin-right:3px"></i>${sLabel}</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
      <div style="background:var(--bg-main);border-radius:8px;padding:8px;text-align:center">
        <div style="font-size:11px;color:var(--text-secondary)">Entrées</div>
        <div style="font-weight:700;font-size:13px;color:#16a34a">${fmt(entrees)}</div>
      </div>
      <div style="background:var(--bg-main);border-radius:8px;padding:8px;text-align:center">
        <div style="font-size:11px;color:var(--text-secondary)">Sorties</div>
        <div style="font-weight:700;font-size:13px;color:#dc2626">${fmt(sorties)}</div>
      </div>
      <div style="background:var(--bg-main);border-radius:8px;padding:8px;text-align:center">
        <div style="font-size:11px;color:var(--text-secondary)">Résultat</div>
        <div style="font-weight:700;font-size:13px;color:${resultat>=0?'#16a34a':'#dc2626'}">${fmt(resultat)}</div>
      </div>
    </div>
    <div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);margin-bottom:5px">
        <span>Budget utilisé</span><span style="font-weight:600;color:${pctColor}">${pctBudget}%</span>
      </div>
      <div class="progress-bar-container"><div class="progress-bar ${pctClass}" style="width:${Math.min(pctBudget,100)}%"></div></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary)">
      <span><i class="fas fa-coins" style="margin-right:4px"></i>Budget: ${fmt(ch.budget)}</span>
      <span><i class="fas fa-calendar" style="margin-right:4px"></i>${fmtDate(ch.date_fin)}</span>
    </div>
  </div>`;
}

function openChantierDetail(id) {
  AppState.selectedChantier = id;
  navigate('chantiers');
}

function renderChantierDetail(id) {
  const cid = AppState.currentCompany?.id;
  const ch = DB.findByCompany('chantiers', cid).find(c => c.id === id);
  if (!ch) return '<div class="empty-state"><h3>Chantier introuvable</h3></div>';

  const entrees = DB.findByCompany('chantier_entrees', cid).filter(e => e.chantier_id === id);
  const achats = DB.findByCompany('chantier_achats', cid).filter(a => a.chantier_id === id);
  const mdo = DB.findByCompany('chantier_main_oeuvre', cid).filter(a => a.chantier_id === id);

  const totalEntrees = entrees.reduce((s,e)=>s+e.montant,0);
  const totalAchats = achats.reduce((s,a)=>s+a.montant,0);
  const totalMdo = mdo.reduce((s,a)=>s+a.montant,0);
  const totalSorties = totalAchats + totalMdo;
  const resultat = totalEntrees - totalSorties;
  const pctBudget = ch.budget > 0 ? Math.round(totalSorties / ch.budget * 100) : 0;
  const pctClass = pctBudget < 70 ? 'progress-green' : pctBudget <= 100 ? 'progress-orange' : 'progress-red';
  const pctColor = pctBudget < 70 ? '#22c55e' : pctBudget <= 100 ? '#f97316' : '#ef4444';

  return `
  <div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <button class="btn btn-secondary" onclick="backToChantiers()"><i class="fas fa-arrow-left"></i> Retour</button>
      <div style="flex:1">
        <h2 style="font-size:20px;font-weight:700">${ch.nom}</h2>
        <div style="color:var(--text-secondary);font-size:13px"><i class="fas fa-user" style="margin-right:4px"></i>${ch.client_nom} – Budget: ${fmt(ch.budget)}</div>
      </div>
      <button class="btn btn-secondary" onclick="editChantier('${id}')"><i class="fas fa-edit"></i> Modifier</button>
      <button class="btn btn-primary" onclick="printChantierRapport('${id}')"><i class="fas fa-file-pdf"></i> Rapport PDF</button>
      <button class="btn btn-danger" onclick="deleteChantier('${id}')"><i class="fas fa-trash"></i></button>
    </div>

    <!-- Budget Widget -->
    <div class="budget-widget" style="margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <h3 style="font-weight:700">Suivi budgétaire</h3>
        <span style="font-size:13px;color:${pctColor};font-weight:700">${pctBudget}% utilisé</span>
      </div>
      <div class="budget-stats">
        <div class="budget-stat"><div class="val" style="color:#2563eb">${fmt(ch.budget)}</div><div class="lbl">Budget total</div></div>
        <div class="budget-stat"><div class="val" style="color:#16a34a">${fmt(totalEntrees)}</div><div class="lbl">Total entrées</div></div>
        <div class="budget-stat"><div class="val" style="color:#dc2626">${fmt(totalSorties)}</div><div class="lbl">Total sorties</div></div>
        <div class="budget-stat"><div class="val" style="color:${resultat>=0?'#16a34a':'#dc2626'}">${fmt(resultat)}</div><div class="lbl">${resultat>=0?'Bénéfice':'Perte'}</div></div>
      </div>
      <div class="progress-bar-container" style="height:14px">
        <div class="progress-bar ${pctClass}" style="width:${Math.min(pctBudget,100)}%"></div>
      </div>
      ${pctBudget > 100 ? `<div style="margin-top:8px;padding:8px 12px;background:rgba(220,38,38,0.1);border-radius:8px;color:#dc2626;font-size:13px;font-weight:600"><i class="fas fa-exclamation-triangle" style="margin-right:6px"></i>Budget dépassé de ${fmt(totalSorties-ch.budget)} !</div>` : ''}
    </div>

    <!-- Tabs -->
    <div class="tabs-nav">
      <button class="tab-btn active" data-tab="entrees" onclick="switchChantierTab('entrees',this)"><i class="fas fa-arrow-down-circle"></i> Entrées (${entrees.length})</button>
      <button class="tab-btn" data-tab="achats" onclick="switchChantierTab('achats',this)"><i class="fas fa-shopping-cart"></i> Achats (${achats.length})</button>
      <button class="tab-btn" data-tab="mdo" onclick="switchChantierTab('mdo',this)"><i class="fas fa-hard-hat"></i> Main d'œuvre (${mdo.length})</button>
    </div>

    <div id="chantier-tab-content">
      ${renderChantierEntrees(entrees, id)}
    </div>
  </div>`;
}

function switchChantierTab(tab, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const cid = AppState.currentCompany?.id;
  const id = AppState.selectedChantier;
  const content = document.getElementById('chantier-tab-content');
  if (tab === 'entrees') {
    const data = DB.findByCompany('chantier_entrees', cid).filter(e => e.chantier_id === id);
    content.innerHTML = renderChantierEntrees(data, id);
  } else if (tab === 'achats') {
    const data = DB.findByCompany('chantier_achats', cid).filter(a => a.chantier_id === id);
    content.innerHTML = renderChantierAchats(data, id);
  } else if (tab === 'mdo') {
    const data = DB.findByCompany('chantier_main_oeuvre', cid).filter(a => a.chantier_id === id);
    content.innerHTML = renderChantierMdo(data, id);
  }
}

function renderChantierEntrees(data, chantier_id) {
  return `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
    <h3 style="font-weight:700"><i class="fas fa-arrow-down-circle" style="color:#16a34a;margin-right:8px"></i>Entrées / Avances client</h3>
    <button class="btn btn-success btn-sm" onclick="openAddEntreeModal('${chantier_id}')"><i class="fas fa-plus"></i> Ajouter</button>
  </div>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Date</th><th>Description</th><th>Montant</th><th>Actions</th></tr></thead>
      <tbody>
      ${data.length === 0 ? `<tr><td colspan="4"><div class="empty-state" style="padding:30px"><div class="icon" style="font-size:36px">💰</div><p>Aucune entrée enregistrée</p></div></td></tr>` :
      data.map(e => `<tr>
        <td>${fmtDate(e.date)}</td>
        <td>${e.description}</td>
        <td style="font-weight:700;color:#16a34a">${fmt(e.montant)}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="deleteEntree('${e.id}')"><i class="fas fa-trash" style="color:#dc2626"></i></button>
        </td>
      </tr>`).join('')}
      </tbody>
      ${data.length > 0 ? `<tfoot><tr style="background:var(--bg-main)"><td colspan="2" style="font-weight:700;padding:12px 16px">Total entrées</td><td style="font-weight:800;color:#16a34a;padding:12px 16px">${fmt(data.reduce((s,e)=>s+e.montant,0))}</td><td></td></tr></tfoot>` : ''}
    </table>
  </div>`;
}

function renderChantierAchats(data, chantier_id) {
  return `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
    <h3 style="font-weight:700"><i class="fas fa-shopping-cart" style="color:#2563eb;margin-right:8px"></i>Achats & Matériaux</h3>
    <button class="btn btn-primary btn-sm" onclick="openAddAchatModal('${chantier_id}')"><i class="fas fa-plus"></i> Ajouter</button>
  </div>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Date</th><th>Fournisseur</th><th>Produit/Description</th><th>Montant</th><th>Actions</th></tr></thead>
      <tbody>
      ${data.length === 0 ? `<tr><td colspan="5"><div class="empty-state" style="padding:30px"><div class="icon" style="font-size:36px">🛒</div><p>Aucun achat enregistré</p></div></td></tr>` :
      data.map(a => `<tr>
        <td>${fmtDate(a.date)}</td>
        <td>${a.fournisseur}</td>
        <td>${a.produit}</td>
        <td style="font-weight:700;color:#dc2626">${fmt(a.montant)}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="deleteAchat('${a.id}')"><i class="fas fa-trash" style="color:#dc2626"></i></button></td>
      </tr>`).join('')}
      </tbody>
      ${data.length > 0 ? `<tfoot><tr style="background:var(--bg-main)"><td colspan="3" style="font-weight:700;padding:12px 16px">Total achats</td><td style="font-weight:800;color:#dc2626;padding:12px 16px">${fmt(data.reduce((s,a)=>s+a.montant,0))}</td><td></td></tr></tfoot>` : ''}
    </table>
  </div>`;
}

function renderChantierMdo(data, chantier_id) {
  const typeMap = { journalier: ['badge-info','Journalier'], a_la_tache: ['badge-warning','À la tâche'], prestataire: ['badge-purple','Prestataire'] };
  return `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
    <h3 style="font-weight:700"><i class="fas fa-hard-hat" style="color:#7c3aed;margin-right:8px"></i>Main d'œuvre</h3>
    <button class="btn btn-secondary btn-sm" style="background:#7c3aed;color:#fff" onclick="openAddMdoModal('${chantier_id}')"><i class="fas fa-plus"></i> Ajouter</button>
  </div>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Date</th><th>Nom</th><th>Type</th><th>Description</th><th>Montant</th><th>Actions</th></tr></thead>
      <tbody>
      ${data.length === 0 ? `<tr><td colspan="6"><div class="empty-state" style="padding:30px"><div class="icon" style="font-size:36px">👷</div><p>Aucune main d'œuvre enregistrée</p></div></td></tr>` :
      data.map(m => {
        const [cls, lbl] = typeMap[m.type] || ['badge-secondary', m.type];
        return `<tr>
          <td>${fmtDate(m.date)}</td>
          <td style="font-weight:600">${m.nom}</td>
          <td><span class="badge ${cls}">${lbl}</span></td>
          <td style="color:var(--text-secondary)">${m.description || '–'}</td>
          <td style="font-weight:700;color:#dc2626">${fmt(m.montant)}</td>
          <td><button class="btn btn-ghost btn-sm" onclick="deleteMdo('${m.id}')"><i class="fas fa-trash" style="color:#dc2626"></i></button></td>
        </tr>`;
      }).join('')}
      </tbody>
      ${data.length > 0 ? `<tfoot><tr style="background:var(--bg-main)"><td colspan="4" style="font-weight:700;padding:12px 16px">Total main d'œuvre</td><td style="font-weight:800;color:#dc2626;padding:12px 16px">${fmt(data.reduce((s,m)=>s+m.montant,0))}</td><td></td></tr></tfoot>` : ''}
    </table>
  </div>`;
}

function backToChantiers() {
  delete AppState.selectedChantier;
  navigate('chantiers');
}

// MODALS CHANTIER
function openNewChantierModal() {
  const cid = AppState.currentCompany?.id;
  const clients = DB.findByCompany('clients', cid);
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-hard-hat" style="color:#7c3aed;margin-right:8px"></i>Nouveau chantier</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Nom du chantier <span class="req">*</span></label><input id="ch-nom" class="form-input" placeholder="Villa Résidentielle..."/></div>
      <div class="form-group"><label class="form-label">Client</label>
        <select id="ch-client" class="form-select">
          <option value="">– Sélectionner –</option>
          ${clients.map(c=>`<option value="${c.id}" data-nom="${c.name}">${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Budget total (DH) <span class="req">*</span></label><input id="ch-budget" type="number" class="form-input" placeholder="500000"/></div>
      <div class="form-group"><label class="form-label">Statut</label>
        <select id="ch-statut" class="form-select">
          <option value="en_cours">En cours</option><option value="pause">En pause</option><option value="termine">Terminé</option><option value="annule">Annulé</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Date début</label><input id="ch-debut" type="date" class="form-input"/></div>
      <div class="form-group"><label class="form-label">Date fin prévue</label><input id="ch-fin" type="date" class="form-input"/></div>
    </div>
    <div class="form-group"><label class="form-label">Description</label><textarea id="ch-desc" class="form-textarea" placeholder="Description du chantier..."></textarea></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveChantier()"><i class="fas fa-save"></i> Créer le chantier</button>
    </div>`);
}

function saveChantier() {
  const cid = AppState.currentCompany?.id;
  const nom = document.getElementById('ch-nom').value.trim();
  const budget = parseFloat(document.getElementById('ch-budget').value) || 0;
  if (!nom) { toast('Le nom du chantier est requis', 'danger'); return; }
  const clientEl = document.getElementById('ch-client');
  const clientId = clientEl.value;
  const clientNom = clientEl.options[clientEl.selectedIndex]?.dataset.nom || '';
  DB.push('chantiers', {
    company_id: cid, nom, client_id: clientId, client_nom: clientNom, budget,
    date_debut: document.getElementById('ch-debut').value,
    date_fin: document.getElementById('ch-fin').value,
    statut: document.getElementById('ch-statut').value,
    description: document.getElementById('ch-desc').value
  });
  closeModal();
  toast('Chantier créé avec succès', 'success');
  navigate('chantiers');
}

function deleteChantier(id) {
  confirm('Supprimer ce chantier et toutes ses données ?', () => {
    DB.delete('chantiers', id);
    DB.set('chantier_entrees', DB.getAll('chantier_entrees').filter(e=>e.chantier_id!==id));
    DB.set('chantier_achats', DB.getAll('chantier_achats').filter(a=>a.chantier_id!==id));
    DB.set('chantier_main_oeuvre', DB.getAll('chantier_main_oeuvre').filter(m=>m.chantier_id!==id));
    delete AppState.selectedChantier;
    toast('Chantier supprimé', 'danger');
    navigate('chantiers');
  });
}

function editChantier(id) {
  const cid = AppState.currentCompany?.id;
  const ch = DB.findByCompany('chantiers', cid).find(c => c.id === id);
  const clients = DB.findByCompany('clients', cid);
  if (!ch) return;
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-edit" style="margin-right:8px"></i>Modifier le chantier</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Nom</label><input id="ech-nom" class="form-input" value="${ch.nom}"/></div>
      <div class="form-group"><label class="form-label">Client</label>
        <select id="ech-client" class="form-select">
          <option value="">– Sélectionner –</option>
          ${clients.map(c=>`<option value="${c.id}" data-nom="${c.name}" ${c.id===ch.client_id?'selected':''}>${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Budget (DH)</label><input id="ech-budget" type="number" class="form-input" value="${ch.budget}"/></div>
      <div class="form-group"><label class="form-label">Statut</label>
        <select id="ech-statut" class="form-select">
          <option value="en_cours" ${ch.statut==='en_cours'?'selected':''}>En cours</option>
          <option value="pause" ${ch.statut==='pause'?'selected':''}>En pause</option>
          <option value="termine" ${ch.statut==='termine'?'selected':''}>Terminé</option>
          <option value="annule" ${ch.statut==='annule'?'selected':''}>Annulé</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Date début</label><input id="ech-debut" type="date" class="form-input" value="${fmtDateInput(ch.date_debut)}"/></div>
      <div class="form-group"><label class="form-label">Date fin</label><input id="ech-fin" type="date" class="form-input" value="${fmtDateInput(ch.date_fin)}"/></div>
    </div>
    <div class="form-group"><label class="form-label">Description</label><textarea id="ech-desc" class="form-textarea">${ch.description||''}</textarea></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="updateChantier('${id}')"><i class="fas fa-save"></i> Enregistrer</button>
    </div>`);
}

function updateChantier(id) {
  const clientEl = document.getElementById('ech-client');
  DB.update('chantiers', id, {
    nom: document.getElementById('ech-nom').value,
    client_id: clientEl.value,
    client_nom: clientEl.options[clientEl.selectedIndex]?.dataset.nom || '',
    budget: parseFloat(document.getElementById('ech-budget').value) || 0,
    statut: document.getElementById('ech-statut').value,
    date_debut: document.getElementById('ech-debut').value,
    date_fin: document.getElementById('ech-fin').value,
    description: document.getElementById('ech-desc').value,
  });
  closeModal();
  toast('Chantier mis à jour', 'success');
  renderPage('chantiers');
}

function openAddEntreeModal(chantier_id) {
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-plus-circle" style="color:#16a34a;margin-right:8px"></i>Ajouter une entrée</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="form-group"><label class="form-label">Montant (DH) <span class="req">*</span></label><input id="ent-montant" type="number" class="form-input" placeholder="100000"/></div>
    <div class="form-group"><label class="form-label">Date</label><input id="ent-date" type="date" class="form-input" value="${new Date().toISOString().split('T')[0]}"/></div>
    <div class="form-group"><label class="form-label">Description</label><input id="ent-desc" class="form-input" placeholder="Avance client, 2ème tranche..."/></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-success" onclick="saveEntree('${chantier_id}')"><i class="fas fa-save"></i> Ajouter</button>
    </div>`);
}

function saveEntree(chantier_id) {
  const montant = parseFloat(document.getElementById('ent-montant').value);
  if (!montant) { toast('Montant requis', 'danger'); return; }
  DB.push('chantier_entrees', { company_id: AppState.currentCompany.id, chantier_id, montant, date: document.getElementById('ent-date').value, description: document.getElementById('ent-desc').value });
  closeModal(); toast('Entrée ajoutée', 'success'); renderPage('chantiers');
}

function deleteEntree(id) { confirm('Supprimer cette entrée ?', () => { DB.delete('chantier_entrees', id); toast('Supprimé', 'danger'); renderPage('chantiers'); }); }

function openAddAchatModal(chantier_id) {
  const cid = AppState.currentCompany?.id;
  const fournisseurs = DB.findByCompany('fournisseurs', cid);
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-shopping-cart" style="color:#2563eb;margin-right:8px"></i>Ajouter un achat</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Fournisseur</label>
        <input id="ach-fournisseur" class="form-input" list="fournisseurs-list" placeholder="Nom fournisseur"/>
        <datalist id="fournisseurs-list">${fournisseurs.map(f=>`<option value="${f.name}">`).join('')}</datalist>
      </div>
      <div class="form-group"><label class="form-label">Produit / Description <span class="req">*</span></label><input id="ach-produit" class="form-input" placeholder="Ciment, ferraille..."/></div>
      <div class="form-group"><label class="form-label">Montant (DH) <span class="req">*</span></label><input id="ach-montant" type="number" class="form-input" placeholder="50000"/></div>
      <div class="form-group"><label class="form-label">Date</label><input id="ach-date" type="date" class="form-input" value="${new Date().toISOString().split('T')[0]}"/></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveAchat('${chantier_id}')"><i class="fas fa-save"></i> Ajouter</button>
    </div>`);
}

function saveAchat(chantier_id) {
  const montant = parseFloat(document.getElementById('ach-montant').value);
  const produit = document.getElementById('ach-produit').value.trim();
  if (!montant || !produit) { toast('Produit et montant requis', 'danger'); return; }
  DB.push('chantier_achats', { company_id: AppState.currentCompany.id, chantier_id, fournisseur: document.getElementById('ach-fournisseur').value, produit, montant, date: document.getElementById('ach-date').value });
  closeModal(); toast('Achat ajouté', 'success'); renderPage('chantiers');
}

function deleteAchat(id) { confirm('Supprimer cet achat ?', () => { DB.delete('chantier_achats', id); toast('Supprimé', 'danger'); renderPage('chantiers'); }); }

function openAddMdoModal(chantier_id) {
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-hard-hat" style="color:#7c3aed;margin-right:8px"></i>Ajouter main d'œuvre</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Nom / Équipe <span class="req">*</span></label><input id="mdo-nom" class="form-input" placeholder="Ahmed, Équipe maçonnerie..."/></div>
      <div class="form-group"><label class="form-label">Type <span class="req">*</span></label>
        <select id="mdo-type" class="form-select">
          <option value="journalier">Journalier</option>
          <option value="a_la_tache">À la tâche</option>
          <option value="prestataire">Prestataire</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Montant total (DH) <span class="req">*</span></label><input id="mdo-montant" type="number" class="form-input" placeholder="15000"/></div>
      <div class="form-group"><label class="form-label">Date</label><input id="mdo-date" type="date" class="form-input" value="${new Date().toISOString().split('T')[0]}"/></div>
    </div>
    <div class="form-group"><label class="form-label">Description</label><input id="mdo-desc" class="form-input" placeholder="10 jours x 5 ouvriers, installation électrique..."/></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" style="background:#7c3aed" onclick="saveMdo('${chantier_id}')"><i class="fas fa-save"></i> Ajouter</button>
    </div>`);
}

function saveMdo(chantier_id) {
  const montant = parseFloat(document.getElementById('mdo-montant').value);
  const nom = document.getElementById('mdo-nom').value.trim();
  if (!montant || !nom) { toast('Nom et montant requis', 'danger'); return; }
  DB.push('chantier_main_oeuvre', { company_id: AppState.currentCompany.id, chantier_id, nom, type: document.getElementById('mdo-type').value, montant, date: document.getElementById('mdo-date').value, description: document.getElementById('mdo-desc').value });
  closeModal(); toast('Main d\'œuvre ajoutée', 'success'); renderPage('chantiers');
}

function deleteMdo(id) { confirm('Supprimer cette entrée ?', () => { DB.delete('chantier_main_oeuvre', id); toast('Supprimé', 'danger'); renderPage('chantiers'); }); }

// ===== CLIENTS =====
function renderClients() {
  const cid = AppState.currentCompany?.id;
  const clients = DB.findByCompany('clients', cid);
  return `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div><h2 style="font-size:20px;font-weight:700">Clients</h2><p style="color:var(--text-secondary);font-size:13px">${clients.length} client(s)</p></div>
    <button class="btn btn-primary" onclick="openNewClientModal()"><i class="fas fa-plus"></i> Nouveau client</button>
  </div>
  <div class="filters-bar">
    <div class="search-input-wrap"><i class="fas fa-search"></i><input type="text" class="form-input" id="search-clients" placeholder="Rechercher client..." oninput="filterClients()"/></div>
    <select class="form-select" style="width:160px" id="filter-client-type" onchange="filterClients()">
      <option value="">Tous types</option><option value="particulier">Particulier</option><option value="entreprise">Entreprise</option>
    </select>
  </div>
  <div class="table-wrapper">
    <table id="clients-table">
      <thead><tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Ville</th><th>Type</th><th>Date création</th><th>Actions</th></tr></thead>
      <tbody id="clients-tbody">
        ${renderClientsRows(clients)}
      </tbody>
    </table>
  </div>`;
}

function renderClientsRows(clients) {
  if (clients.length === 0) return `<tr><td colspan="7"><div class="empty-state" style="padding:40px"><div class="icon">👥</div><h3>Aucun client</h3><p>Ajoutez votre premier client</p></div></td></tr>`;
  return clients.map(c => `<tr>
    <td style="font-weight:600">${c.name}</td>
    <td style="color:var(--text-secondary)">${c.email || '–'}</td>
    <td>${c.phone || '–'}</td>
    <td>${c.city || '–'}</td>
    <td><span class="badge ${c.type==='entreprise'?'badge-info':'badge-secondary'}">${c.type==='entreprise'?'Entreprise':'Particulier'}</span></td>
    <td style="color:var(--text-secondary)">${fmtDate(c.created_at)}</td>
    <td>
      <button class="btn btn-ghost btn-sm" onclick="editClient('${c.id}')"><i class="fas fa-edit"></i></button>
      <button class="btn btn-ghost btn-sm" onclick="deleteClient('${c.id}')"><i class="fas fa-trash" style="color:#dc2626"></i></button>
    </td>
  </tr>`).join('');
}

function filterClients() {
  const cid = AppState.currentCompany?.id;
  let clients = DB.findByCompany('clients', cid);
  const q = document.getElementById('search-clients')?.value.toLowerCase() || '';
  const type = document.getElementById('filter-client-type')?.value || '';
  if (q) clients = clients.filter(c => c.name.toLowerCase().includes(q) || (c.email||'').toLowerCase().includes(q));
  if (type) clients = clients.filter(c => c.type === type);
  document.getElementById('clients-tbody').innerHTML = renderClientsRows(clients);
}

function openNewClientModal(data = null) {
  const isEdit = !!data;
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-user-plus" style="margin-right:8px;color:#2563eb"></i>${isEdit ? 'Modifier client' : 'Nouveau client'}</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Nom complet <span class="req">*</span></label><input id="cl-nom" class="form-input" value="${data?.name||''}" placeholder="Mohamed Alaoui"/></div>
      <div class="form-group"><label class="form-label">Type</label>
        <select id="cl-type" class="form-select">
          <option value="particulier" ${data?.type==='particulier'?'selected':''}>Particulier</option>
          <option value="entreprise" ${data?.type==='entreprise'?'selected':''}>Entreprise</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Email</label><input id="cl-email" type="email" class="form-input" value="${data?.email||''}" placeholder="email@example.com"/></div>
      <div class="form-group"><label class="form-label">Téléphone</label><input id="cl-phone" class="form-input" value="${data?.phone||''}" placeholder="0661001100"/></div>
      <div class="form-group"><label class="form-label">Ville</label><input id="cl-city" class="form-input" value="${data?.city||''}" placeholder="Casablanca"/></div>
      <div class="form-group"><label class="form-label">Adresse</label><input id="cl-address" class="form-input" value="${data?.address||''}" placeholder="Adresse complète"/></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveClient(${isEdit?`'${data.id}'`:'null'})"><i class="fas fa-save"></i> ${isEdit?'Mettre à jour':'Créer'}</button>
    </div>`);
}

function saveClient(id = null) {
  const nom = document.getElementById('cl-nom').value.trim();
  if (!nom) { toast('Nom requis', 'danger'); return; }
  const data = { company_id: AppState.currentCompany.id, name: nom, type: document.getElementById('cl-type').value, email: document.getElementById('cl-email').value, phone: document.getElementById('cl-phone').value, city: document.getElementById('cl-city').value, address: document.getElementById('cl-address').value };
  if (id) { DB.update('clients', id, data); toast('Client mis à jour', 'success'); }
  else { DB.push('clients', data); toast('Client créé', 'success'); }
  closeModal(); navigate('clients');
}

function editClient(id) {
  const cid = AppState.currentCompany?.id;
  const c = DB.findByCompany('clients', cid).find(x => x.id === id);
  if (c) openNewClientModal(c);
}

function deleteClient(id) { confirm('Supprimer ce client ?', () => { DB.delete('clients', id); toast('Client supprimé', 'danger'); navigate('clients'); }); }

// ===== DEVIS =====
function renderDevis() {
  const cid = AppState.currentCompany?.id;
  const devis = DB.findByCompany('devis', cid);
  const stMap = { accepte: 'badge-success', en_attente: 'badge-warning', refuse: 'badge-danger', expire: 'badge-secondary' };
  const stLabel = { accepte: 'Accepté', en_attente: 'En attente', refuse: 'Refusé', expire: 'Expiré' };
  return `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div><h2 style="font-size:20px;font-weight:700">Devis</h2><p style="color:var(--text-secondary);font-size:13px">${devis.length} devis au total</p></div>
    <button class="btn btn-primary" onclick="openNewDevisModal()"><i class="fas fa-plus"></i> Nouveau devis</button>
  </div>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Numéro</th><th>Client</th><th>Date</th><th>Validité</th><th>Montant HT</th><th>Montant TTC</th><th>Statut</th><th>Actions</th></tr></thead>
      <tbody>
        ${devis.length === 0 ? `<tr><td colspan="8"><div class="empty-state" style="padding:40px"><div class="icon">📄</div><h3>Aucun devis</h3></div></td></tr>` :
        devis.map(d => `<tr>
          <td style="font-weight:700">${d.numero}</td>
          <td>${d.client_nom}</td>
          <td>${fmtDate(d.date)}</td>
          <td>${fmtDate(d.validite)}</td>
          <td>${fmt(d.montant_ht)}</td>
          <td style="font-weight:700">${fmt(d.montant_ttc)}</td>
          <td><span class="badge ${stMap[d.statut]||'badge-secondary'}">${stLabel[d.statut]||d.statut}</span></td>
          <td style="white-space:nowrap">
            <button class="btn btn-ghost btn-sm" title="Aperçu" onclick="previewDevis('${d.id}')"><i class="fas fa-eye" style="color:#7c3aed"></i></button>
            ${d.statut === 'en_attente' ? `<button class="btn btn-ghost btn-sm" title="Modifier" onclick="editDevis('${d.id}')"><i class="fas fa-edit" style="color:#2563eb"></i></button>` : ''}
            <button class="btn btn-ghost btn-sm" title="Imprimer / PDF" onclick="printDevis('${d.id}')"><i class="fas fa-print" style="color:#0891b2"></i></button>
            <button class="btn btn-ghost btn-sm" title="Convertir en facture" onclick="convertToFacture('${d.id}')"><i class="fas fa-file-invoice-dollar" style="color:#16a34a"></i></button>
            <button class="btn btn-ghost btn-sm" title="Supprimer" onclick="deleteDevis('${d.id}')"><i class="fas fa-trash" style="color:#dc2626"></i></button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

function openNewDevisModal() {
  const cid = AppState.currentCompany?.id;
  const clients = DB.findByCompany('clients', cid);
  const num = 'DEV-' + new Date().getFullYear() + '-' + String(DB.findByCompany('devis',cid).length+1).padStart(3,'0');
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-file-alt" style="color:#2563eb;margin-right:8px"></i>Nouveau devis</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Numéro</label><input id="dv-num" class="form-input" value="${num}" readonly style="background:var(--bg-main)"/></div>
      <div class="form-group"><label class="form-label">Client <span class="req">*</span></label>
        <select id="dv-client" class="form-select">
          <option value="">– Sélectionner –</option>
          ${clients.map(c=>`<option value="${c.id}" data-nom="${c.name}">${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Date</label><input id="dv-date" type="date" class="form-input" value="${new Date().toISOString().split('T')[0]}"/></div>
      <div class="form-group"><label class="form-label">Date validité</label><input id="dv-validite" type="date" class="form-input"/></div>
    </div>
    <div style="margin-bottom:16px">
      <label class="form-label">Lignes du devis</label>
      <div id="devis-lignes">
        <div class="devis-ligne" style="display:grid;grid-template-columns:3fr 1fr 1fr auto;gap:8px;margin-bottom:8px">
          <input class="form-input" placeholder="Désignation" name="designation"/>
          <input type="number" class="form-input" placeholder="Qté" name="qte" value="1" oninput="calcDevisTotal()"/>
          <input type="number" class="form-input" placeholder="Prix unitaire" name="prix" oninput="calcDevisTotal()"/>
          <button class="btn btn-ghost" onclick="removeDevisLigne(this)"><i class="fas fa-minus-circle" style="color:#dc2626"></i></button>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="addDevisLigne()"><i class="fas fa-plus"></i> Ajouter ligne</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;background:var(--bg-main);padding:14px;border-radius:10px;margin-bottom:16px">
      <div><div style="font-size:12px;color:var(--text-secondary)">Total HT</div><div id="dv-total-ht" style="font-size:18px;font-weight:700">0 DH</div></div>
      <div><label class="form-label">TVA (%)</label><input id="dv-tva" type="number" class="form-input" value="20" oninput="calcDevisTotal()"/></div>
      <div><div style="font-size:12px;color:var(--text-secondary)">Total TTC</div><div id="dv-total-ttc" style="font-size:18px;font-weight:700;color:#2563eb">0 DH</div></div>
    </div>
    <div class="form-group"><label class="form-label">Notes</label><textarea id="dv-notes" class="form-textarea" placeholder="Conditions, remarques..."></textarea></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveDevis()"><i class="fas fa-save"></i> Créer le devis</button>
    </div>`, 'modal-lg');
  calcDevisTotal();
}

function addDevisLigne() {
  const c = document.getElementById('devis-lignes');
  const d = document.createElement('div');
  d.className = 'devis-ligne';
  d.style.cssText = 'display:grid;grid-template-columns:3fr 1fr 1fr auto;gap:8px;margin-bottom:8px';
  d.innerHTML = `<input class="form-input" placeholder="Désignation" name="designation"/><input type="number" class="form-input" placeholder="Qté" name="qte" value="1" oninput="calcDevisTotal()"/><input type="number" class="form-input" placeholder="Prix unitaire" name="prix" oninput="calcDevisTotal()"/><button class="btn btn-ghost" onclick="removeDevisLigne(this)"><i class="fas fa-minus-circle" style="color:#dc2626"></i></button>`;
  c.appendChild(d);
}

function removeDevisLigne(btn) {
  btn.closest('.devis-ligne').remove();
  calcDevisTotal();
}

function calcDevisTotal() {
  let ht = 0;
  document.querySelectorAll('.devis-ligne').forEach(l => {
    const qte = parseFloat(l.querySelector('[name="qte"]')?.value) || 0;
    const prix = parseFloat(l.querySelector('[name="prix"]')?.value) || 0;
    ht += qte * prix;
  });
  const tva = parseFloat(document.getElementById('dv-tva')?.value) || 0;
  const ttc = ht * (1 + tva/100);
  const htEl = document.getElementById('dv-total-ht');
  const ttcEl = document.getElementById('dv-total-ttc');
  if (htEl) htEl.textContent = fmt(ht);
  if (ttcEl) ttcEl.textContent = fmt(ttc);
}

function saveDevis() {
  const clientEl = document.getElementById('dv-client');
  if (!clientEl.value) { toast('Sélectionnez un client', 'danger'); return; }
  const lignes = [];
  document.querySelectorAll('.devis-ligne').forEach(l => {
    const des = l.querySelector('[name="designation"]')?.value;
    const qte = parseFloat(l.querySelector('[name="qte"]')?.value) || 1;
    const prix = parseFloat(l.querySelector('[name="prix"]')?.value) || 0;
    if (des) lignes.push({ designation: des, qte, prix });
  });
  if (lignes.length === 0) { toast('Ajoutez au moins une ligne', 'danger'); return; }
  const ht = lignes.reduce((s,l)=>s+l.qte*l.prix,0);
  const tva = parseFloat(document.getElementById('dv-tva').value) || 0;
  DB.push('devis', { company_id: AppState.currentCompany.id, numero: document.getElementById('dv-num').value, client_id: clientEl.value, client_nom: clientEl.options[clientEl.selectedIndex].dataset.nom, date: document.getElementById('dv-date').value, validite: document.getElementById('dv-validite').value, statut: 'en_attente', montant_ht: ht, tva, montant_ttc: ht*(1+tva/100), lignes, notes: document.getElementById('dv-notes').value });
  closeModal(); toast('Devis créé', 'success'); navigate('devis');
}

function deleteDevis(id) { confirm('Supprimer ce devis ?', () => { DB.delete('devis', id); toast('Devis supprimé', 'danger'); navigate('devis'); }); }

function previewDevis(id) {
  const cid = AppState.currentCompany?.id;
  const d = DB.findByCompany('devis', cid).find(x => x.id === id);
  if (!d) return;
  const stMap = { accepte: 'badge-success', en_attente: 'badge-warning', refuse: 'badge-danger', expire: 'badge-secondary' };
  const stLabel = { accepte: 'Accepté', en_attente: 'En attente', refuse: 'Refusé', expire: 'Expiré' };
  const lignesHtml = (d.lignes || []).map(l => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid var(--border)">${l.designation}</td>
      <td style="padding:10px 14px;border-bottom:1px solid var(--border);text-align:center">${l.qte}</td>
      <td style="padding:10px 14px;border-bottom:1px solid var(--border);text-align:right">${fmt(l.prix)}</td>
      <td style="padding:10px 14px;border-bottom:1px solid var(--border);text-align:right;font-weight:600">${fmt(l.qte * l.prix)}</td>
    </tr>`).join('');
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-eye" style="color:#7c3aed;margin-right:8px"></i>Aperçu devis – ${d.numero}</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div style="background:var(--bg-main);border-radius:10px;padding:16px;margin-bottom:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div>
          <div style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;margin-bottom:4px">Client</div>
          <div style="font-weight:700;font-size:15px">${d.client_nom}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;margin-bottom:4px">Statut</div>
          <span class="badge ${stMap[d.statut] || 'badge-secondary'}">${stLabel[d.statut] || d.statut}</span>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;margin-bottom:4px">Date émission</div>
          <div style="font-weight:600">${fmtDate(d.date)}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;margin-bottom:4px">Date validité</div>
          <div style="font-weight:600;color:${new Date(d.validite) < new Date() ? '#dc2626' : 'inherit'}">${fmtDate(d.validite)}</div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;background:var(--bg-card);border-radius:8px;overflow:hidden">
        <thead><tr style="background:var(--primary);color:#fff">
          <th style="padding:10px 14px;text-align:left">Désignation</th>
          <th style="padding:10px 14px;text-align:center">Qté</th>
          <th style="padding:10px 14px;text-align:right">Prix Unit.</th>
          <th style="padding:10px 14px;text-align:right">Total HT</th>
        </tr></thead>
        <tbody>${lignesHtml}</tbody>
      </table>
      <div style="margin-top:16px;display:flex;flex-direction:column;align-items:flex-end;gap:6px">
        <div style="display:flex;gap:40px">
          <span style="color:var(--text-secondary)">Total HT</span>
          <span style="font-weight:700">${fmt(d.montant_ht)}</span>
        </div>
        <div style="display:flex;gap:40px">
          <span style="color:var(--text-secondary)">TVA (${d.tva}%)</span>
          <span style="font-weight:700">${fmt(d.montant_ht * d.tva / 100)}</span>
        </div>
        <div style="display:flex;gap:40px;padding-top:8px;border-top:2px solid var(--primary);margin-top:4px">
          <span style="color:var(--primary);font-weight:700;font-size:15px">Total TTC</span>
          <span style="font-weight:800;font-size:18px;color:var(--primary)">${fmt(d.montant_ttc)}</span>
        </div>
      </div>
      ${d.notes ? `<div style="margin-top:14px;padding:10px;background:rgba(37,99,235,0.06);border-radius:8px;border-left:3px solid var(--primary)"><div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px">Notes</div><div style="font-size:13px">${d.notes}</div></div>` : ''}
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Fermer</button>
      ${d.statut === 'en_attente' ? `<button class="btn btn-warning" onclick="closeModal();editDevis('${d.id}')"><i class="fas fa-edit"></i> Modifier</button>` : ''}
      <button class="btn btn-primary" onclick="printDevis('${d.id}')"><i class="fas fa-print"></i> Imprimer PDF</button>
    </div>`, 'modal-lg');
}

function editDevis(id) {
  const cid = AppState.currentCompany?.id;
  const d = DB.findByCompany('devis', cid).find(x => x.id === id);
  if (!d) return;
  const clients = DB.findByCompany('clients', cid);
  const lignesHtml = (d.lignes || []).map(l => `
    <div class="devis-ligne" style="display:grid;grid-template-columns:3fr 1fr 1fr auto;gap:8px;margin-bottom:8px">
      <input class="form-input" placeholder="Désignation" name="designation" value="${l.designation}"/>
      <input type="number" class="form-input" placeholder="Qté" name="qte" value="${l.qte}" oninput="calcDevisTotal()"/>
      <input type="number" class="form-input" placeholder="Prix unitaire" name="prix" value="${l.prix}" oninput="calcDevisTotal()"/>
      <button class="btn btn-ghost" onclick="removeDevisLigne(this)"><i class="fas fa-minus-circle" style="color:#dc2626"></i></button>
    </div>`).join('');
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-edit" style="color:#2563eb;margin-right:8px"></i>Modifier devis – ${d.numero}</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Numéro</label><input id="dv-num" class="form-input" value="${d.numero}" readonly style="background:var(--bg-main)"/></div>
      <div class="form-group"><label class="form-label">Client <span class="req">*</span></label>
        <select id="dv-client" class="form-select">
          <option value="">– Sélectionner –</option>
          ${clients.map(c => `<option value="${c.id}" data-nom="${c.name}" ${c.id === d.client_id ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Date</label><input id="dv-date" type="date" class="form-input" value="${d.date}"/></div>
      <div class="form-group"><label class="form-label">Date validité</label><input id="dv-validite" type="date" class="form-input" value="${d.validite}"/></div>
    </div>
    <div style="margin-bottom:16px">
      <label class="form-label">Lignes du devis</label>
      <div id="devis-lignes">${lignesHtml}</div>
      <button class="btn btn-secondary btn-sm" onclick="addDevisLigne()"><i class="fas fa-plus"></i> Ajouter ligne</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;background:var(--bg-main);padding:14px;border-radius:10px;margin-bottom:16px">
      <div><div style="font-size:12px;color:var(--text-secondary)">Total HT</div><div id="dv-total-ht" style="font-size:18px;font-weight:700">0 DH</div></div>
      <div><label class="form-label">TVA (%)</label><input id="dv-tva" type="number" class="form-input" value="${d.tva}" oninput="calcDevisTotal()"/></div>
      <div><div style="font-size:12px;color:var(--text-secondary)">Total TTC</div><div id="dv-total-ttc" style="font-size:18px;font-weight:700;color:#2563eb">0 DH</div></div>
    </div>
    <div class="form-group"><label class="form-label">Notes</label><textarea id="dv-notes" class="form-textarea" placeholder="Conditions, remarques...">${d.notes || ''}</textarea></div>
    <div class="form-group">
      <label class="form-label">Statut</label>
      <select id="dv-statut" class="form-select">
        <option value="en_attente" ${d.statut==='en_attente'?'selected':''}>En attente</option>
        <option value="accepte" ${d.statut==='accepte'?'selected':''}>Accepté</option>
        <option value="refuse" ${d.statut==='refuse'?'selected':''}>Refusé</option>
        <option value="expire" ${d.statut==='expire'?'selected':''}>Expiré</option>
      </select>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="updateDevis('${d.id}')"><i class="fas fa-save"></i> Enregistrer</button>
    </div>`, 'modal-lg');
  calcDevisTotal();
}

function updateDevis(id) {
  const clientEl = document.getElementById('dv-client');
  if (!clientEl.value) { toast('Sélectionnez un client', 'danger'); return; }
  const lignes = [];
  document.querySelectorAll('.devis-ligne').forEach(l => {
    const des = l.querySelector('[name="designation"]')?.value;
    const qte = parseFloat(l.querySelector('[name="qte"]')?.value) || 1;
    const prix = parseFloat(l.querySelector('[name="prix"]')?.value) || 0;
    if (des) lignes.push({ designation: des, qte, prix });
  });
  if (!lignes.length) { toast('Ajoutez au moins une ligne', 'danger'); return; }
  const ht = lignes.reduce((s,l) => s + l.qte * l.prix, 0);
  const tva = parseFloat(document.getElementById('dv-tva').value) || 0;
  DB.update('devis', id, {
    client_id: clientEl.value,
    client_nom: clientEl.options[clientEl.selectedIndex].dataset.nom,
    date: document.getElementById('dv-date').value,
    validite: document.getElementById('dv-validite').value,
    statut: document.getElementById('dv-statut').value,
    montant_ht: ht, tva, montant_ttc: ht * (1 + tva/100),
    lignes, notes: document.getElementById('dv-notes').value
  });
  closeModal(); toast('Devis mis à jour', 'success'); navigate('devis');
}

function convertToFacture(devisId) {
  const cid = AppState.currentCompany?.id;
  const d = DB.findByCompany('devis', cid).find(x=>x.id===devisId);
  if (!d) return;
  const num = 'FAC-' + new Date().getFullYear() + '-' + String(DB.findByCompany('factures',cid).length+1).padStart(3,'0');
  DB.push('factures', { company_id: cid, numero: num, client_id: d.client_id, client_nom: d.client_nom, date: new Date().toISOString().split('T')[0], echeance: '', statut: 'non_paye', montant_ht: d.montant_ht, tva: d.tva, montant_ttc: d.montant_ttc, montant_paye: 0, lignes: d.lignes });
  DB.update('devis', devisId, { statut: 'accepte' });
  toast('Facture créée depuis le devis', 'success'); navigate('factures');
}

// ===== FACTURES =====
function renderFactures() {
  const cid = AppState.currentCompany?.id;
  const factures = DB.findByCompany('factures', cid);
  const stMap = { paye: 'badge-success', non_paye: 'badge-danger', partiel: 'badge-warning' };
  const stLabel = { paye: 'Payé', non_paye: 'Impayé', partiel: 'Partiel' };
  const totalCA = factures.filter(f=>f.statut==='paye').reduce((s,f)=>s+f.montant_ttc,0);
  const totalImpaye = factures.filter(f=>f.statut!=='paye').reduce((s,f)=>s+(f.montant_ttc-f.montant_paye),0);
  return `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div><h2 style="font-size:20px;font-weight:700">Factures</h2><p style="color:var(--text-secondary);font-size:13px">${factures.length} factures</p></div>
    <button class="btn btn-primary" onclick="openNewFactureModal()"><i class="fas fa-plus"></i> Nouvelle facture</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px">
    ${statCard('Total encaissé', fmt(totalCA), 'fa-check-circle', '#16a34a', 'up', `${factures.filter(f=>f.statut==='paye').length} payées`)}
    ${statCard('Total impayé', fmt(totalImpaye), 'fa-exclamation-circle', '#dc2626', 'down', `${factures.filter(f=>f.statut!=='paye').length} en attente`)}
    ${statCard('Total facturé', fmt(factures.reduce((s,f)=>s+f.montant_ttc,0)), 'fa-file-invoice-dollar', '#2563eb', 'up', `${factures.length} factures`)}
  </div>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Numéro</th><th>Client</th><th>Date</th><th>Échéance</th><th>Montant TTC</th><th>Payé</th><th>Reste</th><th>Statut</th><th>Actions</th></tr></thead>
      <tbody>
        ${factures.length === 0 ? `<tr><td colspan="9"><div class="empty-state" style="padding:40px"><div class="icon">💳</div><h3>Aucune facture</h3></div></td></tr>` :
        factures.map(f => `<tr>
          <td style="font-weight:700">${f.numero}</td>
          <td>${f.client_nom}</td>
          <td>${fmtDate(f.date)}</td>
          <td style="color:${new Date(f.echeance)<new Date()&&f.statut!=='paye'?'#dc2626':'inherit'}">${fmtDate(f.echeance)}</td>
          <td style="font-weight:700">${fmt(f.montant_ttc)}</td>
          <td style="color:#16a34a">${fmt(f.montant_paye)}</td>
          <td style="color:#dc2626;font-weight:600">${fmt(f.montant_ttc-f.montant_paye)}</td>
          <td><span class="badge ${stMap[f.statut]||'badge-secondary'}">${stLabel[f.statut]||f.statut}</span></td>
          <td style="white-space:nowrap">
            <button class="btn btn-ghost btn-sm" title="Aperçu" onclick="previewFacture('${f.id}')"><i class="fas fa-eye" style="color:#7c3aed"></i></button>
            ${f.statut === 'non_paye' ? `<button class="btn btn-ghost btn-sm" title="Modifier" onclick="editFacture('${f.id}')"><i class="fas fa-edit" style="color:#2563eb"></i></button>` : ''}
            <button class="btn btn-ghost btn-sm" title="Imprimer / PDF" onclick="printFacture('${f.id}')"><i class="fas fa-print" style="color:#0891b2"></i></button>
            <button class="btn btn-ghost btn-sm" title="Enregistrer paiement" onclick="openPaiementFacture('${f.id}')"><i class="fas fa-money-bill-wave" style="color:#16a34a"></i></button>
            <button class="btn btn-ghost btn-sm" title="Supprimer" onclick="deleteFacture('${f.id}')"><i class="fas fa-trash" style="color:#dc2626"></i></button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

function openNewFactureModal() {
  const cid = AppState.currentCompany?.id;
  const clients = DB.findByCompany('clients', cid);
  const num = 'FAC-' + new Date().getFullYear() + '-' + String(DB.findByCompany('factures',cid).length+1).padStart(3,'0');
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-file-invoice-dollar" style="color:#16a34a;margin-right:8px"></i>Nouvelle facture</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Numéro</label><input id="fac-num" class="form-input" value="${num}" readonly style="background:var(--bg-main)"/></div>
      <div class="form-group"><label class="form-label">Client <span class="req">*</span></label>
        <select id="fac-client" class="form-select">
          <option value="">– Sélectionner –</option>
          ${clients.map(c=>`<option value="${c.id}" data-nom="${c.name}">${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Date facture</label><input id="fac-date" type="date" class="form-input" value="${new Date().toISOString().split('T')[0]}"/></div>
      <div class="form-group"><label class="form-label">Date échéance</label><input id="fac-echeance" type="date" class="form-input"/></div>
    </div>
    <div style="margin-bottom:16px">
      <label class="form-label">Lignes</label>
      <div id="facture-lignes">
        <div class="facture-ligne" style="display:grid;grid-template-columns:3fr 1fr 1fr auto;gap:8px;margin-bottom:8px">
          <input class="form-input" placeholder="Désignation" name="designation"/>
          <input type="number" class="form-input" placeholder="Qté" name="qte" value="1" oninput="calcFactureTotal()"/>
          <input type="number" class="form-input" placeholder="Prix" name="prix" oninput="calcFactureTotal()"/>
          <button class="btn btn-ghost" onclick="removeFacLigne(this)"><i class="fas fa-minus-circle" style="color:#dc2626"></i></button>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="addFacLigne()"><i class="fas fa-plus"></i> Ajouter ligne</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;background:var(--bg-main);padding:14px;border-radius:10px;margin-bottom:16px">
      <div><div style="font-size:12px;color:var(--text-secondary)">Total HT</div><div id="fac-ht" style="font-size:18px;font-weight:700">0 DH</div></div>
      <div><label class="form-label">TVA (%)</label><input id="fac-tva" type="number" class="form-input" value="20" oninput="calcFactureTotal()"/></div>
      <div><div style="font-size:12px;color:var(--text-secondary)">Total TTC</div><div id="fac-ttc" style="font-size:18px;font-weight:700;color:#2563eb">0 DH</div></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveFacture()"><i class="fas fa-save"></i> Créer la facture</button>
    </div>`, 'modal-lg');
}

function addFacLigne() {
  const c = document.getElementById('facture-lignes');
  const d = document.createElement('div');
  d.className = 'facture-ligne';
  d.style.cssText = 'display:grid;grid-template-columns:3fr 1fr 1fr auto;gap:8px;margin-bottom:8px';
  d.innerHTML = `<input class="form-input" placeholder="Désignation" name="designation"/><input type="number" class="form-input" placeholder="Qté" name="qte" value="1" oninput="calcFactureTotal()"/><input type="number" class="form-input" placeholder="Prix" name="prix" oninput="calcFactureTotal()"/><button class="btn btn-ghost" onclick="removeFacLigne(this)"><i class="fas fa-minus-circle" style="color:#dc2626"></i></button>`;
  c.appendChild(d);
}

function removeFacLigne(btn) { btn.closest('.facture-ligne').remove(); calcFactureTotal(); }

function calcFactureTotal() {
  let ht = 0;
  document.querySelectorAll('.facture-ligne').forEach(l => {
    ht += (parseFloat(l.querySelector('[name="qte"]')?.value)||0) * (parseFloat(l.querySelector('[name="prix"]')?.value)||0);
  });
  const tva = parseFloat(document.getElementById('fac-tva')?.value)||0;
  if (document.getElementById('fac-ht')) document.getElementById('fac-ht').textContent = fmt(ht);
  if (document.getElementById('fac-ttc')) document.getElementById('fac-ttc').textContent = fmt(ht*(1+tva/100));
}

function saveFacture() {
  const clientEl = document.getElementById('fac-client');
  if (!clientEl.value) { toast('Sélectionnez un client', 'danger'); return; }
  const lignes = [];
  document.querySelectorAll('.facture-ligne').forEach(l => {
    const des = l.querySelector('[name="designation"]')?.value;
    const qte = parseFloat(l.querySelector('[name="qte"]')?.value)||1;
    const prix = parseFloat(l.querySelector('[name="prix"]')?.value)||0;
    if (des) lignes.push({ designation: des, qte, prix });
  });
  if (!lignes.length) { toast('Ajoutez au moins une ligne', 'danger'); return; }
  const ht = lignes.reduce((s,l)=>s+l.qte*l.prix,0);
  const tva = parseFloat(document.getElementById('fac-tva').value)||0;
  DB.push('factures', { company_id: AppState.currentCompany.id, numero: document.getElementById('fac-num').value, client_id: clientEl.value, client_nom: clientEl.options[clientEl.selectedIndex].dataset.nom, date: document.getElementById('fac-date').value, echeance: document.getElementById('fac-echeance').value, statut: 'non_paye', montant_ht: ht, tva, montant_ttc: ht*(1+tva/100), montant_paye: 0, lignes });
  closeModal(); toast('Facture créée', 'success'); navigate('factures');
}

function deleteFacture(id) { confirm('Supprimer cette facture ?', () => { DB.delete('factures', id); toast('Facture supprimée', 'danger'); navigate('factures'); }); }

function previewFacture(id) {
  const cid = AppState.currentCompany?.id;
  const f = DB.findByCompany('factures', cid).find(x => x.id === id);
  if (!f) return;
  const stMap = { paye: 'badge-success', non_paye: 'badge-danger', partiel: 'badge-warning' };
  const stLabel = { paye: 'Payé', non_paye: 'Impayé', partiel: 'Paiement partiel' };
  const reste = f.montant_ttc - f.montant_paye;
  const lignesHtml = (f.lignes || []).map(l => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid var(--border)">${l.designation}</td>
      <td style="padding:10px 14px;border-bottom:1px solid var(--border);text-align:center">${l.qte}</td>
      <td style="padding:10px 14px;border-bottom:1px solid var(--border);text-align:right">${fmt(l.prix)}</td>
      <td style="padding:10px 14px;border-bottom:1px solid var(--border);text-align:right;font-weight:600">${fmt(l.qte * l.prix)}</td>
    </tr>`).join('');
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-eye" style="color:#7c3aed;margin-right:8px"></i>Aperçu facture – ${f.numero}</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div style="background:var(--bg-main);border-radius:10px;padding:16px;margin-bottom:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div>
          <div style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;margin-bottom:4px">Client</div>
          <div style="font-weight:700;font-size:15px">${f.client_nom}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;margin-bottom:4px">Statut</div>
          <span class="badge ${stMap[f.statut] || 'badge-secondary'}">${stLabel[f.statut] || f.statut}</span>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;margin-bottom:4px">Date facture</div>
          <div style="font-weight:600">${fmtDate(f.date)}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;margin-bottom:4px">Échéance</div>
          <div style="font-weight:600;color:${new Date(f.echeance) < new Date() && f.statut !== 'paye' ? '#dc2626' : 'inherit'}">${fmtDate(f.echeance)}</div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;background:var(--bg-card);border-radius:8px;overflow:hidden">
        <thead><tr style="background:var(--primary);color:#fff">
          <th style="padding:10px 14px;text-align:left">Désignation</th>
          <th style="padding:10px 14px;text-align:center">Qté</th>
          <th style="padding:10px 14px;text-align:right">Prix Unit.</th>
          <th style="padding:10px 14px;text-align:right">Total HT</th>
        </tr></thead>
        <tbody>${lignesHtml}</tbody>
      </table>
      <div style="margin-top:16px;display:flex;flex-direction:column;align-items:flex-end;gap:6px">
        <div style="display:flex;gap:40px"><span style="color:var(--text-secondary)">Total HT</span><span style="font-weight:700">${fmt(f.montant_ht)}</span></div>
        <div style="display:flex;gap:40px"><span style="color:var(--text-secondary)">TVA (${f.tva}%)</span><span style="font-weight:700">${fmt(f.montant_ht * f.tva / 100)}</span></div>
        <div style="display:flex;gap:40px;padding-top:8px;border-top:2px solid var(--primary);margin-top:4px">
          <span style="color:var(--primary);font-weight:700;font-size:15px">Total TTC</span>
          <span style="font-weight:800;font-size:18px;color:var(--primary)">${fmt(f.montant_ttc)}</span>
        </div>
      </div>
      <div style="margin-top:14px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
        <div style="background:rgba(22,163,74,0.08);border-radius:8px;padding:10px;border-left:3px solid #16a34a">
          <div style="font-size:11px;color:var(--text-secondary)">Montant payé</div>
          <div style="font-weight:700;color:#16a34a;font-size:16px">${fmt(f.montant_paye)}</div>
        </div>
        <div style="background:rgba(220,38,38,0.08);border-radius:8px;padding:10px;border-left:3px solid #dc2626">
          <div style="font-size:11px;color:var(--text-secondary)">Reste à payer</div>
          <div style="font-weight:700;color:#dc2626;font-size:16px">${fmt(reste)}</div>
        </div>
        <div style="background:rgba(37,99,235,0.08);border-radius:8px;padding:10px;border-left:3px solid #2563eb">
          <div style="font-size:11px;color:var(--text-secondary)">Avancement</div>
          <div style="font-weight:700;color:#2563eb;font-size:16px">${f.montant_ttc > 0 ? Math.round(f.montant_paye / f.montant_ttc * 100) : 0}%</div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Fermer</button>
      ${f.statut === 'non_paye' ? `<button class="btn btn-warning" onclick="closeModal();editFacture('${f.id}')"><i class="fas fa-edit"></i> Modifier</button>` : ''}
      <button class="btn btn-success" onclick="openPaiementFacture('${f.id}')"><i class="fas fa-money-bill-wave"></i> Paiement</button>
      <button class="btn btn-primary" onclick="printFacture('${f.id}')"><i class="fas fa-print"></i> Imprimer PDF</button>
    </div>`, 'modal-lg');
}

function editFacture(id) {
  const cid = AppState.currentCompany?.id;
  const f = DB.findByCompany('factures', cid).find(x => x.id === id);
  if (!f) return;
  const clients = DB.findByCompany('clients', cid);
  const lignesHtml = (f.lignes || []).map(l => `
    <div class="facture-ligne" style="display:grid;grid-template-columns:3fr 1fr 1fr auto;gap:8px;margin-bottom:8px">
      <input class="form-input" placeholder="Désignation" name="designation" value="${l.designation}"/>
      <input type="number" class="form-input" placeholder="Qté" name="qte" value="${l.qte}" oninput="calcFactureTotal()"/>
      <input type="number" class="form-input" placeholder="Prix" name="prix" value="${l.prix}" oninput="calcFactureTotal()"/>
      <button class="btn btn-ghost" onclick="removeFacLigne(this)"><i class="fas fa-minus-circle" style="color:#dc2626"></i></button>
    </div>`).join('');
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-edit" style="color:#2563eb;margin-right:8px"></i>Modifier facture – ${f.numero}</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Numéro</label><input id="fac-num" class="form-input" value="${f.numero}" readonly style="background:var(--bg-main)"/></div>
      <div class="form-group"><label class="form-label">Client <span class="req">*</span></label>
        <select id="fac-client" class="form-select">
          <option value="">– Sélectionner –</option>
          ${clients.map(c => `<option value="${c.id}" data-nom="${c.name}" ${c.id === f.client_id ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Date facture</label><input id="fac-date" type="date" class="form-input" value="${f.date}"/></div>
      <div class="form-group"><label class="form-label">Date échéance</label><input id="fac-echeance" type="date" class="form-input" value="${f.echeance}"/></div>
    </div>
    <div style="margin-bottom:16px">
      <label class="form-label">Lignes</label>
      <div id="facture-lignes">${lignesHtml}</div>
      <button class="btn btn-secondary btn-sm" onclick="addFacLigne()"><i class="fas fa-plus"></i> Ajouter ligne</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;background:var(--bg-main);padding:14px;border-radius:10px;margin-bottom:16px">
      <div><div style="font-size:12px;color:var(--text-secondary)">Total HT</div><div id="fac-ht" style="font-size:18px;font-weight:700">0 DH</div></div>
      <div><label class="form-label">TVA (%)</label><input id="fac-tva" type="number" class="form-input" value="${f.tva}" oninput="calcFactureTotal()"/></div>
      <div><div style="font-size:12px;color:var(--text-secondary)">Total TTC</div><div id="fac-ttc" style="font-size:18px;font-weight:700;color:#2563eb">0 DH</div></div>
    </div>
    <div class="form-group">
      <label class="form-label">Statut</label>
      <select id="fac-statut" class="form-select">
        <option value="non_paye" ${f.statut==='non_paye'?'selected':''}>Impayé</option>
        <option value="partiel" ${f.statut==='partiel'?'selected':''}>Paiement partiel</option>
        <option value="paye" ${f.statut==='paye'?'selected':''}>Payé</option>
      </select>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="updateFacture('${f.id}')"><i class="fas fa-save"></i> Enregistrer</button>
    </div>`, 'modal-lg');
  calcFactureTotal();
}

function updateFacture(id) {
  const clientEl = document.getElementById('fac-client');
  if (!clientEl.value) { toast('Sélectionnez un client', 'danger'); return; }
  const lignes = [];
  document.querySelectorAll('.facture-ligne').forEach(l => {
    const des = l.querySelector('[name="designation"]')?.value;
    const qte = parseFloat(l.querySelector('[name="qte"]')?.value) || 1;
    const prix = parseFloat(l.querySelector('[name="prix"]')?.value) || 0;
    if (des) lignes.push({ designation: des, qte, prix });
  });
  if (!lignes.length) { toast('Ajoutez au moins une ligne', 'danger'); return; }
  const ht = lignes.reduce((s,l) => s + l.qte * l.prix, 0);
  const tva = parseFloat(document.getElementById('fac-tva').value) || 0;
  DB.update('factures', id, {
    client_id: clientEl.value,
    client_nom: clientEl.options[clientEl.selectedIndex].dataset.nom,
    date: document.getElementById('fac-date').value,
    echeance: document.getElementById('fac-echeance').value,
    statut: document.getElementById('fac-statut').value,
    montant_ht: ht, tva, montant_ttc: ht * (1 + tva/100),
    lignes
  });
  closeModal(); toast('Facture mise à jour', 'success'); navigate('factures');
}

function openPaiementFacture(id) {
  const cid = AppState.currentCompany?.id;
  const f = DB.findByCompany('factures', cid).find(x=>x.id===id);
  if (!f) return;
  const reste = f.montant_ttc - f.montant_paye;
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-money-bill-wave" style="color:#16a34a;margin-right:8px"></i>Paiement – ${f.numero}</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div style="background:var(--bg-main);border-radius:10px;padding:14px;margin-bottom:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div><div style="font-size:12px;color:var(--text-secondary)">Total TTC</div><div style="font-weight:700">${fmt(f.montant_ttc)}</div></div>
        <div><div style="font-size:12px;color:var(--text-secondary)">Déjà payé</div><div style="font-weight:700;color:#16a34a">${fmt(f.montant_paye)}</div></div>
        <div><div style="font-size:12px;color:var(--text-secondary)">Reste à payer</div><div style="font-weight:700;color:#dc2626">${fmt(reste)}</div></div>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Montant reçu (DH) <span class="req">*</span></label><input id="pay-montant" type="number" class="form-input" value="${reste}" placeholder="${reste}"/></div>
    <div class="form-group"><label class="form-label">Date paiement</label><input id="pay-date" type="date" class="form-input" value="${new Date().toISOString().split('T')[0]}"/></div>
    <div class="form-group"><label class="form-label">Mode de paiement</label>
      <select id="pay-mode" class="form-select">
        <option value="virement">Virement</option><option value="cheque">Chèque</option><option value="especes">Espèces</option>
      </select>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-success" onclick="enregistrerPaiement('${id}')"><i class="fas fa-save"></i> Enregistrer</button>
    </div>`);
}

function enregistrerPaiement(id) {
  const montant = parseFloat(document.getElementById('pay-montant').value)||0;
  if (!montant) { toast('Montant requis', 'danger'); return; }
  const cid = AppState.currentCompany?.id;
  const f = DB.findByCompany('factures', cid).find(x=>x.id===id);
  const newPaye = Math.min(f.montant_paye + montant, f.montant_ttc);
  const statut = newPaye >= f.montant_ttc ? 'paye' : 'partiel';
  DB.update('factures', id, { montant_paye: newPaye, statut });
  DB.push('paiements', { company_id: cid, type: 'entree', montant, date: document.getElementById('pay-date').value, description: `Paiement ${f.numero}`, reference: f.numero, categorie: 'Facturation' });
  closeModal(); toast(`Paiement de ${fmt(montant)} enregistré`, 'success'); navigate('factures');
}

// ===== STOCK =====
function renderStock() {
  const cid = AppState.currentCompany?.id;
  const produits = DB.findByCompany('produits', cid);
  const alertes = produits.filter(p => p.quantite <= p.seuil_alerte);
  return `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div><h2 style="font-size:20px;font-weight:700">Stock & Inventaire</h2><p style="color:var(--text-secondary);font-size:13px">${produits.length} produits – ${alertes.length} alertes</p></div>
    <button class="btn btn-primary" onclick="openNewProduitModal()"><i class="fas fa-plus"></i> Ajouter produit</button>
  </div>
  ${alertes.length > 0 ? `<div style="background:rgba(220,38,38,0.08);border:1px solid rgba(220,38,38,0.3);border-radius:10px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;gap:10px"><i class="fas fa-exclamation-triangle" style="color:#dc2626"></i><span style="color:#dc2626;font-weight:600">${alertes.length} produit(s) sous le seuil d'alerte : ${alertes.map(p=>p.nom).join(', ')}</span></div>` : ''}
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Produit</th><th>Catégorie</th><th>Unité</th><th>Quantité</th><th>Seuil alerte</th><th>Prix achat</th><th>Prix vente</th><th>Statut</th><th>Actions</th></tr></thead>
      <tbody>
        ${produits.length === 0 ? `<tr><td colspan="9"><div class="empty-state" style="padding:40px"><div class="icon">📦</div><h3>Stock vide</h3></div></td></tr>` :
        produits.map(p => {
          const isAlerte = p.quantite <= p.seuil_alerte;
          const isZero = p.quantite === 0;
          return `<tr>
            <td style="font-weight:600">${p.nom}</td>
            <td><span class="badge badge-secondary">${p.categorie}</span></td>
            <td>${p.unite}</td>
            <td style="font-weight:700;color:${isZero?'#dc2626':isAlerte?'#d97706':'inherit'}">${fmtNum(p.quantite)}</td>
            <td style="color:var(--text-secondary)">${fmtNum(p.seuil_alerte)}</td>
            <td>${fmt(p.prix_achat)}</td>
            <td>${fmt(p.prix_vente)}</td>
            <td><span class="badge ${isZero?'badge-danger':isAlerte?'badge-warning':'badge-success'}">${isZero?'Épuisé':isAlerte?'⚠ Alerte':'OK'}</span></td>
            <td>
              <button class="btn btn-ghost btn-sm" title="Mouvement stock" onclick="openMouvementModal('${p.id}')"><i class="fas fa-exchange-alt"></i></button>
              <button class="btn btn-ghost btn-sm" onclick="editProduit('${p.id}')"><i class="fas fa-edit"></i></button>
              <button class="btn btn-ghost btn-sm" onclick="deleteProduit('${p.id}')"><i class="fas fa-trash" style="color:#dc2626"></i></button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>`;
}

function openNewProduitModal(data=null) {
  const isEdit = !!data;
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-box-open" style="color:#2563eb;margin-right:8px"></i>${isEdit?'Modifier produit':'Nouveau produit'}</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Nom du produit <span class="req">*</span></label><input id="pr-nom" class="form-input" value="${data?.nom||''}" placeholder="Ciment CPJ45"/></div>
      <div class="form-group"><label class="form-label">Catégorie</label><input id="pr-cat" class="form-input" value="${data?.categorie||''}" placeholder="Matériaux, Électricité..."/></div>
      <div class="form-group"><label class="form-label">Unité</label><input id="pr-unite" class="form-input" value="${data?.unite||''}" placeholder="sac, m³, kg, unité..."/></div>
      <div class="form-group"><label class="form-label">Quantité initiale</label><input id="pr-qte" type="number" class="form-input" value="${data?.quantite||0}"/></div>
      <div class="form-group"><label class="form-label">Seuil alerte</label><input id="pr-seuil" type="number" class="form-input" value="${data?.seuil_alerte||0}"/></div>
      <div class="form-group"><label class="form-label">Prix achat (DH)</label><input id="pr-pachat" type="number" class="form-input" value="${data?.prix_achat||0}"/></div>
      <div class="form-group"><label class="form-label">Prix vente (DH)</label><input id="pr-pvente" type="number" class="form-input" value="${data?.prix_vente||0}"/></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveProduit(${isEdit?`'${data.id}'`:'null'})"><i class="fas fa-save"></i> ${isEdit?'Mettre à jour':'Créer'}</button>
    </div>`);
}

function saveProduit(id=null) {
  const nom = document.getElementById('pr-nom').value.trim();
  if (!nom) { toast('Nom requis', 'danger'); return; }
  const data = { company_id: AppState.currentCompany.id, nom, categorie: document.getElementById('pr-cat').value, unite: document.getElementById('pr-unite').value, quantite: parseFloat(document.getElementById('pr-qte').value)||0, seuil_alerte: parseFloat(document.getElementById('pr-seuil').value)||0, prix_achat: parseFloat(document.getElementById('pr-pachat').value)||0, prix_vente: parseFloat(document.getElementById('pr-pvente').value)||0 };
  if (id) { DB.update('produits', id, data); toast('Produit mis à jour', 'success'); }
  else { DB.push('produits', data); toast('Produit ajouté', 'success'); }
  closeModal(); navigate('stock');
}

function editProduit(id) {
  const p = DB.findByCompany('produits', AppState.currentCompany.id).find(x=>x.id===id);
  if (p) openNewProduitModal(p);
}

function deleteProduit(id) { confirm('Supprimer ce produit ?', () => { DB.delete('produits', id); toast('Produit supprimé', 'danger'); navigate('stock'); }); }

function openMouvementModal(id) {
  const cid = AppState.currentCompany?.id;
  const p = DB.findByCompany('produits', cid).find(x=>x.id===id);
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-exchange-alt" style="margin-right:8px;color:#7c3aed"></i>Mouvement de stock – ${p.nom}</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div style="background:var(--bg-main);border-radius:10px;padding:12px;margin-bottom:16px">
      <span style="font-size:13px;color:var(--text-secondary)">Stock actuel : </span><strong>${fmtNum(p.quantite)} ${p.unite}</strong>
    </div>
    <div class="form-group"><label class="form-label">Type de mouvement</label>
      <select id="mv-type" class="form-select">
        <option value="entree">Entrée (réception)</option>
        <option value="sortie">Sortie (utilisation)</option>
      </select>
    </div>
    <div class="form-group"><label class="form-label">Quantité <span class="req">*</span></label><input id="mv-qte" type="number" class="form-input" placeholder="10"/></div>
    <div class="form-group"><label class="form-label">Description</label><input id="mv-desc" class="form-input" placeholder="Motif du mouvement..."/></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveMouvement('${id}','${p.quantite}')"><i class="fas fa-save"></i> Enregistrer</button>
    </div>`);
}

function saveMouvement(id, currentQte) {
  const type = document.getElementById('mv-type').value;
  const qte = parseFloat(document.getElementById('mv-qte').value)||0;
  if (!qte) { toast('Quantité requise', 'danger'); return; }
  const newQte = type === 'entree' ? Number(currentQte)+qte : Math.max(0, Number(currentQte)-qte);
  DB.update('produits', id, { quantite: newQte });
  closeModal(); toast(`Stock mis à jour : ${fmtNum(newQte)} unités`, 'success'); navigate('stock');
}

// ===== FOURNISSEURS =====
function renderFournisseurs() {
  const cid = AppState.currentCompany?.id;
  const fournisseurs = DB.findByCompany('fournisseurs', cid);
  return `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div><h2 style="font-size:20px;font-weight:700">Fournisseurs</h2><p style="color:var(--text-secondary);font-size:13px">${fournisseurs.length} fournisseur(s)</p></div>
    <button class="btn btn-primary" onclick="openNewFournisseurModal()"><i class="fas fa-plus"></i> Nouveau fournisseur</button>
  </div>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Nom</th><th>Contact</th><th>Téléphone</th><th>Email</th><th>Catégorie</th><th>Date ajout</th><th>Actions</th></tr></thead>
      <tbody>
        ${fournisseurs.length === 0 ? `<tr><td colspan="7"><div class="empty-state" style="padding:40px"><div class="icon">🚛</div><h3>Aucun fournisseur</h3></div></td></tr>` :
        fournisseurs.map(f => `<tr>
          <td style="font-weight:600">${f.name}</td>
          <td>${f.contact||'–'}</td>
          <td>${f.phone||'–'}</td>
          <td style="color:var(--text-secondary)">${f.email||'–'}</td>
          <td><span class="badge badge-info">${f.categorie||'–'}</span></td>
          <td style="color:var(--text-secondary)">${fmtDate(f.created_at)}</td>
          <td>
            <button class="btn btn-ghost btn-sm" onclick="editFournisseur('${f.id}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-ghost btn-sm" onclick="deleteFournisseur('${f.id}')"><i class="fas fa-trash" style="color:#dc2626"></i></button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

function openNewFournisseurModal(data=null) {
  const isEdit = !!data;
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-truck" style="color:#2563eb;margin-right:8px"></i>${isEdit?'Modifier fournisseur':'Nouveau fournisseur'}</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Nom <span class="req">*</span></label><input id="fo-nom" class="form-input" value="${data?.name||''}" placeholder="Lafarge Maroc"/></div>
      <div class="form-group"><label class="form-label">Catégorie</label><input id="fo-cat" class="form-input" value="${data?.categorie||''}" placeholder="Matériaux, Électricité..."/></div>
      <div class="form-group"><label class="form-label">Contact</label><input id="fo-contact" class="form-input" value="${data?.contact||''}" placeholder="Nom du contact"/></div>
      <div class="form-group"><label class="form-label">Téléphone</label><input id="fo-phone" class="form-input" value="${data?.phone||''}" placeholder="0522001122"/></div>
      <div class="form-group"><label class="form-label">Email</label><input id="fo-email" type="email" class="form-input" value="${data?.email||''}" placeholder="email@fournisseur.ma"/></div>
      <div class="form-group"><label class="form-label">Adresse</label><input id="fo-addr" class="form-input" value="${data?.adresse||''}" placeholder="Adresse complète"/></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveFournisseur(${isEdit?`'${data.id}'`:'null'})"><i class="fas fa-save"></i> ${isEdit?'Mettre à jour':'Créer'}</button>
    </div>`);
}

function saveFournisseur(id=null) {
  const nom = document.getElementById('fo-nom').value.trim();
  if (!nom) { toast('Nom requis', 'danger'); return; }
  const data = { company_id: AppState.currentCompany.id, name: nom, categorie: document.getElementById('fo-cat').value, contact: document.getElementById('fo-contact').value, phone: document.getElementById('fo-phone').value, email: document.getElementById('fo-email').value, adresse: document.getElementById('fo-addr').value };
  if (id) { DB.update('fournisseurs', id, data); toast('Fournisseur mis à jour', 'success'); }
  else { DB.push('fournisseurs', data); toast('Fournisseur créé', 'success'); }
  closeModal(); navigate('fournisseurs');
}

function editFournisseur(id) { const f = DB.findByCompany('fournisseurs', AppState.currentCompany.id).find(x=>x.id===id); if (f) openNewFournisseurModal(f); }
function deleteFournisseur(id) { confirm('Supprimer ce fournisseur ?', () => { DB.delete('fournisseurs', id); toast('Fournisseur supprimé', 'danger'); navigate('fournisseurs'); }); }

// ===== PAIEMENTS =====
function renderPaiements() {
  const cid = AppState.currentCompany?.id;
  const paiements = DB.findByCompany('paiements', cid).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const entrees = paiements.filter(p=>p.type==='entree').reduce((s,p)=>s+p.montant,0);
  const sorties = paiements.filter(p=>p.type==='sortie').reduce((s,p)=>s+p.montant,0);
  return `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div><h2 style="font-size:20px;font-weight:700">Paiements & Trésorerie</h2></div>
    <button class="btn btn-primary" onclick="openNewPaiementModal()"><i class="fas fa-plus"></i> Nouveau mouvement</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px">
    ${statCard('Total entrées', fmt(entrees), 'fa-arrow-down-circle', '#16a34a', 'up', `${paiements.filter(p=>p.type==='entree').length} opérations`)}
    ${statCard('Total sorties', fmt(sorties), 'fa-arrow-up-circle', '#dc2626', 'down', `${paiements.filter(p=>p.type==='sortie').length} opérations`)}
    ${statCard('Solde trésorerie', fmt(entrees-sorties), 'fa-wallet', entrees-sorties>=0?'#16a34a':'#dc2626', entrees-sorties>=0?'up':'down', entrees-sorties>=0?'Positif':'Négatif')}
  </div>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Catégorie</th><th>Référence</th><th>Montant</th><th>Actions</th></tr></thead>
      <tbody>
        ${paiements.length === 0 ? `<tr><td colspan="7"><div class="empty-state" style="padding:40px"><div class="icon">💳</div><h3>Aucun mouvement</h3></div></td></tr>` :
        paiements.map(p => `<tr>
          <td>${fmtDate(p.date)}</td>
          <td><span class="badge ${p.type==='entree'?'badge-success':'badge-danger'}">${p.type==='entree'?'↓ Entrée':'↑ Sortie'}</span></td>
          <td style="font-weight:500">${p.description}</td>
          <td><span class="badge badge-secondary">${p.categorie||'–'}</span></td>
          <td style="color:var(--text-secondary)">${p.reference||'–'}</td>
          <td style="font-weight:700;color:${p.type==='entree'?'#16a34a':'#dc2626'}">${p.type==='entree'?'+':'–'} ${fmt(p.montant)}</td>
          <td><button class="btn btn-ghost btn-sm" onclick="deletePaiement('${p.id}')"><i class="fas fa-trash" style="color:#dc2626"></i></button></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

function openNewPaiementModal() {
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-wallet" style="color:#2563eb;margin-right:8px"></i>Nouveau mouvement de trésorerie</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Type</label>
        <select id="np-type" class="form-select">
          <option value="entree">Entrée</option><option value="sortie">Sortie</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Montant (DH) <span class="req">*</span></label><input id="np-montant" type="number" class="form-input" placeholder="10000"/></div>
      <div class="form-group"><label class="form-label">Date</label><input id="np-date" type="date" class="form-input" value="${new Date().toISOString().split('T')[0]}"/></div>
      <div class="form-group"><label class="form-label">Catégorie</label>
        <select id="np-cat" class="form-select">
          <option>Facturation</option><option>Achats</option><option>Salaires</option><option>Charges</option><option>Autre</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Description</label><input id="np-desc" class="form-input" placeholder="Description du mouvement..."/></div>
    <div class="form-group"><label class="form-label">Référence</label><input id="np-ref" class="form-input" placeholder="N° facture, bon commande..."/></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="savePaiement()"><i class="fas fa-save"></i> Enregistrer</button>
    </div>`);
}

function savePaiement() {
  const montant = parseFloat(document.getElementById('np-montant').value)||0;
  if (!montant) { toast('Montant requis', 'danger'); return; }
  DB.push('paiements', { company_id: AppState.currentCompany.id, type: document.getElementById('np-type').value, montant, date: document.getElementById('np-date').value, description: document.getElementById('np-desc').value, reference: document.getElementById('np-ref').value, categorie: document.getElementById('np-cat').value });
  closeModal(); toast('Mouvement enregistré', 'success'); navigate('paiements');
}

function deletePaiement(id) { confirm('Supprimer ce mouvement ?', () => { DB.delete('paiements', id); toast('Supprimé', 'danger'); navigate('paiements'); }); }

// ===== TÂCHES =====
function renderTaches() {
  const cid = AppState.currentCompany?.id;
  const taches = DB.findByCompany('taches', cid);
  const aFaire = taches.filter(t=>t.statut==='a_faire');
  const enCours = taches.filter(t=>t.statut==='en_cours');
  const terminees = taches.filter(t=>t.statut==='termine');
  const prioMap = { haute: 'badge-danger', normale: 'badge-warning', basse: 'badge-success' };
  const renderCol = (items, title, color, statut) => `
    <div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid ${color}">
        <span style="width:10px;height:10px;border-radius:50%;background:${color}"></span>
        <span style="font-weight:700">${title}</span>
        <span class="badge badge-secondary">${items.length}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${items.map(t=>`
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:14px;cursor:pointer" onclick="toggleTacheStatut('${t.id}','${statut}')">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px">
              <span style="font-weight:600;font-size:14px">${t.titre}</span>
              <span class="badge ${prioMap[t.priorite]||'badge-secondary'}">${t.priorite}</span>
            </div>
            ${t.date_echeance?`<div style="font-size:12px;color:var(--text-secondary)"><i class="fas fa-calendar" style="margin-right:4px"></i>${fmtDate(t.date_echeance)}</div>`:''}
            <div style="display:flex;justify-content:flex-end;gap:4px;margin-top:8px">
              <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();deleteTache('${t.id}')"><i class="fas fa-trash" style="color:#dc2626"></i></button>
            </div>
          </div>`).join('')}
        <button class="btn btn-ghost btn-sm" style="width:100%;justify-content:center;border:1px dashed var(--border)" onclick="openNewTacheModal('${statut}')">
          <i class="fas fa-plus"></i> Ajouter
        </button>
      </div>
    </div>`;
  return `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div><h2 style="font-size:20px;font-weight:700">Tâches</h2><p style="color:var(--text-secondary);font-size:13px">${taches.length} tâches – ${terminees.length} terminées</p></div>
    <button class="btn btn-primary" onclick="openNewTacheModal('a_faire')"><i class="fas fa-plus"></i> Nouvelle tâche</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
    ${renderCol(aFaire,'À faire','#94a3b8','a_faire')}
    ${renderCol(enCours,'En cours','#2563eb','en_cours')}
    ${renderCol(terminees,'Terminées','#16a34a','termine')}
  </div>`;
}

function toggleTacheStatut(id, currentStatut) {
  const nextMap = { 'a_faire': 'en_cours', 'en_cours': 'termine', 'termine': 'a_faire' };
  DB.update('taches', id, { statut: nextMap[currentStatut] || 'en_cours' });
  navigate('taches');
}

function openNewTacheModal(statut='a_faire') {
  const cid = AppState.currentCompany?.id;
  const users = DB.getAll('users').filter(u=>u.company_id===cid);
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-tasks" style="color:#2563eb;margin-right:8px"></i>Nouvelle tâche</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="form-group"><label class="form-label">Titre <span class="req">*</span></label><input id="tk-titre" class="form-input" placeholder="Titre de la tâche..."/></div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Priorité</label>
        <select id="tk-prio" class="form-select">
          <option value="normale">Normale</option><option value="haute">Haute</option><option value="basse">Basse</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Assigné à</label>
        <select id="tk-assign" class="form-select">
          <option value="">– Personne –</option>
          ${users.map(u=>`<option value="${u.id}">${u.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Date échéance</label><input id="tk-date" type="date" class="form-input"/></div>
    </div>
    <div class="form-group"><label class="form-label">Description</label><textarea id="tk-desc" class="form-textarea" placeholder="Détails..."></textarea></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveTache('${statut}')"><i class="fas fa-save"></i> Créer</button>
    </div>`);
}

function saveTache(statut) {
  const titre = document.getElementById('tk-titre').value.trim();
  if (!titre) { toast('Titre requis', 'danger'); return; }
  DB.push('taches', { company_id: AppState.currentCompany.id, titre, description: document.getElementById('tk-desc').value, assigne_a: document.getElementById('tk-assign').value, priorite: document.getElementById('tk-prio').value, statut, date_echeance: document.getElementById('tk-date').value });
  closeModal(); toast('Tâche créée', 'success'); navigate('taches');
}

function deleteTache(id) { confirm('Supprimer cette tâche ?', () => { DB.delete('taches', id); toast('Tâche supprimée', 'danger'); navigate('taches'); }); }

// ===== AGENDA =====
function renderAgenda() {
  const cid = AppState.currentCompany?.id;
  const events = DB.findByCompany('agenda', cid).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const typeMap = { reunion: ['badge-info','fa-users','Réunion'], livraison: ['badge-warning','fa-truck','Livraison'], rdv: ['badge-success','fa-calendar-check','RDV'], autre: ['badge-secondary','fa-circle','Autre'] };
  return `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div><h2 style="font-size:20px;font-weight:700">Agenda</h2><p style="color:var(--text-secondary);font-size:13px">${events.length} événement(s)</p></div>
    <button class="btn btn-primary" onclick="openNewEventModal()"><i class="fas fa-plus"></i> Nouvel événement</button>
  </div>
  <div style="display:flex;flex-direction:column;gap:10px">
    ${events.length === 0 ? `<div class="empty-state"><div class="icon">📅</div><h3>Aucun événement</h3><p>Planifiez votre premier rendez-vous</p></div>` :
    events.map(ev => {
      const [cls, icon, lbl] = typeMap[ev.type] || typeMap.autre;
      const isToday = ev.date === new Date().toISOString().split('T')[0];
      const isPast = new Date(ev.date) < new Date() && !isToday;
      return `<div style="background:var(--bg-card);border:1px solid ${isToday?'var(--primary)':isPast?'var(--border)':'var(--border)'};border-radius:12px;padding:16px;display:flex;align-items:center;gap:16px;opacity:${isPast?'0.6':'1'}">
        <div style="background:${isToday?'var(--primary)':'var(--bg-main)'};border-radius:10px;padding:10px 14px;text-align:center;min-width:60px">
          <div style="font-size:20px;font-weight:800;color:${isToday?'#fff':'var(--text-primary)'};">${new Date(ev.date).getDate()}</div>
          <div style="font-size:10px;text-transform:uppercase;color:${isToday?'rgba(255,255,255,0.8)':'var(--text-secondary)'}">
            ${['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][new Date(ev.date).getMonth()]}
          </div>
        </div>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="font-weight:600">${ev.titre}</span>
            <span class="badge ${cls}"><i class="fas ${icon}" style="margin-right:3px"></i>${lbl}</span>
            ${isToday?'<span class="badge badge-info">Aujourd\'hui</span>':''}
          </div>
          <div style="font-size:13px;color:var(--text-secondary)"><i class="fas fa-clock" style="margin-right:4px"></i>${ev.heure||'–'} ${ev.notes?'• '+ev.notes:''}</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="deleteEvent('${ev.id}')"><i class="fas fa-trash" style="color:#dc2626"></i></button>
      </div>`;
    }).join('')}
  </div>`;
}

function openNewEventModal() {
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-calendar-plus" style="color:#2563eb;margin-right:8px"></i>Nouvel événement</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="form-group"><label class="form-label">Titre <span class="req">*</span></label><input id="ev-titre" class="form-input" placeholder="Réunion chantier..."/></div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Date</label><input id="ev-date" type="date" class="form-input" value="${new Date().toISOString().split('T')[0]}"/></div>
      <div class="form-group"><label class="form-label">Heure</label><input id="ev-heure" type="time" class="form-input" value="09:00"/></div>
      <div class="form-group"><label class="form-label">Type</label>
        <select id="ev-type" class="form-select">
          <option value="reunion">Réunion</option><option value="rdv">RDV Client</option><option value="livraison">Livraison</option><option value="autre">Autre</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Notes</label><textarea id="ev-notes" class="form-textarea" placeholder="Détails..."></textarea></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveEvent()"><i class="fas fa-save"></i> Créer</button>
    </div>`);
}

function saveEvent() {
  const titre = document.getElementById('ev-titre').value.trim();
  if (!titre) { toast('Titre requis', 'danger'); return; }
  DB.push('agenda', { company_id: AppState.currentCompany.id, titre, date: document.getElementById('ev-date').value, heure: document.getElementById('ev-heure').value, type: document.getElementById('ev-type').value, notes: document.getElementById('ev-notes').value });
  closeModal(); toast('Événement créé', 'success'); navigate('agenda');
}

function deleteEvent(id) { confirm('Supprimer cet événement ?', () => { DB.delete('agenda', id); toast('Supprimé', 'danger'); navigate('agenda'); }); }

// ===== RAPPORTS =====
function renderRapports() {
  const cid = AppState.currentCompany?.id;
  const factures = DB.findByCompany('factures', cid);
  const chantiers = DB.findByCompany('chantiers', cid);
  const paiements = DB.findByCompany('paiements', cid);
  const achats = DB.findByCompany('chantier_achats', cid);
  const mdo = DB.findByCompany('chantier_main_oeuvre', cid);
  const entrees = DB.findByCompany('chantier_entrees', cid);

  const totalCA = factures.filter(f=>f.statut==='paye').reduce((s,f)=>s+f.montant_ttc,0);
  const totalDepenses = [...achats, ...mdo].reduce((s,x)=>s+x.montant,0);
  const totalEntreesFin = paiements.filter(p=>p.type==='entree').reduce((s,p)=>s+p.montant,0);
  const totalSortiesFin = paiements.filter(p=>p.type==='sortie').reduce((s,p)=>s+p.montant,0);

  return `
  <div style="margin-bottom:20px">
    <h2 style="font-size:20px;font-weight:700;margin-bottom:4px">Rapports & Analyses</h2>
    <p style="color:var(--text-secondary);font-size:13px">Vue consolidée de votre activité</p>
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px">
    ${statCard('Chiffre d\'affaires', fmt(totalCA), 'fa-chart-line', '#2563eb', 'up', 'Total encaissé')}
    ${statCard('Dépenses chantiers', fmt(totalDepenses), 'fa-hard-hat', '#dc2626', 'down', 'Achats + MO')}
    ${statCard('Résultat net', fmt(totalCA-totalDepenses), 'fa-balance-scale', totalCA-totalDepenses>=0?'#16a34a':'#dc2626', totalCA-totalDepenses>=0?'up':'down', totalCA-totalDepenses>=0?'Bénéfice':'Perte')}
    ${statCard('Solde trésorerie', fmt(totalEntreesFin-totalSortiesFin), 'fa-wallet', '#7c3aed', 'up', 'Trésorerie nette')}
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
    <div class="card">
      <h3 style="font-weight:700;margin-bottom:16px"><i class="fas fa-hard-hat" style="color:#7c3aed;margin-right:8px"></i>Bilan par chantier</h3>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Chantier</th><th>Budget</th><th>Dépensé</th><th>%</th><th>Résultat</th></tr></thead>
          <tbody>
          ${chantiers.map(ch => {
            const e = entrees.filter(x=>x.chantier_id===ch.id).reduce((s,x)=>s+x.montant,0);
            const d = [...achats.filter(x=>x.chantier_id===ch.id), ...mdo.filter(x=>x.chantier_id===ch.id)].reduce((s,x)=>s+x.montant,0);
            const pct = ch.budget > 0 ? Math.round(d/ch.budget*100) : 0;
            const res = e - d;
            return `<tr>
              <td style="font-weight:600;font-size:13px">${ch.nom}</td>
              <td>${fmt(ch.budget)}</td>
              <td>${fmt(d)}</td>
              <td><span style="color:${pct<70?'#16a34a':pct<=100?'#d97706':'#dc2626'};font-weight:700">${pct}%</span></td>
              <td style="font-weight:700;color:${res>=0?'#16a34a':'#dc2626'}">${fmt(res)}</td>
            </tr>`;
          }).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="card">
      <h3 style="font-weight:700;margin-bottom:16px"><i class="fas fa-chart-bar" style="color:#2563eb;margin-right:8px"></i>Statuts des factures</h3>
      <canvas id="chart-factures" height="160"></canvas>
    </div>
  </div>
  <div class="card">
    <h3 style="font-weight:700;margin-bottom:16px"><i class="fas fa-file-invoice-dollar" style="color:#16a34a;margin-right:8px"></i>Récapitulatif financier</h3>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
      <div style="padding:16px;background:rgba(22,163,74,0.08);border-radius:10px;border-left:4px solid #16a34a">
        <div style="font-size:12px;color:#16a34a;font-weight:700;text-transform:uppercase;margin-bottom:8px">Entrées</div>
        <div style="font-size:22px;font-weight:800">${fmt(totalEntreesFin)}</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:4px">${paiements.filter(p=>p.type==='entree').length} opérations</div>
      </div>
      <div style="padding:16px;background:rgba(220,38,38,0.08);border-radius:10px;border-left:4px solid #dc2626">
        <div style="font-size:12px;color:#dc2626;font-weight:700;text-transform:uppercase;margin-bottom:8px">Sorties</div>
        <div style="font-size:22px;font-weight:800">${fmt(totalSortiesFin)}</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:4px">${paiements.filter(p=>p.type==='sortie').length} opérations</div>
      </div>
      <div style="padding:16px;background:rgba(37,99,235,0.08);border-radius:10px;border-left:4px solid #2563eb">
        <div style="font-size:12px;color:#2563eb;font-weight:700;text-transform:uppercase;margin-bottom:8px">Solde net</div>
        <div style="font-size:22px;font-weight:800;color:${totalEntreesFin-totalSortiesFin>=0?'#16a34a':'#dc2626'}">${fmt(totalEntreesFin-totalSortiesFin)}</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:4px">Trésorerie disponible</div>
      </div>
    </div>
  </div>
  <script>
    setTimeout(()=>{
      const ctx = document.getElementById('chart-factures');
      if(!ctx) return;
      const data = [${factures.filter(f=>f.statut==='paye').length}, ${factures.filter(f=>f.statut==='partiel').length}, ${factures.filter(f=>f.statut==='non_paye').length}];
      const isDark = AppState.theme==='dark';
      new Chart(ctx,{
        type:'doughnut',
        data:{labels:['Payées','Partielles','Impayées'],datasets:[{data,backgroundColor:['#16a34a','#d97706','#dc2626'],borderWidth:0}]},
        options:{responsive:true,cutout:'60%',plugins:{legend:{position:'bottom',labels:{color:isDark?'#94a3b8':'#64748b',font:{size:12}}}}}
      });
    },100);
  </script>`;
}

// ===== PARAMETRES =====
function renderParametres() {
  const u = AppState.currentUser;
  const co = AppState.currentCompany;
  const users = co ? DB.getAll('users').filter(x=>x.company_id===co.id) : [];
  const planLimits = { basic: 1, pro: 4, business: 10 };
  const maxUsers = planLimits[co?.plan] || 1;
  const logo = co ? (localStorage.getItem('batigest_logo_' + co.id) || '') : '';

  return `
  <div style="max-width:960px">
    <div style="margin-bottom:20px"><h2 style="font-size:20px;font-weight:700">Paramètres</h2></div>

    <!-- LOGO + INFOS SOCIÉTÉ -->
    <div class="card" style="margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border)">
        <div style="width:44px;height:44px;background:var(--primary);border-radius:11px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px">🏢</div>
        <div>
          <h3 style="font-weight:700;font-size:16px">Informations de la société</h3>
          <p style="color:var(--text-secondary);font-size:13px">Ces informations apparaissent sur vos PDF (devis, factures, rapports)</p>
        </div>
      </div>

      <!-- LOGO UPLOAD -->
      <div style="display:flex;align-items:center;gap:24px;margin-bottom:20px;padding:16px;background:var(--bg-main);border-radius:12px;border:1px solid var(--border)">
        <div id="logo-preview" style="width:90px;height:90px;border-radius:14px;border:2px dashed var(--border);display:flex;align-items:center;justify-content:center;overflow:hidden;background:#fff;flex-shrink:0">
          ${logo ? `<img src="${logo}" style="width:100%;height:100%;object-fit:contain"/>` : `<div style="text-align:center;color:var(--text-secondary)"><i class="fas fa-building" style="font-size:28px;margin-bottom:4px"></i><div style="font-size:10px">Logo</div></div>`}
        </div>
        <div style="flex:1">
          <div style="font-weight:600;margin-bottom:6px">Logo de la société</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px">Format PNG, JPG ou SVG. Recommandé : 200×200px minimum. Affiché sur tous les documents PDF.</div>
          <div style="display:flex;gap:8px">
            <label class="btn btn-primary btn-sm" style="cursor:pointer">
              <i class="fas fa-upload"></i> Importer logo
              <input type="file" accept="image/*" style="display:none" onchange="uploadLogo(event)"/>
            </label>
            ${logo ? `<button class="btn btn-secondary btn-sm" onclick="removeLogo()"><i class="fas fa-trash"></i> Supprimer</button>` : ''}
          </div>
        </div>
      </div>

      <!-- INFOS DE BASE -->
      <div style="margin-bottom:16px">
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-secondary);margin-bottom:12px">Coordonnées</div>
        <div class="form-grid-2">
          <div class="form-group"><label class="form-label">Nom de la société <span class="req">*</span></label><input id="co-nom" class="form-input" value="${co?.name||''}"/></div>
          <div class="form-group"><label class="form-label">Email</label><input id="co-email" type="email" class="form-input" value="${co?.email||''}"/></div>
          <div class="form-group"><label class="form-label">Téléphone</label><input id="co-phone" class="form-input" value="${co?.phone||''}"/></div>
          <div class="form-group"><label class="form-label">Ville</label><input id="co-city" class="form-input" value="${co?.city||''}"/></div>
          <div class="form-group" style="grid-column:1/-1"><label class="form-label">Adresse complète</label><input id="co-address" class="form-input" value="${co?.address||''}" placeholder="Rue, N°, Quartier..."/></div>
        </div>
      </div>

      <!-- INFOS LÉGALES -->
      <div style="margin-bottom:16px">
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-secondary);margin-bottom:12px">Informations légales & fiscales</div>
        <div class="form-grid-3">
          <div class="form-group"><label class="form-label">ICE</label><input id="co-ice" class="form-input" value="${co?.ice||''}" placeholder="000000000000000"/></div>
          <div class="form-group"><label class="form-label">RC (Registre Commerce)</label><input id="co-rc" class="form-input" value="${co?.rc||''}" placeholder="N° RC"/></div>
          <div class="form-group"><label class="form-label">IF (Identifiant Fiscal)</label><input id="co-if" class="form-input" value="${co?.if_num||''}" placeholder="N° IF"/></div>
          <div class="form-group"><label class="form-label">CNSS</label><input id="co-cnss" class="form-input" value="${co?.cnss||''}" placeholder="N° CNSS"/></div>
          <div class="form-group"><label class="form-label">Patente</label><input id="co-patente" class="form-input" value="${co?.patente||''}" placeholder="N° Patente"/></div>
        </div>
      </div>

      <!-- INFOS BANCAIRES -->
      <div style="margin-bottom:20px">
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-secondary);margin-bottom:12px">Informations bancaires (affichées sur les factures)</div>
        <div class="form-grid-2">
          <div class="form-group"><label class="form-label">Nom de la banque</label><input id="co-bank-name" class="form-input" value="${co?.bank_name||''}" placeholder="Attijariwafa Bank, CIH, BMCE..."/></div>
          <div class="form-group"><label class="form-label">RIB / IBAN</label><input id="co-bank" class="form-input" value="${co?.bank||''}" placeholder="007 640 0000000000000000 00"/></div>
        </div>
      </div>

      <!-- APERÇU DOCUMENT -->
      <div style="margin-bottom:20px;padding:16px;background:var(--bg-main);border-radius:12px;border:1px solid var(--border)">
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-secondary);margin-bottom:10px">📄 Aperçu en-tête document PDF</div>
        <div style="background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:10px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:12px">
            <div id="header-preview-logo" style="width:44px;height:44px;border-radius:10px;background:#2563eb;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;overflow:hidden">
              ${logo ? `<img src="${logo}" style="width:100%;height:100%;object-fit:contain"/>` : (co?.name||'B').charAt(0)}
            </div>
            <div>
              <div style="color:#fff;font-weight:700;font-size:14px" id="header-preview-name">${co?.name||'Ma Société'}</div>
              <div style="color:#94a3b8;font-size:11px">${co?.email||''} ${co?.phone?'· '+co.phone:''}</div>
              ${co?.ice?`<div style="color:#94a3b8;font-size:10px">ICE: ${co.ice}</div>`:''}
            </div>
          </div>
          <div style="text-align:right">
            <div style="color:#60a5fa;font-size:10px;font-weight:700;letter-spacing:1px">DEVIS / FACTURE</div>
            <div style="color:#fff;font-size:20px;font-weight:800">N° 2024-001</div>
            <div style="color:#94a3b8;font-size:11px">Date: ${new Date().toLocaleDateString('fr-FR')}</div>
          </div>
        </div>
        <div style="height:3px;background:linear-gradient(90deg,#2563eb,#7c3aed,#06b6d4);border-radius:0 0 4px 4px;margin:0 0 0 0"></div>
      </div>

      <button class="btn btn-primary" onclick="updateCompany()"><i class="fas fa-save"></i> Enregistrer les modifications</button>
    </div>

    <!-- ABONNEMENT -->
    <div class="card" style="margin-bottom:20px">
      <h3 style="font-weight:700;margin-bottom:16px"><i class="fas fa-crown" style="color:#d97706;margin-right:8px"></i>Abonnement actuel</h3>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
        ${['basic','pro','business'].map(plan=>{
          const plans = { basic: { label:'Basic', price:'50 DH/mois', users:1, color:'#64748b', features:['1 utilisateur','Modules de base','Support email'] },
            pro: { label:'Pro', price:'100 DH/mois', users:4, color:'#2563eb', features:['4 utilisateurs','Tous les modules','Support prioritaire'] },
            business: { label:'Business', price:'300 DH/mois', users:10, color:'#7c3aed', features:['10 utilisateurs','Multi-chantiers','Support dédié'] } };
          const p = plans[plan];
          const isCurrent = co?.plan === plan;
          return `<div class="plan-card ${isCurrent?'featured':''}">
            ${isCurrent?'<div class="plan-badge-top">Actuel</div>':''}
            <div style="font-size:18px;font-weight:800;color:${p.color};margin-bottom:4px">${p.label}</div>
            <div style="font-size:24px;font-weight:800;margin-bottom:12px">${p.price}</div>
            <ul style="list-style:none;text-align:left;font-size:13px;color:var(--text-secondary)">
              ${p.features.map(f=>`<li style="margin-bottom:4px"><i class="fas fa-check" style="color:#16a34a;margin-right:6px"></i>${f}</li>`).join('')}
            </ul>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- UTILISATEURS -->
    <div class="card" style="margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h3 style="font-weight:700"><i class="fas fa-users" style="color:#2563eb;margin-right:8px"></i>Utilisateurs (${users.length}/${maxUsers})</h3>
        ${users.length < maxUsers ? `<button class="btn btn-primary btn-sm" onclick="openNewUserModal()"><i class="fas fa-user-plus"></i> Ajouter</button>` : `<span class="badge badge-warning">Limite plan atteinte</span>`}
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>
          ${users.map(usr=>`<tr>
            <td><div style="display:flex;align-items:center;gap:8px"><div class="user-avatar" style="width:28px;height:28px;font-size:11px">${usr.name.charAt(0)}</div>${usr.name}</div></td>
            <td style="color:var(--text-secondary)">${usr.email}</td>
            <td><span class="badge ${usr.role==='admin'?'badge-purple':'badge-info'}">${usr.role}</span></td>
            <td><span class="badge ${usr.status==='active'?'badge-success':'badge-danger'}">${usr.status==='active'?'Actif':'Inactif'}</span></td>
            <td>
              ${usr.id !== u.id ? `<button class="btn btn-ghost btn-sm" onclick="toggleUserStatus('${usr.id}','${usr.status}')"><i class="fas fa-${usr.status==='active'?'ban':'check'}" style="color:${usr.status==='active'?'#dc2626':'#16a34a'}"></i></button>` : '<span style="color:var(--text-secondary);font-size:12px">Vous</span>'}
            </td>
          </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- APPARENCE -->
    <div class="card">
      <h3 style="font-weight:700;margin-bottom:16px"><i class="fas fa-palette" style="color:#7c3aed;margin-right:8px"></i>Apparence</h3>
      <div style="display:flex;gap:12px">
        <button class="btn ${AppState.theme==='light'?'btn-primary':'btn-secondary'}" onclick="setTheme('light')"><i class="fas fa-sun"></i> Mode clair</button>
        <button class="btn ${AppState.theme==='dark'?'btn-primary':'btn-secondary'}" onclick="setTheme('dark')"><i class="fas fa-moon"></i> Mode sombre</button>
      </div>
    </div>
  </div>`;
}

function updateCompany() {
  const co = AppState.currentCompany;
  const updates = {
    name: document.getElementById('co-nom').value,
    email: document.getElementById('co-email').value,
    phone: document.getElementById('co-phone').value,
    city: document.getElementById('co-city').value,
    address: document.getElementById('co-address')?.value || co.address || '',
    ice: document.getElementById('co-ice')?.value || co.ice || '',
    rc: document.getElementById('co-rc')?.value || co.rc || '',
    if_num: document.getElementById('co-if')?.value || co.if_num || '',
    cnss: document.getElementById('co-cnss')?.value || co.cnss || '',
    patente: document.getElementById('co-patente')?.value || co.patente || '',
    bank_name: document.getElementById('co-bank-name')?.value || co.bank_name || '',
    bank: document.getElementById('co-bank')?.value || co.bank || '',
  };
  DB.update('companies', co.id, updates);
  AppState.currentCompany = { ...co, ...updates };
  DB.set('session_company', AppState.currentCompany);
  toast('Informations de la société enregistrées', 'success');
  navigate('parametres');
}

function uploadLogo(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { toast('Logo trop lourd (max 2 Mo)', 'danger'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result;
    const co = AppState.currentCompany;
    localStorage.setItem('batigest_logo_' + co.id, base64);
    // Mise à jour aperçu
    const preview = document.getElementById('logo-preview');
    if (preview) preview.innerHTML = `<img src="${base64}" style="width:100%;height:100%;object-fit:contain"/>`;
    const headerLogo = document.getElementById('header-preview-logo');
    if (headerLogo) headerLogo.innerHTML = `<img src="${base64}" style="width:100%;height:100%;object-fit:contain"/>`;
    toast('Logo importé avec succès', 'success');
  };
  reader.readAsDataURL(file);
}

function removeLogo() {
  const co = AppState.currentCompany;
  localStorage.removeItem('batigest_logo_' + co.id);
  toast('Logo supprimé', 'success');
  navigate('parametres');
}

function toggleUserStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  DB.update('users', id, { status: newStatus });
  toast(`Utilisateur ${newStatus === 'active' ? 'activé' : 'désactivé'}`, 'success');
  navigate('parametres');
}

function openNewUserModal() {
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title"><i class="fas fa-user-plus" style="color:#2563eb;margin-right:8px"></i>Nouvel utilisateur</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="form-group"><label class="form-label">Nom complet <span class="req">*</span></label><input id="nu-nom" class="form-input" placeholder="Nom Prénom"/></div>
    <div class="form-group"><label class="form-label">Email <span class="req">*</span></label><input id="nu-email" type="email" class="form-input" placeholder="email@societe.ma"/></div>
    <div class="form-group"><label class="form-label">Mot de passe <span class="req">*</span></label><input id="nu-pass" type="password" class="form-input" placeholder="Mot de passe"/></div>
    <div class="form-group"><label class="form-label">Rôle</label>
      <select id="nu-role" class="form-select">
        <option value="user">Utilisateur</option><option value="admin">Administrateur</option>
      </select>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveNewUser()"><i class="fas fa-save"></i> Créer</button>
    </div>`);
}

function saveNewUser() {
  const nom = document.getElementById('nu-nom').value.trim();
  const email = document.getElementById('nu-email').value.trim();
  const pass = document.getElementById('nu-pass').value;
  if (!nom || !email || !pass) { toast('Tous les champs sont requis', 'danger'); return; }
  const exists = DB.getAll('users').find(u=>u.email===email);
  if (exists) { toast('Email déjà utilisé', 'danger'); return; }
  DB.push('users', { company_id: AppState.currentCompany.id, name: nom, email, password: pass, role: document.getElementById('nu-role').value, status: 'active' });
  closeModal(); toast('Utilisateur créé', 'success'); navigate('parametres');
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initDemoData();
  setTheme(AppState.theme);
  renderApp();
});
