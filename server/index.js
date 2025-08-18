import express from 'express';
import cors from 'cors';
import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the price list Excel workbook at startup
const workbookPath = path.join(__dirname, 'pricelist.xlsx');
let priceData = [];
try {
  const workbook = xlsx.readFile(workbookPath);
  const sheetName = workbook.SheetNames[0];
  priceData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
} catch (err) {
  console.error('Failed to load price list workbook:', err.message);
}

const app = express();
app.use(cors());

app.get('/api/pricelist', (_req, res) => {
  res.json(priceData);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Price list server running on port ${PORT}`);
});

