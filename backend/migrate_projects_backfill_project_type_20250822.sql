-- Backfill project_type for legacy project rows
-- Heuristic: if notes/title contain 'anti-heeling' (case-insensitive) set to 'AH', else default to 'FT'

-- Ensure column exists (idempotent safety for manual runs)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_type TEXT;

-- Set AH when notes or name indicates Anti-Heeling
UPDATE projects
SET project_type = 'AH'
WHERE (
  (notes ILIKE '%anti-heeling%' OR notes ILIKE '%anti heeling%')
  OR (name ILIKE '%anti-heeling%' OR name ILIKE '%anti heeling%')
) AND (project_type IS NULL OR project_type = '');

-- Default remaining NULL/empty to FT
UPDATE projects
SET project_type = 'FT'
WHERE (project_type IS NULL OR project_type = '');
