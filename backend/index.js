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

// ESM-compatible __dirname then load .env from backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

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
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      // Additional local dev ports used by Vite when 5173 is taken
      'http://localhost:5174',
      'http://127.0.0.1:5174'
    ]);

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    const okList = allowedOrigins.includes(origin);
    const allowOnrender = process.env.ALLOW_ONRENDER === 'true';
    const isOnRender = /\.onrender\.com$/i.test((origin || '').replace(/^https?:\/\//, '').split('/')[0] || '');
    if (okList || (allowOnrender && isOnRender)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true
}));
// Increase payload limit to support larger CSV uploads wrapped in JSON
app.use(express.json({ limit: '25mb' }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://crmuser:crmpassword@localhost:5432/crmdb',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Ensure required tables exist (idempotent safety for dev)
(async () => {
  try {
    // Ensure auth-related schema is consistent (username/email columns and id sequence)
    try {
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE");
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE");
      // Backfill missing username/email from each other where possible
      await pool.query("UPDATE users SET username = COALESCE(username, NULLIF(split_part(email, '@', 1), ''))");
      await pool.query("UPDATE users SET username = COALESCE(username, email)");
      await pool.query("UPDATE users SET email = COALESCE(email, username)");
      // Repair id sequence if it's out of sync (avoids duplicate key on insert)
      await pool.query(`DO $$
      DECLARE seq text; mx bigint;
      BEGIN
        SELECT pg_get_serial_sequence('users','id') INTO seq;
        IF seq IS NOT NULL THEN
          SELECT COALESCE(MAX(id),0) + 1 INTO mx FROM users;
          PERFORM setval(seq, mx, false);
        END IF;
      END$$;`);
    } catch (e) {
      console.warn('Warning: users schema guard failed:', e?.message || e);
    }
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_reads (
        id SERIAL PRIMARY KEY,
        activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(activity_id, user_id)
      )`);
  // Ensure project_type exists on projects (idempotent)
  await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type TEXT');
  } catch (e) {
    console.warn('Warning: failed ensuring activity_reads table:', e?.message || e);
  }
})();

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

// Helper: map DB row (snake_case) to API shape (camelCase)
function projectRowToApi(r) {
  if (!r) return null;
  return {
    id: String(r.id),
    name: r.name,
  projectType: r.project_type || undefined,
    opportunityNumber: r.opportunity_number,
    orderNumber: r.order_number || undefined,
    stage: r.stage,
    value: r.value !== null && r.value !== undefined ? Number(r.value) : 0,
    currency: r.currency,
    hedgeCurrency: r.hedge_currency || undefined,
    grossMarginPercent: r.gross_margin_percent !== null && r.gross_margin_percent !== undefined ? Number(r.gross_margin_percent) : undefined,
    closingDate: r.closing_date ? new Date(r.closing_date).toISOString().slice(0,10) : '',
    salesRepId: r.sales_rep_id !== null && r.sales_rep_id !== undefined ? String(r.sales_rep_id) : undefined,
    shipyardId: r.shipyard_id !== null && r.shipyard_id !== undefined ? String(r.shipyard_id) : '',
    vesselOwnerId: r.vessel_owner_id !== null && r.vessel_owner_id !== undefined ? String(r.vessel_owner_id) : undefined,
    designCompanyId: r.design_company_id !== null && r.design_company_id !== undefined ? String(r.design_company_id) : undefined,
    primaryContactId: r.primary_contact_id !== null && r.primary_contact_id !== undefined ? String(r.primary_contact_id) : undefined,
    notes: r.notes || '',
    numberOfVessels: r.number_of_vessels !== null && r.number_of_vessels !== undefined ? Number(r.number_of_vessels) : 1,
    pumpsPerVessel: r.pumps_per_vessel !== null && r.pumps_per_vessel !== undefined ? Number(r.pumps_per_vessel) : 1,
    pricePerVessel: r.price_per_vessel !== null && r.price_per_vessel !== undefined ? Number(r.price_per_vessel) : undefined,
  selfCostPerVessel: r.self_cost_per_vessel !== null && r.self_cost_per_vessel !== undefined ? Number(r.self_cost_per_vessel) : undefined,
    vesselSize: r.vessel_size !== null && r.vessel_size !== undefined ? Number(r.vessel_size) : undefined,
    vesselSizeUnit: r.vessel_size_unit || undefined,
    fuelType: r.fuel_type,
    products: [],
    files: [],
  };
}

// Get all projects (return camelCase)
app.get('/api/projects', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM projects ORDER BY id DESC');
  res.json(rows.map(projectRowToApi));
});

// Add a project (accept full payload)
app.post('/api/projects', requireAuth, async (req, res) => {
  try {
    const b = req.body || {};
    // Basic required fields
    if (!b.name || !b.opportunityNumber || !b.stage || !b.currency || !b.closingDate || !b.shipyardId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const cols = [
      'name','project_type','opportunity_number','order_number','stage','value','currency','hedge_currency','gross_margin_percent','closing_date',
      'sales_rep_id','shipyard_id','vessel_owner_id','design_company_id','primary_contact_id','notes','number_of_vessels','pumps_per_vessel',
      'price_per_vessel','vessel_size','vessel_size_unit','fuel_type'
    ];
    const vals = [
      b.name,
      b.projectType || null,
      b.opportunityNumber,
      b.orderNumber || null,
      b.stage,
      b.value ?? 0,
      b.currency,
      b.hedgeCurrency || null,
      b.grossMarginPercent ?? null,
      b.closingDate,
      b.salesRepId ? Number(b.salesRepId) : null,
      b.shipyardId ? Number(b.shipyardId) : null,
      b.vesselOwnerId ? Number(b.vesselOwnerId) : null,
      b.designCompanyId ? Number(b.designCompanyId) : null,
      b.primaryContactId ? Number(b.primaryContactId) : null,
      b.notes || '',
      b.numberOfVessels ?? 1,
      b.pumpsPerVessel ?? 1,
      b.pricePerVessel ?? null,
      b.vesselSize ?? null,
      b.vesselSizeUnit || null,
      b.fuelType
    ];
    const placeholders = vals.map((_, i) => `$${i + 1}`);
    const { rows } = await pool.query(
      `INSERT INTO projects (${cols.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
      vals
    );
    res.status(201).json(projectRowToApi(rows[0]));
  } catch (err) {
    console.error('Add project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a project (partial update)
app.put('/api/projects/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body || {};
    // Load current row for diff
    let before = null;
    try {
      const r0 = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
      before = r0.rows[0] || null;
    } catch {}
    const map = {
      name: 'name',
      projectType: 'project_type',
      opportunityNumber: 'opportunity_number',
      orderNumber: 'order_number',
      stage: 'stage',
      value: 'value',
      currency: 'currency',
      hedgeCurrency: 'hedge_currency',
      grossMarginPercent: 'gross_margin_percent',
      closingDate: 'closing_date',
      salesRepId: 'sales_rep_id',
      shipyardId: 'shipyard_id',
      vesselOwnerId: 'vessel_owner_id',
      designCompanyId: 'design_company_id',
      primaryContactId: 'primary_contact_id',
      notes: 'notes',
      numberOfVessels: 'number_of_vessels',
      pumpsPerVessel: 'pumps_per_vessel',
      pricePerVessel: 'price_per_vessel',
  selfCostPerVessel: 'self_cost_per_vessel',
      vesselSize: 'vessel_size',
      vesselSizeUnit: 'vessel_size_unit',
      fuelType: 'fuel_type',
    };
    const updates = [];
    const values = [];
    for (const [k, v] of Object.entries(b)) {
      const col = map[k];
      if (!col) continue;
      let val = v;
      if ([
        'salesRepId','shipyardId','vesselOwnerId','designCompanyId','primaryContactId'
      ].includes(k)) {
        val = v !== null && v !== undefined && v !== '' ? Number(v) : null;
      }
      const q = `${col} = $${values.length + 1}`;
      updates.push(q);
      values.push(val);
    }
    if (!updates.length) return res.status(400).json({ error: 'No updatable fields provided' });
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const updated = rows[0];
    try {
      // Compute diffs but only include curated fields and avoid noisy date strings
      const fields = ['number_of_vessels','pumps_per_vessel','price_per_vessel','vessel_size','vessel_size_unit','fuel_type','stage','value','currency','gross_margin_percent'];
      const labels = {
        number_of_vessels: 'number_of_vessels',
        pumps_per_vessel: 'pumps_per_vessel',
        price_per_vessel: 'price_per_vessel',
        vessel_size: 'vessel_size',
        vessel_size_unit: 'vessel_size_unit',
        fuel_type: 'fuel_type',
        stage: 'stage',
        value: 'value',
        currency: 'currency',
        gross_margin_percent: 'gross_margin_percent'
      };
      const changes = [];
      if (before) {
        for (const f of fields) {
          const a = before[f];
          const c = updated[f];
          const av = a === null || a === undefined ? '' : String(a);
          const cv = c === null || c === undefined ? '' : String(c);
          if (av !== cv) {
            const k = labels[f] || f;
            changes.push(`${k}: ${av || '—'} → ${cv || '—'}`);
          }
        }
      }
      const content = changes.length ? `Project updated\n${changes.join('\n')}` : 'Project updated';
      const ins = await pool.query(
        'INSERT INTO activities (project_id, type, content, created_by_user_id, created_by_name) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [id, 'status_change', content, (req.user && req.user.id) || null, (req.user && req.user.username) || null]
      );
      try {
        if (req.user?.id && ins.rows[0]?.id) {
          await pool.query('INSERT INTO activity_reads (activity_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [ins.rows[0].id, req.user.id]);
        }
      } catch {}
    } catch {}
    res.json(projectRowToApi(updated));
  } catch (err) {
    console.error('Update project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
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
      'FROM companies ' +
      'WHERE COALESCE(TRIM("Company"), \'\') <> \'\' ' +
      'ORDER BY id DESC'
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
    // Handle duplicate company name (unique index on lower("Company"))
    if (err && err.code === '23505') {
      return res.status(409).json({ error: 'Company already exists' });
    }
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
    const idNum = Number(req.params.id);
    if (!Number.isInteger(idNum)) return res.status(400).json({ error: 'Invalid id' });
    await pool.query('DELETE FROM companies WHERE id = $1', [idNum]);
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
    const idNum = Number(req.params.id);
    if (!Number.isInteger(idNum)) return res.status(400).json({ error: 'Invalid id' });
    await pool.query('DELETE FROM contacts WHERE id = $1', [idNum]);
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
    const idNum = Number(req.params.id);
    if (!Number.isInteger(idNum)) return res.status(400).json({ error: 'Invalid id' });
    await pool.query('DELETE FROM products WHERE id = $1', [idNum]);
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
    const idNum = Number(req.params.id);
    if (!Number.isInteger(idNum)) return res.status(400).json({ error: 'Invalid id' });
    await pool.query('DELETE FROM project_files WHERE id = $1', [idNum]);
    res.status(204).end();
  } catch (err) {
    console.error('Delete project file error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Project Estimates & Quote Generation ---
function estimateRowToApi(r) {
  if (!r) return null;
  return {
    id: String(r.id),
    projectId: String(r.project_id),
    type: r.type || 'anti_heeling',
    data: r.data || {},
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
  };
}

// Get estimate for a project (by type)
app.get('/api/projects/:id/estimates', async (req, res) => {
  try {
    const { id } = req.params;
    const type = (req.query.type && String(req.query.type)) || 'anti_heeling';
    const { rows } = await pool.query('SELECT * FROM project_estimates WHERE project_id = $1 AND type = $2', [id, type]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(estimateRowToApi(rows[0]));
  } catch (err) {
    console.error('Get estimate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save (upsert) estimate for a project
app.post('/api/projects/:id/estimates', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'anti_heeling', data } = req.body || {};
    if (!data || typeof data !== 'object') return res.status(400).json({ error: 'Missing data' });
    const { rows } = await pool.query(
      `INSERT INTO project_estimates (project_id, type, data)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, type)
       DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
       RETURNING *`,
      [id, type, data]
    );
    try {
      const ins = await pool.query(
        'INSERT INTO activities (project_id, type, content, created_by_user_id, created_by_name) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [id, 'note', `Estimate saved (${type})`, (req.user && req.user.id) || null, (req.user && req.user.username) || null]
      );
      try {
        if (req.user?.id && ins.rows[0]?.id) {
          await pool.query('INSERT INTO activity_reads (activity_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [ins.rows[0].id, req.user.id]);
        }
      } catch {}
    } catch {}
    res.status(201).json(estimateRowToApi(rows[0]));
  } catch (err) {
    console.error('Save estimate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate a simple text quote document from project + estimate
app.post('/api/projects/:id/generate-quote', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'anti_heeling' } = req.body || {};
    const pr = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    const proj = pr.rows[0];
    if (!proj) return res.status(404).json({ error: 'Project not found' });
  const est = await pool.query('SELECT * FROM project_estimates WHERE project_id = $1 AND type = $2', [id, type]);
    if (!est.rows.length) return res.status(400).json({ error: 'No estimate data saved' });

    // Gather minimal related info (companies) for shipyard and owner names
    let shipyardName = '';
    if (proj.shipyard_id) {
      try {
        const c = await pool.query('SELECT "Company" as name FROM companies WHERE id = $1', [proj.shipyard_id]);
        shipyardName = c.rows[0]?.name || '';
      } catch {}
    }
    let ownerName = '';
    if (proj.vessel_owner_id) {
      try {
        const c = await pool.query('SELECT "Company" as name FROM companies WHERE id = $1', [proj.vessel_owner_id]);
        ownerName = c.rows[0]?.name || '';
      } catch {}
    }

  const now = new Date();
    const ymd = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const currency = proj.currency || 'USD';
    const pricePerVessel = proj.price_per_vessel != null ? Number(proj.price_per_vessel) : 0;
    const numberOfVessels = proj.number_of_vessels != null ? Number(proj.number_of_vessels) : 1;
    const total = pricePerVessel * numberOfVessels;
    const gm = proj.gross_margin_percent != null ? `${proj.gross_margin_percent}%` : 'n/a';
    const estData = est.rows[0].data || {};
    const comments = (estData.comments && String(estData.comments)) || '';
    const shippingRegion = (estData.shippingRegion && String(estData.shippingRegion)) || '';
    const startupLocation = (estData.startupLocation && String(estData.startupLocation)) || '';

    const lines = [];
  lines.push(isAntiHeeling ? 'Quote Anti-Heeling' : 'Quote');
    lines.push('');
    lines.push(`Date: ${ymd}`);
  // In Anti-Heeling, show Project.no (maps to opportunity_number in DB)
  lines.push(`Project: ${proj.name}`);
  if (proj.opportunity_number) {
    lines.push(`${isAntiHeeling ? 'Project.no' : 'Opp. No'}: ${proj.opportunity_number}`);
  }
    if (shipyardName) lines.push(`Shipyard: ${shipyardName}`);
    if (ownerName) lines.push(`Vessel Owner: ${ownerName}`);
    if (proj.vessel_size && proj.vessel_size_unit) lines.push(`Vessel Size: ${proj.vessel_size} ${proj.vessel_size_unit}`);
    lines.push('');
    lines.push('Commercials');
    lines.push(`- Currency: ${currency}`);
    lines.push(`- Quote Price / Vessel: ${pricePerVessel.toLocaleString()} ${currency}`);
    lines.push(`- Number of Vessels: ${numberOfVessels}`);
    lines.push(`- Total Quote: ${total.toLocaleString()} ${currency}`);
    lines.push(`- Gross Margin: ${gm}`);
    lines.push('');
    lines.push('Estimator Summary');
    if (startupLocation) lines.push(`- Startup Location: ${startupLocation}`);
    if (shippingRegion) lines.push(`- Shipping Region: ${shippingRegion}`);
    if (comments) {
      lines.push('');
      lines.push('Notes:');
      lines.push(comments);
    }
    lines.push('');
    lines.push('This is an automatically generated draft quote.');

    const content = lines.join('\n');
    const buf = Buffer.from(content, 'utf8');
    const base64 = buf.toString('base64');
  const fileNameSafe = (proj.name || 'quote').replace(/[^a-z0-9-_]+/gi, '_');
  const oppPart = proj.opportunity_number ? `_Opp-${String(proj.opportunity_number).replace(/[^a-z0-9-_]+/gi, '')}` : '';
  const prefix = isAntiHeeling ? 'Quote_Anti-Heeling' : 'Quote';
  const fileName = `${prefix}${oppPart}_${fileNameSafe}_${ymd}.txt`;
    const { rows: fileRows } = await pool.query(
      'INSERT INTO project_files (project_id, name, type, size, content) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, fileName, 'text/plain', buf.length, base64]
    );

    try {
      const ins = await pool.query(
        'INSERT INTO activities (project_id, type, content, created_by_user_id, created_by_name) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [id, 'note', `Generated quote document: ${fileName}`, (req.user && req.user.id) || null, (req.user && req.user.username) || null]
      );
      try {
        if (req.user?.id && ins.rows[0]?.id) {
          await pool.query('INSERT INTO activity_reads (activity_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [ins.rows[0].id, req.user.id]);
        }
      } catch {}
    } catch {}

    res.status(201).json(fileRows[0]);
  } catch (err) {
    console.error('Generate quote error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Tasks CRUD Endpoints ---
// Expected DB schema:
// CREATE TABLE IF NOT EXISTS tasks (
//   id SERIAL PRIMARY KEY,
//   project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
//   title TEXT NOT NULL,
//   status TEXT NOT NULL DEFAULT 'open',
//   due_date DATE,
//   assigned_to INTEGER,
//   notes TEXT,
//   priority SMALLINT DEFAULT 2,
//   created_at TIMESTAMP DEFAULT NOW(),
//   updated_at TIMESTAMP DEFAULT NOW()
// );
// CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);

function taskRowToApi(r) {
  return {
    id: String(r.id),
    projectId: String(r.project_id),
    title: r.title,
    status: r.status,
    dueDate: r.due_date ? new Date(r.due_date).toISOString().slice(0,10) : null,
    assignedTo: r.assigned_to !== null && r.assigned_to !== undefined ? String(r.assigned_to) : null,
    notes: r.notes || null,
    priority: r.priority ?? 2,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
  };
}

app.get('/api/projects/:id/tasks', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM tasks WHERE project_id = $1 ORDER BY due_date NULLS LAST, id DESC', [id]);
    res.json(rows.map(taskRowToApi));
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/projects/:id/tasks', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, status = 'open', dueDate = null, assignedTo = null, notes = null, priority = 2 } = req.body || {};
    if (!title) return res.status(400).json({ error: 'Missing title' });
    const { rows } = await pool.query(
      'INSERT INTO tasks (project_id, title, status, due_date, assigned_to, notes, priority) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [id, title, status, dueDate, assignedTo ? Number(assignedTo) : null, notes, priority]
    );
    const created = rows[0];
    try {
      const ins = await pool.query(
        'INSERT INTO activities (project_id, type, content, created_by_user_id, created_by_name) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [id, 'note', `Task created: ${title}`, (req.user && req.user.id) || null, (req.user && req.user.username) || null]
      );
      try {
        if (req.user?.id && ins.rows[0]?.id) {
          await pool.query('INSERT INTO activity_reads (activity_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [ins.rows[0].id, req.user.id]);
        }
      } catch {}
    } catch {}
    res.status(201).json(taskRowToApi(created));
  } catch (err) {
    console.error('Add task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/tasks/:taskId', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const b = req.body || {};
    // Load before for diff
    let before = null;
    try {
      const r0 = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
      before = r0.rows[0] || null;
    } catch {}
    const map = {
      title: 'title',
      status: 'status',
      dueDate: 'due_date',
      assignedTo: 'assigned_to',
      notes: 'notes',
      priority: 'priority'
    };
    const updates = [];
    const values = [];
    for (const [k, v] of Object.entries(b)) {
      const col = map[k];
      if (!col) continue;
      const val = (k === 'assignedTo') ? (v ? Number(v) : null) : v;
      updates.push(`${col} = $${values.length + 1}`);
      values.push(val);
    }
    if (!updates.length) return res.status(400).json({ error: 'No updatable fields provided' });
    values.push(taskId);
    const { rows } = await pool.query(
      `UPDATE tasks SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const updated = rows[0];
    try {
      // Compute diffs on common fields; omit due_date string noise if it’s unchanged or trivial
      const fields = ['title','status','assigned_to','priority','due_date'];
      const changes = [];
      if (before) {
        for (const f of fields) {
          const a = before[f];
          const c = updated[f];
          const av = a === null || a === undefined ? '' : String(a);
          const cv = c === null || c === undefined ? '' : String(c);
          if (av !== cv) {
            changes.push(`${f}: ${av || '—'} → ${cv || '—'}`);
          }
        }
      }
      const content = changes.length ? `Task updated\n${changes.join('\n')}` : 'Task updated';
      const ins = await pool.query(
        'INSERT INTO activities (project_id, type, content, created_by_user_id, created_by_name) VALUES ((SELECT project_id FROM tasks WHERE id=$1), $2, $3, $4, $5) RETURNING id',
        [taskId, 'note', content, (req.user && req.user.id) || null, (req.user && req.user.username) || null]
      );
      try {
        if (req.user?.id && ins.rows[0]?.id) {
          await pool.query('INSERT INTO activity_reads (activity_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [ins.rows[0].id, req.user.id]);
        }
      } catch {}
    } catch {}
    res.json(taskRowToApi(updated));
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/tasks/:taskId', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { rows: r } = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING project_id, title', [taskId]);
    const row = r[0];
    try {
      if (row) {
        const ins = await pool.query(
          'INSERT INTO activities (project_id, type, content, created_by_user_id, created_by_name) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [row.project_id, 'note', `Task deleted: ${row.title || taskId}`, (req.user && req.user.id) || null, (req.user && req.user.username) || null]
        );
        try {
          if (req.user?.id && ins.rows[0]?.id) {
            await pool.query('INSERT INTO activity_reads (activity_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [ins.rows[0].id, req.user.id]);
          }
        } catch {}
      }
    } catch {}
    res.status(204).end();
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Activities (Project Activity Log) Endpoints ---
function activityRowToApi(r) {
  return {
    id: String(r.id),
    projectId: String(r.project_id),
    type: r.type || 'note',
    content: r.content,
    createdBy: r.created_by !== null && r.created_by !== undefined ? String(r.created_by) : null,
  createdByName: r.created_by_name || null,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
  };
}

app.get('/api/projects/:id/activities', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM activities WHERE project_id = $1 ORDER BY id DESC', [id]);
    res.json(rows.map(activityRowToApi));
  } catch (err) {
    console.error('Get activities error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/projects/:id/activities', async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'note', content, createdBy = null } = req.body || {};
    if (!content || !String(content).trim()) return res.status(400).json({ error: 'Missing content' });
    // If caller included Authorization, attribute using token
    let user = null;
    try {
      const auth = req.headers.authorization;
      if (auth && auth.startsWith('Bearer ')) {
        user = jwt.verify(auth.split(' ')[1], JWT_SECRET);
      }
    } catch {}
    const createdById = user?.id ?? (createdBy ? Number(createdBy) : null);
    const createdByName = user?.username ?? null;
    const { rows } = await pool.query(
      'INSERT INTO activities (project_id, type, content, created_by, created_by_name) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, type, content, createdById, createdByName]
    );
    try {
      if (createdById) {
        await pool.query('INSERT INTO activity_reads (activity_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [rows[0].id, createdById]);
      }
    } catch {}
    res.status(201).json(activityRowToApi(rows[0]));
  } catch (err) {
    console.error('Add activity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unread activity summary for current user
app.get('/api/activities/unread-summary', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query(
      `SELECT a.project_id, COUNT(*)::int AS count, MAX(a.id) AS latest_id
       FROM activities a
       LEFT JOIN activity_reads r ON r.activity_id = a.id AND r.user_id = $1
       WHERE r.id IS NULL
       GROUP BY a.project_id
       ORDER BY MAX(a.id) DESC`,
      [userId]
    );
    const entries = rows.map(r => ({ projectId: String(r.project_id), count: Number(r.count), latestId: String(r.latest_id) }));
    const total = entries.reduce((s, e) => s + e.count, 0);
    res.json({ entries, total });
  } catch (err) {
    console.error('Unread summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all activities for a project as read for current user
app.post('/api/projects/:id/activities/mark-read', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const result = await pool.query(
      `INSERT INTO activity_reads (activity_id, user_id)
       SELECT a.id, $1 FROM activities a
       WHERE a.project_id = $2
       ON CONFLICT DO NOTHING`,
      [userId, id]
    );
    res.json({ marked: result.rowCount || 0 });
  } catch (err) {
    console.error('Mark read error:', err);
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
    const idNum = Number(req.params.id);
    if (!Number.isInteger(idNum)) return res.status(400).json({ error: 'Invalid id' });
    await pool.query('DELETE FROM team_members WHERE id = $1', [idNum]);
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

// --- Diagnostics: project type counts ---
app.get('/api/diagnostics/project-type-counts', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT COALESCE(NULLIF(TRIM(project_type), ''), 'UNKNOWN') AS type, COUNT(*)::int AS count
       FROM projects
       GROUP BY COALESCE(NULLIF(TRIM(project_type), ''), 'UNKNOWN')
       ORDER BY 1`
    );
    const data = {};
    for (const r of rows) data[r.type] = Number(r.count);
    res.json({ counts: data });
  } catch (err) {
    console.error('Diagnostics project-type-counts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`CRM backend listening on port ${port}`);
});
