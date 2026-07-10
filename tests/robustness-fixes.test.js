import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { initDatabase, db, seedIfNeeded } from '../src/db/connection.js';
import { storageContext } from '../src/db/context.js';
import { getLocalStore } from '../src/db/local_kv.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Robustness and Fixes', () => {
  let store;

  beforeAll(() => {
    store = {
      type: 'local',
      storage: getLocalStore()
    };
  });

  beforeEach(async () => {
    const testDbPath = path.resolve(__dirname, '../data/db_test.json');
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (e) {}
    }
  });

  it('should auto-increment products ID generation automatically and sequentially', async () => {
    await storageContext.run(store, async () => {
      await initDatabase();
      await seedIfNeeded(store.storage);

      // Insert product 1
      const p1 = await db.products.insert({
        name: 'Vitest Auto-increment Product A',
        model: 'Model A',
        current_stock: 10,
        low_stock_threshold: 5
      });
      expect(p1).toBeDefined();
      expect(p1.id).toBeDefined();
      expect(p1.id).toBeGreaterThan(0);

      // Insert product 2
      const p2 = await db.products.insert({
        name: 'Vitest Auto-increment Product B',
        model: 'Model B',
        current_stock: 20,
        low_stock_threshold: 5
      });
      expect(p2.id).toBe(p1.id + 1);

      // Test deletion and re-insertion robustness
      await db.products.delete(p1.id);
      
      const p3 = await db.products.insert({
        name: 'Vitest Auto-increment Product C',
        model: 'Model C',
        current_stock: 30,
        low_stock_threshold: 5
      });
      expect(p3.id).toBeGreaterThan(p2.id);
    });
  });
});
