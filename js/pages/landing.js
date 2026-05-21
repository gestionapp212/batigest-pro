// ============================================================
//  Page d'accueil publique
// ============================================================

const Landing = {
  render() {
    document.getElementById('app').innerHTML = `
    <div class="landing">
      <!-- Navbar -->
      <nav class="landing-nav">
        <div class="landing-nav__brand">
          <div class="brand-icon brand-icon--sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
          </div>
          <div>
            <div class="landing-nav__name">Family Cash Flow</div>
            <div class="landing-nav__domain">famille.chan-pro.com</div>
          </div>
        </div>
        <div class="landing-nav__actions">
          <button class="btn btn--ghost btn--sm" onclick="Components.toggleTheme()">
            <i data-lucide="sun" class="icon-sun"></i>
            <i data-lucide="moon" class="icon-moon"></i>
          </button>
          <a data-href="/login" class="btn btn--ghost btn--sm">Se connecter</a>
          <a data-href="/signup" class="btn btn--primary btn--sm">Commencer gratuitement</a>
        </div>
        <button class="landing-nav__mobile-btn" onclick="document.getElementById('mobile-menu').classList.toggle('hidden')">
          <i data-lucide="menu"></i>
        </button>
      </nav>

      <!-- Menu mobile -->
      <div id="mobile-menu" class="mobile-menu hidden">
        <a data-href="/login" class="mobile-menu__link">Se connecter</a>
        <a data-href="/signup" class="mobile-menu__link mobile-menu__link--primary">Créer un compte</a>
      </div>

      <!-- Hero -->
      <section class="hero">
        <div class="hero__content">
          <div class="hero__badge">🇲🇦 Conçu pour les familles marocaines</div>
          <h1 class="hero__title">
            Gérez les finances<br/>de votre famille<br/>
            <span class="hero__title-accent">en toute simplicité</span>
          </h1>
          <p class="hero__desc">
            Suivez vos revenus, dépenses, budgets, crédits et abonnements.
            Partagez l'accès avec toute votre famille. Prenez les meilleures décisions financières.
          </p>
          <div class="hero__actions">
            <a data-href="/signup" class="btn btn--primary btn--lg">
              🚀 Commencer gratuitement
            </a>
            <a data-href="/login" class="btn btn--outline btn--lg">
              Se connecter →
            </a>
          </div>
          <p class="hero__trust">✓ Gratuit pour 2 membres &nbsp;·&nbsp; ✓ Sécurisé &nbsp;·&nbsp; ✓ Données privées</p>
        </div>
        <div class="hero__visual">
          <div class="dashboard-preview">
            <div class="dp-header">
              <div class="dp-dot dp-dot--red"></div>
              <div class="dp-dot dp-dot--yellow"></div>
              <div class="dp-dot dp-dot--green"></div>
              <span style="font-size:.75rem;color:#9ca3af;margin-left:.5rem">Family Cash Flow</span>
            </div>
            <div class="dp-stats">
              <div class="dp-stat dp-stat--green">
                <div class="dp-stat__icon">📈</div>
                <div class="dp-stat__val">+12,500 DH</div>
                <div class="dp-stat__lbl">Revenus</div>
              </div>
              <div class="dp-stat dp-stat--red">
                <div class="dp-stat__icon">📉</div>
                <div class="dp-stat__val">-8,200 DH</div>
                <div class="dp-stat__lbl">Dépenses</div>
              </div>
              <div class="dp-stat dp-stat--blue">
                <div class="dp-stat__icon">💰</div>
                <div class="dp-stat__val">+4,300 DH</div>
                <div class="dp-stat__lbl">Épargne</div>
              </div>
            </div>
            <div class="dp-chart">
              ${[60,80,50,90,70,95].map((h,i) => `
                <div class="dp-bar" style="height:${h}%"></div>`).join('')}
            </div>
            <div class="dp-footer">
              <span class="badge badge--green">✅ Budget respecté</span>
              <span class="text-muted" style="font-size:.75rem">Avril 2026</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Features -->
      <section class="features" id="features">
        <div class="section-header">
          <h2 class="section-title">Tout ce dont votre famille a besoin</h2>
          <p class="section-sub">Une plateforme complète pour gérer vos finances avec toute la famille</p>
        </div>
        <div class="features-grid">
          ${[
            { icon:'trending-up',  color:'#10b981', title:'Suivi des revenus',    desc:'Enregistrez tous vos revenus avec catégories (salaire, commerce, freelance...)' },
            { icon:'trending-down',color:'#ef4444', title:'Gestion des dépenses', desc:'Catégorisez et analysez vos dépenses par type et par membre' },
            { icon:'target',       color:'#6366f1', title:'Budgets mensuels',     desc:'Définissez des budgets par catégorie et recevez des alertes en temps réel' },
            { icon:'calendar',     color:'#8b5cf6', title:'Abonnements récurrents',desc:'Gérez Netflix, loyer, électricité et tous vos paiements récurrents' },
            { icon:'credit-card',  color:'#f59e0b', title:'Crédits & Prêts',      desc:'Suivez vos remboursements et visualisez la progression de vos crédits' },
            { icon:'bar-chart-2',  color:'#14b8a6', title:'Rapports détaillés',   desc:'Analyses graphiques mensuelles et annuelles avec export CSV' },
            { icon:'users',        color:'#3b82f6', title:'Multi-utilisateurs',   desc:'Invitez les membres de votre famille avec des rôles personnalisés' },
            { icon:'shield',       color:'#ec4899', title:'Sécurisé',             desc:'Données isolées par famille avec Row Level Security Supabase' },
          ].map(f => `
            <div class="feature-card">
              <div class="feature-card__icon" style="background:${f.color}15;color:${f.color}">
                <i data-lucide="${f.icon}"></i>
              </div>
              <h3 class="feature-card__title">${f.title}</h3>
              <p class="feature-card__desc">${f.desc}</p>
            </div>`).join('')}
        </div>
      </section>

      <!-- Pricing -->
      <section class="pricing" id="pricing">
        <div class="section-header">
          <h2 class="section-title">Plans tarifaires</h2>
          <p class="section-sub">Paiement par virement bancaire · Validation manuelle sous 24h</p>
        </div>
        <div class="pricing-grid">
          ${[
            { name:'Gratuit', price:'0', period:'toujours', badge:'', color:'#6b7280',
              features:['2 membres maximum','Transactions illimitées','Tableau de bord basique','Support par email'],
              cta:'Commencer gratuitement', primary: false },
            { name:'Standard', price:'49', period:'mois', badge:'Populaire', color:'#6366f1',
              features:['5 membres','Budgets avancés','Rapports mensuels','Export CSV','Abonnements récurrents'],
              cta:'Choisir Standard', primary: true },
            { name:'Premium', price:'99', period:'mois', badge:'', color:'#8b5cf6',
              features:['Membres illimités','Crédits & prêts','Rapports annuels PDF','Support prioritaire','Accès back-office'],
              cta:'Choisir Premium', primary: false },
          ].map(p => `
            <div class="price-card ${p.primary ? 'price-card--featured' : ''}">
              ${p.badge ? `<div class="price-card__badge">${p.badge}</div>` : ''}
              <div class="price-card__name" style="color:${p.color}">${p.name}</div>
              <div class="price-card__price"><span class="price-card__amount">${p.price}</span> DH<span class="text-muted">/${p.period}</span></div>
              <ul class="price-card__features">
                ${p.features.map(f => `<li>✓ ${f}</li>`).join('')}
              </ul>
              <a data-href="/signup" class="btn ${p.primary ? 'btn--primary' : 'btn--outline'} btn--full">${p.cta}</a>
            </div>`).join('')}
        </div>
        <div class="pricing-note">
          <i data-lucide="info" style="width:16px;height:16px"></i>
          Paiement par virement bancaire uniquement · RIB disponible après inscription · Activation sous 24-48h
        </div>
      </section>

      <!-- Footer -->
      <footer class="landing-footer">
        <div class="footer-brand">
          <div class="brand-icon brand-icon--sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
          </div>
          <span class="fw-bold">Family Cash Flow</span>
        </div>
        <p class="text-muted" style="font-size:.875rem">Gestion financière familiale · famille.chan-pro.com</p>
        <p class="text-muted" style="font-size:.75rem">© 2026 chan-pro.com — Tous droits réservés</p>
      </footer>
    </div>`;

    if (window.lucide) lucide.createIcons();
  },
};
window.Landing = Landing;
