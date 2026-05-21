/**
 * DIGITAL-PRO — Fonction Netlify : admin-create-user v3.1
 *
 * CORRECTIONS v3.1 :
 *  - Clé ANON embarquée en dur (clé publique, pas un secret)
 *    → plus d'erreur "No API key" si SUPABASE_ANON_KEY est absent de Netlify
 *  - Correction du bug spread headers : opts.headers ne peut plus
 *    écraser 'apikey' ni 'Authorization' accidentellement
 *  - UPSERT (ON CONFLICT DO UPDATE) partout → idempotent
 *  - Retry automatique (3 tentatives) avec backoff
 *  - Mode "_repair" pour réparer un compte existant
 *  - Mode "_diag" pour vérifier les variables d'env
 *
 * Variables d'environnement requises (Netlify > Site settings > Env vars) :
 *   SUPABASE_URL              = https://mfyhktnzjodaqfocupcn.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY = eyJhbGci... (⚠️ garder secret, côté serveur uniquement)
 *
 * Optionnel (fallback embarqué si absent) :
 *   SUPABASE_ANON_KEY         = eyJhbGci... (clé publique)
 */

// ── Clé ANON embarquée en dur (clé publique — safe to expose) ──
// C'est la même clé visible dans le JS côté client.
const ANON_KEY_FALLBACK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1meWhrdG56am9kYXFmb2N1cGNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4Mjg2ODEsImV4cCI6MjA5MTQwNDY4MX0.jnqEOFFu1gQvQrDemK4eOYwhWZI0K84Lgwhv7Cl2xGo';

// ── URL Supabase embarquée en dur (fallback) ─────────────────
const SUPABASE_URL_FALLBACK = 'https://mfyhktnzjodaqfocupcn.supabase.co';

const SUPABASE_URL     = process.env.SUPABASE_URL      || SUPABASE_URL_FALLBACK;
const ANON_KEY         = process.env.SUPABASE_ANON_KEY || ANON_KEY_FALLBACK;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // ← doit être dans Netlify

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VALID_ROLES = ['superadmin','admin','manager','commercial','technicien','lecture'];
const VALID_APPS  = ['gestapp','famille','calcul'];

// ── Réponses helper ───────────────────────────────────────────
const ok  = (body, code = 200) => ({
  statusCode: code,
  headers: { ...CORS, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const err = (msg, code = 400, extra = {}) => ({
  statusCode: code,
  headers: { ...CORS, 'Content-Type': 'application/json' },
  body: JSON.stringify({ error: msg, ...extra }),
});

// ── Appel REST Supabase ───────────────────────────────────────
// IMPORTANT : les headers fixes (apikey, Authorization) sont
// TOUJOURS définis en dernier → opts.headers ne peut pas les écraser.
async function sbFetch(path, opts = {}, retries = 3) {
  const key = opts.useServiceRole ? SERVICE_ROLE_KEY : ANON_KEY;

  if (!key) {
    throw new Error(
      opts.useServiceRole
        ? 'SUPABASE_SERVICE_ROLE_KEY manquant dans les variables d\'environnement Netlify.'
        : 'Clé ANON manquante (ne devrait jamais arriver).'
    );
  }

  // Construire le header Prefer
  let prefer = 'return=representation';
  if (opts.upsert) prefer = 'resolution=merge-duplicates,return=representation';

  // Headers de base — opts.headers ne peut PAS écraser apikey/Authorization
  const baseHeaders = {
    'Content-Type': 'application/json',
    'Prefer':       prefer,
    ...(opts.extraHeaders || {}), // renommé pour éviter toute confusion
    // Ces deux-là sont TOUJOURS en dernier → ne peuvent pas être écrasés
    'apikey':        key,
    'Authorization': `Bearer ${key}`,
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${SUPABASE_URL}${path}`, {
        method: opts.method || 'GET',
        headers: baseHeaders,
        ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = text; }
      return { status: res.status, data };
    } catch (fetchErr) {
      console.warn(`[sbFetch] Tentative ${attempt}/${retries} échouée :`, fetchErr.message);
      if (attempt === retries) throw fetchErr;
      await new Promise(r => setTimeout(r, 400 * attempt));
    }
  }
}

// ── Vérifier le token appelant ────────────────────────────────
// Utilise la clé ANON (pas service_role) pour valider le JWT
async function validateCaller(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);

  // On ne peut pas utiliser sbFetch ici car on a besoin d'un
  // Authorization différent (token user, pas la clé ANON/service)
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'Content-Type':  'application/json',
        'apikey':         ANON_KEY,          // ← toujours présent grâce au fallback
        'Authorization': `Bearer ${token}`,  // ← JWT de l'utilisateur
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.id) return null;
    return data;
  } catch(e) {
    console.warn('[validateCaller] Erreur:', e.message);
    return null;
  }
}

// ── Vérifier si l'appelant est superadmin ────────────────────
async function callerIsSuperAdmin(userId) {
  // Vérifier platform_users
  const { status: s1, data: d1 } = await sbFetch(
    `/rest/v1/platform_users?id=eq.${userId}&select=role&limit=1`,
    { useServiceRole: true }
  );
  if (s1 === 200 && Array.isArray(d1) && d1[0]?.role === 'superadmin') return true;

  // Fallback : vérifier profiles
  const { status: s2, data: d2 } = await sbFetch(
    `/rest/v1/profiles?id=eq.${userId}&select=role&limit=1`,
    { useServiceRole: true }
  );
  if (s2 === 200 && Array.isArray(d2) && d2[0]?.role === 'superadmin') return true;

  return false;
}

// ── Chercher un utilisateur Auth par email ────────────────────
async function findAuthUserByEmail(email) {
  const { status, data } = await sbFetch(
    `/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    { useServiceRole: true }
  );
  if (status === 200 && data?.users?.length > 0) return data.users[0];
  return null;
}

// ── UPSERT platform_users ─────────────────────────────────────
async function upsertPlatformUser(payload) {
  return sbFetch('/rest/v1/platform_users', {
    method: 'POST',
    useServiceRole: true,
    upsert: true,
    body: payload,
  });
}

// ── UPSERT profiles ───────────────────────────────────────────
async function upsertProfile(payload) {
  return sbFetch('/rest/v1/profiles', {
    method: 'POST',
    useServiceRole: true,
    upsert: true,
    body: payload,
  });
}

// ── HANDLER PRINCIPAL ─────────────────────────────────────────
exports.handler = async (event) => {
  // Pré-vol CORS
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST')    return err('Méthode non autorisée', 405);

  // Parser le corps
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return err('Corps JSON invalide', 400); }

  // ── Ping diagnostic ──────────────────────────────────────────
  if (body._diag) {
    return ok({
      ok: true,
      version: '3.1',
      env: {
        url:          !!process.env.SUPABASE_URL,
        url_value:    SUPABASE_URL.slice(0, 30) + '...',
        anon_env:     !!process.env.SUPABASE_ANON_KEY,
        anon_active:  !!ANON_KEY,      // true même si fallback
        service:      !!SERVICE_ROLE_KEY,
      },
    });
  }

  // ── Vérification variable SERVICE_ROLE ───────────────────────
  if (!SERVICE_ROLE_KEY) {
    return err(
      'SUPABASE_SERVICE_ROLE_KEY manquant. ' +
      'Ajoutez-la dans Netlify → Site configuration → Environment variables.',
      500
    );
  }

  // ── Authentifier l'appelant ──────────────────────────────────
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const caller = await validateCaller(authHeader);
  if (!caller) return err('Non authentifié — envoyez un token Bearer valide.', 401);

  // ── Vérifier superadmin ──────────────────────────────────────
  const isSuper = await callerIsSuperAdmin(caller.id);
  if (!isSuper) return err('Accès refusé — seul le superadmin peut créer des utilisateurs.', 403);

  const now = new Date().toISOString();

  // ══════════════════════════════════════════════════════════════
  //  MODE REPAIR : réparer un compte existant
  //  body = { _repair: true, email, role, app_access, company_id }
  // ══════════════════════════════════════════════════════════════
  if (body._repair) {
    const { email, role = 'admin', app_access = ['gestapp'], company_id } = body;
    if (!email) return err('Champ requis : email', 400);

    const apps = Array.isArray(app_access)
      ? app_access.filter(a => VALID_APPS.includes(a))
      : ['gestapp'];

    // Trouver l'utilisateur Auth
    const authUser = await findAuthUserByEmail(email);
    if (!authUser) return err(`Aucun compte Auth trouvé pour ${email}`, 404);

    const uid = authUser.id;
    const name = authUser.user_metadata?.full_name
      || authUser.raw_user_meta_data?.full_name
      || email.split('@')[0];

    // Confirmer l'email si besoin
    if (!authUser.email_confirmed_at) {
      await sbFetch(`/auth/v1/admin/users/${uid}`, {
        method: 'PUT',
        useServiceRole: true,
        body: { email_confirm: true },
      });
    }

    // UPSERT platform_users
    const puRes = await upsertPlatformUser({
      id: uid, email, full_name: name,
      role:       VALID_ROLES.includes(role) ? role : 'admin',
      app_access: apps,
      company_id: company_id || null,
      is_active:  true,
      updated_at: now,
    });

    // UPSERT profiles (si gestapp dans les apps)
    let prRes = { status: 204 };
    if (apps.includes('gestapp')) {
      prRes = await upsertProfile({
        id: uid, email, full_name: name, name,
        role:       VALID_ROLES.includes(role) ? role : 'commercial',
        company_id: company_id || null,
        is_active:  true,
        updated_at: now,
      });
    }

    return ok({
      _repaired:             true,
      id:                    uid,
      email,
      role,
      platform_users_status: puRes.status,
      profiles_status:       prRes.status,
      platform_users_ok:     puRes.status === 200 || puRes.status === 201,
      profiles_ok:           prRes.status === 200 || prRes.status === 201 || prRes.status === 204,
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  MODE CRÉATION : créer un nouvel utilisateur
  // ══════════════════════════════════════════════════════════════
  const { email, password, full_name, role = 'admin', app_access = ['gestapp'], company_id } = body;

  if (!email || !password || !full_name) return err('Champs requis : email, password, full_name');
  if (password.length < 8)              return err('Mot de passe : 8 caractères minimum');
  if (!VALID_ROLES.includes(role))       return err(`Rôle invalide. Valeurs : ${VALID_ROLES.join(', ')}`);

  const apps = Array.isArray(app_access)
    ? app_access.filter(a => VALID_APPS.includes(a))
    : ['gestapp'];

  const steps = {};

  // ── ÉTAPE 1 : Créer l'utilisateur Auth ──────────────────────
  let newUserId;
  let wasExisting = false;

  const { status: authStatus, data: authData } = await sbFetch('/auth/v1/admin/users', {
    method: 'POST',
    useServiceRole: true,
    body: {
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role, app_access: apps },
    },
  });

  steps.auth = { status: authStatus };

  if (authStatus === 422 || (typeof authData?.message === 'string' && authData.message.toLowerCase().includes('already registered'))) {
    // Email déjà utilisé → récupérer et réparer
    const existing = await findAuthUserByEmail(email);
    if (!existing) return err('Email déjà utilisé mais introuvable via API admin.', 409);
    newUserId   = existing.id;
    wasExisting = true;
    steps.auth.note = 'Utilisateur Auth déjà existant — réparation DB';

    if (!existing.email_confirmed_at) {
      await sbFetch(`/auth/v1/admin/users/${newUserId}`, {
        method: 'PUT',
        useServiceRole: true,
        body: { email_confirm: true },
      });
      steps.auth.confirmed = true;
    }
  } else if (authStatus !== 200 && authStatus !== 201) {
    return err(
      `Erreur Auth (${authStatus}) : ${authData?.message || authData?.error_description || authData?.error || 'Erreur inconnue'}`,
      500,
      { steps }
    );
  } else {
    newUserId = authData.id;
  }

  if (!newUserId) return err('Auth réussie mais UID manquant.', 500, { steps });

  // ── ÉTAPE 2 : UPSERT platform_users ─────────────────────────
  const puRes = await upsertPlatformUser({
    id:         newUserId,
    email,
    full_name,
    role,
    app_access: apps,
    company_id: company_id || null,
    is_active:  true,
    created_at: now,
    updated_at: now,
  });
  steps.platform_users = { status: puRes.status };
  if (puRes.status !== 200 && puRes.status !== 201) {
    console.error('[admin-create-user] Erreur UPSERT platform_users:', puRes.data);
    steps.platform_users.error = typeof puRes.data === 'object'
      ? (puRes.data?.message || puRes.data?.hint || JSON.stringify(puRes.data).slice(0, 200))
      : String(puRes.data).slice(0, 200);
  }

  // ── ÉTAPE 3 : UPSERT profiles (si accès gestapp) ─────────────
  if (apps.includes('gestapp')) {
    const prRes = await upsertProfile({
      id:         newUserId,
      email,
      full_name,
      name:       full_name,
      role:       VALID_ROLES.includes(role) ? role : 'commercial',
      company_id: company_id || null,
      is_active:  true,
      created_at: now,
      updated_at: now,
    });
    steps.profiles = { status: prRes.status };
    if (prRes.status !== 200 && prRes.status !== 201) {
      console.error('[admin-create-user] Erreur UPSERT profiles:', prRes.data);
      steps.profiles.error = typeof prRes.data === 'object'
        ? (prRes.data?.message || prRes.data?.hint || JSON.stringify(prRes.data).slice(0, 200))
        : String(prRes.data).slice(0, 200);
    }
  } else {
    steps.profiles = { status: 'skipped', note: 'Pas d\'accès gestapp' };
  }

  // ── Réponse succès ───────────────────────────────────────────
  const dbOk = steps.platform_users?.status === 200 || steps.platform_users?.status === 201;
  return ok({
    id:           newUserId,
    email,
    full_name,
    role,
    app_access:   apps,
    company_id:   company_id || null,
    was_existing: wasExisting,
    _authConfirmed: true,
    _savedToDb:   dbOk,
    _steps:       steps,
  }, 201);
};
