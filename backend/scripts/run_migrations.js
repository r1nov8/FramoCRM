import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');

function findSqlFiles() {
  const files = fs.readdirSync(backendDir);
  const init = files.includes('init.sql') ? ['init.sql'] : [];
  const migrates = files.filter(f => /^migrate_.*\.sql$/i.test(f)).sort();
  return [...init, ...migrates].map(f => path.join(backendDir, f));
}

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required to run migrations.');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: databaseUrl, ssl: databaseUrl.includes('render.com') ? { rejectUnauthorized: false } : false });
  const client = await pool.connect();
  try {
    const files = findSqlFiles();
    console.log(`Running ${files.length} migration file(s)...`);
    for (const file of files) {
      const sql = fs.readFileSync(file, 'utf8');
      if (!sql.trim()) continue;
      const name = path.basename(file);
      console.log(`\n--- Applying: ${name} ---`);
      await client.query(sql);
      console.log(`Applied: ${name}`);
    }
    console.log('Migrations complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Migration error:', err?.message || err);
  process.exit(1);
});
