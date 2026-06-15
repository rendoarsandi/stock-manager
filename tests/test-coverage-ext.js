import app from '../src/index.js';
import { initDatabase, db, seedIfNeeded } from '../src/db/connection.js';
import { storageContext } from '../src/db/context.js';
import { getLocalStore } from '../src/db/local_kv.js';
import { getAdminCookie, getStaffCookie } from './helpers.js';
import crypto from 'crypto';

process.env.NODE_ENV = 'test';

function generateSvixHeaders(payloadString, secret) {
  const svixId = 'msg_' + crypto.randomBytes(8).toString('hex');
  const svixTimestamp = Math.floor(Date.now() / 1000).toString();
  const toSign = `${svixId}.${svixTimestamp}.${payloadString}`;
  
  const secretKey = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  const secretBytes = Buffer.from(secretKey, 'base64');
  
  const hmac = crypto.createHmac('sha256', secretBytes);
  hmac.update(toSign);
  const signature = hmac.digest('base64');
  
  return {
    'svix-id': svixId,
    'svix-timestamp': svixTimestamp,
    'svix-signature': `v1,${signature}`
  };
}

async function runTests() {
  const store = {
    type: 'local',
    storage: getLocalStore()
  };

  await storageContext.run(store, async () => {
    try {
      await initDatabase();
      await seedIfNeeded(store.storage);

      console.log("\n--- Running Extended Coverage Tests ---");

      const adminCookie = await getAdminCookie(app);
      const staffCookie = await getStaffCookie(app);

      // ==========================================
      // 1. Clerk Webhook Signature Validation Tests
      // ==========================================
      console.log("\n1. Testing Clerk Webhook Signatures...");
      const webhookSecret = 'whsec_dGVzdF9zZWNyZXRfd2ViaG9va19zaWduYXR1cmVfa2V5XzEyMw=='; // test_secret_webhook_signature_key_123
      process.env.CLERK_WEBHOOK_SECRET = webhookSecret;

      const payload = {
        type: 'user.created',
        data: {
          id: 'clerk_test_id_999',
          username: 'webhook_clerk_user',
          first_name: 'Clerk',
          last_name: 'User',
          email_addresses: [{ email_address: 'clerk@example.com' }]
        }
      };
      const payloadStr = JSON.stringify(payload);

      // 1a. Missing Headers (Expect 401)
      const resWebhookNoHeaders = await app.request('/api/auth/clerk-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payloadStr
      });
      console.log("No headers status:", resWebhookNoHeaders.status);
      if (resWebhookNoHeaders.status !== 401) {
        throw new Error(`Expected 401 for missing signature headers, got ${resWebhookNoHeaders.status}`);
      }

      // 1b. Invalid Signature (Expect 401)
      const resWebhookBadSignature = await app.request('/api/auth/clerk-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'svix-id': 'msg_bad',
          'svix-timestamp': '12345',
          'svix-signature': 'v1,invalid_signature_hash'
        },
        body: payloadStr
      });
      console.log("Bad signature status:", resWebhookBadSignature.status);
      if (resWebhookBadSignature.status !== 401) {
        throw new Error(`Expected 401 for bad signature, got ${resWebhookBadSignature.status}`);
      }

      // 1c. Valid Signature (Expect 200)
      const svixHeaders = generateSvixHeaders(payloadStr, webhookSecret);
      const resWebhookSuccess = await app.request('/api/auth/clerk-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...svixHeaders
        },
        body: payloadStr
      });
      console.log("Valid signature status:", resWebhookSuccess.status);
      if (resWebhookSuccess.status !== 200) {
        const errText = await resWebhookSuccess.text();
        throw new Error(`Expected 200 for valid webhook, got ${resWebhookSuccess.status}. Error: ${errText}`);
      }

      // Verify user was inserted in DB
      const insertedUsers = await store.storage.query("SELECT * FROM users WHERE password_hash = ?", ['clerk_test_id_999']);
      console.log("Inserted user count in DB:", insertedUsers.length);
      if (insertedUsers.length !== 1 || insertedUsers[0].username !== 'webhook_clerk_user') {
        throw new Error("Clerk user failed to register via webhook");
      }

      // ==========================================
      // 2. Individual Product Ledger Route Tests
      // ==========================================
      console.log("\n2. Testing /api/products/:id/ledger...");
      // Let's get the first product id
      const products = await db.products.list();
      if (products.length === 0) {
        throw new Error("No products available to test ledger");
      }
      const productId = products[0].id;

      const resLedger = await app.request(`/api/products/${productId}/ledger`, {
        headers: { 'Cookie': adminCookie }
      });
      console.log("GET product ledger status:", resLedger.status);
      if (resLedger.status !== 200) {
        throw new Error(`Expected 200 for product ledger, got ${resLedger.status}`);
      }
      const ledgerData = await resLedger.json();
      console.log(`Product ${productId} ledger count:`, ledgerData.length);
      if (!Array.isArray(ledgerData)) {
        throw new Error("Expected array response for product ledger");
      }

      // ==========================================
      // 3. Import Active Session Cancel, Fetch, Sync Tests
      // ==========================================
      console.log("\n3. Testing Import Session endpoints...");
      
      // 3a. Create a dummy import session for testing
      const testSession = await db.sessions.insert({
        status: 'previewing',
        filename: 'test_import.xlsx',
        user_id: 1,
        total_rows: 5,
        flagged_rows: 0,
        orders_data: JSON.stringify([{ order_id: 'ORDER_123', items: [] }])
      });
      const sessionId = testSession.id;

      // 3b. Fetch active session
      const resActive = await app.request('/api/import/active-session', {
        headers: { 'Cookie': adminCookie }
      });
      console.log("GET /api/import/active-session status:", resActive.status);
      if (resActive.status !== 200) {
        throw new Error(`Expected 200 for active-session, got ${resActive.status}`);
      }
      const activeSessionData = await resActive.json();
      if (activeSessionData.session_id !== sessionId) {
        throw new Error("Active session ID mismatch");
      }

      // 3c. Sync active session
      const resSync = await app.request('/api/import/active-session/sync', {
        method: 'POST',
        headers: {
          'Cookie': adminCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: sessionId,
          orders: [{ order_id: 'ORDER_123', items: [] }]
        })
      });
      console.log("POST /api/import/active-session/sync status:", resSync.status);
      if (resSync.status !== 200) {
        throw new Error(`Expected 200 for sync active-session, got ${resSync.status}`);
      }

      // 3d. Cancel import session
      const resCancel = await app.request('/api/import/cancel', {
        method: 'POST',
        headers: {
          'Cookie': adminCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ session_id: sessionId })
      });
      console.log("POST /api/import/cancel status:", resCancel.status);
      if (resCancel.status !== 200) {
        throw new Error(`Expected 200 for cancel, got ${resCancel.status}`);
      }

      // ==========================================
      // 4. Historical Import Sessions List Tests
      // ==========================================
      console.log("\n4. Testing /api/import/sessions...");
      const resSessionsList = await app.request('/api/import/sessions', {
        headers: { 'Cookie': adminCookie }
      });
      console.log("GET /api/import/sessions status:", resSessionsList.status);
      if (resSessionsList.status !== 200) {
        throw new Error(`Expected 200 for sessions list, got ${resSessionsList.status}`);
      }
      const sessionsData = await resSessionsList.json();
      if (!Array.isArray(sessionsData)) {
        throw new Error("Expected array of historical import sessions");
      }

      // ==========================================
      // 5. SKU Mappings CRUD Endpoints Tests
      // ==========================================
      console.log("\n5. Testing /api/import/sku-mappings CRUD...");
      
      // 5a. GET SKU mappings
      const resSkuList = await app.request('/api/import/sku-mappings', {
        headers: { 'Cookie': adminCookie }
      });
      console.log("GET /api/import/sku-mappings status:", resSkuList.status);
      if (resSkuList.status !== 200) {
        throw new Error(`Expected 200 for mappings list, got ${resSkuList.status}`);
      }
      const mappingsData = await resSkuList.json();
      const initialLength = mappingsData.length;

      // 5b. POST create SKU mapping
      const mappingPayload = {
        sku_code: 'TEST_SKU_CODE_123',
        product_id: productId,
        quantity: 1
      };
      const resSkuPost = await app.request('/api/import/sku-mappings', {
        method: 'POST',
        headers: {
          'Cookie': adminCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mappingPayload)
      });
      console.log("POST /api/import/sku-mappings status:", resSkuPost.status);
      if (resSkuPost.status !== 200) {
        const errText = await resSkuPost.text();
        throw new Error(`Expected 200 for mapping creation, got ${resSkuPost.status}. Error: ${errText}`);
      }

      // Verify added
      const resSkuListNew = await app.request('/api/import/sku-mappings', {
        headers: { 'Cookie': adminCookie }
      });
      const mappingsDataNew = await resSkuListNew.json();
      if (mappingsDataNew.length !== initialLength + 1) {
        throw new Error("SKU mapping creation was not saved");
      }

      // 5c. DELETE SKU mapping
      const resSkuDelete = await app.request('/api/import/sku-mappings', {
        method: 'DELETE',
        headers: {
          'Cookie': adminCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sku_code: 'TEST_SKU_CODE_123',
          product_id: productId
        })
      });
      console.log("DELETE /api/import/sku-mappings status:", resSkuDelete.status);
      if (resSkuDelete.status !== 200) {
        throw new Error(`Expected 200 for mapping deletion, got ${resSkuDelete.status}`);
      }

      // Verify deleted
      const resSkuListFinal = await app.request('/api/import/sku-mappings', {
        headers: { 'Cookie': adminCookie }
      });
      const mappingsDataFinal = await resSkuListFinal.json();
      if (mappingsDataFinal.length !== initialLength) {
        throw new Error("SKU mapping was not successfully deleted");
      }

      // ==========================================
      // 6. Global Stock History Endpoint Tests
      // ==========================================
      console.log("\n6. Testing /api/stock/history...");
      const resStockHistory = await app.request('/api/stock/history', {
        headers: { 'Cookie': adminCookie }
      });
      console.log("GET /api/stock/history status:", resStockHistory.status);
      if (resStockHistory.status !== 200) {
        throw new Error(`Expected 200 for stock history, got ${resStockHistory.status}`);
      }
      const historyData = await resStockHistory.json();
      if (!Array.isArray(historyData)) {
        throw new Error("Expected array of stock history movements");
      }

      console.log("\n✅ All Extended Coverage Tests passed successfully!");
      process.exit(0);
    } catch (err) {
      console.error("\n❌ Extended Coverage Test failed:", err);
      process.exit(1);
    }
  });
}

runTests();
