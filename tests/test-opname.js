import app from '../src/index.js';
import { initDatabase, db } from '../src/db/connection.js';
import { seed } from '../src/db/seed.js';

process.env.NODE_ENV = 'test';

async function runTests() {
  try {
    await initDatabase();
    await seed();

    console.log("\n--- Running Stock Opname API Tests ---");

    // Get auth token for staff
    const resStaffLogin = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'staff', password: 'staff123' })
    });
    const staffCookie = resStaffLogin.headers.get('set-cookie').split(';')[0];

    // Query two products from DB to count
    const products = (await db.prepare("SELECT id, name, current_stock FROM products LIMIT 2").all()).results;
    if (products.length < 2) {
      throw new Error("Expected at least 2 products in the database after seeding");
    }

    const p1 = products[0];
    const p2 = products[1];

    console.log(`Initial stocks: Product 1 (${p1.name}): ${p1.current_stock}, Product 2 (${p2.name}): ${p2.current_stock}`);

    // 1. POST /api/stock/opname - success
    console.log("Testing POST /api/stock/opname...");
    const opnameData = {
      notes: 'Monthly physical inventory audit',
      items: [
        { product_id: p1.id, physical_stock: p1.current_stock + 10 }, // Surplus of 10
        { product_id: p2.id, physical_stock: Math.max(0, p2.current_stock - 5) } // Deficit of 5
      ]
    };

    const resPost = await app.request('/api/stock/opname', {
      method: 'POST',
      headers: {
        'Cookie': staffCookie,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(opnameData)
    });

    if (resPost.status !== 201) {
      throw new Error(`Expected 201 Created for POST /api/stock/opname, got ${resPost.status}`);
    }

    const postResBody = await resPost.json();
    console.log("Created opname report with ID:", postResBody.id);
    if (!postResBody.success || !postResBody.id) {
      throw new Error("Invalid creation response payload");
    }

    const opnameId = postResBody.id;

    // Verify product stocks are updated
    const updatedP1 = await db.prepare("SELECT current_stock FROM products WHERE id = ?").bind(p1.id).first();
    const updatedP2 = await db.prepare("SELECT current_stock FROM products WHERE id = ?").bind(p2.id).first();

    const expectedP1Stock = p1.current_stock + 10;
    const expectedP2Stock = Math.max(0, p2.current_stock - 5);

    console.log(`Updated stocks: Product 1: ${updatedP1.current_stock} (expected ${expectedP1Stock}), Product 2: ${updatedP2.current_stock} (expected ${expectedP2Stock})`);

    if (updatedP1.current_stock !== expectedP1Stock) {
      throw new Error(`Product 1 stock not updated correctly. Expected ${expectedP1Stock}, got ${updatedP1.current_stock}`);
    }
    if (updatedP2.current_stock !== expectedP2Stock) {
      throw new Error(`Product 2 stock not updated correctly. Expected ${expectedP2Stock}, got ${updatedP2.current_stock}`);
    }

    // Verify stock movements are logged
    const movementsP1 = await db.prepare("SELECT * FROM stock_movements WHERE product_id = ? AND reference = ?").bind(p1.id, `Stock Opname #${opnameId}`).first();
    const movementsP2 = await db.prepare("SELECT * FROM stock_movements WHERE product_id = ? AND reference = ?").bind(p2.id, `Stock Opname #${opnameId}`).first();

    if (!movementsP1 || movementsP1.quantity_change !== 10 || movementsP1.movement_type !== 'manual_adjust') {
      throw new Error("P1 stock movement not recorded correctly");
    }
    const expectedP2Change = expectedP2Stock - p2.current_stock;
    if (!movementsP2 || movementsP2.quantity_change !== expectedP2Change || movementsP2.movement_type !== 'manual_adjust') {
      throw new Error("P2 stock movement not recorded correctly");
    }

    // 2. GET /api/stock/opname - list all
    console.log("\nTesting GET /api/stock/opname...");
    const resGetList = await app.request('/api/stock/opname', {
      headers: { 'Cookie': staffCookie }
    });

    if (resGetList.status !== 200) {
      throw new Error(`Expected 200 OK for GET /api/stock/opname, got ${resGetList.status}`);
    }

    const opnamesList = await resGetList.json();
    console.log("Total opname entries:", opnamesList.length);
    if (opnamesList.length === 0) {
      throw new Error("Expected at least 1 opname entry in list");
    }

    const firstItem = opnamesList[0];
    if (firstItem.id !== opnameId || firstItem.items_count !== 2 || firstItem.username !== 'staff') {
      throw new Error("Opname list entry details mismatch");
    }

    // 3. GET /api/stock/opname/:id - details of single
    console.log(`\nTesting GET /api/stock/opname/${opnameId}...`);
    const resGetDetails = await app.request(`/api/stock/opname/${opnameId}`, {
      headers: { 'Cookie': staffCookie }
    });

    if (resGetDetails.status !== 200) {
      throw new Error(`Expected 200 OK for details, got ${resGetDetails.status}`);
    }

    const details = await resGetDetails.json();
    console.log("Opname ID:", details.id);
    console.log("Opname Notes:", details.notes);
    console.log("Items counted in details:", details.items.length);

    if (details.id !== opnameId || details.notes !== 'Monthly physical inventory audit' || details.items.length !== 2) {
      throw new Error("Opname details mismatch");
    }

    // Assert specific item details
    const item1 = details.items.find(item => item.product_id === p1.id);
    const item2 = details.items.find(item => item.product_id === p2.id);

    if (!item1 || item1.variance !== 10 || item1.system_stock !== p1.current_stock || item1.physical_stock !== expectedP1Stock) {
      throw new Error("Item 1 details mismatch");
    }
    if (!item2 || item2.variance !== expectedP2Change || item2.system_stock !== p2.current_stock || item2.physical_stock !== expectedP2Stock) {
      throw new Error("Item 2 details mismatch");
    }

    console.log("\nAll stock opname API tests passed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("\nStock opname API test failed:", err);
    process.exit(1);
  }
}

runTests();
