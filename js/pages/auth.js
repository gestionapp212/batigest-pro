// ============================================================
//  Auth — Login, Signup, Logout
// ============================================================

const Auth = {
  currentUser: null,
  currentFamily: null,

  async init() {
    const { data: { session } } = await db.auth.getSession();
    this.currentUser = session?.user || null;
    if (this.currentUser) await this.loadFamily();

    db.auth.onAuthStateChange(async (event, session) => {
      this.currentUser = session?.user || null;
      if (this.currentUser) await this.loadFamily();
    });
  },

  async loadFamily() {
    try {
      const { data } = await db
        .from('family_members')
        .select('family_id, role, families(id, name)')
        .eq('user_id', this.currentUser.id)
        .single();
      this.currentFamily = data || null;
    } catch { this.currentFamily = null; }
  },

  async logout() {
    await db.auth.signOut();
    this.currentUser = null;
    this.currentFamily = null;
    Router.navigate('/');
  },

  // ── Page Login ───────────────────────────────────────────
  renderLogin() {
    document.getElementById('app').innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">
          <div class="brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
          </div>
          <div>
            <div class="auth-title">Family Cash Flow</div>
            <div class="auth-domain">famille.chan-pro.com</div>
          </div>
        </div>

        <h2 class="auth-heading">Connexion</h2>
        <p class="auth-sub">Gérez les finances de votre famille</p>

        <div id="auth-alert" class="alert hidden"></div>

        <form id="login-form" class="auth-form">
          <div class="form-group">
            <label class="form-label">Adresse e-mail</label>
            <input type="email" id="login-email" class="form-input" placeholder="email@exemple.com" required />
          </div>
          <div class="form-group">
            <label class="form-label">Mot de passe</label>
            <div class="input-wrap">
              <input type="password" id="login-password" class="form-input" placeholder="••••••••" required />
              <button type="button" class="input-toggle" onclick="Auth.togglePass('login-password', this)">
                <i data-lucide="eye"></i>
              </button>
            </div>
          </div>
          <button type="submit" class="btn btn--primary btn--full" id="login-btn">
            Se connecter
          </button>
        </form>

        <div class="auth-footer">
          <p>Pas encore de compte ? <a data-href="/signup" class="link">Créer un compte</a></p>
          <a data-href="/" class="link link--muted">← Retour à l'accueil</a>
        </div>
      </div>
    </div>`;

    if (window.lucide) lucide.createIcons();

    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const btn = document.getElementById('login-btn');
      btn.disabled = true;
      btn.textContent = 'Connexion...';
      Auth.hideAlert();

      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error) {
        Auth.showAlert('Email ou mot de passe incorrect. Vérifiez vos identifiants.');
        btn.disabled = false;
        btn.textContent = 'Se connecter';
        return;
      }
      Auth.currentUser = data.user;
      await Auth.loadFamily();
      if (!Auth.currentFamily) {
        Router.navigate('/onboarding');
      } else {
        Router.navigate('/dashboard');
      }
    });
  },

  // ── Page Signup ──────────────────────────────────────────
  renderSignup() {
    document.getElementById('app').innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">
          <div class="brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
          </div>
          <div>
            <div class="auth-title">Family Cash Flow</div>
            <div class="auth-domain">famille.chan-pro.com</div>
          </div>
        </div>

        <h2 class="auth-heading">Créer un compte</h2>
        <p class="auth-sub">Commencez à gérer vos finances familiales</p>

        <div id="auth-alert" class="alert hidden"></div>

        <form id="signup-form" class="auth-form">
          <div class="form-group">
            <label class="form-label">Nom complet</label>
            <input type="text" id="signup-name" class="form-input" placeholder="Mohammed Alaoui" required />
          </div>
          <div class="form-group">
            <label class="form-label">Adresse e-mail</label>
            <input type="email" id="signup-email" class="form-input" placeholder="email@exemple.com" required />
          </div>
          <div class="form-group">
            <label class="form-label">Mot de passe</label>
            <div class="input-wrap">
              <input type="password" id="signup-password" class="form-input" placeholder="Minimum 8 caractères" required minlength="8" />
              <button type="button" class="input-toggle" onclick="Auth.togglePass('signup-password', this)">
                <i data-lucide="eye"></i>
              </button>
            </div>
          </div>
          <button type="submit" class="btn btn--primary btn--full" id="signup-btn">
            Créer mon compte
          </button>
        </form>

        <div class="auth-footer">
          <p>Déjà un compte ? <a data-href="/login" class="link">Se connecter</a></p>
          <a data-href="/" class="link link--muted">← Retour à l'accueil</a>
        </div>
      </div>
    </div>`;

    if (window.lucide) lucide.createIcons();

    document.getElementById('signup-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      const btn = document.getElementById('signup-btn');
      btn.disabled = true;
      btn.textContent = 'Création...';
      Auth.hideAlert();

      const { data, error } = await db.auth.signUp({
        email, password,
        options: { data: { full_name: name } }
      });

      if (error) {
        let msg = error.message;
        if (msg.includes('rate limit') || msg.includes('email rate')) {
          msg = '⚠️ Trop de tentatives. Attendez quelques minutes ou désactivez la confirmation email dans Supabase → Authentication → Settings.';
        } else if (msg.includes('already registered')) {
          msg = 'Cet email est déjà utilisé. <a data-href="/login" class="link">Se connecter</a>';
        }
        Auth.showAlert(msg);
        btn.disabled = false;
        btn.textContent = 'Créer mon compte';
        return;
      }

      Auth.currentUser = data.user;
      Utils.toast('Compte créé avec succès !', 'success');
      Router.navigate('/onboarding');
    });
  },

  showAlert(msg) {
    const el = document.getElementById('auth-alert');
    if (!el) return;
    el.innerHTML = '⚠️ ' + msg;
    el.classList.remove('hidden');
    el.classList.add('alert--error');
    if (window.lucide) lucide.createIcons();
  },

  hideAlert() {
    const el = document.getElementById('auth-alert');
    if (el) el.classList.add('hidden');
  },

  togglePass(id, btn) {
    const input = document.getElementById(id);
    if (!input) return;
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    btn.innerHTML = isPass ? '<i data-lucide="eye-off"></i>' : '<i data-lucide="eye"></i>';
    if (window.lucide) lucide.createIcons();
  },
};

window.Auth = Auth;
