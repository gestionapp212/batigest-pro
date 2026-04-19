import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import { cors } from 'hono/cors'

type Bindings = {
  SUPABASE_SERVICE_KEY?: string;
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())
app.use('/static/*', serveStatic({ root: './public' }))

// Route principale - SPA
app.get('/', (c) => {
  return c.redirect('/app')
})

app.get('/app', (c) => {
  return c.html(getMainHTML())
})

app.get('/super-admin', (c) => {
  return c.html(getSuperAdminHTML())
})

// API Routes
app.get('/api/health', (c) => c.json({ status: 'ok', version: '1.0.0' }))

const SUPABASE_URL = 'https://zevqmvbfmaktjkrndytw.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpldnFtdmJmbWFrdGprcm5keXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MjcwNjQsImV4cCI6MjA5MjEwMzA2NH0.4YH-9kNBDONLqSiDJEutg1dpbRTV3b1uu_DO6WnjRxE'

// ===== ROUTES ADMIN SUPABASE (service_role protégé) =====
// Ces routes nécessitent un token Super Admin valide dans le header

async function verifyUserToken(token: string): Promise<{ id: string } | null> {
  if (!token) return null
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY }
    })
    if (!res.ok) return null
    return await res.json() as { id: string }
  } catch { return null }
}

async function getUserRole(userId: string, serviceKey: string): Promise<string | null> {
  if (!userId || !serviceKey) return null
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=role`, {
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Accept': 'application/json',
      }
    })
    if (!res.ok) return null
    const profiles = await res.json() as Array<{ role: string }>
    return (Array.isArray(profiles) && profiles.length > 0) ? profiles[0].role : null
  } catch { return null }
}

// Vérifie qu'un token appartient à un super_admin (si serviceKey disponible)
// ou simplement qu'il est valide (fallback sans serviceKey)
async function verifySuperAdmin(token: string, serviceKey: string): Promise<boolean> {
  const user = await verifyUserToken(token)
  if (!user?.id) return false
  if (serviceKey) {
    const role = await getUserRole(user.id, serviceKey)
    return role === 'super_admin'
  }
  // Sans serviceKey, on vérifie avec la clé anon (RLS protège les données)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=role`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON_KEY,
        'Accept': 'application/json',
      }
    })
    if (!res.ok) return false
    const profiles = await res.json() as Array<{ role: string }>
    return Array.isArray(profiles) && profiles.length > 0 && profiles[0].role === 'super_admin'
  } catch { return false }
}

// Vérifie qu'un token appartient à un utilisateur authentifié (admin ou super_admin)
async function verifyAuthUser(token: string): Promise<boolean> {
  const user = await verifyUserToken(token)
  return !!user?.id
}

// Créer utilisateur Auth sans confirmation email (Super Admin uniquement)
app.post('/api/admin/create-user', async (c) => {
  const serviceKey = c.env?.SUPABASE_SERVICE_KEY || ''
  if (!serviceKey) {
    return c.json({ error: 'Service non configuré. Ajoutez SUPABASE_SERVICE_KEY dans les variables d\'environnement Cloudflare.' }, 503)
  }

  const authHeader = c.req.header('Authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  const isAdmin = await verifySuperAdmin(token, serviceKey)
  if (!isAdmin) return c.json({ error: 'Non autorisé' }, 403)

  const body = await c.req.json() as { email: string; password: string; metadata?: object }
  const { email, password, metadata } = body
  if (!email || !password) return c.json({ error: 'Email et mot de passe requis' }, 400)

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: metadata || {} }),
  })
  const data = await res.json() as { id?: string; message?: string; error_description?: string }
  if (!res.ok) return c.json({ error: data.message || data.error_description || 'Erreur création' }, res.status)
  return c.json({ user: data })
})

// Supprimer utilisateur Auth (Super Admin uniquement)
app.delete('/api/admin/delete-user/:userId', async (c) => {
  const serviceKey = c.env?.SUPABASE_SERVICE_KEY || ''
  if (!serviceKey) {
    return c.json({ error: 'Service non configuré. Ajoutez SUPABASE_SERVICE_KEY dans les variables d\'environnement Cloudflare.' }, 503)
  }

  const authHeader = c.req.header('Authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  const isAdmin = await verifySuperAdmin(token, serviceKey)
  if (!isAdmin) return c.json({ error: 'Non autorisé' }, 403)

  const userId = c.req.param('userId')
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
  })
  if (!res.ok) {
    const data = await res.json() as { message?: string }
    return c.json({ error: data.message || 'Erreur suppression' }, res.status)
  }
  return c.json({ success: true })
})

// Créer utilisateur par un admin de société (avec email_confirm=true, via service_role)
app.post('/api/admin/create-company-user', async (c) => {
  const serviceKey = c.env?.SUPABASE_SERVICE_KEY || ''
  if (!serviceKey) {
    return c.json({ error: 'SETUP_REQUIRED', message: 'Ajoutez SUPABASE_SERVICE_KEY dans Cloudflare Pages → Settings → Environment Variables.' }, 503)
  }

  // Vérifier que le token est valide (utilisateur authentifié, pas forcément super_admin)
  const authHeader = c.req.header('Authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  const isAuth = await verifyAuthUser(token)
  if (!isAuth) return c.json({ error: 'Token invalide ou expiré' }, 401)

  const body = await c.req.json() as { email: string; password: string }
  const { email, password } = body
  if (!email || !password) return c.json({ error: 'Email et mot de passe requis' }, 400)

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  })
  const data = await res.json() as { id?: string; message?: string; error_description?: string }
  if (!res.ok) return c.json({ error: data.message || data.error_description || 'Erreur création' }, res.status)
  return c.json({ user: data })
})

// Route pour confirmer l'email d'un utilisateur existant (valider les comptes en attente)
app.post('/api/admin/confirm-user/:userId', async (c) => {
  const serviceKey = c.env?.SUPABASE_SERVICE_KEY || ''
  if (!serviceKey) return c.json({ error: 'SETUP_REQUIRED' }, 503)
  const authHeader = c.req.header('Authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  const isAdmin = await verifySuperAdmin(token, serviceKey)
  if (!isAdmin) return c.json({ error: 'Non autorisé' }, 403)

  const userId = c.req.param('userId')
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ email_confirm: true }),
  })
  if (!res.ok) {
    const data = await res.json() as { message?: string }
    return c.json({ error: data.message || 'Erreur confirmation' }, res.status)
  }
  return c.json({ success: true })
})

function getMainHTML(): string {
  return `<!DOCTYPE html>
<html lang="fr" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>BatiGest Pro – Gestion BTP & Commerce</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏗️</text></svg>"/>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"/>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
  <link href="/static/style.css" rel="stylesheet"/>
</head>
<body class="bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
  <div id="app-root"></div>
  <script src="/static/supabase.js"></script>
  <script src="/static/pdf.js"></script>
  <script src="/static/app.js"></script>
</body>
</html>`
}

function getSuperAdminHTML(): string {
  return `<!DOCTYPE html>
<html lang="fr" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Super Admin – BatiGest Pro</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>👑</text></svg>"/>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"/>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
  <link href="/static/style.css" rel="stylesheet"/>
</head>
<body class="bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
  <div id="sa-root"></div>
  <script src="/static/supabase.js"></script>
  <script src="/static/superadmin.js"></script>
</body>
</html>`
}

export default app
