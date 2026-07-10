import { initDatabase, db, seedIfNeeded } from '../src/db/connection.js';
import { storageContext } from '../src/db/context.js';
import { getLocalStore } from '../src/db/local_kv.js';

async function runTest() {
  const store = {
    type: 'local',
    storage: getLocalStore()
  };

  await storageContext.run(store, async () => {
    try {
      await initDatabase();
      await seedIfNeeded(store.storage);

      console.log("\n--- Running Robustness & Fixes Verification Tests ---");

      // 1. Verify db.products.insert does not violate autoincrement and generates sequential IDs
      console.log("Testing db.products.insert autoincrement ID generation...");
      
      const initialProducts = await db.products.list();
      const initialCount = initialProducts.length;

      // Insert product 1
      const p1 = await db.products.insert({
        name: 'Auto-increment Test Product A',
        model: 'Model A',
        current_stock: 10,
        low_stock_threshold: 5
      });
      console.log(`Product A inserted with ID: ${p1.id}`);
      if (!p1.id) {
        throw new Error("Failed to auto-generate ID for Product A");
      }

      // Insert product 2
      const p2 = await db.products.insert({
        name: 'Auto-increment Test Product B',
        model: 'Model B',
        current_stock: 20,
        low_stock_threshold: 5
      });
      console.log(`Product B inserted with ID: ${p2.id}`);
      if (!p2.id) {
        throw new Error("Failed to auto-generate ID for Product B");
      }

      if (p2.id !== p1.id + 1) {
        throw new Error(`Expected sequential auto-incremented IDs, got ${p1.id} and ${p2.id}`);
      }

      // Test deletion and re-insertion robustness
      console.log("Testing insert after deletion...");
      await db.products.delete(p1.id);
      
      const p3 = await db.products.insert({
        name: 'Auto-increment Test Product C',
        model: 'Model C',
        current_stock: 30,
        low_stock_threshold: 5
      });
      console.log(`Product C inserted with ID: ${p3.id}`);
      if (p3.id <= p2.id) {
        throw new Error(`Expected newly generated auto-incremented ID to be higher than previous ID ${p2.id}, got ${p3.id}`);
      }

      console.log("✅ Database auto-increment ID robustness test passed successfully!");
      process.exit(0);
    } catch (err) {
      console.error("❌ Robustness verification test failed:", err);
      process.exit(1);
    }
  });
}

runTest();
