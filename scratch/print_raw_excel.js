import * as XLSX from 'xlsx';
import fs from 'fs';

try {
  const fileBuffer = fs.readFileSync('C:\\Users\\DELL\\Downloads\\product list.xlsx');
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const firstSheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(firstSheet);
  
  console.log('Total raw rows:', rows.length);
  rows.forEach((row, i) => {
    console.log(`${i}:`, row);
  });
} catch (e) {
  console.error(e);
}
