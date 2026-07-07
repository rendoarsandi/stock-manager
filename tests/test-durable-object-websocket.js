import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to create mocked worker file
const srcWorkerPath = path.resolve(__dirname, '../src/worker.js');
const tempWorkerPath = path.resolve(__dirname, '../src/scratch_worker_mock.js');

console.log("Preparing worker.js mock for testing in Node.js...");
const originalCode = fs.readFileSync(srcWorkerPath, 'utf8');

// Replace cloudflare:workers import with a dummy base class
const mockedCode = originalCode.replace(
  "import { DurableObject } from 'cloudflare:workers';",
  "class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }"
);

fs.writeFileSync(tempWorkerPath, mockedCode);

async function runTests() {
  console.log("\n--- Running Durable Object WebSocket Security Tests ---");

  try {
    const { StockRoom } = await import('../src/scratch_worker_mock.js');

    // Mock SQL DB interface
    const mockSql = {
      exec: (sql) => {
        if (sql.includes("last_insert_rowid()")) {
          return {
            one: () => ({ id: 42 })
          };
        }
        if (sql.includes("sqlite_master")) {
          return {
            one: () => ({ name: 'users' })
          };
        }
        return {
          toArray: () => [],
          raw: () => ({ toArray: () => [] }),
          one: () => null
        };
      }
    };

    class MockWebSocket {
      constructor(id) {
        this.id = id;
        this.sent = [];
        this.userId = null;
        this.attachment = null;
      }
      send(payload) {
        this.sent.push(payload);
      }
    }

    const websockets = [
      new MockWebSocket('client-A'), // sender (userId = 1)
      new MockWebSocket('client-B'), // receiver (userId = 2)
      new MockWebSocket('client-C'), // bystander (userId = 3)
      new MockWebSocket('client-D')  // unidentified
    ];

    const mockCtx = {
      storage: {
        sql: mockSql,
        transactionSync: (fn) => fn()
      },
      websockets,
      getWebSockets() {
        return this.websockets;
      },
      setWebSocketAttachment(ws, data) {
        ws.attachment = data;
      },
      getWebSocketAttachment(ws) {
        return ws.attachment;
      }
    };

    const mockEnv = {};

    // Instantiate StockRoom Durable Object
    const stockRoom = new StockRoom(mockCtx, mockEnv);

    // 1. Identify A, B, and C
    stockRoom.webSocketMessage(websockets[0], JSON.stringify({ type: 'IDENTIFY', userId: 1 }));
    stockRoom.webSocketMessage(websockets[1], JSON.stringify({ type: 'IDENTIFY', userId: 2 }));
    stockRoom.webSocketMessage(websockets[2], JSON.stringify({ type: 'IDENTIFY', userId: 3 }));

    // Verify identifier bindings are successfully attached to the sockets
    assert.strictEqual(websockets[0].userId, 1);
    assert.strictEqual(websockets[1].userId, 2);
    assert.strictEqual(websockets[2].userId, 3);
    assert.strictEqual(websockets[3].userId, null);
    
    assert.deepStrictEqual(mockCtx.getWebSocketAttachment(websockets[0]), { userId: 1 });
    assert.deepStrictEqual(mockCtx.getWebSocketAttachment(websockets[1]), { userId: 2 });
    assert.deepStrictEqual(mockCtx.getWebSocketAttachment(websockets[2]), { userId: 3 });

    console.log("✅ IDENTIFY message parsing and connection state storage verified.");

    // Clear sent buffers
    websockets.forEach(ws => ws.sent = []);

    // 2. Test Broadcast of general product updates (all identified & unidentified receive it)
    const productPayload = JSON.stringify({ type: 'PRODUCT_CREATED', payload: { id: 101, name: 'Product X' } });
    stockRoom.broadcast(productPayload);

    assert.strictEqual(websockets[0].sent[0], productPayload);
    assert.strictEqual(websockets[1].sent[0], productPayload);
    assert.strictEqual(websockets[2].sent[0], productPayload);
    assert.strictEqual(websockets[3].sent[0], productPayload);

    console.log("✅ Public product broadcasts received by all clients verified.");

    // Clear sent buffers
    websockets.forEach(ws => ws.sent = []);

    // 3. Test Broadcast of private chat message (from 1 to 2)
    const chatPayload = JSON.stringify({
      type: 'CHAT_MESSAGE',
      sender_id: 1,
      receiver_id: 2,
      message: 'Secret trade deal'
    });

    // Exclude sender (Client A) from receiving its own message
    stockRoom.broadcast(chatPayload, websockets[0]);

    // Client B (receiver) should get the message
    assert.ok(websockets[1].sent.includes(chatPayload), "Client B should receive the chat message");
    
    // Client A (sender) was excluded, so should be empty
    assert.strictEqual(websockets[0].sent.length, 0);

    // Client C (bystander) must NOT receive it
    assert.ok(!websockets[2].sent.includes(chatPayload), "Client C must NOT receive the chat message");
    
    // Client D (unidentified) must NOT receive it
    assert.ok(!websockets[3].sent.includes(chatPayload), "Client D must NOT receive the chat message");

    console.log("✅ Private chat filtering verified: no leaks to bystander or unidentified connections.");

    // 3.5 Test Table-based Subscriptions
    // Reset sent buffers
    websockets.forEach(ws => ws.sent = []);

    // Subscribe Client A (index 0) to 'products' and 'orders'
    stockRoom.webSocketMessage(websockets[0], JSON.stringify({ type: 'SUBSCRIBE', tables: ['products', 'orders'] }));
    // Subscribe Client B (index 1) to 'orders' and 'stock_movements'
    stockRoom.webSocketMessage(websockets[1], JSON.stringify({ type: 'SUBSCRIBE', tables: ['orders', 'stock_movements'] }));

    // Verify subscription attachments are stored correctly
    assert.deepStrictEqual(mockCtx.getWebSocketAttachment(websockets[0]).subscriptions, ['products', 'orders']);
    assert.deepStrictEqual(mockCtx.getWebSocketAttachment(websockets[1]).subscriptions, ['orders', 'stock_movements']);

    // Clear sent buffers from subscription confirmations (they don't send individual replies)
    websockets.forEach(ws => ws.sent = []);

    // Trigger an execute that modifies 'products'
    stockRoom.execute("INSERT INTO products (id, name) VALUES (12, 'Amazing Product')");

    // Client A should receive INVALIDATE message for products
    const clientAProductsMsg = websockets[0].sent.find(msg => {
      try {
        const parsed = JSON.parse(msg);
        return parsed.type === 'INVALIDATE' && parsed.tables.includes('products');
      } catch (e) { return false; }
    });
    assert.ok(clientAProductsMsg, "Client A should receive products invalidation");

    // Client B should NOT receive anything (not subscribed to products)
    assert.strictEqual(websockets[1].sent.length, 0, "Client B should not receive product invalidation");

    // Clear sent buffers
    websockets.forEach(ws => ws.sent = []);

    // Trigger an executeTransaction modifying 'orders' and 'stock_movements'
    const txResults = stockRoom.executeTransaction([
      { sql: "UPDATE orders SET status = 'completed' WHERE id = 1" },
      { sql: "INSERT INTO stock_movements (product_id, quantity) VALUES (1, -5)" }
    ]);

    // Assert that transaction results return the valid lastInsertRowid
    assert.deepStrictEqual(txResults, [
      { lastInsertRowid: 42 },
      { lastInsertRowid: 42 }
    ]);

    // Client A should receive invalidation containing 'orders'
    const clientAOrdersMsg = websockets[0].sent.find(msg => {
      try {
        const parsed = JSON.parse(msg);
        return parsed.type === 'INVALIDATE' && parsed.tables.includes('orders');
      } catch (e) { return false; }
    });
    assert.ok(clientAOrdersMsg, "Client A should receive orders invalidation");

    // Client B should receive invalidation containing both 'orders' and 'stock_movements'
    const clientBOrdersMsg = websockets[1].sent.find(msg => {
      try {
        const parsed = JSON.parse(msg);
        return parsed.type === 'INVALIDATE' && (parsed.tables.includes('orders') || parsed.tables.includes('stock_movements'));
      } catch (e) { return false; }
    });
    assert.ok(clientBOrdersMsg, "Client B should receive orders/movements invalidation");

    // Clear sent buffers
    websockets.forEach(ws => ws.sent = []);

    // Test UNSUBSCRIBE: Unsubscribe Client A from 'products'
    stockRoom.webSocketMessage(websockets[0], JSON.stringify({ type: 'UNSUBSCRIBE', tables: ['products'] }));
    assert.deepStrictEqual(mockCtx.getWebSocketAttachment(websockets[0]).subscriptions, ['orders']);

    // Trigger update on 'products' again
    stockRoom.execute("UPDATE products SET price = 99 WHERE id = 12");

    // Client A should NOT receive invalidation for products anymore
    assert.strictEqual(websockets[0].sent.length, 0, "Client A should not receive products invalidation after unsubscribing");

    console.log("✅ Real-time table subscription, invalidation, and unsubscription logic verified.");

    // 3.6 Test Chat Spoofing and Unauthenticated Actions Protection
    // Clear sent buffers
    websockets.forEach(ws => ws.sent = []);

    // Authenticated Client A (userId = 1) tries to send a spoofed message pretending to be Client B (sender_id = 2)
    const spoofedChat = JSON.stringify({
      type: 'CHAT_MESSAGE',
      sender_id: 2, // Spoofed! A is authenticated as 1
      receiver_id: 3,
      message: 'Impersonation attempt'
    });

    stockRoom.webSocketMessage(websockets[0], spoofedChat);

    // Verify that the message was dropped and NOT broadcasted to any client
    assert.strictEqual(websockets[1].sent.length, 0, "Spoofed chat message must not be broadcasted to Client B");
    assert.strictEqual(websockets[2].sent.length, 0, "Spoofed chat message must not be broadcasted to Client C");

    // Unauthenticated Client D (unidentified) tries to subscribe to products
    const mockUnauthWs = new MockWebSocket('client-unauth');
    stockRoom.webSocketMessage(mockUnauthWs, JSON.stringify({ type: 'SUBSCRIBE', tables: ['products'] }));
    
    // Verify unauthenticated subscriptions are rejected
    assert.ok(!mockUnauthWs.attachment?.subscriptions, "Unauthenticated connection must not have subscriptions registered");

    console.log("✅ Chat spoofing and unauthenticated subscription blocking verified.");

    // 4. Test WebSocket handshake in fetch()
    let acceptCalled = false;
    const mockState = {
      storage: {
        sql: mockSql,
        transactionSync: (fn) => fn()
      },
      websockets: [...websockets],
      getWebSockets() {
        return this.websockets;
      },
      setWebSocketAttachment(ws, data) {
        ws.attachment = data;
      },
      getWebSocketAttachment(ws) {
        return ws.attachment;
      },
      acceptWebSocket(ws) {
        acceptCalled = true;
        this.websockets.push(ws);
      }
    };
    
    // Clear sent buffers
    websockets.forEach(ws => ws.sent = []);
    
    const stockRoomForFetch = new StockRoom(mockState, mockEnv);
    
    // Mock WebSocketPair global
    globalThis.WebSocketPair = class {
      constructor() {
        return [new MockWebSocket('client-new-pair-0'), new MockWebSocket('client-new-pair-1')];
      }
    };

    // Mock Response global to allow status 101 in Node.js testing environment
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
        get(name) {
          if (name.toLowerCase() === 'upgrade') return 'websocket';
          return null;
        }
      }
    };
    
    let response;
    try {
      response = await stockRoomForFetch.fetch(handshakeReq);
    } finally {
      // Restore original Response global immediately
      globalThis.Response = OriginalResponse;
    }
    
    assert.strictEqual(response.status, 101);
    assert.ok(acceptCalled, "acceptWebSocket should be called during handshake");
    
    // Verify that broadcastOnlineCount was triggered and sent the new count to the new socket
    const lastSocket = mockState.websockets[mockState.websockets.length - 1];
    assert.ok(lastSocket.sent.some(msg => msg.includes('"type":"ONLINE_COUNT"')), "Should broadcast online count on connection open");
    console.log("✅ WebSocket handshake and connection open broadcast verified.");

    console.log("✅ All Durable Object WebSocket security checks passed successfully!");
    
    // Clean up temporary mock file
    if (fs.existsSync(tempWorkerPath)) {
      fs.unlinkSync(tempWorkerPath);
    }
    process.exit(0);
  } catch (err) {
    console.error("❌ Durable Object WebSocket security tests failed:", err);
    if (fs.existsSync(tempWorkerPath)) {
      fs.unlinkSync(tempWorkerPath);
    }
    process.exit(1);
  }
}

runTests();
