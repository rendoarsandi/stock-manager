import initSqlJs from 'sql.js';
import { migrateDatabase } from '../src/db/migrate-to-betterauth.js';
import assert from 'assert';

async function runTest() {
  console.log("Starting BetterAuth DB Migration Verification Test...");

  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // 1. Initialize DB with the old schema
  db.run(`
    CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL CHECK(role IN ('admin', 'staff')),
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE import_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        column_mapping TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE import_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER,
        user_id INTEGER,
        filename TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'previewing', 'applied', 'cancelled')),
        total_rows INTEGER DEFAULT 0,
        applied_rows INTEGER DEFAULT 0,
        flagged_rows INTEGER DEFAULT 0,
        orders_data TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (template_id) REFERENCES import_templates(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        model TEXT NOT NULL,
        description TEXT,
        current_stock INTEGER DEFAULT 0,
        low_stock_threshold INTEGER DEFAULT 10,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        quantity_change INTEGER NOT NULL,
        movement_type TEXT NOT NULL CHECK(movement_type IN ('sale', 'return', 'write_off', 'manual_adjust', 'initial')),
        reference TEXT,
        user_id INTEGER,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE stock_opnames (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        product_id INTEGER,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        is_read INTEGER DEFAULT 0,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );
  `);

  // 2. Insert mock data
  db.run(`
    INSERT INTO users (id, username, password_hash, role, created_at)
    VALUES (10, 'clerk_user', 'user_2xyz', 'staff', '2026-06-15 00:00:00');

    INSERT INTO users (id, username, password_hash, role, created_at)
    VALUES (20, 'local_user', 'hashed_pass_123', 'admin', '2026-06-15 01:00:00');

    INSERT INTO import_templates (id, name, column_mapping)
    VALUES (1, 'Template1', '{}');

    INSERT INTO products (id, name, model)
    VALUES (1, 'Product1', 'Model1');

    INSERT INTO import_sessions (id, template_id, user_id, filename, status)
    VALUES (1, 1, 10, 'test.xlsx', 'pending');

    INSERT INTO stock_movements (id, product_id, quantity_change, movement_type, user_id)
    VALUES (1, 1, 10, 'initial', 20);

    INSERT INTO stock_opnames (id, user_id, notes)
    VALUES (1, 20, 'opname notes');

    INSERT INTO chat_messages (id, sender_id, receiver_id, message)
    VALUES (1, 20, 10, 'hello');
  `);

  // Define database adapter for migration script
  const storage = {
    async query(sql, params = []) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    },
    async execute(sql, params = []) {
      db.run(sql, params);
      return { lastInsertRowid: null };
    }
  };

  // 3. Run migration
  await migrateDatabase(storage);

  // 4. Verification & Assertions

  // A. Schema Assertions
  const usersInfo = await storage.query("PRAGMA table_info(users)");
  const idCol = usersInfo.find(c => c.name === 'id');
  assert.strictEqual(idCol.type, 'TEXT', 'users.id must be TEXT');

  const emailCol = usersInfo.find(c => c.name === 'email');
  assert.ok(emailCol, 'users table must have email column');
  assert.strictEqual(emailCol.type, 'TEXT', 'users.email must be TEXT');

  const reqResetCol = usersInfo.find(c => c.name === 'requires_password_reset');
  assert.ok(reqResetCol, 'users table must have requires_password_reset column');

  // Verify dependent tables user ID column types
  const importSessionsInfo = await storage.query("PRAGMA table_info(import_sessions)");
  const isUserCol = importSessionsInfo.find(c => c.name === 'user_id');
  assert.strictEqual(isUserCol.type, 'TEXT', 'import_sessions.user_id must be TEXT');

  const stockMovementsInfo = await storage.query("PRAGMA table_info(stock_movements)");
  const smUserCol = stockMovementsInfo.find(c => c.name === 'user_id');
  assert.strictEqual(smUserCol.type, 'TEXT', 'stock_movements.user_id must be TEXT');

  const stockOpnamesInfo = await storage.query("PRAGMA table_info(stock_opnames)");
  const soUserCol = stockOpnamesInfo.find(c => c.name === 'user_id');
  assert.strictEqual(soUserCol.type, 'TEXT', 'stock_opnames.user_id must be TEXT');

  const chatMessagesInfo = await storage.query("PRAGMA table_info(chat_messages)");
  const cmSenderCol = chatMessagesInfo.find(c => c.name === 'sender_id');
  assert.strictEqual(cmSenderCol.type, 'TEXT', 'chat_messages.sender_id must be TEXT');
  const cmReceiverCol = chatMessagesInfo.find(c => c.name === 'receiver_id');
  assert.strictEqual(cmReceiverCol.type, 'TEXT', 'chat_messages.receiver_id must be TEXT');

  // Verify BetterAuth session, account, verification tables exist
  const sessionInfo = await storage.query("PRAGMA table_info(session)");
  assert.ok(sessionInfo.length > 0, 'session table must exist');

  const accountInfo = await storage.query("PRAGMA table_info(account)");
  assert.ok(accountInfo.length > 0, 'account table must exist');

  const verificationInfo = await storage.query("PRAGMA table_info(verification)");
  assert.ok(verificationInfo.length > 0, 'verification table must exist');

  // B. Data Assertions
  const migratedUsers = await storage.query("SELECT * FROM users ORDER BY id");
  assert.strictEqual(migratedUsers.length, 2, 'Must have exactly 2 users migrated');

  const userClerk = migratedUsers.find(u => u.username === 'clerk_user');
  assert.strictEqual(userClerk.id, '10', 'Clerk user ID must be string "10"');
  assert.strictEqual(userClerk.email, 'clerk_user@example.com', 'Clerk email must be correct');
  assert.strictEqual(userClerk.requires_password_reset, 1, 'Clerk user must be marked with requires_password_reset = 1');

  const userLocal = migratedUsers.find(u => u.username === 'local_user');
  assert.strictEqual(userLocal.id, '20', 'Local user ID must be string "20"');
  assert.strictEqual(userLocal.email, 'local_user@example.com', 'Local email must be correct');
  assert.strictEqual(userLocal.requires_password_reset, 0, 'Local user must be marked with requires_password_reset = 0');

  // Verify local user password hash migrated to credentials account table
  const credentials = await storage.query("SELECT * FROM account WHERE user_id = ?", ['20']);
  assert.strictEqual(credentials.length, 1, 'Local user must have exactly 1 credential account entry');
  assert.strictEqual(credentials[0].provider_id, 'credential', 'provider_id must be "credential"');
  assert.strictEqual(credentials[0].password, 'hashed_pass_123', 'Password hash must match');

  // Verify Clerk user does NOT have a credentials account entry
  const clerkCredentials = await storage.query("SELECT * FROM account WHERE user_id = ?", ['10']);
  assert.strictEqual(clerkCredentials.length, 0, 'Clerk user must not have a credential account entry');

  // Verify dependent table records were correctly converted to TEXT keys
  const importSessionRecs = await storage.query("SELECT * FROM import_sessions WHERE id = 1");
  assert.strictEqual(importSessionRecs[0].user_id, '10', 'import_sessions record user_id must be TEXT "10"');

  const stockMovementRecs = await storage.query("SELECT * FROM stock_movements WHERE id = 1");
  assert.strictEqual(stockMovementRecs[0].user_id, '20', 'stock_movements record user_id must be TEXT "20"');

  const stockOpnameRecs = await storage.query("SELECT * FROM stock_opnames WHERE id = 1");
  assert.strictEqual(stockOpnameRecs[0].user_id, '20', 'stock_opnames record user_id must be TEXT "20"');

  const chatMessageRecs = await storage.query("SELECT * FROM chat_messages WHERE id = 1");
  assert.strictEqual(chatMessageRecs[0].sender_id, '20', 'chat_messages record sender_id must be TEXT "20"');
  assert.strictEqual(chatMessageRecs[0].receiver_id, '10', 'chat_messages record receiver_id must be TEXT "10"');

  console.log("✅ All migration verification tests passed successfully!");
}

runTest().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
