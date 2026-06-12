import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import WebSocket from 'ws';
import assert from 'assert';
import { db } from '../src/db/connection.js';
import { storageContext } from '../src/db/context.js';
import { getLocalStore, clearLocalDbFile } from '../src/db/local_kv.js';
import { setupLocalWebSocket } from '../src/ws/broker.js';

const app = new Hono();

// Mimic the request context wrapper from index.js
app.use('*', async (c, next) => {
  const store = {
    type: 'local',
    storage: getLocalStore(),
    env: c.env
  };
  return storageContext.run(store, async () => {
    return await next();
  });
});

app.post('/api/products', async (c) => {
  const body = await c.req.json();
  const product = await db.products.insert(body);
  return c.json(product);
});

async function runTest() {
  console.log("--- Running WebSocket Integration Tests ---");
  
  clearLocalDbFile();

  const PORT = 4001;
  const server = serve({
    fetch: app.fetch,
    port: PORT
  });

  setupLocalWebSocket(server);

  // Connect WebSocket client
  const ws = new WebSocket(`ws://localhost:${PORT}/ws`);
  const receivedMessages = [];

  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
    ws.on('message', (data) => {
      const parsed = JSON.parse(data);
      if (parsed.type !== 'ONLINE_COUNT') {
        receivedMessages.push(parsed);
      }
    });
  });

  console.log("WebSocket connection established.");

  // Perform a mutation in storageContext
  const store = {
    type: 'local',
    storage: getLocalStore(),
    env: {}
  };

  let createdProduct;
  await storageContext.run(store, async () => {
    createdProduct = await db.products.insert({
      name: "Test WebSocket Product",
      model: "WS-Model",
      current_stock: 42,
      low_stock_threshold: 5
    });
  });

  // Wait for the message to be received by client
  await new Promise(resolve => setTimeout(resolve, 300));

  assert.strictEqual(receivedMessages.length, 1);
  const msg = receivedMessages[0];
  assert.strictEqual(msg.type, 'PRODUCT_CREATED');
  assert.strictEqual(msg.payload.name, 'Test WebSocket Product');
  assert.strictEqual(msg.payload.current_stock, 42);
  console.log("✅ WebSocket PRODUCT_CREATED broadcast verified.");

  // Test updating the product
  await storageContext.run(store, async () => {
    await db.products.update(createdProduct.id, {
      current_stock: 35
    });
  });

  await new Promise(resolve => setTimeout(resolve, 300));

  assert.strictEqual(receivedMessages.length, 2);
  const msgUpdate = receivedMessages[1];
  assert.strictEqual(msgUpdate.type, 'PRODUCT_UPDATED');
  assert.strictEqual(msgUpdate.payload.id, createdProduct.id);
  assert.strictEqual(msgUpdate.payload.current_stock, 35);
  console.log("✅ WebSocket PRODUCT_UPDATED broadcast verified.");

  // Close connections & server
  ws.close();
  server.close();
  
  clearLocalDbFile();
  console.log("All WebSocket Integration tests passed successfully!\n");
}

runTest().catch(err => {
  console.error("❌ WebSocket tests failed:", err);
  process.exit(1);
});
