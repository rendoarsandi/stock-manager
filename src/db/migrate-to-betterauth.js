import crypto from 'crypto';

export async function migrateDatabase(storage) {
  // 1. Set foreign_keys to OFF
  await storage.execute("PRAGMA foreign_keys = OFF");

  try {
    // Check if users table has already been migrated (e.g. if the 'email' column exists)
    const tableInfo = await storage.query("PRAGMA table_info(users)");
    if (tableInfo.length === 0) {
      console.log("No users table found. Skipping migration.");
      return;
    }
    const hasEmail = tableInfo.some(col => col.name === 'email');
    if (hasEmail) {
      console.log("Database already migrated to BetterAuth schema.");
      return;
    }

    // 2. Rename users to users_old
    await storage.execute("ALTER TABLE users RENAME TO users_old");

    // 3. Create new tables
    await storage.execute(`
      CREATE TABLE users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          email_verified INTEGER NOT NULL,
          image TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'staff')),
          username TEXT NOT NULL UNIQUE,
          requires_password_reset INTEGER NOT NULL DEFAULT 0
      )
    `);

    await storage.execute(`
      CREATE TABLE session (
          id TEXT PRIMARY KEY,
          expires_at INTEGER NOT NULL,
          token TEXT NOT NULL UNIQUE,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          user_id TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await storage.execute(`
      CREATE TABLE account (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          provider_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          access_token TEXT,
          refresh_token TEXT,
          id_token TEXT,
          expires_at INTEGER,
          password TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await storage.execute(`
      CREATE TABLE verification (
          id TEXT PRIMARY KEY,
          identifier TEXT NOT NULL,
          value TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          created_at INTEGER,
          updated_at INTEGER
      )
    `);

    // 4. Fetch old users
    const oldUsers = await storage.query("SELECT * FROM users_old");

    // 5. Migrate users
    for (const user of oldUsers) {
      const userIdText = String(user.id);
      const isClerk = user.password_hash.startsWith('user_');
      const requiresReset = isClerk ? 1 : 0;
      const email = `${user.username}@example.com`;
      const name = user.username;
      const emailVerified = 1;

      // Parse created_at datetime string or use current date
      let timestampMs = Date.now();
      if (user.created_at) {
        const parsedDate = new Date(user.created_at);
        if (!isNaN(parsedDate.getTime())) {
          timestampMs = parsedDate.getTime();
        }
      }

      // Insert into new users table
      await storage.execute(
        `INSERT INTO users (id, name, email, email_verified, image, created_at, updated_at, role, username, requires_password_reset)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userIdText, name, email, emailVerified, null, timestampMs, timestampMs, user.role, user.username, requiresReset]
      );

      // For local users, move password hashes to the credentials account table (provider_id = 'credential')
      if (!isClerk) {
        const accountId = crypto.randomUUID();
        await storage.execute(
          `INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [accountId, userIdText, 'credential', userIdText, user.password_hash, timestampMs, timestampMs]
        );
      }
    }

    // 6. Migrate dependent tables

    // Migrate import_sessions
    await storage.execute("ALTER TABLE import_sessions RENAME TO import_sessions_old");
    await storage.execute(`
      CREATE TABLE import_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          template_id INTEGER,
          user_id TEXT,
          filename TEXT NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('pending', 'previewing', 'applied', 'cancelled')),
          total_rows INTEGER DEFAULT 0,
          applied_rows INTEGER DEFAULT 0,
          flagged_rows INTEGER DEFAULT 0,
          orders_data TEXT,
          created_at TEXT DEFAULT (datetime('now', 'localtime')),
          FOREIGN KEY (template_id) REFERENCES import_templates(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    await storage.execute(`
      INSERT INTO import_sessions (id, template_id, user_id, filename, status, total_rows, applied_rows, flagged_rows, orders_data, created_at)
      SELECT id, template_id, CAST(user_id AS TEXT), filename, status, total_rows, applied_rows, flagged_rows, orders_data, created_at
      FROM import_sessions_old
    `);
    await storage.execute("DROP TABLE import_sessions_old");

    // Migrate stock_movements
    await storage.execute("ALTER TABLE stock_movements RENAME TO stock_movements_old");
    await storage.execute(`
      CREATE TABLE stock_movements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          quantity_change INTEGER NOT NULL,
          movement_type TEXT NOT NULL CHECK(movement_type IN ('sale', 'return', 'write_off', 'manual_adjust', 'initial')),
          reference TEXT,
          user_id TEXT,
          created_at TEXT DEFAULT (datetime('now', 'localtime')),
          FOREIGN KEY (product_id) REFERENCES products(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    await storage.execute(`
      INSERT INTO stock_movements (id, product_id, quantity_change, movement_type, reference, user_id, created_at)
      SELECT id, product_id, quantity_change, movement_type, reference, CAST(user_id AS TEXT), created_at
      FROM stock_movements_old
    `);
    await storage.execute("DROP TABLE stock_movements_old");

    // Migrate stock_opnames
    await storage.execute("ALTER TABLE stock_opnames RENAME TO stock_opnames_old");
    await storage.execute(`
      CREATE TABLE stock_opnames (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          notes TEXT,
          created_at TEXT DEFAULT (datetime('now', 'localtime')),
          FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    await storage.execute(`
      INSERT INTO stock_opnames (id, user_id, notes, created_at)
      SELECT id, CAST(user_id AS TEXT), notes, created_at
      FROM stock_opnames_old
    `);
    await storage.execute("DROP TABLE stock_opnames_old");

    // Migrate chat_messages
    await storage.execute("ALTER TABLE chat_messages RENAME TO chat_messages_old");
    await storage.execute(`
      CREATE TABLE chat_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sender_id TEXT NOT NULL,
          receiver_id TEXT NOT NULL,
          message TEXT NOT NULL,
          product_id INTEGER,
          created_at TEXT DEFAULT (datetime('now', 'localtime')),
          is_read INTEGER DEFAULT 0,
          FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
      )
    `);
    await storage.execute(`
      INSERT INTO chat_messages (id, sender_id, receiver_id, message, product_id, created_at, is_read)
      SELECT id, CAST(sender_id AS TEXT), CAST(receiver_id AS TEXT), message, product_id, created_at, is_read
      FROM chat_messages_old
    `);
    await storage.execute("DROP TABLE chat_messages_old");

    // 7. Drop users_old
    await storage.execute("DROP TABLE users_old");

  } catch (err) {
    console.error("Migration failed:", err);
    throw err;
  } finally {
    // 8. Restore foreign_keys
    await storage.execute("PRAGMA foreign_keys = ON");
  }
}
