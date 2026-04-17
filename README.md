# 🏗️ BatiGest Pro – Application SaaS Multi-Entreprise

## Présentation
Plateforme SaaS professionnelle pour la gestion complète d'entreprises BTP, Commerce et Services. Architecture multi-tenant avec système de rôles, abonnements et modules métier avancés.

## 🌐 URL de l'Application
- **Application principale** : `/app`
- **Super Admin** : `/super-admin`

## 🔐 Comptes de Démonstration

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@btpmaroc.ma | Admin@1234 |
| Utilisateur | user@btpmaroc.ma | User@1234 |
| Super Admin | superadmin@batigest.ma | Admin@1234 |

## 📦 Modules Disponibles

### Application Principale
- **Dashboard** – KPIs, graphiques CA, chantiers, alertes
- **Chantiers** ⭐ – Suivi financier complet (entrées/sorties/budget), barre de progression dynamique, export PDF
- **Clients** – CRUD + historique devis/factures
- **Devis** – Création lignes, calcul automatique HT/TVA/TTC, conversion en facture, impression PDF
- **Factures** – Gestion statuts (payée/partielle/non payée), export PDF
- **Paiements** – Trésorerie entrées/sorties
- **Stock** – Gestion produits, alertes seuil, mouvements (entrée/sortie)
- **Fournisseurs** – CRUD + historique achats
- **Tâches** – Kanban (À faire / En cours / Terminée)
- **Agenda** – Vue calendrier mensuel
- **Rapports** – Analyses financières, performance chantiers
- **Paramètres** – Société, utilisateurs, abonnement, thème

### Interface Super Admin (`/super-admin`)
- Dashboard avec statistiques globales
- Gestion des sociétés (CRUD, suspension, activation)
- Gestion des utilisateurs
- Gestion des abonnements (renouvellement, suivi)
- Statistiques plateforme

## 💳 Plans d'Abonnement
| Plan | Prix | Utilisateurs |
|------|------|-------------|
| Basic | 50 DH/mois | 1 |
| Pro | 100 DH/mois | 4 |
| Business | 300 DH/mois | 10 |

## 🏗️ Architecture Technique
- **Backend** : Hono (Cloudflare Workers)
- **Frontend** : HTML/JS Vanilla + TailwindCSS CDN + Chart.js
- **Stockage** : localStorage (production: Cloudflare D1 ou Supabase)
- **Build** : Vite + @hono/vite-build
- **Déploiement** : Cloudflare Pages

## 🔐 Système de Rôles
- **super_admin** : Accès total plateforme (toutes sociétés)
- **admin** : Accès complet à sa société + gestion utilisateurs
- **user** : Accès limité aux modules opérationnels

## 📊 Données Multi-Tenant
- Chaque donnée liée à `company_id`
- Isolation complète entre sociétés
- Pas de fuite de données inter-sociétés

## 🚀 Démarrage Local
```bash
npm run build
pm2 start ecosystem.config.cjs
# Accéder à http://localhost:3000
```
