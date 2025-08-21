import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pkg from 'pg';
import { parse as csvParse } from 'csv-parse/sync';
import format from 'pg-format';

dotenv.config();
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function usage() {
  console.log('Usage: node scripts/import_companies_csv.js /path/to/file.csv [--create-columns] [--drop-non-csv-columns]');
}

function countDelims(line, delim) {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { i++; continue; }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && ch === delim) count++;
  }
  return count;
}

function detectDelimiter(text) {
  const candidates = [',', ';', '\t', '|'];
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0).slice(0, 25);
  if (lines.length === 0) return ',';
  let best = { delim: ',', score: -1 };
  for (const d of candidates) {
    const counts = lines.map(l => countDelims(l, d));
    const nonZero = counts.filter(c => c > 0);
    if (nonZero.length === 0) continue;
    const sorted = [...nonZero].sort((a,b)=>a-b);
    const median = sorted[Math.floor(sorted.length/2)];
    if (median > best.score) best = { delim: d, score: median };
  }
  return best.score > 0 ? best.delim : ',';
}

function sanitizeToColumn(h) {
  const lowered = String(h).toLowerCase();
  let s = lowered.replace(/[^a-z0-9]+/g, '_');
  s = s.replace(/^_+|_+$/g, '').replace(/_+/g, '_');
  if (!s) s = 'col';
  if (s.length > 63) s = s.slice(0, 63);
  return s;
}
function quoteIdent(id) {
  if (!/^[a-z0-9_]+$/.test(id)) {
    const doubled = id.replace(/"/g, '""');
    return '"' + doubled + '"';
  }
  return '"' + id + '"';
}

function findHeader(headerKeys, ...alts) {
  return headerKeys.find(h => alts.some(a => new RegExp(`^${a}$`, 'i').test(h)));
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) { usage(); process.exit(1); }
  const filePath = args[0];
  const createColumns = args.includes('--create-columns');
  const dropNonCsv = args.includes('--drop-non-csv-columns');

  const absolutePath = path.resolve(filePath);
  console.log(`Reading CSV: ${absolutePath}`);
  const csv = await fs.readFile(absolutePath, 'utf8');
  const delimiter = detectDelimiter(csv);
  console.log(`Detected delimiter: ${JSON.stringify(delimiter)}`);

  let records;
  try {
    records = csvParse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      delimiter,
      relax_column_count: true
    });
  } catch (e) {
    console.error('Failed to parse CSV:', e.message);
    process.exit(1);
  }

  if (!records.length) {
    console.error('CSV contains no data rows');
    process.exit(1);
  }

  const headerKeys = Object.keys(records[0] || {});
  console.log('Detected headers:', headerKeys.join(', '));
  const nameHeader = findHeader(headerKeys, 'company\\s*name', 'name', 'company');
  if (!nameHeader) {
    console.error('Missing company name column. Include "Company Name" or "Name".');
    process.exit(1);
  }
  const typeHeader = findHeader(headerKeys, 'company\\s*type', 'type', 'company\\s*primary\\s*activity(\\s*-\\s*level\\s*1)?');
  const countryHeader = findHeader(headerKeys, 'country', 'location', 'company\\s*nationality[\\\\\/]region');
  const addressHeader = findHeader(headerKeys, 'address');
  const websiteHeader = findHeader(headerKeys, 'website', 'company\\s*website');

  const reserved = new Set(['id', 'created_at', 'updated_at']);
  const headerToColumn = new Map();
  // Use exact CSV header names as column names for all non-primary columns
  const primaryNameColumn = 'Company';
  for (const h of headerKeys) {
    if (h === nameHeader) { headerToColumn.set(h, primaryNameColumn); continue; }
    if (reserved.has(h)) continue;
    headerToColumn.set(h, h);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://crmuser:crmpassword@localhost:5432/crmdb',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  });
  const client = await pool.connect();
  try {
  // Drop legacy unique index on lower(name) to avoid conflicts when using CSV "Company" as the canonical key
  await client.query('DROP INDEX IF EXISTS companies_name_lower_idx');
    // We will ensure columns exist first, then create index on lower("Company").
    const { rows: cols } = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'companies'"
    );
  let existingCols = new Set(cols.map(c => c.column_name));
  let hasNameCol = existingCols.has('name');
  let hasTypeCol = existingCols.has('type');
  // Create any missing columns for all mapped headers including the primary name column
  const allColsForImport = Array.from(new Set(headerToColumn.values()));
  const missingCols = allColsForImport.filter(c => !existingCols.has(c));

    if (missingCols.length) {
      if (createColumns) {
        console.log('Adding missing columns:', missingCols.join(', '));
        for (const c of missingCols) {
          const ident = quoteIdent(c);
          await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS ${ident} TEXT`);
        }
      } else {
        const ts = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
        const fileName = `migrate_add_companies_columns_${ts}.sql`;
        const sql = missingCols.map(c => `ALTER TABLE companies ADD COLUMN IF NOT EXISTS "${c}" TEXT;`).join('\n') + '\n';
        const dest = path.resolve(path.dirname(__dirname), fileName);
        await fs.writeFile(dest, sql, 'utf8');
        console.error(`Missing columns. Created migration at ${dest}. Apply it and re-run.`);
        process.exit(1);
      }
    }

    // Optionally drop any non-CSV columns to exactly mirror the CSV headers (plus id/created/updated)
    if (dropNonCsv) {
      const allowed = new Set(['id', ...allColsForImport, 'created_at', 'updated_at']);
      const { rows: cols2 } = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'companies'"
      );
      const existing2 = cols2.map(c => c.column_name);
      const toDrop = existing2.filter(c => !allowed.has(c));
      if (toDrop.length) {
        console.log('Dropping non-CSV columns:', toDrop.join(', '));
        for (const c of toDrop) {
          await client.query(`ALTER TABLE companies DROP COLUMN IF EXISTS ${quoteIdent(c)}`);
        }
      } else {
        console.log('No extra columns to drop.');
      }
      // Refresh column state after drops
      const { rows: cols3 } = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'companies'"
      );
      existingCols = new Set(cols3.map(c => c.column_name));
      hasNameCol = existingCols.has('name');
      hasTypeCol = existingCols.has('type');
    }

    // Ensure unique index on lower("Company") for fast upserts
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS companies_company_lower_idx ON companies ((lower("Company")))');

    const norm = (v) => (v === undefined || v === null ? '' : String(v).trim());
    // Build stable column order for upsert
  const mappedCols = Array.from(new Set(Array.from(headerToColumn.values()).filter(c => c !== primaryNameColumn)));

    const batchSize = 500; // tune as needed
    let total = 0;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      // Prepare rows
      const valuesMatrix = [];
      for (const r of batch) {
        const nameVal = norm(r[nameHeader]);
        if (!nameVal) continue;
        const rowVals = [nameVal];
        const typeVal = typeHeader ? norm(r[typeHeader]) : '';
        for (const col of mappedCols) {
          // find the header that maps to this column
          let headerForCol = null;
          for (const [h, c] of headerToColumn.entries()) { if (c === col) { headerForCol = h; break; } }
          let val = headerForCol ? norm(r[headerForCol]) : '';
        rowVals.push(val || null);
        }
        // If type wasn’t mapped at all, ensure it’s included in insert columns with default, not in update
        const extended = [...rowVals];
        if (hasNameCol) extended.push(nameVal);
        if (hasTypeCol) extended.push(typeVal || 'Unknown');
        valuesMatrix.push(extended);
      }
      if (!valuesMatrix.length) { continue; }

      const insertCols = [primaryNameColumn, ...mappedCols, ...(hasNameCol ? ['name'] : []), ...(hasTypeCol ? ['type'] : [])];
  const updateCols = mappedCols; // don't update legacy name
      const updateSet = updateCols.map(c => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`).join(', ');

      await client.query('BEGIN');
      await client.query('SET LOCAL synchronous_commit = OFF');
      const insertSql = format(
  `INSERT INTO companies (%I) VALUES %L ON CONFLICT ((lower(${quoteIdent(primaryNameColumn)}))) DO UPDATE SET ${updateSet}`,
        insertCols,
  valuesMatrix
      );
      await client.query(insertSql);
      await client.query('COMMIT');
      total += valuesMatrix.length;
      console.log(`Upserted ${total}/${records.length}...`);
    }
    console.log(`Imported ${total} rows.`);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Import failed:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
