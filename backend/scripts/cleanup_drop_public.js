#!/usr/bin/env node
/*
 Drop old public schema tables/views/sequences safely after migrating to DB_SCHEMA=green.
 - DRY_RUN=true prints the objects and SQL, does nothing.
 - To execute, set CONFIRM_DROP_PUBLIC=YES.
 - Preserves extensions and non-table objects; only drops views, tables, sequences in public.
*/
import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DRY_RUN = String(process.env.DRY_RUN || 'true').toLowerCase() !== 'false';
const CONFIRM = String(process.env.CONFIRM_DROP_PUBLIC || '').toUpperCase() === 'YES';

function log(...args) { console.log('[drop-public]', ...args); }
function err(...args) { console.error('[drop-public]', ...args); }

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  });
  const client = await pool.connect();
  try {
    const sp = await client.query("SELECT current_setting('search_path') AS search_path, current_schema() AS current_schema");
    log('connected. search_path =', sp.rows[0]?.search_path, 'current_schema =', sp.rows[0]?.current_schema);
    if (!/\bgreen\b/i.test(String(process.env.DB_SCHEMA || process.env.SCHEMA || ''))) {
      log('Warning: DB_SCHEMA env is not set to green in this process; proceeding anyway since we address public explicitly.');
    }

    const views = await client.query(`SELECT schemaname, viewname FROM pg_views WHERE schemaname = 'public' ORDER BY 1,2`);
    const tables = await client.query(`SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1,2`);
    const seqs = await client.query(`SELECT schemaname, sequencename FROM pg_sequences WHERE schemaname = 'public' ORDER BY 1,2`);
    const matviews = await client.query(`SELECT schemaname, matviewname FROM pg_matviews WHERE schemaname = 'public' ORDER BY 1,2`);

    const stmts = [];
    for (const r of matviews.rows) stmts.push(`DROP MATERIALIZED VIEW IF EXISTS public."${r.matviewname.replace(/"/g,'""')}" CASCADE;`);
    for (const r of views.rows) stmts.push(`DROP VIEW IF EXISTS public."${r.viewname.replace(/"/g,'""')}" CASCADE;`);
    for (const r of tables.rows) stmts.push(`DROP TABLE IF EXISTS public."${r.tablename.replace(/"/g,'""')}" CASCADE;`);
    for (const r of seqs.rows) stmts.push(`DROP SEQUENCE IF EXISTS public."${r.sequencename.replace(/"/g,'""')}" CASCADE;`);

    log('Objects found in public:', {
      materializedViews: matviews.rowCount,
      views: views.rowCount,
      tables: tables.rowCount,
      sequences: seqs.rowCount,
    });
    if (!stmts.length) {
      log('Nothing to drop in public.');
      return;
    }
    if (DRY_RUN || !CONFIRM) {
      log('DRY_RUN or not confirmed. Planned statements:');
      for (const s of stmts) console.log(s);
      if (!CONFIRM) {
        log('To execute, run with CONFIRM_DROP_PUBLIC=YES (you can also set DRY_RUN=false).');
      }
      return;
    }
    await client.query('BEGIN');
    for (const s of stmts) {
      log('EXEC:', s);
      await client.query(s);
    }
    await client.query('COMMIT');
    log('Drop complete.');
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    err('Failed:', e?.message || e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
