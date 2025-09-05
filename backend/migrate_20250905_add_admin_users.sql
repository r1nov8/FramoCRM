-- Migration: Add Reno Kingston and Rune Sakslo as admin users
INSERT INTO users (username, email, first_name, last_name, job_title, role, is_admin, password)
VALUES
  ('reki@framo.no', 'reki@framo.no', 'Reno', 'Kingston', 'Sales & Business Developer', 'admin', true, '$2a$10$REPLACE_THIS_WITH_A_HASHED_PASSWORD'),
  ('rsak@framo.no', 'rsak@framo.no', 'Rune', 'Sakslo', 'Head of Sales', 'admin', true, '$2a$10$REPLACE_THIS_WITH_A_HASHED_PASSWORD')
ON CONFLICT (email) DO NOTHING;

-- NOTE: Replace $2a$10$REPLACE_THIS_WITH_A_HASHED_PASSWORD with a bcrypt hash for a secure password before running.
