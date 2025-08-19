import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const { Pool } = pkg;
dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

app.use(cors({
  origin: 'https://framocrm-1.onrender.com',
  credentials: true
}));
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://crmuser:crmpassword@localhost:5432/crmdb',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// --- Auth endpoints ---
// Register
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const userExists = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userExists.rows.length > 0) return res.status(409).json({ error: 'User already exists' });
  // bcryptjs is always available if required
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query('INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username', [username, hash]);
    res.status(201).json({ user: rows[0] });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  // bcryptjs is always available if required
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
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


// --- Team Members CRUD Endpoints ---
// Get all team members
app.get('/api/team-members', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM team_members ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error('Get team members error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a team member
app.post('/api/team-members', async (req, res) => {
  try {
    const { name, initials, jobTitle } = req.body;
    if (!name || !initials || !jobTitle) return res.status(400).json({ error: 'Missing fields' });
    const { rows } = await pool.query(
      'INSERT INTO team_members (name, initials, job_title) VALUES ($1, $2, $3) RETURNING *',
      [name, initials, jobTitle]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Add team member error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a team member
app.delete('/api/team-members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM team_members WHERE id = $1', [id]);
    res.status(204).end();
  } catch (err) {
    console.error('Delete team member error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a team member
app.put('/api/team-members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, initials, jobTitle } = req.body;
    if (!name || !initials || !jobTitle) return res.status(400).json({ error: 'Missing fields' });
    const { rows } = await pool.query(
      'UPDATE team_members SET name = $1, initials = $2, job_title = $3 WHERE id = $4 RETURNING *',
      [name, initials, jobTitle, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Update team member error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`CRM backend listening on port ${port}`);
});
