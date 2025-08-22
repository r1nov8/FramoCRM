import pkg from 'pg';

const { Pool } = pkg;

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://crmuser:crmpassword@localhost:5432/crmdb',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  });
  try {
    const { rows } = await pool.query(
      `SELECT COALESCE(NULLIF(TRIM(project_type), ''), 'UNKNOWN') AS type, COUNT(*)::int AS count
       FROM projects
       GROUP BY COALESCE(NULLIF(TRIM(project_type), ''), 'UNKNOWN')
       ORDER BY 1`
    );
    console.log('Project type counts:');
    for (const r of rows) {
      console.log(`${r.type}: ${r.count}`);
    }
  } catch (e) {
    console.error('Error reporting project types:', e.message || e);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
