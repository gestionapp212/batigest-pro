/**
 * Netlify Function : manage-company  v3.9
 * ✅ SANS dépendances npm — fetch natif Node 18+
 * Compatible drag & drop Netlify
 * Actions : update | suspend | activate | delete | get_users
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

async function sbGetUser(supabaseUrl, anonKey, token) {
  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { 'apikey': anonKey, 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function sbAuthDelete(supabaseUrl, serviceKey, userId) {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'apikey':        serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
  });
  return res.ok;
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
    console.error('[manage-company] Variables env manquantes:', missingVars.join(', '));
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
    message: 'manage-company opérationnelle',
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

  // ── Vérifier superadmin ────────────────────────────────────────────────
  let callerProfiles;
  try {
    callerProfiles = await sbQuery(SUPABASE_URL, SVC_KEY, 'GET',
      `profiles?id=eq.${callerUser.id}&select=role&limit=1`);
  } catch(e) {
    return err(500, 'Lecture profil impossible : ' + e.message);
  }
  if (!callerProfiles?.length || callerProfiles[0].role !== 'superadmin')
    return err(403, 'Accès réservé au superadmin');

  // ── Validation action ─────────────────────────────────────────────────
  const { action, company_id, data = {} } = body;
  const VALID_ACTIONS = ['update', 'suspend', 'activate', 'delete', 'get_users'];

  if (!action || !VALID_ACTIONS.includes(action))
    return err(400, `Action invalide. Valeurs : ${VALID_ACTIONS.join(', ')}`);
  if (!company_id)
    return err(400, 'company_id requis');

  // ── Vérifier que la société existe ────────────────────────────────────
  let companies;
  try {
    companies = await sbQuery(SUPABASE_URL, SVC_KEY, 'GET',
      `companies?id=eq.${company_id}&select=id,name,status&limit=1`);
  } catch(e) {
    return err(500, 'Lecture société impossible : ' + e.message);
  }
  if (!companies?.length) return err(404, `Société introuvable : ${company_id}`);
  const company = companies[0];

  // ── Actions ──────────────────────────────────────────────────────────

  if (action === 'get_users') {
    try {
      const users = await sbQuery(SUPABASE_URL, SVC_KEY, 'GET',
        `profiles?company_id=eq.${company_id}&select=id,email,name,full_name,role,is_active,created_at&order=created_at.asc`);
      return ok({ users: users || [] });
    } catch(e) {
      return err(500, 'Lecture utilisateurs impossible : ' + e.message);
    }
  }

  if (action === 'update') {
    const allowed = ['name','plan','status','ice','city','phone','address','email',
                     'subscription_end','start_date','logo','rib','cnss','patente',
                     'identifiant_fiscal','rc','ville','telephone'];
    const payload = {};
    allowed.forEach(k => { if (data[k] !== undefined) payload[k] = data[k]; });
    payload.updated_at = new Date().toISOString();
    try {
      const rows = await sbQuery(SUPABASE_URL, SVC_KEY, 'PATCH',
        `companies?id=eq.${company_id}`, payload);
      return ok({ company: Array.isArray(rows) ? rows[0] : rows });
    } catch(e) {
      return err(500, 'Mise à jour impossible : ' + e.message);
    }
  }

  if (action === 'suspend') {
    try {
      await sbQuery(SUPABASE_URL, SVC_KEY, 'PATCH',
        `companies?id=eq.${company_id}`,
        { status: 'suspendu', updated_at: new Date().toISOString() });
      return ok({ success: true, company_id, status: 'suspendu' });
    } catch(e) {
      return err(500, 'Suspension impossible : ' + e.message);
    }
  }

  if (action === 'activate') {
    try {
      await sbQuery(SUPABASE_URL, SVC_KEY, 'PATCH',
        `companies?id=eq.${company_id}`,
        { status: 'actif', updated_at: new Date().toISOString() });
      return ok({ success: true, company_id, status: 'actif' });
    } catch(e) {
      return err(500, 'Activation impossible : ' + e.message);
    }
  }

  if (action === 'delete') {
    try {
      // 1. Récupérer tous les utilisateurs de cette société
      const profiles = await sbQuery(SUPABASE_URL, SVC_KEY, 'GET',
        `profiles?company_id=eq.${company_id}&select=id`);

      // 2. Supprimer chaque utilisateur Auth
      for (const p of (profiles || [])) {
        try { await sbAuthDelete(SUPABASE_URL, SVC_KEY, p.id); } catch {}
      }

      // 3. Supprimer les profils
      await sbQuery(SUPABASE_URL, SVC_KEY, 'DELETE', `profiles?company_id=eq.${company_id}`);

      // 4. Supprimer la société
      await sbQuery(SUPABASE_URL, SVC_KEY, 'DELETE', `companies?id=eq.${company_id}`);

      return ok({ success: true, deleted: company_id, name: company.name });
    } catch(e) {
      return err(500, 'Suppression impossible : ' + e.message);
    }
  }

  return err(400, 'Action non implémentée');
};
