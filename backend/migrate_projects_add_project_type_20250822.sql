-- Add project_type column to projects for classifying Fuel Transfer vs Anti-Heeling
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_type TEXT;
