-- Migration: Ensure projects table has all required columns used by the API
-- Run with: psql "$DATABASE_URL" -f backend/migrate_projects_add_missing_columns_20250821.sql

ALTER TABLE IF EXISTS projects
  ADD COLUMN IF NOT EXISTS opportunity_number VARCHAR(255),
  ADD COLUMN IF NOT EXISTS order_number VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stage VARCHAR(50),
  ADD COLUMN IF NOT EXISTS value NUMERIC,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10),
  ADD COLUMN IF NOT EXISTS hedge_currency VARCHAR(10),
  ADD COLUMN IF NOT EXISTS gross_margin_percent NUMERIC,
  ADD COLUMN IF NOT EXISTS closing_date DATE,
  ADD COLUMN IF NOT EXISTS sales_rep_id INTEGER REFERENCES team_members(id),
  ADD COLUMN IF NOT EXISTS shipyard_id INTEGER REFERENCES companies(id),
  ADD COLUMN IF NOT EXISTS vessel_owner_id INTEGER REFERENCES companies(id),
  ADD COLUMN IF NOT EXISTS design_company_id INTEGER REFERENCES companies(id),
  ADD COLUMN IF NOT EXISTS primary_contact_id INTEGER REFERENCES contacts(id),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS number_of_vessels INTEGER,
  ADD COLUMN IF NOT EXISTS pumps_per_vessel INTEGER,
  ADD COLUMN IF NOT EXISTS price_per_vessel NUMERIC,
  ADD COLUMN IF NOT EXISTS vessel_size NUMERIC,
  ADD COLUMN IF NOT EXISTS vessel_size_unit VARCHAR(10),
  ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(20);

-- Optional: set sensible defaults where NULL
UPDATE projects SET number_of_vessels = COALESCE(number_of_vessels, 1);
UPDATE projects SET pumps_per_vessel = COALESCE(pumps_per_vessel, 1);
