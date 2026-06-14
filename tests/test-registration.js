import app from '../src/index.js';
import { initDatabase } from '../src/db/connection.js';
import { seed } from '../src/db/seed.js';
import crypto from 'crypto';

// Set NODE_ENV to test to avoid starting the server during imports
process.env.NODE_ENV = 'test';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

// Helper to sign JWT in test
function signJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${encodedHeader}.${encodedPayload}`).digest('base64url');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

async function runTests() {
  try {
    await initDatabase();
    await seed();

    console.log("\n--- Running Auto-Registration Workflow Tests ---");

    // 1. Create a simulated token for a Clerk user who does not exist locally yet.
    // In test mode, getAuthUser verifies and trust the payload.
    // We pass their Clerk user ID (as password_hash / username fallback) and they should be logged in instantly.
    const unregisteredPayload = {
      id: null,
      username: 'new_automatic_user',
      role: 'staff'
    };
    const token = signJwt(unregisteredPayload, JWT_SECRET);
    const cookie = `token=${token}`;

    // 2. Test /api/auth/me. Because of test mode jwt fallback, they get resolved.
    console.log("Testing /api/auth/me for user...");
    const resMe = await app.request('/api/auth/me', {
      headers: { 'Cookie': cookie }
    });
    console.log("Status:", resMe.status);
    if (resMe.status !== 200) {
      throw new Error(`Expected 200 OK, got ${resMe.status}`);
    }
    const meData = await resMe.json();
    console.log("Response:", meData);
    if (meData.username !== 'new_automatic_user') {
      throw new Error("Username mismatch");
    }

    // 3. Test that accessing API route succeeds automatically
    console.log("\nTesting allowed access to /api/products...");
    const resProducts = await app.request('/api/products', {
      headers: { 'Cookie': cookie }
    });
    console.log("Status:", resProducts.status);
    if (resProducts.status !== 200) {
      throw new Error(`Expected 200 OK, got ${resProducts.status}`);
    }
    console.log("Successfully accessed /api/products!");

    console.log("\nAll Auto-Registration tests passed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("\nAuto-Registration test failed:", err);
    process.exit(1);
  }
}

runTests();
