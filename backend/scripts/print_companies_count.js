import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();
const { Pool } = pkg;

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://crmuser:crmpassword@localhost:5432/crmdb',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  });
  const client = await pool.connect();
  try {
    const { rows: cnt } = await client.query('SELECT COUNT(*)::int AS c FROM companies');
    console.log('companies count:', cnt[0]?.c);
    const { rows } = await client.query('SELECT * FROM companies ORDER BY id DESC LIMIT 1');
    console.log('sample row keys:', rows[0] ? Object.keys(rows[0]).join(', ') : 'none');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
