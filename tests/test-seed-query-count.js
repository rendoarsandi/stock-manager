import { seedIfNeeded } from '../src/db/connection.js';

async function runTest() {
  console.log("--- Running Seeding Query Count Tests ---");

  // 1. Verify in production/development environment
  {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    let queryCount = 0;
    const mockStorage = {
      query: async (sql, params) => {
        queryCount++;
        console.log(`[Prod Mock Query ${queryCount}] ${sql}`);
        if (sql.includes("products")) {
          return [{ id: 1, name: "Existing Product" }];
        }
        return [];
      },
      execute: async (sql, params) => {
        return { lastInsertRowid: 1 };
      }
    };

    await seedIfNeeded(mockStorage);
    process.env.NODE_ENV = originalEnv;

    console.log(`Production/Dev Environment queries executed: ${queryCount}`);
    if (queryCount !== 2) {
      throw new Error(`Expected exactly 2 queries in production (SELECT * FROM products LIMIT 1 and SELECT * FROM import_templates LIMIT 1), but got ${queryCount}`);
    }
  }

  // 2. Verify in test environment
  {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    let queryCount = 0;
    const mockStorage = {
      query: async (sql, params) => {
        queryCount++;
        console.log(`[Test Mock Query ${queryCount}] ${sql}`);
        if (sql.includes("users")) {
          return [{ id: 1, username: "mocked" }];
        }
        if (sql.includes("products")) {
          return [{ id: 1, name: "Existing Product" }];
        }
        return [];
      },
      execute: async (sql, params) => {
        return { lastInsertRowid: 1 };
      }
    };

    await seedIfNeeded(mockStorage);
    process.env.NODE_ENV = originalEnv;

    console.log(`Test Environment queries executed: ${queryCount}`);
    if (queryCount !== 4) {
      throw new Error(`Expected exactly 4 queries in test environment (2 user checks + 1 product check + 1 template check), but got ${queryCount}`);
    }
  }

  console.log("✅ Seeding Query Count test passed successfully for all environments!");
  process.exit(0);
}

runTest().catch(err => {
  console.error("❌ Seeding Query Count test failed:", err);
  process.exit(1);
});
