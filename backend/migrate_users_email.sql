-- Goal: add email support without breaking existing username-based auth
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;

-- If username exists and email is NULL, backfill email from username
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_name = 'users' AND column_name = 'username'
	) THEN
		EXECUTE 'UPDATE users SET email = username WHERE email IS NULL';
	END IF;
END$$;

-- Keep username column for compatibility; ensure it exists if an earlier migration removed it
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE;

-- If email exists and username is NULL, backfill username from email (local part or full)
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_name = 'users' AND column_name = 'email'
	) THEN
		EXECUTE 'UPDATE users SET username = COALESCE(username, NULLIF(split_part(email, ''@'', 1), ''''))';
		EXECUTE 'UPDATE users SET username = COALESCE(username, email)';
	END IF;
END$$;

-- Do NOT enforce NOT NULL on email to avoid breaking existing rows
-- Keep both columns; backend uses username
