/* ============================================================
   GestionApp 212 — App.js
   Initialisation + Données mock de fallback
   En production: les données viennent de Supabase via core.js
   ============================================================ */

// ── INITIALISATION ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Ajouter l'animation CSS spin manquante
  const style = document.createElement('style');
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);

  // Démarrer l'application
  initApp();
});

// ── DONNÉES MOCK (utilisées seulement si Supabase non configuré) ─
// Ces données permettent de tester l'interface sans Supabase
function initMockData() {
  if (Object.keys(App.data).some(k => App.data[k]?.length > 0)) return; // Déjà des données

  // Essayer de restaurer les données sauvegardées dans localStorage
  if (typeof persistLoad === 'function' && persistLoad()) {
    console.info('[GestionApp] Mode démo — données restaurées depuis localStorage');
    return; // Données restaurées, pas besoin des données mock initiales
  }

  console.info('[GestionApp] Mode démo — données mock initiales chargées');

  App.data.clients = [
    { id:'cl1', company_id:'c1', companyId:'c1', nom:'Hassan Benali', ice:'001111222233344', telephone:'06 61 23 45 67', email:'hassan.benali@gmail.com', adresse:'25 Rue Allal Fassi', ville:'Casablanca', type:'particulier', statut:'actif', created_at:'2025-01-15' },
    { id:'cl2', company_id:'c1', companyId:'c1', nom:'Société Immobilière Atlas SARL', ice:'002222333344455', telephone:'05 22 98 76 54', email:'direction@atlas-immo.ma', ville:'Casablanca', type:'entreprise', statut:'actif', created_at:'2025-01-20' },
    { id:'cl3', company_id:'c1', companyId:'c1', nom:'Fatima Zahra Tazi', telephone:'06 72 34 56 78', email:'fatima.tazi@hotmail.com', ville:'Rabat', type:'particulier', statut:'actif', created_at:'2025-02-01' },
    { id:'cl4', company_id:'c1', companyId:'c1', nom:'Groupe Al Omrane SA', ice:'003333444455566', telephone:'05 22 45 67 89', email:'contact@alomrane.ma', ville:'Casablanca', type:'entreprise', statut:'actif', created_at:'2025-02-10' },
    { id:'cl5', company_id:'c1', companyId:'c1', nom:'Youssef Alaoui', telephone:'06 53 45 67 89', email:'youssef.alaoui@yahoo.fr', ville:'Marrakech', type:'particulier', statut:'actif', created_at:'2025-02-20' },
    { id:'cl6', company_id:'c1', companyId:'c1', nom:'Résidences Prestige SARL', ice:'004444555566677', telephone:'05 24 12 34 56', email:'info@residences-prestige.ma', ville:'Marrakech', type:'entreprise', statut:'prospect', created_at:'2025-03-01' },
  ];

  App.data.devis = [
    { id:'dv1', company_id:'c1', companyId:'c1', numero:'D-2025-0001', client_id:'cl2', clientId:'cl2', client_nom:'Société Immobilière Atlas SARL', clientNom:'Société Immobilière Atlas SARL', objet:'Construction villa 3 étages - Hay Hassani', date_devis:'2025-01-25', dateValidite:'2025-02-25', statut:'accepte', lignes:[{id:'l1',designation:'Fondations béton armé',unite:'m³',quantite:80,prixUnitaire:850,remise:0,tva:20},{id:'l2',designation:'Maçonnerie briques',unite:'m²',quantite:400,prixUnitaire:180,remise:5,tva:20},{id:'l3',designation:'Dallage béton',unite:'m²',quantite:250,prixUnitaire:120,remise:0,tva:20}], total_ht:185400, totalHT:185400, total_tva:37080, totalTVA:37080, total_ttc:222480, totalTTC:222480, notes:'Délai: 8 mois. Paiement en 3 tranches.', created_at:'2025-01-25' },
    { id:'dv2', company_id:'c1', companyId:'c1', numero:'D-2025-0002', client_id:'cl3', clientId:'cl3', client_nom:'Fatima Zahra Tazi', clientNom:'Fatima Zahra Tazi', objet:'Rénovation appartement 120m² - Hay Riad', date_devis:'2025-02-05', statut:'accepte', lignes:[{id:'l4',designation:'Carrelage sol 60x60',unite:'m²',quantite:120,prixUnitaire:95,remise:0,tva:20},{id:'l5',designation:'Peinture intérieure',unite:'m²',quantite:350,prixUnitaire:35,remise:0,tva:20},{id:'l6',designation:'Plomberie complète',unite:'forfait',quantite:1,prixUnitaire:18000,remise:0,tva:20}], total_ht:42050, totalHT:42050, total_ttc:50460, totalTTC:50460, created_at:'2025-02-05' },
    { id:'dv3', company_id:'c1', companyId:'c1', numero:'D-2025-0003', client_id:'cl4', clientId:'cl4', client_nom:'Groupe Al Omrane SA', clientNom:'Groupe Al Omrane SA', objet:'Aménagement bureau 250m² - Casablanca', date_devis:'2025-02-20', statut:'envoye', lignes:[{id:'l7',designation:'Cloisons Placo',unite:'m²',quantite:200,prixUnitaire:280,remise:10,tva:20},{id:'l8',designation:'Faux plafond',unite:'m²',quantite:250,prixUnitaire:180,remise:0,tva:20}], total_ht:95400, totalHT:95400, total_ttc:114480, totalTTC:114480, created_at:'2025-02-20' },
    { id:'dv4', company_id:'c1', companyId:'c1', numero:'D-2025-0004', client_id:'cl1', clientId:'cl1', client_nom:'Hassan Benali', clientNom:'Hassan Benali', objet:'Électricité complète maison individuelle', date_devis:'2025-03-01', statut:'brouillon', lignes:[{id:'l10',designation:'Tableau électrique 24 modules',unite:'u',quantite:1,prixUnitaire:1200,remise:0,tva:20}], total_ht:9000, totalHT:9000, total_ttc:10800, totalTTC:10800, created_at:'2025-03-01' },
  ];

  App.data.factures = [
    { id:'fc1', company_id:'c1', companyId:'c1', numero:'F-2025-0001', devis_id:'dv1', client_id:'cl2', clientId:'cl2', client_nom:'Société Immobilière Atlas SARL', clientNom:'Société Immobilière Atlas SARL', objet:'Acompte 30% - Villa 3 étages', type:'acompte', date_facture:'2025-02-01', dateEcheance:'2025-02-15', date_echeance:'2025-02-15', lignes:[{id:'fl1',designation:'Acompte 30% travaux',unite:'forfait',quantite:1,prixUnitaire:55620,tva:20}], total_ht:55620, totalHT:55620, total_ttc:66744, totalTTC:66744, statut:'paye', montant_paye:66744, montantPaye:66744, reste_a_payer:0, resteAPayer:0, paiements:[{id:'p1',montant:66744,mode:'virement',date:'2025-02-14',reference:'VIR-2025-001'}], created_at:'2025-02-01' },
    { id:'fc2', company_id:'c1', companyId:'c1', numero:'F-2025-0002', client_id:'cl3', clientId:'cl3', client_nom:'Fatima Zahra Tazi', clientNom:'Fatima Zahra Tazi', objet:'Rénovation appartement Hay Riad', type:'standard', date_facture:'2025-02-15', date_echeance:'2025-03-15', dateEcheance:'2025-03-15', lignes:[{id:'fl2',designation:'Carrelage sol',unite:'m²',quantite:120,prixUnitaire:95,tva:20}], total_ht:42050, totalHT:42050, total_ttc:50460, totalTTC:50460, statut:'partiellement_paye', montant_paye:25000, montantPaye:25000, reste_a_payer:25460, resteAPayer:25460, paiements:[{id:'p2',montant:25000,mode:'cheque',date:'2025-03-10',reference:'CHQ-1234'}], created_at:'2025-02-15' },
    { id:'fc3', company_id:'c1', companyId:'c1', numero:'F-2025-0003', client_id:'cl4', clientId:'cl4', client_nom:'Groupe Al Omrane SA', clientNom:'Groupe Al Omrane SA', objet:'Aménagement bureau phase 1', type:'standard', date_facture:'2025-03-01', date_echeance:'2025-03-31', dateEcheance:'2025-03-31', total_ht:95400, totalHT:95400, total_ttc:114480, totalTTC:114480, lignes:[], statut:'impaye', montant_paye:0, montantPaye:0, reste_a_payer:114480, resteAPayer:114480, paiements:[], created_at:'2025-03-01' },
    { id:'fc4', company_id:'c1', companyId:'c1', numero:'F-2025-0004', client_id:'cl1', clientId:'cl1', client_nom:'Hassan Benali', clientNom:'Hassan Benali', objet:'Travaux de maçonnerie', type:'standard', date_facture:'2025-03-10', date_echeance:'2025-04-10', dateEcheance:'2025-04-10', total_ht:15800, totalHT:15800, total_ttc:18960, totalTTC:18960, lignes:[], statut:'paye', montant_paye:18960, montantPaye:18960, reste_a_payer:0, resteAPayer:0, paiements:[{id:'p3',montant:18960,mode:'especes',date:'2025-04-05',reference:''}], created_at:'2025-03-10' },
    { id:'fc5', company_id:'c1', companyId:'c1', numero:'F-2025-0005', client_id:'cl5', clientId:'cl5', client_nom:'Youssef Alaoui', clientNom:'Youssef Alaoui', objet:'Rénovation salle de bain', type:'standard', date_facture:'2025-01-15', date_echeance:'2025-02-15', dateEcheance:'2025-02-15', total_ht:7300, totalHT:7300, total_ttc:8760, totalTTC:8760, lignes:[], statut:'impaye', montant_paye:0, montantPaye:0, reste_a_payer:8760, resteAPayer:8760, paiements:[], created_at:'2025-01-15' },
  ];

  App.data.chantiers = [
    { id:'ch1', company_id:'c1', companyId:'c1', nom:'Villa 3 étages - Hay Hassani', client_id:'cl2', clientId:'cl2', client_nom:'Société Immobilière Atlas SARL', clientNom:'Société Immobilière Atlas SARL', adresse:'Lot 12 Hay Hassani', ville:'Casablanca', date_debut:'2025-03-01', date_fin:'2025-11-30', statut:'en_cours', budget:222480, budget_reel:89500, budgetReel:89500, avancement:40, description:'Construction villa R+3 avec sous-sol',
      employes:[
        {id:'e1',nom:'Mohammed Rami',role:'Chef de chantier',joursTravailles:50,tauxJour:450,avance:10000,telephone:'06 61 11 22 33'},
        {id:'e2',nom:'Khalid Bensouda',role:'Maçon qualifié',joursTravailles:40,tauxJour:300,avance:5000,telephone:'06 62 33 44 55'},
      ],
      prestataires:[{id:'pr1',nom:'ElectroPro Sarl',prestations:'Électricité',montant:35000,paye:20000}],
      achats:[{id:'ac1',date:'2025-03-15',designation:'Ciment 50kg',quantite:200,prixUnitaire:65,total:13000,fournisseur:'Lafarge',typeJustificatif:'facture'}],
      journal:[{id:'j1',date:'2025-03-01',auteur:'Mohammed Rami',note:'Démarrage chantier — fondations commencées',photos:[]}],
      photos:[], created_at:'2025-03-01'
    },
    { id:'ch2', company_id:'c1', companyId:'c1', nom:'Rénovation Hay Riad - Appartement', client_id:'cl3', clientId:'cl3', client_nom:'Fatima Zahra Tazi', clientNom:'Fatima Zahra Tazi', adresse:'10 Hay Riad', ville:'Rabat', date_debut:'2025-02-15', date_fin:'2025-04-15', statut:'en_cours', budget:50460, budget_reel:28000, budgetReel:28000, avancement:65, employes:[], prestataires:[], achats:[], journal:[], photos:[], created_at:'2025-02-15' },
    { id:'ch3', company_id:'c1', companyId:'c1', nom:'Aménagement Bureau - Casablanca', client_id:'cl4', clientId:'cl4', client_nom:'Groupe Al Omrane SA', clientNom:'Groupe Al Omrane SA', adresse:'Km 5 Route Rabat', ville:'Casablanca', date_debut:'2025-04-01', date_fin:'2025-06-30', statut:'en_attente', budget:169200, budget_reel:0, budgetReel:0, avancement:0, employes:[], prestataires:[], achats:[], journal:[], photos:[], created_at:'2025-03-01' },
  ];

  App.data.stock = [
    { id:'st1', company_id:'c1', companyId:'c1', designation:'Ciment Portland 50kg', reference:'CIM-001', categorie:'Gros Œuvre', unite:'sac', quantite:45, seuil_alerte:20, seuilAlerte:20, prix_unitaire:65, prixUnitaire:65, emplacement:'Hangar A', mouvements:[], created_at:'2025-01-01' },
    { id:'st2', company_id:'c1', companyId:'c1', designation:'Carrelage 60x60 Gris', reference:'CAR-060', categorie:'Finitions', unite:'m²', quantite:8, seuil_alerte:15, seuilAlerte:15, prix_unitaire:95, prixUnitaire:95, emplacement:'Hangar B', mouvements:[], created_at:'2025-01-01' },
    { id:'st3', company_id:'c1', companyId:'c1', designation:'Fer à béton Ø12 - 12m', reference:'FER-012', categorie:'Gros Œuvre', unite:'barre', quantite:150, seuil_alerte:50, seuilAlerte:50, prix_unitaire:45, prixUnitaire:45, emplacement:'Hangar A', mouvements:[], created_at:'2025-01-01' },
    { id:'st4', company_id:'c1', companyId:'c1', designation:'Peinture murale blanche 20L', reference:'PNT-B20', categorie:'Finitions', unite:'bidon', quantite:12, seuil_alerte:5, seuilAlerte:5, prix_unitaire:280, prixUnitaire:280, emplacement:'Hangar B', mouvements:[], created_at:'2025-01-01' },
    { id:'st5', company_id:'c1', companyId:'c1', designation:'Câble électrique 2.5mm² (100m)', reference:'ELE-025', categorie:'Électricité', unite:'rouleau', quantite:3, seuil_alerte:5, seuilAlerte:5, prix_unitaire:380, prixUnitaire:380, emplacement:'Atelier', mouvements:[], created_at:'2025-01-01' },
  ];

  App.data.fournisseurs = [
    { id:'fo1', company_id:'c1', companyId:'c1', nom:'Lafarge Maroc SA', ice:'001234567890100', contact:'Omar Hajji', telephone:'05 22 11 22 33', email:'commercial@lafarge.ma', ville:'Casablanca', categorie:'Matériaux', statut:'actif', created_at:'2025-01-01' },
    { id:'fo2', company_id:'c1', companyId:'c1', nom:'ElectroPro Sarl', ice:'002345678901200', contact:'Khalid Amrani', telephone:'06 61 34 56 78', email:'khalid@electropro.ma', ville:'Rabat', categorie:'Électricité', statut:'actif', created_at:'2025-01-01' },
    { id:'fo3', company_id:'c1', companyId:'c1', nom:'CarrelageStyle Maroc', ice:'003456789012300', contact:'Fatima Belkadi', telephone:'05 24 56 78 90', email:'info@carrelagestyle.ma', ville:'Marrakech', categorie:'Finitions', statut:'actif', created_at:'2025-02-01' },
  ];

  App.data.garanties = [
    { id:'ga1', company_id:'c1', companyId:'c1', chantier_id:'ch1', chantier_nom:'Villa 3 étages', chantierId:'ch1', chantierNom:'Villa 3 étages', client_nom:'Société Atlas SARL', clientNom:'Société Atlas SARL', type:'decennale', date_debut:'2025-11-01', date_fin:'2035-11-01', dateDebut:'2025-11-01', dateFin:'2035-11-01', description:'Garantie décennale construction', created_at:'2025-11-01' },
    { id:'ga2', company_id:'c1', companyId:'c1', chantier_id:'ch2', chantier_nom:'Rénovation Hay Riad', chantierId:'ch2', chantierNom:'Rénovation Hay Riad', client_nom:'Fatima Zahra Tazi', clientNom:'Fatima Zahra Tazi', type:'biennale', date_debut:'2025-04-15', date_fin:'2027-04-15', dateDebut:'2025-04-15', dateFin:'2027-04-15', description:'Garantie biennale carrelage et peinture', created_at:'2025-04-15' },
  ];

  App.data.reclamations = [
    { id:'rec1', company_id:'c1', companyId:'c1', client_id:'cl2', clientId:'cl2', client_nom:'Société Atlas SARL', clientNom:'Société Atlas SARL', chantier_id:'ch1', chantier_nom:'Villa 3 étages', chantierId:'ch1', chantierNom:'Villa 3 étages', description:'Fissures sur mur porteur côté nord', priorite:'haute', statut:'ouvert', solution:'', date:today(), created_at:today() },
    { id:'rec2', company_id:'c1', companyId:'c1', client_id:'cl3', clientId:'cl3', client_nom:'Fatima Zahra Tazi', clientNom:'Fatima Zahra Tazi', chantier_id:'ch2', chantier_nom:'Rénovation Hay Riad', chantierId:'ch2', chantierNom:'Rénovation Hay Riad', description:'Carrelage décollé dans la cuisine', priorite:'moyenne', statut:'en_cours', solution:'En attente de l\'artisan carreleur', date:today(), created_at:today() },
  ];

  App.data.taches = [
    { id:'ta1', company_id:'c1', companyId:'c1', titre:'Relancer client Al Omrane pour facture FC-003', description:'Facture impayée depuis 30 jours', desc:'Facture impayée depuis 30 jours', statut:'todo', priorite:'haute', module:'facture', assigne:'Fatima Zahra', assignee:'Fatima Zahra', echeance:'2025-04-05', due_date:'2025-04-05', created_at:'2025-03-25' },
    { id:'ta2', company_id:'c1', companyId:'c1', titre:'Commander ciment pour chantier Hay Hassani', description:'Stock ciment faible', desc:'Stock ciment faible', statut:'en-cours', priorite:'haute', module:'chantier', assigne:'Mohammed Rami', assignee:'Mohammed Rami', echeance:'2025-04-02', due_date:'2025-04-02', created_at:'2025-03-28' },
    { id:'ta3', company_id:'c1', companyId:'c1', titre:'Préparer devis rénovation villa Marrakech', description:'Client Youssef Alaoui', desc:'Client Youssef Alaoui', statut:'todo', priorite:'moyenne', module:'devis', assigne:'Hassan Alami', assignee:'Hassan Alami', echeance:'2025-04-10', due_date:'2025-04-10', created_at:'2025-03-30' },
    { id:'ta4', company_id:'c1', companyId:'c1', titre:'Envoyer rapport mensuel Mars 2025', description:'Rapport chantiers + financier', desc:'Rapport chantiers + financier', statut:'done', priorite:'moyenne', module:'autre', assigne:'Hassan Alami', assignee:'Hassan Alami', echeance:'2025-04-01', due_date:'2025-04-01', created_at:'2025-03-15' },
  ];

  const d0 = today();
  const d1 = new Date(Date.now()+86400000).toISOString().split('T')[0];
  const d2 = new Date(Date.now()+172800000).toISOString().split('T')[0];
  App.data.agenda = [
    { id:'ag1', company_id:'c1', companyId:'c1', titre:'Réunion chantier Villa Hay Hassani', title:'Réunion chantier Villa Hay Hassani', type:'chantier', date:d0, heure:'09:00', description:'Visite de chantier', color:'#27ae60', couleur:'#27ae60', custom:true, created_at:d0 },
    { id:'ag2', company_id:'c1', companyId:'c1', titre:'RDV client Groupe Al Omrane', title:'RDV client Groupe Al Omrane', type:'rdv', date:d1, heure:'14:30', description:'Réunion bureau', color:'#2980b9', couleur:'#2980b9', custom:true, created_at:d1 },
    { id:'ag3', company_id:'c1', companyId:'c1', titre:'Relance facture F-2025-0003', title:'Relance facture F-2025-0003', type:'echeance', date:d2, heure:'10:00', description:'Relance impayé Al Omrane', color:'#e74c3c', couleur:'#e74c3c', custom:true, created_at:d2 },
  ];

  App.data.pipeline = [
    { id:'pi1', company_id:'c1', companyId:'c1', nom:'Construction villa Marrakech', client_id:'cl5', clientId:'cl5', client_nom:'Youssef Alaoui', clientNom:'Youssef Alaoui', montant:380000, etape:'proposition', probabilite:60, date_cloture:'2025-06-01', source:'Bouche à oreille', created_at:'2025-03-01' },
    { id:'pi2', company_id:'c1', companyId:'c1', nom:'Rénovation immeuble 6 étages', client_id:'cl6', clientId:'cl6', client_nom:'Résidences Prestige SARL', clientNom:'Résidences Prestige SARL', montant:1200000, etape:'negociation', probabilite:75, date_cloture:'2025-05-15', source:'Appel d\'offre', created_at:'2025-03-10' },
    { id:'pi3', company_id:'c1', companyId:'c1', nom:'Aménagement résidence privée', client_id:'cl1', clientId:'cl1', client_nom:'Hassan Benali', clientNom:'Hassan Benali', montant:95000, etape:'gagne', probabilite:100, date_cloture:'2025-04-01', source:'Client existant', created_at:'2025-02-15' },
    { id:'pi4', company_id:'c1', companyId:'c1', nom:'Étude technique parking souterrain', client_id:'cl4', clientId:'cl4', client_nom:'Groupe Al Omrane SA', clientNom:'Groupe Al Omrane SA', montant:45000, etape:'contact', probabilite:25, date_cloture:'2025-07-01', source:'Démarchage', created_at:'2025-03-20' },
  ];

  App.data.paiements = [
    { id:'pa1', company_id:'c1', companyId:'c1', facture_id:'fc1', client_id:'cl2', client_nom:'Société Atlas SARL', montant:66744, mode:'virement', date_paie:'2025-02-14', reference:'VIR-2025-001', created_at:'2025-02-14' },
    { id:'pa2', company_id:'c1', companyId:'c1', facture_id:'fc2', client_id:'cl3', client_nom:'Fatima Zahra Tazi', montant:25000, mode:'cheque', date_paie:'2025-03-10', reference:'CHQ-1234', created_at:'2025-03-10' },
    { id:'pa3', company_id:'c1', companyId:'c1', facture_id:'fc4', client_id:'cl1', client_nom:'Hassan Benali', montant:18960, mode:'especes', date_paie:'2025-04-05', reference:'', created_at:'2025-04-05' },
  ];

  // Companies pour la modale superadmin
  if (!App.data.companies || App.data.companies.length === 0) {
    App.data.companies = [
      { id:'c1', name:'BTP Maroc Construction', ice:'001234567890123', rc:'RC12345', adresse:'12 Rue Hassan II', ville:'Casablanca', telephone:'05 22 34 56 78', email:'contact@btpmaroc.ma', plan:'Pro', statut:'actif', abonnement_debut:'2025-01-01', abonnement_fin:'2026-12-31', created_at:'2025-01-01' },
      { id:'c2', name:'Renova Maroc SARL', ice:'002345678901234', adresse:'5 Bd Mohammed V', ville:'Rabat', telephone:'05 37 12 34 56', email:'info@renovamaroc.ma', plan:'Starter', statut:'actif', abonnement_debut:'2025-03-01', abonnement_fin:'2026-03-01', created_at:'2025-03-01' },
    ];
  }
}
