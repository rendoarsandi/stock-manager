import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';
import { createSyncedCollection, dispatchTanStackDbDelta } from '../app/lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcWorkerPath = path.resolve(__dirname, '../src/worker.js');
const tempWorkerPath = path.resolve(__dirname, '../src/scratch_worker_sync_mock.js');

console.log("Preparing worker.js mock for testing TanStack DB sync...");
const originalCode = fs.readFileSync(srcWorkerPath, 'utf8');

// Replace cloudflare:workers import with a dummy base class for local testing
const mockedCode = originalCode.replace(
  "import { DurableObject } from 'cloudflare:workers';",
  "class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }"
);

fs.writeFileSync(tempWorkerPath, mockedCode);

async function runTests() {
  console.log("\n========================================");
  console.log("Running TanStack DB & Delta Sync Tests");
  console.log("========================================");

  try {
    const { StockRoom } = await import('../src/scratch_worker_sync_mock.js');

    class MockWebSocket {
      constructor(id) {
        this.id = id;
        this.sent = [];
        this.userId = null;
        this.attachment = { subscriptions: [] };
      }
      send(payload) {
        this.sent.push(typeof payload === 'string' ? JSON.parse(payload) : payload);
      }
    }

    const wsSubscribed = new MockWebSocket('client-sub');
    wsSubscribed.userId = 1;
    wsSubscribed.attachment = { userId: 1, subscriptions: ['products'] };

    const wsUnsubscribed = new MockWebSocket('client-unsub');
    wsUnsubscribed.userId = 2;
    wsUnsubscribed.attachment = { userId: 2, subscriptions: ['orders'] };

    const websockets = [wsSubscribed, wsUnsubscribed];

    const mockCtx = {
      storage: {
        sql: {
          exec: () => ({ one: () => ({ name: 'users' }), toArray: () => [] })
        }
      },
      getWebSockets: () => websockets,
      getWebSocketAttachment: (ws) => ws.attachment,
      setWebSocketAttachment: (ws, att) => { ws.attachment = att; },
      setWebSocketAutoResponse: () => {}
    };

    const mockEnv = { JWT_SECRET: 'test_jwt_secret' };
    const stockRoom = new StockRoom(mockCtx, mockEnv);

    // Test 1: Sequence Tracking & Invalidate Broadcast
    console.log("\n1. Testing DO sequence number and invalidate broadcast...");
    stockRoom.notifyTableChange(['products']);
    assert.strictEqual(stockRoom.syncSequence, 1, "Sync sequence should increment to 1");
    assert.strictEqual(wsSubscribed.sent.length, 1, "Subscribed client should receive 1 message");
    assert.strictEqual(wsSubscribed.sent[0].type, "INVALIDATE");
    assert.strictEqual(wsSubscribed.sent[0].sequenceId, 1);
    assert.strictEqual(wsUnsubscribed.sent.length, 0, "Unsubscribed client should receive 0 messages");
    console.log("✅ Sequence increment & subscription filtering passed.");

    // Test 2: Delta Message Delivery
    console.log("\n2. Testing DELTA message broadcasting...");
    stockRoom.notifyTableChange(['products'], {
      table: 'products',
      action: 'INSERT',
      row: { id: 101, name: 'Reactive Item', stock: 45 },
      primaryKey: 101
    });

    assert.strictEqual(stockRoom.syncSequence, 2, "Sync sequence should increment to 2");
    // Subscribed WS gets both INVALIDATE and DELTA
    const subMessages = wsSubscribed.sent.slice(1);
    assert.strictEqual(subMessages.length, 2, "Subscribed client should receive INVALIDATE and DELTA");
    assert.strictEqual(subMessages[0].type, "INVALIDATE");
    assert.strictEqual(subMessages[1].type, "DELTA");
    assert.strictEqual(subMessages[1].action, "INSERT");
    assert.strictEqual(subMessages[1].row.name, "Reactive Item");
    assert.strictEqual(subMessages[1].sequenceId, 2);
    console.log("✅ Delta message formatting & broadcasting passed.");

    // Test 3: RESYNC Handling
    console.log("\n3. Testing RESYNC command handling...");
    wsSubscribed.sent = [];
    stockRoom.webSocketMessage(wsSubscribed, JSON.stringify({
      type: "RESYNC",
      sinceSequenceId: 1
    }));

    assert.strictEqual(wsSubscribed.sent.length, 1, "Client should receive RESYNC_ACK");
    assert.strictEqual(wsSubscribed.sent[0].type, "RESYNC_ACK");
    assert.strictEqual(wsSubscribed.sent[0].currentSequenceId, 2);
    assert.strictEqual(wsSubscribed.sent[0].sinceSequenceId, 1);
    console.log("✅ RESYNC response passed.");

    // Test 4: Hibernation Attachment Resilience
    console.log("\n4. Testing DO Hibernation attachment resilience...");
    const hibernatingWs = new MockWebSocket('hibernating-client');
    hibernatingWs.userId = undefined; // Simulates hibernation instance property wipe
    hibernatingWs.attachment = { userId: 42, subscriptions: ['products'] };

    const authenticatedId = stockRoom.getAuthenticatedUserId(hibernatingWs);
    assert.strictEqual(authenticatedId, 42, "Should recover user ID from attachment after hibernation");
    console.log("✅ Hibernation attachment recovery passed.");

    // Test 5: Handshake Cookie Auth
    console.log("\n5. Testing WebSocket handshake auth & default subscriptions...");
    globalThis.WebSocketPair = class {
      constructor() {
        return [new MockWebSocket('client-pair-0'), new MockWebSocket('client-pair-1')];
      }
    };
    const acceptedSockets = [];
    mockCtx.acceptWebSocket = (ws) => { acceptedSockets.push(ws); };

    const OriginalResponse = globalThis.Response;
    globalThis.Response = class MockResponse extends OriginalResponse {
      constructor(body, init) {
        if (init && init.status === 101) {
          super(body, { ...init, status: 200 });
          Object.defineProperty(this, 'status', { value: 101, writable: false });
        } else {
          super(body, init);
        }
      }
    };

    const handshakeReq = {
      headers: {
        get: (h) => (h.toLowerCase() === "upgrade" ? "websocket" : (h.toLowerCase() === "cookie" ? "session=test_val" : null))
      }
    };
    let handshakeRes;
    try {
      handshakeRes = await stockRoom.fetch(handshakeReq);
    } finally {
      globalThis.Response = OriginalResponse;
    }

    assert.strictEqual(handshakeRes.status, 101, "Handshake should return status 101");
    assert.strictEqual(acceptedSockets.length, 1, "WebSocket should be accepted");
    assert.ok(acceptedSockets[0].attachment.subscriptions.includes('products'), "Should auto-subscribe to tables");
    console.log("✅ WebSocket handshake auth and default subscriptions passed.");

    // Test 6: Client-Side TanStack DB Reactive Collection Sync
    console.log("\n6. Testing Client TanStack DB Collection mutations & reactivity...");
    const testCollection = createSyncedCollection({
      id: 'test_products',
      getKey: (item) => item.id
    });

    // Start sync
    testCollection.preload?.();

    // Mock global window event dispatch
    globalThis.window = {
      listeners: {},
      addEventListener(type, fn) {
        if (!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].push(fn);
      },
      removeEventListener(type, fn) {
        if (this.listeners[type]) {
          this.listeners[type] = this.listeners[type].filter(l => l !== fn);
        }
      },
      dispatchEvent(event) {
        if (this.listeners[event.type]) {
          this.listeners[event.type].forEach(fn => fn(event));
        }
      }
    };

    // Re-create collection with window mock active
    const syncedCol = createSyncedCollection({
      id: 'test_products',
      getKey: (item) => item.id
    });
    syncedCol.preload?.();

    // Apply INSERT delta
    dispatchTanStackDbDelta({
      table: 'test_products',
      action: 'INSERT',
      row: { id: 201, name: 'Live Product', stock: 100 }
    });

    assert.strictEqual(syncedCol.size, 1, "Collection size should be 1 after INSERT");
    const item = syncedCol.get(201);
    assert.strictEqual(item.name, "Live Product");
    assert.strictEqual(item.stock, 100);

    // Apply UPDATE delta
    dispatchTanStackDbDelta({
      table: 'test_products',
      action: 'UPDATE',
      row: { id: 201, name: 'Live Product Updated', stock: 95 }
    });

    const updatedItem = syncedCol.get(201);
    assert.strictEqual(updatedItem.name, "Live Product Updated");
    assert.strictEqual(updatedItem.stock, 95);

    // Apply DELETE delta
    dispatchTanStackDbDelta({
      table: 'test_products',
      action: 'DELETE',
      primaryKey: 201
    });

    assert.strictEqual(syncedCol.size, 0, "Collection size should be 0 after DELETE");
    console.log("✅ TanStack DB client collection CRUD via deltas passed.");

    console.log("\n========================================");
    console.log("🎉 All TanStack DB & Sync tests passed successfully!");
    console.log("========================================\n");
  } finally {
    if (fs.existsSync(tempWorkerPath)) {
      fs.unlinkSync(tempWorkerPath);
    }
  }
}

runTests().catch((err) => {
  console.error("Test failure:", err);
  if (fs.existsSync(tempWorkerPath)) {
    fs.unlinkSync(tempWorkerPath);
  }
  process.exit(1);
});
