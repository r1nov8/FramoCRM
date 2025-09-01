import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load backend/.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function q(text, params) {
  const { rows } = await pool.query(text, params);
  return rows;
}

async function tableExists(name) {
  const rows = await q(`select to_regclass($1)::text as exists`, [name]);
  return rows[0]?.exists !== null;
}

async function main() {
  console.log('=== DB SCHEMA SNAPSHOT ===');
  const dbInfo = await q(`select current_database() db, current_user usr`);
  console.log('DB:', dbInfo[0]);

  // Tables and estimated row counts
  const tables = await q(`
    select t.tablename as table, coalesce(c.reltuples::bigint,0) as est_rows
    from pg_tables t
    left join pg_class c on c.relname = t.tablename and t.schemaname='public'
    where t.schemaname='public'
    order by t.tablename;
  `);
  console.log('\nTables (estimated rows):');
  tables.forEach(r => console.log(`- ${r.table}: ~${r.est_rows}`));

  // Columns (first 2000)
  const cols = await q(`
    select table_name, column_name, data_type, is_nullable, column_default
    from information_schema.columns
    where table_schema='public'
    order by table_name, ordinal_position
    limit 2000;
  `);
  console.log('\nColumns (first 2000):');
  for (const c of cols) {
    console.log(`- ${c.table_name}.${c.column_name} :: ${c.data_type} ${c.is_nullable === 'NO' ? 'NOT NULL' : ''} ${c.column_default ? 'default ' + c.column_default : ''}`);
  }

  // Primary keys
  const pks = await q(`
    select tc.table_name, kc.column_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kc
      on kc.constraint_name = tc.constraint_name
     and kc.table_name = tc.table_name
    where tc.constraint_type='PRIMARY KEY'
    order by tc.table_name, kc.ordinal_position;
  `);
  console.log('\nPrimary Keys:');
  pks.forEach(r => console.log(`- ${r.table_name}.${r.column_name}`));

  // Foreign keys
  const fks = await q(`
    select
      tc.table_name as tbl,
      kcu.column_name as col,
      ccu.table_name as ref_table,
      ccu.column_name as ref_column,
      rc.update_rule as on_update,
      rc.delete_rule as on_delete
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
    join information_schema.referential_constraints rc
      on rc.constraint_name = tc.constraint_name
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = rc.unique_constraint_name
    where tc.constraint_type='FOREIGN KEY'
    order by tbl, col;
  `);
  console.log('\nForeign Keys:');
  fks.forEach(r => console.log(`- ${r.tbl}.${r.col} -> ${r.ref_table}.${r.ref_column} (on update ${r.on_update}, on delete ${r.on_delete})`));

  // Indexes (non-PK)
  const idx = await q(`
    select
      t.relname as table,
      i.relname as index,
      pg_get_indexdef(ix.indexrelid) as definition,
      ix.indisunique as unique
    from pg_class t
    join pg_index ix on t.oid = ix.indrelid
    join pg_class i on i.oid = ix.indexrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname='public' and ix.indisprimary = false
    order by t.relname, i.relname;
  `);
  console.log('\nIndexes:');
  idx.forEach(r => console.log(`- ${r.table}.${r.index} ${r.unique ? '(unique)' : ''}: ${r.definition}`));

  // Enums
  const enums = await q(`
    select n.nspname as schema, t.typname as enum_name, e.enumlabel as label
    from pg_type t
    join pg_enum e on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname='public'
    order by enum_name, e.enumsortorder;
  `);
  if (enums.length) {
    console.log('\nEnums:');
    enums.forEach(e => console.log(`- ${e.enum_name}: ${e.label}`));
  }

  // Quick presence checks for key CRM entities
  const candidates = ['companies','contacts','users','projects','deals','project_estimates','estimate_items','products','product_catalog','project_files','quotes','activities','team_members'];
  console.log('\nTables present:');
  for (const t of candidates) {
    console.log(`- ${t}: ${await tableExists(t) ? 'YES' : 'no'}`);
  }

  await pool.end();
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
