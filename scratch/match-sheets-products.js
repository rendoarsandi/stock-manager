import { getLocalStore } from '../src/db/local_kv.js';
import { storageContext } from '../src/db/context.js';
import { db, seedIfNeeded } from '../src/db/connection.js';
import XLSX from 'xlsx';

async function run() {
  const store = {
    type: 'local',
    storage: getLocalStore(),
    env: {}
  };

  await storageContext.run(store, async () => {
    await seedIfNeeded(store.storage);
    const products = await db.products.list();
    
    const filePath = 'C:/Users/DELL/Downloads/STOCK ONLINE MALL.xlsx';
    const wb = XLSX.readFile(filePath);
    
    console.log("Matching sheets against DB products:");
    wb.SheetNames.forEach(sheetName => {
      const matched = products.filter(p => 
        p.name.toLowerCase() === sheetName.toLowerCase() ||
        p.model.toLowerCase() === sheetName.toLowerCase() ||
        p.name.toLowerCase().includes(sheetName.toLowerCase())
      );
      if (matched.length > 0) {
        console.log(`Sheet "${sheetName}" matches:`, matched.map(m => `[ID ${m.id}] ${m.name} (${m.model})`));
      } else {
        console.log(`Sheet "${sheetName}" has NO match in DB.`);
      }
    });
  });
}

run().catch(console.error);
