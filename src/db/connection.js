import { getActiveStorage } from './context.js';
import { hashPassword } from '../utils/crypto.js';
import { broadcast } from '../ws/broker.js';


// Helper to get auto-incrementing ID
async function getNextId(storage, counterKey) {
  const current = await storage.get(counterKey) || 0;
  const next = current + 1;
  await storage.put(counterKey, next);
  return next;
}

// Seeding implementation
export async function seedIfNeeded(storage) {
  const admin = await storage.get("user:1");
  if (admin) return; // Already seeded

  console.log("Database empty. Seeding initial data...");

  const adminHash = hashPassword('admin123');
  const staffHash = hashPassword('staff123');
  const now = new Date().toISOString();

  await storage.put("user:1", { id: 1, username: 'admin', password_hash: adminHash, role: 'admin', created_at: now });
  await storage.put("user:2", { id: 2, username: 'staff', password_hash: staffHash, role: 'staff', created_at: now });
  await storage.put("counter:users", 2);

  const products = [
    { name: 'Korek Api Model A', model: 'Model A', current_stock: 100, low_stock_threshold: 20 },
    { name: 'Korek Api Model B', model: 'Model B', current_stock: 80, low_stock_threshold: 15 },
    { name: 'Korek Api Model C', model: 'Model C', current_stock: 50, low_stock_threshold: 10 },
    { name: 'Korek Api Model D', model: 'Model D', current_stock: 3, low_stock_threshold: 10 }
  ];

  let prodId = 1;
  let movementId = 1;

  for (const p of products) {
    const id = prodId++;
    await storage.put(`product:${id}`, {
      id,
      name: p.name,
      model: p.model,
      description: null,
      current_stock: p.current_stock,
      low_stock_threshold: p.low_stock_threshold,
      created_at: now,
      updated_at: now
    });

    await storage.put(`movement:${movementId}`, {
      id: movementId++,
      product_id: id,
      quantity_change: p.current_stock,
      movement_type: 'initial',
      reference: 'Initial seeding',
      user_id: 1,
      created_at: now
    });
  }

  await storage.put("counter:products", prodId - 1);
  await storage.put("counter:stock_movements", movementId - 1);

  const shopeeMapping = {
    order_id: "No. Pesanan",
    resi_number: "No. Resi",
    product_name_raw: "Nama Produk",
    quantity: "Jumlah",
    order_status: "Status Pesanan",
    customer_name: "Username Pembeli",
    expedition: "Opsi Pengiriman",
    order_date: "Waktu Pembayaran",
    price: "Total Pembayaran"
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
    price: "Nilai Transaksi"
  };

  await storage.put("template:1", {
    id: 1,
    name: 'Shopee',
    column_mapping: JSON.stringify(shopeeMapping),
    created_at: now
  });

  await storage.put("template:2", {
    id: 2,
    name: 'Tokopedia',
    column_mapping: JSON.stringify(tokopediaMapping),
    created_at: now
  });

  await storage.put("counter:import_templates", 2);
  console.log("Database seeded successfully.");
}

// Export initialization placeholder to maintain current interface
export async function initDatabase() {
  // Not strictly required for KV, but we do seed check in the request context middleware
  return Promise.resolve();
}

// Model wrappers
export const db = {
  users: {
    async list() {
      const storage = getActiveStorage();
      const map = await storage.list({ prefix: "user:" });
      return [...map.values()];
    },
    async get(id) {
      const storage = getActiveStorage();
      return await storage.get(`user:${id}`);
    },
    async getByUsername(username) {
      const users = await this.list();
      return users.find(u => u.username === username);
    },
    async insert(user) {
      const storage = getActiveStorage();
      const id = await getNextId(storage, "counter:users");
      const newUser = {
        id,
        username: user.username,
        password_hash: user.password_hash,
        role: user.role,
        created_at: new Date().toISOString()
      };
      await storage.put(`user:${id}`, newUser);
      return newUser;
    },
    async delete(id) {
      const storage = getActiveStorage();
      return await storage.delete(`user:${id}`);
    }
  },

  products: {
    async list() {
      const storage = getActiveStorage();
      const map = await storage.list({ prefix: "product:" });
      return [...map.values()];
    },
    async get(id) {
      const storage = getActiveStorage();
      return await storage.get(`product:${id}`);
    },
    async getByName(name) {
      const products = await this.list();
      return products.find(p => p.name.toLowerCase() === name.toLowerCase());
    },
    async insert(product) {
      const storage = getActiveStorage();
      const id = await getNextId(storage, "counter:products");
      const now = new Date().toISOString();
      const newProduct = {
        id,
        name: product.name,
        model: product.model,
        description: product.description || null,
        current_stock: product.current_stock || 0,
        low_stock_threshold: product.low_stock_threshold || 10,
        created_at: now,
        updated_at: now
      };
      await storage.put(`product:${id}`, newProduct);
      broadcast({ type: 'PRODUCT_CREATED', payload: newProduct });
      return newProduct;
    },
    async update(id, updates) {
      const storage = getActiveStorage();
      const existing = await this.get(id);
      if (!existing) return null;
      const updated = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString()
      };
      await storage.put(`product:${id}`, updated);
      broadcast({ type: 'PRODUCT_UPDATED', payload: updated });
      return updated;
    },
    async delete(id) {
      const storage = getActiveStorage();
      const success = await storage.delete(`product:${id}`);
      if (success) {
        broadcast({ type: 'PRODUCT_DELETED', payload: { id } });
      }
      return success;
    }
  },

  movements: {
    async list() {
      const storage = getActiveStorage();
      const map = await storage.list({ prefix: "movement:" });
      return [...map.values()];
    },
    async get(id) {
      const storage = getActiveStorage();
      return await storage.get(`movement:${id}`);
    },
    async insert(movement) {
      const storage = getActiveStorage();
      const id = await getNextId(storage, "counter:stock_movements");
      const newMovement = {
        id,
        product_id: parseInt(movement.product_id, 10),
        quantity_change: parseInt(movement.quantity_change, 10),
        movement_type: movement.movement_type,
        reference: movement.reference || null,
        user_id: movement.user_id ? parseInt(movement.user_id, 10) : null,
        created_at: new Date().toISOString()
      };
      await storage.put(`movement:${id}`, newMovement);
      broadcast({ type: 'MOVEMENT_CREATED', payload: newMovement });
      return newMovement;
    }
  },

  templates: {
    async list() {
      const storage = getActiveStorage();
      const map = await storage.list({ prefix: "template:" });
      return [...map.values()];
    },
    async get(id) {
      const storage = getActiveStorage();
      return await storage.get(`template:${id}`);
    },
    async getByName(name) {
      const list = await this.list();
      return list.find(t => t.name.toLowerCase() === name.toLowerCase());
    },
    async insert(template) {
      const storage = getActiveStorage();
      const id = await getNextId(storage, "counter:import_templates");
      const newTemplate = {
        id,
        name: template.name,
        column_mapping: template.column_mapping,
        created_at: new Date().toISOString()
      };
      await storage.put(`template:${id}`, newTemplate);
      return newTemplate;
    },
    async update(id, updates) {
      const storage = getActiveStorage();
      const existing = await this.get(id);
      if (!existing) return null;
      const updated = {
        ...existing,
        ...updates
      };
      await storage.put(`template:${id}`, updated);
      return updated;
    },
    async delete(id) {
      const storage = getActiveStorage();
      return await storage.delete(`template:${id}`);
    }
  },

  sessions: {
    async list() {
      const storage = getActiveStorage();
      const map = await storage.list({ prefix: "session:" });
      return [...map.values()];
    },
    async get(id) {
      const storage = getActiveStorage();
      return await storage.get(`session:${id}`);
    },
    async insert(session) {
      const storage = getActiveStorage();
      const id = await getNextId(storage, "counter:import_sessions");
      const newSession = {
        id,
        template_id: session.template_id ? parseInt(session.template_id, 10) : null,
        user_id: session.user_id ? parseInt(session.user_id, 10) : null,
        filename: session.filename,
        status: session.status || 'pending',
        total_rows: parseInt(session.total_rows, 10) || 0,
        applied_rows: parseInt(session.applied_rows, 10) || 0,
        flagged_rows: parseInt(session.flagged_rows, 10) || 0,
        created_at: new Date().toISOString()
      };
      await storage.put(`session:${id}`, newSession);
      return newSession;
    },
    async update(id, updates) {
      const storage = getActiveStorage();
      const existing = await this.get(id);
      if (!existing) return null;
      const updated = {
        ...existing,
        ...updates
      };
      await storage.put(`session:${id}`, updated);
      return updated;
    }
  },

  orders: {
    async list() {
      const storage = getActiveStorage();
      const map = await storage.list({ prefix: "order:" });
      return [...map.values()];
    },
    async get(id) {
      const storage = getActiveStorage();
      return await storage.get(`order:${id}`);
    },
    async getByOrderId(orderId) {
      const list = await this.list();
      return list.find(o => o.order_id === orderId);
    },
    async insert(order) {
      const storage = getActiveStorage();
      const id = await getNextId(storage, "counter:orders");
      const newOrder = {
        id,
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
        resolved_at: order.resolved_at || null,
        created_at: new Date().toISOString()
      };
      await storage.put(`order:${id}`, newOrder);
      return newOrder;
    },
    async update(id, updates) {
      const storage = getActiveStorage();
      const existing = await this.get(id);
      if (!existing) return null;
      const updated = {
        ...existing,
        ...updates
      };
      await storage.put(`order:${id}`, updated);
      return updated;
    }
  },

  orderItems: {
    async list() {
      const storage = getActiveStorage();
      const map = await storage.list({ prefix: "order_item:" });
      return [...map.values()];
    },
    async get(id) {
      const storage = getActiveStorage();
      return await storage.get(`order_item:${id}`);
    },
    async getByOrderId(orderId) {
      const list = await this.list();
      return list.filter(item => item.order_id === parseInt(orderId, 10));
    },
    async insert(item) {
      const storage = getActiveStorage();
      const id = await getNextId(storage, "counter:order_items");
      const newItem = {
        id,
        order_id: parseInt(item.order_id, 10),
        product_id: item.product_id ? parseInt(item.product_id, 10) : null,
        quantity: parseInt(item.quantity, 10),
        parse_source: item.parse_source || 'direct',
        original_text: item.original_text || null,
        is_confirmed: item.is_confirmed !== undefined ? (item.is_confirmed ? 1 : 0) : 1,
        created_at: new Date().toISOString()
      };
      await storage.put(`order_item:${id}`, newItem);
      return newItem;
    },
    async update(id, updates) {
      const storage = getActiveStorage();
      const existing = await this.get(id);
      if (!existing) return null;
      const updated = {
        ...existing,
        ...updates
      };
      await storage.put(`order_item:${id}`, updated);
      return updated;
    }
  },

  opnames: {
    async list() {
      const storage = getActiveStorage();
      const map = await storage.list({ prefix: "opname:" });
      return [...map.values()];
    },
    async get(id) {
      const storage = getActiveStorage();
      return await storage.get(`opname:${id}`);
    },
    async insert(opname) {
      const storage = getActiveStorage();
      const id = await getNextId(storage, "counter:stock_opnames");
      const newOpname = {
        id,
        user_id: parseInt(opname.user_id, 10),
        notes: opname.notes || null,
        created_at: new Date().toISOString()
      };
      await storage.put(`opname:${id}`, newOpname);
      broadcast({ type: 'OPNAME_CREATED', payload: newOpname });
      return newOpname;
    }
  },

  opnameItems: {
    async list() {
      const storage = getActiveStorage();
      const map = await storage.list({ prefix: "opname_item:" });
      return [...map.values()];
    },
    async getByOpnameId(opnameId) {
      const list = await this.list();
      return list.filter(item => item.opname_id === parseInt(opnameId, 10));
    },
    async insert(item) {
      const storage = getActiveStorage();
      const id = await getNextId(storage, "counter:stock_opname_items");
      const newItem = {
        id,
        opname_id: parseInt(item.opname_id, 10),
        product_id: parseInt(item.product_id, 10),
        system_stock: parseInt(item.system_stock, 10),
        physical_stock: parseInt(item.physical_stock, 10),
        variance: parseInt(item.variance, 10)
      };
      await storage.put(`opname_item:${id}`, newItem);
      return newItem;
    }
  }
};
