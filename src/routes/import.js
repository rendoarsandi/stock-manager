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
    const templates = await db.prepare("SELECT * FROM import_templates ORDER BY name ASC").all();
    // Parse mapping string back to JSON objects for the frontend
    const result = templates.results.map(t => ({
      ...t,
      column_mapping: JSON.parse(t.column_mapping)
    }));
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
      await db.prepare(`
        UPDATE import_templates 
        SET name = ?, column_mapping = ? 
        WHERE id = ?
      `).bind(name, mappingStr, id).run();
      return c.json({ success: true, id });
    } else {
      // Insert
      const existing = await db.prepare("SELECT id FROM import_templates WHERE name = ?").bind(name).first();
      if (existing) {
        return c.json({ message: 'Template name already exists' }, 400);
      }

      const insertRes = await db.prepare(`
        INSERT INTO import_templates (name, column_mapping) 
        VALUES (?, ?)
      `).bind(name, mappingStr).run();

      const newId = insertRes.meta.last_row_id;
      return c.json({ success: true, id: newId }, 201);
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
    const existing = await db.prepare("SELECT id FROM import_templates WHERE id = ?").bind(id).first();
    if (!existing) {
      return c.json({ message: 'Template not found' }, 404);
    }

    await db.prepare("DELETE FROM import_templates WHERE id = ?").bind(id).run();
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
    const template = await db.prepare("SELECT * FROM import_templates WHERE id = ?").bind(templateId).first();
    if (!template) {
      return c.json({ message: 'Template not found' }, 404);
    }
    const mapping = JSON.parse(template.column_mapping);

    // Retrieve product catalog for matching
    const catalog = (await db.prepare("SELECT id, name, model FROM products").all()).results;

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
      const existingOrder = await db.prepare("SELECT id FROM orders WHERE order_id = ?").bind(row.order_id).first();
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
    const sessionRes = await db.prepare(`
      INSERT INTO import_sessions (template_id, user_id, filename, status, total_rows, applied_rows, flagged_rows)
      VALUES (?, ?, ?, 'previewing', ?, 0, ?)
    `).bind(templateId, user.id, file.name, previewOrders.length, flaggedRowsCount).run();

    const sessionId = sessionRes.meta.last_row_id;

    return c.json({
      session_id: sessionId,
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
    const session = await db.prepare("SELECT * FROM import_sessions WHERE id = ? AND status = 'previewing'")
      .bind(session_id)
      .first();
      
    if (!session) {
      return c.json({ message: 'Invalid or expired import session' }, 404);
    }

    const user = c.get('user');
    let appliedCount = 0;
    let flaggedCount = 0;

    // Process all orders
    for (const order of orders) {
      // 1. Insert order record
      const orderRes = await db.prepare(`
        INSERT INTO orders (
          import_session_id, order_id, resi_number, product_name_raw, quantity, 
          order_status, customer_name, expedition, order_date, price, system_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        session_id, order.order_id, order.resi_number, order.product_name_raw, order.quantity,
        order.order_status, order.customer_name, order.expedition, order.order_date, order.price, order.system_status
      ).run();

      const orderRecordId = orderRes.meta.last_row_id;

      if (order.system_status === 'needs_review') {
        flaggedCount++;
      }

      // 2. Insert splits into order_items
      if (order.splits && Array.isArray(order.splits)) {
        for (const split of order.splits) {
          await db.prepare(`
            INSERT INTO order_items (order_id, product_id, quantity, parse_source, original_text, is_confirmed)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            orderRecordId, 
            split.product_id, // can be null if not resolved yet
            split.quantity, 
            split.parse_source || 'direct', 
            split.original_text || order.product_name_raw,
            split.product_id ? 1 : 0 // 0 if ambiguous and product_id is null
          ).run();

          // 3. Deduct stock ONLY if the order is NORMAL and product is resolved
          if (order.system_status === 'normal' && split.product_id) {
            // Log stock movement
            await db.prepare(`
              INSERT INTO stock_movements (product_id, quantity_change, movement_type, reference, user_id)
              VALUES (?, ?, 'sale', ?, ?)
            `).bind(split.product_id, -split.quantity, `Order ID: ${order.order_id}`, user.id).run();

            // Deduct product inventory
            const prod = await db.prepare("SELECT current_stock FROM products WHERE id = ?").bind(split.product_id).first();
            if (prod) {
              await db.prepare("UPDATE products SET current_stock = ?, updated_at = datetime('now', 'localtime') WHERE id = ?")
                .bind(prod.current_stock - split.quantity, split.product_id)
                .run();
            }
          }
        }
      }

      appliedCount++;
    }

    // 4. Update Import Session status to applied
    await db.prepare(`
      UPDATE import_sessions 
      SET status = 'applied', applied_rows = ?, flagged_rows = ?, created_at = datetime('now', 'localtime')
      WHERE id = ?
    `).bind(appliedCount, flaggedCount, session_id).run();

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

    await db.prepare("UPDATE import_sessions SET status = 'cancelled' WHERE id = ?").bind(session_id).run();
    return c.json({ success: true });
  } catch (err) {
    console.error("Cancel import error:", err);
    return c.json({ message: 'Failed to cancel session' }, 500);
  }
});

// 6. Get import session history (Recent imports)
imports.get('/sessions', async (c) => {
  try {
    const sessions = await db.prepare(`
      SELECT s.*, t.name as template_name, u.username
      FROM import_sessions s
      JOIN import_templates t ON s.template_id = t.id
      JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
      LIMIT 10
    `).all();
    return c.json(sessions.results);
  } catch (err) {
    console.error("Get sessions error:", err);
    return c.json({ message: 'Failed to retrieve sessions history' }, 500);
  }
});

export default imports;
