import { getActiveStorage, getActiveDb } from './context.js';
import { eq, and, or, sql, inArray } from 'drizzle-orm';
import {
  users,
  products,
  productAliases,
  importTemplates,
  importSessions,
  orders,
  orderItems,
  stockMovements,
  stockOpnames,
  stockOpnameItems,
  skuMappings,
  chatMessages
} from './schema.js';
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
  const now = new Date().toISOString();
  let wasEmpty = false;

  // Seed users only in test mode — Clerk handles auth in production/dev
  if (process.env.NODE_ENV === 'test') {
    const existingUsers = await storage.query("SELECT * FROM users WHERE username = ?", ['admin']);
    if (!existingUsers || existingUsers.length === 0) {
      wasEmpty = true;
      const adminHash = hashPassword(process.env.SEED_ADMIN_PASSWORD || 'admin123');
      await storage.execute("INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)", [1, 'admin', adminHash, 'admin', now]);
    }
    const existingStaff = await storage.query("SELECT * FROM users WHERE username = ?", ['staff']);
    if (!existingStaff || existingStaff.length === 0) {
      const staffHash = hashPassword('staff123');
      await storage.execute("INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)", [2, 'staff', staffHash, 'staff', now]);
    }
  }

  // Check if products need seeding
  const existingProducts = await storage.query("SELECT * FROM products LIMIT 1");
  const hasProducts = existingProducts && existingProducts.length > 0;

  if (!hasProducts) {
    // Seed products whenever the products table is empty (independent of user seeding)
    {
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

      console.log("Database seeded successfully.");
    }

    // Attempt to seed SKU mappings during initial database seeding
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
  }
}

// Export initialization placeholder to maintain current interface
export async function initDatabase() {
  return Promise.resolve();
}

// SQL-backed model wrappers
export const db = {
  aliases: {
    async get(cleanText) {
      const db = getActiveDb();
      const rows = await db.select({ productId: productAliases.product_id })
        .from(productAliases)
        .where(eq(productAliases.clean_text, cleanText.toLowerCase()));
      return rows[0] ? rows[0].productId : undefined;
    },
    async set(cleanText, productId) {
      const db = getActiveDb();
      await db.insert(productAliases)
        .values({
          clean_text: cleanText.toLowerCase(),
          product_id: parseInt(productId, 10)
        })
        .onConflictDoUpdate({
          target: productAliases.clean_text,
          set: { product_id: parseInt(productId, 10) }
        });
    }
  },

  skuMappings: {
    async list() {
      const db = getActiveDb();
      return await db.select({
        sku_code: skuMappings.sku_code,
        product_id: skuMappings.product_id,
        quantity: skuMappings.quantity,
        product_name: products.name,
        product_model: products.model
      })
      .from(skuMappings)
      .innerJoin(products, eq(skuMappings.product_id, products.id));
    },
    async getBySku(skuCode) {
      const db = getActiveDb();
      return await db.select({
        sku_code: skuMappings.sku_code,
        product_id: skuMappings.product_id,
        quantity: skuMappings.quantity,
        product_name: products.name,
        product_model: products.model
      })
      .from(skuMappings)
      .innerJoin(products, eq(skuMappings.product_id, products.id))
      .where(eq(sql`lower(${skuMappings.sku_code})`, skuCode.toLowerCase()));
    },
    async insert(mapping) {
      const db = getActiveDb();
      await db.insert(skuMappings)
        .values({
          sku_code: mapping.sku_code.toLowerCase(),
          product_id: parseInt(mapping.product_id, 10),
          quantity: parseInt(mapping.quantity, 10)
        })
        .onConflictDoUpdate({
          target: [skuMappings.sku_code, skuMappings.product_id],
          set: { quantity: parseInt(mapping.quantity, 10) }
        });
      return true;
    },
    async delete(skuCode, productId) {
      const db = getActiveDb();
      await db.delete(skuMappings)
        .where(
          and(
            eq(sql`lower(${skuMappings.sku_code})`, skuCode.toLowerCase()),
            eq(skuMappings.product_id, parseInt(productId, 10))
          )
        );
      return true;
    }
  },

  users: {
    async list() {
      const db = getActiveDb();
      return await db.select().from(users);
    },
    async get(id) {
      const db = getActiveDb();
      const rows = await db.select().from(users).where(eq(users.id, parseInt(id, 10)));
      return rows[0] || null;
    },
    async getByUsername(username) {
      const db = getActiveDb();
      const rows = await db.select().from(users).where(eq(users.username, username));
      return rows[0] || null;
    },
    async insert(user) {
      const db = getActiveDb();
      const rows = await db.insert(users).values({
        username: user.username,
        password_hash: user.password_hash,
        role: user.role
      }).returning();
      return rows[0] || null;
    },
    async delete(id) {
      const db = getActiveDb();
      await db.delete(users).where(eq(users.id, parseInt(id, 10)));
      return true;
    }
  },

  products: {
    async list() {
      const db = getActiveDb();
      return await db.select().from(products);
    },
    async get(id) {
      const db = getActiveDb();
      const rows = await db.select().from(products).where(eq(products.id, parseInt(id, 10)));
      return rows[0] || null;
    },
    async getByName(name) {
      const db = getActiveDb();
      const rows = await db.select().from(products).where(eq(sql`lower(${products.name})`, name.toLowerCase()));
      return rows[0] || null;
    },
    async insert(product) {
      const db = getActiveDb();
      
      // Find lowest unused ID starting from 1
      const allProducts = await db.select({ id: products.id }).from(products);
      const existingIds = new Set(allProducts.map(p => p.id));
      let targetId = 1;
      while (existingIds.has(targetId)) {
        targetId++;
      }

      const rows = await db.insert(products).values({
        id: targetId,
        name: product.name,
        model: product.model,
        master_sku: product.master_sku || null,
        description: product.description || null,
        current_stock: product.current_stock || 0,
        low_stock_threshold: product.low_stock_threshold || 10
      }).returning();
      const newProduct = rows[0] || null;
      if (newProduct) {
        broadcast({ type: 'PRODUCT_CREATED', payload: newProduct });
      }
      return newProduct;
    },
    async update(id, updates) {
      const db = getActiveDb();
      const setValues = {};
      if (updates.name !== undefined) setValues.name = updates.name;
      if (updates.model !== undefined) setValues.model = updates.model;
      if (updates.master_sku !== undefined) setValues.master_sku = updates.master_sku;
      if (updates.description !== undefined) setValues.description = updates.description;
      if (updates.current_stock !== undefined) {
        const parsed = parseInt(updates.current_stock, 10);
        setValues.current_stock = isNaN(parsed) ? 0 : parsed;
      }
      if (updates.low_stock_threshold !== undefined) {
        const parsed = parseInt(updates.low_stock_threshold, 10);
        setValues.low_stock_threshold = isNaN(parsed) ? 10 : parsed;
      }

      const rows = await db.update(products)
        .set({
          ...setValues,
          updated_at: sql`datetime('now', 'localtime')`
        })
        .where(eq(products.id, parseInt(id, 10)))
        .returning();
      const updated = rows[0] || null;
      if (updated) {
        broadcast({ type: 'PRODUCT_UPDATED', payload: updated });
      }
      return updated;
    },
    async delete(id) {
      const productId = parseInt(id, 10);
      const storage = getActiveStorage();
      await storage.executeTransaction([
        { sql: "DELETE FROM order_items WHERE product_id = ?", params: [productId] },
        { sql: "DELETE FROM stock_movements WHERE product_id = ?", params: [productId] },
        { sql: "DELETE FROM product_aliases WHERE product_id = ?", params: [productId] },
        { sql: "DELETE FROM stock_opname_items WHERE product_id = ?", params: [productId] },
        { sql: "DELETE FROM sku_mappings WHERE product_id = ?", params: [productId] },
        { sql: "DELETE FROM products WHERE id = ?", params: [productId] }
      ]);
      broadcast({ type: 'PRODUCT_DELETED', payload: { id } });
      return true;
    }
  },

  movements: {
    async list() {
      const db = getActiveDb();
      return await db.select().from(stockMovements);
    },
    async get(id) {
      const db = getActiveDb();
      const rows = await db.select().from(stockMovements).where(eq(stockMovements.id, parseInt(id, 10)));
      return rows[0] || null;
    },
    async insert(movement) {
      const db = getActiveDb();
      const insertValues = {
        product_id: parseInt(movement.product_id, 10),
        quantity_change: parseInt(movement.quantity_change, 10),
        movement_type: movement.movement_type,
        reference: movement.reference || null,
        user_id: movement.user_id ? parseInt(movement.user_id, 10) : null
      };
      if (movement.created_at) {
        insertValues.created_at = movement.created_at;
      }
      const rows = await db.insert(stockMovements).values(insertValues).returning();
      const newMovement = rows[0] || null;
      if (newMovement) {
        broadcast({ type: 'MOVEMENT_CREATED', payload: newMovement });
      }
      return newMovement;
    }
  },

  templates: {
    async list() {
      const db = getActiveDb();
      return await db.select().from(importTemplates);
    },
    async get(id) {
      const db = getActiveDb();
      const rows = await db.select().from(importTemplates).where(eq(importTemplates.id, parseInt(id, 10)));
      return rows[0] || null;
    },
    async getByName(name) {
      const db = getActiveDb();
      const rows = await db.select().from(importTemplates).where(eq(sql`lower(${importTemplates.name})`, name.toLowerCase()));
      return rows[0] || null;
    },
    async insert(template) {
      const db = getActiveDb();
      const rows = await db.insert(importTemplates).values({
        name: template.name,
        column_mapping: template.column_mapping
      }).returning();
      return rows[0] || null;
    },
    async update(id, updates) {
      const db = getActiveDb();
      const setValues = {};
      if (updates.name !== undefined) setValues.name = updates.name;
      if (updates.column_mapping !== undefined) setValues.column_mapping = updates.column_mapping;

      const rows = await db.update(importTemplates)
        .set(setValues)
        .where(eq(importTemplates.id, parseInt(id, 10)))
        .returning();
      return rows[0] || null;
    },
    async delete(id) {
      const db = getActiveDb();
      await db.delete(importTemplates).where(eq(importTemplates.id, parseInt(id, 10)));
      return true;
    }
  },

  sessions: {
    async list() {
      const db = getActiveDb();
      return await db.select().from(importSessions);
    },
    async get(id) {
      const db = getActiveDb();
      const rows = await db.select().from(importSessions).where(eq(importSessions.id, parseInt(id, 10)));
      return rows[0] || null;
    },
    async insert(session) {
      const db = getActiveDb();
      const rows = await db.insert(importSessions).values({
        template_id: session.template_id ? parseInt(session.template_id, 10) : null,
        user_id: session.user_id ? parseInt(session.user_id, 10) : null,
        filename: session.filename,
        status: session.status || 'pending',
        total_rows: parseInt(session.total_rows, 10) || 0,
        applied_rows: parseInt(session.applied_rows, 10) || 0,
        flagged_rows: parseInt(session.flagged_rows, 10) || 0,
        orders_data: session.orders_data || null
      }).returning();
      return rows[0] || null;
    },
    async update(id, updates) {
      const db = getActiveDb();
      const setValues = {};
      if (updates.template_id !== undefined) setValues.template_id = updates.template_id ? parseInt(updates.template_id, 10) : null;
      if (updates.user_id !== undefined) setValues.user_id = updates.user_id ? parseInt(updates.user_id, 10) : null;
      if (updates.filename !== undefined) setValues.filename = updates.filename;
      if (updates.status !== undefined) setValues.status = updates.status;
      if (updates.total_rows !== undefined) setValues.total_rows = parseInt(updates.total_rows, 10);
      if (updates.applied_rows !== undefined) setValues.applied_rows = parseInt(updates.applied_rows, 10);
      if (updates.flagged_rows !== undefined) setValues.flagged_rows = parseInt(updates.flagged_rows, 10);
      if (updates.orders_data !== undefined) setValues.orders_data = updates.orders_data;

      const rows = await db.update(importSessions)
        .set(setValues)
        .where(eq(importSessions.id, parseInt(id, 10)))
        .returning();
      const updated = rows[0] || null;
      if (updated) {
        broadcast({ type: 'SESSION_UPDATED', payload: updated });
      }
      return updated;
    }
  },

  orders: {
    async list() {
      const db = getActiveDb();
      return await db.select().from(orders);
    },
    async get(id) {
      const db = getActiveDb();
      const rows = await db.select().from(orders).where(eq(orders.id, parseInt(id, 10)));
      return rows[0] || null;
    },
    async getByOrderId(orderId) {
      const db = getActiveDb();
      const rows = await db.select().from(orders).where(eq(orders.order_id, orderId));
      return rows[0] || null;
    },
    async insert(order) {
      const db = getActiveDb();
      const rows = await db.insert(orders).values({
        import_session_id: parseInt(order.import_session_id, 10),
        order_id: order.order_id,
        resi_number: order.resi_number || null,
        product_name_raw: order.product_name_raw,
        quantity: parseInt(order.quantity, 10),
        order_status: order.order_status,
        customer_name: order.customer_name || null,
        expedition: order.expedition || null,
        order_date: order.order_date || null,
        price: parseFloat(order.price) || 0,
        system_status: order.system_status || 'normal',
        resolution: order.resolution || null,
        resolution_notes: order.resolution_notes || null,
        resolved_at: order.resolved_at || null
      }).returning();
      const newOrder = rows[0] || null;
      if (newOrder) {
        broadcast({ type: 'ORDER_CREATED', payload: newOrder });
      }
      return newOrder;
    },
    async update(id, updates) {
      const db = getActiveDb();
      const setValues = {};
      if (updates.import_session_id !== undefined) setValues.import_session_id = parseInt(updates.import_session_id, 10);
      if (updates.order_id !== undefined) setValues.order_id = updates.order_id;
      if (updates.resi_number !== undefined) setValues.resi_number = updates.resi_number;
      if (updates.product_name_raw !== undefined) setValues.product_name_raw = updates.product_name_raw;
      if (updates.quantity !== undefined) setValues.quantity = parseInt(updates.quantity, 10);
      if (updates.order_status !== undefined) setValues.order_status = updates.order_status;
      if (updates.customer_name !== undefined) setValues.customer_name = updates.customer_name;
      if (updates.expedition !== undefined) setValues.expedition = updates.expedition;
      if (updates.order_date !== undefined) setValues.order_date = updates.order_date;
      if (updates.price !== undefined) {
        const parsed = parseFloat(updates.price);
        setValues.price = isNaN(parsed) ? 0 : parsed;
      }
      if (updates.system_status !== undefined) setValues.system_status = updates.system_status;
      if (updates.resolution !== undefined) setValues.resolution = updates.resolution;
      if (updates.resolution_notes !== undefined) setValues.resolution_notes = updates.resolution_notes;
      if (updates.resolved_at !== undefined) setValues.resolved_at = updates.resolved_at;

      const rows = await db.update(orders)
        .set(setValues)
        .where(eq(orders.id, parseInt(id, 10)))
        .returning();
      const updated = rows[0] || null;
      if (updated) {
        broadcast({ type: 'ORDER_UPDATED', payload: updated });
      }
      return updated;
    }
  },

  orderItems: {
    async list() {
      const db = getActiveDb();
      return await db.select().from(orderItems);
    },
    async get(id) {
      const db = getActiveDb();
      const rows = await db.select().from(orderItems).where(eq(orderItems.id, parseInt(id, 10)));
      return rows[0] || null;
    },
    async getByOrderId(orderId) {
      const db = getActiveDb();
      return await db.select().from(orderItems).where(eq(orderItems.order_id, parseInt(orderId, 10)));
    },
    async insert(item) {
      const db = getActiveDb();
      const rows = await db.insert(orderItems).values({
        order_id: parseInt(item.order_id, 10),
        product_id: item.product_id ? parseInt(item.product_id, 10) : null,
        quantity: parseInt(item.quantity, 10),
        parse_source: item.parse_source || 'direct',
        original_text: item.original_text || null,
        is_confirmed: item.is_confirmed !== undefined ? (item.is_confirmed ? 1 : 0) : 1
      }).returning();
      return rows[0] || null;
    },
    async update(id, updates) {
      const db = getActiveDb();
      const setValues = {};
      if (updates.order_id !== undefined) setValues.order_id = parseInt(updates.order_id, 10);
      if (updates.product_id !== undefined) setValues.product_id = updates.product_id ? parseInt(updates.product_id, 10) : null;
      if (updates.quantity !== undefined) setValues.quantity = parseInt(updates.quantity, 10);
      if (updates.parse_source !== undefined) setValues.parse_source = updates.parse_source;
      if (updates.original_text !== undefined) setValues.original_text = updates.original_text;
      if (updates.is_confirmed !== undefined) setValues.is_confirmed = updates.is_confirmed ? 1 : 0;

      const rows = await db.update(orderItems)
        .set(setValues)
        .where(eq(orderItems.id, parseInt(id, 10)))
        .returning();
      const updated = rows[0] || null;
      if (updated) {
        broadcast({ type: 'ORDER_ITEM_UPDATED', payload: updated });
      }
      return updated;
    }
  },

  opnames: {
    async list() {
      const db = getActiveDb();
      return await db.select().from(stockOpnames);
    },
    async get(id) {
      const db = getActiveDb();
      const rows = await db.select().from(stockOpnames).where(eq(stockOpnames.id, parseInt(id, 10)));
      return rows[0] || null;
    },
    async insert(opname) {
      const db = getActiveDb();
      const insertValues = {
        user_id: parseInt(opname.user_id, 10),
        notes: opname.notes || null
      };
      if (opname.created_at) {
        insertValues.created_at = opname.created_at;
      }
      const rows = await db.insert(stockOpnames).values(insertValues).returning();
      const newOpname = rows[0] || null;
      if (newOpname) {
        broadcast({ type: 'OPNAME_CREATED', payload: newOpname });
      }
      return newOpname;
    }
  },

  opnameItems: {
    async list() {
      const db = getActiveDb();
      return await db.select().from(stockOpnameItems);
    },
    async getByOpnameId(opnameId) {
      const db = getActiveDb();
      return await db.select().from(stockOpnameItems).where(eq(stockOpnameItems.opname_id, parseInt(opnameId, 10)));
    },
    async insert(item) {
      const db = getActiveDb();
      const rows = await db.insert(stockOpnameItems).values({
        opname_id: parseInt(item.opname_id, 10),
        product_id: parseInt(item.product_id, 10),
        system_stock: parseInt(item.system_stock, 10),
        physical_stock: parseInt(item.physical_stock, 10),
        variance: parseInt(item.variance, 10)
      }).returning();
      return rows[0] || null;
    }
  },

  chatMessages: {
    async listMessages(userId, otherUserId) {
      const db = getActiveDb();
      return await db.select({
        id: chatMessages.id,
        sender_id: chatMessages.sender_id,
        receiver_id: chatMessages.receiver_id,
        message: chatMessages.message,
        product_id: chatMessages.product_id,
        created_at: chatMessages.created_at,
        is_read: chatMessages.is_read,
        product_name: products.name,
        product_model: products.model,
        product_current_stock: products.current_stock
      })
      .from(chatMessages)
      .leftJoin(products, eq(chatMessages.product_id, products.id))
      .where(
        or(
          and(eq(chatMessages.sender_id, userId), eq(chatMessages.receiver_id, otherUserId)),
          and(eq(chatMessages.sender_id, otherUserId), eq(chatMessages.receiver_id, userId))
        )
      )
      .orderBy(chatMessages.id);
    },
    async insert(message) {
      const db = getActiveDb();
      const rows = await db.insert(chatMessages).values({
        sender_id: parseInt(message.sender_id, 10),
        receiver_id: parseInt(message.receiver_id, 10),
        message: message.message,
        product_id: message.product_id ? parseInt(message.product_id, 10) : null,
        is_read: 0
      }).returning();
      return rows[0] || null;
    },
    async getContacts(userId) {
      const db = getActiveDb();
      const userMessages = await db.select()
        .from(chatMessages)
        .where(
          or(
            eq(chatMessages.sender_id, userId),
            eq(chatMessages.receiver_id, userId)
          )
        )
        .orderBy(chatMessages.id);

      if (userMessages.length === 0) {
        return [];
      }

      const groupedMap = new Map();
      for (const msg of userMessages) {
        const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
        let info = groupedMap.get(otherUserId);
        if (!info) {
          info = {
            last_message: '',
            last_message_time: '',
            unread_count: 0
          };
          groupedMap.set(otherUserId, info);
        }
        info.last_message = msg.message;
        info.last_message_time = msg.created_at;
        
        if (msg.receiver_id === userId && msg.is_read === 0) {
          info.unread_count += 1;
        }
      }

      const otherUserIds = Array.from(groupedMap.keys());
      if (otherUserIds.length === 0) {
        return [];
      }

      const otherUsers = await db.select({ id: users.id, username: users.username, role: users.role })
        .from(users)
        .where(inArray(users.id, otherUserIds));

      const contacts = otherUsers.map(u => {
        const info = groupedMap.get(u.id);
        return {
          id: u.id,
          username: u.username,
          role: u.role,
          last_message: info.last_message,
          last_message_time: info.last_message_time,
          unread_count: info.unread_count
        };
      });

      contacts.sort((a, b) => b.last_message_time.localeCompare(a.last_message_time));
      return contacts;
    },
    async markAsRead(senderId, receiverId) {
      const db = getActiveDb();
      await db.update(chatMessages)
        .set({ is_read: 1 })
        .where(
          and(
            eq(chatMessages.sender_id, parseInt(senderId, 10)),
            eq(chatMessages.receiver_id, parseInt(receiverId, 10)),
            eq(chatMessages.is_read, 0)
          )
        );
      return true;
    }
  }
};
