import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { parseExcel } from '../services/excel-parser.js';
import { parseAmbiguousDescription } from '../services/ambiguous-parser.js';

const imports = new Hono();

// All import routes require authentication
imports.use('*', requireAuth);

// 1. List all templates
imports.get('/templates', async (c) => {
  try {
    const templates = await db.templates.list();
    // Parse mapping string back to JSON objects for the frontend
    const result = templates.map(t => ({
      ...t,
      column_mapping: JSON.parse(t.column_mapping)
    }));
    // Sort templates by name alphabetically
    result.sort((a, b) => a.name.localeCompare(b.name));
    return c.json(result);
  } catch (err) {
    console.error("List templates error:", err);
    return c.json({ message: 'Failed to retrieve templates' }, 500);
  }
});

// 2. Create or Update Template (Admin only)
imports.post('/templates', requireRole('admin'), async (c) => {
  try {
    const { id, name, column_mapping } = await c.req.json();
    if (!name || !column_mapping) {
      return c.json({ message: 'Template name and column mapping are required' }, 400);
    }

    const mappingStr = JSON.stringify(column_mapping);

    if (id) {
      // Update
      await db.templates.update(parseInt(id, 10), {
        name,
        column_mapping: mappingStr
      });
      return c.json({ success: true, id: parseInt(id, 10) });
    } else {
      // Insert
      const existing = await db.templates.getByName(name);
      if (existing) {
        return c.json({ message: 'Template name already exists' }, 400);
      }

      const inserted = await db.templates.insert({
        name,
        column_mapping: mappingStr
      });

      return c.json({ success: true, id: inserted.id }, 201);
    }
  } catch (err) {
    console.error("Save template error:", err);
    return c.json({ message: 'Failed to save template' }, 500);
  }
});

// DELETE /templates/:id (requires admin role): deletes an import template
imports.delete('/templates/:id', requireRole('admin'), async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    const existing = await db.templates.get(id);
    if (!existing) {
      return c.json({ message: 'Template not found' }, 404);
    }

    await db.templates.delete(id);
    return c.json({ success: true });
  } catch (err) {
    console.error("Delete template error:", err);
    return c.json({ message: 'Failed to delete template' }, 500);
  }
});

// 3. Upload Excel and return parsing preview
imports.post('/upload', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body.file;
    const templateId = parseInt(body.template_id, 10);

    if (!file || !templateId) {
      return c.json({ message: 'Excel file and template selection are required' }, 400);
    }

    // Retrieve template column mapping
    const template = await db.templates.get(templateId);
    if (!template) {
      return c.json({ message: 'Template not found' }, 404);
    }
    const mapping = JSON.parse(template.column_mapping);

    // Retrieve product catalog for matching
    const catalog = await db.products.list();

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse rows
    const parsedRows = parseExcel(buffer, mapping);
    
    const previewOrders = [];
    let flaggedRowsCount = 0;

    // Process each row to check for duplicates, status, and splits
    for (const row of parsedRows) {
      if (!row.order_id) continue; // Skip empty rows

      // Check if duplicate order_id exists in the database
      const existingOrder = await db.orders.getByOrderId(row.order_id);
      const isDuplicate = !!existingOrder;

      // Check order status for cancellation / stuck expedition (batal/cancel)
      const orderStatusNorm = String(row.order_status).toLowerCase();
      const needsReview = orderStatusNorm.includes('batal') || orderStatusNorm.includes('cancel');
      const systemStatus = needsReview ? 'needs_review' : 'normal';

      if (needsReview) {
        flaggedRowsCount++;
      }

      // Generate suggested splits using ambiguous parser
      const suggestedSplits = parseAmbiguousDescription(row.product_name_raw, row.quantity, catalog);

      // Flag as ambiguous if any split has no product matched
      const hasAmbiguous = suggestedSplits.some(s => s.product_id === null) || suggestedSplits.length > 1;

      previewOrders.push({
        order_id: row.order_id,
        resi_number: row.resi_number || '',
        product_name_raw: row.product_name_raw,
        quantity: row.quantity,
        order_status: row.order_status,
        customer_name: row.customer_name || '',
        expedition: row.expedition || '',
        order_date: row.order_date || '',
        price: row.price || 0,
        system_status: systemStatus,
        is_duplicate: isDuplicate,
        has_ambiguous: hasAmbiguous,
        splits: suggestedSplits
      });
    }

    const user = c.get('user');
    
    // Create a pending import session
    const insertedSession = await db.sessions.insert({
      template_id: templateId,
      user_id: user.id,
      filename: file.name,
      status: 'previewing',
      total_rows: previewOrders.length,
      flagged_rows: flaggedRowsCount
    });

    return c.json({
      session_id: insertedSession.id,
      filename: file.name,
      total_rows: previewOrders.length,
      flagged_rows: flaggedRowsCount,
      orders: previewOrders
    });

  } catch (err) {
    console.error("Excel upload error:", err);
    return c.json({ message: 'Failed to process Excel file' }, 500);
  }
});

// 4. Confirm and Apply Import Session
imports.post('/confirm', async (c) => {
  try {
    const { session_id, orders } = await c.req.json();

    if (!session_id || !orders || !Array.isArray(orders)) {
      return c.json({ message: 'Session ID and confirmed orders list are required' }, 400);
    }

    // Verify import session is in previewing state
    const session = await db.sessions.get(session_id);
      
    if (!session || session.status !== 'previewing') {
      return c.json({ message: 'Invalid or expired import session' }, 404);
    }

    const user = c.get('user');
    let appliedCount = 0;
    let flaggedCount = 0;

    // Process all orders
    for (const order of orders) {
      // 1. Insert order record
      const insertedOrder = await db.orders.insert({
        import_session_id: session_id,
        order_id: order.order_id,
        resi_number: order.resi_number || null,
        product_name_raw: order.product_name_raw,
        quantity: order.quantity,
        order_status: order.order_status,
        customer_name: order.customer_name || null,
        expedition: order.expedition || null,
        order_date: order.order_date || null,
        price: order.price,
        system_status: order.system_status
      });

      const orderRecordId = insertedOrder.id;

      if (order.system_status === 'needs_review') {
        flaggedCount++;
      }

      // 2. Insert splits into order_items
      if (order.splits && Array.isArray(order.splits)) {
        for (const split of order.splits) {
          await db.orderItems.insert({
            order_id: orderRecordId,
            product_id: split.product_id, // can be null if not resolved yet
            quantity: split.quantity,
            parse_source: split.parse_source || 'direct',
            original_text: split.original_text || order.product_name_raw,
            is_confirmed: split.product_id ? 1 : 0 // 0 if ambiguous and product_id is null
          });

          // 3. Deduct stock ONLY if the order is NORMAL and product is resolved
          if (order.system_status === 'normal' && split.product_id) {
            // Log stock movement
            await db.movements.insert({
              product_id: split.product_id,
              quantity_change: -split.quantity,
              movement_type: 'sale',
              reference: `Order ID: ${order.order_id}`,
              user_id: user.id
            });

            // Deduct product inventory
            const prod = await db.products.get(split.product_id);
            if (prod) {
              await db.products.update(split.product_id, {
                current_stock: prod.current_stock - split.quantity
              });
            }
          }
        }
      }

      appliedCount++;
    }

    // 4. Update Import Session status to applied
    await db.sessions.update(session_id, {
      status: 'applied',
      applied_rows: appliedCount,
      flagged_rows: flaggedCount
    });

    return c.json({ success: true, applied_rows: appliedCount, flagged_rows: flaggedCount });

  } catch (err) {
    console.error("Confirm import error:", err);
    return c.json({ message: 'Failed to apply import changes' }, 500);
  }
});

// 5. Cancel / Discard Session
imports.post('/cancel', async (c) => {
  try {
    const { session_id } = await c.req.json();
    if (!session_id) {
      return c.json({ message: 'Session ID is required' }, 400);
    }

    await db.sessions.update(parseInt(session_id, 10), {
      status: 'cancelled'
    });
    return c.json({ success: true });
  } catch (err) {
    console.error("Cancel import error:", err);
    return c.json({ message: 'Failed to cancel session' }, 500);
  }
});

// 6. Get import session history (Recent imports)
imports.get('/sessions', async (c) => {
  try {
    const sessionsList = await db.sessions.list();
    const templatesList = await db.templates.list();
    const usersList = await db.users.list();

    const templateMap = new Map(templatesList.map(t => [t.id, t]));
    const userMap = new Map(usersList.map(u => [u.id, u]));

    const joined = sessionsList.map(s => {
      const template = templateMap.get(s.template_id);
      const user = userMap.get(s.user_id);
      return {
        ...s,
        template_name: template ? template.name : null,
        username: user ? user.username : null
      };
    });

    // Sort by created_at DESC
    joined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Limit to 10
    const limited = joined.slice(0, 10);

    return c.json(limited);
  } catch (err) {
    console.error("Get sessions error:", err);
    return c.json({ message: 'Failed to retrieve sessions history' }, 500);
  }
});

export default imports;
