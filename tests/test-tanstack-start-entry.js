import { Route as loginRoute } from '../app/routes/api/auth/login.js';
import { Route as statsRoute } from '../app/routes/api/dashboard/stats.js';
import { Route as productsRoute } from '../app/routes/api/products.js';
import { initDatabase } from '../src/db/connection.js';
import { seed } from '../src/db/seed.js';

process.env.NODE_ENV = 'test';

async function runTests() {
  try {
    await initDatabase();
    await seed();

    console.log("\n--- Running TanStack Start Handler Entry Point Tests ---");

    // 1. Call login handler directly
    const loginReq = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const loginHandler = loginRoute.options.server.handlers.POST;
    const loginRes = await loginHandler({ request: loginReq });
    
    console.log("Login status:", loginRes.status);
    if (loginRes.status !== 200) {
      throw new Error("Login handler failed");
    }

    const setCookieHeader = loginRes.headers.get('set-cookie');
    if (!setCookieHeader || !setCookieHeader.includes('token=')) {
      throw new Error("Expected set-cookie header with token from login handler");
    }
    const tokenCookie = setCookieHeader.split(';')[0];

    // 2. Call stats GET handler directly
    const statsReq = new Request('http://localhost/api/dashboard/stats', {
      method: 'GET',
      headers: { 'Cookie': tokenCookie }
    });

    const statsHandler = statsRoute.options.server.handlers.GET;
    const statsRes = await statsHandler({ request: statsReq });
    console.log("Stats status:", statsRes.status);
    if (statsRes.status !== 200) {
      throw new Error(`Stats handler failed with status ${statsRes.status}`);
    }

    const statsData = await statsRes.json();
    console.log("Stats total products:", statsData.total_products);
    if (typeof statsData.total_products !== 'number') {
      throw new Error("Stats total_products is not a number");
    }

    // 3. Call products GET handler directly
    const productsReq = new Request('http://localhost/api/products', {
      method: 'GET',
      headers: { 'Cookie': tokenCookie }
    });

    const productsHandler = productsRoute.options.server.handlers.GET;
    const productsRes = await productsHandler({ request: productsReq });
    console.log("Products status:", productsRes.status);
    if (productsRes.status !== 200) {
      throw new Error(`Products handler failed with status ${productsRes.status}`);
    }

    const productsData = await productsRes.json();
    console.log("Products count:", productsData.length);
    if (!Array.isArray(productsData)) {
      throw new Error("Products response is not an array");
    }

    console.log("✅ TanStack Start entry point tests passed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ TanStack Start entry point test failed:", err);
    process.exit(1);
  }
}

runTests();
