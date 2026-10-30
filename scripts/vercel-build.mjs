// Vercel build: compile everything, then migrate and seed the database when one is connected.
// Without DATABASE_URL the site still deploys; the API answers 503 until a database is added.
import { execSync } from 'node:child_process';

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

run('npm run build');

if (process.env.DATABASE_URL && process.env.JWT_SECRET) {
  run('npm run db:migrate');
  run('npm run db:seed');
} else {
  const missing = ['DATABASE_URL', 'JWT_SECRET'].filter((k) => !process.env[k]).join(' and ');
  console.warn(`\n⚠ ${missing} not set: skipping migrations and seed.`);
  console.warn('  The site will deploy, but the store, orders and reviews need a database.');
  console.warn('  Add one in Vercel → Storage → Neon, set JWT_SECRET, then redeploy.\n');
}
