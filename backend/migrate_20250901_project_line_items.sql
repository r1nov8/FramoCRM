-- Line items attached to projects; optionally reference product_variants
CREATE TABLE IF NOT EXISTS project_line_items (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  product_variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
  legacy_type TEXT,
  quantity NUMERIC,
  unit_price NUMERIC,
  currency TEXT,
  discount NUMERIC,
  notes TEXT,
  capacity NUMERIC,
  head NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Touch updated_at on update
CREATE OR REPLACE FUNCTION touch_project_line_items_updated_at()
RETURNS TRIGGER AS $func$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'project_line_items_touch_updated_at') THEN
    CREATE TRIGGER project_line_items_touch_updated_at
    BEFORE UPDATE ON project_line_items
    FOR EACH ROW EXECUTE FUNCTION touch_project_line_items_updated_at();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_project_line_items_project_id ON project_line_items(project_id);

-- Backfill from legacy products table if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products') THEN
    INSERT INTO project_line_items (project_id, legacy_type, quantity, capacity, head, currency)
    SELECT pr.project_id, pr.type, pr.quantity, pr.capacity, pr.head, pj.currency
    FROM products pr
    JOIN projects pj ON pj.id = pr.project_id
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

