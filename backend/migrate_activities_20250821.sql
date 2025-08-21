-- Create activities table for project activity log
CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'note', -- note | status_change | system
  content TEXT NOT NULL,
  created_by INTEGER, -- optional, references team_members(id)
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities(project_id);
