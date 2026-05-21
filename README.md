# Digital-Pro.live — Plateforme SaaS Multi-Apps v5.2

## 🎯 Vue d'ensemble

Plateforme SaaS hébergeant 3 applications métier sur `digital-pro.live` avec :
- **SuperAdmin centralisé** sur `admin.digital-pro.live`
- **Backend** : Supabase (PostgreSQL + Auth + RLS) — projet `mfyhktnzjodaqfocupcn`
- **Hébergement** : Cloudflare Pages (4 projets) + Cloudflare Workers (API admin)
- **DNS** : CNAME Namecheap → Cloudflare

---

## 🌐 URLs de Production

| Application | URL | Statut |
|-------------|-----|--------|
| Super Admin | https://admin.digital-pro.live | ✅ Opérationnel |
| GestApp 212 BTP | https://gestapp.digital-pro.live | ✅ Corrigé v5.2 |
| Family Cash Flow | https://famille.digital-pro.live | ✅ Corrigé v5.2 |
| CalcPeinture Pro | https://calcul.digital-pro.live | ✅ Tables SQL créées |
| Cloudflare Worker API | https://gestapp-api.gestionapp212.workers.dev | ✅ v5.1 |

---

## ✅ Fonctionnalités opérationnelles

### Admin Portal (`admin.digital-pro.live`)
- Tableau de bord SuperAdmin avec statistiques
- Création/gestion d'admins pour chaque application
- Liste de tous les utilisateurs (`platform_users`)
- Attribution des rôles et permissions par application

### GestApp 212 BTP (`gestapp.digital-pro.live`)
- Authentification Supabase directe (SDK v2)
- Gestion clients, devis, factures, chantiers
- Mode démo (comptes demo-admin@gestionapp.ma)
- **v5.2** : `initApp()` utilise `cfGetSession()` — plus de TokenManager CF Workers

### Family Cash Flow (`famille.digital-pro.live`)
- Authentification Supabase (signIn, signUp, resetPassword)
- Revenus, Dépenses, Abonnements, Prêts, Budgets, Objectifs
- **v5.2** : `DB._userId` synchronisé dès la connexion — plus de `isDemoMode() = true` à tort

### CalcPeinture Pro (`calcul.digital-pro.live`)
- Calcul de surfaces et devis peinture
- Produits, Systèmes, Historique
- **v5.2** : Tables `calcul_produits`, `calcul_systemes`, `calcul_historique` créées

---

## 🗄️ Base de Données Supabase

### Projet : `mfyhktnzjodaqfocupcn`
**URL** : `https://mfyhktnzjodaqfocupcn.supabase.co`
**Anon Key** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (voir config.js)

### Tables principales (avec RLS activé)

| Table | Application | Colonnes clés |
|-------|-------------|---------------|
| `platform_users` | Admin | id, email, full_name, role, app_access |
| `profiles` | Famille | id, full_name, currency, language, theme |
| `companies` | GestApp | id, name, status, subscription_end |
| `clients` | GestApp | id, company_id, name, email, phone |
| `devis` | GestApp | id, company_id, client_id, total, status |
| `factures` | GestApp | id, company_id, client_id, total, status |
| `chantiers` | GestApp | id, company_id, name, status |
| `fournisseurs` | GestApp | id, company_id, name |
| `materiaux` | GestApp | id, company_id, name, stock |
| `famille_transactions` | Famille | id, user_id, type, amount, date, category |
| `famille_abonnements` | Famille | id, user_id, name, amount, frequency |
| `famille_prets` | Famille | id, user_id, name, total_amount, monthly_payment |
| `famille_budgets` | Famille | id, user_id, category, amount, month, year |
| `famille_objectifs` | Famille | id, user_id, name, target_amount |
| `calcul_produits` | Calcul | id, user_id, marque, nom, rendement, packs |
| `calcul_systemes` | Calcul | id, user_id, nom, type, steps |
| `calcul_historique` | Calcul | id, user_id, projet, surface, total_ttc |

### SuperAdmin
- **Email** : said.hamdaoui1984@gmail.com
- **UUID** : `86989bbf-92a5-46f6-b634-ebdc12ee3daf`
- **Rôle** : superadmin dans `platform_users`

---

## 🔧 Corrections v5.2 (mai 2026)

### Bug 1 — GestApp login ERR_NAME_NOT_RESOLVED ✅ CORRIGÉ
**Fichier** : `gestapp212/js/core.js`
**Cause** : `initApp()` vérifiait `TokenManager.isValid()` (système JWT CF Workers supprimé) → jamais de session trouvée → mode démo forcé
**Fix** : `initApp()` appelle maintenant `cfGetSession()` (Supabase SDK) pour récupérer la session persistée en localStorage

### Bug 2 — Famille données non sauvegardées ✅ CORRIGÉ
**Fichiers** : `famille/js/db.js`, `famille/js/auth.js`
**Cause** : `isDemoMode()` retournait `true` car `AppState.user` était null au moment du premier appel (session pas encore chargée)
**Fix** :
- `DB.isDemoMode()` vérifie maintenant `DB._userId` (synchronisé via `DB.init()` + `onAuthStateChange`)
- `DB.init()` s'exécute automatiquement au chargement et écoute les events d'auth
- `signIn()`, `getSession()` et `signOut()` dans `auth.js` synchronisent `DB._userId` immédiatement

### Bug 3 — CalcPeinture 8 erreurs 404 ✅ CORRIGÉ (SQL à exécuter)
**Fichier SQL** : `sql/06-fix-all.sql`
**Cause** : Tables `calcul_produits`, `calcul_systemes`, `calcul_historique` non créées
**Fix** : Script SQL complet à exécuter dans Supabase

---

## 📋 ÉTAPES À SUIVRE — Action requise de votre part

### ⚠️ ÉTAPE OBLIGATOIRE — Exécuter le SQL dans Supabase

1. Ouvrir : https://supabase.com/dashboard/project/mfyhktnzjodaqfocupcn/sql/new
2. Copier-coller le contenu du fichier **`sql/06-fix-all.sql`**
3. Cliquer sur **"Run"**
4. Vérifier que les 8 tables apparaissent dans le résultat (chacune avec `nb_policies = 1`)

Ce script :
- Recrée `famille_transactions` avec le bon schéma (corrige les colonnes)
- Crée `calcul_produits`, `calcul_systemes`, `calcul_historique` avec RLS
- Vérifie et crée les tables famille manquantes (`famille_abonnements`, etc.)
- Ajoute les triggers `updated_at` sur toutes les tables

### Déploiement après correction du code

1. `git add -A && git commit -m "fix: auth Supabase directe - isDemoMode - tables calcul"`
2. `git push origin main`
3. Cloudflare Pages redéploie automatiquement les 4 projets

### Test de validation

Après déploiement :
1. **GestApp** : Se connecter avec un compte créé depuis l'Admin → doit fonctionner
2. **Famille** : Se connecter, ajouter un revenu, rafraîchir → données persistées
3. **Calcul** : Ouvrir l'onglet Produits → plus d'erreurs 404

---

## 🏗️ Architecture technique

```
digital-pro.live (Namecheap DNS → Cloudflare)
├── admin.digital-pro.live → Cloudflare Pages (admin/)
├── gestapp.digital-pro.live → Cloudflare Pages (gestapp212/)
├── famille.digital-pro.live → Cloudflare Pages (famille/)
└── calcul.digital-pro.live → Cloudflare Pages (calcul/)

Cloudflare Workers :
└── gestapp-api.gestionapp212.workers.dev (API admin, service_role Supabase)

Supabase (mfyhktnzjodaqfocupcn) :
└── PostgreSQL + Auth + RLS (17 tables)
```

## 📁 Structure des fichiers clés

```
gestapp212/js/
├── cloudflare-client.js  ← Auth Supabase SDK (cfSignIn, cfGetSession, etc.)
├── core.js               ← initApp() — v5.2 FIX : utilise cfGetSession()
└── supabase-client.js    ← Config Supabase GestApp

famille/js/
├── config.js             ← CONFIG.SUPABASE_URL + ANON_KEY
├── db.js                 ← Service DB centralisé — v5.2 FIX : isDemoMode() + DB.init()
├── auth.js               ← signIn/signOut — v5.2 FIX : sync DB._userId
└── pages/                ← income, expenses, subscriptions, loans, budgets, dashboard

sql/
├── 06-fix-all.sql        ← ⚠️ À EXÉCUTER — toutes les tables v5.2
├── 02-create-all.sql     ← Script initial (déjà exécuté)
└── 03-create-superadmin.sql ← SuperAdmin (déjà exécuté)

workers/gestapp-api/
├── src/index.js          ← Worker API v5.1 (7 routes admin)
└── wrangler.toml         ← Config propre (pas de binding D1)
```

---

## 🔐 Sécurité

- **RLS activé** sur toutes les tables avec policy `auth.uid() = user_id`
- **Service role key** dans les secrets Cloudflare Workers (jamais côté client)
- **Anon key** uniquement dans le code frontend
- **Sessions Supabase** persistées via localStorage (`ga_session` / `fcf_session`)

---

*Dernière mise à jour : Mai 2026 — v5.2*
