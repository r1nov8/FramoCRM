import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const { Pool } = pkg;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}
const pool = new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false });

async function main() {
  const y = new Date().getFullYear();
  await pool.query(`CREATE TABLE IF NOT EXISTS doc_numbers (prefix TEXT NOT NULL, year INT NOT NULL, next INT NOT NULL DEFAULT 1, PRIMARY KEY(prefix, year))`);
  const prefixes = ['OPP', 'PRJ'];
  for (const p of prefixes) {
    await pool.query(`INSERT INTO doc_numbers(prefix, year, next) VALUES ($1, $2, 1) ON CONFLICT (prefix, year) DO NOTHING`, [p, y]);
  }
  console.log('Seeded doc_numbers for', y);
}

main().catch(e => { console.error(e?.message || e); process.exit(1); }).finally(async () => { await pool.end(); });
