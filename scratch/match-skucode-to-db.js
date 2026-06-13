import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLocalStore } from '../src/db/local_kv.js';
import { storageContext } from '../src/db/context.js';
import { db, seedIfNeeded } from '../src/db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const store = {
    type: 'local',
    storage: getLocalStore(),
    env: {}
  };

  await storageContext.run(store, async () => {
    await seedIfNeeded(store.storage);
    const products = await db.products.list();
    console.log(`Loaded ${products.length} products from DB.`);

    const filePath = path.resolve(__dirname, '../Ecomm HPP.xlsx');
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets['SKUCODE'];
    const data = XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 });

    let matchedCount = 0;
    let unmatchedCount = 0;

    // Helper to find best product match
    function findProductMatch(baseName) {
      if (!baseName) return null;
      const cleanBase = baseName.toLowerCase().trim().replace(/\s+/g, '');

      // Try exact or prefix match
      let match = products.find(p => {
        const cleanP = p.name.toLowerCase().trim().replace(/\s+/g, '');
        return cleanP === cleanBase || cleanP.startsWith(cleanBase);
      });

      if (!match) {
        // Try loose matching where product name contains the base name
        match = products.find(p => {
          const cleanP = p.name.toLowerCase().trim().replace(/\s+/g, '');
          return cleanP.includes(cleanBase);
        });
      }
      return match;
    }

    // Process rows starting from row 3 (0-indexed)
    for (let i = 3; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      const groupName = row[0] ? String(row[0]).trim() : '';
      const skuInduk = row[1] ? String(row[1]).trim() : '';
      if (!groupName && !skuInduk) continue;

      const matchedProduct = findProductMatch(groupName);
      if (matchedProduct) {
        console.log(`✅ MATCHED: "${groupName}" -> "${matchedProduct.name}" [ID: ${matchedProduct.id}]`);
        matchedCount++;
        
        // Let's collect all SKU codes from this row
        const skus = [];
        // 1. SKU Induk (quantity 1)
        if (skuInduk) {
          skus.push({ sku: skuInduk, qty: 1 });
        }
        // 2. Variations (quantity 1)
        for (let col = 2; col <= 6; col++) {
          if (row[col] && String(row[col]).trim() !== '') {
            skus.push({ sku: String(row[col]).trim(), qty: 1 });
          }
        }
        // 3. Linkstock SKU (quantity 4 or 5 depending on the name/header)
        const linkstockSku = row[8] ? String(row[8]).trim() : '';
        if (linkstockSku) {
          const fullSetName = row[7] ? String(row[7]).trim() : '';
          let qty = 5;
          if (fullSetName.includes("4'S") || fullSetName.includes("4S") || fullSetName.toLowerCase().includes("4 pcs")) {
            qty = 4;
          }
          skus.push({ sku: linkstockSku, qty });
        }

        console.log(`   SKUs to map:`, skus);
      } else {
        console.log(`❌ UNMATCHED: "${groupName}" (SKU Induk: ${skuInduk})`);
        unmatchedCount++;
      }
    }

    console.log(`\nMatching Summary: ${matchedCount} matched, ${unmatchedCount} unmatched.`);
  });
}

run().catch(console.error);
