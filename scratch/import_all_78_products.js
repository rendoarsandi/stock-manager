import * as XLSX from 'xlsx';
import fs from 'fs';

const API_BASE = 'http://localhost:8787/api';

function cleanProductName(name) {
  if (!name) return '';
  return name
    .replace(/\s*-\s*1\s*pcs\b/gi, '')
    .replace(/\s*1\s*pcs\b/gi, '')
    .trim();
}

async function run() {
  try {
    console.log('--- STARTING ALL 78 PRODUCTS IMPORT ---');
    
    // 1. Fetch current products
    console.log('Fetching existing products...');
    const listRes = await fetch(`${API_BASE}/products`);
    if (!listRes.ok) {
      throw new Error(`Failed to fetch products: ${listRes.status} ${listRes.statusText}`);
    }
    const existingProducts = await listRes.json();
    console.log(`Found ${existingProducts.length} existing products.`);
    
    // 2. Delete existing products
    for (const p of existingProducts) {
      console.log(`Deleting product ID ${p.id} ("${p.name}")...`);
      const delRes = await fetch(`${API_BASE}/products/${p.id}`, { method: 'DELETE' });
      if (!delRes.ok) {
        console.error(`Warning: Failed to delete product ${p.id}:`, await delRes.text());
      }
    }
    console.log('Deletion completed.');
    
    // 3. Read and parse Excel file
    const excelPath = 'C:\\Users\\DELL\\Downloads\\product list.xlsx';
    console.log(`Reading Excel file from ${excelPath}...`);
    const fileBuffer = fs.readFileSync(excelPath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const firstSheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(firstSheet);
    console.log(`Found ${rows.length} rows in sheet "${sheetName}".`);
    
    let importedCount = 0;
    
    // 4. Import products
    for (const row of rows) {
      const rawName = row['ITEMS '];
      if (rawName !== undefined && String(rawName).trim() !== '') {
        const name = cleanProductName(String(rawName).trim());
        const varian = row['Varian'];
        const model = varian !== undefined && String(varian).trim() !== '' ? String(varian).trim() : '-';
        
        // Find stock column dynamically
        const stockKey = Object.keys(row).find(key => 
          key.toLowerCase().includes('stock') || 
          key.toLowerCase().includes('stok') || 
          key.toLowerCase().includes('sisa')
        );
        
        let stock = 0;
        if (stockKey && row[stockKey] !== undefined) {
          const parsedStock = parseInt(row[stockKey], 10);
          if (!isNaN(parsedStock)) {
            stock = parsedStock;
          }
        }
        
        console.log(`Adding product: "${name}" | Model: "${model}" | Stock: ${stock}...`);
        
        const payload = {
          name,
          model,
          master_sku: null,
          description: '',
          initial_stock: stock,
          low_stock_threshold: 10
        };
        
        const createRes = await fetch(`${API_BASE}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (createRes.ok) {
          importedCount++;
        } else {
          console.error(`Failed to add product "${name}":`, await createRes.text());
        }
      }
    }
    
    console.log(`--- BULK IMPORT COMPLETED: Successfully imported ${importedCount} of ${rows.length} products. ---`);
  } catch (err) {
    console.error('Fatal error during import:', err);
  }
}

run();
