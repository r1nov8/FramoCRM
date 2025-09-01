-- Project members linking many team_members to a project with role
CREATE TABLE IF NOT EXISTS project_members (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_member_id INTEGER NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  role TEXT,
  UNIQUE(project_id, team_member_id)
);

-- Seed owners from existing sales_rep_id
INSERT INTO project_members (project_id, team_member_id, role)
SELECT p.id, p.sales_rep_id, 'owner'
FROM projects p
JOIN team_members tm ON tm.id = p.sales_rep_id
ON CONFLICT DO NOTHING;

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_team_member_id ON project_members(team_member_id);

