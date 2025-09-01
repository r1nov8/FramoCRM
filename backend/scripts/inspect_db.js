import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';

const { Pool } = pkg;

// Load backend/.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to backend/.env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('render.com') || /sslmode=require/.test(DATABASE_URL)
    ? { rejectUnauthorized: false }
    : false,
});

function maskConn(cs) {
  try {
    const u = new URL(cs);
    if (u.password) u.password = '****';
    return u.toString();
  } catch {
    return cs;
  }
}

async function getTables(client) {
  const { rows } = await client.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`
  );
  return rows.map(r => r.table_name);
}

async function getColumns(client, table) {
  const { rows } = await client.query(
    `SELECT column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table]
  );
  return rows;
}

async function getConstraints(client, table) {
  const sql = `
    SELECT
      tc.constraint_type,
      kcu.column_name,
      ccu.table_name AS foreign_table,
      ccu.column_name AS foreign_column
    FROM information_schema.table_constraints AS tc
    LEFT JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'public' AND tc.table_name = $1
    ORDER BY tc.constraint_type, kcu.ordinal_position`;
  const { rows } = await client.query(sql, [table]);
  const pk = rows.filter(r => r.constraint_type === 'PRIMARY KEY').map(r => r.column_name);
  const fks = rows
    .filter(r => r.constraint_type === 'FOREIGN KEY')
    .map(r => ({ column: r.column_name, references: { table: r.foreign_table, column: r.foreign_column } }));
  return { primaryKey: pk, foreignKeys: fks };
}

async function getCount(client, table) {
  const { rows } = await client.query(`SELECT COUNT(*)::int AS c FROM ${table}`);
  return rows[0]?.c ?? 0;
}

async function getSample(client, table, limit = 5) {
  // Try to order by id desc if id column exists
  const hasId = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name='id'`,
    [table]
  );
  const order = hasId.rowCount ? 'ORDER BY id DESC' : '';
  const { rows } = await client.query(`SELECT * FROM ${table} ${order} LIMIT ${limit}`);
  return rows;
}

async function main() {
  const client = await pool.connect();
  try {
    const tables = await getTables(client);
    const report = { db: maskConn(DATABASE_URL), generatedAt: new Date().toISOString(), tables: {} };
    for (const t of tables) {
      const [columns, constraints, count, sample] = await Promise.all([
        getColumns(client, t),
        getConstraints(client, t),
        getCount(client, t),
        getSample(client, t),
      ]);
      report.tables[t] = { columns, constraints, rowCount: count, sampleRows: sample };
    }
    console.log(JSON.stringify(report, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Inspection failed:', err);
  process.exit(1);
});

