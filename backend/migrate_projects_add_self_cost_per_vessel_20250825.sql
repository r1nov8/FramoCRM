-- Add self_cost_per_vessel to projects to store per-vessel total self cost used for margin calculations
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS self_cost_per_vessel NUMERIC;
