import { db } from '../src/db/connection.js';
import { storageContext } from '../src/db/context.js';
import { getLocalStore } from '../src/db/local_sqlite.js';

process.env.NODE_ENV = 'test';

async function runTests() {
  console.log("\n--- Running localeCompare Robustness Tests ---");

  const store = {
    type: 'local',
    storage: getLocalStore()
  };

  await storageContext.run(store, async () => {
    try {
      // Mock db.products.list to return some products with missing/null names
      const originalProductsList = db.products.list;
      db.products.list = async () => [
        { id: 1, name: 'Product A', model: 'Model A' },
        { id: 2, name: null, model: 'Model B' },
        { id: 3, name: undefined, model: 'Model C' }
      ];

      const originalUsersList = db.users.list;
      db.users.list = async () => [
        { id: 1, username: 'user1', role: 'staff' },
        { id: 2, username: null, role: 'staff' },
        { id: 3, username: undefined, role: 'staff' }
      ];

      const originalTemplatesList = db.templates.list;
      db.templates.list = async () => [
        { id: 1, name: 'Template A', column_mapping: '{}' },
        { id: 2, name: null, column_mapping: '{}' },
        { id: 3, name: undefined, column_mapping: '{}' }
      ];

      // Import handlers to test
      const { handleListProducts, handleListUsers, handleListTemplates } = await import('../src/routes_new/index.js');

      // 1. Test handleListProducts
      const resProducts = await handleListProducts({});
      const productsData = await resProducts.json();
      console.log("handleListProducts return count:", productsData.length);
      if (productsData.length !== 3) {
        throw new Error("Expected 3 products back");
      }

      // 2. Test handleListUsers
      const resUsers = await handleListUsers({});
      const usersData = await resUsers.json();
      console.log("handleListUsers return count:", usersData.length);
      if (usersData.length !== 3) {
        throw new Error("Expected 3 users back");
      }

      // 3. Test handleListTemplates
      const resTemplates = await handleListTemplates({});
      const templatesData = await resTemplates.json();
      console.log("handleListTemplates return count:", templatesData.length);
      if (templatesData.length !== 3) {
        throw new Error("Expected 3 templates back");
      }

      // Restore original methods
      db.products.list = originalProductsList;
      db.users.list = originalUsersList;
      db.templates.list = originalTemplatesList;

      console.log("✅ All localeCompare robustness tests passed successfully!");
      process.exit(0);
    } catch (err) {
      console.error("❌ localeCompare robustness test failed:", err);
      process.exit(1);
    }
  });
}

runTests();
