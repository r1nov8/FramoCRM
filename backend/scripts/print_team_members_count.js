import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load backend/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

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

(async () => {
  try {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM team_members');
    console.log(JSON.stringify({ db: mask(conn), team_members_count: rows[0].c }, null, 2));
  } catch (e) {
    console.error('Error querying team_members:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
