import { initDatabase, db } from '../src/db/connection.js';
import { seed } from '../src/db/seed.js';

async function runTest() {
  try {
    await initDatabase();
    await seed();

    console.log("\n--- Running DB Tests ---");

    // Test users
    const users = await db.prepare("SELECT username, role FROM users ORDER BY username").all();
    console.log("Users in database:", users.results);
    if (users.results.length < 2) {
      throw new Error("Seeding failed: Less than 2 users found");
    }

    // Test products
    const products = await db.prepare("SELECT name, current_stock, low_stock_threshold FROM products ORDER BY name").all();
    console.log("Products in database:", products.results);
    if (products.results.length !== 4) {
      throw new Error(`Expected 4 products, found ${products.results.length}`);
    }

    // Test low stock detection
    const lowStockProducts = await db.prepare("SELECT name FROM products WHERE current_stock <= low_stock_threshold").all();
    console.log("Low stock products:", lowStockProducts.results);
    if (lowStockProducts.results.length !== 1 || lowStockProducts.results[0].name !== 'Korek Api Model D') {
      throw new Error("Expected only Korek Api Model D to be low stock");
    }

    // Test templates
    const templates = await db.prepare("SELECT name, column_mapping FROM import_templates").all();
    console.log("Templates in database:", templates.results.map(t => t.name));
    if (templates.results.length !== 2) {
      throw new Error("Expected 2 templates");
    }

    console.log("\nAll database tests passed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("\nDatabase test failed:", err);
    process.exit(1);
  }
}

runTest();
