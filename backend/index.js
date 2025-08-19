import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
let bcrypt;
try {
  bcrypt = await import('bcrypt');
  bcrypt = bcrypt.default || bcrypt;
} catch (e) {
  console.error('Failed to load bcrypt. Password hashing will not work.', e);
}
import jwt from 'jsonwebtoken';

const { Pool } = pkg;
dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://crmuser:crmpassword@localhost:5432/crmdb',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// --- Auth endpoints ---
// Register
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const userExists = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  if (userExists.rows.length > 0) return res.status(409).json({ error: 'User already exists' });
  if (!bcrypt) return res.status(500).json({ error: 'bcrypt not available' });
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query('INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username', [username, hash]);
  res.status(201).json({ user: rows[0] });
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (!bcrypt) return res.status(500).json({ error: 'bcrypt not available' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// Auth middleware
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const token = auth.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// --- Example CRUD endpoints ---

// Get all projects
app.get('/api/projects', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM projects ORDER BY id DESC');
  res.json(rows);
});

// Add a project
app.post('/api/projects', async (req, res) => {
  const { name, description } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO projects (name, description) VALUES ($1, $2) RETURNING *',
    [name, description]
  );
  res.status(201).json(rows[0]);
});

// --- Add similar endpoints for companies, contacts, teamMembers as needed ---

app.listen(port, () => {
  console.log(`CRM backend listening on port ${port}`);
});
