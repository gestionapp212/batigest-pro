/**
 * GestionApp 212 — Script de création du superadmin initial
 * Utilisation : node seed.js
 * Puis copier le SQL généré dans : wrangler d1 execute gestapp-db --command="..."
 *
 * Ou utiliser directement la route /auth/setup (première fois seulement)
 */

// Simulation PBKDF2 côté Node.js pour générer le hash compatible avec le Worker
const crypto = require('crypto');

async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16);
    const saltHex = salt.toString('hex');
    crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${saltHex}:${derivedKey.toString('hex')}`);
    });
  });
}

async function main() {
  const email    = 'said.hamdaoui1984@gmail.com';
  const password = process.argv[2] || 'MotDePasse2025!'; // Passer le mdp en argument
  const name     = 'Said Hamdaoui';
  const id       = 'superadmin-001';

  const hash = await hashPassword(password);
  const now  = new Date().toISOString();

  console.log('\n=== SQL à exécuter dans Cloudflare D1 ===\n');
  console.log(`-- 1. Créer le superadmin`);
  console.log(`INSERT OR REPLACE INTO platform_users (id, email, password_hash, full_name, role, is_active, can_create_users, app_access, module_permissions, twofa_enabled, created_at, updated_at)`);
  console.log(`VALUES ('${id}', '${email}', '${hash}', '${name}', 'superadmin', 1, 1, '[]', '{}', 0, '${now}', '${now}');`);
  console.log('\n✅ Copiez ce SQL et exécutez-le dans :');
  console.log('   wrangler d1 execute gestapp-db --command="..." --remote');
  console.log('   OU Cloudflare Dashboard → D1 → gestapp-db → Console');
  console.log('\n📝 Email    :', email);
  console.log('🔑 Password :', password);
  console.log('⚠️  Changez ce mot de passe après la première connexion!\n');
}

main().catch(console.error);
