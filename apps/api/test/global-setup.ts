export default async function setup() {
  if (!/_test\b/.test(process.env.DATABASE_URL ?? '')) {
    throw new Error('Refusing to run tests against a database whose name does not end in _test.');
  }
  const { resetDatabase } = await import('../src/db/reset.js');
  const { pool } = await import('../src/db/client.js');
  await resetDatabase();
  await pool.end();
}
