#!/usr/bin/env node
/*
 Compare row counts between two schemas to validate a schema backup/clone.
 Usage:
   SRC=public DST=public_bak_20250902 node scripts/compare_schema_counts.js
 or with npm script:
   npm run verify:schema-counts --SRC=public --DST=public_bak_20250902
*/
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const { Pool } = pkg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const SRC = process.env.SRC || process.env.SOURCE_SCHEMA || 'public';
const DST = process.env.DST || process.env.TARGET_SCHEMA || process.env.DB_SCHEMA || 'green';

function validSchema(name) { return /^[_a-zA-Z][_a-zA-Z0-9]*$/.test(name); }
if (!validSchema(SRC) || !validSchema(DST)) {
  console.error('Invalid schema name.');
  process.exit(1);
}

const tables = [
  'users',
  'companies',
  'contacts',
  'team_members',
  'projects',
  'products',
  'project_line_items',
  'project_estimates',
  'project_members',
  'tasks',
  'activities',
  'activity_reads',
  'project_files',
  'market_intel',
  'leads',
];

function qi(x) { return '"' + String(x).replace(/"/g, '""') + '"'; }

async function count(client, schema, table) {
  try {
    const { rows } = await client.query(`SELECT COUNT(*)::int AS c FROM ${qi(schema)}.${qi(table)}`);
    return Number(rows[0]?.c || 0);
  } catch (e) {
    return null; // table missing
  }
}

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false });
  const client = await pool.connect();
  try {
    const out = [];
    for (const t of tables) {
      const a = await count(client, SRC, t);
      const b = await count(client, DST, t);
      out.push({ table: t, [SRC]: a, [DST]: b, diff: (a == null || b == null) ? null : (b - a) });
    }
    console.log(JSON.stringify({ src: SRC, dst: DST, tables: out }, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error('compare-schema-counts error:', e?.message || e); process.exit(1); });
