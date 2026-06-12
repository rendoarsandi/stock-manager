import app from '../src/index.js';
import { initDatabase, db, seedIfNeeded } from '../src/db/connection.js';
import { storageContext } from '../src/db/context.js';
import { getLocalStore } from '../src/db/local_kv.js';
import XLSX from 'xlsx';

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

      console.log("\n--- Running Review Feedback Integration Tests ---");

      // Login admin to get auth cookie
      const resLogin = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
      });
      const adminCookie = resLogin.headers.get('set-cookie').split(';')[0];

      // 1. Test Empty Excel upload (Empty list of rows)
      console.log("Testing POST /api/import/upload with empty file...");
      const sheetData = []; // empty
      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const formData = new FormData();
      const file = new File([excelBuffer], 'empty_sales.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      formData.append('file', file);
      formData.append('template_id', '1'); // Shopee template ID is 1

      const uploadRes = await app.request('/api/import/upload', {
        method: 'POST',
        headers: { 'Cookie': adminCookie },
        body: formData
      });
      
      console.log(`Empty upload status: ${uploadRes.status}`);
      if (uploadRes.status !== 400) {
        throw new Error(`Expected 400 for empty upload, got ${uploadRes.status}`);
      }
      const errUpload = await uploadRes.json();
      console.log("Empty upload error message:", errUpload.message);
      if (!errUpload.message || !errUpload.message.includes("No valid orders")) {
        throw new Error(`Expected 'No valid orders' message, got: ${errUpload.message}`);
      }

      // 2. Test Invalid Stock Opname (Negative physical count)
      console.log("\nTesting POST /api/stock/opname with negative physical count...");
      const opnameRes = await app.request('/api/stock/opname', {
        method: 'POST',
        headers: {
          'Cookie': adminCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notes: 'Test negative count audit',
          items: [
            { product_id: 1, physical_stock: -10 }
          ]
        })
      });

      console.log(`Negative opname status: ${opnameRes.status}`);
      if (opnameRes.status !== 400) {
        throw new Error(`Expected 400 for negative opname, got ${opnameRes.status}`);
      }
      const errOpname = await opnameRes.json();
      console.log("Negative opname error message:", errOpname.message);
      if (!errOpname.message || !errOpname.message.includes("Invalid product_id or physical_stock")) {
        throw new Error(`Expected 'Invalid product_id or physical_stock' message, got: ${errOpname.message}`);
      }

      // 3. Test Invalid Stock Opname (Invalid product ID)
      console.log("\nTesting POST /api/stock/opname with invalid product ID...");
      const opnameResInvalid = await app.request('/api/stock/opname', {
        method: 'POST',
        headers: {
          'Cookie': adminCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notes: 'Test invalid product ID',
          items: [
            { product_id: 'abc', physical_stock: 10 }
          ]
        })
      });

      console.log(`Invalid product opname status: ${opnameResInvalid.status}`);
      if (opnameResInvalid.status !== 400) {
        throw new Error(`Expected 400 for invalid product opname, got ${opnameResInvalid.status}`);
      }
      const errOpnameInvalid = await opnameResInvalid.json();
      console.log("Invalid product opname error message:", errOpnameInvalid.message);

      console.log("\nAll review feedback validation tests passed successfully!");
      process.exit(0);
    } catch (err) {
      console.error("\nReview feedback validation tests failed:", err);
      process.exit(1);
    }
  });
}

runTests();
