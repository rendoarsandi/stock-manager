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
    const sessions = await db.sessions.list();
    sessions.sort((a,b) => b.id - a.id);
    console.log("Most recent sessions detail:");
    sessions.slice(0, 5).forEach(s => {
      console.log(`ID: ${s.id}, status: ${s.status}, filename: ${s.filename}, orders_data length: ${s.orders_data ? s.orders_data.length : 'null'}`);
    });
  });
}

run().catch(console.error);
