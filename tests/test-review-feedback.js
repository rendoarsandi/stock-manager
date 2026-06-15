import app from '../src/index.js';
import { initDatabase, db, seedIfNeeded } from '../src/db/connection.js';
import { storageContext } from '../src/db/context.js';
import { getLocalStore } from '../src/db/local_kv.js';
import { signJwt } from './helpers.js';
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

      // 3b. Test Stock Opname with non-existent product ID
      console.log("\nTesting POST /api/stock/opname with non-existent product ID...");
      const nonExistentOpnameRes = await app.request('/api/stock/opname', {
        method: 'POST',
        headers: {
          'Cookie': adminCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notes: 'Test non-existent product ID',
          items: [
            { product_id: 9999, physical_stock: 5 }
          ]
        })
      });
      console.log(`Non-existent product opname status: ${nonExistentOpnameRes.status}`);
      if (nonExistentOpnameRes.status !== 404) {
        throw new Error(`Expected 404 for non-existent product opname, got ${nonExistentOpnameRes.status}`);
      }

      // 3c. Test Stock Opname with zero physical count (valid audit to indicate out-of-stock)
      console.log("\nTesting POST /api/stock/opname with zero physical count (valid)...");
      const zeroOpnameRes = await app.request('/api/stock/opname', {
        method: 'POST',
        headers: {
          'Cookie': adminCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notes: 'Test zero count audit',
          items: [
            { product_id: 1, physical_stock: 0 }
          ]
        })
      });
      console.log(`Zero count opname status: ${zeroOpnameRes.status}`);
      if (zeroOpnameRes.status !== 201) {
        throw new Error(`Expected 201 for zero count opname, got ${zeroOpnameRes.status}`);
      }

      // 4. Test handleConfirmSplit NaN validation
      console.log("\nTesting POST /api/review/confirm-split with NaN parameter values...");
      const splitResNaN = await app.request('/api/review/confirm-split', {
        method: 'POST',
        headers: {
          'Cookie': adminCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          item_id: 'nan_id',
          product_id: 1,
          quantity: 10
        })
      });

      console.log(`NaN split confirm status: ${splitResNaN.status}`);
      if (splitResNaN.status !== 400) {
        throw new Error(`Expected 400 for NaN split confirm, got ${splitResNaN.status}`);
      }
      const errSplitNaN = await splitResNaN.json();
      console.log("NaN split confirm error message:", errSplitNaN.message);
      if (!errSplitNaN.message || !errSplitNaN.message.includes("Invalid item ID")) {
        throw new Error(`Expected 'Invalid item ID' message, got: ${errSplitNaN.message}`);
      }

      // 4b. Test handleConfirmSplit with negative/zero parameter values
      console.log("\nTesting POST /api/review/confirm-split with negative or zero quantity...");
      const splitResNegative = await app.request('/api/review/confirm-split', {
        method: 'POST',
        headers: {
          'Cookie': adminCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          item_id: 1,
          product_id: 1,
          quantity: -5
        })
      });
      console.log(`Negative quantity split confirm status: ${splitResNegative.status}`);
      if (splitResNegative.status !== 400) {
        throw new Error(`Expected 400 for negative quantity split confirm, got ${splitResNegative.status}`);
      }

      console.log("Testing POST /api/review/confirm-split with non-existent product ID...");
      const splitResNonExistent = await app.request('/api/review/confirm-split', {
        method: 'POST',
        headers: {
          'Cookie': adminCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          item_id: 1, // assume item 1 exists in DB seeded state
          product_id: 9999, // non-existent product ID
          quantity: 2
        })
      });
      console.log(`Non-existent product split confirm status: ${splitResNonExistent.status}`);
      if (splitResNonExistent.status !== 404) {
        throw new Error(`Expected 404 for non-existent product split confirm, got ${splitResNonExistent.status}`);
      }

      // 5. Test verifyJwt timing-safe signature comparison & expired token validation
      console.log("\nTesting custom JWT validation and expiration checks...");
      
      const JWT_SECRET = 'dev_secret_key';

      // 5a. Expired Token
      const expiredPayload = { id: 1, username: 'admin', role: 'admin', exp: Math.floor(Date.now() / 1000) - 10 };
      const expiredToken = signJwt(expiredPayload, JWT_SECRET);
      const expiredRes = await app.request('/api/auth/me', {
        headers: { 'Cookie': `token=${expiredToken}` }
      });
      console.log(`Expired token auth/me status: ${expiredRes.status}`);
      if (expiredRes.status !== 401) {
        throw new Error(`Expected 401 for expired token, got ${expiredRes.status}`);
      }

      // 5b. Tampered Signature
      const tamperedPayload = { id: 1, username: 'admin', role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 };
      const tamperedToken = signJwt(tamperedPayload, 'wrong_secret_key_used_to_tamper_signature');
      const tamperedRes = await app.request('/api/auth/me', {
        headers: { 'Cookie': `token=${tamperedToken}` }
      });
      console.log(`Tampered token auth/me status: ${tamperedRes.status}`);
      if (tamperedRes.status !== 401) {
        throw new Error(`Expected 401 for tampered token, got ${tamperedRes.status}`);
      }

      // 5c. Malformed JWT Token format (no dots)
      console.log("Testing auth/me with malformed token (no dots)...");
      const noDotsRes = await app.request('/api/auth/me', {
        headers: { 'Cookie': 'token=not_a_jwt_token' }
      });
      console.log(`Malformed token (no dots) status: ${noDotsRes.status}`);
      if (noDotsRes.status !== 401) {
        throw new Error(`Expected 401 for malformed token, got ${noDotsRes.status}`);
      }

      // 5d. Incomplete JWT Token format (only one dot)
      console.log("Testing auth/me with incomplete token (one dot)...");
      const oneDotRes = await app.request('/api/auth/me', {
        headers: { 'Cookie': 'token=abc.def' }
      });
      console.log(`Incomplete token (one dot) status: ${oneDotRes.status}`);
      if (oneDotRes.status !== 401) {
        throw new Error(`Expected 401 for incomplete token, got ${oneDotRes.status}`);
      }

      // 6. Test Multi-split foreign key correctness in handleConfirmImport
      console.log("\nTesting import confirmation foreign key accuracy for multi-split order...");
      
      // Inject test bundle mapping
      const { BUNDLE_MAPPINGS } = await import('../src/services/ambiguous-parser.js');
      BUNDLE_MAPPINGS['test_feedback_bundle'] = [
        { name: 'Korek Api Model A', qty: 2 },
        { name: 'Korek Api Model B', qty: 3 }
      ];

      // Create a mock Excel sheet with a bundle split order
      const splitSheetData = [
        {
          "No. Pesanan": "ORDER-SPLIT-99",
          "No. Resi": "RESI-SPLIT-99",
          "Nama Produk": "Test Feedback Promotion Pack",
          "Jumlah": 1,
          "Status Pesanan": "Selesai",
          "Username Pembeli": "buyersplit",
          "Opsi Pengiriman": "J&T Express",
          "Waktu Pembayaran": "2026-06-10 10:00",
          "Total Pembayaran": "Rp 25.000",
          "Nomor Referensi SKU": "test_feedback_bundle"
        }
      ];

      const ws = XLSX.utils.json_to_sheet(splitSheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const splitFormData = new FormData();
      const splitFile = new File([buf], 'split_sales.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      splitFormData.append('file', splitFile);
      splitFormData.append('template_id', '1');

      // Upload
      const splitUploadRes = await app.request('/api/import/upload', {
        method: 'POST',
        headers: { 'Cookie': adminCookie },
        body: splitFormData
      });

      if (splitUploadRes.status !== 200) {
        throw new Error(`Upload failed for split import: ${splitUploadRes.status}`);
      }
      const uploadJSON = await splitUploadRes.json();
      const sId = uploadJSON.session_id;

      // Confirm
      const confirmRes = await app.request('/api/import/confirm', {
        method: 'POST',
        headers: {
          'Cookie': adminCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: sId,
          orders: uploadJSON.orders
        })
      });

      if (confirmRes.status !== 200) {
        throw new Error(`Confirm failed for split import: ${confirmRes.status}`);
      }

      // Query database directly to check order_items order_id correctness
      const importedOrders = await db.orders.list();
      const targetOrder = importedOrders.find(o => o.order_id === 'ORDER-SPLIT-99');
      if (!targetOrder) {
        throw new Error("Split order was not inserted into the database");
      }

      const importedItems = await db.orderItems.list();
      const splitItems = importedItems.filter(item => item.original_text && item.original_text.includes("Test Feedback Promotion Pack"));
      if (splitItems.length !== 2) {
        throw new Error(`Expected 2 split items, found ${splitItems.length}`);
      }

      for (const item of splitItems) {
        if (item.order_id !== targetOrder.id) {
          throw new Error(`Foreign key corruption detected! order_item.order_id is ${item.order_id}, but expected order.id is ${targetOrder.id}`);
        }
      }
      console.log("✅ Verified all splits map correctly to the inserted order ID.");

      // 7. Test seedingPromise error caching bypass on failure
      console.log("\nTesting seedingPromise behavior when seeding fails...");
      process.env.NODE_ENV = 'production'; // bypass 'test' condition in app.js
      
      const { getLocalStore } = await import('../src/db/local_sqlite.js');
      const storeObj = getLocalStore();
      
      const originalQuery = storeObj.query;
      const originalExecute = storeObj.execute;

      // Make it fail
      storeObj.query = () => Promise.reject(new Error("Mock seeding failure"));
      storeObj.execute = () => Promise.reject(new Error("Mock seeding failure"));

      // Run failing request
      try {
        await app.request('/api/non-existent-path-for-testing');
        throw new Error("Expected request to fail due to seeding error");
      } catch (err) {
        if (!err.message.includes("Mock seeding failure")) {
          throw err;
        }
        console.log("✅ First request correctly failed with seeding error.");
      }

      // Restore and count runs
      let runCount = 0;
      storeObj.query = function(sql, params) {
        runCount++;
        return originalQuery.call(this, sql, params);
      };
      storeObj.execute = originalExecute;

      // This request should succeed and call seedIfNeeded (triggering query)
      const res = await app.request('/api/non-existent-path-for-testing');
      console.log("✅ Second request status:", res.status);
      if (res.status !== 404) {
        throw new Error(`Expected 404 for non-existent path, got ${res.status}`);
      }

      if (runCount === 0) {
        throw new Error("Expected seedIfNeeded to be called again on the second request");
      }
      
      // Fully restore original functions
      storeObj.query = originalQuery;
      storeObj.execute = originalExecute;
      process.env.NODE_ENV = 'test'; // restore
      console.log("✅ Verified seedingPromise was cleared and retried on subsequent requests.");

      console.log("\nAll review feedback validation tests passed successfully!");
      process.exit(0);
    } catch (err) {
      console.error("\nReview feedback validation tests failed:", err);
      process.exit(1);
    }
  });
}

runTests();
