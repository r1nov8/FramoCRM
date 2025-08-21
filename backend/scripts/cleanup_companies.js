import dotenv from 'dotenv';
import path from 'path';
import pkg from 'pg';

const { Pool } = pkg;

// Load backend/.env
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://crmuser:crmpassword@localhost:5432/crmdb',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
  });
  try {
    console.log('Deleting rows with empty Company...');
  const del = await pool.query("DELETE FROM companies WHERE COALESCE(TRIM(\"Company\"), '') = ''");
    console.log(`Deleted ${del.rowCount} empty companies`);

    // Optional de-dup by exact company name; keep lowest id
    console.log('Deduplicating exact duplicate Company names (keeping lowest id)...');
    const dedup = await pool.query(`
      WITH dups AS (
        SELECT MIN(id) AS keep_id, ARRAY_AGG(id) AS ids
        FROM companies
        WHERE COALESCE(TRIM("Company"), '') <> ''
        GROUP BY TRIM("Company")
        HAVING COUNT(*) > 1
      )
      DELETE FROM companies c
      USING dups d
      WHERE c.id = ANY(d.ids)
        AND c.id <> d.keep_id;
    `);
    console.log(`Removed ${dedup.rowCount} duplicate rows`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
