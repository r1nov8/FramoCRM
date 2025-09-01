-- Normalize companies to snake_case columns while keeping CSV-style columns for compatibility
-- 1) Add new columns if missing
ALTER TABLE companies ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS vessels TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS nationality_region TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS primary_activity_level_1 TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS main_vessel_type TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS group_company TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tel_number TEXT;

-- 2) Backfill snake_case from CSV-style quoted identifiers if present
UPDATE companies SET name = COALESCE(name, "Company");
UPDATE companies SET vessels = COALESCE(vessels, "Vessels");
UPDATE companies SET nationality_region = COALESCE(nationality_region, "Company Nationality/Region");
UPDATE companies SET primary_activity_level_1 = COALESCE(primary_activity_level_1, "Company Primary Activity - Level 1");
UPDATE companies SET city = COALESCE(city, "Company City");
UPDATE companies SET size = COALESCE(size, "Company Size");
UPDATE companies SET main_vessel_type = COALESCE(main_vessel_type, "Company Main Vessel Type");
UPDATE companies SET website = COALESCE(website, "Company Website");
UPDATE companies SET email = COALESCE(email, "Company Email Address");
UPDATE companies SET group_company = COALESCE(group_company, "Group Company");
UPDATE companies SET tel_number = COALESCE(tel_number, "Company Tel Number");

-- 3) Ensure case-insensitive uniqueness on name (where present)
CREATE UNIQUE INDEX IF NOT EXISTS companies_name_lower_idx ON companies ((lower(name))) WHERE name IS NOT NULL AND name <> '';

