-- Add flow spec fields to projects for Anti-Heeling and other project types
-- Idempotent: use IF NOT EXISTS to allow repeated runs safely
ALTER TABLE projects ADD COLUMN IF NOT EXISTS flow_description TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS flow_capacity_m3h NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS flow_mwc NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS flow_power_kw NUMERIC;
