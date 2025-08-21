-- Create tasks table for project tasks & reminders
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open | wip | blocked | done
  due_date DATE,
  assigned_to INTEGER, -- references team_members(id) optionally
  notes TEXT,
  priority SMALLINT DEFAULT 2, -- 1=high, 2=normal, 3=low
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
