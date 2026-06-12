import app from '../src/index.js';
import { initDatabase } from '../src/db/connection.js';
import { seed } from '../src/db/seed.js';

// Set NODE_ENV to test to avoid starting the server during imports
process.env.NODE_ENV = 'test';

async function runTests() {
  try {
    // Initialize database and seed it for testing
    await initDatabase();
    await seed();

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

    // 3. Test /api/auth/login (Invalid credentials)
    console.log("\nTesting /api/auth/login (invalid credentials)...");
    const resLoginInvalid = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'wrongpassword' })
    });
    console.log("Status:", resLoginInvalid.status);
    if (resLoginInvalid.status !== 401) {
      throw new Error("Expected 401 for wrong credentials");
    }

    // 4. Test /api/auth/login (Success)
    console.log("\nTesting /api/auth/login (success)...");
    const resLoginSuccess = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    console.log("Status:", resLoginSuccess.status);
    if (resLoginSuccess.status !== 200) {
      throw new Error("Expected 200 for successful login");
    }
    const userData = await resLoginSuccess.json();
    console.log("Logged in user:", userData);
    if (userData.username !== 'admin' || userData.role !== 'admin') {
      throw new Error("Login response user data incorrect");
    }

    // Get cookie from login response
    const setCookieHeader = resLoginSuccess.headers.get('set-cookie');
    console.log("Set-Cookie header:", setCookieHeader);
    if (!setCookieHeader || !setCookieHeader.includes('token=')) {
      throw new Error("Expected set-cookie header with token");
    }

    // Extract token part
    const tokenCookie = setCookieHeader.split(';')[0];

    // 5. Test /api/auth/me (Authorized)
    console.log("\nTesting /api/auth/me (authorized)...");
    const resMeAuth = await app.request('/api/auth/me', {
      headers: { 'Cookie': tokenCookie }
    });
    console.log("Status:", resMeAuth.status);
    if (resMeAuth.status !== 200) {
      throw new Error("Expected 200 for authorized /me");
    }
    const meData = await resMeAuth.json();
    console.log("Auth user details:", meData);
    console.log("DEBUG: meData keys:", Object.keys(meData));
    console.log("DEBUG: meData.username type:", typeof meData.username);
    console.log("DEBUG: meData.username value:", JSON.stringify(meData.username));
    console.log("DEBUG: comparison:", meData.username === 'admin');
    if (meData.username !== 'admin') {
      throw new Error(`Authorized user data mismatch: expected 'admin', got '${meData.username}'`);
    }

    // 6. Test /api/auth/logout
    console.log("\nTesting /api/auth/logout...");
    const resLogout = await app.request('/api/auth/logout', {
      method: 'POST',
      headers: { 'Cookie': tokenCookie }
    });
    console.log("Status:", resLogout.status);
    if (resLogout.status !== 200) {
      throw new Error("Expected 200 for logout");
    }
    const logoutCookie = resLogout.headers.get('set-cookie');
    console.log("Logout Cookie header:", logoutCookie);
    if (!logoutCookie || !logoutCookie.includes('token=;')) {
      throw new Error("Expected cookie deletion in logout response");
    }

    console.log("\nAll API route tests passed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("\nAPI route test failed:", err);
    process.exit(1);
  }
}

runTests();
