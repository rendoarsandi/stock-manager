import app from '../src/index.js';
import { initDatabase, db } from '../src/db/connection.js';
import { seed } from '../src/db/seed.js';

process.env.NODE_ENV = 'test';

async function runTests() {
  try {
    await initDatabase();
    await seed();

    console.log("\n--- Running Dashboard API Tests ---");

    // Login admin to get auth cookie
    const resLogin = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const adminCookie = resLogin.headers.get('set-cookie').split(';')[0];

    // 1. Get dashboard stats
    console.log("Testing GET /api/dashboard/stats...");
    const resStats = await app.request('/api/dashboard/stats', {
      headers: { 'Cookie': adminCookie }
    });

    if (resStats.status !== 200) {
      throw new Error("Failed fetching dashboard stats");
    }

    const stats = await resStats.json();
    console.log("Dashboard Stats object keys:", Object.keys(stats));
    console.log("Total Products count:", stats.total_products);
    console.log("Low Stock count:", stats.low_stock_count);
    console.log("Pending Review count:", stats.pending_review_count);
    console.log("Ambiguous count:", stats.ambiguous_count);

    // Initial Seed expectations:
    // Total products: 4
    // Low stock count: 1 (Korek Api Model D has stock 3, threshold 10)
    // Pending review count: 0 (since no imports confirmed yet in clean test db)
    // Ambiguous count: 0
    if (stats.total_products !== 4 || stats.low_stock_count !== 1) {
      throw new Error(`Seeded counts check failed: expected 4 products (1 low stock), got ${stats.total_products} (${stats.low_stock_count})`);
    }

    if (stats.pending_review_count !== 0 || stats.ambiguous_count !== 0) {
      throw new Error("Expected 0 review and 0 ambiguous counts initially");
    }

    console.log("Recent reviews list count:", stats.recent_reviews.length);
    console.log("Recent imports list count:", stats.recent_imports.length);

    console.log("\nAll Dashboard API tests passed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("\nDashboard API test failed:", err);
    process.exit(1);
  }
}

runTests();
