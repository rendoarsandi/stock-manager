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
    const ordersList = await db.orders.list();
    const orderItemsList = await db.orderItems.list();
    const productsList = await db.products.list();

    const productMap = new Map(productsList.map(p => [p.id, p]));
    
    // Group order items by order ID
    const itemsByOrder = new Map();
    for (const item of orderItemsList) {
      if (!itemsByOrder.has(item.order_id)) {
        itemsByOrder.set(item.order_id, []);
      }
      const prod = item.product_id ? productMap.get(item.product_id) : null;
      itemsByOrder.get(item.order_id).push({
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        is_confirmed: item.is_confirmed,
        product_name: prod ? prod.name : 'Unmapped Product',
        product_model: prod ? prod.model : ''
      });
    }

    // Filter and map orders
    const filtered = ordersList
      .filter(o => o.system_status === 'needs_review')
      .map(o => ({
        ...o,
        items: itemsByOrder.get(o.id) || []
      }));

    // Sort by created_at DESC
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return c.json(filtered);
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

    const orderIdNum = parseInt(order_id, 10);

    // Verify order exists and needs review
    const order = await db.orders.get(orderIdNum);

    if (!order || order.system_status !== 'needs_review') {
      return c.json({ message: 'Order not found or already resolved' }, 404);
    }

    const user = c.get('user');

    if (resolution === 'investigating') {
      // Just update notes, keep flagged
      await db.orders.update(orderIdNum, {
        resolution: 'investigating',
        resolution_notes: resolution_notes || ''
      });
      
      return c.json({ success: true, status: 'needs_review' });
    }

    // Retrieve items for this order to apply stock changes
    const items = await db.orderItems.getByOrderId(orderIdNum);

    if (resolution === 'lost') {
      // Lost in transit -> Stock was NOT deducted on import, so we MUST deduct it now as a write-off!
      for (const item of items) {
        if (item.product_id) {
          // Log stock movement (negative change = write-off)
          await db.movements.insert({
            product_id: item.product_id,
            quantity_change: -item.quantity,
            movement_type: 'write_off',
            reference: `Lost Order ID: ${order.order_id}`,
            user_id: user.id
          });

          // Deduct from catalog
          const prod = await db.products.get(item.product_id);
          if (prod) {
            await db.products.update(item.product_id, {
              current_stock: prod.current_stock - item.quantity
            });
          }
        }
      }
    } else if (resolution === 'returned') {
      // Returned to warehouse -> Stock was NOT deducted on import, so no stock changes are needed (it returned to shelves).
      // We log a 0-change reference log for audit trail
      for (const item of items) {
        if (item.product_id) {
          await db.movements.insert({
            product_id: item.product_id,
            quantity_change: 0,
            movement_type: 'return',
            reference: `Returned Order ID: ${order.order_id} (No stock adjustment needed)`,
            user_id: user.id
          });
        }
      }
    }

    // Mark order as resolved
    await db.orders.update(orderIdNum, {
      system_status: 'resolved',
      resolution,
      resolution_notes: resolution_notes || '',
      resolved_at: new Date().toISOString()
    });

    return c.json({ success: true, status: 'resolved' });

  } catch (err) {
    console.error("Resolve order error:", err);
    return c.json({ message: 'Failed to resolve order' }, 500);
  }
});

// 3. Get all ambiguous order items awaiting mapping
review.get('/ambiguous', async (c) => {
  try {
    const orderItemsList = await db.orderItems.list();
    const ordersList = await db.orders.list();

    const orderMap = new Map(ordersList.map(o => [o.id, o]));

    const filtered = orderItemsList
      .filter(oi => oi.is_confirmed === 0)
      .map(oi => {
        const order = orderMap.get(oi.order_id);
        return {
          ...oi,
          order_id: order ? order.order_id : null,
          product_name_raw: order ? order.product_name_raw : null,
          order_qty: order ? order.quantity : null,
          customer_name: order ? order.customer_name : null,
          order_date: order ? order.order_date : null,
          created_at: order ? order.created_at : oi.created_at
        };
      });

    // Sort by order created_at DESC
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return c.json(filtered);
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

    const itemIdNum = parseInt(item_id, 10);
    const productIdNum = parseInt(product_id, 10);
    const qty = parseInt(quantity, 10);

    // Verify item exists and is unconfirmed
    const item = await db.orderItems.get(itemIdNum);

    if (!item || item.is_confirmed === 1) {
      return c.json({ message: 'Item not found or already confirmed' }, 404);
    }

    // Get order
    const order = await db.orders.get(item.order_id);
    if (!order) {
      return c.json({ message: 'Order not found' }, 404);
    }

    const user = c.get('user');

    // Update the item split to confirmed
    await db.orderItems.update(itemIdNum, {
      product_id: productIdNum,
      quantity: qty,
      is_confirmed: 1
    });

    // If order is normal (not cancelled), deduct stock since it was not deducted previously due to null product_id
    if (order.system_status === 'normal') {
      // Log stock movement
      await db.movements.insert({
        product_id: productIdNum,
        quantity_change: -qty,
        movement_type: 'sale',
        reference: `Confirmed Split Order: ${order.order_id}`,
        user_id: user.id
      });

      // Deduct stock
      const prod = await db.products.get(productIdNum);
      if (prod) {
        await db.products.update(productIdNum, {
          current_stock: prod.current_stock - qty
        });
      }
    }

    return c.json({ success: true });

  } catch (err) {
    console.error("Confirm split error:", err);
    return c.json({ message: 'Failed to confirm split mapping' }, 500);
  }
});

export default review;
