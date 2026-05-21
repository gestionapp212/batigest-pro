/**
 * ═══════════════════════════════════════════════════════════════
 *  PLATFORM API — Cloudflare Worker v5.1
 *  Worker : gestapp-api.gestionapp212.workers.dev
 *  Backend : Supabase (service_role)
 *
 *  Routes :
 *    GET  /health
 *    POST /admin/test
 *    POST /admin/create-user
 *    PUT  /admin/update-user/:id
 *    PATCH /admin/toggle-user/:id
 *    DELETE /admin/delete-user/:id
 *    GET  /admin/list-users
 *    GET  /admin/list-users/:app    (filtrer par app)
 *    GET  /admin/stats
 *    POST /admin/repair-user
 *    POST /admin/companies
 *    PUT  /admin/companies/:id
 *    GET  /admin/companies
 *
 *  Secrets (wrangler secret put NOM) :
 *    SUPABASE_URL          → https://mfyhktnzjodaqfocupcn.supabase.co
 *    SUPABASE_SERVICE_ROLE → eyJ...
 *    SUPERADMIN_EMAIL      → said.hamdaoui1984@gmail.com
 *    ALLOWED_ORIGINS       → * (ou domaines séparés par virgule)
 * ═══════════════════════════════════════════════════════════════
 */

// ── CORS ─────────────────────────────────────────────────────────
function getCors(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());
  const ao = allowed.includes('*') ? '*' : (allowed.includes(origin) ? origin : allowed[0]);
  return {
    'Access-Control-Allow-Origin':  ao,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Max-Age':       '86400',
  };
}

function jsonRes(data, status = 200, cors = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
function errRes(msg, status = 400, cors = {}) {
  return jsonRes({ error: msg }, status, cors);
}

// ── Supabase REST helper (service_role) ──────────────────────────
async function sb(env, path, method = 'GET', body = null, extra = {}) {
  const url = `${env.SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    'Content-Type':  'application/json',
    'apikey':        env.SUPABASE_SERVICE_ROLE,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    'Prefer':        'return=representation',
    ...extra,
  };
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

// ── Supabase Auth Admin helper ────────────────────────────────────
async function sbAuth(env, path, method = 'GET', body = null) {
  const url  = `${env.SUPABASE_URL}/auth/v1/admin/${path}`;
  const headers = {
    'Content-Type':  'application/json',
    'apikey':        env.SUPABASE_SERVICE_ROLE,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
  };
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

// ── Vérifier token + rôle superadmin ─────────────────────────────
async function requireSuperAdmin(request, env) {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;

  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'apikey':        env.SUPABASE_SERVICE_ROLE,
      'Authorization': `Bearer ${token}`,
    }
  });
  if (!res.ok) return null;
  const user = await res.json();
  if (!user?.email) return null;

  const saEmail = (env.SUPERADMIN_EMAIL || '').toLowerCase();
  if (user.email.toLowerCase() === saEmail) return user;

  const dbRes = await sb(env, `platform_users?id=eq.${user.id}&select=role`);
  if (dbRes.ok && Array.isArray(dbRes.data) && dbRes.data[0]?.role === 'superadmin') return user;

  return null;
}

// ── Helper JSON body ─────────────────────────────────────────────
async function parseBody(request) {
  try { return await request.json(); } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════
//  ROUTER PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '*';
    const cors   = getCors(origin, env);
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;
    const seg    = path.split('/').filter(Boolean); // segments de l'URL

    // ── OPTIONS preflight ──────────────────────────────────────
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // ══════════════════════════════════════════════════════════
    //  GET /health
    // ══════════════════════════════════════════════════════════
    if ((path === '/health' || path === '/') && method === 'GET') {
      return jsonRes({
        status:    'ok',
        version:   '5.1',
        service:   'Platform API — Supabase backend',
        worker:    'gestapp-api.gestionapp212.workers.dev',
        supabase:  !!env.SUPABASE_URL,
        timestamp: new Date().toISOString(),
      }, 200, cors);
    }

    // ══════════════════════════════════════════════════════════
    //  POST /admin/test
    // ══════════════════════════════════════════════════════════
    if (path === '/admin/test' && method === 'POST') {
      const sa = await requireSuperAdmin(request, env);
      return jsonRes({
        ok:            true,
        authenticated: !!sa,
        email:         sa?.email || null,
        supabaseUrl:   !!env.SUPABASE_URL,
        serviceRole:   !!env.SUPABASE_SERVICE_ROLE,
        version:       '5.1',
      }, 200, cors);
    }

    // ══════════════════════════════════════════════════════════
    //  POST /admin/create-user
    // ══════════════════════════════════════════════════════════
    if (path === '/admin/create-user' && method === 'POST') {
      const sa = await requireSuperAdmin(request, env);
      if (!sa) return errRes('Non autorisé — SuperAdmin requis', 401, cors);

      const body = await parseBody(request);
      if (!body) return errRes('JSON invalide', 400, cors);

      const {
        email, password, full_name,
        role       = 'admin',
        app_access = [],
        company_id = null,
        plan       = 'pro',
        can_create_users = false,
      } = body;

      if (!email || !password) return errRes('email et password requis', 400, cors);

      // 1. Créer dans Supabase Auth (email auto-confirmé)
      const authRes = await sbAuth(env, 'users', 'POST', {
        email,
        password,
        email_confirm:  true,
        user_metadata:  { full_name, role },
      });

      if (!authRes.ok) {
        const msg = authRes.data?.msg || authRes.data?.message || JSON.stringify(authRes.data);
        if (authRes.status === 422 || (typeof msg === 'string' && msg.includes('already registered'))) {
          return errRes('Cet email est déjà enregistré', 409, cors);
        }
        return errRes('Erreur Auth : ' + msg, authRes.status, cors);
      }

      const userId = authRes.data.id;
      const now    = new Date().toISOString();

      // 2. Upsert dans platform_users
      const dbRes = await sb(env, 'platform_users', 'POST', {
        id: userId, email, full_name, role,
        app_access, company_id, plan,
        is_active: true, can_create_users,
        created_at: now, updated_at: now,
      }, { 'Prefer': 'resolution=merge-duplicates,return=representation' });

      if (!dbRes.ok) {
        return errRes('Auth OK mais erreur BDD : ' + JSON.stringify(dbRes.data), 500, cors);
      }

      return jsonRes({
        success: true,
        user: { id: userId, email, full_name, role, app_access, plan },
      }, 201, cors);
    }

    // ══════════════════════════════════════════════════════════
    //  PUT /admin/update-user/:id
    // ══════════════════════════════════════════════════════════
    if (seg[0] === 'admin' && seg[1] === 'update-user' && seg[2] && method === 'PUT') {
      const sa = await requireSuperAdmin(request, env);
      if (!sa) return errRes('Non autorisé', 401, cors);

      const userId = seg[2];
      const body   = await parseBody(request);
      if (!body) return errRes('JSON invalide', 400, cors);

      const { full_name, role, app_access, plan, company_id, can_create_users, module_permissions } = body;
      const updates = { updated_at: new Date().toISOString() };
      if (full_name !== undefined)          updates.full_name          = full_name;
      if (role !== undefined)               updates.role               = role;
      if (app_access !== undefined)         updates.app_access         = app_access;
      if (plan !== undefined)               updates.plan               = plan;
      if (company_id !== undefined)         updates.company_id         = company_id;
      if (can_create_users !== undefined)   updates.can_create_users   = can_create_users;
      if (module_permissions !== undefined) updates.module_permissions = module_permissions;

      const res = await sb(env,
        `platform_users?id=eq.${userId}`,
        'PATCH', updates,
        { 'Prefer': 'return=representation' }
      );

      if (!res.ok) return errRes('Mise à jour échouée : ' + JSON.stringify(res.data), 500, cors);
      return jsonRes({ success: true, user: Array.isArray(res.data) ? res.data[0] : res.data }, 200, cors);
    }

    // ══════════════════════════════════════════════════════════
    //  PATCH /admin/toggle-user/:id
    // ══════════════════════════════════════════════════════════
    if (seg[0] === 'admin' && seg[1] === 'toggle-user' && seg[2] && method === 'PATCH') {
      const sa = await requireSuperAdmin(request, env);
      if (!sa) return errRes('Non autorisé', 401, cors);

      const userId = seg[2];
      const body   = await parseBody(request);
      const isActive = body?.is_active;
      if (typeof isActive !== 'boolean') return errRes('is_active (boolean) requis', 400, cors);

      const res = await sb(env,
        `platform_users?id=eq.${userId}`,
        'PATCH', { is_active: isActive, updated_at: new Date().toISOString() },
        { 'Prefer': 'return=representation' }
      );

      if (!res.ok) return errRes('Toggle échoué', 500, cors);
      return jsonRes({ success: true, is_active: isActive }, 200, cors);
    }

    // ══════════════════════════════════════════════════════════
    //  DELETE /admin/delete-user/:id
    // ══════════════════════════════════════════════════════════
    if (seg[0] === 'admin' && seg[1] === 'delete-user' && seg[2] && method === 'DELETE') {
      const sa = await requireSuperAdmin(request, env);
      if (!sa) return errRes('Non autorisé', 401, cors);

      const userId = seg[2];
      await sbAuth(env, `users/${userId}`, 'DELETE');
      await sb(env, `platform_users?id=eq.${userId}`, 'DELETE');

      return jsonRes({ success: true, deleted: userId }, 200, cors);
    }

    // ══════════════════════════════════════════════════════════
    //  GET /admin/list-users  ou  GET /admin/list-users/:app
    // ══════════════════════════════════════════════════════════
    if (seg[0] === 'admin' && seg[1] === 'list-users' && method === 'GET') {
      const sa = await requireSuperAdmin(request, env);
      if (!sa) return errRes('Non autorisé', 401, cors);

      const app = seg[2]; // optionnel
      let query = 'platform_users?select=*,companies(id,name,plan)&order=created_at.desc';
      if (app) query += `&app_access=cs.{${app}}`;

      const res = await sb(env, query);
      return jsonRes(res.data, res.status, cors);
    }

    // ══════════════════════════════════════════════════════════
    //  GET /admin/stats
    // ══════════════════════════════════════════════════════════
    if (path === '/admin/stats' && method === 'GET') {
      const sa = await requireSuperAdmin(request, env);
      if (!sa) return errRes('Non autorisé', 401, cors);

      const [uRes, cRes] = await Promise.all([
        sb(env, 'platform_users?select=id,role,is_active,app_access'),
        sb(env, 'companies?select=id,name,plan,status'),
      ]);

      const users     = uRes.data  || [];
      const companies = cRes.data  || [];

      return jsonRes({
        totalUsers:     users.length,
        activeUsers:    users.filter(u => u.is_active).length,
        adminUsers:     users.filter(u => u.role === 'admin').length,
        superAdmins:    users.filter(u => u.role === 'superadmin').length,
        totalCompanies: companies.length,
        byApp: {
          gestapp: users.filter(u => Array.isArray(u.app_access) && u.app_access.includes('gestapp')).length,
          famille: users.filter(u => Array.isArray(u.app_access) && u.app_access.includes('famille')).length,
          calcul:  users.filter(u => Array.isArray(u.app_access) && u.app_access.includes('calcul')).length,
        },
        byPlan: {
          starter:    companies.filter(c => c.plan === 'starter').length,
          pro:        companies.filter(c => c.plan === 'pro').length,
          enterprise: companies.filter(c => c.plan === 'enterprise').length,
        },
      }, 200, cors);
    }

    // ══════════════════════════════════════════════════════════
    //  POST /admin/repair-user
    // ══════════════════════════════════════════════════════════
    if (path === '/admin/repair-user' && method === 'POST') {
      const sa = await requireSuperAdmin(request, env);
      if (!sa) return errRes('Non autorisé', 401, cors);

      const body = await parseBody(request);
      if (!body) return errRes('JSON invalide', 400, cors);
      const { userId, email, role = 'admin', app_access = ['gestapp'] } = body;
      const now = new Date().toISOString();

      await sb(env, 'platform_users', 'POST', {
        id: userId, email, role, app_access,
        is_active: true, created_at: now, updated_at: now,
      }, { 'Prefer': 'resolution=merge-duplicates,return=representation' });

      await sb(env, 'profiles', 'POST', {
        id: userId, email, role,
        is_active: true, updated_at: now,
      }, { 'Prefer': 'resolution=merge-duplicates,return=representation' });

      return jsonRes({ success: true, repaired: email }, 200, cors);
    }

    // ══════════════════════════════════════════════════════════
    //  GET /admin/companies
    // ══════════════════════════════════════════════════════════
    if (path === '/admin/companies' && method === 'GET') {
      const sa = await requireSuperAdmin(request, env);
      if (!sa) return errRes('Non autorisé', 401, cors);

      const res = await sb(env, 'companies?select=*&order=created_at.desc');
      return jsonRes(res.data, res.status, cors);
    }

    // ══════════════════════════════════════════════════════════
    //  POST /admin/companies  (créer une entreprise)
    // ══════════════════════════════════════════════════════════
    if (path === '/admin/companies' && method === 'POST') {
      const sa = await requireSuperAdmin(request, env);
      if (!sa) return errRes('Non autorisé', 401, cors);

      const body = await parseBody(request);
      if (!body) return errRes('JSON invalide', 400, cors);
      const { name, ice, city, address, phone, email, plan = 'pro', max_users = 10, subscription_end } = body;
      if (!name) return errRes('name requis', 400, cors);

      const now = new Date().toISOString();
      const res = await sb(env, 'companies', 'POST', {
        name, ice, city, address, phone, email,
        plan, max_users, subscription_end,
        status: 'active',
        created_at: now, updated_at: now,
      }, { 'Prefer': 'return=representation' });

      if (!res.ok) return errRes('Erreur création entreprise : ' + JSON.stringify(res.data), 500, cors);
      const company = Array.isArray(res.data) ? res.data[0] : res.data;
      return jsonRes({ success: true, company }, 201, cors);
    }

    // ══════════════════════════════════════════════════════════
    //  PUT /admin/companies/:id  (modifier une entreprise)
    // ══════════════════════════════════════════════════════════
    if (seg[0] === 'admin' && seg[1] === 'companies' && seg[2] && method === 'PUT') {
      const sa = await requireSuperAdmin(request, env);
      if (!sa) return errRes('Non autorisé', 401, cors);

      const companyId = seg[2];
      const body = await parseBody(request);
      if (!body) return errRes('JSON invalide', 400, cors);

      const allowed = ['name','ice','city','address','phone','email','plan','max_users','subscription_end','status','logo_url'];
      const updates = { updated_at: new Date().toISOString() };
      allowed.forEach(k => { if (body[k] !== undefined) updates[k] = body[k]; });

      const res = await sb(env,
        `companies?id=eq.${companyId}`,
        'PATCH', updates,
        { 'Prefer': 'return=representation' }
      );

      if (!res.ok) return errRes('Erreur mise à jour entreprise', 500, cors);
      const company = Array.isArray(res.data) ? res.data[0] : res.data;
      return jsonRes({ success: true, company }, 200, cors);
    }

    // ══════════════════════════════════════════════════════════
    //  PATCH /admin/companies/:id/status
    // ══════════════════════════════════════════════════════════
    if (seg[0] === 'admin' && seg[1] === 'companies' && seg[2] && seg[3] === 'status' && method === 'PATCH') {
      const sa = await requireSuperAdmin(request, env);
      if (!sa) return errRes('Non autorisé', 401, cors);

      const companyId = seg[2];
      const body = await parseBody(request);
      const status = body?.status;
      if (!['active','suspended','blocked'].includes(status)) {
        return errRes('status invalide (active|suspended|blocked)', 400, cors);
      }

      const res = await sb(env,
        `companies?id=eq.${companyId}`,
        'PATCH', { status, updated_at: new Date().toISOString() },
        { 'Prefer': 'return=representation' }
      );

      return jsonRes({ success: true, status }, 200, cors);
    }

    // ══════════════════════════════════════════════════════════
    //  404
    // ══════════════════════════════════════════════════════════
    return errRes(`Route introuvable : ${method} ${path}`, 404, cors);
  },
};
