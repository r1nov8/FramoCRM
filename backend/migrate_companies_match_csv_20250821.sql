BEGIN;

-- 1) Add CSV columns if missing (quoted identifiers to preserve spaces/symbols)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "Company" TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "Vessels" TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "Company Nationality/Region" TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "Company Primary Activity - Level 1" TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "Company City" TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "Company Size" TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "Company Main Vessel Type" TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "Company Website" TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "Company Email Address" TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "Group Company" TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "Company Tel Number" TEXT;

-- Only copy from legacy columns if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='name') THEN
    EXECUTE 'UPDATE companies SET "Company" = COALESCE("Company", name)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='type') THEN
    EXECUTE 'UPDATE companies SET "Company Primary Activity - Level 1" = COALESCE("Company Primary Activity - Level 1", type)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='location') THEN
    EXECUTE 'UPDATE companies SET "Company Nationality/Region" = COALESCE("Company Nationality/Region", location)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='website') THEN
    EXECUTE 'UPDATE companies SET "Company Website" = COALESCE("Company Website", website)';
  END IF;
END$$;
-- Copy from previously created snake_case columns if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='vessels') THEN
    EXECUTE 'UPDATE companies SET "Vessels" = COALESCE("Vessels", vessels)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='company_nationality_region') THEN
    EXECUTE 'UPDATE companies SET "Company Nationality/Region" = COALESCE("Company Nationality/Region", company_nationality_region)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='company_primary_activity_level_1') THEN
    EXECUTE 'UPDATE companies SET "Company Primary Activity - Level 1" = COALESCE("Company Primary Activity - Level 1", company_primary_activity_level_1)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='company_city') THEN
    EXECUTE 'UPDATE companies SET "Company City" = COALESCE("Company City", company_city)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='company_size') THEN
    EXECUTE 'UPDATE companies SET "Company Size" = COALESCE("Company Size", company_size)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='company_main_vessel_type') THEN
    EXECUTE 'UPDATE companies SET "Company Main Vessel Type" = COALESCE("Company Main Vessel Type", company_main_vessel_type)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='company_website') THEN
    EXECUTE 'UPDATE companies SET "Company Website" = COALESCE("Company Website", company_website)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='company_email_address') THEN
    EXECUTE 'UPDATE companies SET "Company Email Address" = COALESCE("Company Email Address", company_email_address)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='group_company') THEN
    EXECUTE 'UPDATE companies SET "Group Company" = COALESCE("Group Company", group_company)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='company_tel_number') THEN
    EXECUTE 'UPDATE companies SET "Company Tel Number" = COALESCE("Company Tel Number", company_tel_number)';
  END IF;
END$$;

-- 3) Recreate unique index on lower("Company")
DROP INDEX IF EXISTS companies_name_lower_idx;
CREATE UNIQUE INDEX IF NOT EXISTS companies_company_lower_idx ON companies ((lower("Company")));

-- 4) Drop old columns not in CSV (if they exist)
ALTER TABLE companies DROP COLUMN IF EXISTS name;
ALTER TABLE companies DROP COLUMN IF EXISTS type;
ALTER TABLE companies DROP COLUMN IF EXISTS location;
ALTER TABLE companies DROP COLUMN IF EXISTS address;
ALTER TABLE companies DROP COLUMN IF EXISTS website;

-- Drop previously created snake_case columns (keep only exact CSV columns and id)
ALTER TABLE companies DROP COLUMN IF EXISTS vessels;
ALTER TABLE companies DROP COLUMN IF EXISTS company_nationality_region;
ALTER TABLE companies DROP COLUMN IF EXISTS company_primary_activity_level_1;
ALTER TABLE companies DROP COLUMN IF EXISTS company_city;
ALTER TABLE companies DROP COLUMN IF EXISTS company_size;
ALTER TABLE companies DROP COLUMN IF EXISTS company_main_vessel_type;
ALTER TABLE companies DROP COLUMN IF EXISTS company_website;
ALTER TABLE companies DROP COLUMN IF EXISTS company_email_address;
ALTER TABLE companies DROP COLUMN IF EXISTS group_company;
ALTER TABLE companies DROP COLUMN IF EXISTS company_tel_number;

COMMIT;
