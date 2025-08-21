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
    const { rows: srows } = await client.query('SELECT current_schema() AS schema');
    const schema = (srows[0]?.schema) || 'public';
    const { rows } = await client.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = 'companies'
       ORDER BY ordinal_position`,
      [schema]
    );
    const headers = rows.map(r => r.column_name);
    console.log('companies columns (' + schema + '):');
    for (const h of headers) console.log('- ' + h);
  } catch (e) {
    console.error('Failed to list columns:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
