// ============================================================
//  Onboarding — Création de la famille initiale
// ============================================================

const Onboarding = {
  render() {
    document.getElementById('app').innerHTML = `
    <div class="auth-page">
      <div class="auth-card auth-card--wide">
        <div class="auth-logo">
          <div class="brand-icon" style="background:linear-gradient(135deg,#10b981,#3b82f6)">
            <i data-lucide="users" style="width:22px;height:22px;color:white"></i>
          </div>
          <div>
            <div class="auth-title">Bienvenue !</div>
            <div class="auth-domain">Créez votre espace famille</div>
          </div>
        </div>

        <div class="onboarding-steps">
          <div class="step-pill step-pill--active">1. Famille</div>
          <div class="step-pill">2. Plan</div>
          <div class="step-pill">3. Prêt !</div>
        </div>

        <div id="onb-alert" class="alert hidden"></div>

        <form id="onb-form" class="auth-form">
          <div class="form-group">
            <label class="form-label">Nom de votre famille *</label>
            <input type="text" id="onb-family" class="form-input" placeholder="Ex: Famille Alaoui" required />
          </div>
          <div class="form-group">
            <label class="form-label">Description (optionnel)</label>
            <input type="text" id="onb-desc" class="form-input" placeholder="Notre espace de gestion financière" />
          </div>

          <div class="plan-cards">
            <label class="plan-card plan-card--selected" id="plan-free">
              <input type="radio" name="plan" value="free" checked />
              <div class="plan-card__name">🆓 Gratuit</div>
              <div class="plan-card__price">0 DH/mois</div>
              <div class="plan-card__features">
                <div>✓ 2 membres</div>
                <div>✓ Transactions illimitées</div>
                <div>✓ Rapports basiques</div>
              </div>
            </label>
            <label class="plan-card" id="plan-standard">
              <input type="radio" name="plan" value="standard" />
              <div class="plan-card__name">⭐ Standard</div>
              <div class="plan-card__price">49 DH/mois</div>
              <div class="plan-card__features">
                <div>✓ 5 membres</div>
                <div>✓ Budgets avancés</div>
                <div>✓ Export CSV</div>
              </div>
            </label>
            <label class="plan-card" id="plan-premium">
              <input type="radio" name="plan" value="premium" />
              <div class="plan-card__name">💎 Premium</div>
              <div class="plan-card__price">99 DH/mois</div>
              <div class="plan-card__features">
                <div>✓ Membres illimités</div>
                <div>✓ Rapports complets</div>
                <div>✓ Support prioritaire</div>
              </div>
            </label>
          </div>

          <button type="submit" class="btn btn--primary btn--full" id="onb-btn">
            Créer mon espace famille →
          </button>
        </form>

        <div class="auth-footer">
          <button onclick="Auth.logout()" class="link link--muted">Me déconnecter</button>
        </div>
      </div>
    </div>`;

    if (window.lucide) lucide.createIcons();

    // Gestion sélection plan
    document.querySelectorAll('.plan-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('plan-card--selected'));
        card.classList.add('plan-card--selected');
      });
    });

    document.getElementById('onb-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('onb-btn');
      btn.disabled = true;
      btn.textContent = 'Création en cours...';

      const familyName = document.getElementById('onb-family').value.trim();
      const description = document.getElementById('onb-desc').value.trim();
      const plan = document.querySelector('input[name="plan"]:checked')?.value || 'free';

      try {
        const user = Auth.currentUser;
        if (!user) throw new Error('Utilisateur non connecté');

        // Créer la famille
        const { data: family, error: fErr } = await db
          .from('families')
          .insert({ name: familyName, description, created_by: user.id })
          .select()
          .single();
        if (fErr) throw fErr;

        // Ajouter l'utilisateur comme admin
        const { error: mErr } = await db
          .from('family_members')
          .insert({ family_id: family.id, user_id: user.id, role: 'admin' });
        if (mErr) throw mErr;

        // Créer le profil s'il n'existe pas
        await db.from('profiles').upsert({
          id: user.id,
          full_name: user.user_metadata?.full_name || '',
          email: user.email,
        });

        // Trouver le plan dans la DB
        const { data: planData } = await db
          .from('plans')
          .select('id')
          .eq('slug', plan)
          .single();

        // Créer l'abonnement
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);
        await db.from('subscriptions').insert({
          family_id: family.id,
          plan_id: planData?.id || null,
          status: plan === 'free' ? 'active' : 'trial',
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
        });

        await Auth.loadFamily();
        Utils.toast(`Famille "${familyName}" créée avec succès ! 🎉`, 'success');
        Router.navigate('/dashboard');
      } catch (err) {
        const alert = document.getElementById('onb-alert');
        alert.textContent = '❌ ' + (err.message || 'Erreur lors de la création');
        alert.classList.remove('hidden');
        alert.classList.add('alert--error');
        btn.disabled = false;
        btn.textContent = 'Créer mon espace famille →';
      }
    });
  },
};

window.Onboarding = Onboarding;
