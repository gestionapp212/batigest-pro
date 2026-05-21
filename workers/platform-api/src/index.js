/**
 * ═══════════════════════════════════════════════════════════════
 *  PLATFORM API — Cloudflare Worker v5.0
 *  Remplace les Netlify Functions pour la création d'utilisateurs
 *  Utilise Supabase Admin API (service_role)
 * ═══════════════════════════════════════════════════════════════
 *
 *  Variables d'environnement requises (wrangler secret put ...):
 *    SUPABASE_URL           = https://mfyhktnzjodaqfocupcn.supabase.co
 *    SUPABASE_SERVICE_ROLE  = eyJ... (service role key)
 *    JWT_SECRET             = (clé aléatoire forte)
 *    SUPERADMIN_EMAIL       = said.hamdaoui1984@gmail.com
 *    ALLOWED_ORIGINS        = https://admin.VOTRE-DOMAINE.com,https://gestapp212.VOTRE-DOMAINE.com
 */

const CORS_HEADERS = (origin, env) => {
  const allowed = (env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());
  const allowedOrigin = allowed.includes(origin) ? origin : allowed[0] || '*';
  return {
    'Access-Control-Allow-Origin':  allowedOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Max-Age':       '86400',
  };
};

function json(data, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function err(msg, status = 400, corsHeaders = {}) {
  return json({ error: msg }, status, corsHeaders);
}

// ── Supabase Admin API helper ────────────────────────────────
async function sbAdmin(env, path, method = 'GET', body = null) {
  const url = `${env.SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    'Content-Type':  'application/json',
    'apikey':        env.SUPABASE_SERVICE_ROLE,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    'Prefer':        'return=representation',
  };
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, data: text }; }
}

// ── Supabase Auth Admin ──────────────────────────────────────
async function sbAuthAdmin(env, path, method = 'GET', body = null) {
  const url = `${env.SUPABASE_URL}/auth/v1/admin/${path}`;
  const headers = {
    'Content-Type':  'application/json',
    'apikey':        env.SUPABASE_SERVICE_ROLE,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
  };
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, data: text }; }
}

// ── JWT Verification (Supabase JWT) ─────────────────────────
async function verifySupabaseToken(token, env) {
  try {
    // Vérifier via Supabase Auth
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey':        env.SUPABASE_SERVICE_ROLE,
        'Authorization': `Bearer ${token}`,
      }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function requireSuperAdmin(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;
  const user = await verifySupabaseToken(token, env);
  if (!user) return null;
  const email = user.email?.toLowerCase();
  if (email === env.SUPERADMIN_EMAIL?.toLowerCase()) return user;
  // Vérifier en base
  const { data } = await sbAdmin(env, `platform_users?id=eq.${user.id}&select=role`);
  if (Array.isArray(data) && data[0]?.role === 'superadmin') return user;
  return null;
}

// ═══════════════════════════════════════════════════════════════
//  ROUTER
// ═══════════════════════════════════════════════════════════════
export default {
  async fetch(request, env) {
    const origin  = request.headers.get('Origin') || '*';
    const cors    = CORS_HEADERS(origin, env);
    const url     = new URL(request.url);
    const path    = url.pathname;
    const method  = request.method;

    // OPTIONS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // Health check
    if (path === '/health' || path === '/') {
      return json({ status: 'ok', version: '5.0', service: 'Platform API' }, 200, cors);
    }

    // ── /admin/create-user ───────────────────────────────────
    if (path === '/admin/create-user' && method === 'POST') {
      const sa = await requireSuperAdmin(request, env);
      if (!sa) return err('Non autorisé — SuperAdmin requis', 401, cors);

      let body;
      try { body = await request.json(); } catch { return err('JSON invalide', 400, cors); }

      const { email, password, full_name, role = 'admin', app_access = [], company_id = null, plan = 'pro' } = body;
      if (!email || !password) return err('email et password requis', 400, cors);

      // Créer l'utilisateur dans Supabase Auth (service_role)
      const authRes = await sbAuthAdmin(env, 'users', 'POST', {
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role }
      });

      if (!authRes.ok) {
        const msg = authRes.data?.msg || authRes.data?.message || 'Erreur création Auth';
        if (msg.includes('already registered') || authRes.status === 422) {
          return err('Cet email est déjà enregistré', 409, cors);
        }
        return err(msg, authRes.status, cors);
      }

      const userId = authRes.data.id;
      const now    = new Date().toISOString();

      // Insérer dans platform_users
      const dbRes = await sbAdmin(env, 'platform_users', 'POST', {
        id: userId, email, full_name, role, app_access, company_id, plan,
        is_active: true, can_create_users: false,
        created_at: now, updated_at: now
      });

      if (!dbRes.ok) {
        return err('Utilisateur Auth créé mais erreur BDD : ' + JSON.stringify(dbRes.data), 500, cors);
      }

      return json({ success: true, user: { id: userId, email, full_name, role } }, 201, cors);
    }

    // ── /admin/repair-user ───────────────────────────────────
    if (path === '/admin/repair-user' && method === 'POST') {
      const sa = await requireSuperAdmin(request, env);
      if (!sa) return err('Non autorisé', 401, cors);

      let body;
      try { body = await request.json(); } catch { return err('JSON invalide', 400, cors); }
      const { userId, email, role = 'admin', app_access = ['gestapp'] } = body;

      const now = new Date().toISOString();
      // Upsert platform_users
      await sbAdmin(env, 'platform_users', 'POST', {
        id: userId, email, role, app_access, is_active: true,
        created_at: now, updated_at: now
      });
      // Upsert profiles
      await sbAdmin(env, 'profiles', 'POST', {
        id: userId, email, role, is_active: true, updated_at: now
      });

      return json({ success: true, repaired: email }, 200, cors);
    }

    // ── /admin/delete-user ───────────────────────────────────
    if (path.startsWith('/admin/delete-user/') && method === 'DELETE') {
      const sa = await requireSuperAdmin(request, env);
      if (!sa) return err('Non autorisé', 401, cors);

      const userId = path.split('/').pop();
      // Supprimer de Auth
      await sbAuthAdmin(env, `users/${userId}`, 'DELETE');
      // Supprimer de platform_users (cascade supprimera profiles)
      await sbAdmin(env, `platform_users?id=eq.${userId}`, 'DELETE');

      return json({ success: true, deleted: userId }, 200, cors);
    }

    // ── /admin/list-users ────────────────────────────────────
    if (path === '/admin/list-users' && method === 'GET') {
      const sa = await requireSuperAdmin(request, env);
      if (!sa) return err('Non autorisé', 401, cors);

      const res = await sbAdmin(env, 'platform_users?select=*,companies(id,name,plan)&order=created_at.desc');
      return json(res.data, res.status, cors);
    }

    // ── /admin/stats ─────────────────────────────────────────
    if (path === '/admin/stats' && method === 'GET') {
      const sa = await requireSuperAdmin(request, env);
      if (!sa) return err('Non autorisé', 401, cors);

      const [usersRes, companiesRes] = await Promise.all([
        sbAdmin(env, 'platform_users?select=id,role,is_active,app_access'),
        sbAdmin(env, 'companies?select=id,name,plan,status'),
      ]);

      const users     = usersRes.data || [];
      const companies = companiesRes.data || [];

      return json({
        totalUsers:    users.length,
        activeUsers:   users.filter(u => u.is_active).length,
        adminUsers:    users.filter(u => u.role === 'admin').length,
        totalCompanies: companies.length,
        byApp: {
          gestapp: users.filter(u => u.app_access?.includes('gestapp')).length,
          famille: users.filter(u => u.app_access?.includes('famille')).length,
          calcul:  users.filter(u => u.app_access?.includes('calcul')).length,
        }
      }, 200, cors);
    }

    // ── /admin/test ──────────────────────────────────────────
    if (path === '/admin/test' && method === 'POST') {
      const sa = await requireSuperAdmin(request, env);
      return json({
        ok: true,
        authenticated: !!sa,
        superAdminEmail: env.SUPERADMIN_EMAIL,
        supabaseConfigured: !!env.SUPABASE_URL && !!env.SUPABASE_SERVICE_ROLE,
        version: '5.0'
      }, 200, cors);
    }

    return err('Route non trouvée', 404, cors);
  }
};
