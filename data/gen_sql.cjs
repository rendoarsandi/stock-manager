const fs = require('fs');
const db = JSON.parse(fs.readFileSync('./data/db.json', 'utf8'));

const lines = [];

const escape = v => {
  if (v === null || v === undefined) return 'NULL';
  return "'" + String(v).replace(/'/g, "''") + "'";
};

lines.push('-- ============================================');
lines.push('-- Stock Manager - DO SQLite Migration');
lines.push('-- Generated from data/db.json');
lines.push('-- ============================================');
lines.push('');

// Schema (with master_sku added to products)
lines.push(`PRAGMA foreign_keys = OFF;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS sku_mappings;
DROP TABLE IF EXISTS stock_opname_items;
DROP TABLE IF EXISTS stock_opnames;
DROP TABLE IF EXISTS stock_movements;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS import_sessions;
DROP TABLE IF EXISTS import_templates;
DROP TABLE IF EXISTS product_aliases;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK(role IN ('admin', 'staff')),
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    model TEXT,
    master_sku TEXT,
    description TEXT,
    current_stock INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS product_aliases (
    clean_text TEXT PRIMARY KEY,
    product_id INTEGER NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS import_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    column_mapping TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS import_sessions (
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

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    import_session_id INTEGER NOT NULL,
    order_id TEXT NOT NULL,
    resi_number TEXT,
    product_name_raw TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    order_status TEXT NOT NULL,
    customer_name TEXT,
    expedition TEXT,
    order_date TEXT,
    price REAL DEFAULT 0,
    system_status TEXT NOT NULL CHECK(system_status IN ('normal', 'needs_review', 'resolved')),
    resolution TEXT CHECK(resolution IN ('returned', 'lost', 'investigating')),
    resolution_notes TEXT,
    resolved_at TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (import_session_id) REFERENCES import_sessions(id)
);

CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER,
    quantity INTEGER NOT NULL,
    parse_source TEXT NOT NULL CHECK(parse_source IN ('direct', 'auto_split')),
    original_text TEXT,
    is_confirmed INTEGER DEFAULT 1,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS stock_movements (
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

CREATE TABLE IF NOT EXISTS stock_opnames (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stock_opname_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opname_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    system_stock INTEGER NOT NULL,
    physical_stock INTEGER NOT NULL,
    variance INTEGER NOT NULL,
    FOREIGN KEY (opname_id) REFERENCES stock_opnames(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS sku_mappings (
    sku_code TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    PRIMARY KEY (sku_code, product_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_messages (
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

// Users
lines.push('-- ============================================');
lines.push('-- Users');
lines.push('-- ============================================');
const users = Object.entries(db)
  .filter(([k]) => k.startsWith('user:'))
  .sort((a, b) => a[1].id - b[1].id);

for (const [, u] of users) {
  lines.push(`INSERT INTO users (id, username, password_hash, role, created_at) VALUES (${u.id}, ${escape(u.username)}, ${escape(u.password_hash)}, ${escape(u.role)}, ${escape(u.created_at)});`);
}
lines.push('');

// Products
lines.push('-- ============================================');
lines.push('-- Products');
lines.push('-- ============================================');
const products = Object.entries(db)
  .filter(([k]) => k.startsWith('product:'))
  .sort((a, b) => a[1].id - b[1].id);

for (const [, p] of products) {
  lines.push(`INSERT INTO products (id, name, model, master_sku, description, current_stock, low_stock_threshold, created_at, updated_at) VALUES (${p.id}, ${escape(p.name)}, ${escape(p.model || null)}, ${escape(p.master_sku || null)}, ${escape(p.description)}, ${p.current_stock}, ${p.low_stock_threshold}, ${escape(p.created_at)}, ${escape(p.updated_at)});`);
}
lines.push('');

// Movements
lines.push('-- ============================================');
lines.push('-- Stock Movements');
lines.push('-- ============================================');
const movements = Object.entries(db)
  .filter(([k]) => k.startsWith('movement:'))
  .sort((a, b) => a[1].id - b[1].id);

for (const [, m] of movements) {
  lines.push(`INSERT INTO stock_movements (id, product_id, quantity_change, movement_type, reference, user_id, created_at) VALUES (${m.id}, ${m.product_id}, ${m.quantity_change}, ${escape(m.movement_type)}, ${escape(m.reference)}, ${m.user_id}, ${escape(m.created_at)});`);
}
lines.push('');

// SKU Mappings
lines.push('-- ============================================');
lines.push('-- SKU Mappings');
lines.push('-- ============================================');
const skuMappings = Object.entries(db)
  .filter(([k]) => k.startsWith('sku_mapping:'))
  .sort((a, b) => a[0].localeCompare(b[0]));

for (const [, sm] of skuMappings) {
  lines.push(`INSERT INTO sku_mappings (sku_code, product_id, quantity) VALUES (${escape(sm.sku_code)}, ${sm.product_id}, ${sm.quantity});`);
}
lines.push('');

// Product Aliases
lines.push('-- ============================================');
lines.push('-- Product Aliases');
lines.push('-- ============================================');
const productAliases = Object.entries(db)
  .filter(([k]) => k.startsWith('product_alias:'))
  .sort((a, b) => a[0].localeCompare(b[0]));

for (const [, pa] of productAliases) {
  lines.push(`INSERT INTO product_aliases (clean_text, product_id) VALUES (${escape(pa.clean_text)}, ${pa.product_id});`);
}
lines.push('');

lines.push('-- End of migration');

fs.writeFileSync('./data/migrate.sql', lines.join('\n'), 'utf8');
console.log('Done! Records: users=' + users.length + ' products=' + products.length + ' movements=' + movements.length + ' sku_mappings=' + skuMappings.length + ' product_aliases=' + productAliases.length);
