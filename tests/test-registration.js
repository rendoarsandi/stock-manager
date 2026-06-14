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

    console.log("\n--- Running User Registration Workflow Tests ---");

    // 1. Create a simulated token for an unregistered Clerk user
    const unregisteredPayload = {
      id: null,
      username: 'new_clerk_user',
      role: 'staff',
      needsRegistration: true
    };
    const token = signJwt(unregisteredPayload, JWT_SECRET);
    const cookie = `token=${token}`;

    // 2. Test /api/auth/me for unregistered user
    console.log("Testing /api/auth/me for unregistered user...");
    const resMe = await app.request('/api/auth/me', {
      headers: { 'Cookie': cookie }
    });
    console.log("Status:", resMe.status);
    if (resMe.status !== 200) {
      throw new Error("Expected 200 OK for /me even if unregistered");
    }
    const meData = await resMe.json();
    console.log("Response:", meData);
    if (!meData.needsRegistration) {
      throw new Error("Expected needsRegistration to be true");
    }

    // 3. Test that accessing another API route is blocked
    console.log("\nTesting blocked access to /api/products for unregistered user...");
    const resProductsBlocked = await app.request('/api/products', {
      headers: { 'Cookie': cookie }
    });
    console.log("Status:", resProductsBlocked.status);
    if (resProductsBlocked.status !== 403) {
      throw new Error(`Expected 403 Forbidden, got ${resProductsBlocked.status}`);
    }
    const blockedData = await resProductsBlocked.json();
    console.log("Response:", blockedData);
    if (!blockedData.needsRegistration) {
      throw new Error("Expected needsRegistration in block response");
    }

    // 4. Register the user via /api/auth/register
    console.log("\nRegistering the new user...");
    const resRegister = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 
        'Cookie': cookie,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: 'new_clerk_user' })
    });
    console.log("Status:", resRegister.status);
    if (resRegister.status !== 201) {
      throw new Error(`Expected 201 Created, got ${resRegister.status}`);
    }
    const registerData = await resRegister.json();
    console.log("Response:", registerData);
    if (!registerData.success || !registerData.id) {
      throw new Error("Registration failed or missing user ID");
    }

    // 5. Build a new token using the newly registered user's ID
    const registeredPayload = {
      id: registerData.id,
      username: 'new_clerk_user',
      role: 'staff'
    };
    const registeredToken = signJwt(registeredPayload, JWT_SECRET);
    const registeredCookie = `token=${registeredToken}`;

    // 6. Test /api/auth/me again (should be registered now)
    console.log("\nTesting /api/auth/me for registered user...");
    const resMeAfter = await app.request('/api/auth/me', {
      headers: { 'Cookie': registeredCookie }
    });
    console.log("Status:", resMeAfter.status);
    if (resMeAfter.status !== 200) {
      throw new Error("Expected 200 OK for registered /me");
    }
    const meDataAfter = await resMeAfter.json();
    console.log("Response:", meDataAfter);
    if (meDataAfter.needsRegistration) {
      throw new Error("User should not need registration anymore");
    }
    if (meDataAfter.id !== registerData.id || meDataAfter.username !== 'new_clerk_user') {
      throw new Error("User data mismatch after registration");
    }

    // 7. Test accessing /api/products (should be successful now)
    console.log("\nTesting allowed access to /api/products for registered user...");
    const resProductsAllowed = await app.request('/api/products', {
      headers: { 'Cookie': registeredCookie }
    });
    console.log("Status:", resProductsAllowed.status);
    if (resProductsAllowed.status !== 200) {
      throw new Error(`Expected 200 OK, got ${resProductsAllowed.status}`);
    }
    console.log("Successfully accessed /api/products!");

    console.log("\nAll User Registration tests passed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("\nUser Registration test failed:", err);
    process.exit(1);
  }
}

runTests();
