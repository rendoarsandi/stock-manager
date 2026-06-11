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

      console.log("\n--- Running DB Tests ---");

      // Test users
      const users = await db.users.list();
      console.log("Users in database:", users.map(u => ({ username: u.username, role: u.role })));
      if (users.length < 2) {
        throw new Error("Seeding failed: Less than 2 users found");
      }

      // Test products
      const products = await db.products.list();
      console.log("Products in database:", products.map(p => ({ name: p.name, current_stock: p.current_stock, low_stock_threshold: p.low_stock_threshold })));
      if (products.length !== 4) {
        throw new Error(`Expected 4 products, found ${products.length}`);
      }

      // Test low stock detection
      const lowStockProducts = products.filter(p => p.current_stock <= p.low_stock_threshold);
      console.log("Low stock products:", lowStockProducts.map(p => p.name));
      if (lowStockProducts.length !== 1 || lowStockProducts[0].name !== 'Korek Api Model D') {
        throw new Error("Expected only Korek Api Model D to be low stock");
      }

      // Test templates
      const templates = await db.templates.list();
      console.log("Templates in database:", templates.map(t => t.name));
      if (templates.length !== 2) {
        throw new Error("Expected 2 templates");
      }

      console.log("\nAll database tests passed successfully!");
      process.exit(0);
    } catch (err) {
      console.error("\nDatabase test failed:", err);
      process.exit(1);
    }
  });
}

runTest();
