import { db } from '../src/db/connection.js';
import {
  apiRequest,
  assert,
  assertArrayLength,
  assertEqual,
  assertStatus,
  getAdminCookie,
  getStaffCookie,
  json,
  runTest,
  withSeededStorage
} from './helpers.js';

process.env.NODE_ENV = 'test';

const newProduct = {
  name: 'Korek Api Model E',
  model: 'Model E',
  description: 'Super Match E',
  initial_stock: 45,
  low_stock_threshold: 15
};

runTest('Products API', async () => {
  const app = (await import('../src/index.js')).default;

  await withSeededStorage(async () => {
    const adminCookie = await getAdminCookie(app);
    const staffCookie = await getStaffCookie(app);

    const listRes = await apiRequest(app, '/api/products', { cookie: adminCookie });
    await assertStatus(listRes, 200, 'list products');
    assertArrayLength(await json(listRes), 4, 'seeded products');

    const staffCreateRes = await apiRequest(app, '/api/products', {
      method: 'POST',
      cookie: staffCookie,
      body: { name: 'Staff Product', model: 'Model S', initial_stock: 10, low_stock_threshold: 5 }
    });
    await assertStatus(staffCreateRes, 403, 'staff cannot create product');

    const createRes = await apiRequest(app, '/api/products', {
      method: 'POST',
      cookie: adminCookie,
      body: newProduct
    });
    await assertStatus(createRes, 201, 'admin creates product');
    const createPayload = await json(createRes);
    assert(createPayload.success && createPayload.id, 'create response should include product id');

    const created = await db.products.get(createPayload.id);
    assertEqual(created.current_stock, 45, 'created stock');
    assertEqual(created.low_stock_threshold, 15, 'created threshold');

    const initialMovements = (await db.movements.list()).filter((m) => m.product_id === createPayload.id);
    assertArrayLength(initialMovements, 1, 'initial stock movements');
    assertEqual(initialMovements[0].quantity_change, 45, 'initial movement quantity');
    assertEqual(initialMovements[0].movement_type, 'initial', 'initial movement type');

    const duplicateRes = await apiRequest(app, '/api/products', {
      method: 'POST',
      cookie: adminCookie,
      body: newProduct
    });
    await assertStatus(duplicateRes, 400, 'duplicate product create');

    const editRes = await apiRequest(app, `/api/products/${createPayload.id}`, {
      method: 'PUT',
      cookie: adminCookie,
      body: {
        name: 'Korek Api Model E Renamed',
        model: 'Model E V2',
        description: 'Updated description',
        low_stock_threshold: 8
      }
    });
    await assertStatus(editRes, 200, 'edit product');

    const updated = await db.products.get(createPayload.id);
    assertEqual(updated.name, 'Korek Api Model E Renamed', 'updated product name');
    assertEqual(updated.low_stock_threshold, 8, 'updated threshold');

    const adjustRes = await apiRequest(app, `/api/products/${createPayload.id}/adjust-stock`, {
      method: 'POST',
      cookie: staffCookie,
      body: {
        quantity_change: -15,
        movement_type: 'write_off',
        reference: 'Damaged by humidity'
      }
    });
    await assertStatus(adjustRes, 200, 'adjust stock');
    assertEqual((await json(adjustRes)).current_stock, 30, 'adjusted stock');

    const movements = (await db.movements.list()).filter((m) => m.product_id === createPayload.id);
    assertArrayLength(movements, 2, 'movement ledger');
    const lastMovement = movements.sort((a, b) => b.id - a.id)[0];
    assertEqual(lastMovement.quantity_change, -15, 'adjustment movement quantity');
    assertEqual(lastMovement.movement_type, 'write_off', 'adjustment movement type');
    assertEqual(lastMovement.reference, 'Damaged by humidity', 'adjustment movement reference');

    const staffDeleteRes = await apiRequest(app, `/api/products/${createPayload.id}`, {
      method: 'DELETE',
      cookie: staffCookie
    });
    await assertStatus(staffDeleteRes, 403, 'staff cannot delete product');

    const deleteRes = await apiRequest(app, `/api/products/${createPayload.id}`, {
      method: 'DELETE',
      cookie: adminCookie
    });
    await assertStatus(deleteRes, 200, 'admin deletes product');
    assert((await json(deleteRes)).success, 'delete response should be successful');

    assertEqual(await db.products.get(createPayload.id), null, 'deleted product lookup');
    const remainingMovements = (await db.movements.list()).filter((m) => m.product_id === createPayload.id);
    assertArrayLength(remainingMovements, 0, 'deleted product movements');

    // =========================================================================
    // Concurrent Stock Adjustment Verification
    // =========================================================================
    const initialProduct = await db.products.get(1);
    const startStock = initialProduct.current_stock;
    
    // Simulate 5 concurrent stock adjustments (+10 each)
    await Promise.all([
      db.products.adjustStock(1, 10),
      db.products.adjustStock(1, 10),
      db.products.adjustStock(1, 10),
      db.products.adjustStock(1, 10),
      db.products.adjustStock(1, 10)
    ]);

    const finalProduct = await db.products.get(1);
    assertEqual(finalProduct.current_stock, startStock + 50, 'atomic stock adjustment handles concurrent edits correctly');

    // =========================================================================
    // localeCompare Sorting Robustness Verification (with missing/null/undefined names)
    // =========================================================================
    const originalProductsList = db.products.list;
    const originalUsersList = db.users.list;
    const originalTemplatesList = db.templates.list;

    try {
      db.products.list = async () => [
        { id: 1, name: 'Product A', model: 'Model A' },
        { id: 2, name: null, model: 'Model B' },
        { id: 3, name: undefined, model: 'Model C' }
      ];
      db.users.list = async () => [
        { id: 1, username: 'user1', role: 'staff' },
        { id: 2, username: null, role: 'staff' },
        { id: 3, username: undefined, role: 'staff' }
      ];
      db.templates.list = async () => [
        { id: 1, name: 'Template A', column_mapping: '{}' },
        { id: 2, name: null, column_mapping: '{}' },
        { id: 3, name: undefined, column_mapping: '{}' }
      ];

      const { handleListProducts, handleListUsers, handleListTemplates } = await import('../src/routes_new/index.js');

      // 1. Verify handleListProducts handles missing names
      const resProducts = await handleListProducts({});
      const productsData = await resProducts.json();
      assertEqual(productsData.length, 3, 'Robust products length');

      // 2. Verify handleListUsers handles missing usernames
      const resUsers = await handleListUsers({});
      const usersData = await resUsers.json();
      assertEqual(usersData.length, 3, 'Robust users length');

      // 3. Verify handleListTemplates handles missing template names
      const resTemplates = await handleListTemplates({});
      const templatesData = await resTemplates.json();
      assertEqual(templatesData.length, 3, 'Robust templates length');

    } finally {
      db.products.list = originalProductsList;
      db.users.list = originalUsersList;
      db.templates.list = originalTemplatesList;
    }
  });
});
