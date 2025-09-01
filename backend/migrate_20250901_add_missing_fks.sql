-- Add useful foreign keys with NOT VALID to avoid issues on existing data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='tasks' AND constraint_name='fk_tasks_assigned_to') THEN
    ALTER TABLE tasks
      ADD CONSTRAINT fk_tasks_assigned_to FOREIGN KEY (assigned_to)
      REFERENCES team_members(id) ON DELETE SET NULL NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='activities' AND constraint_name='fk_activities_created_by_user') THEN
    ALTER TABLE activities
      ADD CONSTRAINT fk_activities_created_by_user FOREIGN KEY (created_by_user_id)
      REFERENCES users(id) ON DELETE SET NULL NOT VALID;
  END IF;
END $$;

