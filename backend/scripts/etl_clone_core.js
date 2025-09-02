import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const { Pool } = pkg;

function env(name, required = false) {
  const v = process.env[name];
  if (required && !v) throw new Error(`${name} is required`);
  return v;
}

const SOURCE = env('SOURCE_DATABASE_URL', false) || env('DATABASE_URL', true);
const TARGET = env('TARGET_DATABASE_URL', true);

const sslFor = (url) => (url.includes('render.com') || /https:\/\//i.test(url) ? { rejectUnauthorized: false } : false);

const sourcePool = new Pool({ connectionString: SOURCE, ssl: sslFor(SOURCE) });
const targetPool = new Pool({ connectionString: TARGET, ssl: sslFor(TARGET) });

async function getColumns(pool, table) {
  const { rows } = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
    [table]
  );
  return rows.map(r => r.column_name);
}

async function getCount(pool, table) {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS c FROM ${table}`);
  return Number(rows[0]?.c || 0);
}

async function copyTable(table, key = 'id') {
  const srcCols = await getColumns(sourcePool, table);
  const dstCols = await getColumns(targetPool, table);
  const cols = srcCols.filter(c => dstCols.includes(c));
  if (cols.length === 0) {
    console.log(`[SKIP] ${table}: no overlapping columns`);
    return;
  }
  const dstCount = await getCount(targetPool, table);
  if (dstCount > 0) {
    console.log(`[SKIP] ${table}: target not empty (${dstCount} rows)`);
    return;
  }
  console.log(`[COPY] ${table}: columns (${cols.length})`);
  const page = 1000;
  let offset = 0;
  // Try key-sorted pagination; fallback to offset if key missing
  const hasKey = cols.includes(key);
  let lastId = 0;
  while (true) {
    let sql = `SELECT ${cols.map(c => '"' + c.replace(/"/g, '""') + '"').join(', ')} FROM ${table}`;
    const params = [];
    if (hasKey) {
      sql += ` WHERE ${key} > $1 ORDER BY ${key} ASC LIMIT ${page}`;
      params.push(lastId);
    } else {
      sql += ` ORDER BY 1 LIMIT ${page} OFFSET ${offset}`;
    }
    const src = await sourcePool.query(sql, params);
    if (src.rows.length === 0) break;
    const placeholders = (row) => cols.map((_, i) => `$${i + 1}`);
    const insertSql = `INSERT INTO ${table} (${cols.map(c => '"' + c.replace(/"/g, '""') + '"').join(',')}) VALUES (${placeholders(src.rows[0]).join(',')})`;
    for (const r of src.rows) {
      const values = cols.map(c => r[c]);
      await targetPool.query(insertSql, values);
      if (hasKey) lastId = Math.max(lastId, Number(r[key] || 0));
    }
    if (!hasKey) offset += src.rows.length;
    console.log(`  … ${hasKey ? `<= id ${lastId}` : `${offset} rows`} copied`);
  }
  console.log(`[DONE] ${table}`);
}

async function main() {
  console.log('ETL Clone starting…');
  console.log('Source =', SOURCE.replace(/:\/\/[\w-]+:[^@]+@/, '://***:***@'));
  console.log('Target =', TARGET.replace(/:\/\/[\w-]+:[^@]+@/, '://***:***@'));

  const ordered = [
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

  for (const t of ordered) {
    try {
      await copyTable(t);
    } catch (e) {
      console.warn(`[WARN] Failed copying ${t}:`, e?.message || e);
    }
  }

  console.log('ETL Clone complete.');
}

main()
  .catch((e) => { console.error('ETL error:', e?.message || e); process.exit(1); })
  .finally(async () => { await sourcePool.end(); await targetPool.end(); });
