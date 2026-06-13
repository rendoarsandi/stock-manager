const path = require('path');
const XLSX = require(path.resolve(__dirname, '../node_modules/xlsx'));

const filePath = process.argv[2] || 'C:\\Users\\DELL\\Downloads\\Order.all.20260601_20260612.xlsx';
const wb = XLSX.readFile(filePath);

console.log('=== Sheet names ===');
console.log(wb.SheetNames);

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log(`\n=== Sheet: ${sheetName} (${data.length} rows) ===`);
  for (let i = 0; i < Math.min(10, data.length); i++) {
    console.log(`Row ${i}:`, JSON.stringify(data[i]));
  }
}
