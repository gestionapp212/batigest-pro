// =====================================================
// Family Cash Flow — Landing Page
// =====================================================

function renderLandingPage() {
  const app = el('app');
  if (!app) return;

  app.innerHTML = `
  <div class="landing-page fade-in">

    <!-- Header -->
    <header style="position:sticky;top:0;z-index:50;background:rgba(255,255,255,0.95);backdrop-filter:blur(10px);border-bottom:1px solid var(--border);padding:0 24px;">
      <div style="max-width:1100px;margin:0 auto;height:64px;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;background:linear-gradient(135deg,var(--primary),var(--secondary));border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:white;">💰</div>
          <div>
            <div style="font-size:15px;font-weight:800;color:var(--text);">Family Cash Flow</div>
            <div style="font-size:10px;color:var(--text-muted);font-weight:500;">Gestion financière familiale</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <button class="btn btn-ghost btn-sm" onclick="renderAuthPage('login')">
            <i class="fas fa-sign-in-alt"></i> Connexion
          </button>
          <button class="btn btn-primary btn-sm" onclick="renderAuthPage('signup')">
            <i class="fas fa-rocket"></i> Commencer
          </button>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <div class="landing-hero" style="position:relative;">
      <div style="max-width:800px;margin:0 auto;position:relative;z-index:1;">
        <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.15);
                    border:1px solid rgba(255,255,255,0.25);border-radius:100px;padding:6px 16px;margin-bottom:24px;font-size:13px;">
          <span>✨</span>
          <span>Gérez les finances de votre famille simplement</span>
        </div>

        <h1 style="font-size:clamp(2rem,5vw,3.5rem);font-weight:800;color:white;margin-bottom:20px;line-height:1.15;">
          Prenez le contrôle de vos
          <span style="background:linear-gradient(90deg,#FCD34D,#F59E0B);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
            finances familiales
          </span>
        </h1>

        <p style="font-size:1.1rem;color:rgba(255,255,255,0.85);max-width:560px;margin:0 auto 36px;line-height:1.7;">
          Suivez vos revenus, dépenses, budgets et crédits. Recevez des alertes intelligentes. Partagez avec toute votre famille.
        </p>

        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
          <button class="btn" style="background:white;color:var(--primary);font-size:15px;padding:12px 28px;box-shadow:0 4px 12px rgba(0,0,0,0.2);" onclick="demoLogin()">
            <i class="fas fa-play-circle"></i> Voir la démo gratuite
          </button>
          <button class="btn" style="background:rgba(255,255,255,0.15);color:white;border:1px solid rgba(255,255,255,0.3);font-size:15px;padding:12px 28px;" onclick="renderAuthPage('signup')">
            <i class="fas fa-user-plus"></i> Créer mon espace
          </button>
        </div>
      </div>
    </div>

    <!-- Features Grid -->
    <div style="background:var(--bg);padding:80px 24px;">
      <div style="max-width:1100px;margin:0 auto;">
        <div style="text-align:center;margin-bottom:48px;">
          <h2 style="font-size:clamp(1.5rem,3vw,2.25rem);font-weight:800;color:var(--text);margin-bottom:12px;">
            Tout ce dont votre famille a besoin
          </h2>
          <p style="font-size:1rem;color:var(--text-muted);max-width:500px;margin:0 auto;">
            Une application complète pour une gestion financière intelligente
          </p>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;">
          ${[
            { icon:'📊', title:'Tableau de bord', desc:'Vue complète de vos finances avec graphiques interactifs, KPIs et alertes intelligentes', color:'#2563EB' },
            { icon:'💰', title:'Revenus & Dépenses', desc:'Catégorisez, filtrez et analysez toutes vos transactions avec export CSV', color:'#10B981' },
            { icon:'📱', title:'Abonnements récurrents', desc:'Suivez tous vos abonnements et recevez des alertes avant les renouvellements', color:'#F59E0B' },
            { icon:'🏦', title:'Crédits & Dettes', desc:'Visualisez l\'avancement de vos remboursements avec barres de progression', color:'#EF4444' },
            { icon:'🎯', title:'Budgets par catégorie', desc:'Définissez des plafonds et recevez des alertes en cas de dépassement', color:'#8B5CF6' },
            { icon:'👨‍👩‍👧‍👦', title:'Espace Famille', desc:'Partagez l\'accès avec vos proches avec des rôles et permissions personnalisés', color:'#06B6D4' },
          ].map(f => `
          <div class="card" style="transition:all 0.2s ease;" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='var(--shadow-md)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
            <div style="width:52px;height:52px;border-radius:var(--radius-lg);background:${f.color}18;
                        display:flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:14px;">
              ${f.icon}
            </div>
            <h3 style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:8px;">${f.title}</h3>
            <p style="font-size:13px;color:var(--text-muted);line-height:1.6;">${f.desc}</p>
          </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- CTA -->
    <div style="background:linear-gradient(135deg,var(--primary),var(--secondary));padding:80px 24px;text-align:center;">
      <h2 style="font-size:2rem;font-weight:800;color:white;margin-bottom:16px;">
        Prêt à gérer vos finances ?
      </h2>
      <p style="color:rgba(255,255,255,0.85);margin-bottom:32px;font-size:1rem;">
        Commencez gratuitement, aucune carte bancaire requise
      </p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
        <button class="btn" style="background:white;color:var(--primary);font-size:15px;padding:12px 32px;" onclick="demoLogin()">
          <i class="fas fa-play"></i> Essayer la démo
        </button>
        <button class="btn" style="background:rgba(255,255,255,0.15);color:white;border:1px solid rgba(255,255,255,0.3);font-size:15px;padding:12px 32px;" onclick="renderAuthPage('signup')">
          <i class="fas fa-user-plus"></i> Créer un compte
        </button>
      </div>
    </div>

    <!-- Footer -->
    <footer style="background:var(--bg-card);border-top:1px solid var(--border);padding:24px;text-align:center;">
      <div style="font-size:13px;color:var(--text-muted);">
        © 2025 Family Cash Flow · famille.chan-pro.com · Tous droits réservés
      </div>
    </footer>
  </div>`;
}
