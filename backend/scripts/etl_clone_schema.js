import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const { Pool } = pkg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const SOURCE_SCHEMA = process.env.SOURCE_SCHEMA || process.env.SRC_SCHEMA || 'public';
const TARGET_SCHEMA = process.env.TARGET_SCHEMA || process.env.DB_SCHEMA || process.env.SCHEMA || 'green';

function validSchema(name) {
  return /^[_a-zA-Z][_a-zA-Z0-9]*$/.test(name);
}
if (!validSchema(SOURCE_SCHEMA) || !validSchema(TARGET_SCHEMA)) {
  console.error('Invalid schema name.');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false });

const orderedTables = [
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

function qident(id) { return '"' + String(id).replace(/"/g, '""') + '"'; }

async function getColumns(client, schema, table) {
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position`,
    [schema, table]
  );
  return rows.map(r => r.column_name);
}

async function countRows(client, schema, table) {
  const { rows } = await client.query(`SELECT COUNT(*)::int AS c FROM ${qident(schema)}.${qident(table)}`);
  return Number(rows[0]?.c || 0);
}

async function tableExists(client, schema, table) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2 LIMIT 1`,
    [schema, table]
  );
  return rows.length > 0;
}

async function maxId(client, schema, table) {
  try {
    const { rows } = await client.query(`SELECT MAX(id)::bigint AS mx FROM ${qident(schema)}.${qident(table)}`);
    return rows[0]?.mx ? Number(rows[0].mx) : 0;
  } catch { return 0; }
}

async function fixSequence(client, schema, table) {
  try {
    const { rows } = await client.query(`SELECT pg_get_serial_sequence($1, 'id') AS seq`, [`${schema}.${table}`]);
    const seq = rows[0]?.seq;
    if (!seq) return;
    const mx = await maxId(client, schema, table);
    const next = (mx || 0) + 1;
    await client.query(`SELECT setval($1, $2, false)`, [seq, next]);
  } catch (e) {
    // ignore
  }
}

async function copyTable(client, table) {
  const src = SOURCE_SCHEMA, dst = TARGET_SCHEMA;
  if (!(await tableExists(client, dst, table))) {
    console.log(`[SKIP] ${dst}.${table}: target table missing (run migrations first)`);
    return;
  }
  const dstCount = await countRows(client, dst, table);
  if (dstCount > 0) {
    console.log(`[SKIP] ${dst}.${table}: target has ${dstCount} rows`);
    return;
  }
  const srcCols = await getColumns(client, src, table);
  const dstCols = await getColumns(client, dst, table);
  const cols = srcCols.filter(c => dstCols.includes(c));
  if (!cols.length) {
    console.log(`[SKIP] ${table}: no overlapping columns`);
    return;
  }
  console.log(`[COPY] ${src}.${table} -> ${dst}.${table} (${cols.length} cols)`);
  const page = 1000;
  let lastId = 0;
  while (true) {
    const selectSql = `SELECT ${cols.map(qident).join(', ')} FROM ${qident(src)}.${qident(table)} WHERE id > $1 ORDER BY id ASC LIMIT ${page}`;
    const { rows } = await client.query(selectSql, [lastId]);
    if (!rows.length) break;
    const insertSql = `INSERT INTO ${qident(dst)}.${qident(table)} (${cols.map(qident).join(',')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')})`;
    for (const r of rows) {
      const vals = cols.map(c => r[c]);
      await client.query(insertSql, vals);
      if (r.id != null) lastId = Number(r.id);
    }
    console.log(`  … up to id ${lastId}`);
  }
  await fixSequence(client, dst, table);
  console.log(`[DONE] ${table}`);
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${qident(TARGET_SCHEMA)}`);
    // Do not change search_path globally; we always qualify schema in queries
    for (const t of orderedTables) {
      try { await copyTable(client, t); } catch (e) { console.warn(`[WARN] ${t}:`, e?.message || e); }
    }
    console.log('Schema clone complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error('ETL schema error:', e?.message || e); process.exit(1); });
