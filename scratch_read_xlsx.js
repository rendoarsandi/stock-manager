import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const file_path = path.resolve("lap stock 6.26.xlsx");
console.log('Reading file from resolved path:', file_path);

try {
  const fileBuffer = fs.readFileSync(file_path);
  console.log('Buffer read successfully, size:', fileBuffer.length, 'bytes');

  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  console.log('Sheets found:', workbook.SheetNames);
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    console.log(`Sheet "${sheetName}" has ${data.length} rows.`);
    if (data.length > 0) {
      console.log('Columns:', Object.keys(data[0]));
      console.log('First 5 rows of data:', data.slice(0, 5));
    }
  }
} catch (err) {
  console.error('Error reading/parsing file:', err);
}
