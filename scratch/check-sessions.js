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
    console.log("Sessions:", sessions.map(s => ({ id: s.id, status: s.status, filename: s.filename })));
  });
}

run().catch(console.error);
