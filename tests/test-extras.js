import app from '../src/index.js';
import { initDatabase, db } from '../src/db/connection.js';
import { seed } from '../src/db/seed.js';

process.env.NODE_ENV = 'test';

async function runTests() {
  try {
    await initDatabase();
    await seed();

    console.log("\n--- Running Extras/New Features API Tests ---");

    // Login admin
    const resAdminLogin = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const adminCookie = resAdminLogin.headers.get('set-cookie').split(';')[0];

    // Login staff
    const resStaffLogin = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'staff', password: 'staff123' })
    });
    const staffCookie = resStaffLogin.headers.get('set-cookie').split(';')[0];

    // ==========================================
    // 1. Stock Ledger API (/api/products/ledger)
    // ==========================================
    console.log("\n[Ledger] Testing GET /api/products/ledger (unauthorized)...");
    const resLedgerUnauth = await app.request('/api/products/ledger');
    if (resLedgerUnauth.status !== 401) {
      throw new Error(`Expected 401 for unauthorized ledger access, got ${resLedgerUnauth.status}`);
    }

    console.log("[Ledger] Testing GET /api/products/ledger (authorized as staff)...");
    const resLedgerStaff = await app.request('/api/products/ledger', {
      headers: { 'Cookie': staffCookie }
    });
    if (resLedgerStaff.status !== 200) {
      throw new Error(`Expected 200 for staff ledger access, got ${resLedgerStaff.status}`);
    }
    const ledgerList = await resLedgerStaff.json();
    console.log(`[Ledger] Found ${ledgerList.length} stock movements.`);
    if (ledgerList.length === 0) {
      throw new Error("Expected seeded stock movements in ledger");
    }
    
    // Verify columns from join
    const firstLedgerRow = ledgerList[0];
    console.log("[Ledger] Verify columns on first row:", firstLedgerRow);
    if (!firstLedgerRow.name || !firstLedgerRow.model || !firstLedgerRow.username) {
      throw new Error("Ledger row missing joined product name, model, or username");
    }

    // ==========================================
    // 2. User Accounts API (/api/auth/users)
    // ==========================================
    
    // 2.1 GET /api/auth/users
    console.log("\n[Users] Testing GET /api/auth/users (unauthorized)...");
    const resUsersUnauth = await app.request('/api/auth/users');
    if (resUsersUnauth.status !== 401) {
      throw new Error(`Expected 401, got ${resUsersUnauth.status}`);
    }

    console.log("[Users] Testing GET /api/auth/users (forbidden for staff)...");
    const resUsersStaff = await app.request('/api/auth/users', {
      headers: { 'Cookie': staffCookie }
    });
    if (resUsersStaff.status !== 403) {
      throw new Error(`Expected 403, got ${resUsersStaff.status}`);
    }

    console.log("[Users] Testing GET /api/auth/users (authorized as admin)...");
    const resUsersAdmin = await app.request('/api/auth/users', {
      headers: { 'Cookie': adminCookie }
    });
    if (resUsersAdmin.status !== 200) {
      throw new Error(`Expected 200, got ${resUsersAdmin.status}`);
    }
    const users = await resUsersAdmin.json();
    console.log(`[Users] Loaded ${users.length} users:`, users);
    if (users.length !== 2) {
      throw new Error(`Expected 2 users initially (admin and staff), got ${users.length}`);
    }
    // Check fields
    const adminUser = users.find(u => u.username === 'admin');
    if (!adminUser || adminUser.password_hash !== undefined || !adminUser.role || !adminUser.created_at) {
      throw new Error("User object fields incorrect (password_hash should be omitted, role and created_at should exist)");
    }

    // 2.2 POST /api/auth/users (Create User)
    console.log("\n[Users] Testing POST /api/auth/users (forbidden for staff)...");
    const resCreateStaff = await app.request('/api/auth/users', {
      method: 'POST',
      headers: {
        'Cookie': staffCookie,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: 'newstaff', password: 'newpassword', role: 'staff' })
    });
    if (resCreateStaff.status !== 403) {
      throw new Error(`Expected 403, got ${resCreateStaff.status}`);
    }

    console.log("[Users] Testing POST /api/auth/users (success as admin)...");
    const resCreateAdmin = await app.request('/api/auth/users', {
      method: 'POST',
      headers: {
        'Cookie': adminCookie,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: 'newstaff', password: 'newpassword', role: 'staff' })
    });
    if (resCreateAdmin.status !== 201) {
      throw new Error(`Expected 201, got ${resCreateAdmin.status}`);
    }
    const createResult = await resCreateAdmin.json();
    console.log("[Users] Created user:", createResult);
    if (!createResult.success || !createResult.id) {
      throw new Error("Creation response missing success or ID");
    }
    const newUserId = createResult.id;

    // Check duplicate username
    console.log("[Users] Testing POST /api/auth/users (duplicate username)...");
    const resCreateDup = await app.request('/api/auth/users', {
      method: 'POST',
      headers: {
        'Cookie': adminCookie,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: 'newstaff', password: 'newpassword', role: 'staff' })
    });
    if (resCreateDup.status !== 400) {
      throw new Error(`Expected 400 for duplicate username, got ${resCreateDup.status}`);
    }

    // Verify login of the new user works
    console.log("[Users] Verify login of newly created user works...");
    const resNewLogin = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'newstaff', password: 'newpassword' })
    });
    if (resNewLogin.status !== 200) {
      throw new Error(`Expected 200 for logging in new user, got ${resNewLogin.status}`);
    }
    const newCookie = resNewLogin.headers.get('set-cookie').split(';')[0];

    // 2.3 DELETE /api/auth/users/:id
    console.log("\n[Users] Testing DELETE /api/auth/users/:id (forbidden for staff)...");
    const resDeleteStaff = await app.request(`/api/auth/users/${newUserId}`, {
      method: 'DELETE',
      headers: { 'Cookie': staffCookie }
    });
    if (resDeleteStaff.status !== 403) {
      throw new Error(`Expected 403, got ${resDeleteStaff.status}`);
    }

    console.log("[Users] Testing DELETE /api/auth/users/:id (delete current session admin)...");
    const resDeleteSelf = await app.request(`/api/auth/users/1`, {
      method: 'DELETE',
      headers: { 'Cookie': adminCookie }
    });
    if (resDeleteSelf.status !== 400) {
      throw new Error(`Expected 400 for self delete, got ${resDeleteSelf.status}`);
    }

    console.log("[Users] Testing DELETE /api/auth/users/:id (success as admin)...");
    const resDeleteAdmin = await app.request(`/api/auth/users/${newUserId}`, {
      method: 'DELETE',
      headers: { 'Cookie': adminCookie }
    });
    if (resDeleteAdmin.status !== 200) {
      throw new Error(`Expected 200 for user deletion, got ${resDeleteAdmin.status}`);
    }

    // Try login again, should fail
    console.log("[Users] Verify deleted user cannot log in...");
    const resNewLoginDeleted = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'newstaff', password: 'newpassword' })
    });
    if (resNewLoginDeleted.status !== 401) {
      throw new Error(`Expected 401 for deleted user login, got ${resNewLoginDeleted.status}`);
    }

    // ==========================================
    // 3. Templates API DELETE /api/import/templates/:id
    // ==========================================
    
    // Get list of templates first
    const resTemplates = await app.request('/api/import/templates', {
      headers: { 'Cookie': adminCookie }
    });
    const templates = await resTemplates.json();
    console.log(`\n[Templates] Loaded templates:`, templates);
    if (templates.length === 0) {
      throw new Error("Expected seeded templates");
    }
    const templateToDelete = templates[0];

    console.log("[Templates] Testing DELETE /api/import/templates/:id (forbidden for staff)...");
    const resDeleteTemplateStaff = await app.request(`/api/import/templates/${templateToDelete.id}`, {
      method: 'DELETE',
      headers: { 'Cookie': staffCookie }
    });
    if (resDeleteTemplateStaff.status !== 403) {
      throw new Error(`Expected 403 for staff deleting template, got ${resDeleteTemplateStaff.status}`);
    }

    console.log("[Templates] Testing DELETE /api/import/templates/:id (success as admin)...");
    const resDeleteTemplateAdmin = await app.request(`/api/import/templates/${templateToDelete.id}`, {
      method: 'DELETE',
      headers: { 'Cookie': adminCookie }
    });
    if (resDeleteTemplateAdmin.status !== 200) {
      throw new Error(`Expected 200, got ${resDeleteTemplateAdmin.status}`);
    }

    // Verify deleted
    const resTemplatesAfter = await app.request('/api/import/templates', {
      headers: { 'Cookie': adminCookie }
    });
    const templatesAfter = await resTemplatesAfter.json();
    if (templatesAfter.find(t => t.id === templateToDelete.id)) {
      throw new Error("Template was not deleted");
    }

    console.log("\nAll extras/new features API tests passed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("\nExtras API tests failed:", err);
    process.exit(1);
  }
}

runTests();
