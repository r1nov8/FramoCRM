-- Migration: Add role column to users table for RBAC
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('admin', 'sales', 'pm')) DEFAULT 'sales';

-- Backfill: Set all current admins to 'admin', others to 'sales'
UPDATE users SET role = 'admin' WHERE is_admin = true;
UPDATE users SET role = 'sales' WHERE is_admin = false OR is_admin IS NULL;
