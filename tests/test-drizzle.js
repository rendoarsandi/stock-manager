import { initDatabase, seedIfNeeded } from '../src/db/connection.js';
import { storageContext, getActiveDb } from '../src/db/context.js';
import { getLocalStore } from '../src/db/local_sqlite.js';
import { users, products } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

async function runTest() {
  const store = {
    type: 'local',
    storage: getLocalStore()
  };

  await storageContext.run(store, async () => {
    try {
      await initDatabase();
      await seedIfNeeded(store.storage);

      console.log("\n--- Running Drizzle ORM Tests ---");

      const db = getActiveDb();

      // Debug: print raw query result
      const rawUserRows = await store.storage.query("SELECT * FROM users");
      console.log("RAW user rows from storage:", rawUserRows);

      // Test users select query
      const allUsers = await db.select().from(users);
      console.log("Users fetched via Drizzle:", allUsers.map(u => ({ username: u.username, role: u.role })));
      if (allUsers.length < 2) {
        throw new Error("Drizzle check: Less than 2 users found");
      }

      // Test products select query
      const allProducts = await db.select().from(products);
      console.log("Products fetched via Drizzle:", allProducts.map(p => ({ name: p.name, stock: p.current_stock })));
      if (allProducts.length !== 4) {
        throw new Error(`Drizzle check: Expected 4 products, found ${allProducts.length}`);
      }

      // Test inserting a new product
      const newProduct = {
        name: 'Drizzle Test Product',
        model: 'Test Model',
        current_stock: 50,
        low_stock_threshold: 5
      };
      await db.insert(products).values(newProduct);
      
      const insertedProductRows = await db.select().from(products).where(eq(products.name, 'Drizzle Test Product'));
      console.log("Inserted product:", insertedProductRows[0]);
      if (!insertedProductRows[0] || insertedProductRows[0].model !== 'Test Model') {
        throw new Error("Drizzle check: Failed to insert new product");
      }

      // Test updating the product
      await db.update(products).set({ current_stock: 120 }).where(eq(products.name, 'Drizzle Test Product'));
      const updatedProductRows = await db.select().from(products).where(eq(products.name, 'Drizzle Test Product'));
      console.log("Updated product stock:", updatedProductRows[0].current_stock);
      if (updatedProductRows[0].current_stock !== 120) {
        throw new Error("Drizzle check: Failed to update product stock");
      }

      // Test deleting the product
      await db.delete(products).where(eq(products.name, 'Drizzle Test Product'));
      const afterDeleteRows = await db.select().from(products).where(eq(products.name, 'Drizzle Test Product'));
      if (afterDeleteRows.length !== 0) {
        throw new Error("Drizzle check: Failed to delete product");
      }

      console.log("\n🎉 All Drizzle ORM tests passed successfully!");
      process.exit(0);
    } catch (err) {
      console.error("\nDrizzle ORM test failed:", err);
      process.exit(1);
    }
  });
}

runTest();
