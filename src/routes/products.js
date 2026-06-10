import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const products = new Hono();

// Apply requireAuth middleware to all product routes
products.use('*', requireAuth);

// 1. List all products
products.get('/', async (c) => {
  try {
    const list = await db.prepare("SELECT * FROM products ORDER BY name ASC").all();
    return c.json(list.results);
  } catch (err) {
    console.error("List products error:", err);
    return c.json({ message: 'Failed to retrieve products' }, 500);
  }
});

// Stock Ledger
products.get('/ledger', async (c) => {
  try {
    const list = await db.prepare(`
      SELECT sm.*, p.name, p.model, u.username
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      LEFT JOIN users u ON sm.user_id = u.id
      ORDER BY sm.created_at DESC
    `).all();
    return c.json(list.results);
  } catch (err) {
    console.error("List ledger error:", err);
    return c.json({ message: 'Failed to retrieve stock ledger' }, 500);
  }
});

// 2. Add a new product (Admin only)
products.post('/', requireRole('admin'), async (c) => {
  try {
    const { name, model, description, initial_stock, low_stock_threshold } = await c.req.json();
    
    if (!name || !model) {
      return c.json({ message: 'Product name and model are required' }, 400);
    }

    const user = c.get('user');
    const threshold = low_stock_threshold !== undefined ? parseInt(low_stock_threshold, 10) : 10;
    const stock = initial_stock !== undefined ? parseInt(initial_stock, 10) : 0;

    // Check if product with name already exists
    const existing = await db.prepare("SELECT id FROM products WHERE name = ?").bind(name).first();
    if (existing) {
      return c.json({ message: 'Product name already exists' }, 400);
    }

    // Insert product
    const insertRes = await db.prepare(`
      INSERT INTO products (name, model, description, current_stock, low_stock_threshold)
      VALUES (?, ?, ?, ?, ?)
    `).bind(name, model, description || '', stock, threshold).run();

    const productId = insertRes.meta.changes > 0 ? insertRes.meta.last_row_id : null;

    if (productId && stock !== 0) {
      // Create initial stock movement
      await db.prepare(`
        INSERT INTO stock_movements (product_id, quantity_change, movement_type, reference, user_id)
        VALUES (?, ?, 'initial', 'Initial product creation stock', ?)
      `).bind(productId, stock, user.id).run();
    }

    return c.json({ success: true, id: productId }, 201);
  } catch (err) {
    console.error("Add product error:", err);
    return c.json({ message: 'Failed to create product' }, 500);
  }
});

// 3. Edit product details (Admin only)
products.put('/:id', requireRole('admin'), async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    const { name, model, description, low_stock_threshold } = await c.req.json();

    if (!name || !model) {
      return c.json({ message: 'Product name and model are required' }, 400);
    }

    // Check if name is taken by another product
    const existing = await db.prepare("SELECT id FROM products WHERE name = ? AND id != ?").bind(name, id).first();
    if (existing) {
      return c.json({ message: 'Product name already exists' }, 400);
    }

    const threshold = low_stock_threshold !== undefined ? parseInt(low_stock_threshold, 10) : 10;

    await db.prepare(`
      UPDATE products 
      SET name = ?, model = ?, description = ?, low_stock_threshold = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).bind(name, model, description || '', threshold, id).run();

    return c.json({ success: true });
  } catch (err) {
    console.error("Edit product error:", err);
    return c.json({ message: 'Failed to update product' }, 500);
  }
});

// 4. Adjust stock manually (Any authenticated user)
products.post('/:id/adjust-stock', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    const { quantity_change, movement_type, reference } = await c.req.json();

    if (quantity_change === undefined || isNaN(parseInt(quantity_change, 10))) {
      return c.json({ message: 'Valid quantity change is required' }, 400);
    }

    const change = parseInt(quantity_change, 10);
    const type = movement_type || 'manual_adjust';
    const ref = reference || 'Manual stock adjustment';
    const user = c.get('user');

    // Verify product exists
    const product = await db.prepare("SELECT current_stock FROM products WHERE id = ?").bind(id).first();
    if (!product) {
      return c.json({ message: 'Product not found' }, 404);
    }

    // Record stock movement
    await db.prepare(`
      INSERT INTO stock_movements (product_id, quantity_change, movement_type, reference, user_id)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, change, type, ref, user.id).run();

    // Update current stock in product table
    const newStock = product.current_stock + change;
    await db.prepare(`
      UPDATE products 
      SET current_stock = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).bind(newStock, id).run();

    return c.json({ success: true, current_stock: newStock });
  } catch (err) {
    console.error("Adjust stock error:", err);
    return c.json({ message: 'Failed to adjust stock' }, 500);
  }
});

export default products;
