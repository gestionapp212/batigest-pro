// ═══════════════════════════════════════════════════════════════
//  PLATFORM CONFIG v5.0 — Multi-App SaaS Platform
//  Supabase + Cloudflare Architecture
//  Domaine : digital-pro.live
// ═══════════════════════════════════════════════════════════════

const PLATFORM_CONFIG = {
  // ── Supabase ──────────────────────────────────────────────────
  supabase: {
    url:     'https://mfyhktnzjodaqfocupcn.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1meWhrdG56am9kYXFmb2N1cGNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4Mjg2ODEsImV4cCI6MjA5MTQwNDY4MX0.jnqEOFFu1gQvQrDemK4eOYwhWZI0K84Lgwhv7Cl2xGo',
    restUrl: 'https://mfyhktnzjodaqfocupcn.supabase.co/rest/v1/',
  },

  // ── Cloudflare Worker ─────────────────────────────────────────
  workerUrl: 'https://gestapp-api.gestionapp212.workers.dev',

  // ── SuperAdmin ────────────────────────────────────────────────
  superAdminEmail: 'said.hamdaoui1984@gmail.com',

  // ── Applications — URLs de production ────────────────────────
  apps: {
    gestapp: {
      id:          'gestapp',
      name:        'GestApp 212 BTP',
      icon:        '🏗️',
      color:       '#f59e0b',
      description: 'Gestion BTP Maroc — Clients, Devis, Factures, Chantiers',
      url:         'https://gestapp.digital-pro.live',
      pagesUrl:    'https://gestapp212-app.pages.dev',
      path:        '/gestapp212/',
    },
    famille: {
      id:          'famille',
      name:        'Family CashFlow',
      icon:        '💰',
      color:       '#22c55e',
      description: 'Gestion budget familial — Revenus, Dépenses, Épargne',
      url:         'https://famille.digital-pro.live',
      pagesUrl:    'https://famille-app.pages.dev',
      path:        '/famille/',
    },
    calcul: {
      id:          'calcul',
      name:        'CalcPeinture Pro',
      icon:        '🎨',
      color:       '#8b5cf6',
      description: 'Calcul surfaces et devis peinture professionnels',
      url:         'https://calcul.digital-pro.live',
      pagesUrl:    'https://calcul-app.pages.dev',
      path:        '/calcul/',
    },
  },

  // ── SuperAdmin Portal ─────────────────────────────────────────
  adminPortal: {
    url:      'https://admin.digital-pro.live',
    pagesUrl: 'https://platform-admin-2y4.pages.dev',
  },

  // ── Plans d'abonnement ────────────────────────────────────────
  plans: {
    starter:    { name: 'Starter',    maxUsers: 3,   price: 99,  color: '#64748b' },
    pro:        { name: 'Pro',        maxUsers: 10,  price: 299, color: '#f59e0b' },
    enterprise: { name: 'Enterprise', maxUsers: 50,  price: 999, color: '#6366f1' },
  },

  // ── Domaine principal ─────────────────────────────────────────
  domain: 'digital-pro.live',
};

if (typeof module !== 'undefined') module.exports = PLATFORM_CONFIG;
