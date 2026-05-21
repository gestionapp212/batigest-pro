/**
 * Netlify Function : create-user  v3.9
 * ✅ SANS dépendances npm — fetch natif Node 18+
 * Compatible drag & drop Netlify
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

const ok  = (body)      => ({ statusCode: 200, headers: CORS, body: JSON.stringify(body) });
const err = (code, msg, extra = {}) => ({
  statusCode: code,
  headers: CORS,
  body: JSON.stringify({ error: msg, ...extra }),
});

const VALID_ROLES = ['admin', 'manager', 'commercial', 'technicien', 'lecture'];

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
    { status: res.status }
  );
  return data;
}

async function sbAuthCreate(supabaseUrl, serviceKey, email, password, metadata = {}) {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'apikey':        serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: metadata }),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(
    new Error(data.msg || data.message || JSON.stringify(data)),
    { status: res.status }
  );
  return data;
}

async function sbGetUser(supabaseUrl, anonKey, token) {
  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { 'apikey': anonKey, 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST')    return err(405, 'Méthode non autorisée');

  // ── Vérification variables d'environnement ──────────────────────────────
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SVC_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ANON_KEY     = process.env.SUPABASE_ANON_KEY;

  const missingVars = [];
  if (!SUPABASE_URL) missingVars.push('SUPABASE_URL');
  if (!SVC_KEY)      missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!ANON_KEY)     missingVars.push('SUPABASE_ANON_KEY');

  if (missingVars.length > 0) {
    console.error('[create-user] Variables env manquantes:', missingVars.join(', '));
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

  // ── Parser le body ─────────────────────────────────────────────────────
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return err(400, 'JSON invalide'); }

  // Ping diagnostic (sans auth)
  if (body._diag) return ok({
    ok: true,
    message: 'create-user opérationnelle',
    env: {
      supabase_url: !!SUPABASE_URL,
      anon_key:     !!ANON_KEY,
      service_key:  !!SVC_KEY,
    },
  });

  // ── Vérifier le token ─────────────────────────────────────────────────
  const token = (event.headers['authorization'] || event.headers['Authorization'] || '')
    .replace(/^Bearer\s+/i, '').trim();
  if (!token) return err(401, 'Token manquant — reconnectez-vous');

  const callerUser = await sbGetUser(SUPABASE_URL, ANON_KEY || SVC_KEY, token);
  if (!callerUser) return err(401, 'Token invalide ou expiré — rechargez la page (F5)');

  // ── Vérifier rôle admin ou superadmin ─────────────────────────────────
  let callerProfiles;
  try {
    callerProfiles = await sbQuery(SUPABASE_URL, SVC_KEY, 'GET',
      `profiles?id=eq.${callerUser.id}&select=role,company_id&limit=1`);
  } catch(e) {
    return err(500, 'Lecture profil impossible : ' + e.message);
  }
  const caller = callerProfiles?.[0];
  if (!caller || !['admin', 'superadmin'].includes(caller.role))
    return err(403, 'Accès réservé aux admins et superadmins');

  // ── Validation des champs ─────────────────────────────────────────────
  const { name, email, password, role, company_id, phone } = body;

  if (!name || !email || !password || !role || !company_id)
    return err(400, 'Champs requis : name, email, password, role, company_id');
  if (password.length < 6)
    return err(400, 'Mot de passe min 6 caractères');
  if (!VALID_ROLES.includes(role))
    return err(400, `Rôle invalide. Valeurs acceptées : ${VALID_ROLES.join(', ')}`);

  // Vérifier que l'admin crée bien dans sa propre société (sauf superadmin)
  if (caller.role !== 'superadmin' && caller.company_id !== company_id)
    return err(403, 'Vous ne pouvez créer des utilisateurs que pour votre propre société');

  // ── Créer l'utilisateur Auth ───────────────────────────────────────────
  let authUser;
  try {
    authUser = await sbAuthCreate(SUPABASE_URL, SVC_KEY, email, password, {
      full_name: name, role, company_id,
    });
  } catch(e) {
    if (e.message?.includes('already registered') || e.status === 422)
      return err(409, `Email déjà utilisé dans Supabase : ${email}`);
    return err(500, 'Création Auth échouée : ' + e.message);
  }

  // ── Créer le profil ────────────────────────────────────────────────────
  try {
    await sbQuery(SUPABASE_URL, SVC_KEY, 'POST', 'profiles', {
      id:         authUser.id,
      email,
      full_name:  name,
      name,
      role,
      company_id,
      phone:      phone || null,
      is_active:  true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch(e) {
    console.error('[create-user] Profil warning (non bloquant):', e.message);
  }

  return ok({
    id:         authUser.id,
    email,
    name,
    full_name:  name,
    role,
    company_id,
    is_active:  true,
    _savedToDb: true,
  });
};
