// =====================================================
// Family Cash Flow — Authentication
// =====================================================

let supabaseClient = null;

function getSupabase() {
  if (supabaseClient) return supabaseClient;
  if (!CONFIG.SUPABASE_URL.includes('YOUR_PROJECT')) {
    supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

// ── Auth Actions ──
async function signIn(email, password) {
  const sb = getSupabase();
  if (!sb) {
    // Demo mode: accept any credentials
    AppState.user = { id: 'demo-user', email, user_metadata: { full_name: 'Demo User' } };
    AppState.profile = { full_name: 'Demo User', email, currency: 'MAD', language: 'fr' };
    AppState.family = { id: 'demo-family', name: 'Ma Famille', invitation_code: 'DEMO-2024' };
    // Sync DB si disponible
    if (typeof DB !== 'undefined') DB._userId = 'demo-user';
    return { error: null };
  }
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (!error && data.user) {
    AppState.user = data.user;
    // v5.1 FIX : synchroniser DB._userId dès la connexion pour éviter isDemoMode() = true
    if (typeof DB !== 'undefined') {
      DB._userId = data.user.id;
      console.log('[Auth] DB._userId synchronisé:', DB._userId);
    }
    await loadUserProfile(data.user.id);
  }
  return { error };
}

async function signUp(email, password, fullName) {
  const sb = getSupabase();
  if (!sb) return { error: { message: 'Supabase non configuré.' } };
  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { data: { full_name: fullName } }
  });
  return { data, error };
}

async function signOut() {
  const sb = getSupabase();
  AppState.user = null;
  AppState.profile = null;
  AppState.family = null;
  // v5.1 FIX : réinitialiser DB._userId à la déconnexion
  if (typeof DB !== 'undefined') DB._userId = null;
  if (sb) await sb.auth.signOut();
  navigateTo('landing');
}

async function resetPassword(email) {
  const sb = getSupabase();
  if (!sb) return { error: { message: 'Supabase non configuré.' } };
  return await sb.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/famille/`
  });
}

async function getSession() {
  const sb = getSupabase();
  if (!sb) return AppState.user;
  const { data } = await sb.auth.getSession();
  if (data.session?.user) {
    AppState.user = data.session.user;
    // v5.1 FIX : synchroniser DB._userId lors de la récupération de session (refresh page)
    if (typeof DB !== 'undefined') {
      DB._userId = data.session.user.id;
      console.log('[Auth] getSession — DB._userId:', DB._userId);
    }
    return data.session.user;
  }
  return null;
}

async function loadUserProfile(userId) {
  const sb = getSupabase();
  if (!sb) return;

  // ⚠️ Fix 400 : la table profiles utilise 'id' comme clé (= auth.users.id), pas 'user_id'
  // ⚠️ Fix 406 : on n'utilise plus .single() → on prend rows[0] à la place
  const { data: profileRows } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)   // ← corrigé : 'id' et non 'user_id'
    .limit(1);

  const profileData = profileRows && profileRows.length > 0 ? profileRows[0] : null;
  if (profileData) {
    AppState.profile = profileData;
    AppState.currency = profileData.currency || 'MAD';
    AppState.language = profileData.language || 'fr';
    applyTheme(profileData.theme || AppState.theme);
  }

  // Load family — table optionnelle (peut ne pas exister)
  try {
    const { data: memberRows, error: memberErr } = await sb
      .from('family_members')
      .select('*, families(*)')
      .eq('user_id', userId)
      .limit(1);

    if (!memberErr) {
      const member = memberRows && memberRows.length > 0 ? memberRows[0] : null;
      if (member?.families) {
        AppState.family = member.families;
        AppState.familyRole = member.role;
      }
    }
  } catch(e) {
    // Table family_members optionnelle — ignorer si inexistante
    console.warn('[auth] family_members inaccessible (optionnel):', e.message);
  }
}

// ── Render Auth Pages ──
function renderAuthPage(mode = 'login') {
  const app = el('app');
  if (!app) return;
  app.innerHTML = `
  <div class="auth-page">
    <div class="auth-bg"></div>
    <div class="auth-card fade-in" id="auth-card">
      ${mode === 'login' ? renderLoginForm() : mode === 'signup' ? renderSignupForm() : renderForgotForm()}
    </div>
  </div>`;
}

function renderLoginForm() {
  return `
  <div class="auth-logo">
    <div class="logo-icon">💰</div>
    <div class="auth-title">Bon retour !</div>
    <div class="auth-subtitle">Connectez-vous à votre espace familial</div>
  </div>
  <form id="login-form" onsubmit="handleLogin(event)">
    <div class="form-group">
      <label class="form-label">Adresse email <span class="required">*</span></label>
      <input type="email" id="login-email" class="form-input" placeholder="vous@exemple.com" required autocomplete="email">
    </div>
    <div class="form-group">
      <label class="form-label">Mot de passe <span class="required">*</span></label>
      <div class="input-group">
        <input type="password" id="login-password" class="form-input" placeholder="••••••••" required autocomplete="current-password">
        <span class="input-toggle" onclick="togglePassword('login-password')"><i class="fas fa-eye"></i></span>
      </div>
    </div>
    <div style="text-align:right; margin-bottom:16px;">
      <a onclick="renderAuthPage('forgot')" style="font-size:13px;color:var(--primary);cursor:pointer;font-weight:500;">
        Mot de passe oublié ?
      </a>
    </div>
    <div id="login-error" class="alert alert-danger hidden" style="margin-bottom:14px;">
      <span class="alert-icon">❌</span>
      <span id="login-error-msg"></span>
    </div>
    <button type="submit" class="btn btn-primary" style="width:100%;" id="login-btn">
      <i class="fas fa-sign-in-alt"></i> Se connecter
    </button>
  </form>
  <div class="auth-divider"><span>ou</span></div>
  <button class="btn btn-ghost" style="width:100%;" onclick="demoLogin()">
    <i class="fas fa-play-circle"></i> Tester en mode démo
  </button>
  <div class="auth-switch">
    Pas encore de compte ? <a onclick="renderAuthPage('signup')" style="cursor:pointer;">Créer un compte</a>
  </div>`;
}

function renderSignupForm() {
  return `
  <div class="auth-logo">
    <div class="logo-icon">💰</div>
    <div class="auth-title">Créer votre espace</div>
    <div class="auth-subtitle">Commencez à gérer vos finances familiales</div>
  </div>
  <form id="signup-form" onsubmit="handleSignup(event)">
    <div class="form-group">
      <label class="form-label">Nom complet <span class="required">*</span></label>
      <input type="text" id="signup-name" class="form-input" placeholder="Votre nom" required>
    </div>
    <div class="form-group">
      <label class="form-label">Adresse email <span class="required">*</span></label>
      <input type="email" id="signup-email" class="form-input" placeholder="vous@exemple.com" required autocomplete="email">
    </div>
    <div class="form-group">
      <label class="form-label">Mot de passe <span class="required">*</span></label>
      <div class="input-group">
        <input type="password" id="signup-password" class="form-input" placeholder="Min. 8 caractères" required autocomplete="new-password">
        <span class="input-toggle" onclick="togglePassword('signup-password')"><i class="fas fa-eye"></i></span>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Confirmer le mot de passe <span class="required">*</span></label>
      <div class="input-group">
        <input type="password" id="signup-password2" class="form-input" placeholder="••••••••" required>
        <span class="input-toggle" onclick="togglePassword('signup-password2')"><i class="fas fa-eye"></i></span>
      </div>
    </div>
    <div id="signup-error" class="alert alert-danger hidden" style="margin-bottom:14px;">
      <span class="alert-icon">❌</span>
      <span id="signup-error-msg"></span>
    </div>
    <button type="submit" class="btn btn-primary" style="width:100%;" id="signup-btn">
      <i class="fas fa-user-plus"></i> Créer mon compte
    </button>
  </form>
  <div class="auth-switch">
    Déjà un compte ? <a onclick="renderAuthPage('login')" style="cursor:pointer;">Se connecter</a>
  </div>`;
}

function renderForgotForm() {
  return `
  <div class="auth-logo">
    <div class="logo-icon">🔑</div>
    <div class="auth-title">Mot de passe oublié</div>
    <div class="auth-subtitle">Entrez votre email pour recevoir un lien de réinitialisation</div>
  </div>
  <form id="forgot-form" onsubmit="handleForgot(event)">
    <div class="form-group">
      <label class="form-label">Adresse email <span class="required">*</span></label>
      <input type="email" id="forgot-email" class="form-input" placeholder="vous@exemple.com" required>
    </div>
    <div id="forgot-success" class="alert alert-success hidden" style="margin-bottom:14px;">
      <span class="alert-icon">✅</span>
      <span>Email envoyé ! Vérifiez votre boîte mail.</span>
    </div>
    <div id="forgot-error" class="alert alert-danger hidden" style="margin-bottom:14px;">
      <span class="alert-icon">❌</span>
      <span id="forgot-error-msg"></span>
    </div>
    <button type="submit" class="btn btn-primary" style="width:100%;" id="forgot-btn">
      <i class="fas fa-paper-plane"></i> Envoyer le lien
    </button>
  </form>
  <div class="auth-switch">
    <a onclick="renderAuthPage('login')" style="cursor:pointer;">← Retour à la connexion</a>
  </div>`;
}

// ── Auth Handlers ──
async function handleLogin(e) {
  e.preventDefault();
  const email = el('login-email')?.value;
  const password = el('login-password')?.value;
  const btn = el('login-btn');
  const errDiv = el('login-error');
  const errMsg = el('login-error-msg');

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...'; }
  if (errDiv) errDiv.classList.add('hidden');

  const { error } = await signIn(email, password);

  if (error) {
    if (errDiv) errDiv.classList.remove('hidden');
    if (errMsg) errMsg.textContent = error.message === 'Invalid login credentials'
      ? 'Email ou mot de passe incorrect.'
      : error.message;
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter'; }
  } else {
    showToast('Connexion réussie !', 'success');
    navigateTo('dashboard');
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const name = el('signup-name')?.value;
  const email = el('signup-email')?.value;
  const pass = el('signup-password')?.value;
  const pass2 = el('signup-password2')?.value;
  const btn = el('signup-btn');
  const errDiv = el('signup-error');
  const errMsg = el('signup-error-msg');

  if (pass !== pass2) {
    if (errDiv) errDiv.classList.remove('hidden');
    if (errMsg) errMsg.textContent = 'Les mots de passe ne correspondent pas.';
    return;
  }
  if (pass.length < 8) {
    if (errDiv) errDiv.classList.remove('hidden');
    if (errMsg) errMsg.textContent = 'Le mot de passe doit contenir au moins 8 caractères.';
    return;
  }

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Création...'; }
  if (errDiv) errDiv.classList.add('hidden');

  const { error } = await signUp(email, pass, name);

  if (error) {
    if (errDiv) errDiv.classList.remove('hidden');
    if (errMsg) errMsg.textContent = error.message;
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus"></i> Créer mon compte'; }
  } else {
    showToast('Compte créé ! Vérifiez votre email.', 'success', 5000);
    renderAuthPage('login');
  }
}

async function handleForgot(e) {
  e.preventDefault();
  const email = el('forgot-email')?.value;
  const btn = el('forgot-btn');
  const successDiv = el('forgot-success');
  const errDiv = el('forgot-error');
  const errMsg = el('forgot-error-msg');

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi...'; }

  const { error } = await resetPassword(email);

  if (error) {
    if (errDiv) errDiv.classList.remove('hidden');
    if (errMsg) errMsg.textContent = error.message;
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Envoyer le lien'; }
  } else {
    if (successDiv) successDiv.classList.remove('hidden');
    if (btn) { btn.disabled = true; btn.innerHTML = '✅ Email envoyé'; }
  }
}

async function demoLogin() {
  AppState.user = {
    id: 'demo-001',
    email: 'demo@familycashflow.com',
    user_metadata: { full_name: 'Ahmed Benali' }
  };
  AppState.profile = {
    full_name: 'Ahmed Benali',
    email: 'demo@familycashflow.com',
    currency: 'MAD',
    language: 'fr',
    role: 'admin'
  };
  AppState.family = {
    id: 'demo-family-001',
    name: 'Famille Benali',
    invitation_code: 'BEN-2024'
  };
  AppState.familyRole = 'admin';
  AppState.currency = 'MAD';
  // v5.1 : mode démo — DB._userId reste null pour que isDemoMode() retourne true
  if (typeof DB !== 'undefined') DB._userId = 'demo-001';
  showToast('Mode démo activé — données fictives', 'info');
  navigateTo('dashboard');
}

function togglePassword(inputId) {
  const input = el(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
}
