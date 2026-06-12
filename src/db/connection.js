import { getActiveStorage } from './context.js';
import { hashPassword } from '../utils/crypto.js';
import { broadcast } from '../ws/broker.js';
import productsSeed from './products_seed.json' with { type: 'json' };
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';

let __filename = '';
let __dirname = '';
try {
  __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
} catch (e) {}

// Seeding implementation using SQL statements
export async function seedIfNeeded(storage) {
  // Seed users if empty
  const existingUsers = await storage.query("SELECT * FROM users WHERE id = 1");
  const now = new Date().toISOString();
  let wasEmpty = false;
  if (!existingUsers || existingUsers.length === 0) {
    wasEmpty = true;
    const adminHash = hashPassword('admin123');
    const staffHash = hashPassword('staff123');
    await storage.execute("INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)", [1, 'admin', adminHash, 'admin', now]);
    await storage.execute("INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)", [2, 'staff', staffHash, 'staff', now]);
  }

  // Check if products need seeding
  const existingProducts = await storage.query("SELECT * FROM products LIMIT 1");
  if (existingProducts && existingProducts.length > 0) return;

  // Only seed products if the database was completely fresh (i.e. we had to seed users)
  if (!wasEmpty) return;

  console.log("Database empty. Seeding initial data...");

  // Helper function to clean up and structure product names
  function getProductName(groupName, variationSku, skuInduk) {
    if (!variationSku) return groupName;
    if (variationSku === skuInduk) return groupName;

    let prefix = '';
    if (skuInduk && skuInduk.includes('_')) {
      prefix = skuInduk.split('_')[0] + '_';
    } else if (skuInduk) {
      let i = 0;
      while (i < skuInduk.length && i < variationSku.length && skuInduk[i] === variationSku[i]) {
        i++;
      }
      if (i > 0) {
        prefix = skuInduk.substring(0, i);
      }
    }

    if (prefix && variationSku.startsWith(prefix)) {
      const suffix = variationSku.substring(prefix.length).replace(/_/g, ' ').trim();
      if (suffix) {
        const capitalized = suffix.charAt(0).toUpperCase() + suffix.slice(1).toLowerCase();
        return `${groupName} - ${capitalized}`;
      }
    }

    return `${groupName} - ${variationSku}`;
  }

  let products = [];

  if (process.env.NODE_ENV === 'test') {
    products = [
      { name: 'Korek Api Model A', model: 'Model A', current_stock: 100, low_stock_threshold: 20 },
      { name: 'Korek Api Model B', model: 'Model B', current_stock: 80, low_stock_threshold: 15 },
      { name: 'Korek Api Model C', model: 'Model C', current_stock: 50, low_stock_threshold: 10 },
      { name: 'Korek Api Model D', model: 'Model D', current_stock: 3, low_stock_threshold: 10 }
    ];
  } else {
    products = productsSeed;
  }

  for (const p of products) {
    const res = await storage.execute(
      "INSERT INTO products (name, model, master_sku, description, current_stock, low_stock_threshold, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [p.name, p.model, p.master_sku || null, null, p.current_stock, p.low_stock_threshold, now, now]
    );
    const productId = res.lastInsertRowid;

    await storage.execute(
      "INSERT INTO stock_movements (product_id, quantity_change, movement_type, reference, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [productId, p.current_stock, 'initial', 'Initial seeding', 1, now]
    );
  }

  const shopeeMapping = {
    order_id: "No. Pesanan",
    resi_number: "No. Resi",
    product_name_raw: "Nama Produk",
    quantity: "Jumlah",
    order_status: "Status Pesanan",
    customer_name: "Username Pembeli",
    expedition: "Opsi Pengiriman",
    order_date: "Waktu Pembayaran",
    price: "Total Pembayaran",
    sku_ref: "Nomor Referensi SKU"
  };

  const tokopediaMapping = {
    order_id: "Nomor Invoice",
    resi_number: "Nomor Resi",
    product_name_raw: "Nama Produk",
    quantity: "Jumlah Produk",
    order_status: "Status Terakhir",
    customer_name: "Nama Pembeli",
    expedition: "Kurir",
    order_date: "Tanggal Transaksi",
    price: "Nilai Transaksi",
    sku_ref: "Nomor Referensi SKU"
  };

  await storage.execute(
    "INSERT OR IGNORE INTO import_templates (id, name, column_mapping, created_at) VALUES (?, ?, ?, ?)",
    [1, 'Shopee', JSON.stringify(shopeeMapping), now]
  );

  await storage.execute(
    "INSERT OR IGNORE INTO import_templates (id, name, column_mapping, created_at) VALUES (?, ?, ?, ?)",
    [2, 'Tokopedia', JSON.stringify(tokopediaMapping), now]
  );

  // Dynamic seeding for SKU mappings
  try {
    const { BUNDLE_MAPPINGS } = await import('../services/ambiguous-parser.js');
    for (const [skuCode, items] of Object.entries(BUNDLE_MAPPINGS)) {
      for (const item of items) {
        const prodRows = await storage.query("SELECT id FROM products WHERE LOWER(name) = ? OR LOWER(model) = ?", [item.name.toLowerCase(), item.name.toLowerCase()]);
        if (prodRows && prodRows[0]) {
          await storage.execute(
            "INSERT OR IGNORE INTO sku_mappings (sku_code, product_id, quantity) VALUES (?, ?, ?)",
            [skuCode.toLowerCase(), prodRows[0].id, item.qty]
          );
        }
      }
    }
  } catch (err) {
    console.error("Error seeding SKU mappings:", err);
  }

  console.log("Database seeded successfully.");
}

// Export initialization placeholder to maintain current interface
export async function initDatabase() {
  return Promise.resolve();
}

// SQL-backed model wrappers
export const db = {
  aliases: {
    async get(cleanText) {
      const storage = getActiveStorage();
      const rows = await storage.query("SELECT product_id FROM product_aliases WHERE clean_text = ?", [cleanText.toLowerCase()]);
      return rows[0] ? rows[0].product_id : undefined;
    },
    async set(cleanText, productId) {
      const storage = getActiveStorage();
      await storage.execute(
        "INSERT OR REPLACE INTO product_aliases (clean_text, product_id) VALUES (?, ?)",
        [cleanText.toLowerCase(), parseInt(productId, 10)]
      );
    }
  },

  skuMappings: {
    async list() {
      const storage = getActiveStorage();
      return await storage.query(
        "SELECT sm.*, p.name as product_name, p.model as product_model FROM sku_mappings sm JOIN products p ON sm.product_id = p.id"
      );
    },
    async getBySku(skuCode) {
      const storage = getActiveStorage();
      return await storage.query(
        "SELECT sm.*, p.name as product_name, p.model as product_model FROM sku_mappings sm JOIN products p ON sm.product_id = p.id WHERE LOWER(sm.sku_code) = LOWER(?)",
        [skuCode]
      );
    },
    async insert(mapping) {
      const storage = getActiveStorage();
      await storage.execute(
        "INSERT OR REPLACE INTO sku_mappings (sku_code, product_id, quantity) VALUES (?, ?, ?)",
        [mapping.sku_code.toLowerCase(), parseInt(mapping.product_id, 10), parseInt(mapping.quantity, 10)]
      );
      return true;
    },
    async delete(skuCode, productId) {
      const storage = getActiveStorage();
      await storage.execute(
        "DELETE FROM sku_mappings WHERE LOWER(sku_code) = LOWER(?) AND product_id = ?",
        [skuCode, parseInt(productId, 10)]
      );
      return true;
    }
  },

  users: {
    async list() {
      const storage = getActiveStorage();
      return await storage.query("SELECT * FROM users");
    },
    async get(id) {
      const storage = getActiveStorage();
      const rows = await storage.query("SELECT * FROM users WHERE id = ?", [id]);
      return rows[0] || null;
    },
    async getByUsername(username) {
      const storage = getActiveStorage();
      const rows = await storage.query("SELECT * FROM users WHERE username = ?", [username]);
      return rows[0] || null;
    },
    async insert(user) {
      const storage = getActiveStorage();
      const result = await storage.execute(
        "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, datetime('now', 'localtime'))",
        [user.username, user.password_hash, user.role]
      );
      return await this.get(result.lastInsertRowid);
    },
    async delete(id) {
      const storage = getActiveStorage();
      await storage.execute("DELETE FROM users WHERE id = ?", [id]);
      return true;
    }
  },

  products: {
    async list() {
      const storage = getActiveStorage();
      return await storage.query("SELECT * FROM products");
    },
    async get(id) {
      const storage = getActiveStorage();
      const rows = await storage.query("SELECT * FROM products WHERE id = ?", [id]);
      return rows[0] || null;
    },
    async getByName(name) {
      const storage = getActiveStorage();
      const rows = await storage.query("SELECT * FROM products WHERE LOWER(name) = LOWER(?)", [name]);
      return rows[0] || null;
    },
    async insert(product) {
      const storage = getActiveStorage();
      const result = await storage.execute(
        "INSERT INTO products (name, model, master_sku, description, current_stock, low_stock_threshold, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))",
        [product.name, product.model, product.master_sku || null, product.description || null, product.current_stock || 0, product.low_stock_threshold || 10]
      );
      const newProduct = await this.get(result.lastInsertRowid);
      broadcast({ type: 'PRODUCT_CREATED', payload: newProduct });
      return newProduct;
    },
    async update(id, updates) {
      const storage = getActiveStorage();
      const existing = await this.get(id);
      if (!existing) return null;
      
      const merged = { ...existing, ...updates };
      await storage.execute(
        "UPDATE products SET name = ?, model = ?, master_sku = ?, description = ?, current_stock = ?, low_stock_threshold = ?, updated_at = datetime('now', 'localtime') WHERE id = ?",
        [merged.name, merged.model, merged.master_sku, merged.description, merged.current_stock, merged.low_stock_threshold, id]
      );
      const updated = await this.get(id);
      broadcast({ type: 'PRODUCT_UPDATED', payload: updated });
      return updated;
    },
    async delete(id) {
      const storage = getActiveStorage();
      // Clean up child tables to prevent foreign key violations or data inconsistency
      await storage.execute("DELETE FROM order_items WHERE product_id = ?", [id]);
      await storage.execute("DELETE FROM stock_movements WHERE product_id = ?", [id]);
      await storage.execute("DELETE FROM product_aliases WHERE product_id = ?", [id]);
      await storage.execute("DELETE FROM products WHERE id = ?", [id]);
      broadcast({ type: 'PRODUCT_DELETED', payload: { id } });
      return true;
    }
  },

  movements: {
    async list() {
      const storage = getActiveStorage();
      return await storage.query("SELECT * FROM stock_movements");
    },
    async get(id) {
      const storage = getActiveStorage();
      const rows = await storage.query("SELECT * FROM stock_movements WHERE id = ?", [id]);
      return rows[0] || null;
    },
    async insert(movement) {
      const storage = getActiveStorage();
      const result = await storage.execute(
        "INSERT INTO stock_movements (product_id, quantity_change, movement_type, reference, user_id, created_at) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))",
        [parseInt(movement.product_id, 10), parseInt(movement.quantity_change, 10), movement.movement_type, movement.reference || null, movement.user_id ? parseInt(movement.user_id, 10) : null]
      );
      const newMovement = await this.get(result.lastInsertRowid);
      broadcast({ type: 'MOVEMENT_CREATED', payload: newMovement });
      return newMovement;
    }
  },

  templates: {
    async list() {
      const storage = getActiveStorage();
      return await storage.query("SELECT * FROM import_templates");
    },
    async get(id) {
      const storage = getActiveStorage();
      const rows = await storage.query("SELECT * FROM import_templates WHERE id = ?", [id]);
      return rows[0] || null;
    },
    async getByName(name) {
      const storage = getActiveStorage();
      const rows = await storage.query("SELECT * FROM import_templates WHERE LOWER(name) = LOWER(?)", [name]);
      return rows[0] || null;
    },
    async insert(template) {
      const storage = getActiveStorage();
      const result = await storage.execute(
        "INSERT INTO import_templates (name, column_mapping, created_at) VALUES (?, ?, datetime('now', 'localtime'))",
        [template.name, template.column_mapping]
      );
      return await this.get(result.lastInsertRowid);
    },
    async update(id, updates) {
      const storage = getActiveStorage();
      const existing = await this.get(id);
      if (!existing) return null;
      const merged = { ...existing, ...updates };
      await storage.execute(
        "UPDATE import_templates SET name = ?, column_mapping = ? WHERE id = ?",
        [merged.name, merged.column_mapping, id]
      );
      return await this.get(id);
    },
    async delete(id) {
      const storage = getActiveStorage();
      await storage.execute("DELETE FROM import_templates WHERE id = ?", [id]);
      return true;
    }
  },

  sessions: {
    async list() {
      const storage = getActiveStorage();
      return await storage.query("SELECT * FROM import_sessions");
    },
    async get(id) {
      const storage = getActiveStorage();
      const rows = await storage.query("SELECT * FROM import_sessions WHERE id = ?", [id]);
      return rows[0] || null;
    },
    async insert(session) {
      const storage = getActiveStorage();
      const result = await storage.execute(
        "INSERT INTO import_sessions (template_id, user_id, filename, status, total_rows, applied_rows, flagged_rows, orders_data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))",
        [
          session.template_id ? parseInt(session.template_id, 10) : null,
          session.user_id ? parseInt(session.user_id, 10) : null,
          session.filename,
          session.status || 'pending',
          parseInt(session.total_rows, 10) || 0,
          parseInt(session.applied_rows, 10) || 0,
          parseInt(session.flagged_rows, 10) || 0,
          session.orders_data || null
        ]
      );
      return await this.get(result.lastInsertRowid);
    },
    async update(id, updates) {
      const storage = getActiveStorage();
      const existing = await this.get(id);
      if (!existing) return null;
      const merged = { ...existing, ...updates };
      await storage.execute(
        "UPDATE import_sessions SET template_id = ?, user_id = ?, filename = ?, status = ?, total_rows = ?, applied_rows = ?, flagged_rows = ?, orders_data = ? WHERE id = ?",
        [
          merged.template_id ? parseInt(merged.template_id, 10) : null,
          merged.user_id ? parseInt(merged.user_id, 10) : null,
          merged.filename,
          merged.status,
          parseInt(merged.total_rows, 10) || 0,
          parseInt(merged.applied_rows, 10) || 0,
          parseInt(merged.flagged_rows, 10) || 0,
          merged.orders_data || null,
          id
        ]
      );
      const updated = await this.get(id);
      broadcast({ type: 'SESSION_UPDATED', payload: updated });
      return updated;
    }
  },

  orders: {
    async list() {
      const storage = getActiveStorage();
      return await storage.query("SELECT * FROM orders");
    },
    async get(id) {
      const storage = getActiveStorage();
      const rows = await storage.query("SELECT * FROM orders WHERE id = ?", [id]);
      return rows[0] || null;
    },
    async getByOrderId(orderId) {
      const storage = getActiveStorage();
      const rows = await storage.query("SELECT * FROM orders WHERE order_id = ?", [orderId]);
      return rows[0] || null;
    },
    async insert(order) {
      const storage = getActiveStorage();
      const result = await storage.execute(
        "INSERT INTO orders (import_session_id, order_id, resi_number, product_name_raw, quantity, order_status, customer_name, expedition, order_date, price, system_status, resolution, resolution_notes, resolved_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))",
        [
          parseInt(order.import_session_id, 10),
          order.order_id,
          order.resi_number || null,
          order.product_name_raw,
          parseInt(order.quantity, 10),
          order.order_status,
          order.customer_name || null,
          order.expedition || null,
          order.order_date || null,
          parseFloat(order.price) || 0,
          order.system_status || 'normal',
          order.resolution || null,
          order.resolution_notes || null,
          order.resolved_at || null
        ]
      );
      const newOrder = await this.get(result.lastInsertRowid);
      broadcast({ type: 'ORDER_CREATED', payload: newOrder });
      return newOrder;
    },
    async update(id, updates) {
      const storage = getActiveStorage();
      const existing = await this.get(id);
      if (!existing) return null;
      const merged = { ...existing, ...updates };
      await storage.execute(
        "UPDATE orders SET import_session_id = ?, order_id = ?, resi_number = ?, product_name_raw = ?, quantity = ?, order_status = ?, customer_name = ?, expedition = ?, order_date = ?, price = ?, system_status = ?, resolution = ?, resolution_notes = ?, resolved_at = ? WHERE id = ?",
        [
          parseInt(merged.import_session_id, 10),
          merged.order_id,
          merged.resi_number || null,
          merged.product_name_raw,
          parseInt(merged.quantity, 10),
          merged.order_status,
          merged.customer_name || null,
          merged.expedition || null,
          merged.order_date || null,
          parseFloat(merged.price) || 0,
          merged.system_status,
          merged.resolution || null,
          merged.resolution_notes || null,
          merged.resolved_at || null,
          id
        ]
      );
      const updated = await this.get(id);
      broadcast({ type: 'ORDER_UPDATED', payload: updated });
      return updated;
    }
  },

  orderItems: {
    async list() {
      const storage = getActiveStorage();
      return await storage.query("SELECT * FROM order_items");
    },
    async get(id) {
      const storage = getActiveStorage();
      const rows = await storage.query("SELECT * FROM order_items WHERE id = ?", [id]);
      return rows[0] || null;
    },
    async getByOrderId(orderId) {
      const storage = getActiveStorage();
      return await storage.query("SELECT * FROM order_items WHERE order_id = ?", [parseInt(orderId, 10)]);
    },
    async insert(item) {
      const storage = getActiveStorage();
      const result = await storage.execute(
        "INSERT INTO order_items (order_id, product_id, quantity, parse_source, original_text, is_confirmed) VALUES (?, ?, ?, ?, ?, ?)",
        [
          parseInt(item.order_id, 10),
          item.product_id ? parseInt(item.product_id, 10) : null,
          parseInt(item.quantity, 10),
          item.parse_source || 'direct',
          item.original_text || null,
          item.is_confirmed !== undefined ? (item.is_confirmed ? 1 : 0) : 1
        ]
      );
      return await this.get(result.lastInsertRowid);
    },
    async update(id, updates) {
      const storage = getActiveStorage();
      const existing = await this.get(id);
      if (!existing) return null;
      const merged = { ...existing, ...updates };
      await storage.execute(
        "UPDATE order_items SET order_id = ?, product_id = ?, quantity = ?, parse_source = ?, original_text = ?, is_confirmed = ? WHERE id = ?",
        [
          parseInt(merged.order_id, 10),
          merged.product_id ? parseInt(merged.product_id, 10) : null,
          parseInt(merged.quantity, 10),
          merged.parse_source,
          merged.original_text || null,
          merged.is_confirmed !== undefined ? (merged.is_confirmed ? 1 : 0) : 1,
          id
        ]
      );
      const updated = await this.get(id);
      broadcast({ type: 'ORDER_ITEM_UPDATED', payload: updated });
      return updated;
    }
  },

  opnames: {
    async list() {
      const storage = getActiveStorage();
      return await storage.query("SELECT * FROM stock_opnames");
    },
    async get(id) {
      const storage = getActiveStorage();
      const rows = await storage.query("SELECT * FROM stock_opnames WHERE id = ?", [id]);
      return rows[0] || null;
    },
    async insert(opname) {
      const storage = getActiveStorage();
      const result = await storage.execute(
        "INSERT INTO stock_opnames (user_id, notes, created_at) VALUES (?, ?, datetime('now', 'localtime'))",
        [parseInt(opname.user_id, 10), opname.notes || null]
      );
      const newOpname = await this.get(result.lastInsertRowid);
      broadcast({ type: 'OPNAME_CREATED', payload: newOpname });
      return newOpname;
    }
  },

  opnameItems: {
    async list() {
      const storage = getActiveStorage();
      return await storage.query("SELECT * FROM stock_opname_items");
    },
    async getByOpnameId(opnameId) {
      const storage = getActiveStorage();
      return await storage.query("SELECT * FROM stock_opname_items WHERE opname_id = ?", [parseInt(opnameId, 10)]);
    },
    async insert(item) {
      const storage = getActiveStorage();
      const result = await storage.execute(
        "INSERT INTO stock_opname_items (opname_id, product_id, system_stock, physical_stock, variance) VALUES (?, ?, ?, ?, ?)",
        [
          parseInt(item.opname_id, 10),
          parseInt(item.product_id, 10),
          parseInt(item.system_stock, 10),
          parseInt(item.physical_stock, 10),
          parseInt(item.variance, 10)
        ]
      );
      const rows = await storage.query("SELECT * FROM stock_opname_items WHERE id = ?", [result.lastInsertRowid]);
      return rows[0] || null;
    }
  }
};
