import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import pkg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { promises as fsp } from 'fs';
import { fileURLToPath } from 'url';

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
  process.exit(1);
});

const { Pool } = pkg;

// Load env from .env (local dev) if present
dotenv.config();

// --- Check for required environment variables (warn for local dev) ---
if (!process.env.DATABASE_URL) {
  console.warn('[WARN] DATABASE_URL not set; defaulting to local postgres (postgres://crmuser:crmpassword@localhost:5432/crmdb).');
}
if (!process.env.JWT_SECRET) {
  console.warn('[WARN] JWT_SECRET environment variable is not set. Using default value.');
}
const app = express();
const port = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Simple email validator (good-enough pattern)
function isValidEmail(s) {
  const str = String(s || '').trim();
  // basic pattern: local@domain.tld (no spaces)
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(str);
}

// Find user by identifier (email or username) with smart fallbacks.
// If no direct match and identifier has no '@', try appending '@framo.no'.
async function findUserFlexible(identifier) {
  const id = String(identifier || '').trim();
  if (!id) return null;
  try {
    let { rows } = await pool.query(
      'SELECT * FROM users WHERE lower(username)=lower($1) OR lower(email)=lower($1) LIMIT 1',
      [id]
    );
    if (rows.length) return rows[0];
    if (!id.includes('@')) {
      const guess = `${id}@framo.no`;
      ({ rows } = await pool.query(
        'SELECT * FROM users WHERE lower(username)=lower($1) OR lower(email)=lower($1) LIMIT 1',
        [guess]
      ));
      if (rows.length) return rows[0];
    }
  } catch {}
  return null;
}

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
      'http://127.0.0.1:5174',
      // Default production SWA domain (kept for explicit allow)
      'https://ashy-island-055029303.2.azurestaticapps.net'
    ]);

// Precompile helpers for robust origin checks
const allowedOriginSet = new Set(allowedOrigins);
const allowedOriginPatterns = [
  // Allow any Azure Static Web Apps host
  /\.azurestaticapps\.net$/i,
];

function parseHostFromOrigin(origin) {
  try {
    return new URL(origin).host;
  } catch {
    // Fallback: strip protocol if present
    return String(origin || '').replace(/^https?:\/\//i, '').split('/')[0];
  }
}

function isOriginAllowed(origin) {
  if (!origin) return true; // server-to-server or curl
  const host = parseHostFromOrigin(origin);
  if (!host) return true;

  // Exact matches (including full origin with scheme)
  if (allowedOriginSet.has(origin)) return true;
  // Host-only match convenience
  if (allowedOriginSet.has(`https://${host}`) || allowedOriginSet.has(`http://${host}`)) return true;

  // Localhost allowances
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)) return true;

  // Pattern-based allowances
  if (allowedOriginPatterns.some((rx) => rx.test(host))) return true;

  // Optional Render allowance via env flag
  if (process.env.ALLOW_ONRENDER === 'true' && /\.onrender\.com$/i.test(host)) return true;

  return false;
}

const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (like curl) and server-to-server
    if (!origin) return callback(null, true);
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    try {
      const host = parseHostFromOrigin(origin);
      console.warn(`[CORS] Blocked origin: ${origin} (host=${host})`);
    } catch {}
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','Accept','Origin','X-Requested-With'],
  optionsSuccessStatus: 204,
  preflightContinue: false,
};

app.use(cors(corsOptions));
// Ensure preflight requests are answered with the proper headers
app.options('*', cors(corsOptions));
// Increase payload limit to support larger CSV uploads wrapped in JSON
app.use(express.json({ limit: '25mb' }));
// Force JSON content type for API responses by default and reflect allowed origins
app.use((req, res, next) => {
  if (req.path && req.path.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const origin = req.headers.origin;
    if (isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || 'http://localhost:5173');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
    }
  }
  next();
});

  // Build a rich user profile payload (name, initials, role, first/last) using team_members linkage when available
  async function buildUserPayload(user) {
    try {
      let tm = null;
      try {
        const r = await pool.query('SELECT first_name, last_name, initials FROM team_members WHERE user_id = $1 LIMIT 1', [user.id]);
        tm = r.rows[0] || null;
      } catch {}
      let firstName = tm?.first_name || null;
      let lastName = tm?.last_name || null;
      let initials = tm?.initials || null;
      const uname = String(user.username || '').toLowerCase();
      // Special-case friendly names for known admins if team member linkage is missing
      if (!firstName) {
        if (uname === 'reki@framo.no') firstName = 'Reno';
        else if (uname === 'rsak@framo.no') firstName = 'Rune';
      }
      if (!initials) {
        const i1 = (firstName || '').charAt(0);
        const i2 = (lastName || '').charAt(0);
        const comp = (i1 + i2) || String(user.username || '').slice(0, 2);
        initials = String(comp).toUpperCase();
      }
      const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || user.username;
      return {
        name: displayName,
        initials,
        role: user.role,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        email: user.email || user.username,
      };
    } catch {
      return {
        name: user.username,
        initials: String(user.username || '').slice(0, 2).toUpperCase(),
        role: user.role,
        email: user.email || user.username,
      };
    }
  }

// Simple health endpoint
app.get('/api/health', (req, res) => {
  let dbHost = null;
  try {
    if (RAW_DB_URL) {
      const u = new URL(RAW_DB_URL);
      dbHost = u.hostname + (u.port ? ':' + u.port : '');
    }
  } catch {}
  res.json({
    ok: true,
    uptime: process.uptime(),
    commit: process.env.APP_COMMIT || null,
    dbHost
  });
});

// Lightweight debug info to verify deployment wiring (DB target, schema flags, user counts)
app.get('/api/debug/info', async (req, res) => {
  try {
    // Parse DB target from configured URL
    let db = { host: 'localhost', database: 'crmdb', ssl: false };
    try {
      const u = new URL(RAW_DB_URL || 'postgres://crmuser:crmpassword@localhost:5432/crmdb');
      db.host = u.hostname + (u.port ? ':' + u.port : '');
      db.database = (u.pathname || '').replace(/^\//, '') || undefined;
      const ssl = u.searchParams.get('ssl') || u.searchParams.get('sslmode');
      db.ssl = !!(ssl && /^(require|1|true)$/i.test(ssl));
    } catch {}

    // Collect basic server/session info
    let searchPath = '';
    let serverVersion = '';
    try {
      const r = await pool.query("SELECT current_setting('search_path') AS search_path, version() AS version");
      searchPath = r.rows[0]?.search_path || '';
      serverVersion = r.rows[0]?.version || '';
    } catch {}

    // Schema feature flags (existence checks)
    async function hasColumn(table, column) {
      try {
        const q = `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2 LIMIT 1`;
        const { rows } = await pool.query(q, [String(table), String(column)]);
        return rows.length > 0;
      } catch { return false; }
    }
    async function hasTable(table) {
      try {
        const q = `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1 LIMIT 1`;
        const { rows } = await pool.query(q, [String(table)]);
        return rows.length > 0;
      } catch { return false; }
    }

    const flags = {
      users_role: await hasColumn('users', 'role'),
      team_members: await hasTable('team_members'),
      project_line_items: await hasTable('project_line_items'),
      product_descriptions: await hasTable('product_descriptions'),
      activity_reads: await hasTable('activity_reads'),
    };

    // User counts and presence of seeded admins
    let totalUsers = 0; let adminUsers = 0; let hasReno = false; let hasRune = false;
    try {
      const all = await pool.query('SELECT COUNT(*)::int AS n FROM users');
      totalUsers = all.rows?.[0]?.n || 0;
    } catch {}
    try {
      if (flags.users_role) {
        const r = await pool.query("SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin'");
        adminUsers = r.rows?.[0]?.n || 0;
      }
    } catch {}
    try {
      const r2 = await pool.query('SELECT LOWER(email) AS email, LOWER(username) AS username FROM users');
      const emails = new Set(r2.rows.flatMap(r => [r.email, r.username].filter(Boolean)));
      hasReno = emails.has('reki@framo.no');
      hasRune = emails.has('rsak@framo.no');
    } catch {}

    res.json({
      time: new Date().toISOString(),
      db: { ...db, searchPath, serverVersion },
      schema: flags,
      users: { total: totalUsers, admins: adminUsers, reki: hasReno, rsak: hasRune },
    });
  } catch (err) {
    console.error('debug/info error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Database connection (Render-compatible) ---
// Normalize connection string and make SSL explicit for hosted DBs
let RAW_DB_URL = process.env.DATABASE_URL ? String(process.env.DATABASE_URL).trim() : '';
if (RAW_DB_URL && RAW_DB_URL.startsWith('postgresql://')) {
  // Some pg versions work better with postgres://
  RAW_DB_URL = 'postgres://' + RAW_DB_URL.slice('postgresql://'.length);
}

// Basic diagnostics to help when connection fails
try {
  if (RAW_DB_URL) {
    const u = new URL(RAW_DB_URL);
    const hostInfo = `${u.hostname}${u.port ? ':' + u.port : ''}/${(u.pathname || '').replace(/^\//, '')}`;
    console.log(`[DB] Connecting to ${hostInfo} (ssl=${u.searchParams.get('ssl') || u.searchParams.get('sslmode') || 'n/a'})`);
  } else {
    console.log('[DB] No DATABASE_URL provided, defaulting to local postgres at postgres://crmuser:crmpassword@localhost:5432/crmdb');
  }
} catch {}

const pool = new Pool({
  connectionString: RAW_DB_URL || 'postgres://crmuser:crmpassword@localhost:5432/crmdb',
  // On Render (external URL), SSL is required. For local dev, disable.
  ssl: RAW_DB_URL ? { rejectUnauthorized: false, require: true } : false,
});

// Helpful listener to surface initial connection errors clearly
pool.on('error', (err) => {
  if (err && (err.code === 'ENOTFOUND' || /ENOTFOUND/.test(String(err)))) {
    console.error('\n[DB] DNS could not resolve your database host. If you\'re running locally, ensure you\'re using the External Database URL from Render, not the Internal URL.');
  }
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
  // Ensure columns used by project create/update exist even if migrations lag behind
  try {
    await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS self_cost_per_vessel NUMERIC');
    await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS flow_description TEXT');
    await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS flow_capacity_m3h NUMERIC');
    await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS flow_mwc NUMERIC');
    await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS flow_power_kw NUMERIC');
  } catch (e) {
    console.warn('Warning: projects flow/self_cost guards failed:', e?.message || e);
  }
  } catch (e) {
    console.warn('Warning: failed ensuring activity_reads table:', e?.message || e);
  }
})();

// --- First-user bootstrap (optional) ---
// If there are no users yet and DEFAULT_ADMIN_USERNAME/PASSWORD are provided,
// create the initial account automatically. Otherwise, the UI's Register flow can be used.
(async () => {
  try {
    const r = await pool.query('SELECT COUNT(*)::int AS n FROM users');
    const n = (r.rows?.[0]?.n) ?? 0;
    if (n === 0) {
      const u = process.env.DEFAULT_ADMIN_USERNAME;
      const p = process.env.DEFAULT_ADMIN_PASSWORD;
      if (u && p) {
        const hash = await bcrypt.hash(p, 10);
        await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [u, hash]);
        console.log(`[Auth] Created default admin user '${u}' as the first user.`);
      } else {
        console.log('[Auth] No users found. Use the Register button in the UI to create the first account, or set DEFAULT_ADMIN_USERNAME and DEFAULT_ADMIN_PASSWORD to auto-create.');
      }
    }
  } catch (e) {
    console.warn('[Auth] Bootstrap check failed:', e?.message || e);
  }
})();

// --- Special admin accounts bootstrap (Reno & Rune) ---
// Ensures these two exist with email-as-username and known initial passwords.
// This runs idempotently on startup.
(async () => {
  try {
    const specials = [
      { email: 'reki@framo.no', password: 'reki', role: 'admin', first_name: 'Reno' },
      { email: 'rsak@framo.no', password: 'rsak', role: 'admin', first_name: 'Rune' },
    ];
    // Detect if users.role column exists to keep compatibility with older schemas
    let hasRoleCol = false;
    try {
      const { rows: roleRows } = await pool.query(
        "SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='role' LIMIT 1"
      );
      hasRoleCol = roleRows.length > 0;
    } catch {}
    for (const s of specials) {
      const email = String(s.email).toLowerCase();
      const hash = await bcrypt.hash(s.password, 10);
      const found = await pool.query('SELECT id FROM users WHERE lower(username)=lower($1) OR lower(email)=lower($1) LIMIT 1', [email]);
      if (found.rows.length) {
        const id = found.rows[0].id;
        if (hasRoleCol) {
          await pool.query(
            'UPDATE users SET username=$1, email=$1, role=$2, password=$3 WHERE id=$4',
            [email, s.role, hash, id]
          );
        } else {
          await pool.query(
            'UPDATE users SET username=$1, email=$1, password=$2 WHERE id=$3',
            [email, hash, id]
          );
        }
        // Ensure a team_members row is linked for proper names
        try {
          const tm = await pool.query('SELECT id FROM team_members WHERE user_id = $1', [id]);
          if (tm.rows.length) {
            await pool.query('UPDATE team_members SET first_name = COALESCE(first_name,$1) WHERE user_id = $2', [s.first_name, id]);
          } else {
            await pool.query('INSERT INTO team_members (first_name, user_id) VALUES ($1, $2)', [s.first_name, id]);
          }
        } catch {}
      } else {
        if (hasRoleCol) {
          await pool.query(
            'INSERT INTO users (username, email, role, password) VALUES ($1, $1, $2, $3)',
            [email, s.role, hash]
          );
        } else {
          await pool.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $1, $2)',
            [email, hash]
          );
        }
        try {
          const created = await pool.query('SELECT id FROM users WHERE lower(email)=lower($1) LIMIT 1', [email]);
          const id = created.rows[0]?.id;
          if (id) {
            await pool.query('INSERT INTO team_members (first_name, user_id) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING', [s.first_name, id]);
          }
        } catch {}
      }
    }
    console.log('[Auth] Ensured special admin accounts (Reno, Rune).');
  } catch (e) {
    console.warn('[Auth] Special admins bootstrap failed:', e?.message || e);
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

// --- Quote helpers ---
function coalesce(val, def) { return val !== undefined && val !== null && val !== '' ? val : def; }
function toNum(n) { const v = Number(n); return Number.isFinite(v) ? v : undefined; }
function get(obj, path) {
  if (!obj) return undefined;
  if (Array.isArray(path)) {
    for (const p of path) {
      const v = get(obj, p);
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return undefined;
  }
  const parts = String(path).split('.');
  let cur = obj;
  for (const key of parts) {
    if (cur && Object.prototype.hasOwnProperty.call(cur, key)) cur = cur[key]; else return undefined;
  }
  return cur;
}

function buildQuoteItems(proj, estData, templates = {}) {
  // Always build curated items from estimator data to avoid dumping UI skeleton rows.

  // Template fill helper using product_descriptions rows
  const fill = (key, vars) => {
    const t = templates && templates[key];
    if (!t) return null;
    return String(t).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => {
      const v = vars && (vars[k] ?? vars[k.replace(/([A-Z])/g, '_$1').toLowerCase()]);
      return v !== undefined && v !== null ? String(v) : '';
    });
  };

  const items = [];
  // Prefer quantities from estimator line items when available
  const liAll = Array.isArray(estData?.lineItems) ? estData.lineItems : [];
  const pumpQty = (() => {
    const q = liAll.find(x => x && x.isPump)?.qty;
    const n = toNum(q);
    if (n && n > 0) return n;
    return coalesce(toNum(estData.pumpQuantity), proj.pumps_per_vessel || 1);
  })();
  // Try nested pump object first
  const pumpType = coalesce(
    get(estData, ['pump.type', 'pump.model']) || estData.pumpType || estData.pump_model || estData.pumpModel,
    'RBP-250 inline reversible single stage propeller pump'
  );
  const cap = coalesce(toNum(estData.capacity_m3h), proj.flow_capacity_m3h);
  const head = coalesce(toNum(estData.head_mwc), proj.flow_mwc);
  const power = coalesce(toNum(estData.power_kw), proj.flow_power_kw);
  const ex = Boolean(estData.ex ?? get(estData, 'motor.ex')) || String(estData.motorRating || '').toUpperCase().includes('EX');
  const motorType = coalesce(estData.motorType ?? get(estData,'motor.type'), ex ? 'Ex motor' : 'IE3');
  const ipPart = ex ? 'Ex-rated motor' : 'IP55';
  const grid = coalesce(estData.supply || estData.power_requirements || get(estData,'power.supply'), '440V/60Hz/3ph');
  const motorPower = coalesce(toNum(estData.motor_power_kw ?? get(estData,'motor.kw')), power);
  // Prefer explicit variant from estimator (EX-Proof / NON EX-Proof)
  const motorVariantLabel = (() => {
    const mv = (Array.isArray(liAll) ? liAll.find(x => x && x.isMotor)?.motorVariant : undefined);
    if (mv && String(mv).trim()) return String(mv);
    return ex ? 'EX-Proof' : 'NON EX-Proof';
  })();
  const capStr = [cap != null ? `${cap} m3/h` : null, head != null ? `${head} mwc` : null, power != null ? `${power} kW` : null].filter(Boolean).join(' @ ');
  const flangeVal = coalesce(get(estData, ['flangeType','pump.flange','flange']), '');
  const flange = flangeVal ? `, flange ${flangeVal}` : '';
  const manometer = (estData.manometer === true || get(estData,'pump.manometer') === true) ? ', with manometer' : '';
  // Prefer DB-backed pump description template based on model
  const modelStr = String(pumpType || '').toUpperCase();
  let pumpKey = null;
  if (modelStr.includes('RBP-250')) pumpKey = 'ah_pump_rbp_250';
  else if (modelStr.includes('RBP-300')) pumpKey = 'ah_pump_rbp_300';
  else if (modelStr.includes('RBP-400')) pumpKey = 'ah_pump_rbp_400';
  let pumpDesc = pumpKey ? fill(pumpKey, {
    capacity: cap,
    head: head,
    motorRating: motorPower,
    motorVariant: motorVariantLabel,
  }) : null;
  if (!pumpDesc) {
    pumpDesc = `${pumpType}, capacity ${capStr || 'n/a'}, ${ipPart} el. motor${motorPower!=null?` rating ${motorPower} kW`:''} (${motorType}) at ${grid}${flange}${manometer}. Thermistor and space-heater included.`;
  }
  if (pumpQty && pumpQty > 0) items.push({ kind: 'pump', qty: pumpQty, unit: 'of', description: pumpDesc, capacity: cap, head });

  const csQty = toNum(estData.controlSystemQty ?? get(estData,'control.qty')) ?? 1;
  if (csQty > 0) {
    const csMode = coalesce(get(estData,['control.mode','controlSystemMode']), 'Automatically or manually operated');
    const csScreen = coalesce(get(estData,['control.screen','controlSystemScreen']), '7” touch screen');
    const csMount = coalesce(get(estData,['control.mount','controlSystemMount']), 'desk or cabinet-wall mounted');
    const csIface = coalesce(get(estData,['control.interface','controlSystemInterface']), 'ModBus RS485 for interface to vessel IAS');
    const csDesc = `${csMode} control system (MCU) with ${csScreen}, ${csMount}. ${csIface}.`;
    items.push({ kind: 'control_system', qty: csQty, unit: 'of', description: csDesc });
  }

  const starterQty = (() => {
    const q = liAll.find(x => x && x.isStarter)?.qty;
    const n = toNum(q);
    if (n && n > 0) return n;
    return toNum(estData.starterQty) ?? (pumpQty || 0);
  })();
  if (starterQty > 0) {
    const stType = String(estData.starterType || '').toUpperCase();
    let stKey = 'ah_starter_dol';
    if (stType.includes('VFD')) stKey = 'ah_starter_vfd';
    else if (stType.includes('SOFT')) stKey = 'ah_starter_soft';
    else if (stType.includes('Y') || stType.includes('DELTA')) stKey = 'ah_starter_yd';
    const stDesc = fill(stKey, { starterType: stType }) || 'DOL starter for the el. motor with ammeter, running-hour and emergency stop.';
    items.push({ kind: 'starter', qty: starterQty, unit: 'of', description: stDesc });
  }

  // ---- Valves from estimator line-items ----
  try {
    const li = Array.isArray(estData?.lineItems) ? estData.lineItems : [];
    const sumQty = (arr) => arr.reduce((s, x) => s + (Number(x?.qty) || 0), 0);
    const modelOf = (m) => {
      const u = String(m || '').toUpperCase();
      if (u.includes('DBL FLANGE')) return 'DBL Flange';
      if (u.includes('SEMI-LUG')) return 'Semi-Lug';
      if (u.includes('LUG')) return 'Lug';
      if (u.includes('WAFER')) return 'Wafer';
      if (u.includes('MONO')) return 'Mono';
      return 'Valve';
    };
    const breakdown = (arr) => {
      const map = new Map();
      for (const x of arr) {
        const n = Number(x?.qty) || 0;
        if (!n) continue;
        const label = modelOf(x?.valveModel);
        map.set(label, (map.get(label) || 0) + n);
      }
      return Array.from(map.entries()).map(([k,v]) => `${v} ${k}`).join(', ');
    };
    const pneSingle = li.filter(x => x?.isValve && (x.valveActing || 'Single-acting') === 'Single-acting');
    const pneDouble = li.filter(x => x?.isValve && (x.valveActing || 'Single-acting') === 'Double-acting');
    const elecSingle = li.filter(x => x?.isValveEH && (x.valveActing || 'Single-acting') === 'Single-acting');
    const elecDouble = li.filter(x => x?.isValveEH && (x.valveActing || 'Single-acting') === 'Double-acting');
    const qPneS = sumQty(pneSingle);
    const qPneD = sumQty(pneDouble);
    const qEleS = sumQty(elecSingle);
    const qEleD = sumQty(elecDouble);
    // Pneumatic valves aggregated into one line when both actings present
    if ((qPneS + qPneD) > 0) {
      if (qPneS > 0 && qPneD > 0) {
        const partS = breakdown(pneSingle);
        const partD = breakdown(pneDouble);
        const desc = `${qPneS} single-acting${partS?` (${partS})`:''}, ${qPneD} double-acting${partD?` (${partD})`:''} Pneum. Valve`;
        items.push({ kind: 'valve_pne', qty: (qPneS + qPneD), unit: 'of', description: desc });
      } else if (qPneS > 0) {
        const partS = breakdown(pneSingle);
        const d = partS ? `Pneumatic butterfly valve, single-acting (${partS}).` : (fill('ah_valve_pne_single', {}) || 'Pneumatic butterfly valve, single-acting.');
        items.push({ kind: 'valve_pne_single', qty: qPneS, unit: 'of', description: d });
      } else if (qPneD > 0) {
        const partD = breakdown(pneDouble);
        const d = partD ? `Pneumatic butterfly valve, double-acting (${partD}).` : (fill('ah_valve_pne_double', {}) || 'Pneumatic butterfly valve, double-acting.');
        items.push({ kind: 'valve_pne_double', qty: qPneD, unit: 'of', description: d });
      }
    }
    // Electric valves aggregated into one line when both actings present
    if ((qEleS + qEleD) > 0) {
      if (qEleS > 0 && qEleD > 0) {
        const partS = breakdown(elecSingle);
        const partD = breakdown(elecDouble);
        const desc = `${qEleS} single-acting${partS?` (${partS})`:''}, ${qEleD} double-acting${partD?` (${partD})`:''} Electric Valve`;
        items.push({ kind: 'valve_electric', qty: (qEleS + qEleD), unit: 'of', description: desc });
      } else if (qEleS > 0) {
        const partS = breakdown(elecSingle);
        const d = partS ? `Electric-actuated butterfly valve, single-acting (${partS}).` : (fill('ah_valve_electric_single', {}) || 'Electric-actuated butterfly valve, single-acting.');
        items.push({ kind: 'valve_electric_single', qty: qEleS, unit: 'of', description: d });
      } else if (qEleD > 0) {
        const partD = breakdown(elecDouble);
        const d = partD ? `Electric-actuated butterfly valve, double-acting (${partD}).` : (fill('ah_valve_electric_double', {}) || 'Electric-actuated butterfly valve, double-acting.');
        items.push({ kind: 'valve_electric_double', qty: qEleD, unit: 'of', description: d });
      }
    }
  } catch {}

  const levelSwitchQty = toNum(estData.levelSwitchQty) || (() => {
    const li = Array.isArray(estData?.lineItems) ? estData.lineItems : [];
    return li.filter(x => x?.isLevelSwitch).reduce((s, x) => s + (Number(x?.qty) || 0), 0);
  })();
  if (levelSwitchQty && levelSwitchQty > 0) items.push({ kind: 'level_switch', qty: levelSwitchQty, unit: 'of', description: fill('ah_level_switch', {}) || 'Level switch for high/low level alarm in tanks' });

  // Class certification
  const klass = (Array.isArray(estData?.lineItems) ? estData.lineItems : []).find(x => x?.isClassCert);
  const classSociety = klass?.classSociety || estData?.classSociety || '';
  const classBracket = klass?.classBracket || estData?.classBracket || '';
  if (classSociety) {
    const cDesc = fill('ah_class_cert', { classSociety, classBracket }) || `Class certification by ${classSociety}${classBracket ? ` (${classBracket})` : ''}.`;
    items.push({ kind: 'class_cert', qty: 1, unit: 'of', description: cDesc });
  }

  // Always append tools/manuals and commissioning lines
  items.push({ kind: 'tools_set', qty: 1, unit: 'set', description: fill('ah_tools_manuals', {}) || 'Tools, service manuals and class required certificates.' });

  const supportPersons = toNum(estData.startupSupportPersons) ?? 1;
  const extraDays = toNum(estData.extraCommissioningDays) ?? 0;
  const supportDays = 3 + (Number.isFinite(extraDays) ? extraDays : 0);
  items.push({ kind: 'startup_support', qty: 1, unit: 'of', description: fill('ah_commissioning', { commissionDays: supportDays, persons: supportPersons }) || `Assistance at start-up commissioning of the system, ${supportPersons}-man, ${supportDays}-working days.` });

  return items;
}

function normalizeDirectItems(items) {
  if (!Array.isArray(items)) return [];
  const out = [];
  for (const it of items) {
    if (!it) continue;
    const qty = toNum(it.qty ?? it.quantity ?? it.count) ?? 1;
    const unit = (it.unit && String(it.unit).trim()) || 'of';
    const desc = coalesce(
      it.description,
      [it.name, it.title, it.type, it.model, it.details, it.spec]
        .filter(x => x && String(x).trim()).map(String).join(' - ')
    );
    if (!desc) continue;
    out.push({ kind: it.kind || it.type || null, qty, unit, description: String(desc) });
  }
  return out;
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
// Register (email is the username)
app.post('/api/register', async (req, res) => {
  try {
  const { email: rawEmail, username: rawUser, password } = req.body || {};
  const email = String(rawEmail || rawUser || '').toLowerCase().trim();
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
  if (!password) return res.status(400).json({ error: 'Password required' });
  // unique by email or username (case-insensitive)
  const userExists = await pool.query('SELECT 1 FROM users WHERE lower(username)=lower($1) OR lower(email)=lower($1) LIMIT 1', [email]);
  if (userExists.rows.length > 0) return res.status(409).json({ error: 'User already exists' });
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query('INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email', [email, email, hash]);
  res.status(201).json({ user: rows[0] });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login (accept email or username; both mapped to same user)
app.post('/api/login', async (req, res) => {
  try {
  const { email: rawEmail, username: rawUser, password } = req.body || {};
  const identifier = String(rawEmail || rawUser || '').trim();
  const user = await findUserFlexible(identifier);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  // bcryptjs is always available if required
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  const payload = await buildUserPayload(user);
  res.json({ token, user: payload });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Alternate auth paths (avoid ad-blockers that might block "/login")
app.post('/api/auth/register', async (req, res) => {
  try {
  const { email: rawEmail, username: rawUser, password } = req.body || {};
  const email = String(rawEmail || rawUser || '').toLowerCase().trim();
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
  if (!password) return res.status(400).json({ error: 'Password required' });
  const exists = await pool.query('SELECT 1 FROM users WHERE lower(username)=lower($1) OR lower(email)=lower($1) LIMIT 1', [email]);
  if (exists.rows.length > 0) return res.status(409).json({ error: 'User already exists' });
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query('INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email', [email, email, hash]);
  res.status(201).json({ user: rows[0] });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
  const { email: rawEmail, username: rawUser, password } = req.body || {};
  const identifier = String(rawEmail || rawUser || '').trim();
  const user = await findUserFlexible(identifier);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  const payload = await buildUserPayload(user);
  res.json({ token, user: payload });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Adblock-safe alias endpoints (prefer these in the frontend)
app.post('/api/session/register', async (req, res) => {
  try {
  const { email: rawEmail, username: rawUser, password } = req.body || {};
  const email = String(rawEmail || rawUser || '').toLowerCase().trim();
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
  if (!password) return res.status(400).json({ error: 'Password required' });
  const exists = await pool.query('SELECT 1 FROM users WHERE lower(username)=lower($1) OR lower(email)=lower($1) LIMIT 1', [email]);
  if (exists.rows.length > 0) return res.status(409).json({ error: 'User already exists' });
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query('INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email', [email, email, hash]);
  res.status(201).json({ user: rows[0] });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Lightweight info endpoint to help the UI decide initial auth mode
app.get('/api/auth/has-users', async (req, res) => {
  try {
    const r = await pool.query('SELECT COUNT(*)::int AS n FROM users');
    const n = (r.rows?.[0]?.n) ?? 0;
    res.json({ hasUsers: n > 0 });
  } catch (err) {
    console.error('has-users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/session/start', async (req, res) => {
  try {
  const { email: rawEmail, username: rawUser, password } = req.body || {};
  const identifier = String(rawEmail || rawUser || '').trim();
  const user = await findUserFlexible(identifier);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  const payload = await buildUserPayload(user);
  res.json({ token, user: payload });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Minimal alias that avoids common adblock keyword filters
app.post('/api/_/register', async (req, res) => {
  try {
  const { email: rawEmail, username: rawUser, password } = req.body || {};
  const email = String(rawEmail || rawUser || '').toLowerCase().trim();
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
  if (!password) return res.status(400).json({ error: 'Password required' });
  const exists = await pool.query('SELECT 1 FROM users WHERE lower(username)=lower($1) OR lower(email)=lower($1) LIMIT 1', [email]);
  if (exists.rows.length > 0) return res.status(409).json({ error: 'User already exists' });
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query('INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email', [email, email, hash]);
  res.status(201).json({ user: rows[0] });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/_/start', async (req, res) => {
  try {
  const { email: rawEmail, username: rawUser, password } = req.body || {};
  const identifier = String(rawEmail || rawUser || '').trim();
  const user = await findUserFlexible(identifier);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  const payload = await buildUserPayload(user);
  res.json({ token, user: payload });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Current user info from token
app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const uid = req.user && req.user.id;
    if (!uid) return res.status(401).json({ error: 'Invalid token' });
    const r = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [uid]);
    const user = r.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    const payload = await buildUserPayload(user);
    res.json({ user: payload });
  } catch (err) {
    console.error('Me endpoint error:', err);
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

// Admin-only middleware (auth + role check)
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const token = auth.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
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
  flowDescription: r.flow_description || undefined,
  flowCapacityM3h: r.flow_capacity_m3h !== null && r.flow_capacity_m3h !== undefined ? Number(r.flow_capacity_m3h) : undefined,
  flowMwc: r.flow_mwc !== null && r.flow_mwc !== undefined ? Number(r.flow_mwc) : undefined,
  flowPowerKw: r.flow_power_kw !== null && r.flow_power_kw !== undefined ? Number(r.flow_power_kw) : undefined,
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
      'price_per_vessel','vessel_size','vessel_size_unit','fuel_type',
      'flow_description','flow_capacity_m3h','flow_mwc','flow_power_kw'
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
  b.fuelType,
  b.flowDescription || null,
  b.flowCapacityM3h ?? null,
  b.flowMwc ?? null,
  b.flowPowerKw ?? null
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
  flowDescription: 'flow_description',
  flowCapacityM3h: 'flow_capacity_m3h',
  flowMwc: 'flow_mwc',
  flowPowerKw: 'flow_power_kw',
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
      const fields = ['number_of_vessels','pumps_per_vessel','price_per_vessel','vessel_size','vessel_size_unit','fuel_type','stage','value','currency','gross_margin_percent','flow_description','flow_capacity_m3h','flow_mwc','flow_power_kw'];
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
        gross_margin_percent: 'gross_margin_percent',
        flow_description: 'flow_description',
        flow_capacity_m3h: 'flow_capacity_m3h',
        flow_mwc: 'flow_mwc',
        flow_power_kw: 'flow_power_kw'
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
// Get all team members (admin only)
app.get('/api/team-members', requireAdmin, async (req, res) => {
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
    // Try normalized-first; on 42703 (missing columns), fall back to legacy-only
    const sqlNorm = `
      SELECT c.*,
             COALESCE(c.name, "Company") AS name,
             COALESCE(c.primary_activity_level_1, "Company Primary Activity - Level 1") AS type,
             COALESCE(c.nationality_region, "Company Nationality/Region") AS location,
             COALESCE(c.website, "Company Website") AS website,
             COALESCE(c.city, "Company City") AS address
        FROM companies c
       WHERE COALESCE(NULLIF(TRIM(COALESCE(c.name, "Company")), ''), '') <> ''
       ORDER BY c.id DESC`;
    try {
      const { rows } = await pool.query(sqlNorm);
      return res.json(rows);
    } catch (e) {
      if (!(e && e.code === '42703')) throw e;
    }
    const sqlLegacy = `
      SELECT companies.*, 
             "Company" AS name,
             "Company Primary Activity - Level 1" AS type,
             "Company Nationality/Region" AS location,
             "Company Website" AS website,
             "Company City" AS address
        FROM companies
       WHERE COALESCE(TRIM("Company"), '') <> ''
       ORDER BY id DESC`;
    const { rows } = await pool.query(sqlLegacy);
    res.json(rows);
  } catch (err) {
    console.error('Get companies error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/companies', requireAdmin, async (req, res) => {
  try {
    const { name, type, location, address, website } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing name' });
    // Insert into both normalized and legacy columns for compatibility
    const company = String(name).trim();
    const activity = type ? String(type).trim() : null;
    const nationality = location ? String(location).trim() : null;
    const city = address ? String(address).trim() : null;
    const site = website ? String(website).trim() : null;

    const cols = ['name', '"Company"'];
    const vals = [company, company];
    if (activity) { cols.push('primary_activity_level_1', '"Company Primary Activity - Level 1"'); vals.push(activity, activity); }
    if (nationality) { cols.push('nationality_region', '"Company Nationality/Region"'); vals.push(nationality, nationality); }
    if (city) { cols.push('city', '"Company City"'); vals.push(city, city); }
    if (site) { cols.push('website', '"Company Website"'); vals.push(site, site); }
    const ph = vals.map((_, i) => `$${i + 1}`).join(', ');
    try {
      const { rows } = await pool.query(
        `INSERT INTO companies (${cols.join(', ')}) VALUES (${ph}) RETURNING *`,
        vals
      );
      return res.status(201).json(rows[0]);
    } catch (e) {
      if (!(e && e.code === '42703')) throw e; // missing normalized columns
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
      return res.status(201).json(rows[0]);
    }
  } catch (err) {
    console.error('Add company error:', err);
    // Handle duplicate company name (unique index on lower("Company"))
    if (err && err.code === '23505') {
      return res.status(409).json({ error: 'Company already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/companies/:id', requireAdmin, async (req, res) => {
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
    // Map normalized names to both normalized and legacy columns
    const compat = {
      name: ['name', '"Company"'],
      type: ['primary_activity_level_1', '"Company Primary Activity - Level 1"'],
      location: ['nationality_region', '"Company Nationality/Region"'],
      address: ['city', '"Company City"'],
      website: ['website', '"Company Website"'],
      vessels: ['vessels', '"Vessels"'],
      nationality_region: ['nationality_region', '"Company Nationality/Region"'],
      primary_activity_level_1: ['primary_activity_level_1', '"Company Primary Activity - Level 1"'],
      city: ['city', '"Company City"'],
      size: ['size', '"Company Size"'],
      main_vessel_type: ['main_vessel_type', '"Company Main Vessel Type"'],
      email: ['email', '"Company Email Address"'],
      group_company: ['group_company', '"Group Company"'],
      tel_number: ['tel_number', '"Company Tel Number"']
    };
    const updates = [];
    const values = [];
    for (const [k, v] of Object.entries(body)) {
      if (v === undefined) continue;
      if (csvCols.includes(k)) {
        const q = '"' + k.replace(/"/g, '""') + '" = $' + (values.length + 1);
        updates.push(q);
        values.push(v);
        // mirror into normalized column when known
        const match = Object.entries(compat).find(([_, pair]) => pair[1] && pair[1] === '"' + k + '"');
        if (match) {
          updates.push(match[1][0] + ' = $' + (values.length + 1));
          values.push(v);
        }
      } else if (compat[k]) {
        const [norm, legacy] = compat[k];
        updates.push(norm + ' = $' + (values.length + 1));
        values.push(v);
        if (legacy) {
          updates.push(legacy + ' = $' + (values.length + 1));
          values.push(v);
        }
      }
    }
    if (!updates.length) return res.status(400).json({ error: 'No updatable fields provided' });
    values.push(id);
    try {
      const { rows } = await pool.query(
        `UPDATE companies SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
        values
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.json(rows[0]);
    } catch (e) {
      if (!(e && e.code === '42703')) throw e;
      // Fallback: only update legacy columns
      const csvCols = [
        'Company', 'Vessels', 'Company Nationality/Region', 'Company Primary Activity - Level 1',
        'Company City', 'Company Size', 'Company Main Vessel Type', 'Company Website',
        'Company Email Address', 'Group Company', 'Company Tel Number'
      ];
      const updatesLegacy = [];
      const valuesLegacy = [];
      for (const [k, v] of Object.entries(body)) {
        if (!csvCols.includes(k)) continue;
        updatesLegacy.push('"' + k.replace(/"/g, '""') + '" = $' + (valuesLegacy.length + 1));
        valuesLegacy.push(v);
      }
      if (!updatesLegacy.length) return res.status(400).json({ error: 'No updatable fields provided' });
      valuesLegacy.push(id);
      const { rows } = await pool.query(
        `UPDATE companies SET ${updatesLegacy.join(', ')} WHERE id = $${valuesLegacy.length} RETURNING *`,
        valuesLegacy
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.json(rows[0]);
    }
  } catch (err) {
    console.error('Update company error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CSV import endpoint removed

app.delete('/api/companies/:id', requireAdmin, async (req, res) => {
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

app.post('/api/contacts', requireAdmin, async (req, res) => {
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

app.put('/api/contacts/:id', requireAdmin, async (req, res) => {
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

app.delete('/api/contacts/:id', requireAdmin, async (req, res) => {
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
    const { rows: items } = await pool.query(
      `SELECT li.id, li.project_id, COALESCE(li.legacy_type, pv.variant_name) AS type,
              li.quantity::numeric AS quantity, li.capacity, li.head
         FROM project_line_items li
    LEFT JOIN product_variants pv ON pv.id = li.product_variant_id
        ORDER BY li.id DESC`
    );
    if (items.length > 0) return res.json(items);
    const { rows } = await pool.query('SELECT * FROM products ORDER BY id DESC');
    return res.json(rows);
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/products', requireAdmin, async (req, res) => {
  try {
    const { projectId, type, quantity, capacity, head } = req.body;
    if (!projectId || !type || !quantity) return res.status(400).json({ error: 'Missing fields' });
    const { rows } = await pool.query(
      'INSERT INTO project_line_items (project_id, legacy_type, quantity, capacity, head) VALUES ($1, $2, $3, $4, $5) RETURNING id, project_id, legacy_type AS type, quantity, capacity, head',
      [projectId, type, quantity, capacity, head]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Add product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { projectId, type, quantity, capacity, head } = req.body;
    const updates = [];
    const values = [];
    if (projectId !== undefined) { updates.push(`project_id = $${values.length + 1}`); values.push(projectId); }
    if (type !== undefined) { updates.push(`legacy_type = $${values.length + 1}`); values.push(type); }
    if (quantity !== undefined) { updates.push(`quantity = $${values.length + 1}`); values.push(quantity); }
    if (capacity !== undefined) { updates.push(`capacity = $${values.length + 1}`); values.push(capacity); }
    if (head !== undefined) { updates.push(`head = $${values.length + 1}`); values.push(head); }
    if (!updates.length) return res.status(400).json({ error: 'No updatable fields provided' });
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE project_line_items SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING id, project_id, legacy_type AS type, quantity, capacity, head`,
      values
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    const idNum = Number(req.params.id);
    if (!Number.isInteger(idNum)) return res.status(400).json({ error: 'Invalid id' });
    await pool.query('DELETE FROM project_line_items WHERE id = $1', [idNum]);
    res.status(204).end();
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Project Line Items (scoped) ---
function lineItemRowToApi(r) {
  return {
    id: String(r.id),
    projectId: String(r.project_id),
    productVariantId: r.product_variant_id != null ? String(r.product_variant_id) : null,
    type: r.legacy_type || null,
    quantity: r.quantity != null ? Number(r.quantity) : null,
    capacity: r.capacity != null ? Number(r.capacity) : null,
    head: r.head != null ? Number(r.head) : null,
    unitPrice: r.unit_price != null ? Number(r.unit_price) : null,
    currency: r.currency || null,
    discount: r.discount != null ? Number(r.discount) : null,
    unit: 'of',
    notes: r.notes || null,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
  };
}

// List line items for a project
app.get('/api/projects/:id/line-items', async (req, res) => {
  try {
    const { id } = req.params;
    const pid = coerceProjectId(id);
    if (!pid) return res.status(400).json({ error: 'Invalid project id' });
    const { rows } = await pool.query(
      'SELECT * FROM project_line_items WHERE project_id = $1 ORDER BY id DESC',
      [pid]
    );
    res.json(rows.map(lineItemRowToApi));
  } catch (err) {
    console.error('Get line items error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a line item to a project
app.post('/api/projects/:id/line-items', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const pid = coerceProjectId(id);
    if (!pid) return res.status(400).json({ error: 'Invalid project id' });
    const b = req.body || {};
    const { productVariantId = null, type = null, quantity = null, capacity = null, head = null, unitPrice = null, currency = null, discount = null, description = null, notes = null } = b;
    const finalNotes = description ? String(description) : (notes ? String(notes) : null);
    const { rows } = await pool.query(
      `INSERT INTO project_line_items (project_id, product_variant_id, legacy_type, quantity, capacity, head, unit_price, currency, discount, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [pid, productVariantId ? Number(productVariantId) : null, type, quantity, capacity, head, unitPrice, currency, discount, finalNotes]
    );
    res.status(201).json(lineItemRowToApi(rows[0]));
  } catch (err) {
    console.error('Add line item error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a line item
app.put('/api/line-items/:itemId', requireAuth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const b = req.body || {};
    const map = {
      productVariantId: 'product_variant_id',
      type: 'legacy_type',
      quantity: 'quantity',
      capacity: 'capacity',
      head: 'head',
      unitPrice: 'unit_price',
      currency: 'currency',
      discount: 'discount',
      description: 'notes',
      notes: 'notes'
    };
    const updates = [];
    const values = [];
    for (const [k, v] of Object.entries(b)) {
      if (!Object.prototype.hasOwnProperty.call(map, k)) continue;
      const col = map[k];
      const val = (k === 'productVariantId') ? (v ? Number(v) : null) : v;
      updates.push(`${col} = $${values.length + 1}`);
      values.push(val);
    }
    if (!updates.length) return res.status(400).json({ error: 'No updatable fields provided' });
    values.push(itemId);
    const { rows } = await pool.query(
      `UPDATE project_line_items SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(lineItemRowToApi(rows[0]));
  } catch (err) {
    console.error('Update line item error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a line item
app.delete('/api/line-items/:itemId', requireAuth, async (req, res) => {
  try {
    const { itemId } = req.params;
    await pool.query('DELETE FROM project_line_items WHERE id = $1', [itemId]);
    res.status(204).end();
  } catch (err) {
    console.error('Delete line item error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Project Members CRUD ---
// List members for a project (joined with team_members)
app.get('/api/projects/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    const pid = coerceProjectId(id);
    if (!pid) return res.status(400).json({ error: 'Invalid project id' });
    const { rows } = await pool.query(
      `SELECT pm.id, pm.project_id, pm.team_member_id, pm.role,
              tm.first_name, tm.last_name, tm.initials, tm.job_title, tm.user_id
         FROM project_members pm
         JOIN team_members tm ON tm.id = pm.team_member_id
        WHERE pm.project_id = $1
        ORDER BY pm.id DESC`,
      [pid]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get project members error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a member to a project
app.post('/api/projects/:id/members', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const pid = coerceProjectId(id);
    if (!pid) return res.status(400).json({ error: 'Invalid project id' });
    const { teamMemberId, role = null } = req.body || {};
    if (!teamMemberId) return res.status(400).json({ error: 'Missing teamMemberId' });
    const { rows } = await pool.query(
      `INSERT INTO project_members (project_id, team_member_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, team_member_id) DO UPDATE SET role = EXCLUDED.role
       RETURNING *`,
      [pid, teamMemberId, role]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Add project member error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a project member (role)
app.put('/api/project-members/:memberId', requireAdmin, async (req, res) => {
  try {
    const { memberId } = req.params;
    const { role = null } = req.body || {};
    const { rows } = await pool.query(
      'UPDATE project_members SET role = $1 WHERE id = $2 RETURNING *',
      [role, memberId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Update project member error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove a project member
app.delete('/api/project-members/:memberId', requireAdmin, async (req, res) => {
  try {
    const { memberId } = req.params;
    await pool.query('DELETE FROM project_members WHERE id = $1', [memberId]);
    res.status(204).end();
  } catch (err) {
    console.error('Delete project member error:', err);
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

// --- Admin: Product description templates ---
// Switch protection to requireAdmin middleware on endpoints below.

app.get('/api/admin/product-descriptions', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT key, scope_template, updated_at FROM product_descriptions ORDER BY key');
    res.json(rows);
  } catch (err) {
    console.error('List product-descriptions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/admin/product-descriptions/:key', requireAdmin, async (req, res) => {
  try {
    const k = String(req.params.key || '').trim();
    const tpl = String(req.body?.scope_template || '');
    if (!k || !tpl) return res.status(400).json({ error: 'key and scope_template are required' });
    const { rows } = await pool.query(
      `INSERT INTO product_descriptions(key, scope_template)
       VALUES ($1,$2)
       ON CONFLICT (key) DO UPDATE SET scope_template = EXCLUDED.scope_template, updated_at = NOW()
       RETURNING key, scope_template, updated_at`,
      [k, tpl]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Update product-description error:', err);
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

// Download a specific project file by id
app.get('/api/project-files/:id/download', async (req, res) => {
  try {
    const idNum = Number(req.params.id);
    if (!Number.isInteger(idNum)) return res.status(400).json({ error: 'Invalid id' });
    const { rows } = await pool.query('SELECT * FROM project_files WHERE id = $1', [idNum]);
    const f = rows[0];
    if (!f) return res.status(404).json({ error: 'Not found' });
    const name = f.name || `file_${idNum}`;
    const type = f.type || 'application/octet-stream';
    const base64 = f.content || '';
    let buf;
    try { buf = Buffer.from(base64, 'base64'); } catch { buf = Buffer.from(''); }
    res.setHeader('Content-Type', type);
    res.setHeader('Content-Disposition', `attachment; filename="${name.replace(/"/g, '')}"`);
    res.setHeader('Content-Length', String(buf.length));
    return res.status(200).send(buf);
  } catch (err) {
    console.error('Download project file error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Lightweight Reports for Dashboard ---
app.get('/api/reports/pipeline-summary', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT stage, COUNT(*)::int AS count, COALESCE(SUM(value),0)::numeric AS total FROM projects GROUP BY stage ORDER BY stage');
    const summary = rows.map(r => ({ stage: r.stage || '—', count: Number(r.count) || 0, total: Number(r.total) || 0 }));
    res.json({ summary });
  } catch (err) {
    console.error('Pipeline summary error:', err);
    res.status(200).json({ summary: [] });
  }
});

app.get('/api/reports/conversion', async (req, res) => {
  try {
    // Leads by status
    let leadsByStatus = [];
    try {
      const { rows } = await pool.query('SELECT COALESCE(status,\'Open\') AS status, COUNT(*)::int AS count FROM leads GROUP BY status ORDER BY status');
      leadsByStatus = rows.map(r => ({ status: r.status, count: Number(r.count) || 0 }));
    } catch {}
    // Projects by month (based on closing_date; last 12 months)
    let projectsByMonth = [];
    try {
      const { rows } = await pool.query("SELECT to_char(closing_date, 'YYYY-MM') AS month, COUNT(*)::int AS count FROM projects WHERE closing_date IS NOT NULL AND closing_date >= (CURRENT_DATE - INTERVAL '12 months') GROUP BY 1 ORDER BY 1");
      projectsByMonth = rows.map(r => ({ month: r.month, count: Number(r.count) || 0 }));
    } catch {}
    res.json({ leadsByStatus, projectsByMonth });
  } catch (err) {
    console.error('Conversion report error:', err);
    res.status(200).json({ leadsByStatus: [], projectsByMonth: [] });
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
    const pid = coerceProjectId(id);
    if (!pid) return res.status(400).json({ error: 'Invalid project id' });
    const type = (req.query.type && String(req.query.type)) || 'anti_heeling';
    const { rows } = await pool.query('SELECT * FROM project_estimates WHERE project_id = $1 AND type = $2', [pid, type]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(estimateRowToApi(rows[0]));
  } catch (err) {
    console.error('Get estimate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Preview the computed quote context (items and template data)
app.get('/api/projects/:id/quote-preview', async (req, res) => {
  try {
    const pid = coerceProjectId(req.params.id);
    if (!pid) return res.status(400).json({ error: 'Invalid project id' });
    const type = (req.query.type && String(req.query.type)) || 'anti_heeling';
    const pr = await pool.query('SELECT * FROM projects WHERE id = $1', [pid]);
    const proj = pr.rows[0];
    if (!proj) return res.status(404).json({ error: 'Project not found' });
    const est = await pool.query('SELECT * FROM project_estimates WHERE project_id = $1 AND type = $2', [pid, type]);
    if (!est.rows.length) return res.status(404).json({ error: 'Estimate not found' });
    const estData = est.rows[0].data || {};
    let items = [];
    if (Array.isArray(req.body?.items)) {
      items = normalizeDirectItems(req.body.items);
    }
    if (!items.length) items = buildQuoteItems(proj, estData);
    const now = new Date();
    const ymd = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const currency = proj.currency || 'USD';
    const pricePerVessel = proj.price_per_vessel != null ? Number(proj.price_per_vessel) : 0;
    const numberOfVessels = proj.number_of_vessels != null ? Number(proj.number_of_vessels) : 1;
    const total = pricePerVessel * numberOfVessels;
    const scope_of_supply = items.map((it,i)=>`${i+1}  ${it.qty} ${it.unit || 'of'}  ${it.description}`).join('\n');
    res.json({
      project: { id: String(proj.id), name: proj.name, opportunity_number: proj.opportunity_number },
      estimateType: type,
      estData,
      items,
      templateData: {
        date: ymd,
        project_no: proj.opportunity_number || '',
        project_name: proj.name || '',
        scope_of_supply,
        items,
        currency,
        base_price: pricePerVessel,
        number_of_vessels: numberOfVessels,
        total_price: total,
      }
    });
  } catch (err) {
    console.error('Quote preview error:', err);
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

// Save explicit quote items and optionally sync to line items
app.post('/api/projects/:id/quote-items', requireAuth, async (req, res) => {
  try {
    const pid = coerceProjectId(req.params.id);
    if (!pid) return res.status(400).json({ error: 'Invalid project id' });
    const type = (req.body && req.body.type) || 'anti_heeling';
    const items = normalizeDirectItems(req.body?.items || []);
    const syncLineItems = req.body?.syncLineItems !== false; // default true
    if (!items.length) return res.status(400).json({ error: 'No items provided' });

    // Upsert into project_estimates.data.quoteItems
    const pr = await pool.query(
      `INSERT INTO project_estimates (project_id, type, data)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, type)
       DO UPDATE SET data = project_estimates.data || jsonb_build_object('quoteItems', $3->'quoteItems'), updated_at = NOW()
       RETURNING *`,
      [pid, type, { quoteItems: items }]
    );

    if (syncLineItems) {
      try {
        await pool.query(`DELETE FROM project_line_items WHERE project_id = $1 AND notes LIKE 'MANUAL:%'`, [pid]);
        for (const it of items) {
          await pool.query(
            'INSERT INTO project_line_items (project_id, legacy_type, quantity, notes) VALUES ($1, $2, $3, $4)',
            [pid, it.kind || null, it.qty, 'MANUAL: ' + it.description]
          );
        }
      } catch (e) {
        console.warn('Warning: syncing manual line items failed:', e?.message || e);
      }
    }

    res.status(201).json({ ok: true, items });
  } catch (err) {
    console.error('Save quote-items error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate a simple text quote document from project + estimate
app.post('/api/projects/:id/generate-quote', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const pid = coerceProjectId(id);
    if (!pid) return res.status(400).json({ error: 'Invalid project id' });
    const { type = 'anti_heeling', syncLineItems = true, format = 'docx' } = req.body || {};
    const pr = await pool.query('SELECT * FROM projects WHERE id = $1', [pid]);
    const proj = pr.rows[0];
    if (!proj) return res.status(404).json({ error: 'Project not found' });
  const est = await pool.query('SELECT * FROM project_estimates WHERE project_id = $1 AND type = $2', [pid, type]);
    if (!est.rows.length) return res.status(400).json({ error: 'No estimate data saved' });

    // Determine if this is an Anti-Heeling quote for labeling and filename
    const isAntiHeeling = (String(type || '')).toLowerCase() === 'anti_heeling'
      || /anti[-_ ]?heeling/i.test(String(proj.project_type || ''));

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

    // Prepared-by (sales rep) info for signatures/placeholders
    let repName = '';
    let repTitle = '';
    if (proj.sales_rep_id) {
      try {
        const r = await pool.query('SELECT first_name, last_name, job_title FROM team_members WHERE id = $1', [proj.sales_rep_id]);
        if (r.rows[0]) {
          repName = [r.rows[0].first_name, r.rows[0].last_name].filter(Boolean).join(' ').trim();
          repTitle = r.rows[0].job_title || '';
        }
      } catch {}
    }

    function pick(val, def) { return val !== undefined && val !== null && val !== '' ? val : def; }
    function num(n) { const v = Number(n); return Number.isFinite(v) ? v : undefined; }

    // Build quote items from estimate data (pump + common components)
    const estDataSafe = est.rows[0].data || {};
    // Allow direct items override via request body
    let items = [];
    if (Array.isArray(req.body?.items)) {
      items = normalizeDirectItems(req.body.items);
    }
    if (!items.length) {
      // Load description templates from DB (product_descriptions)
      let templates = {};
      try {
        const { rows } = await pool.query('SELECT key, scope_template FROM product_descriptions');
        for (const r of rows) templates[r.key] = r.scope_template;
      } catch {}
      items = buildQuoteItems(proj, estDataSafe, templates);
      if (req.body && req.body.debug) {
        return res.json({ debug: true, items, templatesLoaded: Object.keys(templates).length });
      }
    }

    // TODO: extend with valves, controls, pipes, etc., based on estDataSafe

    function wrapText(s, width = 100) {
      const words = String(s || '').split(/\s+/);
      const lines = [];
      let cur = '';
      for (const w of words) {
        if (!cur.length) { cur = w; continue; }
        if ((cur + ' ' + w).length > width) { lines.push(cur); cur = w; } else { cur += ' ' + w; }
      }
      if (cur) lines.push(cur);
      return lines.length ? lines : [''];
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
    lines.push(`Quotation ${isAntiHeeling ? 'Anti-Heeling' : ''}`.trim());
    lines.push('');
    const header = [
      `Project no.: ${proj.opportunity_number || '—'}`,
      `Vessel: ${proj.vessel_size && proj.vessel_size_unit ? `${proj.vessel_size} ${proj.vessel_size_unit}` : '—'}`,
      `Date: ${ymd}`,
      `No. of pages: 1`
    ];
    lines.push(header.join(' | '));
    lines.push('');
    lines.push('Scope of supply and price.');
    lines.push('');
    // Items table (no per-item prices)
    if (items.length) {
      const wIdx = 4, wQty = 4, wUnit = 5, wDesc = 100;
      const pad = (s, w) => String(s ?? '').padEnd(w, ' ').slice(0, w);
      lines.push(`${pad('Item', wIdx)}  ${pad('Qty', wQty)}  ${pad('', wUnit)}  Description`);
      let i = 1;
      for (const it of items) {
        const descLines = wrapText(it.description, wDesc);
        const unit = it.unit || 'of';
        lines.push(`${pad(String(i), wIdx)}  ${pad(String(it.qty), wQty)}  ${pad(unit, wUnit)}  ${descLines[0]}`);
        for (let k = 1; k < descLines.length; k++) {
          lines.push(`${pad('', wIdx)}  ${pad('', wQty)}  ${pad('', wUnit)}  ${descLines[k]}`);
        }
        i++;
      }
      lines.push('');
    }
    // Price only (no per-item prices)
    lines.push(`Price: ${currency} ${total.toLocaleString()}`);
    lines.push('');

    // Optional extra info below
    if (proj.flow_description || proj.flow_capacity_m3h || proj.flow_mwc || proj.flow_power_kw) {
      const descr = proj.flow_description || '';
      const cap = proj.flow_capacity_m3h != null ? `${Number(proj.flow_capacity_m3h)} m3/h` : '';
      const mwc = proj.flow_mwc != null ? `${Number(proj.flow_mwc)} mwc` : '';
      const kw = proj.flow_power_kw != null ? `${Number(proj.flow_power_kw)} kW` : '';
      const parts = [cap, mwc, kw].filter(Boolean).join(' @ ');
      lines.push(`Flow: ${descr || parts || '—'}`);
    }
    if (startupLocation) lines.push(`- Startup Location: ${startupLocation}`);
    if (shippingRegion) lines.push(`- Shipping Region: ${shippingRegion}`);
    if (comments) {
      lines.push('');
      lines.push('Notes:');
      lines.push(comments);
    }
    lines.push('');
    lines.push('This is an automatically generated draft quote.');

    // Optionally sync items into project_line_items (idempotent-ish: remove previous auto items first)
    if (syncLineItems && items.length) {
      try {
        await pool.query(`DELETE FROM project_line_items WHERE project_id = $1 AND notes LIKE 'AUTO:%'`, [pid]);
        for (const it of items) {
          const notes = 'AUTO: ' + it.description;
          await pool.query(
            'INSERT INTO project_line_items (project_id, legacy_type, quantity, capacity, head, notes) VALUES ($1, $2, $3, $4, $5, $6)',
            [pid, it.kind, it.qty, it.capacity ?? null, it.head ?? null, notes]
          );
        }
      } catch (e) {
        console.warn('Warning: syncing line items failed:', e?.message || e);
      }
    }

    // Render output
    let outBuffer; let outName; let outMime;
    const fileNameSafe = (proj.name || 'quote').replace(/[^a-z0-9-_]+/gi, '_');
    const oppPart = proj.opportunity_number ? `_Opp-${String(proj.opportunity_number).replace(/[^a-z0-9-_]+/gi, '')}` : '';
    const prefix = isAntiHeeling ? 'Quote_Anti-Heeling' : 'Quote';

    let localFormat = String(format).toLowerCase();
    // Try DOCX template in backend/files/templates first
    if (localFormat === 'docx' && !outBuffer) {
      try {
        const templatesDir = path.join(__dirname, 'files', 'templates');
        // Prefer the provided file name, fall back to legacy name, then any .docx
        const preferred = ['Quote Anti-Heeling MAL.docx', 'quote_anti_heeling.docx'];
        let templatePath = null;
        for (const name of preferred) {
          const p = path.join(templatesDir, name);
          if (fs.existsSync(p)) { templatePath = p; break; }
        }
        if (!templatePath) {
          const list = fs.existsSync(templatesDir) ? fs.readdirSync(templatesDir) : [];
          const firstDocx = list.find(f => f.toLowerCase().endsWith('.docx'));
          if (firstDocx) templatePath = path.join(templatesDir, firstDocx);
        }
        if (fs.existsSync(templatePath)) {
          const docxtemplaterMod = await import('docxtemplater');
          const PizZipMod = await import('pizzip');
          const DocxTemplater = docxtemplaterMod.default || docxtemplaterMod;
          const PizZip = PizZipMod.default || PizZipMod;
          const tplBuf = fs.readFileSync(templatePath);
          const zip = new PizZip(tplBuf);
          const doc = new DocxTemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '{{', end: '}}' },
            nullGetter: () => '' // avoid 'undefined' appearing in cells
          });
          let scopeLines = [];
          let idx = 1;
          for (const it of items) {
            scopeLines.push(`${idx}  ${it.qty} ${it.unit || 'of'}  ${it.description}`);
            idx++;
          }
          const data = {
            date: ymd,
            project_no: proj.opportunity_number || '',
            project_name: proj.name || '',
            vessel_owner: ownerName || '',
            shipyard: shipyardName || '',
            vessel_type: proj.project_type || '',
            vessel_name: estData.vesselName || '',
            vessel_size: proj.vessel_size || '',
            vessel_size_unit: proj.vessel_size_unit || '',
            scope_of_supply: scopeLines.join('\n'),
            items: items.map((it, i) => ({ index: String(i + 1), qty: String(it.qty ?? ''), unit: String(it.unit || 'of'), description: String(it.description || '') })),
            flow_spec: proj.flow_description || '',
            flow_capacity_m3h: proj.flow_capacity_m3h || '',
            flow_mwc: proj.flow_mwc || '',
            flow_power_kw: proj.flow_power_kw || '',
            pump_quantity: items.find(i => i.kind === 'pump')?.qty || '',
            currency: currency,
            base_price: pricePerVessel || '',
            options_price: '',
            number_of_vessels: numberOfVessels,
            total_price: total,
            delivery_time: estData.deliveryTime || '',
            validity: estData.validity || '',
            contact_name: estData.contactName || '',
            contact_email: estData.contactEmail || '',
            contact_phone: estData.contactPhone || '',
            prepared_by_name: repName,
            prepared_by_title: repTitle,
          };
          doc.setData(data);
          doc.render();
          outBuffer = Buffer.from(doc.getZip().generate({ type: 'nodebuffer' }));
          outName = `${prefix}${oppPart}_${fileNameSafe}_${ymd}.docx`;
          outMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }
      } catch {}
    }
    if (localFormat === 'docx' && !outBuffer) {
      // Build DOCX with a header and an items table
      let mod;
      try { mod = await import('docx'); } catch { localFormat = 'txt'; }
      if (localFormat === 'docx') {
        const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } = mod;
        const children = [
          new Paragraph({ children: [new TextRun({ text: isAntiHeeling ? 'Quotation Anti-Heeling' : 'Quotation', bold: true, size: 28 })] }),
          new Paragraph({ text: `Project no.: ${proj.opportunity_number || '—'}    Vessel: ${proj.vessel_size && proj.vessel_size_unit ? `${proj.vessel_size} ${proj.vessel_size_unit}` : '—'}    Date: ${ymd}` }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: 'Scope of supply and price.', bold: true })] }),
        ];

        const tableRows = [];
        // Header row
        tableRows.push(new TableRow({ children: [
          new TableCell({ children: [new Paragraph('Item')]}),
          new TableCell({ children: [new Paragraph('Qty')]}),
          new TableCell({ children: [new Paragraph('Unit')]}),
          new TableCell({ children: [new Paragraph('Description')]}),
        ]}));
        let i = 1;
        for (const it of items) {
          tableRows.push(new TableRow({ children: [
            new TableCell({ children: [new Paragraph(String(i))]}),
            new TableCell({ children: [new Paragraph(String(it.qty))]}),
            new TableCell({ children: [new Paragraph(String(it.unit || 'of'))]}),
            new TableCell({ children: [new Paragraph(String(it.description))]}),
          ]}));
          i++;
        }
        const tbl = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        });
        children.push(tbl);
        children.push(new Paragraph(''));
        children.push(new Paragraph({ children: [new TextRun({ text: `Price: ${currency} ${total.toLocaleString()}`, bold: true })] }));

        const doc = new Document({ sections: [{ properties: {}, children }] });
        outBuffer = await Packer.toBuffer(doc);
        outName = `${prefix}${oppPart}_${fileNameSafe}_${ymd}.docx`;
        outMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }
    }
    if (!outBuffer) {
      const content = lines.join('\n');
      outBuffer = Buffer.from(content, 'utf8');
      outName = `${prefix}${oppPart}_${fileNameSafe}_${ymd}.txt`;
      outMime = 'text/plain';
    }

    const base64 = outBuffer.toString('base64');
    const { rows: fileRows } = await pool.query(
      'INSERT INTO project_files (project_id, name, type, size, content) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [pid, outName, outMime, outBuffer.length, base64]
    );

    try {
      const ins = await pool.query(
        'INSERT INTO activities (project_id, type, content, created_by_user_id, created_by_name) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [pid, 'note', `Generated quote document: ${outName}`, (req.user && req.user.id) || null, (req.user && req.user.username) || null]
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
    const msg = (err && (err.message || err.toString())) || 'Internal error';
    if (process.env.NODE_ENV !== 'production') {
      res.status(500).json({ error: 'Generate quote failed', message: msg });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
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
    const pid = coerceProjectId(id);
    if (!pid) return res.status(400).json({ error: 'Invalid project id' });
    const { rows } = await pool.query('SELECT * FROM tasks WHERE project_id = $1 ORDER BY due_date NULLS LAST, id DESC', [pid]);
    res.json(rows.map(taskRowToApi));
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/projects/:id/tasks', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const pid = coerceProjectId(id);
    if (!pid) return res.status(400).json({ error: 'Invalid project id' });
    const { title, status = 'open', dueDate = null, assignedTo = null, notes = null, priority = 2 } = req.body || {};
    if (!title) return res.status(400).json({ error: 'Missing title' });
    const { rows } = await pool.query(
      'INSERT INTO tasks (project_id, title, status, due_date, assigned_to, notes, priority) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [pid, title, status, dueDate, assignedTo ? Number(assignedTo) : null, notes, priority]
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
    const pid = coerceProjectId(id);
    if (!pid) return res.status(400).json({ error: 'Invalid project id' });
    const { rows } = await pool.query('SELECT * FROM activities WHERE project_id = $1 ORDER BY id DESC', [pid]);
    res.json(rows.map(activityRowToApi));
  } catch (err) {
    console.error('Get activities error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/projects/:id/activities', async (req, res) => {
  try {
    const { id } = req.params;
    const pid = coerceProjectId(id);
    if (!pid) return res.status(400).json({ error: 'Invalid project id' });
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
      [pid, type, content, createdById, createdByName]
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
    const pid = coerceProjectId(id);
    if (!pid) return res.status(400).json({ error: 'Invalid project id' });
    const userId = req.user.id;
    const result = await pool.query(
      `INSERT INTO activity_reads (activity_id, user_id)
       SELECT a.id, $1 FROM activities a
       WHERE a.project_id = $2
       ON CONFLICT DO NOTHING`,
      [userId, pid]
    );
    res.json({ marked: result.rowCount || 0 });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Add a team member
app.post('/api/team-members', requireAdmin, async (req, res) => {
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
app.delete('/api/team-members/:id', requireAdmin, async (req, res) => {
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
app.put('/api/team-members/:id', requireAdmin, async (req, res) => {
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
// Small helpers
function coerceProjectId(raw) {
  const m = String(raw ?? '').match(/\d+/);
  return m ? m[0] : null;
}
