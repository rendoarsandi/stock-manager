import XLSX from 'xlsx';
import fs from 'fs';

const file_path = "C:\\Users\\DELL\\Documents\\antigravity\\brave-galileo\\Order.all.20260601_20260627.xlsx";
const buffer = fs.readFileSync(file_path);
const workbook = XLSX.read(buffer, { type: 'buffer' });

console.log('Sheets:', workbook.SheetNames);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet);
console.log('Total rows in first sheet:', rows.length);

if (rows.length > 0) {
  console.log('Columns:', Object.keys(rows[0]));
}

// Find rows containing "CROGAS" or "Gas Butane" or "Refill" in SKU or name
const matches = rows.filter(r => {
  const values = Object.values(r).map(v => String(v).toLowerCase());
  return values.some(v => v.includes('crogas') || v.includes('refill') || v.includes('butane'));
});

console.log(`Found ${matches.length} matching rows.`);
console.log('Sample matching rows (up to 5):');
for (const m of matches.slice(0, 5)) {
  console.log('--------------------');
  console.log('Product SKU:', m['Nomor Referensi SKU'] || m['SKU'] || m['SKU Induk'] || m['Product SKU'] || m['SKU Ref']);
  console.log('Product Name:', m['Nama Produk'] || m['Product Name']);
  console.log('Quantity:', m['Jumlah'] || m['Quantity']);
}
