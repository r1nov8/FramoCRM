-- Migration: Add address and website columns to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS address VARCHAR(255),
ADD COLUMN IF NOT EXISTS website VARCHAR(255);
