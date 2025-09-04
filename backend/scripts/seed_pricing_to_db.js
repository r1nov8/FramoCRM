const { Pool } = require('pg');
const path = require('path');
const pd = require(path.join(__dirname, '..', '..', 'data', 'pricingData'));
const json = pd.PRICING_DATA || pd;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    await pool.query("INSERT INTO pricing_data (key, data) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data", ['pricing', json]);
    console.log('Pricing seeded into DB');
    process.exit(0);
  } catch (e) {
    console.error('Failed to seed pricing', e);
    process.exit(1);
  }
})();
