// ============================================================
//  SPA Router — Gestion des routes sans rechargement de page
// ============================================================

const Router = {
  routes: {},
  currentRoute: null,
  layoutRendered: false,

  define(path, handler) {
    this.routes[path] = handler;
  },

  async navigate(path, pushState = true) {
    // Normaliser le chemin
    if (!path || path === '') path = '/';
    if (!path.startsWith('/')) path = '/' + path;

    // Fermer le menu mobile si ouvert
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('sidebar-open');

    this.currentRoute = path;
    if (pushState) {
      history.pushState({ path }, '', path);
    }

    await this.render(path);
  },

  async render(path) {
    // Extraire le segment de base (sans paramètres)
    const base = '/' + (path.split('/')[1] || '');

    const handler = this.routes[path] || this.routes[base] || this.routes['*'];
    if (handler) {
      await handler(path);
    } else {
      await this.render('/');
    }

    // Activer les icônes lucide si disponibles
    if (window.lucide) lucide.createIcons();
  },

  // Lien actif dans la navigation
  setActive(path) {
    document.querySelectorAll('.nav-link').forEach(el => {
      const href = el.getAttribute('data-href');
      const isActive = path === href || (href !== '/' && href !== '/dashboard' && path.startsWith(href));
      el.classList.toggle('nav-link--active', isActive || path === href);
    });
  },

  init() {
    // Navigation via bouton précédent/suivant
    window.addEventListener('popstate', (e) => {
      const path = e.state?.path || window.location.pathname;
      this.render(path);
    });

    // Intercepter tous les clics sur liens internes
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-href]');
      if (link) {
        e.preventDefault();
        this.navigate(link.getAttribute('data-href'));
      }
    });
  },
};

window.Router = Router;

// Helper global
window.navigate = (path) => Router.navigate(path);
