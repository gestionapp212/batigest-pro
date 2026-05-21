// ============================================================
//  APP.JS — Point d'entrée principal
// ============================================================

(async function () {
  // 1. Initialiser le thème
  Components.initTheme();

  // 2. Initialiser le router
  Router.init();

  // 3. Définir les routes
  Router.define('/', () => {
    hideSplash();
    Landing.render();
  });

  Router.define('/login', () => {
    hideSplash();
    if (Auth.currentUser) { Router.navigate('/dashboard'); return; }
    Auth.renderLogin();
  });

  Router.define('/signup', () => {
    hideSplash();
    if (Auth.currentUser) { Router.navigate('/dashboard'); return; }
    Auth.renderSignup();
  });

  Router.define('/onboarding', () => {
    hideSplash();
    if (!Auth.currentUser) { Router.navigate('/login'); return; }
    Onboarding.render();
  });

  Router.define('/dashboard', async () => {
    hideSplash();
    if (!Auth.currentUser) { Router.navigate('/login'); return; }
    await Dashboard.render();
  });

  Router.define('/dashboard/income', async () => {
    hideSplash();
    if (!Auth.currentUser) { Router.navigate('/login'); return; }
    await Income.render();
  });

  Router.define('/dashboard/expenses', async () => {
    hideSplash();
    if (!Auth.currentUser) { Router.navigate('/login'); return; }
    await Expenses.render();
  });

  Router.define('/dashboard/subscriptions', async () => {
    hideSplash();
    if (!Auth.currentUser) { Router.navigate('/login'); return; }
    await Subscriptions.render();
  });

  Router.define('/dashboard/loans', async () => {
    hideSplash();
    if (!Auth.currentUser) { Router.navigate('/login'); return; }
    await Loans.render();
  });

  Router.define('/dashboard/budgets', async () => {
    hideSplash();
    if (!Auth.currentUser) { Router.navigate('/login'); return; }
    await Budgets.render();
  });

  Router.define('/dashboard/reports', async () => {
    hideSplash();
    if (!Auth.currentUser) { Router.navigate('/login'); return; }
    await Reports.render();
  });

  Router.define('/dashboard/family', async () => {
    hideSplash();
    if (!Auth.currentUser) { Router.navigate('/login'); return; }
    await Family.render();
  });

  Router.define('/dashboard/settings', async () => {
    hideSplash();
    if (!Auth.currentUser) { Router.navigate('/login'); return; }
    await Settings.render();
  });

  Router.define('/admin', async () => {
    hideSplash();
    if (!Auth.currentUser) { Router.navigate('/login'); return; }
    await Admin.render();
  });

  // Route 404 par défaut
  Router.define('*', () => {
    hideSplash();
    Router.navigate('/');
  });

  // 4. Initialiser Supabase Auth
  await Auth.init();

  // 5. Démarrer la navigation à l'URL courante
  const currentPath = window.location.pathname;
  await Router.render(currentPath);

  function hideSplash() {
    const splash = document.getElementById('splash');
    if (splash) {
      splash.classList.add('splash--hidden');
      setTimeout(() => splash.remove(), 500);
    }
  }
})();
