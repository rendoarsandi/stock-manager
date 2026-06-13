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
    let count = 0;
    for (const s of sessions) {
      if (s.status === 'previewing') {
        await db.sessions.update(s.id, { status: 'cancelled', orders_data: null });
        count++;
      }
    }
    console.log(`Cancelled ${count} existing previewing sessions.`);
  });
}

run().catch(console.error);
