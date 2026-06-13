import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  try {
    const filePath = path.resolve(__dirname, '../Ecomm HPP.xlsx');
    const wb = XLSX.readFile(filePath);
    console.log("Sheet names in Ecomm HPP.xlsx:", wb.SheetNames);
  } catch (err) {
    console.error(err);
  }
}

run();
