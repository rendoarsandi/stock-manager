import app from '../src/index.js';
import { initDatabase, db, seedIfNeeded } from '../src/db/connection.js';
import { storageContext } from '../src/db/context.js';
import { getLocalStore } from '../src/db/local_kv.js';
import XLSX from 'xlsx';
import { getAdminCookie } from './helpers.js';

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

      console.log("\n--- Running Review & Resolution API Tests ---");

      // Login admin to get auth cookie
      const adminCookie = await getAdminCookie(app);

      // Helper: Import a sheet containing:
      // 1. One normal order with an ambiguous name (will need confirm-split)
      // 2. One cancelled order (will need resolution review)
      console.log("Seeding test import session...");
      const sheetData = [
        {
          "No. Pesanan": "ORD-REV-100",
          "Nama Produk": "Korek Api Super Misterius", // split unmapped
          "Jumlah": 1,
          "Status Pesanan": "Selesai" // normal status
        },
        {
          "No. Pesanan": "ORD-REV-200",
          "Nama Produk": "Korek Api Model B", // direct match
          "Jumlah": 3,
          "Status Pesanan": "Batal", // cancelled, needs review
          "Nomor Referensi SKU": "Model B"
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const formData = new FormData();
      const file = new File([excelBuffer], 'review_sales.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      formData.append('file', file);
      formData.append('template_id', '1'); // Shopee template ID is 1

      const uploadRes = await app.request('/api/import/upload', {
        method: 'POST',
        headers: { 'Cookie': adminCookie },
        body: formData
      });
      const preview = await uploadRes.json();

      // Confirm it
      await app.request('/api/import/confirm', {
        method: 'POST',
        headers: { 
          'Cookie': adminCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: preview.session_id,
          orders: preview.orders
        })
      });

      // --- Start tests ---

      // 1. Get Flagged Orders Needing Review
      console.log("Testing GET /api/review/orders...");
      const resOrders = await app.request('/api/review/orders', {
        headers: { 'Cookie': adminCookie }
      });
      if (resOrders.status !== 200) {
        throw new Error("Failed fetching review orders");
      }
      const reviewOrders = await resOrders.json();
      console.log("Orders needing review count:", reviewOrders.length);
      const targetOrder = reviewOrders.find(o => o.order_id === 'ORD-REV-200');
      if (!targetOrder) {
        throw new Error("Expected ORD-REV-200 to be found needing review");
      }

      // 2. Get Ambiguous Items Awaiting Mapping
      console.log("\nTesting GET /api/review/ambiguous...");
      const resAmbiguous = await app.request('/api/review/ambiguous', {
        headers: { 'Cookie': adminCookie }
      });
      if (resAmbiguous.status !== 200) {
        throw new Error("Failed fetching ambiguous items");
      }
      const ambiguousItems = await resAmbiguous.json();
      console.log("Ambiguous items awaiting mapping count:", ambiguousItems.length);
      const targetItem = ambiguousItems.find(i => i.order_id === 'ORD-REV-100');
      if (!targetItem) {
        throw new Error("Expected ORD-REV-100 item to be found awaiting mapping");
      }
      
      // Model A Initial Stock: check current value
      const initialProdA = await db.products.get(1);
      console.log("Model A initial stock before confirm split:", initialProdA.current_stock);

      // We map it to Model A (product_id: 1) with quantity: 5
      const resConfirmSplit = await app.request('/api/review/confirm-split', {
        method: 'POST',
        headers: { 
          'Cookie': adminCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          item_id: targetItem.id,
          product_id: 1, // Model A
          quantity: 5
        })
      });

      if (resConfirmSplit.status !== 200) {
        const err = await resConfirmSplit.json();
        throw new Error(`Confirm split failed: ${JSON.stringify(err)}`);
      }

      // Verify DB update
      const updatedItem = await db.orderItems.get(targetItem.id);
      console.log("Mapped item status is_confirmed:", updatedItem.is_confirmed);
      if (updatedItem.is_confirmed !== 1 || updatedItem.product_id !== 1 || updatedItem.quantity !== 5) {
        throw new Error("Item mapping values in DB incorrect");
      }

      // Verify stock deduction (Model A stock should decrease by 5)
      const prodA = await db.products.get(1);
      console.log("Model A stock after confirm split:", prodA.current_stock);
      if (prodA.current_stock !== initialProdA.current_stock - 5) {
        throw new Error("Model A stock deduction check failed");
      }

      // 4. Resolve Flagged Cancelled Order as 'returned'
      // Model B Initial Stock: check current value
      const initialProdB = await db.products.get(2);
      console.log("Model B initial stock before returned resolution:", initialProdB.current_stock);

      // ORD-REV-200: Model B qty 3, Batal.
      // If returned -> stock should remain the same (since it was never deducted).
      const resResolveReturned = await app.request('/api/review/resolve', {
        method: 'POST',
        headers: { 
          'Cookie': adminCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          order_id: targetOrder.id,
          resolution: 'returned',
          resolution_notes: 'Package arrived back intact'
        })
      });

      if (resResolveReturned.status !== 200) {
        throw new Error("Failed to resolve order as returned");
      }

      const resolvedOrder = await db.orders.get(targetOrder.id);
      console.log("Resolved order system_status:", resolvedOrder.system_status, "resolution:", resolvedOrder.resolution);
      if (resolvedOrder.system_status !== 'resolved' || resolvedOrder.resolution !== 'returned') {
        throw new Error("Order resolution fields in DB mismatch");
      }

      const prodB = await db.products.get(2);
      console.log("Model B stock after returned resolution:", prodB.current_stock);
      if (prodB.current_stock !== initialProdB.current_stock) {
        throw new Error("Model B stock should remain unchanged");
      }

      // 5. Test Resolve Cancelled Order as 'lost'
      // Let's import another cancelled order to test the lost resolution path
      console.log("\nTesting POST /api/review/resolve (Lost)...");
      const testLostSheet = [
        {
          "No. Pesanan": "ORD-REV-300",
          "Nama Produk": "Korek Api Model B",
          "Jumlah": 4,
          "Status Pesanan": "Batal",
          "Nomor Referensi SKU": "Model B"
        }
      ];
      const worksheetLost = XLSX.utils.json_to_sheet(testLostSheet);
      const workbookLost = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbookLost, worksheetLost, "Sheet1");
      const excelBufferLost = XLSX.write(workbookLost, { type: 'buffer', bookType: 'xlsx' });
      
      const formDataLost = new FormData();
      formDataLost.append('file', new File([excelBufferLost], 'lost_sales.xlsx'));
      formDataLost.append('template_id', '1');
      const uploadLost = await app.request('/api/import/upload', {
        method: 'POST',
        headers: { 'Cookie': adminCookie },
        body: formDataLost
      });
      const previewLost = await uploadLost.json();
      
      await app.request('/api/import/confirm', {
        method: 'POST',
        headers: { 'Cookie': adminCookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: previewLost.session_id, orders: previewLost.orders })
      });

      const lostOrderRecord = await db.orders.getByOrderId('ORD-REV-300');

      // Query Model B stock before lost resolution
      const preLostProdB = await db.products.get(2);
      console.log("Model B stock before lost resolution:", preLostProdB.current_stock);

      // Resolve as lost -> Model B should be deducted by 4
      const resResolveLost = await app.request('/api/review/resolve', {
        method: 'POST',
        headers: { 
          'Cookie': adminCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          order_id: lostOrderRecord.id,
          resolution: 'lost',
          resolution_notes: 'Lost in J&T sorting hub'
        })
      });

      if (resResolveLost.status !== 200) {
        throw new Error("Failed to resolve order as lost");
      }

      const prodBLost = await db.products.get(2);
      console.log("Model B stock after lost resolution:", prodBLost.current_stock);
      if (prodBLost.current_stock !== preLostProdB.current_stock - 4) {
        throw new Error("Model B stock should be deducted by 4");
      }

      // Verify stock movements logged write-off (should be the last one logged for this product)
      const list = (await db.movements.list()).filter(m => m.product_id === 2 && m.movement_type === 'write_off');
      list.sort((a, b) => b.id - a.id);
      const lostMovement = list[0];
      console.log("Lost stock movement change logged:", lostMovement.quantity_change);
      if (lostMovement.quantity_change !== -4) {
        throw new Error("Expected -4 write-off stock movement to be logged");
      }

      console.log("\nAll Review & Resolution API tests passed successfully!");
      process.exit(0);
    } catch (err) {
      console.error("\nReview & Resolution API test failed:", err);
      process.exit(1);
    }
  });
}

runTests();
