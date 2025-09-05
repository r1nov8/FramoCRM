-- Insert admins without relying on legacy is_admin column; passwords will be set by reset script
INSERT INTO users (username, email, first_name, last_name, job_title, role, password)
VALUES
  ('reki@framo.no', 'reki@framo.no', 'Reno', 'Kingston', 'Sales & Business Developer', 'admin', '$2a$10$REPLACE_THIS_WITH_A_HASHED_PASSWORD'),
  ('rsak@framo.no', 'rsak@framo.no', 'Rune', 'Sakslo', 'Head of Sales', 'admin', '$2a$10$REPLACE_THIS_WITH_A_HASHED_PASSWORD')
ON CONFLICT (email) DO NOTHING;

-- NOTE: Replace $2a$10$REPLACE_THIS_WITH_A_HASHED_PASSWORD with a bcrypt hash for a secure password before running.
