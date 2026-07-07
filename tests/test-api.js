import app from '../src/index.js';
import { loginUser, withSeededStorage } from './helpers.js';

// Set NODE_ENV to test to avoid starting the server during imports
process.env.NODE_ENV = 'test';

async function runTests() {
  await withSeededStorage(async () => {
    try {
      console.log("\n--- Running API Route Tests ---");

      // 1. Test /api/health
      console.log("Testing /api/health...");
      const resHealth = await app.request('/api/health');
      console.log("Health status:", resHealth.status);
      if (resHealth.status !== 200) {
        throw new Error("Health check failed");
      }
      const healthData = await resHealth.json();
      console.log("Health response data:", healthData);
      if (healthData.status !== 'ok') {
        throw new Error("Health check data incorrect");
      }

      // 2. Test /api/auth/me (Unauthorized)
      console.log("\nTesting /api/auth/me (unauthorized)...");
      const resMeUnauth = await app.request('/api/auth/me');
      console.log("Status:", resMeUnauth.status);
      if (resMeUnauth.status !== 401) {
        throw new Error("Expected 401 for unauthorized /me");
      }

      // 3. Test /api/auth/me (Authorized with mocked Better Auth Session)
      console.log("\nTesting /api/auth/me (authorized via mock Better Auth session)...");
      const tokenCookie = await loginUser(app, 'admin', 'admin123');

      const resMeAuth = await app.request('/api/auth/me', {
        headers: { 'Cookie': tokenCookie }
      });
      console.log("Status:", resMeAuth.status);
      if (resMeAuth.status !== 200) {
        throw new Error("Expected 200 for authorized /me");
      }
      const meData = await resMeAuth.json();
      console.log("Auth user details:", meData);
      if (meData.username !== 'admin') {
        throw new Error(`Authorized user data mismatch: expected 'admin', got '${meData.username}'`);
      }

      console.log("\nAll API route tests passed successfully!");
      process.exit(0);
    } catch (err) {
      console.error("\nAPI route test failed:", err);
      process.exit(1);
    }
  });
}

runTests();
