#!/usr/bin/env node
/*
 Create an in-database backup of the public schema by cloning tables (and sequence values)
 to a new schema. Works on Render free tier (no snapshots required).

 Env:
 - DATABASE_URL: connection string
 - BACKUP_SCHEMA: destination schema name (default: public_bak_YYYYMMDD)
 - DRY_RUN=true to preview only

 What it does:
 - CREATE SCHEMA <backup>
 - For each base table in public: CREATE TABLE <backup>.<table> AS SELECT * FROM public.<table>
   (data only; constraints/indexes are not copied — sufficient for restore/export)
 - Copies sequences with current values into <backup>
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

function tsName() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

const BACKUP_SCHEMA = process.env.BACKUP_SCHEMA || `public_bak_${tsName()}`;
const DRY_RUN = String(process.env.DRY_RUN || 'false').toLowerCase() === 'true';

function qi(x) { return '"' + String(x).replace(/"/g, '""') + '"'; }
function validSchema(name) { return /^[_a-zA-Z][_a-zA-Z0-9]*$/.test(name); }
if (!validSchema(BACKUP_SCHEMA)) {
  console.error('Invalid BACKUP_SCHEMA name');
  process.exit(1);
}

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false });
  const client = await pool.connect();
  try {
    const { rows: exists } = await client.query('SELECT 1 FROM information_schema.schemata WHERE schema_name=$1', [BACKUP_SCHEMA]);
    if (exists.length) {
      console.error(`Backup schema already exists: ${BACKUP_SCHEMA}`);
      process.exit(2);
    }
    const tablesRes = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1`);
    const seqRes = await client.query(`SELECT sequencename FROM pg_sequences WHERE schemaname='public' ORDER BY 1`);
    const tables = tablesRes.rows.map(r => r.table_name);
    const sequences = seqRes.rows.map(r => r.sequencename);
    console.log(`[plan] create schema ${BACKUP_SCHEMA}; copy ${tables.length} tables; ${sequences.length} sequences.`);

    const stmts = [];
    stmts.push(`CREATE SCHEMA ${qi(BACKUP_SCHEMA)};`);
    for (const t of tables) {
      const src = `public.${qi(t)}`;
      const dst = `${qi(BACKUP_SCHEMA)}.${qi(t)}`;
      // Data-only copy is fast and simple for backup
      stmts.push(`CREATE TABLE ${dst} AS TABLE ${src};`);
    }
    for (const s of sequences) {
      const srcSeq = `public.${qi(s)}`;
      const dstSeq = `${qi(BACKUP_SCHEMA)}.${qi(s)}`;
      stmts.push(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='S' AND n.nspname='${BACKUP_SCHEMA}' AND c.relname='${s.replace(/'/g, "''")}') THEN CREATE SEQUENCE ${dstSeq}; END IF; END $$;`);
      stmts.push(`SELECT setval('${dstSeq}', (SELECT last_value FROM ${srcSeq}), true);`);
    }

    if (DRY_RUN) {
      for (const s of stmts) console.log(s);
      return;
    }

    await client.query('BEGIN');
    for (const s of stmts) {
      await client.query(s);
    }
    await client.query('COMMIT');
    console.log(`Backup complete: ${BACKUP_SCHEMA}`);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('backup_public_to_schema error:', e?.message || e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
