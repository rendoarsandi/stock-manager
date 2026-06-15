import { auth } from "../src/db/auth.js";
import { storageContext, getActiveDb, getActiveStorage } from "../src/db/context.js";
import { getLocalStore } from "../src/db/local_sqlite.js";
import { users, session, account } from "../src/db/schema.js";
import { eq, and } from "drizzle-orm";
import assert from "assert";
import {
  handleLogin,
  handleResetPassword,
  handleLogout,
  withAuthOrRole
} from "../src/routes_new/index.js";
import { signCookieValue } from "../node_modules/better-call/dist/crypto.mjs";

// Ensure test environment
process.env.NODE_ENV = 'test';

const store = {
  type: 'local',
  storage: getLocalStore(),
  env: process.env
};

// Helper to extract cookies from headers
function getCookiesFromResponse(res) {
  const headers = res.headers;
  const cookieHeaders = [];
  headers.forEach((value, name) => {
    if (name.toLowerCase() === 'set-cookie') {
      cookieHeaders.push(value);
    }
  });
  return cookieHeaders;
}

// Helper to get specific cookie value from a Set-Cookie string or array of strings
function getCookieValue(cookieStrings, name) {
  for (const cookieStr of cookieStrings) {
    const cookies = cookieStr.split(',');
    for (const cookie of cookies) {
      const parts = cookie.split(';');
      for (const part of parts) {
        const [k, v] = part.trim().split('=');
        if (k === name) return v;
      }
    }
  }
  return null;
}

async function runTests() {
  console.log("====================================================");
  console.log("RUNNING BETTERAUTH MIGRATION VERIFICATION TEST SUITE");
  console.log("====================================================");

  await storageContext.run(store, async () => {
    const db = getActiveDb();
    const storage = getActiveStorage();

    // Reset database state for test isolation
    await db.delete(session);
    await db.delete(account);
    await db.delete(users);

    console.log("1. Testing User Registration (signup)...");
    const signUpResult = await auth.api.signUpEmail({
      body: {
        email: 'test_signup@example.com',
        password: 'password123',
        name: 'Test Signup User',
        username: 'test_signup',
        role: 'staff'
      }
    });

    assert.ok(signUpResult, "SignUp result should be defined");
    assert.strictEqual(signUpResult.user.username, 'test_signup');
    assert.strictEqual(signUpResult.user.role, 'staff');
    console.log("✓ User registration verified.");

    console.log("2. Testing Login with email/password (creating session)...");
    const loginReq = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ username: 'test_signup', password: 'password123' })
    });
    const loginRes = await handleLogin(loginReq);
    assert.strictEqual(loginRes.status, 200, "Login should return status 200");
    const loginData = await loginRes.json();
    assert.strictEqual(loginData.username, 'test_signup');

    const setCookies = getCookiesFromResponse(loginRes);
    console.log("DEBUG: setCookies =", setCookies);
    const sessionToken = getCookieValue(setCookies, 'better-auth.session-token');
    const token = getCookieValue(setCookies, 'token');
    console.log("DEBUG: sessionToken =", sessionToken, "token =", token);
    assert.ok(sessionToken, "Should return better-auth.session-token cookie");
    assert.ok(token, "Should return legacy token cookie");
    console.log("✓ Login verified.");

    console.log("3. Testing Session validation (getAuthUser)...");
    // Verify that a request with the cookies retrieves the correct user
    const dummyReq = new Request('http://localhost:3000/api/products', {
      method: 'GET',
      headers: new Headers({
        'Cookie': `better-auth.session-token=${sessionToken}; token=${token}`
      })
    });

    // Run custom wrapped handler using withAuthOrRole to check if request.user is set
    const testHandler = async (req) => {
      assert.ok(req.user, "Request user should be set by withAuthOrRole");
      assert.strictEqual(req.user.username, 'test_signup');
      assert.strictEqual(req.user.role, 'staff');
      return new Response('success');
    };

    const wrappedHandler = withAuthOrRole(testHandler, { auth: true });
    const wrappedRes = await wrappedHandler({ request: dummyReq });
    assert.strictEqual(await wrappedRes.text(), 'success');
    console.log("✓ Session validation verified.");

    console.log("4. Testing Logout (clearing session)...");
    const logoutReq = new Request('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: new Headers({
        'Cookie': `better-auth.session-token=${sessionToken}; token=${token}`
      })
    });
    const logoutRes = await handleLogout(logoutReq);
    assert.strictEqual(logoutRes.status, 200, "Logout should succeed");
    
    const logoutCookies = getCookiesFromResponse(logoutRes);
    const clearedSessionToken = getCookieValue(logoutCookies, 'better-auth.session-token');
    // In handleLogout, the cleared cookies have Max-Age=0 or are empty
    assert.ok(clearedSessionToken === '' || clearedSessionToken === null, "Session token cookie should be cleared");
    console.log("✓ Logout verified.");

    console.log("5. Testing Role-based access control (admin vs staff)...");
    // Register an admin user
    const adminUser = await db.insert(users).values({
      id: 'admin-test-id',
      name: 'Admin User',
      email: 'admin_test@example.com',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      role: 'admin',
      username: 'admin_test',
      requiresPasswordReset: false
    }).returning();

    // Create session token for admin
    const adminSessionToken = 'admin-session-token-xyz';
    await db.insert(session).values({
      id: 'admin-sess-id',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      token: adminSessionToken,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'admin-test-id'
    });

    // Create session token for staff
    const staffSessionToken = 'staff-session-token-xyz';
    const staffUser = await db.select().from(users).where(eq(users.username, 'test_signup'));
    await db.insert(session).values({
      id: 'staff-sess-id',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      token: staffSessionToken,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: staffUser[0].id
    });

    // Build handler that requires admin role
    const adminOnlyHandler = withAuthOrRole(async (req) => {
      return new Response('admin-access-granted');
    }, { role: 'admin' });

    const signedStaffCookie = await signCookieValue(staffSessionToken, auth.options.secret);
    const signedAdminCookie = await signCookieValue(adminSessionToken, auth.options.secret);

    // Request with staff credentials should fail with 403 Forbidden
    const staffReq = new Request('http://localhost:3000/api/admin-route', {
      method: 'GET',
      headers: new Headers({
        'Cookie': `better-auth.session-token=${signedStaffCookie}`
      })
    });
    const staffRes = await adminOnlyHandler({ request: staffReq });
    assert.strictEqual(staffRes.status, 403, "Staff access to admin route should return 403");

    // Request with admin credentials should succeed with 200
    const adminReq = new Request('http://localhost:3000/api/admin-route', {
      method: 'GET',
      headers: new Headers({
        'Cookie': `better-auth.session-token=${signedAdminCookie}`
      })
    });
    const adminRes = await adminOnlyHandler({ request: adminReq });
    assert.strictEqual(adminRes.status, 200, "Admin access to admin route should return 200");
    assert.strictEqual(await adminRes.text(), 'admin-access-granted');
    console.log("✓ Role-based access control verified.");

    console.log("6. Testing Clerk-migrated user password reset flow...");
    // Insert a Clerk user that requires password reset
    const clerkUserId = 'clerk-user-123';
    await db.insert(users).values({
      id: clerkUserId,
      name: 'Clerk Migrated User',
      email: 'clerk_migrated@example.com',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      role: 'staff',
      username: 'clerk_user',
      requiresPasswordReset: true
    });

    // Attempt login with Clerk user (should fail with 403 and indicate password reset is required)
    const clerkLoginReq = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ username: 'clerk_user', password: 'randomPassword123' })
    });
    const clerkLoginRes = await handleLogin(clerkLoginReq);
    assert.strictEqual(clerkLoginRes.status, 403, "Clerk migrated login before password reset should return 403");
    const clerkLoginData = await clerkLoginRes.json();
    assert.ok(clerkLoginData.requires_password_reset, "Should indicate password reset is required");
    assert.strictEqual(clerkLoginData.username, 'clerk_user');

    // Call reset password to set new password
    const resetReq = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ username: 'clerk_user', password: 'newSecurePassword123' })
    });

    // We need to bypass auth check on reset-password by wrapping correctly or using active storage
    const resetRes = await handleResetPassword(resetReq);
    assert.strictEqual(resetRes.status, 200, "Reset password should succeed");
    
    // Verify requiresPasswordReset is set to false (0) in DB
    const updatedClerkUser = await db.select().from(users).where(eq(users.id, clerkUserId));
    assert.strictEqual(updatedClerkUser[0].requiresPasswordReset, false);

    // Verify credential account entry was created
    const clerkAccounts = await db.select().from(account).where(and(eq(account.userId, clerkUserId), eq(account.providerId, 'credential')));
    assert.strictEqual(clerkAccounts.length, 1, "Credentials account should be created");
    assert.ok(clerkAccounts[0].password, "Password hash should be populated");

    // Login with new password should succeed
    const finalLoginReq = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ username: 'clerk_user', password: 'newSecurePassword123' })
    });
    const finalLoginRes = await handleLogin(finalLoginReq);
    assert.strictEqual(finalLoginRes.status, 200, "Login after password set should succeed");
    const finalLoginData = await finalLoginRes.json();
    assert.strictEqual(finalLoginData.username, 'clerk_user');
    console.log("✓ Clerk-migrated user password reset flow verified.");
  });

  console.log("====================================================");
  console.log("🎉 ALL BETTERAUTH MIGRATION VERIFICATION TESTS PASSED!");
  console.log("====================================================");
}

runTests().catch(err => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
