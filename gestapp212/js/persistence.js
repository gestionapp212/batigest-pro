/* ============================================================
   GestionApp 212 — Persistance localStorage (Mode Démo)
   Sauvegarde et restaure App.data entre les rafraîchissements
   ============================================================ */

const PERSIST_KEY = 'ga_demo_data_v2';
const PERSIST_TABLES = ['clients','devis','factures','chantiers','stock','fournisseurs',
                        'garanties','reclamations','taches','agenda','pipeline','paiements'];

/** Sauvegarde toutes les données en mémoire dans localStorage */
function persistSave() {
  if (!App.isDemoMode) return; // Ne sauvegarder qu'en mode démo
  try {
    const snapshot = {};
    PERSIST_TABLES.forEach(t => {
      if (App.data[t]) snapshot[t] = App.data[t];
    });
    localStorage.setItem(PERSIST_KEY, JSON.stringify(snapshot));
  } catch(e) {
    console.warn('[Persist] Échec sauvegarde localStorage:', e.message);
  }
}

/** Restaure les données depuis localStorage dans App.data */
function persistLoad() {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return false;
    const snapshot = JSON.parse(raw);
    let hasData = false;
    PERSIST_TABLES.forEach(t => {
      if (snapshot[t] && snapshot[t].length > 0) {
        App.data[t] = snapshot[t];
        hasData = true;
      }
    });
    if (hasData) console.info('[GestionApp] Données restaurées depuis localStorage');
    return hasData;
  } catch(e) {
    console.warn('[Persist] Échec restauration localStorage:', e.message);
    return false;
  }
}

/** Efface les données persistées (utilisé lors de la déconnexion) */
function persistClear() {
  try { localStorage.removeItem(PERSIST_KEY); } catch(e) {}
}

/** Auto-sauvegarde : intercepte les mutations de App.data */
function persistSetup() {
  // Sauvegarde automatique toutes les 30 secondes si en mode démo
  setInterval(() => { if (App.isDemoMode) persistSave(); }, 30000);
}
