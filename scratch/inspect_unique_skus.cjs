const path = require('path');
const XLSX = require(path.resolve(__dirname, '../node_modules/xlsx'));

const filePath = 'C:\\Users\\DELL\\Downloads\\Order.all.20260601_20260612.xlsx';
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws);

const uniqueSkus = new Map();
data.forEach(row => {
  const skuInduk = row['SKU Induk'] || '';
  const skuRef = row['Nomor Referensi SKU'] || '';
  const prodName = row['Nama Produk'] || '';
  const varName = row['Nama Variasi'] || '';
  
  const key = `${skuInduk} | ${skuRef}`;
  if (!uniqueSkus.has(key)) {
    uniqueSkus.set(key, { prodName, varName, count: 0 });
  }
  uniqueSkus.get(key).count++;
});

console.log('=== Unique SKU Induk & SKU Ref combinations in Orders ===');
for (const [key, val] of uniqueSkus.entries()) {
  console.log(`${key} -> Name: "${val.prodName}" | Var: "${val.varName}" (Count: ${val.count})`);
}
