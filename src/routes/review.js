import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const review = new Hono();

// Apply requireAuth to all review endpoints
review.use('*', requireAuth);

// 1. Get all orders needing review (flagged as cancelled or stuck)
review.get('/orders', async (c) => {
  try {
    const query = `
      SELECT o.*, oi.id as item_id, oi.product_id, oi.quantity as item_qty, oi.is_confirmed, p.name as product_name, p.model as product_model
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.system_status = 'needs_review'
      ORDER BY o.created_at DESC
    `;
    
    const rows = (await db.prepare(query).all()).results;
    
    // Group rows by order ID
    const ordersMap = new Map();
    for (const row of rows) {
      if (!ordersMap.has(row.id)) {
        ordersMap.set(row.id, {
          id: row.id,
          import_session_id: row.import_session_id,
          order_id: row.order_id,
          resi_number: row.resi_number,
          product_name_raw: row.product_name_raw,
          quantity: row.quantity,
          order_status: row.order_status,
          customer_name: row.customer_name,
          expedition: row.expedition,
          order_date: row.order_date,
          price: row.price,
          system_status: row.system_status,
          created_at: row.created_at,
          items: []
        });
      }
      
      if (row.item_id) {
        ordersMap.get(row.id).items.push({
          id: row.item_id,
          product_id: row.product_id,
          quantity: row.item_qty,
          is_confirmed: row.is_confirmed,
          product_name: row.product_name || 'Unmapped Product',
          product_model: row.product_model || ''
        });
      }
    }
    
    return c.json(Array.from(ordersMap.values()));
  } catch (err) {
    console.error("Get review orders error:", err);
    return c.json({ message: 'Failed to retrieve orders needing review' }, 500);
  }
});

// 2. Resolve a flagged cancelled/stuck order
review.post('/resolve', async (c) => {
  try {
    const { order_id, resolution, resolution_notes } = await c.req.json();
    if (!order_id || !resolution) {
      return c.json({ message: 'Order ID and resolution selection are required' }, 400);
    }

    if (!['returned', 'lost', 'investigating'].includes(resolution)) {
      return c.json({ message: 'Invalid resolution option' }, 400);
    }

    // Verify order exists and needs review
    const order = await db.prepare("SELECT * FROM orders WHERE id = ? AND system_status = 'needs_review'")
      .bind(order_id)
      .first();

    if (!order) {
      return c.json({ message: 'Order not found or already resolved' }, 404);
    }

    const user = c.get('user');

    if (resolution === 'investigating') {
      // Just update notes, keep flagged
      await db.prepare(`
        UPDATE orders 
        SET resolution_notes = ?, resolution = 'investigating', updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).bind(resolution_notes || '', order_id).run();
      
      return c.json({ success: true, status: 'needs_review' });
    }

    // Retrieve items for this order to apply stock changes
    const items = (await db.prepare("SELECT * FROM order_items WHERE order_id = ?").bind(order_id).all()).results;

    if (resolution === 'lost') {
      // Lost in transit -> Stock was NOT deducted on import, so we MUST deduct it now as a write-off!
      for (const item of items) {
        if (item.product_id) {
          // Log stock movement (negative change = write-off)
          await db.prepare(`
            INSERT INTO stock_movements (product_id, quantity_change, movement_type, reference, user_id)
            VALUES (?, ?, 'write_off', ?, ?)
          `).bind(item.product_id, -item.quantity, `Lost Order ID: ${order.order_id}`, user.id).run();

          // Deduct from catalog
          const prod = await db.prepare("SELECT current_stock FROM products WHERE id = ?").bind(item.product_id).first();
          if (prod) {
            await db.prepare("UPDATE products SET current_stock = ?, updated_at = datetime('now', 'localtime') WHERE id = ?")
              .bind(prod.current_stock - item.quantity, item.product_id)
              .run();
          }
        }
      }
    } else if (resolution === 'returned') {
      // Returned to warehouse -> Stock was NOT deducted on import, so no stock changes are needed (it returned to shelves).
      // We log a 0-change reference log for audit trail (optional, but clean)
      for (const item of items) {
        if (item.product_id) {
          await db.prepare(`
            INSERT INTO stock_movements (product_id, quantity_change, movement_type, reference, user_id)
            VALUES (?, 0, 'return', ?, ?)
          `).bind(item.product_id, `Returned Order ID: ${order.order_id} (No stock adjustment needed)`, user.id).run();
        }
      }
    }

    // Mark order as resolved
    await db.prepare(`
      UPDATE orders 
      SET system_status = 'resolved', resolution = ?, resolution_notes = ?, resolved_at = datetime('now', 'localtime')
      WHERE id = ?
    `).bind(resolution, resolution_notes || '', order_id).run();

    return c.json({ success: true, status: 'resolved' });

  } catch (err) {
    console.error("Resolve order error:", err);
    return c.json({ message: 'Failed to resolve order' }, 500);
  }
});

// 3. Get all ambiguous order items awaiting mapping
review.get('/ambiguous', async (c) => {
  try {
    const query = `
      SELECT oi.*, o.order_id, o.product_name_raw, o.quantity as order_qty, o.customer_name, o.order_date
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.is_confirmed = 0
      ORDER BY o.created_at DESC
    `;
    const list = await db.prepare(query).all();
    return c.json(list.results);
  } catch (err) {
    console.error("Get ambiguous items error:", err);
    return c.json({ message: 'Failed to retrieve ambiguous items' }, 500);
  }
});

// 4. Confirm mapping/split for an ambiguous item
review.post('/confirm-split', async (c) => {
  try {
    const { item_id, product_id, quantity } = await c.req.json();
    if (!item_id || !product_id || !quantity) {
      return c.json({ message: 'Item ID, product selection, and quantity are required' }, 400);
    }

    // Verify item exists and is unconfirmed
    const item = await db.prepare(`
      SELECT oi.*, o.order_id, o.system_status 
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.id = ? AND oi.is_confirmed = 0
    `).bind(item_id).first();

    if (!item) {
      return c.json({ message: 'Item not found or already confirmed' }, 404);
    }

    const user = c.get('user');
    const qty = parseInt(quantity, 10);

    // Update the item split to confirmed
    await db.prepare(`
      UPDATE order_items 
      SET product_id = ?, quantity = ?, is_confirmed = 1 
      WHERE id = ?
    `).bind(product_id, qty, item_id).run();

    // If order is normal (not cancelled), deduct stock since it was not deducted previously due to null product_id
    if (item.system_status === 'normal') {
      // Log stock movement
      await db.prepare(`
        INSERT INTO stock_movements (product_id, quantity_change, movement_type, reference, user_id)
        VALUES (?, ?, 'sale', ?, ?)
      `).bind(product_id, -qty, `Confirmed Split Order: ${item.order_id}`, user.id).run();

      // Deduct stock
      const prod = await db.prepare("SELECT current_stock FROM products WHERE id = ?").bind(product_id).first();
      if (prod) {
        await db.prepare("UPDATE products SET current_stock = ?, updated_at = datetime('now', 'localtime') WHERE id = ?")
          .bind(prod.current_stock - qty, product_id)
          .run();
      }
    }

    return c.json({ success: true });

  } catch (err) {
    console.error("Confirm split error:", err);
    return c.json({ message: 'Failed to confirm split mapping' }, 500);
  }
});

export default review;
