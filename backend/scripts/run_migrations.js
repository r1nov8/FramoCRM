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
  // De-duplicate
  const uniq = Array.from(new Set(out));
  // Sort by date token if present, with custom priority to satisfy dependencies
  const priorityOf = (name) => {
    const n = name.toLowerCase();
    if (n.includes('add_user_role')) return 0; // must come before scripts that depend on role
    if (n.includes('add_user_names')) return 1;
    if (n.includes('add_admin_users')) return 2;
    return 5;
  };
  const keyOf = (p) => {
    const base = path.basename(p);
    const m = base.match(/^migrate_(\d{8})_/i);
    const dateKey = m ? m[1] : '00000000';
    return { base, dateKey, pri: priorityOf(base) };
  };
  uniq.sort((a, b) => {
    const ka = keyOf(a);
    const kb = keyOf(b);
    if (ka.dateKey !== kb.dateKey) return ka.dateKey.localeCompare(kb.dateKey);
    if (ka.pri !== kb.pri) return ka.pri - kb.pri;
    return ka.base.localeCompare(kb.base);
  });
  return uniq;
}

async function run() {
  let databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required to run migrations.');
    process.exit(1);
  }
  // Normalize scheme for node-postgres
  if (databaseUrl.startsWith('postgresql://')) {
    databaseUrl = 'postgres://' + databaseUrl.slice('postgresql://'.length);
  }
  const lower = databaseUrl.toLowerCase();
  const needsSsl = /sslmode=require/.test(lower) || /postgres\.database\.azure\.com/.test(lower) || /render\.com/.test(lower);
  const pool = new Pool({ connectionString: databaseUrl, ssl: needsSsl ? { rejectUnauthorized: false } : false });
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
