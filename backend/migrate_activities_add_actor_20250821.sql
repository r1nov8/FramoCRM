-- Extend activities with actor fields for accurate attribution
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;
