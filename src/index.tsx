import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import { cors } from 'hono/cors'

const app = new Hono()

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
  <link href="/static/style.css" rel="stylesheet"/>
</head>
<body class="bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
  <div id="root"></div>
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
  <link href="/static/style.css" rel="stylesheet"/>
</head>
<body class="bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
  <div id="root"></div>
  <script src="/static/superadmin.js"></script>
</body>
</html>`
}

export default app
