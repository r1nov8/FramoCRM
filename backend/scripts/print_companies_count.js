import dotenv from 'dotenv';
import pkg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pkg;

const conn = process.env.DATABASE_URL || 'postgres://crmuser:crmpassword@localhost:5432/crmdb';
const pool = new Pool({
  connectionString: conn,
  ssl: conn.includes('render.com') ? { rejectUnauthorized: false } : false,
});

const mask = (url) => {
  try {
    const u = new URL(url);
    const maskedAuth = u.username ? `${u.username.replace(/./g,'*')}:${u.password ? u.password.replace(/./g,'*') : ''}@` : '';
    return `${u.protocol}//${maskedAuth}${u.host}${u.pathname}`;
  } catch { return 'unknown'; }
};

async function main() {
  const client = await pool.connect();
  try {
    const { rows: cnt } = await client.query('SELECT COUNT(*)::int AS c FROM companies');
    const { rows } = await client.query('SELECT * FROM companies ORDER BY id DESC LIMIT 1');
    const out = {
      db: mask(conn),
      companies_count: cnt[0]?.c ?? 0,
      sample_row_keys: rows[0] ? Object.keys(rows[0]) : []
    };
    console.log(JSON.stringify(out, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
