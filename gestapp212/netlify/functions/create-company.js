/**
 * Netlify Function : create-company  v4.0
 * ✅ SANS dépendances npm — fetch natif Node 18+
 * ✅ Compatible drag & drop Netlify
 * ✅ Utilise SERVICE_ROLE KEY pour bypass RLS (lit profiles sans récursion)
 *
 * Variables d'environnement REQUISES dans Netlify → Site settings → Environment variables :
 *   SUPABASE_URL              = https://mfyhktnzjodaqfocupcn.supabase.co
 *   SUPABASE_ANON_KEY         = eyJhbGci... (clé publique anon)
 *   SUPABASE_SERVICE_ROLE_KEY = eyJhbGci... (clé service role — JAMAIS côté client)
 *   SITE_URL                  = https://helpful-rugelach-c0465d.netlify.app
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const ok  = (body)          => ({ statusCode: 200, headers: CORS, body: JSON.stringify(body) });
const err = (code, msg, extra = {}) => ({
  statusCode: code,
  headers: CORS,
  body: JSON.stringify({ error: msg, ...extra }),
});

// ── Helpers REST Supabase (fetch natif) ──────────────────────────────────────

async function sbQuery(supabaseUrl, key, method, path, body = null) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey':        key,
      'Authorization': `Bearer ${key}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=representation',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw Object.assign(
    new Error(data?.message || data?.error || text),
    { status: res.status, data }
  );
  return data;
}

// Crée un utilisateur Auth via l'API admin Supabase (nécessite service_role)
async function sbAuthCreate(supabaseUrl, serviceKey, email, password, metadata = {}) {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'apikey':        serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(
    new Error(data.msg || data.message || JSON.stringify(data)),
    { status: res.status }
  );
  return data;
}

// Vérifie un token JWT et retourne l'utilisateur (utilise ANON ou SVC key)
async function sbGetUser(supabaseUrl, key, token) {
  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      'apikey':        key,
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) return null;
  return res.json();
}

// ── Handler principal ──────────────────────────────────────────────────────────

exports.handler = async (event) => {
  // OPTIONS preflight CORS
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST')    return err(405, 'Méthode non autorisée');

  // ── Vérification variables d'environnement ──────────────────────────────────
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SVC_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ANON_KEY     = process.env.SUPABASE_ANON_KEY;

  const missingVars = [];
  if (!SUPABASE_URL) missingVars.push('SUPABASE_URL');
  if (!SVC_KEY)      missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!ANON_KEY)     missingVars.push('SUPABASE_ANON_KEY');

  if (missingVars.length > 0) {
    console.error('[create-company] Variables env manquantes:', missingVars.join(', '));
    return err(500,
      `Variables d'environnement manquantes sur Netlify : ${missingVars.join(', ')}. ` +
      'Allez dans Netlify → Site settings → Environment variables et ajoutez ces variables, ' +
      'puis redéployez.',
      {
        code: 'ENV_MISSING',
        missing: missingVars,
        guide: 'https://app.netlify.com/sites/helpful-rugelach-c0465d/settings/env',
      }
    );
  }

  // ── Parser le body ──────────────────────────────────────────────────────────
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return err(400, 'JSON invalide'); }

  // Ping diagnostic (sans auth) — vérifie que les env vars sont bien présentes
  if (body._diag) return ok({
    ok: true,
    message: 'create-company v4.0 opérationnelle',
    env: {
      supabase_url:  !!SUPABASE_URL,
      anon_key:      !!ANON_KEY,
      service_key:   !!SVC_KEY,
    },
  });

  // ── Récupérer et vérifier le token Bearer ───────────────────────────────────
  const token = (event.headers['authorization'] || event.headers['Authorization'] || '')
    .replace(/^Bearer\s+/i, '').trim();
  if (!token) return err(401, 'Token manquant — reconnectez-vous');

  // Vérifier le token via l'API Supabase Auth
  // IMPORTANT : on utilise ANON_KEY pour valider le JWT utilisateur
  const callerUser = await sbGetUser(SUPABASE_URL, ANON_KEY, token);
  if (!callerUser || !callerUser.id) {
    return err(401, 'Token invalide ou expiré — rechargez la page (F5) et reconnectez-vous');
  }

  console.log('[create-company] Appelant UID:', callerUser.id, 'Email:', callerUser.email);

  // ── Vérifier rôle superadmin via SERVICE_ROLE KEY (bypass RLS, ZÉRO récursion) ──
  // On utilise SVC_KEY pour lire profiles → pas de RLS → pas de récursion infinie
  let callerProfile;
  try {
    const profiles = await sbQuery(
      SUPABASE_URL,
      SVC_KEY,  // ← SERVICE_ROLE KEY bypasse les RLS
      'GET',
      `profiles?id=eq.${callerUser.id}&select=id,role,email&limit=1`
    );
    callerProfile = Array.isArray(profiles) ? profiles[0] : profiles;
  } catch (e) {
    console.error('[create-company] Erreur lecture profil:', e.message);
    return err(500, 'Lecture profil impossible : ' + e.message + '. Vérifiez que la table profiles existe.');
  }

  if (!callerProfile) {
    console.error('[create-company] Profil introuvable pour UID:', callerUser.id);
    return err(403,
      `Profil manquant pour ${callerUser.email}. ` +
      'Exécutez supabase-FIX-ALL-IN-ONE.sql dans le Supabase SQL Editor pour créer le profil superadmin.'
    );
  }

  if (callerProfile.role !== 'superadmin') {
    console.error('[create-company] Rôle insuffisant:', callerProfile.role, 'pour UID:', callerUser.id);
    return err(403,
      `Accès réservé au superadmin. Votre rôle actuel : "${callerProfile.role}". ` +
      'Exécutez supabase-FIX-ALL-IN-ONE.sql pour corriger le rôle.'
    );
  }

  // ── Validation des champs requis ────────────────────────────────────────────
  const {
    name, plan = 'Starter', status = 'actif',
    subscription_end, start_date,
    admin_name, admin_email, admin_password,
    ice, city, phone, address, email: companyEmail,
  } = body;

  if (!name)           return err(400, 'Champ requis : name (nom de la société)');
  if (!admin_name)     return err(400, 'Champ requis : admin_name');
  if (!admin_email)    return err(400, 'Champ requis : admin_email');
  if (!admin_password) return err(400, 'Champ requis : admin_password');
  if (admin_password.length < 6) return err(400, 'Mot de passe admin : minimum 6 caractères');

  // ── Créer la société dans Supabase ──────────────────────────────────────────
  let company;
  try {
    const rows = await sbQuery(SUPABASE_URL, SVC_KEY, 'POST', 'companies', {
      name,
      plan:             plan || 'Starter',
      status:           status || 'actif',
      ice:              ice    || null,
      city:             city   || null,
      phone:            phone  || null,
      address:          address || null,
      email:            companyEmail || null,
      subscription_end: subscription_end || null,
      start_date:       start_date || new Date().toISOString().split('T')[0],
      created_at:       new Date().toISOString(),
      updated_at:       new Date().toISOString(),
    });
    company = Array.isArray(rows) ? rows[0] : rows;
    console.log('[create-company] Société créée ID:', company.id, 'Nom:', company.name);
  } catch (e) {
    console.error('[create-company] Erreur création société:', e.message);
    return err(500, 'Création société échouée : ' + e.message);
  }

  // ── Créer l'utilisateur Auth (via API admin — nécessite service_role) ────────
  let authUser;
  try {
    authUser = await sbAuthCreate(SUPABASE_URL, SVC_KEY, admin_email, admin_password, {
      full_name:  admin_name,
      role:       'admin',
      company_id: company.id,
    });
    console.log('[create-company] Auth user créé ID:', authUser.id);
  } catch (e) {
    // Rollback : supprimer la société créée
    try {
      await sbQuery(SUPABASE_URL, SVC_KEY, 'DELETE', `companies?id=eq.${company.id}`);
      console.log('[create-company] Rollback société effectué');
    } catch (rollbackErr) {
      console.error('[create-company] Rollback échoué:', rollbackErr.message);
    }

    if (e.message?.includes('already registered') || e.status === 422) {
      return err(409, `Email déjà utilisé dans Supabase : ${admin_email}`);
    }
    return err(500, 'Création compte utilisateur échouée : ' + e.message);
  }

  // ── Créer le profil de l'admin ──────────────────────────────────────────────
  try {
    await sbQuery(SUPABASE_URL, SVC_KEY, 'POST', 'profiles', {
      id:         authUser.id,
      email:      admin_email,
      full_name:  admin_name,
      name:       admin_name,
      role:       'admin',
      company_id: company.id,
      is_active:  true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    console.log('[create-company] Profil admin créé pour:', admin_email);
  } catch (e) {
    // Non bloquant : le compte Auth est créé, profil peut être rajouté manuellement
    console.warn('[create-company] Avertissement profil (non bloquant):', e.message);
  }

  // ── Succès ─────────────────────────────────────────────────────────────────
  return ok({
    company: {
      ...company,
      _savedToDb: true,
    },
    admin: {
      id:         authUser.id,
      email:      admin_email,
      name:       admin_name,
      full_name:  admin_name,
      role:       'admin',
      company_id: company.id,
      is_active:  true,
      _savedToDb: true,
    },
  });
};
