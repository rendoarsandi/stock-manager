import { Route as productsRoute } from '../app/routes/api/products.js';
import { storageContext } from '../src/db/context.js';
import { getLocalStore } from '../src/db/local_sqlite.js';
import { seedIfNeeded, initDatabase } from '../src/db/connection.js';
import { loginUser } from './helpers.js';

process.env.NODE_ENV = 'test';

async function runTests() {
  try {
    console.log("\n--- Running Cloudflare Durable Object Drizzle Compatibility Tests ---");

    // 1. Initialize local SQLite for the stub to delegate to
    const realStorage = getLocalStore();
    await initDatabase();
    await seedIfNeeded(realStorage);

    // 2. Create a session for admin user using loginUser helper
    let tokenCookie;
    await storageContext.run({ type: 'local', storage: realStorage }, async () => {
      tokenCookie = await loginUser(null, 'admin', 'admin123');
    });

    // 3. Setup mock Durable Object stub that responds to queries
    let queryValuesCalled = false;

    const mockStub = {
      async query(sql, params) {
        return await realStorage.query(sql, params);
      },
      async queryValues(sql, params) {
        queryValuesCalled = true;
        return await realStorage.queryValues(sql, params);
      },
      async execute(sql, params) {
        return await realStorage.execute(sql, params);
      },
      async executeTransaction(queries) {
        return await realStorage.executeTransaction(queries);
      }
    };

    const mockEnv = {
      STOCK_ROOM: {
        idFromName(name) {
          return { toString() { return 'mock-id'; } };
        },
        get(id) {
          return mockStub;
        }
      }
    };

    // Set minimal Cloudflare env in globalThis
    globalThis.MINIMAL_CLOUDFLARE_ENV = mockEnv;

    // 4. Make request to GET /api/products
    const productsReq = new Request('http://localhost/api/products', {
      method: 'GET',
      headers: { 'Cookie': tokenCookie }
    });

    const productsHandler = productsRoute.options.server.handlers.GET;
    const res = await productsHandler({ request: productsReq });

    console.log("Response status:", res.status);
    if (res.status !== 200) {
      const text = await res.text();
      throw new Error(`Expected status 200, got ${res.status}. Body: ${text}`);
    }

    const data = await res.json();
    console.log(`Found ${data.length} products via Cloudflare-simulated proxy.`);

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Expected to retrieve products from the database");
    }

    if (!queryValuesCalled) {
      throw new Error("Expected queryValues to be called on Cloudflare Durable Object stub");
    }

    console.log("✅ Cloudflare Durable Object Drizzle Compatibility tests passed successfully!");
    
    // Clean up
    delete globalThis.MINIMAL_CLOUDFLARE_ENV;
    process.exit(0);
  } catch (err) {
    console.error("❌ Cloudflare Durable Object Drizzle Compatibility test failed:", err);
    delete globalThis.MINIMAL_CLOUDFLARE_ENV;
    process.exit(1);
  }
}

runTests();
