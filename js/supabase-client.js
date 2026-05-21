// ============================================================
//  Initialisation du client Supabase
// ============================================================

(function () {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.FCF_CONFIG;

  if (!SUPABASE_URL || SUPABASE_URL.includes('VOTRE_PROJET')) {
    console.warn('[FCF] ⚠️  Clés Supabase non configurées dans js/config.js');
  }

  window.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();
