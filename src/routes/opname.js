import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';

const opname = new Hono();

// Apply requireAuth to all routes
opname.use('*', requireAuth);

// GET / - List all opname entries
opname.get('/', async (c) => {
  try {
    const list = await db.prepare(`
      SELECT so.*, u.username, 
        (SELECT COUNT(*) FROM stock_opname_items WHERE opname_id = so.id) as items_count
      FROM stock_opnames so
      LEFT JOIN users u ON so.user_id = u.id
      ORDER BY so.created_at DESC
    `).all();
    return c.json(list.results);
  } catch (err) {
    console.error("List stock opnames error:", err);
    return c.json({ message: 'Failed to retrieve stock opnames' }, 500);
  }
});

// GET /:id - Get details of a single opname report
opname.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id)) {
      return c.json({ message: 'Invalid opname ID' }, 400);
    }

    const report = await db.prepare(`
      SELECT so.*, u.username
      FROM stock_opnames so
      LEFT JOIN users u ON so.user_id = u.id
      WHERE so.id = ?
    `).bind(id).first();

    if (!report) {
      return c.json({ message: 'Stock opname report not found' }, 404);
    }

    const items = await db.prepare(`
      SELECT soi.*, p.name, p.model
      FROM stock_opname_items soi
      LEFT JOIN products p ON soi.product_id = p.id
      WHERE soi.opname_id = ?
    `).bind(id).all();

    return c.json({
      ...report,
      items: items.results
    });
  } catch (err) {
    console.error("Get stock opname report error:", err);
    return c.json({ message: 'Failed to retrieve stock opname report' }, 500);
  }
});

// POST / - Create a new stock opname report
opname.post('/', async (c) => {
  try {
    const { notes, items } = await c.req.json();
    const user = c.get('user');

    if (!items || !Array.isArray(items) || items.length === 0) {
      return c.json({ message: 'Items are required' }, 400);
    }

    // Insert stock_opnames
    const insertOpnameRes = await db.prepare(`
      INSERT INTO stock_opnames (user_id, notes, created_at)
      VALUES (?, ?, datetime('now', 'localtime'))
    `).bind(user.id, notes || '').run();

    const opnameId = insertOpnameRes.meta.last_row_id;

    for (const item of items) {
      const { product_id, physical_stock } = item;
      const prodId = parseInt(product_id, 10);
      const physStock = parseInt(physical_stock, 10);

      if (isNaN(prodId) || isNaN(physStock)) {
        throw new Error('Invalid product_id or physical_stock');
      }

      // Query current_stock for the product
      const product = await db.prepare("SELECT current_stock FROM products WHERE id = ?").bind(prodId).first();
      if (!product) {
        throw new Error(`Product not found with ID ${prodId}`);
      }

      const systemStock = product.current_stock;
      const variance = physStock - systemStock;

      // Insert into stock_opname_items
      await db.prepare(`
        INSERT INTO stock_opname_items (opname_id, product_id, system_stock, physical_stock, variance)
        VALUES (?, ?, ?, ?, ?)
      `).bind(opnameId, prodId, systemStock, physStock, variance).run();

      // Update product's current_stock
      await db.prepare(`
        UPDATE products
        SET current_stock = ?, updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).bind(physStock, prodId).run();

      // Insert stock movement row
      await db.prepare(`
        INSERT INTO stock_movements (product_id, quantity_change, movement_type, reference, user_id)
        VALUES (?, ?, 'manual_adjust', ?, ?)
      `).bind(prodId, variance, `Stock Opname #${opnameId}`, user.id).run();
    }

    return c.json({ success: true, id: opnameId }, 201);
  } catch (err) {
    console.error("Create stock opname error:", err);
    return c.json({ message: err.message || 'Failed to create stock opname' }, 500);
  }
});

export default opname;
