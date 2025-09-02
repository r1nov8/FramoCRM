-- Create Market Intelligence and Leads tables

BEGIN;

-- Market Intelligence (manual intake first; optional validation by abroad office)
CREATE TABLE IF NOT EXISTS market_intel (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT, -- Tradewinds | ship.energy | Clarksons | Other
  url TEXT,
  summary TEXT,
  region TEXT,
  fuel_type TEXT, -- Methanol | LNG | NH3
  vessel_type TEXT,
  vessels_count INTEGER,
  notes TEXT,
  validated_by_office TEXT, -- CN | KR | JP | None
  validation_notes TEXT,
  status TEXT DEFAULT 'Open', -- Open | Promoted | Discarded
  discarded_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_market_intel_created_at ON market_intel(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_intel_status ON market_intel(status);

-- Leads (can convert to opportunity/project)
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  vessel_type TEXT,
  fuel_type TEXT,
  shipyard_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  owner_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  region TEXT,
  vessels_count INTEGER,
  source_intel_id INTEGER REFERENCES market_intel(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'Open', -- Open | Converted | Lost
  owner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

COMMIT;
