-- Migration: add pricing_data table to store JSON pricing blobs
CREATE TABLE IF NOT EXISTS pricing_data (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Example insert (run manually or via seed script):
-- INSERT INTO pricing_data (key, data) VALUES ('pricing', '{"example":1}');
