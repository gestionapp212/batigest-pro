/* ============================================================
   GestionApp 212 — Core v5.0 — Architecture Cloudflare
   Backend  : Cloudflare Workers + D1 (SQLite)
   Stockage : Cloudflare R2
   Auth     : JWT via CF Workers (plus de Supabase SDK)
   SuperAdmin: portail /admin/ séparé uniquement
   ============================================================ */

// ── STATE ──────────────────────────────────────────────────
const App = {
  currentUser:        null,
  currentCompany:     null,
  currentModule:      'dashboard',
  darkMode:           false,
  lang:               'fr',
  favorites:          [],
  notifications:      [],
  twoFAPending:       null,
  data:               {},
  supabaseSession:    null,
  realtimeChannels:   [],
  isLoading:          false,
  isDemoMode:         false,
  isSupabaseConnected:false, // Alias gardé pour compatibilité
  isCFConnected:      false,
};

// ── TRADUCTIONS ────────────────────────────────────────────
const TRANS = {
  fr: {
    dashboard:'Tableau de Bord', clients:'Clients', devis:'Devis',
    factures:'Factures', paiements:'Paiements', chantiers:'Chantiers',
    galerie:'Galerie', stock:'Stock', fournisseurs:'Fournisseurs',
    garanties:'Garanties & SAV', analyse:'Analyse', parametres:'Paramètres',
    agenda:'Agenda', taches:'Tâches', pipeline:'Pipeline', superadmin:'Super Admin',
    save:'Enregistrer', cancel:'Annuler', delete:'Supprimer',
    edit:'Modifier', add:'Ajouter', search:'Rechercher',
    confirm_delete:'Êtes-vous sûr de vouloir supprimer cet élément ?',
    success_save:'Enregistrement réussi !', success_delete:'Suppression réussie !',
    error_required:'Champs requis manquants', loading:'Chargement...',
    total:'Total', status:'Statut', date:'Date', actions:'Actions',
  },
  ar: {
    dashboard:'لوحة القيادة', clients:'العملاء', devis:'العروض',
    factures:'الفواتير', paiements:'المدفوعات', chantiers:'المشاريع',
    galerie:'المعرض', stock:'المخزون', fournisseurs:'الموردون',
    garanties:'الضمانات', analyse:'التحليل', parametres:'الإعدادات',
    agenda:'الأجندة', taches:'المهام', pipeline:'خط المبيعات', superadmin:'المدير العام',
    save:'حفظ', cancel:'إلغاء', delete:'حذف',
    edit:'تعديل', add:'إضافة', search:'بحث',
    confirm_delete:'هل أنت متأكد من حذف هذا العنصر؟',
    success_save:'تم الحفظ بنجاح!', success_delete:'تم الحذف بنجاح!',
    error_required:'حقول مطلوبة مفقودة', loading:'جار التحميل...',
    total:'المجموع', status:'الحالة', date:'التاريخ', actions:'الإجراءات',
  }
};
const t = (key) => (TRANS[App.lang] || TRANS.fr)[key] || key;

// ── PERMISSIONS v4.0 ──────────────────────────────────────
// superadmin retiré de GestApp → portail /admin/ uniquement
// Les admins ont des permissions granulaires via module_permissions JSONB

const ALL_MODULES = [
  'dashboard','clients','devis','factures','paiements','chantiers',
  'galerie','stock','fournisseurs','garanties','agenda','taches',
  'pipeline','analyse','parametres'
];

// Modules accessibles par défaut selon le rôle
const DEFAULT_PERMISSIONS = {
  admin:      { modules: ALL_MODULES, defaultAction: 'edit' },
  manager:    { modules: ['dashboard','clients','devis','factures','paiements','chantiers','galerie','stock','agenda','taches','pipeline','analyse','garanties','fournisseurs'], defaultAction: 'edit' },
  commercial: { modules: ['dashboard','clients','devis','factures','paiements','agenda','taches','pipeline'], defaultAction: 'edit' },
  technicien: { modules: ['dashboard','chantiers','galerie','stock','taches'], defaultAction: 'edit' },
  lecture:    { modules: ['dashboard','clients','devis','factures','analyse'], defaultAction: 'view' },
};

/**
 * Vérifie si l'utilisateur peut effectuer une action sur un module.
 * Prend en compte les permissions granulaires (modulePermissions JSONB).
 */
function canDo(action, module = null) {
  if (!App.currentUser) return false;
  const role = App.currentUser.role;
  const roleDef = DEFAULT_PERMISSIONS[role];
  if (!roleDef) return false;

  const modulePerms = App.currentUser.modulePermissions || {};

  if (module) {
    const granular = modulePerms[module]; // 'edit' | 'view' | 'hidden' | undefined
    if (granular === 'hidden') return false;
    if (granular === 'view')   return action === 'read';
    if (granular === 'edit')   return true;
    // Fallback rôle
    if (!roleDef.modules.includes(module)) return false;
  }

  const defAction = roleDef.defaultAction;
  if (defAction === 'edit') return true;
  return action === 'read';
}

/**
 * Retourne le niveau d'accès pour un module : 'edit' | 'view' | 'hidden'
 */
function getModuleAccess(module) {
  if (!App.currentUser) return 'hidden';
  const role = App.currentUser.role;
  const roleDef = DEFAULT_PERMISSIONS[role];
  if (!roleDef) return 'hidden';
  const modulePerms = App.currentUser.modulePermissions || {};
  const granular = modulePerms[module];
  if (granular) return granular;
  return roleDef.modules.includes(module) ? roleDef.defaultAction : 'hidden';
}

// ── GUARD ANTI-BOUCLE ──────────────────────────────────────
// Empêche completeLogin/finalizeLogin d'être appelés en parallèle
let _loginInProgress = false;

// ── INITIALISATION ─────────────────────────────────────────
async function initApp() {
  showFullscreenLoader('Connexion à GestionApp...');
  try {
    const prefs = JSON.parse(sessionStorage.getItem('ga_prefs') || '{}');
    if (prefs.darkMode) { App.darkMode = true; document.body.classList.add('dark-mode'); }
    if (prefs.lang) setLang(prefs.lang);

    // v5.1 FIX : utiliser la session Supabase (plus de TokenManager CF Workers)
    let currentUser = null;
    try {
      currentUser = await Promise.race([
        cfGetSession().then(session => session?.user || null),
        new Promise(resolve => setTimeout(() => resolve(null), 5000))
      ]);
    } catch(e) {
      console.warn('[initApp] Session Supabase inaccessible:', e.message);
      currentUser = null;
    }

    if (currentUser && currentUser.id) {
      await completeLogin(currentUser);
    } else {
      hideFullscreenLoader();
      showLoginPage();
    }

    // Écouter les changements d'auth Supabase (reconnexion, déconnexion, refresh token)
    try {
      sbOnAuthChange(async (event, newSession) => {
        console.log('[GestionApp] Auth event:', event);
        if (event === 'SIGNED_OUT') {
          App.currentUser = null; App.currentCompany = null;
          App.data = {}; App.supabaseSession = null;
          _loginInProgress = false;
          showLoginPage();
        } else if (event === 'SIGNED_IN' && newSession?.user && !App.currentUser) {
          await completeLogin(newSession.user);
        } else if (event === 'TOKEN_REFRESHED' && newSession?.user) {
          App.supabaseSession = newSession;
        }
      });
    } catch(e) {
      console.warn('[initApp] sbOnAuthChange:', e.message);
    }

  } catch(err) {
    console.error('[initApp] Erreur critique:', err);
    hideFullscreenLoader();
    showLoginPage();
  }
}

function showLoginPage() {
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  _checkAndShowLoginStatus();
}

async function _checkAndShowLoginStatus() {
  const statusEl = document.getElementById('login-supabase-status');
  if (!statusEl) return;
  statusEl.style.cssText = 'display:block;margin-top:14px;padding:8px 12px;border-radius:7px;font-size:11px;text-align:center;background:#f0f4f8;color:#a0aec0';
  statusEl.innerHTML = '<i class="fas fa-circle-notch fa-spin" style="margin-right:5px"></i> Vérification de la connexion…';
  try {
    const ok = await Promise.race([checkSupabaseConnection(), new Promise(r => setTimeout(() => r(false), 2500))]);
    if (ok) {
      statusEl.style.background = '#f0fff4'; statusEl.style.color = '#276749';
      statusEl.innerHTML = '<i class="fas fa-check-circle" style="color:#48bb78;margin-right:5px"></i> Supabase opérationnel — connectez-vous';
      setTimeout(() => { statusEl.style.display = 'none'; }, 4000);
    } else {
      statusEl.style.background = '#fff3cd'; statusEl.style.color = '#856404';
      statusEl.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#f6ad55;margin-right:5px"></i> Supabase indisponible — mode démo disponible';
    }
  } catch(e) {
    statusEl.style.background = '#fff3cd'; statusEl.style.color = '#856404';
    statusEl.innerHTML = '<i class="fas fa-wifi" style="color:#f6ad55;margin-right:5px"></i> Vérification impossible — mode démo disponible';
  }
}

// ── COMPTES DÉMO ───────────────────────────────────────────
const DEMO_USERS = [
  { id:'demo-admin', email:'demo-admin@gestionapp.ma',      password:'Demo2026!', name:'Admin Demo',   role:'admin',      companyId:'demo-c1', twofa:false, avatar:'AD' },
  { id:'demo-com',   email:'demo.commercial@gestionapp.ma', password:'Demo2026!', name:'Commercial',   role:'commercial', companyId:'demo-c1', twofa:false, avatar:'CO' },
];

// Emails avec accès réel (jamais redirigés vers le mode démo)
const REAL_SUPABASE_EMAILS = ['said.hamdaoui1984@gmail.com']; // Alias conservé

const DEMO_COMPANIES = [
  {
    id:             'demo-c1',
    name:           'Société Démo BTP',
    ice:            '000000000000000',
    ville:          'Casablanca',
    city:           'Casablanca',
    plan:           'Pro',
    statut:         'actif',
    status:         'actif',
    abonnement_fin: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
  }
];

// ── SUPERADMIN EMAILS ───────────────────────────────────────
// Superadmin → portail /admin/ uniquement (CF Workers)
const SUPERADMIN_EMAILS = ['said.hamdaoui1984@gmail.com'];

// ── CONNEXION ──────────────────────────────────────────────
async function trySupabaseLogin(email, password) {
  const emailLower = email.toLowerCase().trim();

  // Compte démo reconnu → connexion directe instantanée (seulement si email non réel)
  const isRealAccount = REAL_SUPABASE_EMAILS.includes(emailLower);
  const demo = !isRealAccount ? DEMO_USERS.find(u =>
    u.email.toLowerCase() === emailLower && u.password === password
  ) : null;
  if (demo) return { session: null, user: null, isDemo: true, demoUser: demo };

  // v5.1 FIX : Supabase SDK directement (plus de CF Workers /auth/login)
  try {
    const data = await Promise.race([
      cfSignIn(email, password),
      new Promise((_, reject) => setTimeout(() => reject(new Error('network_timeout')), 10000))
    ]);
    // cfSignIn retourne { user, session } directement depuis Supabase SDK
    const user    = data?.user    || data?.session?.user || null;
    const session = data?.session || null;
    if (!user) throw new Error('Authentification échouée — aucun utilisateur retourné');
    return { session, user, isDemo: false };
  } catch(err) {
    throw err;
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn      = e.target.querySelector('button[type=submit]');
  document.getElementById('login-error').style.display = 'none';
  const g422 = document.getElementById('login-guide-422');
  if (g422) g422.style.display = 'none';
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';

  try {
    const result = await trySupabaseLogin(email, password);
    if (result.isDemo) {
      await loginDemoUser(result.demoUser);
    } else {
      App.supabaseSession = result.session; // Alias conservé
      if (result.company) App.currentCompany = result.company;
      await completeLogin(result.user);
    }
  } catch(err) {
    const errMsg = err.message || '';
    const status  = err.status  || 0;
    let msg = 'Email ou mot de passe incorrect';

    // ── Décodage précis des erreurs Supabase Auth ──
    if (errMsg.includes('Email not confirmed') || errMsg.includes('email_not_confirmed'))
      msg = '📧 Email non confirmé — contactez votre administrateur.';
    else if (errMsg.includes('Invalid login') || errMsg.includes('invalid_credentials') || status === 400 || errMsg.includes('incorrect'))
      msg = '🔑 Email ou mot de passe incorrect.';
    else if (status === 404 || errMsg.includes('introuvable') || errMsg.includes('not found'))
      msg = '⚠️ Compte introuvable — contactez votre administrateur.';
    else if (errMsg.includes('Too many requests') || status === 429)
      msg = '⏳ Trop de tentatives — attendez 1 minute avant de réessayer.';
    else if (errMsg.includes('network_timeout') || errMsg.includes('abort') || errMsg.includes('fetch') || errMsg.includes('TIMEOUT') || errMsg.includes('NETWORK'))
      msg = '🌐 Connexion impossible — vérifiez votre réseau et réessayez.';
    else if (errMsg.includes('désactivé') || errMsg.includes('inactive'))
      msg = '🚫 Compte désactivé — contactez votre administrateur.';

    const emailLower = email.toLowerCase().trim();
    // Fallback démo si email non-réel
    if (!REAL_SUPABASE_EMAILS.includes(emailLower)) {
      const demo = DEMO_USERS.find(u => u.email.toLowerCase() === emailLower && u.password === password);
      if (demo) { await loginDemoUser(demo); return; }
    }
    console.error('[handleLogin] Erreur Supabase:', { status, message: errMsg });
    showError('login-error', msg);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
  }
}

async function loginDemoUser(demoUser) {
  showFullscreenLoader('Mode Démo — Chargement...');
  App.isDemoMode = true;
  App.currentUser = { ...demoUser };
  App.currentCompany = DEMO_COMPANIES[0];
  App.data.companies = DEMO_COMPANIES;
  App.data.profiles  = DEMO_USERS.map(u => ({ ...u, company_id: u.companyId, is_active: true }));
  App.data.auditLogs = [];
  if (typeof initMockData === 'function') initMockData();
  App.favorites = JSON.parse(sessionStorage.getItem('ga_favs_' + demoUser.id) || '[]');
  hideFullscreenLoader();
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('twofa-step').style.display = 'none';
  document.getElementById('auth-title').textContent = 'Connexion';
  updateUserUI(); setupCompanySelector(); loadFavorites(); generateNotifications(); navigate('dashboard');
  if (typeof persistSetup === 'function') persistSetup();
  updateSupabaseStatus(false);
  showToast(`✅ Mode Démo · ${demoUser.name} — Données locales uniquement`, 'info', 5000);
}

async function quickLogin(email, password) {
  document.getElementById('login-email').value    = email;
  document.getElementById('login-password').value = password;
  document.getElementById('login-error').style.display = 'none';
  showFullscreenLoader('Connexion...');
  const emailLower = email.toLowerCase().trim();
  try {
    const result = await trySupabaseLogin(email, password);
    if (result.isDemo) await loginDemoUser(result.demoUser);
    else { App.supabaseSession = result.session; await completeLogin(result.user); }
  } catch(err) {
    hideFullscreenLoader();
    if (REAL_SUPABASE_EMAILS.includes(emailLower)) {
      showError('login-error', err.message?.includes('Invalid login')
        ? 'Email ou mot de passe incorrect.'
        : 'Connexion impossible. Vérifiez votre réseau.');
      return;
    }
    const demo = DEMO_USERS.find(u => u.email.toLowerCase() === emailLower && u.password === password);
    if (demo) await loginDemoUser(demo);
    else showError('login-error', 'Connexion impossible.');
  }
}

function cancelLogin() {
  sbSignOut();
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('twofa-step').style.display = 'none';
  document.getElementById('auth-title').textContent = 'Connexion';
  App.twoFAPending = null; App.currentUser = null;
}

// ── COMPLETE LOGIN ─────────────────────────────────────────
async function completeLogin(authUser) {
  // Guard : user null (peut arriver si session expirée ou token invalide)
  if (!authUser || !authUser.id) {
    console.warn('[GestionApp] completeLogin ignoré — authUser null ou sans id');
    hideFullscreenLoader();
    showLoginPage();
    return;
  }
  // Guard anti-boucle : si un login est déjà en cours, ignorer l'appel
  if (_loginInProgress) {
    console.warn('[GestionApp] completeLogin ignoré — login déjà en cours');
    return;
  }
  _loginInProgress = true;
  showFullscreenLoader('Chargement de vos données...');
  try {
    const isSAEmail = SUPERADMIN_EMAILS.includes(authUser.email?.toLowerCase());

    let profile = null;
    try {
      profile = await Promise.race([
        sbGetProfile(authUser.id),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 6000))
      ]);
    } catch(profileErr) {
      console.warn('[GestionApp] Profil inaccessible:', profileErr.message);
      // Fallback : construire un profil minimal depuis les données auth
      profile = {
        id:            authUser.id,
        email:         authUser.email,
        name:          authUser.user_metadata?.full_name ||
                       authUser.user_metadata?.name ||
                       authUser.email.split('@')[0],
        role:          isSAEmail ? 'superadmin' : (authUser.user_metadata?.role || 'admin'),
        is_active:     true,
        twofa_enabled: false,
        company_id:    authUser.user_metadata?.company_id || null,
        companies:     null,
      };
    }

    // v5.0 : si superadmin → rediriger vers /admin/ (portail séparé CF Workers)
    if (isSAEmail || profile.role === 'superadmin') {
      await cfSignOut();
      _loginInProgress = false;
      hideFullscreenLoader();
      showLoginPage();
      const errEl = document.getElementById('login-error');
      if (errEl) {
        errEl.style.display = 'block';
        errEl.style.cssText = 'display:block;background:#ebf8ff;color:#2b6cb0;border:1px solid #90cdf4;padding:12px 16px;border-radius:8px;margin-top:14px;font-size:13px';
        // Détecter l'URL du portail admin depuis la même origine
        const adminUrl = window.location.origin.replace('gestapp212', '').replace(/\/$/, '') + '/admin/';
        errEl.innerHTML = `<i class="fas fa-crown" style="margin-right:8px;color:#d69e2e"></i><strong>Compte Super Admin</strong> — Ce portail est réservé aux admins.<br><a href="${adminUrl}" style="color:#2b6cb0;font-weight:bold;margin-top:6px;display:inline-block"><i class="fas fa-external-link-alt"></i> Accéder au Portail Admin</a>`;
      }
      return;
    }

    if (!profile.is_active) {
      await sbSignOut(); hideFullscreenLoader(); showLoginPage();
      showError('login-error', 'Compte désactivé. Contactez votre administrateur.');
      return;
    }

    if (profile.companies) {
      const companyStatus = profile.companies.status || profile.companies.statut || 'actif';
      if (companyStatus === 'suspendu' || companyStatus === 'bloque') {
        await sbSignOut(); hideFullscreenLoader(); showLoginPage();
        showError('login-error', 'Accès suspendu. Contactez GestionApp.');
        return;
      }
    }

    // Charger les permissions granulaires (depuis le profil déjà chargé)
    // profiles.module_permissions est synchronisé depuis platform_users via trigger
    const modulePermissions = profile.module_permissions || {};

    App.currentUser = {
      id:               profile.id,
      email:            profile.email,
      name:             profile.name || profile.full_name || profile.email?.split('@')[0] || 'Utilisateur',
      role:             profile.role,
      companyId:        profile.company_id,
      company_id:       profile.company_id,
      avatar:           profile.avatar || ((profile.name || profile.full_name || 'U').charAt(0)).toUpperCase(),
      twofa:            profile.twofa_enabled || false,
      modulePermissions:modulePermissions,
      canCreateUsers:   false,
    };

    if (profile.companies) {
      App.currentCompany = {
        ...profile.companies,
        statut:           profile.companies.status          || profile.companies.statut          || 'actif',
        status:           profile.companies.status          || profile.companies.statut          || 'actif',
        abonnement_fin:   profile.companies.subscription_end || profile.companies.abonnement_fin || null,
        subscription_end: profile.companies.subscription_end || profile.companies.abonnement_fin || null,
        ville:            profile.companies.city            || profile.companies.ville            || null,
        city:             profile.companies.city            || profile.companies.ville            || null,
      };
    } else {
      App.currentCompany = null;
    }

    if (profile.twofa_enabled) { hideFullscreenLoader(); showTwoFA(); return; }
    await finalizeLogin();

  } catch(err) {
    console.error('completeLogin error:', err);
    _loginInProgress = false;
    hideFullscreenLoader(); showLoginPage();
    showError('login-error', 'Erreur lors de la connexion. Réessayez.');
  }
}

function showTwoFA() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  App.twoFAPending = { code };
  document.getElementById('twofa-code-display').textContent = code;
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('twofa-step').style.display = 'block';
  document.getElementById('auth-title').textContent = 'Vérification 2FA';
}
async function verify2FA() {
  const input = document.getElementById('twofa-input').value.trim();
  if (input !== App.twoFAPending?.code) { showToast('Code incorrect.', 'error'); return; }
  App.twoFAPending = null;
  showFullscreenLoader('Chargement...');
  await finalizeLogin();
}

// ── FINALIZE LOGIN ─────────────────────────────────────────
async function finalizeLogin() {
  // ⚠️ Timeout de sécurité absolu : si tout bloque > 20s → forcer l'affichage
  const _safetyTimer = setTimeout(() => {
    console.error('[GestionApp] SAFETY TIMEOUT 20s — forçage affichage app');
    hideFullscreenLoader();
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    ['clients','companies','devis','factures','chantiers'].forEach(k => {
      App.data[k] = App.data[k] || [];
    });
    updateUserUI(); setupCompanySelector(); navigate(App.currentModule || 'dashboard');
    showToast('⚠️ Chargement partiel. Cliquez Actualiser si besoin.', 'warning', 8000);
  }, 20000);

  try {
    showFullscreenLoader('Chargement des données…');
    App.isSupabaseConnected = false;

    // v4.0 : le superadmin est redirigé avant d'arriver ici
    // Tous les utilisateurs ici ont un rôle admin/manager/commercial/technicien/lecture
    if (App.currentCompany?.id) {
      // ── Utilisateur avec société ──
      try {
        showFullscreenLoader(`Chargement de ${App.currentCompany.name || 'votre espace'}…`);
        const coData = await sbLoadCompanyData(App.currentCompany.id);
        Object.keys(coData).forEach(k => {
          if (coData[k]?.length > 0) App.data[k] = coData[k];
        });
        App.isSupabaseConnected = true;
      } catch(e) {
        console.warn('[GestionApp] Company data failed:', e.message);
        const hasData = Object.values(App.data).some(v => Array.isArray(v) && v.length > 0);
        if (!hasData && typeof initMockData === 'function') initMockData();
        App.isSupabaseConnected = false;
      }

    } else {
      // Pas de société associée
      if (App.isDemoMode && typeof initMockData === 'function') initMockData();
      ['clients','devis','factures','chantiers','stock'].forEach(k => {
        App.data[k] = App.data[k] || [];
      });
      App.isSupabaseConnected = false;
    }

    // Favoris
    App.favorites = JSON.parse(sessionStorage.getItem('ga_favs_' + App.currentUser.id) || '[]');

    // Sync logo v4.0 : uniquement les URLs (pas de base64 en localStorage)
    if (App.currentCompany?.id) {
      if (App.currentCompany.logo && !App.currentCompany.logo.startsWith('data:image')) {
        // Stocker l'URL du logo (pas du base64)
        try { safeLocalSet('ga_logo_url_' + App.currentCompany.id, App.currentCompany.logo); } catch(e) {}
      } else if (!App.currentCompany.logo) {
        // Récupérer l'URL stockée
        try {
          const l = localStorage.getItem('ga_logo_url_' + App.currentCompany.id);
          if (l && !l.startsWith('data:image')) App.currentCompany.logo = l;
        } catch(e) {}
      }
      // Nettoyage au démarrage
      if (typeof cleanLocalStorage === 'function') cleanLocalStorage();
    }

    hideFullscreenLoader();
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('twofa-step').style.display = 'none';
    document.getElementById('auth-title').textContent = 'Connexion';

    updateUserUI();
    setupCompanySelector();
    loadFavorites();
    generateNotifications();
    navigate('dashboard');

    try { sbAddAuditLog('Connexion', `${App.currentUser.name} connecté`, 'auth'); } catch(e) {}
    updateSupabaseStatus(App.isSupabaseConnected);

    if (App.isSupabaseConnected)
      showToast(`✅ Bienvenue, ${App.currentUser.name} — Connecté`, 'success');
    else if (App.isDemoMode)
      showToast(`👋 Mode démo — ${App.currentUser.name}`, 'info', 4000);
    else
      showToast(`👋 Bienvenue, ${App.currentUser.name} — données hors ligne`, 'warning', 5000);

  } catch(err) {
    console.error('finalizeLogin error:', err);
    hideFullscreenLoader();
    showToast('Erreur chargement: ' + err.message, 'error');
  } finally {
    clearTimeout(_safetyTimer);
    _loginInProgress = false; // Toujours libérer le verrou
  }
}

// ── RECHARGER DONNÉES ──────────────────────────────────────
async function reloadSupabaseData() {
  if (App.isDemoMode) { showToast('Mode démo — données locales uniquement', 'info', 3000); return; }
  if (!App.currentUser) return;
  if (!App.supabaseSession) { showToast('Pas de session. Reconnectez-vous.', 'error'); return; }
  updateSupabaseStatus(false, true);
  showToast('⏳ Rechargement…', 'info', 2000);
  try {
    // v4.0 : pas de superadmin dans GestApp
    if (App.currentCompany?.id) {
      showFullscreenLoader('Rechargement…');
      const coData = await sbLoadCompanyData(App.currentCompany.id);
      Object.keys(coData).forEach(k => { if (coData[k]?.length > 0) App.data[k] = coData[k]; });
    }
    hideFullscreenLoader();
    App.isSupabaseConnected = true;
    updateSupabaseStatus(true);
    generateNotifications();
    navigate(App.currentModule);
    showToast('✅ Données rechargées', 'success');
  } catch(e) {
    hideFullscreenLoader();
    App.isSupabaseConnected = false;
    updateSupabaseStatus(false);
    showToast('Erreur rechargement: ' + e.message, 'error', 5000);
  }
}

// ── DÉCONNEXION ────────────────────────────────────────────
async function logout() {
  try { sbAddAuditLog('Déconnexion', `${App.currentUser?.name} déconnecté`, 'auth'); } catch(e) {}
  App.realtimeChannels.forEach(c => { try { c?.unsubscribe?.(); } catch(e){} });
  App.realtimeChannels = [];
  await sbSignOut();
  App.currentUser = null; App.currentCompany = null; App.data = {};
  App.supabaseSession = null; App.isDemoMode = false; App.isSupabaseConnected = false;
  App.favorites = []; App.notifications = [];
  const dot = document.getElementById('supabase-dot');
  const lbl = document.getElementById('supabase-label');
  if (dot) dot.style.background = '#a0aec0';
  if (lbl) { lbl.style.color = '#a0aec0'; lbl.textContent = '…'; }
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-page').style.display = 'flex';
  const lf = document.getElementById('login-form');
  if (lf) { lf.reset(); lf.style.display = 'block'; }
  const ts = document.getElementById('twofa-step');
  if (ts) ts.style.display = 'none';
  const at = document.getElementById('auth-title');
  if (at) at.textContent = 'Connexion';
}

// ── INDICATEUR SUPABASE ─────────────────────────────────────
function updateSupabaseStatus(connected, loading = false) {
  const dot  = document.getElementById('supabase-dot');
  const lbl  = document.getElementById('supabase-label');
  const wrap = document.getElementById('supabase-status');
  if (!dot || !lbl) return;
  if (loading) {
    dot.style.background = '#ed8936'; lbl.style.color = '#ed8936'; lbl.textContent = '…';
    if (wrap) wrap.title = 'Connexion à Supabase…';
  } else if (connected) {
    dot.style.background = '#48bb78'; lbl.style.color = '#68d391'; lbl.textContent = 'Supabase';
    if (wrap) wrap.title = 'Supabase connecté ✅';
  } else if (App.isDemoMode) {
    dot.style.background = '#ed8936'; lbl.style.color = '#f6ad55'; lbl.textContent = 'Démo';
    if (wrap) wrap.title = 'Mode démo — données locales';
  } else {
    dot.style.background = '#fc8181'; lbl.style.color = '#fc8181'; lbl.textContent = 'Hors-ligne';
    if (wrap) wrap.title = 'Supabase indisponible';
  }
}

// ── UTILS UI ───────────────────────────────────────────────
function togglePw() {
  const input = document.getElementById('login-password');
  const icon  = document.getElementById('toggle-pw-icon');
  if (input.type === 'password') {
    input.type = 'text'; if (icon) icon.className = 'fas fa-eye-slash';
  } else {
    input.type = 'password'; if (icon) icon.className = 'fas fa-eye';
  }
}

function setEl(id, val) { const e = document.getElementById(id); if (e) e.textContent = val; }

function updateUserUI() {
  const u = App.currentUser;
  if (!u) return;
  const ini = u.avatar || u.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);
  setEl('sidebar-avatar',    ini);
  setEl('sidebar-username',  u.name);
  setEl('sidebar-email',     u.email);
  setEl('topbar-avatar',     ini);
  setEl('topbar-username',   u.name.split(' ')[0]);
  const roleLabels = {
    superadmin:'👑 Super Admin', admin:'Admin', manager:'Manager',
    commercial:'Commercial', technicien:'Technicien', lecture:'Lecture seule'
  };
  setEl('sidebar-user-role', roleLabels[u.role] || u.role);

  // v4.0 : superadmin supprimé de GestApp
  const isAdmin = ['admin','manager'].includes(u.role);
  const adminSection = document.getElementById('nav-admin-section');
  if (adminSection) adminSection.style.display = isAdmin ? 'block' : 'none';

  // Masquer tous les éléments superadmin dans GestApp
  document.querySelectorAll('[data-module="superadmin"]').forEach(el => {
    el.style.display = 'none';
  });

  // Afficher les liens selon le rôle
  const paramLink = document.getElementById('parametres-link');
  const saLink    = document.getElementById('superadmin-link');
  if (paramLink) paramLink.style.display = isAdmin ? '' : 'none';
  if (saLink)    saLink.style.display    = 'none'; // superadmin link masqué dans GestApp

  // Appliquer les permissions granulaires sur la navigation
  _applyModulePermissionsToNav();

  // Mettre à jour le nom de société dans la topbar
  const topCoName = document.getElementById('topbar-company-name');
  if (topCoName) {
    topCoName.textContent = App.currentCompany?.name || 'GestionApp';
  }

  const coName = document.getElementById('sidebar-company-name');
  if (coName) {
    coName.textContent = App.currentCompany?.name || 'Ma Société';
  }
}

// ── NAVIGATION PAR PERMISSIONS GRANULAIRES v4.0 ──────────────
// Masque/affiche les items de nav selon module_permissions JSONB
function _applyModulePermissionsToNav() {
  if (!App.currentUser) return;
  const modulePerms = App.currentUser.modulePermissions || {};
  const role = App.currentUser.role;
  const roleDef = DEFAULT_PERMISSIONS[role];

  document.querySelectorAll('.nav-item[data-module]').forEach(el => {
    const mod = el.dataset.module;
    if (!mod || mod === 'dashboard' || mod === 'parametres') return;
    // Masquer superadmin dans GestApp
    if (mod === 'superadmin') { el.style.display = 'none'; return; }

    const granular = modulePerms[mod];
    if (granular === 'hidden') {
      el.style.display = 'none';
    } else if (granular === 'view' || granular === 'edit') {
      el.style.display = '';
    } else {
      // Fallback rôle
      el.style.display = (roleDef && roleDef.modules.includes(mod)) ? '' : 'none';
    }
  });
}

// ── SÉLECTEUR SOCIÉTÉ (v4.0 : masqué dans GestApp) ────────
function setupCompanySelector() {
  const sel = document.getElementById('company-selector');
  if (!sel) return;
  // v4.0 : géré uniquement depuis le portail admin
  sel.style.display = 'none';

  // Mettre à jour l'abréviation société
  const abbr = document.getElementById('company-abbr');
  if (abbr && App.currentCompany) {
    abbr.textContent = (App.currentCompany.name || 'G').slice(0, 2).toUpperCase();
    abbr.style.background = avatarColor(App.currentCompany.name || '');
  }
}

async function switchCompany(companyId) {
  if (!companyId || !App.currentUser) return;
  const co = (App.data.companies || []).find(c => c.id === companyId);
  if (!co) return;
  App.currentCompany = co;
  showFullscreenLoader(`Changement vers ${co.name}…`);
  try {
    if (!App.isDemoMode) {
      const coData = await sbLoadCompanyData(companyId);
      Object.keys(coData).forEach(k => {
        if (coData[k]?.length > 0) App.data[k] = coData[k];
      });
    }
  } catch(e) {
    console.warn('[switchCompany]', e.message);
  }
  hideFullscreenLoader();
  setupCompanySelector();
  updateUserUI();
  navigate(App.currentModule || 'dashboard');
  showToast(`✅ Société : ${co.name}`, 'success', 2500);
}

// ── FAVORIS ────────────────────────────────────────────────
function loadFavorites() {
  if (!App.currentUser) return;
  try {
    const stored = sessionStorage.getItem('ga_favs_' + App.currentUser.id);
    App.favorites = stored ? JSON.parse(stored) : [];
  } catch(e) {
    App.favorites = [];
  }
  renderFavorites();
}

function renderFavorites() {
  const bar  = document.getElementById('favorites-bar');
  const list = document.getElementById('favorites-list');
  if (!bar || !list) return;

  const favs = App.favorites || [];
  if (favs.length === 0) {
    bar.style.display = 'none';
    return;
  }
  bar.style.display = 'block';

  const moduleIcons = {
    dashboard: 'tachometer-alt', clients: 'users', devis: 'file-alt',
    factures: 'file-invoice-dollar', paiements: 'credit-card',
    chantiers: 'hard-hat', stock: 'boxes', fournisseurs: 'truck',
    garanties: 'shield-alt', agenda: 'calendar-alt', taches: 'tasks',
    pipeline: 'filter', analyse: 'chart-bar', galerie: 'images',
    parametres: 'cog', superadmin: 'crown',
  };

  list.innerHTML = favs.map(mod => `
    <div class="fav-item" onclick="navigate('${mod}')" title="${mod}">
      <i class="fas fa-${moduleIcons[mod] || 'star'}"></i>
      <span>${TRANS[App.lang]?.[mod] || mod}</span>
    </div>`).join('');
}

function addFavorite(module) {
  if (!App.favorites) App.favorites = [];
  if (!App.favorites.includes(module)) {
    App.favorites.push(module);
    try { sessionStorage.setItem('ga_favs_' + App.currentUser?.id, JSON.stringify(App.favorites)); } catch(e) {}
    renderFavorites();
    showToast(`⭐ ${module} ajouté aux favoris`, 'success', 2000);
  }
}

function removeFavorite(module) {
  App.favorites = (App.favorites || []).filter(f => f !== module);
  try { sessionStorage.setItem('ga_favs_' + App.currentUser?.id, JSON.stringify(App.favorites)); } catch(e) {}
  renderFavorites();
  showToast(`Favori retiré`, 'info', 2000);
}

// ── NOTIFICATIONS ──────────────────────────────────────────
function generateNotifications() {
  const notifs = [];
  const now    = new Date();

  try {
    // Factures impayées / en retard
    const factures = App.data.factures || [];
    factures.forEach(f => {
      if (f.statut === 'impaye' || f.statut === 'partiellement_paye') {
        const echeance = f.dateEcheance || f.date_echeance;
        const days     = echeance ? Math.floor((new Date(echeance) - now) / 86400000) : null;
        if (days !== null && days < 0) {
          notifs.push({
            id: 'fac_' + f.id, type: 'danger', icon: 'file-invoice-dollar',
            title: `Facture ${f.numero || f.id} en retard`,
            text: `${formatDate(echeance)} — ${formatMAD(f.resteAPayer || f.reste_a_payer || 0)}`,
            module: 'factures', time: formatDate(echeance), read: false,
          });
        } else if (days !== null && days <= 7) {
          notifs.push({
            id: 'fac_soon_' + f.id, type: 'warning', icon: 'clock',
            title: `Facture ${f.numero || f.id} — échéance proche`,
            text: `Dans ${days} jour(s) — ${formatMAD(f.resteAPayer || f.reste_a_payer || 0)}`,
            module: 'factures', time: formatDate(echeance), read: false,
          });
        }
      }
    });

    // Stock bas
    const stock = App.data.stock || [];
    stock.forEach(s => {
      const seuil = s.seuilAlerte || s.seuil_alerte || 0;
      if (seuil > 0 && (s.quantite || 0) <= seuil) {
        notifs.push({
          id: 'stk_' + s.id, type: 'warning', icon: 'boxes',
          title: `Stock bas : ${s.nom || s.name || s.id}`,
          text: `Qté : ${s.quantite || 0} (seuil : ${seuil})`,
          module: 'stock', time: '', read: false,
        });
      }
    });

    // Chantiers en retard
    const chantiers = App.data.chantiers || [];
    chantiers.forEach(c => {
      if (c.statut === 'en_cours' && c.dateFin) {
        const days = Math.floor((new Date(c.dateFin) - now) / 86400000);
        if (days < 0) {
          notifs.push({
            id: 'ch_' + c.id, type: 'danger', icon: 'hard-hat',
            title: `Chantier en retard : ${c.nom || c.name || c.id}`,
            text: `Date fin prévue : ${formatDate(c.dateFin)}`,
            module: 'chantiers', time: formatDate(c.dateFin), read: false,
          });
        }
      }
    });

    // Abonnement Supabase expirant (superadmin)
    if (App.currentUser?.role === 'superadmin') {
      (App.data.companies || []).forEach(co => {
        const fin = co.abonnement_fin || co.subscription_end;
        if (fin) {
          const days = Math.floor((new Date(fin) - now) / 86400000);
          if (days >= 0 && days <= 30) {
            notifs.push({
              id: 'sub_' + co.id, type: 'warning', icon: 'building',
              title: `Abonnement expirant : ${co.name}`,
              text: `Expire dans ${days} jour(s)`,
              module: 'superadmin', time: formatDate(fin), read: false,
            });
          }
        }
      });
    }

  } catch(e) {
    console.warn('[generateNotifications]', e.message);
  }

  App.notifications = notifs;
  updateNotifBadge();
  renderNotifications();
}

// ── NAVIGATION ─────────────────────────────────────────────
function navigate(module) {
  if (!module) module = 'dashboard';
  App.currentModule = module;

  // Active le lien nav correspondant
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.module === module);
  });

  // Mettre à jour le fil d'ariane (supporte plusieurs IDs possibles)
  const title      = document.getElementById('page-title');
  const breadcrumb = document.getElementById('page-breadcrumb') || document.getElementById('breadcrumb');
  const label      = (TRANS[App.lang] || TRANS.fr)[module] || module;
  if (title) title.textContent = label;
  if (breadcrumb) {
    const icons = {
      dashboard:'tachometer-alt', clients:'users', devis:'file-alt',
      factures:'file-invoice-dollar', paiements:'credit-card', chantiers:'hard-hat',
      stock:'boxes', fournisseurs:'truck', garanties:'shield-alt',
      agenda:'calendar-alt', taches:'tasks', pipeline:'filter',
      analyse:'chart-bar', galerie:'images', parametres:'cog', superadmin:'crown',
    };
    breadcrumb.innerHTML = `<i class="fas fa-${icons[module]||'circle'}" style="margin-right:6px"></i>${label}` +
      `<span style="color:#a0aec0;margin:0 6px">/</span>` +
      `<span style="font-size:12px;color:#a0aec0">${
        App.currentCompany?.name || (App.currentUser?.role==='superadmin' ? 'Super Admin' : 'GestionApp')
      }</span>`;
  }

  // Vérifier les permissions
  if (!canDo('read', module) && module !== 'dashboard' && module !== 'parametres') {
    const content = document.getElementById('page-content');
    if (content) content.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-lock"></i>
        <h3>Accès refusé</h3>
        <p>Vous n'avez pas accès au module <strong>${esc(label)}</strong>.</p>
      </div>`;
    return;
  }

  // Appeler le renderer du module
  const renderers = {
    dashboard:    typeof renderDashboard    === 'function' ? renderDashboard    : null,
    clients:      typeof renderClients      === 'function' ? renderClients      : null,
    devis:        typeof renderDevis        === 'function' ? renderDevis        : null,
    factures:     typeof renderFactures     === 'function' ? renderFactures     : null,
    paiements:    typeof renderPaiements    === 'function' ? renderPaiements    : null,
    chantiers:    typeof renderChantiers    === 'function' ? renderChantiers    : null,
    stock:        typeof renderStock        === 'function' ? renderStock        : null,
    fournisseurs: typeof renderFournisseurs === 'function' ? renderFournisseurs : null,
    garanties:    typeof renderGaranties    === 'function' ? renderGaranties    : null,
    agenda:       typeof renderAgenda       === 'function' ? renderAgenda       : null,
    taches:       typeof renderTaches       === 'function' ? renderTaches       : null,
    pipeline:     typeof renderPipeline     === 'function' ? renderPipeline     : null,
    analyse:      typeof renderAnalyse      === 'function' ? renderAnalyse      : null,
    galerie:      typeof renderGalerie      === 'function' ? renderGalerie      : null,
    parametres:   typeof renderParametres   === 'function' ? renderParametres   : null,
    // superadmin retiré de GestApp → portail /admin/
  };

  const renderer = renderers[module];
  if (renderer) {
    try {
      renderer();
    } catch(e) {
      console.error(`[navigate] Erreur rendu ${module}:`, e);
      const content = document.getElementById('page-content');
      if (content) content.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle" style="color:#e53e3e"></i>
          <h3>Erreur de chargement</h3>
          <p>${esc(e.message)}</p>
        </div>`;
    }
  } else {
    const content = document.getElementById('page-content');
    if (content) content.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-tools"></i>
        <h3>Module "${esc(label)}"</h3>
        <p>Ce module est en cours de développement.</p>
      </div>`;
  }
}

// ── RECHERCHE GLOBALE (topbar) ─────────────────────────────
let _searchDebounce = null;
async function globalSearch(query) {
  clearTimeout(_searchDebounce);
  if (!query || query.length < 2) {
    const r = document.getElementById('search-results');
    if (r) r.innerHTML = '';
    return;
  }
  _searchDebounce = setTimeout(async () => {
    const results = await sbGlobalSearch(query, App.currentCompany?.id);
    const r = document.getElementById('search-results');
    if (!r) return;
    if (!results.length) {
      r.innerHTML = '<div style="padding:12px;text-align:center;color:#a0aec0;font-size:13px">Aucun résultat</div>';
      return;
    }
    r.innerHTML = results.map(item => `
      <div style="padding:8px 14px;cursor:pointer;display:flex;align-items:center;gap:10px;font-size:13px"
           onmouseover="this.style.background='#f7fafc'" onmouseout="this.style.background=''"
           onclick="navigate('${item.module}');document.getElementById('search-results').innerHTML=''">
        <i class="fas ${item.icon}" style="color:${item.color};width:16px"></i>
        <span>${esc(item.name)}</span>
        <span style="font-size:11px;color:#a0aec0;margin-left:auto">${item.module}</span>
      </div>`).join('');
  }, 300);
}

// ── DARK MODE ──────────────────────────────────────────────
function toggleDarkMode() {
  App.darkMode = !App.darkMode;
  document.body.classList.toggle('dark-mode', App.darkMode);
  try { localStorage.setItem('ga_dark', App.darkMode ? '1' : '0'); } catch(e) {}
  const icon = document.getElementById('dark-mode-icon');
  if (icon) icon.className = App.darkMode ? 'fas fa-sun' : 'fas fa-moon';
}

// ── LANGUE ─────────────────────────────────────────────────
function switchLang(lang) {
  if (!TRANS[lang]) return;
  App.lang = lang;
  try { localStorage.setItem('ga_lang', lang); } catch(e) {}
  document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  // Re-render le module courant
  if (App.currentModule) navigate(App.currentModule);
}

// ── OUVRIR MODALE ─────────────────────────────────────────
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = 'flex';
}

// ── GENID ─────────────────────────────────────────────────
function genId() {
  return 'local_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now();
}

// ── SIDEBAR TOGGLE ─────────────────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  sidebar.classList.toggle('collapsed');
  try { localStorage.setItem('ga_sidebar', sidebar.classList.contains('collapsed') ? '1' : '0'); } catch(e) {}
}

// ── TOGGLE LANGUE ──────────────────────────────────────────
function toggleLang() {
  const newLang = App.lang === 'fr' ? 'ar' : 'fr';
  switchLang(newLang);
  const btn = document.getElementById('lang-btn');
  if (btn) btn.innerHTML = `<span style="font-size:12px;font-weight:700">${newLang.toUpperCase()}</span>`;
}
