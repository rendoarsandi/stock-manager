import app from '../src/index.js';
import { initDatabase } from '../src/db/connection.js';
import { getLocalStore } from '../src/db/local_sqlite.js';

process.env.NODE_ENV = 'test';

async function runTests() {
  try {
    await initDatabase();
    const storage = getLocalStore();

    console.log("\n--- Running Password Reset Flow Tests ---");

    // Clear and seed a migrated Clerk user who requires password reset
    await storage.deleteAll();
    await initDatabase();

    // Insert migrated Clerk user
    // id='clerk-1', requires_password_reset=1, username='clerk_migrated'
    // For migrated user, no credential account row exists or the password is a placeholder
    await storage.execute(
      "INSERT INTO users (id, name, email, email_verified, created_at, updated_at, role, username, requires_password_reset) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ['clerk-1', 'Clerk User', 'clerk@example.com', 1, Date.now(), Date.now(), 'staff', 'clerk_migrated', 1]
    );

    // 1. Try logging in as the clerk user before reset
    console.log("Testing login for migrated user requiring reset...");
    const resLogin = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'clerk_migrated', password: 'any_password' })
    });
    console.log("Status:", resLogin.status);
    if (resLogin.status !== 403) {
      throw new Error(`Expected 403 Forbidden, got ${resLogin.status}`);
    }
    const loginData = await resLogin.json();
    console.log("Response payload:", loginData);
    if (!loginData.requires_password_reset || loginData.username !== 'clerk_migrated') {
      throw new Error("Expected requires_password_reset payload");
    }

    // 2. Perform password reset
    console.log("\nTesting password reset endpoint...");
    const resReset = await app.request('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'clerk_migrated', password: 'new_secure_password' })
    });
    console.log("Status:", resReset.status);
    if (resReset.status !== 200) {
      throw new Error(`Expected 200 OK, got ${resReset.status}`);
    }
    const resetData = await resReset.json();
    console.log("Reset user info:", resetData);
    if (resetData.username !== 'clerk_migrated') {
      throw new Error("Username mismatch in reset response");
    }

    // Get cookie from reset response
    const setCookieHeader = resReset.headers.get('set-cookie');
    console.log("Reset Set-Cookie header:", setCookieHeader);
    if (!setCookieHeader || !setCookieHeader.includes('better-auth.session-token=')) {
      throw new Error("Expected session token cookie in reset response");
    }
    const sessionTokenCookie = setCookieHeader.split(',').find(c => c.trim().startsWith('better-auth.session-token=')).trim().split(';')[0];
    console.log("Extracted session token cookie:", sessionTokenCookie);

    // 3. Verify that the user is logged in and can access /api/auth/me
    console.log("\nTesting /api/auth/me with session cookie from reset...");
    const resMe = await app.request('/api/auth/me', {
      headers: { 'Cookie': sessionTokenCookie }
    });
    console.log("Status:", resMe.status);
    if (resMe.status !== 200) {
      throw new Error(`Expected 200 OK, got ${resMe.status}`);
    }
    const meData = await resMe.json();
    console.log("Me response details:", meData);
    if (meData.username !== 'clerk_migrated' || meData.role !== 'staff') {
      throw new Error("Invalid me details");
    }

    // 4. Test that logging in with the new password works now
    console.log("\nTesting login with new password...");
    const resLoginNew = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'clerk_migrated', password: 'new_secure_password' })
    });
    console.log("Status:", resLoginNew.status);
    if (resLoginNew.status !== 200) {
      throw new Error(`Expected 200 OK, got ${resLoginNew.status}`);
    }
    const loginNewData = await resLoginNew.json();
    console.log("Logged in user:", loginNewData);
    if (loginNewData.username !== 'clerk_migrated') {
      throw new Error("Logged in username mismatch");
    }

    console.log("\nAll Password Reset Flow tests passed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("\nPassword Reset Flow test failed:", err);
    process.exit(1);
  }
}

runTests();
