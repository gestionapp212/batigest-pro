// =====================================================
// Family Cash Flow — Router
// =====================================================

async function navigateTo(page) {
  AppState.currentPage = page;
  window.scrollTo(0, 0);

  // If not authenticated and not on public pages
  if (!AppState.user && !['landing','login','signup','forgot'].includes(page)) {
    renderAuthPage('login');
    return;
  }

  switch(page) {
    case 'landing':
      renderLandingPage();
      break;
    case 'login':
      renderAuthPage('login');
      break;
    case 'signup':
      renderAuthPage('signup');
      break;
    case 'forgot':
      renderAuthPage('forgot');
      break;
    case 'dashboard':
      await loadDashboard();
      break;
    case 'income':
      await loadIncomePage();
      break;
    case 'expenses':
      await loadExpensesPage();
      break;
    case 'subscriptions':
      await loadSubscriptionsPage();
      break;
    case 'loans':
      await loadLoansPage();
      break;
    case 'budgets':
      await loadBudgetsPage();
      break;
    case 'reports':
      await loadReportsPage();
      break;
    case 'family':
      await loadFamilyPage();
      break;
    case 'settings':
      await loadSettingsPage();
      break;
    case 'admin':
      await loadAdminPage();
      break;
    default:
      await loadDashboard();
  }
}

// ── Init ──
async function initApp() {
  setLoading(true);
  applyTheme(AppState.theme);

  try {
    // Check existing session
    const user = await getSession();

    if (user) {
      await loadUserProfile(user.id);
      navigateTo('dashboard');
    } else {
      navigateTo('landing');
    }
  } catch(err) {
    console.error('Init error:', err);
    navigateTo('landing');
  } finally {
    setLoading(false);
  }
}

// Handle browser back/forward (simple hash-based)
window.addEventListener('popstate', () => {
  const hash = window.location.hash.replace('#', '') || 'landing';
  if (AppState.currentPage !== hash) navigateTo(hash);
});

// Start the app
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});
