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
    const list = await db.products.list();
    // Sort by name alphabetically
    list.sort((a, b) => a.name.localeCompare(b.name));
    return c.json(list);
  } catch (err) {
    console.error("List products error:", err);
    return c.json({ message: 'Failed to retrieve products' }, 500);
  }
});

// Stock Ledger
products.get('/ledger', async (c) => {
  try {
    const movements = await db.movements.list();
    const productsList = await db.products.list();
    const usersList = await db.users.list();

    // Create lookup maps
    const productMap = new Map(productsList.map(p => [p.id, p]));
    const userMap = new Map(usersList.map(u => [u.id, u]));

    // Join products and users in memory
    const joined = movements.map(m => {
      const prod = productMap.get(m.product_id);
      const user = m.user_id ? userMap.get(m.user_id) : null;
      return {
        ...m,
        name: prod ? prod.name : null,
        model: prod ? prod.model : null,
        username: user ? user.username : null
      };
    });

    // Sort by created_at DESC
    joined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return c.json(joined);
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
    const existing = await db.products.getByName(name);
    if (existing) {
      return c.json({ message: 'Product name already exists' }, 400);
    }

    // Insert product
    const inserted = await db.products.insert({
      name,
      model,
      description: description || '',
      current_stock: stock,
      low_stock_threshold: threshold
    });

    if (stock !== 0) {
      // Create initial stock movement
      await db.movements.insert({
        product_id: inserted.id,
        quantity_change: stock,
        movement_type: 'initial',
        reference: 'Initial product creation stock',
        user_id: user.id
      });
    }

    return c.json({ success: true, id: inserted.id }, 201);
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
    const existing = await db.products.getByName(name);
    if (existing && existing.id !== id) {
      return c.json({ message: 'Product name already exists' }, 400);
    }

    const threshold = low_stock_threshold !== undefined ? parseInt(low_stock_threshold, 10) : 10;

    await db.products.update(id, {
      name,
      model,
      description: description || '',
      low_stock_threshold: threshold
    });

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
    const product = await db.products.get(id);
    if (!product) {
      return c.json({ message: 'Product not found' }, 404);
    }

    // Record stock movement
    await db.movements.insert({
      product_id: id,
      quantity_change: change,
      movement_type: type,
      reference: ref,
      user_id: user.id
    });

    // Update current stock in product table
    const newStock = product.current_stock + change;
    await db.products.update(id, {
      current_stock: newStock
    });

    return c.json({ success: true, current_stock: newStock });
  } catch (err) {
    console.error("Adjust stock error:", err);
    return c.json({ message: 'Failed to adjust stock' }, 500);
  }
});

export default products;
