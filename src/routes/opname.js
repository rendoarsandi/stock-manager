import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';

const opname = new Hono();

// Apply requireAuth to all routes
opname.use('*', requireAuth);

// GET / - List all opname entries
opname.get('/', async (c) => {
  try {
    const opnamesList = await db.opnames.list();
    const usersList = await db.users.list();
    const itemsList = await db.opnameItems.list();

    const userMap = new Map(usersList.map(u => [u.id, u]));

    // Calculate count of items per opname ID
    const countMap = new Map();
    for (const item of itemsList) {
      countMap.set(item.opname_id, (countMap.get(item.opname_id) || 0) + 1);
    }

    const joined = opnamesList.map(so => {
      const user = userMap.get(so.user_id);
      return {
        ...so,
        username: user ? user.username : null,
        items_count: countMap.get(so.id) || 0
      };
    });

    // Sort by created_at DESC
    joined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return c.json(joined);
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

    const report = await db.opnames.get(id);
    if (!report) {
      return c.json({ message: 'Stock opname report not found' }, 404);
    }

    const user = await db.users.get(report.user_id);
    const opnameItemsList = await db.opnameItems.getByOpnameId(id);
    const productsList = await db.products.list();
    const productMap = new Map(productsList.map(p => [p.id, p]));

    const joinedItems = opnameItemsList.map(soi => {
      const prod = productMap.get(soi.product_id);
      return {
        ...soi,
        name: prod ? prod.name : null,
        model: prod ? prod.model : null
      };
    });

    return c.json({
      ...report,
      username: user ? user.username : null,
      items: joinedItems
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

    // Validate all items before inserting anything
    for (const item of items) {
      const { product_id, physical_stock } = item;
      const prodId = parseInt(product_id, 10);
      const physStock = parseInt(physical_stock, 10);

      if (isNaN(prodId) || isNaN(physStock) || physStock < 0) {
        return c.json({ message: 'Invalid product_id or physical_stock' }, 400);
      }
    }

    // Insert stock_opnames
    const newOpname = await db.opnames.insert({
      user_id: user.id,
      notes: notes || ''
    });

    const opnameId = newOpname.id;

    for (const item of items) {
      const { product_id, physical_stock } = item;
      const prodId = parseInt(product_id, 10);
      const physStock = parseInt(physical_stock, 10);

      // Query current_stock for the product
      const product = await db.products.get(prodId);
      if (!product) {
        throw new Error(`Product not found with ID ${prodId}`);
      }

      const systemStock = product.current_stock;
      const variance = physStock - systemStock;

      // Insert into stock_opname_items
      await db.opnameItems.insert({
        opname_id: opnameId,
        product_id: prodId,
        system_stock: systemStock,
        physical_stock: physStock,
        variance
      });

      // Update product's current_stock
      await db.products.update(prodId, {
        current_stock: physStock
      });

      // Insert stock movement row
      await db.movements.insert({
        product_id: prodId,
        quantity_change: variance,
        movement_type: 'manual_adjust',
        reference: `Stock Opname #${opnameId}`,
        user_id: user.id
      });
    }

    return c.json({ success: true, id: opnameId }, 201);
  } catch (err) {
    console.error("Create stock opname error:", err);
    return c.json({ message: err.message || 'Failed to create stock opname' }, 500);
  }
});

export default opname;
