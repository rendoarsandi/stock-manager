import app from '../src/index.js';
import { initDatabase, db, seedIfNeeded } from '../src/db/connection.js';
import { storageContext } from '../src/db/context.js';
import { getLocalStore } from '../src/db/local_kv.js';

process.env.NODE_ENV = 'test';

async function runTests() {
  const store = {
    type: 'local',
    storage: getLocalStore()
  };

  await storageContext.run(store, async () => {
    try {
      await store.storage.deleteAll();
      await initDatabase();
      await seedIfNeeded(store.storage);

      console.log("\n--- Running SKU Mappings Integration Tests ---");

      // 1. Get products list to find IDs
      const products = await db.products.list();
      const productA = products.find(p => p.model === 'Model A');
      const productB = products.find(p => p.model === 'Model B');

      if (!productA || !productB) {
        throw new Error("Seed products (Model A/B) not found.");
      }

      // 2. Test inserting SKU mapping via model
      console.log("Testing db.skuMappings.insert...");
      await db.skuMappings.insert({
        sku_code: 'case_1b',
        product_id: productA.id,
        quantity: 2
      });
      await db.skuMappings.insert({
        sku_code: 'case_1b',
        product_id: productB.id,
        quantity: 3
      });

      // 3. Test listing mappings
      console.log("Testing db.skuMappings.list...");
      const mappings = await db.skuMappings.list();
      const caseMappings = mappings.filter(m => m.sku_code === 'case_1b');
      if (caseMappings.length !== 2) {
        throw new Error(`Expected 2 mappings for case_1b, got ${caseMappings.length}`);
      }
      console.log("✅ db.skuMappings.list passed");

      // 4. Test retrieving by SKU
      console.log("Testing db.skuMappings.getBySku...");
      const mappedItems = await db.skuMappings.getBySku('case_1b');
      if (mappedItems.length !== 2) {
        throw new Error(`Expected 2 items resolved for case_1b, got ${mappedItems.length}`);
      }
      console.log("✅ db.skuMappings.getBySku passed");

      // 5. Test parser with database mapping
      console.log("Testing resolvePromoProductToBaseItems with DB mappings...");
      const { resolvePromoProductToBaseItems } = await import('../src/services/ambiguous-parser.js');
      const splits = resolvePromoProductToBaseItems('case_1b', 'Crockie Case Custom', 2, products, mappings);
      
      if (!splits || splits.length !== 2) {
        throw new Error(`Expected 2 splits resolved, got ${splits ? splits.length : 0}`);
      }

      const splitA = splits.find(s => s.product_id === productA.id);
      const splitB = splits.find(s => s.product_id === productB.id);

      if (!splitA || splitA.quantity !== 4) { // 2 quantity * 2 orderQty
        throw new Error(`Expected product A quantity to be 4, got ${splitA ? splitA.quantity : 'null'}`);
      }
      if (!splitB || splitB.quantity !== 6) { // 3 quantity * 2 orderQty
        throw new Error(`Expected product B quantity to be 6, got ${splitB ? splitB.quantity : 'null'}`);
      }
      console.log("✅ Parser resolution with DB mappings passed");

      // 5b. Test short SKU loose matching prevention
      console.log("Testing short SKU loose matching prevention...");
      const shortMappings = [
        { sku_code: 'hi', product_id: productA.id, quantity: 1 }
      ];
      const shortSplits = resolvePromoProductToBaseItems('', 'Chili Pepper Product', 1, products, shortMappings);
      if (shortSplits !== null) {
        throw new Error("Expected no split resolution for short SKU 'hi' via loose matching in name 'Chili Pepper Product'");
      }
      console.log("✅ Short SKU loose matching prevention passed");

      // 6. Test deleting SKU mapping
      console.log("Testing db.skuMappings.delete...");
      await db.skuMappings.delete('case_1b', productA.id);
      
      const mappingsAfterDelete = await db.skuMappings.getBySku('case_1b');
      if (mappingsAfterDelete.length !== 1) {
        throw new Error(`Expected 1 mapping remaining, got ${mappingsAfterDelete.length}`);
      }
      console.log("✅ db.skuMappings.delete passed");

      console.log("All SKU Mappings integration tests passed successfully!");
      process.exit(0);
    } catch (err) {
      console.error("❌ SKU Mappings integration tests failed:", err);
      process.exit(1);
    }
  });
}

runTests();
