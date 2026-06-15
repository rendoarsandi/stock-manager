CREATE TABLE IF NOT EXISTS users (
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
);

CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    user_id TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account (
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
);

CREATE TABLE IF NOT EXISTS verification (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER,
    updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    model TEXT NOT NULL,
    description TEXT,
    current_stock INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS import_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    column_mapping TEXT NOT NULL, -- JSON string
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS import_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER,
    user_id TEXT,
    filename TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'previewing', 'applied', 'cancelled')),
    total_rows INTEGER DEFAULT 0,
    applied_rows INTEGER DEFAULT 0,
    flagged_rows INTEGER DEFAULT 0,
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
    is_confirmed INTEGER DEFAULT 1, -- 0 = pending review, 1 = confirmed
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    quantity_change INTEGER NOT NULL, -- negative for sales/loss, positive for returns/adjustments
    movement_type TEXT NOT NULL CHECK(movement_type IN ('sale', 'return', 'write_off', 'manual_adjust', 'initial')),
    reference TEXT, -- order_id, import_session_id, or description
    user_id TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stock_opnames (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS chat_messages (
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
);

