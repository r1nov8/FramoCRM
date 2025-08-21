-- Migration: Add address and website columns to companies table
ALTER TABLE companies
ADD COLUMN address VARCHAR(255),
ADD COLUMN website VARCHAR(255);
