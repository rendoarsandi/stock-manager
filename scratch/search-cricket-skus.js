import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  try {
    const filePath = path.resolve(__dirname, '../Ecomm HPP.xlsx');
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets['SKUCODE'];
    const rawData = XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 });
    
    console.log("Searching SKUCODE sheet for Cricket/Plain/Fluo/etc...");
    const queries = ['CRICKET', 'FLUO', 'PLAIN', 'TURBO', 'MINI', 'HANGER'];
    
    rawData.forEach((row, idx) => {
      const rowStr = JSON.stringify(row).toUpperCase();
      if (queries.some(q => rowStr.includes(q))) {
        console.log(`Row ${idx}:`, row.slice(0, 10));
      }
    });
  } catch (err) {
    console.error(err);
  }
}

run();
