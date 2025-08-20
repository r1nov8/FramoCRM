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

const allowedOrigins = [
  'https://framocrm-1.onrender.com',
  'http://localhost:5173'
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true
}));
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://crmuser:crmpassword@localhost:5432/crmdb',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
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

// --- Companies CRUD Endpoints ---
app.get('/api/companies', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM companies ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error('Get companies error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/companies', async (req, res) => {
  try {
    const { name, type, location } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'Missing fields' });
    const { rows } = await pool.query(
      'INSERT INTO companies (name, type, location) VALUES ($1, $2, $3) RETURNING *',
      [name, type, location]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Add company error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, location } = req.body;
    const { rows } = await pool.query(
      'UPDATE companies SET name = $1, type = $2, location = $3 WHERE id = $4 RETURNING *',
      [name, type, location, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Update company error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM companies WHERE id = $1', [id]);
    res.status(204).end();
  } catch (err) {
    console.error('Delete company error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Contacts CRUD Endpoints ---
app.get('/api/contacts', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM contacts ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error('Get contacts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/contacts', async (req, res) => {
  try {
    // Accept both companyId and company_id for compatibility
    const { name, email, phone, companyId, company_id } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Missing fields' });
    const resolvedCompanyId = company_id !== undefined ? company_id : companyId;
    const { rows } = await pool.query(
      'INSERT INTO contacts (name, email, phone, company_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, phone, resolvedCompanyId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Add contact error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Accept both companyId and company_id for compatibility
    const { name, email, phone, companyId, company_id } = req.body;
    const resolvedCompanyId = company_id !== undefined ? company_id : companyId;
    const { rows } = await pool.query(
      'UPDATE contacts SET name = $1, email = $2, phone = $3, company_id = $4 WHERE id = $5 RETURNING *',
      [name, email, phone, resolvedCompanyId, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Update contact error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM contacts WHERE id = $1', [id]);
    res.status(204).end();
  } catch (err) {
    console.error('Delete contact error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Products CRUD Endpoints ---
app.get('/api/products', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { projectId, type, quantity, capacity, head } = req.body;
    if (!projectId || !type || !quantity) return res.status(400).json({ error: 'Missing fields' });
    const { rows } = await pool.query(
      'INSERT INTO products (project_id, type, quantity, capacity, head) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [projectId, type, quantity, capacity, head]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Add product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, quantity, capacity, head } = req.body;
    const { rows } = await pool.query(
      'UPDATE products SET type = $1, quantity = $2, capacity = $3, head = $4 WHERE id = $5 RETURNING *',
      [type, quantity, capacity, head, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM products WHERE id = $1', [id]);
    res.status(204).end();
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Project Files CRUD Endpoints ---
app.get('/api/project-files', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM project_files ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error('Get project files error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/project-files', async (req, res) => {
  try {
    const { projectId, name, type, size, content } = req.body;
    if (!projectId || !name) return res.status(400).json({ error: 'Missing fields' });
    const { rows } = await pool.query(
      'INSERT INTO project_files (project_id, name, type, size, content) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [projectId, name, type, size, content]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Add project file error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/project-files/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM project_files WHERE id = $1', [id]);
    res.status(204).end();
  } catch (err) {
    console.error('Delete project file error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a team member
app.post('/api/team-members', async (req, res) => {
  try {
    const { first_name, last_name, initials, jobTitle } = req.body;
    if (!first_name || !last_name || !initials || !jobTitle) return res.status(400).json({ error: 'Missing fields' });
    const { rows } = await pool.query(
      'INSERT INTO team_members (first_name, last_name, initials, job_title) VALUES ($1, $2, $3, $4) RETURNING *',
      [first_name, last_name, initials, jobTitle]
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
    const { first_name, last_name, initials, jobTitle } = req.body;
    if (!first_name || !last_name || !initials || !jobTitle) return res.status(400).json({ error: 'Missing fields' });
    const { rows } = await pool.query(
      'UPDATE team_members SET first_name = $1, last_name = $2, initials = $3, job_title = $4 WHERE id = $5 RETURNING *',
      [first_name, last_name, initials, jobTitle, id]
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
