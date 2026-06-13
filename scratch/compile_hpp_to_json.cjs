const path = require('path');
const fs = require('fs');
const XLSX = require(path.resolve(__dirname, '../node_modules/xlsx'));

const xlsxPath = path.resolve(__dirname, '../Ecomm HPP.xlsx');
const wb = XLSX.readFile(xlsxPath);
const ws = wb.Sheets['SKUCODE'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

function getProductName(groupName, variationSku, skuInduk) {
  if (!variationSku) return groupName;
  if (variationSku === skuInduk) return groupName;

  let prefix = '';
  if (skuInduk && skuInduk.includes('_')) {
    prefix = skuInduk.split('_')[0] + '_';
  } else if (skuInduk) {
    let i = 0;
    while (i < skuInduk.length && i < variationSku.length && skuInduk[i] === variationSku[i]) {
      i++;
    }
    if (i > 0) {
      prefix = skuInduk.substring(0, i);
    }
  }

  if (prefix && variationSku.startsWith(prefix)) {
    const suffix = variationSku.substring(prefix.length).replace(/_/g, ' ').trim();
    if (suffix) {
      const capitalized = suffix.charAt(0).toUpperCase() + suffix.slice(1).toLowerCase();
      return `${groupName} - ${capitalized}`;
    }
  }

  return `${groupName} - ${variationSku}`;
}

const products = [];
const nameSet = new Set();

for (let i = 3; i < data.length; i++) {
  const row = data[i];
  if (!row || row.length === 0) continue;

  const groupName = row[0] ? String(row[0]).trim() : '';
  const skuInduk = row[1] ? String(row[1]).trim() : '';
  
  const variations = [];
  for (let col = 2; col <= 6; col++) {
    if (row[col] && String(row[col]).trim() !== '') {
      variations.push(String(row[col]).trim());
    }
  }

  const fullSetName = row[7] ? String(row[7]).trim() : '';
  const fullSetSku = row[8] ? String(row[8]).trim() : '';

  if (!groupName && !skuInduk) continue;

  const items = [];
  if (variations.length > 0) {
    variations.forEach(v => {
      items.push({
        name: getProductName(groupName, v, skuInduk),
        model: v
      });
    });
  } else if (skuInduk) {
    items.push({
      name: groupName,
      model: skuInduk
    });
  }

  if (fullSetSku) {
    items.push({
      name: fullSetName || `${groupName} Pack/Set`,
      model: fullSetSku
    });
  }

  items.forEach(item => {
    let finalName = item.name;
    if (nameSet.has(finalName)) {
      finalName = `${finalName} (${item.model})`;
    }
    nameSet.add(finalName);

    products.push({
      name: finalName,
      model: item.model,
      current_stock: 100,
      low_stock_threshold: 10
    });
  });
}

const outputPath = path.resolve(__dirname, '../src/db/products_seed.json');
fs.writeFileSync(outputPath, JSON.stringify(products, null, 2), 'utf8');
console.log(`Successfully compiled ${products.length} products to ${outputPath}`);
