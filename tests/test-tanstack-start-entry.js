import { Route as meRoute } from '../app/routes/api/auth/me.js';
import { Route as statsRoute } from '../app/routes/api/dashboard/stats.js';
import { Route as productsRoute } from '../app/routes/api/products.js';
import { withSeededStorage, getAdminCookie } from './helpers.js';

process.env.NODE_ENV = 'test';

async function runTests() {
  await withSeededStorage(async () => {
    try {
      console.log("\n--- Running TanStack Start Handler Entry Point Tests ---");

      const tokenCookie = await getAdminCookie();

      // 1. Call me handler directly
      const meReq = new Request('http://localhost/api/auth/me', {
        method: 'GET',
        headers: { 'Cookie': tokenCookie }
      });
      
      const meHandler = meRoute.options.server.handlers.GET;
      const meRes = await meHandler({ request: meReq });
      
      console.log("Me status:", meRes.status);
      if (meRes.status !== 200) {
        throw new Error("Me handler failed");
      }

      const meData = await meRes.json();
      console.log("Me username:", meData.username);
      if (meData.username !== 'admin') {
        throw new Error("Expected username to be admin");
      }

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
  });
}

runTests();
