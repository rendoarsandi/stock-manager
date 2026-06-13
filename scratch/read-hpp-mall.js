import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  try {
    const filePath = path.resolve(__dirname, '../Ecomm HPP.xlsx');
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets['HPP MALL'];
    if (!ws) {
      console.log("HPP MALL sheet not found.");
      return;
    }
    const rawData = XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 });
    console.log("Total rows in HPP MALL:", rawData.length);
    for (let i = 0; i < Math.min(30, rawData.length); i++) {
      console.log(`Row ${i}:`, rawData[i].slice(0, 10));
    }
  } catch (err) {
    console.error(err);
  }
}

run();
