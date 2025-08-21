import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { promises as fsp } from 'fs';
// CSV import removed
import { fileURLToPath } from 'url';
// Excel import dependencies removed as part of rollback

const { Pool } = pkg;
dotenv.config();

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Filesystem root for corporate file shares (e.g., G:\\ on Framo servers)
// Configure via FILE_SHARE_ROOT or G_DRIVE_PATH. In dev, defaults to ./files
const FILE_SHARE_ROOT = process.env.FILE_SHARE_ROOT
  || process.env.G_DRIVE_PATH
  || (process.platform === 'win32' ? 'G:\\' : path.resolve(process.cwd(), 'files'));
const FILES_ENABLED = process.env.FILES_ENABLED === 'true';

// Create local dev directory if using default and not on Windows
if (!process.env.FILE_SHARE_ROOT && !process.env.G_DRIVE_PATH && process.platform !== 'win32') {
  try {
    if (!fs.existsSync(FILE_SHARE_ROOT)) {
      fs.mkdirSync(FILE_SHARE_ROOT, { recursive: true });
    }
  } catch (e) {
    // non-fatal
  }
}

const allowedOrigins = (process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : [
      'https://framocrm-1.onrender.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
    ]);

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
// Increase payload limit to support larger CSV uploads wrapped in JSON
app.use(express.json({ limit: '25mb' }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://crmuser:crmpassword@localhost:5432/crmdb',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// --- Filesystem helpers (secure path resolution) ---
function resolveSafe(base, ...segments) {
  const resolvedBase = path.resolve(base);
  const full = path.resolve(resolvedBase, ...segments);
  if (!full.startsWith(resolvedBase)) {
    const err = new Error('Invalid path');
    err.status = 400;
    throw err;
  }
  return full;
}

function isTextExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const textExts = new Set([
    '.txt','.md','.csv','.json','.log','.ts','.tsx','.js','.jsx','.css','.scss','.html','.xml','.yml','.yaml','.sql'
  ]);
  return textExts.has(ext);
}

async function listDirectory(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const result = [];
  for (const d of entries) {
    const fp = path.join(dir, d.name);
    try {
      const st = await fsp.stat(fp);
      result.push({
        name: d.name,
        path: fp,
        isDir: d.isDirectory(),
        size: st.size,
        mtime: st.mtimeMs,
      });
    } catch {
      // skip unreadable entries
    }
  }
  return result;
}

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
    res.json({
      token,
      user: {
        name: user.username,
        initials: user.username.slice(0, 2).toUpperCase()
      }
    });
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

// Excel import endpoint removed as part of rollback

// --- File share integration (read-only) ---
if (FILES_ENABLED) {
  // List directory contents under FILE_SHARE_ROOT
  app.get('/api/files', requireAuth, async (req, res) => {
    try {
      const rel = req.query.path || '';
      const abs = resolveSafe(FILE_SHARE_ROOT, rel);
      const st = await fsp.stat(abs);
      if (!st.isDirectory()) return res.status(400).json({ error: 'Not a directory' });
      const items = await listDirectory(abs);
      // Return relative paths from root to avoid leaking absolute mount information
      const rootAbs = path.resolve(FILE_SHARE_ROOT);
      const data = items.map(i => ({
        name: i.name,
        isDir: i.isDir,
        size: i.size,
        mtime: i.mtime,
        relPath: path.relative(rootAbs, i.path)
      }));
      res.json({ root: path.basename(rootAbs) || rootAbs, path: rel, items: data });
    } catch (err) {
      console.error('List files error:', err);
      res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
    }
  });

  // Read a small text file (preview)
  app.get('/api/file', requireAuth, async (req, res) => {
    try {
      const rel = req.query.path;
      if (!rel) return res.status(400).json({ error: 'Missing path' });
      const abs = resolveSafe(FILE_SHARE_ROOT, rel);
      const st = await fsp.stat(abs);
      if (st.isDirectory()) return res.status(400).json({ error: 'Path is a directory' });
      if (!isTextExtension(abs) || st.size > 2 * 1024 * 1024) {
        return res.status(415).json({ error: 'Unsupported file type or too large' });
      }
      const content = await fsp.readFile(abs, 'utf8');
      res.json({ path: rel, size: st.size, content });
    } catch (err) {
      console.error('Read file error:', err);
      res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
    }
  });
}

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
    // Return CSV-aligned aliases for UI plus all raw columns
    const { rows } = await pool.query(
      'SELECT companies.*, ' +
      '"Company" as name, ' +
      '"Company Primary Activity - Level 1" as type, ' +
      '"Company Nationality/Region" as location, ' +
      '"Company Website" as website, ' +
      '"Company City" as address ' +
      'FROM companies ORDER BY id DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Get companies error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/companies', async (req, res) => {
  try {
    const { name, type, location, address, website } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing name' });
    // Map to CSV-aligned columns. Address approximates to "Company City" if provided.
    const company = String(name).trim();
    const activity = type ? String(type).trim() : null;
    const nationality = location ? String(location).trim() : null;
    const city = address ? String(address).trim() : null;
    const site = website ? String(website).trim() : null;
    const insertCols = ['Company'];
    const values = [company];
    if (activity) { insertCols.push('Company Primary Activity - Level 1'); values.push(activity); }
    if (nationality) { insertCols.push('Company Nationality/Region'); values.push(nationality); }
    if (city) { insertCols.push('Company City'); values.push(city); }
    if (site) { insertCols.push('Company Website'); values.push(site); }
    const placeholders = insertCols.map((_, i) => `$${i + 1}`);
    const quotedCols = insertCols.map(c => `"${c.replace(/"/g, '""')}"`).join(', ');
    const { rows } = await pool.query(
      `INSERT INTO companies (${quotedCols}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values
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
    const body = req.body || {};
    const csvCols = [
      'Company',
      'Vessels',
      'Company Nationality/Region',
      'Company Primary Activity - Level 1',
      'Company City',
      'Company Size',
      'Company Main Vessel Type',
      'Company Website',
      'Company Email Address',
      'Group Company',
      'Company Tel Number'
    ];
    // Backward-compatible mapping
    const compat = {
      name: 'Company',
      type: 'Company Primary Activity - Level 1',
      location: 'Company Nationality/Region',
      address: 'Company City',
      website: 'Company Website'
    };
    const updates = [];
    const values = [];
    for (const [k, v] of Object.entries(body)) {
      let col = null;
      if (csvCols.includes(k)) col = k;
      else if (compat[k]) col = compat[k];
      if (col && v !== undefined) {
        const q = '"' + col.replace(/"/g, '""') + '" = $' + (values.length + 1);
        updates.push(q);
        values.push(v);
      }
    }
    if (!updates.length) return res.status(400).json({ error: 'No updatable fields provided' });
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE companies SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Update company error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CSV import endpoint removed

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
