import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const xlsxPath = path.resolve(__dirname, '../Ecomm HPP.xlsx');
const wb = XLSX.readFile(xlsxPath);
const ws = wb.Sheets['SKUCODE'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

const matches = data.filter(row => row && row.some(c => String(c).toLowerCase().includes('remi')));
console.log("Remi matches:", matches);
