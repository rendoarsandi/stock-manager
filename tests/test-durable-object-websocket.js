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
      exec: () => ({
        toArray: () => [],
        raw: () => ({ toArray: () => [] }),
        one: () => null
      })
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
        sql: mockSql
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
