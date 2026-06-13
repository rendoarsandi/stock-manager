import { getLocalStore } from '../src/db/local_kv.js';
import { storageContext } from '../src/db/context.js';
import { db, seedIfNeeded } from '../src/db/connection.js';
import fs from 'fs';

async function run() {
  const store = {
    type: 'local',
    storage: getLocalStore(),
    env: {}
  };

  await storageContext.run(store, async () => {
    await seedIfNeeded(store.storage);
    const products = await db.products.list();
    const lines = products.map(p => `ID: ${p.id} | Name: "${p.name}" | SKU: "${p.model}"`);
    fs.writeFileSync('C:/Users/DELL/Documents/antigravity/brave-galileo/scratch/all-products.txt', lines.join('\n'));
    console.log("Successfully wrote all products to scratch/all-products.txt");
  });
}

run().catch(console.error);
