import { db } from '../src/db/connection.js';
import {
  apiRequest,
  assert,
  assertEqual,
  assertStatus,
  getAdminCookie,
  getStaffCookie,
  json,
  runTest,
  withSeededStorage
} from './helpers.js';

process.env.NODE_ENV = 'test';

runTest('New Features Robustness & Edge Cases', async () => {
  const app = (await import('../src/index.js')).default;

  await withSeededStorage(async () => {
    const adminCookie = await getAdminCookie(app);
    const staffCookie = await getStaffCookie(app);

    // =========================================================================
    // 1. FORECASTING & DEPLETION VELOCITY EDGE CASES
    // =========================================================================
    
    // 1.1 Verify GET /api/products returns depletion metrics
    const productsRes = await apiRequest(app, '/api/products', { cookie: adminCookie });
    await assertStatus(productsRes, 200, 'list products');
    const productsList = await json(productsRes);
    
    assert(Array.isArray(productsList), 'productsList must be an array');
    assert(productsList.length > 0, 'productsList must have items');
    
    // 1.2 Test boundary conditions for zero-velocity products (ensuring no division-by-zero crashes)
    const zeroVelProduct = productsList.find(p => p.daily_velocity === 0 || !p.daily_velocity);
    if (zeroVelProduct) {
      assertEqual(zeroVelProduct.daily_velocity, 0, 'velocity of unsold product should be 0');
      assertEqual(zeroVelProduct.days_remaining, null, 'days_remaining of unsold product should be null');
    }

    // =========================================================================
    // 2. DASHBOARD ANALYTICS & TRENDS VALIDATION
    // =========================================================================
    const statsRes = await apiRequest(app, '/api/dashboard/stats', { cookie: adminCookie });
    await assertStatus(statsRes, 200, 'get dashboard stats');
    const stats = await json(statsRes);

    assert('stock_trends' in stats, 'Stats must contain stock_trends');
    assert('top_moving_products' in stats, 'Stats must contain top_moving_products');
    assert(Array.isArray(stats.stock_trends), 'stock_trends must be an array');
    assert(Array.isArray(stats.top_moving_products), 'top_moving_products must be an array');

    // =========================================================================
    // 3. SECURE STOCK ADJUSTMENT (ROLE BOUNDARIES & SANITIZATION)
    // =========================================================================
    const targetProduct = productsList.find(p => p.current_stock > 10);
    assert(targetProduct !== undefined, 'Must find a product with stock > 10');

    // 3.1 Unauthorized Adjustment Check (No Session Cookie)
    const resUnauth = await apiRequest(app, `/api/products/${targetProduct.id}/adjust-stock`, {
      method: 'POST',
      body: {
        quantity_change: -5,
        movement_type: 'sale',
        reference: 'Malicious unauthorized attempt'
      }
    });
    await assertStatus(resUnauth, 401, 'unauthorized adjustments must be rejected with 401');

    // 3.2 Staff Authentication Check (Valid credentials)
    const resStaffAdjust = await apiRequest(app, `/api/products/${targetProduct.id}/adjust-stock`, {
      method: 'POST',
      cookie: staffCookie,
      body: {
        quantity_change: -1,
        movement_type: 'sale',
        reference: 'Staff adjustment'
      }
    });
    await assertStatus(resStaffAdjust, 200, 'staff adjustments should be allowed and returned with 200');

    // 3.3 Validate Non-Integer / Floated Inputs Sanitization
    const resFloatAdjust = await apiRequest(app, `/api/products/${targetProduct.id}/adjust-stock`, {
      method: 'POST',
      cookie: adminCookie,
      body: {
        quantity_change: -2.5, // Float value
        movement_type: 'sale',
        reference: 'Float adjustment test'
      }
    });
    await assertStatus(resFloatAdjust, 400, 'non-integer stock adjustment must be rejected with 400');

    // 3.4 Valid Manual Admin Adjustment Validation
    const adjustRes = await apiRequest(app, `/api/products/${targetProduct.id}/adjust-stock`, {
      method: 'POST',
      cookie: adminCookie,
      body: {
        quantity_change: -30, // 30 units sold
        movement_type: 'sale',
        reference: 'Test sale for velocity'
      }
    });
    await assertStatus(adjustRes, 200, 'adjust stock for velocity');

    // =========================================================================
    // 4. METRIC CORRECTNESS & PROPAGATION
    // =========================================================================
    const updatedProductsRes = await apiRequest(app, '/api/products', { cookie: adminCookie });
    await assertStatus(updatedProductsRes, 200, 'list products updated');
    const updatedProductsList = await json(updatedProductsRes);
    const updatedTargetProduct = updatedProductsList.find(p => p.id === targetProduct.id);

    // Total sales in 30 days = 1 (staff) + 30 (admin) = 31
    const expectedVelocity = 31 / 30.0;
    assertEqual(updatedTargetProduct.daily_velocity, expectedVelocity, 'daily_velocity must represent exact sales over 30 days');
    
    const expectedDays = Math.round(updatedTargetProduct.current_stock / expectedVelocity);
    assertEqual(updatedTargetProduct.days_remaining, expectedDays, 'days_remaining must exactly map current_stock / velocity');

    // 4.2 Verify sales volumes register inside Top Moving Dashboard KPI correctly
    const updatedStatsRes = await apiRequest(app, '/api/dashboard/stats', { cookie: adminCookie });
    await assertStatus(updatedStatsRes, 200, 'get updated stats');
    const updatedStats = await json(updatedStatsRes);
    const topMoving = updatedStats.top_moving_products.find(p => p.id === targetProduct.id);
    
    assert(topMoving !== undefined, 'Target product must be listed in Top Moving items');
    assertEqual(Number(topMoving.sales_volume), 31, 'sales volume should sum up all registered sales in the last 30 days');
  });
});
