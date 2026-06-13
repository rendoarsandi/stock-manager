import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  try {
    const filePath = path.resolve(__dirname, '../Ecomm HPP.xlsx');
    const wb = XLSX.readFile(filePath);
    
    const terms = ['PLAIN MERAH', 'PLAIN BIRU', 'MERAH MERAH', 'PLAIN KUNING', 'MINI FLUO', 'FLUO', 'TURBO DELUXE', 'FLEX-YELLOW', 'ELEKTRIK'];
    
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 });
      
      data.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          if (cell) {
            const cellStr = String(cell).toUpperCase();
            if (terms.some(t => cellStr.includes(t))) {
              console.log(`[${sheetName}] Row ${rowIdx}, Col ${colIdx} (${XLSX.utils.encode_col(colIdx)}): "${cell}"`);
            }
          }
        });
      });
    }
  } catch (err) {
    console.error(err);
  }
}

run();
