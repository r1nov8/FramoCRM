-- Migration: Add role column to users table for RBAC
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('admin', 'sales', 'pm')) DEFAULT 'sales';

-- Backfill: Set admins if legacy is_admin exists; otherwise default remains 'sales'
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='is_admin'
	) THEN
		UPDATE users SET role = 'admin' WHERE is_admin = true;
		UPDATE users SET role = 'sales' WHERE is_admin = false OR is_admin IS NULL;
	END IF;
END$$;
