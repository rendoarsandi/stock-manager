import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';

const dashboard = new Hono();

// Apply requireAuth to all dashboard routes
dashboard.use('*', requireAuth);

dashboard.get('/stats', async (c) => {
  try {
    // 1. Total products count
    const totalProducts = await db.prepare("SELECT COUNT(*) as count FROM products").first('count') || 0;

    // 2. Low stock count
    const lowStockCount = await db.prepare("SELECT COUNT(*) as count FROM products WHERE current_stock <= low_stock_threshold").first('count') || 0;

    // 3. Pending reviews count (flagged orders)
    const pendingReviewCount = await db.prepare("SELECT COUNT(*) as count FROM orders WHERE system_status = 'needs_review'").first('count') || 0;

    // 4. Ambiguous items count (unconfirmed splits)
    const ambiguousCount = await db.prepare("SELECT COUNT(*) as count FROM order_items WHERE is_confirmed = 0").first('count') || 0;

    // 5. Recent reviews (last 5 flagged orders)
    const recentReviews = await db.prepare(`
      SELECT id, order_id, product_name_raw, quantity, expedition
      FROM orders
      WHERE system_status = 'needs_review'
      ORDER BY created_at DESC
      LIMIT 5
    `).all();

    // 6. Recent imports (last 5 sessions)
    const recentImports = await db.prepare(`
      SELECT s.*, t.name as template_name
      FROM import_sessions s
      JOIN import_templates t ON s.template_id = t.id
      ORDER BY s.created_at DESC
      LIMIT 5
    `).all();

    return c.json({
      total_products: totalProducts,
      low_stock_count: lowStockCount,
      pending_review_count: pendingReviewCount,
      ambiguous_count: ambiguousCount,
      recent_reviews: recentReviews.results,
      recent_imports: recentImports.results
    });

  } catch (err) {
    console.error("Dashboard stats retrieval error:", err);
    return c.json({ message: 'Failed to retrieve dashboard statistics' }, 500);
  }
});

export default dashboard;
