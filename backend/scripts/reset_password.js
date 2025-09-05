// Usage:
//   node scripts/reset_password.js <email> <newPassword>
// Uses DATABASE_URL from backend/.env to connect and update the user password.
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const [,, emailArg, passArg] = process.argv;
  if (!emailArg || !passArg) {
    console.error('Usage: node scripts/reset_password.js <email> <newPassword>');
    process.exit(2);
  }
  const email = String(emailArg).trim().toLowerCase();
  const password = String(passArg);
  const conn = process.env.DATABASE_URL || '';
  if (!conn) {
    console.error('DATABASE_URL not set. Create backend/.env with DATABASE_URL.');
    process.exit(1);
  }
  // Normalize URL scheme for pg
  const url = conn.startsWith('postgresql://') ? 'postgres://' + conn.slice('postgresql://'.length) : conn;
  const pool = new Pool({ connectionString: url, ssl: /\?/.test(url) ? { rejectUnauthorized: false, require: true } : false });
  try {
    const hash = await bcrypt.hash(password, 10);
    // Try without selecting 'role' to support older schemas
    const { rows } = await pool.query(
      'UPDATE users SET password = $1 WHERE lower(email) = lower($2) OR lower(username) = lower($2) RETURNING id, username, email',
      [hash, email]
    );
    if (!rows.length) {
      console.error('No matching user found for', email);
      process.exit(3);
    }
  const u = rows[0];
  console.log('Password updated for user:', { id: u.id, username: u.username, email: u.email });
  } catch (e) {
    console.error('Error:', e?.message || e);
    process.exit(1);
  } finally {
    try { await pool.end(); } catch {}
  }
}

main();
