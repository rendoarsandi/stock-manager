const path = require('path');
const fs = require('fs');
const XLSX = require(path.resolve(__dirname, '../node_modules/xlsx'));

const xlsxPath = path.resolve(__dirname, '../product list.xlsx');
const wb = XLSX.readFile(xlsxPath);
const sheetName = wb.SheetNames[0];
const ws = wb.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(ws);

const products = [];
const nameSet = new Set();

data.forEach(row => {
  const code = row['Kode'] ? String(row['Kode']).trim() : '';
  const item = row['ITEMS '] ? String(row['ITEMS ']).trim() : '';
  const variant = row['Varian'] ? String(row['Varian']).trim() : '';
  
  // Use SISA STOCK GUDANG ONLINE from the row, default to 100 if empty/nan
  let stockVal = row['SISA STOCK GUDANG ONLINE'];
  let stock = (stockVal !== undefined && stockVal !== null && !isNaN(stockVal)) ? parseInt(stockVal, 10) : 100;

  if (!item || item.toLowerCase().includes('total')) return;

  let fullName = item;
  if (variant) {
    fullName = `${item} - ${variant}`;
  }

  // Deduplicate names
  let finalName = fullName;
  if (nameSet.has(finalName)) {
    finalName = `${finalName} (${code || variant})`;
  }
  nameSet.add(finalName);

  products.push({
    name: finalName,
    model: code || variant || finalName,
    current_stock: stock,
    low_stock_threshold: 10
  });
});

const outputPath = path.resolve(__dirname, '../src/db/products_seed.json');
fs.writeFileSync(outputPath, JSON.stringify(products, null, 2), 'utf8');
console.log(`Successfully compiled ${products.length} products to ${outputPath}`);
