import { getLocalStore } from '../src/db/local_kv.js';
import { storageContext } from '../src/db/context.js';
import { db, seedIfNeeded } from '../src/db/connection.js';

async function run() {
  const store = {
    type: 'local',
    storage: getLocalStore(),
    env: {}
  };

  await storageContext.run(store, async () => {
    await seedIfNeeded(store.storage);
    const products = await db.products.list();
    console.log(`Total products seeded: ${products.length}`);
    const matches = products.filter(p => 
      p.name.toLowerCase().includes('remi') || 
      p.name.toLowerCase().includes('poker') ||
      p.name.toLowerCase().includes('fluo') ||
      p.name.toLowerCase().includes('hanger')
    );
    console.log("Matching products in database:", matches);
  });
}

run().catch(console.error);
