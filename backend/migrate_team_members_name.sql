-- Migration script: Split 'name' into 'first_name' and 'last_name' for team_members
-- 1. Add new columns
ALTER TABLE team_members ADD COLUMN first_name VARCHAR(100);
ALTER TABLE team_members ADD COLUMN last_name VARCHAR(100);

-- 2. Populate new columns by splitting 'name' (assumes 'name' is 'First Last')
UPDATE team_members
SET first_name = split_part(name, ' ', 1),
    last_name = COALESCE(NULLIF(split_part(name, ' ', 2), ''), '');

-- 3. Set NOT NULL constraints (if all rows are updated)
ALTER TABLE team_members ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE team_members ALTER COLUMN last_name SET NOT NULL;

-- 4. Drop old 'name' column
ALTER TABLE team_members DROP COLUMN name;
