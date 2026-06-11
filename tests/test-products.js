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
      await initDatabase();
      await seedIfNeeded(store.storage);

      console.log("\n--- Running Products API Tests ---");

      // Get auth token for admin
      const resAdminLogin = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
      });
      const adminCookie = resAdminLogin.headers.get('set-cookie').split(';')[0];

      // Get auth token for staff
      const resStaffLogin = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'staff', password: 'staff123' })
      });
      const staffCookie = resStaffLogin.headers.get('set-cookie').split(';')[0];

      // 1. Get products list (Authenticated)
      console.log("Testing GET /api/products...");
      const resList = await app.request('/api/products', {
        headers: { 'Cookie': adminCookie }
      });
      if (resList.status !== 200) {
        throw new Error("Expected 200 for products list");
      }
      const products = await resList.json();
      console.log(`Found ${products.length} products.`);
      if (products.length !== 4) {
        throw new Error(`Expected 4 initial products, found ${products.length}`);
      }

      // 2. Add product (Forbidden for Staff)
      console.log("\nTesting POST /api/products (Forbidden for Staff)...");
      const resAddStaff = await app.request('/api/products', {
        method: 'POST',
        headers: { 
          'Cookie': staffCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Staff Product',
          model: 'Model S',
          initial_stock: 10,
          low_stock_threshold: 5
        })
      });
      console.log("Staff add product status:", resAddStaff.status);
      if (resAddStaff.status !== 403) {
        throw new Error("Expected 403 Forbidden for Staff role");
      }

      // 3. Add product (Success for Admin)
      console.log("\nTesting POST /api/products (Success for Admin)...");
      const newProductData = {
        name: 'Korek Api Model E',
        model: 'Model E',
        description: 'Super Match E',
        initial_stock: 45,
        low_stock_threshold: 15
      };

      const resAddAdmin = await app.request('/api/products', {
        method: 'POST',
        headers: { 
          'Cookie': adminCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newProductData)
      });
      if (resAddAdmin.status !== 201) {
        throw new Error(`Expected 201 for admin product creation, got ${resAddAdmin.status}`);
      }
      const createResult = await resAddAdmin.json();
      console.log("Product created with ID:", createResult.id);
      if (!createResult.success || !createResult.id) {
        throw new Error("Invalid creation response payload");
      }
      
      // Check product in DB
      const addedProduct = await db.products.get(createResult.id);
      console.log("Added product stock:", addedProduct.current_stock);
      if (addedProduct.current_stock !== 45 || addedProduct.low_stock_threshold !== 15) {
        throw new Error("Product details not inserted correctly");
      }

      // Check stock movement registered
      const movements = (await db.movements.list()).filter(m => m.product_id === createResult.id);
      console.log("Movements count for new product:", movements.length);
      if (movements.length !== 1 || movements[0].quantity_change !== 45 || movements[0].movement_type !== 'initial') {
        throw new Error("Expected initial stock movement to be logged");
      }

      // 4. Add duplicate product (Error)
      console.log("\nTesting POST /api/products (Duplicate)...");
      const resAddDup = await app.request('/api/products', {
        method: 'POST',
        headers: { 
          'Cookie': adminCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newProductData)
      });
      console.log("Duplicate product insert status:", resAddDup.status);
      if (resAddDup.status !== 400) {
        throw new Error("Expected 400 for duplicate product creation");
      }

      // 5. Edit product details (Success for Admin)
      console.log("\nTesting PUT /api/products/:id...");
      const resEdit = await app.request(`/api/products/${createResult.id}`, {
        method: 'PUT',
        headers: { 
          'Cookie': adminCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Korek Api Model E Renamed',
          model: 'Model E V2',
          description: 'Updated description',
          low_stock_threshold: 8
        })
      });
      if (resEdit.status !== 200) {
        throw new Error("Expected 200 for product edit");
      }
      const updatedProduct = await db.products.get(createResult.id);
      console.log("Updated name:", updatedProduct.name);
      console.log("Updated threshold:", updatedProduct.low_stock_threshold);
      if (updatedProduct.name !== 'Korek Api Model E Renamed' || updatedProduct.low_stock_threshold !== 8) {
        throw new Error("Product details update check failed");
      }

      // 6. Adjust stock (Success for Staff/Admin)
      console.log("\nTesting POST /api/products/:id/adjust-stock...");
      const resAdjust = await app.request(`/api/products/${createResult.id}/adjust-stock`, {
        method: 'POST',
        headers: { 
          'Cookie': staffCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quantity_change: -15,
          movement_type: 'write_off',
          reference: 'Damaged by humidity'
        })
      });
      if (resAdjust.status !== 200) {
        throw new Error(`Expected 200 for stock adjust, got ${resAdjust.status}`);
      }
      const adjustResult = await resAdjust.json();
      console.log("Adjust result new stock count:", adjustResult.current_stock);
      if (adjustResult.current_stock !== 30) { // 45 - 15 = 30
        throw new Error(`Expected final stock of 30, got ${adjustResult.current_stock}`);
      }

      // Verify stock movement ledger count
      const movementCount = (await db.movements.list()).filter(m => m.product_id === createResult.id).length;
      console.log("Ledger movements count:", movementCount);
      if (movementCount !== 2) {
        throw new Error(`Expected 2 movements logged, found ${movementCount}`);
      }

      const list = (await db.movements.list()).filter(m => m.product_id === createResult.id);
      list.sort((a, b) => b.id - a.id);
      const lastMovement = list[0];
      console.log("Last movement logged details:", lastMovement.movement_type, lastMovement.quantity_change);
      if (lastMovement.quantity_change !== -15 || lastMovement.movement_type !== 'write_off' || lastMovement.reference !== 'Damaged by humidity') {
        throw new Error("Movement ledger record mismatch");
      }

      // 7. Delete product (Forbidden for Staff, Success for Admin)
      console.log("\nTesting DELETE /api/products/:id (Forbidden for Staff)...");
      const resDeleteStaff = await app.request(`/api/products/${createResult.id}`, {
        method: 'DELETE',
        headers: { 'Cookie': staffCookie }
      });
      console.log("Staff delete product status:", resDeleteStaff.status);
      if (resDeleteStaff.status !== 403) {
        throw new Error("Expected 403 Forbidden for Staff on DELETE");
      }

      console.log("\nTesting DELETE /api/products/:id (Success for Admin)...");
      const resDeleteAdmin = await app.request(`/api/products/${createResult.id}`, {
        method: 'DELETE',
        headers: { 'Cookie': adminCookie }
      });
      if (resDeleteAdmin.status !== 200) {
        throw new Error(`Expected 200 for admin product delete, got ${resDeleteAdmin.status}`);
      }
      const deleteResult = await resDeleteAdmin.json();
      console.log("Delete result:", deleteResult);
      if (!deleteResult.success) {
        throw new Error("Expected success: true from delete API response");
      }

      // Verify product is gone from DB
      const deletedProduct = await db.products.get(createResult.id);
      if (deletedProduct) {
        throw new Error("Product still exists in database after deletion");
      }

      // Verify child records (movements) are cascade-deleted
      const remainingMovements = (await db.movements.list()).filter(m => m.product_id === createResult.id);
      console.log("Remaining movements count for deleted product:", remainingMovements.length);
      if (remainingMovements.length !== 0) {
        throw new Error("Expected movements associated with the product to be deleted");
      }

      console.log("\nAll products API tests passed successfully!");
      process.exit(0);
    } catch (err) {
      console.error("\nProducts API test failed:", err);
      process.exit(1);
    }
  });
}

runTests();
