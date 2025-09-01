BEGIN;

-- 1) Products: add description for Anti-Heeling scope-of-supply
ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 2) Add created_at / updated_at to users and projects
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE IF EXISTS projects
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 3) Trigger to update updated_at on users/projects
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_projects_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_projects_set_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;

-- 4) Helpful indexes on common foreign keys
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_shipyard_id ON projects(shipyard_id);
CREATE INDEX IF NOT EXISTS idx_projects_vessel_owner_id ON projects(vessel_owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_design_company_id ON projects(design_company_id);
CREATE INDEX IF NOT EXISTS idx_projects_sales_rep_id ON projects(sales_rep_id);

-- 5) Optional: guard against bad quantities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_quantity_positive'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_quantity_positive CHECK (quantity > 0);
  END IF;
END$$;

-- 6) Clean read-only views using tidy names
CREATE OR REPLACE VIEW app_user AS
SELECT
  id,
  NULL::text AS email,
  username AS name
FROM users;

CREATE OR REPLACE VIEW account AS
SELECT
  id,
  "Company"                      AS name,
  "Company"                      AS legal_name,
  "Company Website"              AS website,
  "Company Nationality/Region"   AS country,
  "Company Primary Activity - Level 1" AS segment,
  TRUE::boolean                   AS active
FROM companies;

COMMIT;
