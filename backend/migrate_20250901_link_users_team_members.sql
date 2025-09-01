-- Link team_members to users (optional association)
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS user_id INTEGER UNIQUE;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_team_member_user'
      AND conrelid = 'team_members'::regclass
  ) THEN
    ALTER TABLE team_members
      ADD CONSTRAINT fk_team_member_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END$$;

-- Attempt lightweight backfill: match by lower(initials) = first two letters of username when unique
DO $$
DECLARE r record; u_id int; cnt int;
BEGIN
  FOR r IN SELECT id, initials FROM team_members WHERE user_id IS NULL AND initials IS NOT NULL LOOP
    SELECT id INTO u_id FROM users
      WHERE lower(username) LIKE lower(substr(r.initials,1,2)) || '%'
      ORDER BY id ASC LIMIT 1;
    IF u_id IS NOT NULL THEN
      -- only set if this user isn't already linked by another team_member
      SELECT COUNT(*) INTO cnt FROM team_members WHERE user_id = u_id;
      IF cnt = 0 THEN
        UPDATE team_members SET user_id = u_id WHERE id = r.id;
      END IF;
    END IF;
  END LOOP;
END$$;
