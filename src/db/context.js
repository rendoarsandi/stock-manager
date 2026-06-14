import { AsyncLocalStorage } from 'async_hooks';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import * as schema from './schema.js';

export const storageContext = new AsyncLocalStorage();

export function getActiveStorage() {
  const store = storageContext.getStore();
  if (!store) {
    throw new Error("Storage context not initialized. Ensure request or test runs inside storageContext.run()");
  }
  return store.storage;
}

export function getActiveEnv() {
  const store = storageContext.getStore();
  return store ? store.env : null;
}

export function getActiveDb() {
  const store = storageContext.getStore();
  if (!store) {
    throw new Error("Storage context not initialized. Ensure request or test runs inside storageContext.run()");
  }
  if (!store.drizzle) {
    store.drizzle = drizzle(async (sql, params, method) => {
      try {
        if (method === 'run') {
          const result = await store.storage.execute(sql, params);
          return { rows: [], lastInsertRowid: result?.lastInsertRowid };
        } else {
          const rows = await store.storage.queryValues(sql, params);
          if (method === 'get') {
            return { rows: (rows && rows.length > 0) ? rows[0] : undefined };
          }
          return { rows: rows || [] };
        }
      } catch (err) {
        console.error("Drizzle proxy error:", err);
        throw err;
      }
    }, { schema });
  }
  return store.drizzle;
}

