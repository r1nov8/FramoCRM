-- Create table to store estimator payloads per project
CREATE TABLE IF NOT EXISTS project_estimates (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'anti_heeling',
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, type)
);

-- Trigger to keep updated_at fresh
-- Define/replace the trigger function unconditionally (idempotent)
CREATE OR REPLACE FUNCTION touch_project_estimates_updated_at()
RETURNS TRIGGER AS $func$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

-- Create trigger only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'project_estimates_touch_updated_at'
  ) THEN
    CREATE TRIGGER project_estimates_touch_updated_at
    BEFORE UPDATE ON project_estimates
    FOR EACH ROW EXECUTE FUNCTION touch_project_estimates_updated_at();
  END IF;
END $$;
