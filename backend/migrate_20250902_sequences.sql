-- Create an atomic document numbering table for OPP/PRJ sequences
-- Usage: one row per (prefix, year) e.g., ('OPP', 2025) with next as the next integer suffix
CREATE TABLE IF NOT EXISTS doc_numbers (
  prefix TEXT NOT NULL,
  year INTEGER NOT NULL,
  next INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (prefix, year)
);

-- Helpful index (covered by PK but kept for clarity/compatibility)
CREATE INDEX IF NOT EXISTS idx_doc_numbers_prefix_year ON doc_numbers(prefix, year);
