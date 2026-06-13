const path = require('path');
const XLSX = require(path.resolve(__dirname, '../node_modules/xlsx'));

const filePath = 'C:\\Users\\DELL\\Downloads\\product list.xlsx';
const wb = XLSX.readFile(filePath);
// Use first sheet
const sheetName = wb.SheetNames[0];
const ws = wb.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(ws);

console.log(`=== Unique items in sheet "${sheetName}" ===`);
const uniqueProducts = [];

data.forEach((row, index) => {
  const code = row['Kode'] ? String(row['Kode']).trim() : '';
  const item = row['ITEMS '] ? String(row['ITEMS ']).trim() : '';
  const variant = row['Varian'] ? String(row['Varian']).trim() : '';
  const stock = parseInt(row['SISA STOCK GUDANG ONLINE'], 10) || 0;
  
  if (!item) return;
  // Skip totals or headers
  if (item.toLowerCase().includes('total')) return;

  uniqueProducts.push({ index: index + 2, code, item, variant, stock });
});

console.log(`Found ${uniqueProducts.length} unique product entries:`);
uniqueProducts.slice(0, 30).forEach(p => {
  console.log(`- Code: "${p.code}" | Item: "${p.item}" | Var: "${p.variant}" | Stock: ${p.stock}`);
});
if (uniqueProducts.length > 30) {
  console.log(`... and ${uniqueProducts.length - 30} more`);
}
