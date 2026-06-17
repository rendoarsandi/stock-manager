import { handleDeleteProduct, handleUpdateProduct } from '../src/routes_new/index.js';
import { initDatabase, seedIfNeeded } from '../src/db/connection.js';
import { storageContext } from '../src/db/context.js';
import { getLocalStore } from '../src/db/local_sqlite.js';
import { assertEqual, assertStatus, runTest } from './helpers.js';

process.env.NODE_ENV = 'test';

function jsonRequest(path, method, body) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

function createCountingStorage(realStorage) {
  const counts = {
    query: 0,
    queryValues: 0,
    execute: 0,
    executeTransaction: 0,
    broadcast: 0
  };

  const storage = {
    async query(sql, params) {
      counts.query++;
      return realStorage.query(sql, params);
    },
    async queryValues(sql, params) {
      counts.queryValues++;
      return realStorage.queryValues(sql, params);
    },
    async execute(sql, params) {
      counts.execute++;
      return realStorage.execute(sql, params);
    },
    async executeTransaction(queries) {
      counts.executeTransaction++;
      return realStorage.executeTransaction(queries);
    }
  };

  const stub = {
    ...storage,
    broadcast() {
      counts.broadcast++;
    }
  };

  const env = {
    STOCK_ROOM: {
      idFromName() {
        return { toString: () => 'global' };
      },
      get() {
        return stub;
      }
    }
  };

  return {
    counts,
    env,
    storage,
    reset() {
      for (const key of Object.keys(counts)) counts[key] = 0;
    }
  };
}

runTest('Durable Object operation budget', async () => {
  const realStorage = getLocalStore();
  await initDatabase();
  await seedIfNeeded(realStorage);

  const counting = createCountingStorage(realStorage);
  const store = {
    type: 'cloudflare',
    storage: counting.storage,
    env: counting.env
  };

  await storageContext.run(store, async () => {
    counting.reset();
    const updateRes = await handleUpdateProduct(
      jsonRequest('/api/products/1', 'PUT', {
        name: 'Korek Api Model A Updated',
        model: 'Model A',
        description: 'Updated',
        low_stock_threshold: 9
      }),
      ['1']
    );
    await assertStatus(updateRes, 200, 'product update');
    assertEqual(counting.counts.execute, 0, 'update should not use raw execute RPCs');
    assertEqual(counting.counts.executeTransaction, 0, 'update should not use transaction RPCs');
    assertEqual(counting.counts.queryValues, 2, 'update queryValues RPCs');
    assertEqual(counting.counts.broadcast, 1, 'update broadcasts once');

    counting.reset();
    const deleteRes = await handleDeleteProduct(jsonRequest('/api/products/1', 'DELETE'), ['1']);
    await assertStatus(deleteRes, 200, 'product delete');
    assertEqual(counting.counts.execute, 0, 'delete should not use per-statement execute RPCs');
    assertEqual(counting.counts.executeTransaction, 1, 'delete should batch writes in one transaction RPC');
    assertEqual(counting.counts.queryValues, 1, 'delete product lookup RPCs');
    assertEqual(counting.counts.broadcast, 1, 'delete broadcasts once');
  });
});
