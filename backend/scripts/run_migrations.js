import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');

// Load environment variables from backend/.env for local runs
dotenv.config({ path: path.join(backendDir, '.env') });

function findSqlFiles() {
  const out = [];
  const collect = (dir) => {
    try {
      const files = fs.readdirSync(dir);
      const migrates = files.filter(f => /^migrate_.*\.sql$/i.test(f)).map(f => path.join(dir, f));
      out.push(...migrates);
    } catch {}
  };
  // init.sql only from backend root
  try {
    if (fs.existsSync(path.join(backendDir, 'init.sql'))) out.push(path.join(backendDir, 'init.sql'));
  } catch {}
  // Top-level migrations
  collect(backendDir);
  // Also include migrations placed under backend/scripts
  collect(path.join(backendDir, 'scripts'));
  // De-duplicate and sort by filename (lexicographic)
  const uniq = Array.from(new Set(out));
  uniq.sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
  return uniq;
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
    const schema = process.env.MIGRATE_SCHEMA || process.env.DB_SCHEMA || process.env.SCHEMA;
    if (schema && schema !== 'public') {
      if (!/^[_a-zA-Z][_a-zA-Z0-9]*$/.test(schema)) throw new Error('Invalid schema name');
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema.replace(/"/g, '""')}"`);
      await client.query(`SET search_path TO "${schema.replace(/"/g, '""')}", public`);
      console.log(`Search path set to schema ${schema}`);
    }
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
