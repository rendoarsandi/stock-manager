import { Hono } from 'hono';
import { getActiveStorage } from '../db/context.js';
import { requireAuth } from '../middleware/auth.js';

const dashboard = new Hono();

// Apply requireAuth to all dashboard routes
dashboard.use('*', requireAuth);

dashboard.get('/stats', async (c) => {
  try {
    const storage = getActiveStorage();

    // 1. Total products count
    const totalProductsRes = await storage.query("SELECT COUNT(*) AS count FROM products");
    const totalProducts = totalProductsRes[0]?.count || 0;

    // 2. Low stock count
    const lowStockRes = await storage.query("SELECT COUNT(*) AS count FROM products WHERE current_stock <= low_stock_threshold");
    const lowStockCount = lowStockRes[0]?.count || 0;

    // 3. Pending reviews count (flagged orders)
    const pendingReviewRes = await storage.query("SELECT COUNT(*) AS count FROM orders WHERE system_status = 'needs_review'");
    const pendingReviewCount = pendingReviewRes[0]?.count || 0;

    // 4. Ambiguous items count (unconfirmed splits)
    const ambiguousRes = await storage.query("SELECT COUNT(*) AS count FROM order_items WHERE is_confirmed = 0");
    const ambiguousCount = ambiguousRes[0]?.count || 0;

    // 5. Recent reviews (last 5 flagged orders)
    const recentReviews = await storage.query(
      `SELECT id, order_id, product_name_raw, quantity, expedition 
       FROM orders 
       WHERE system_status = 'needs_review' 
       ORDER BY created_at DESC 
       LIMIT 5`
    );

    // 6. Recent imports (last 5 sessions)
    const recentImports = await storage.query(
      `SELECT s.id, s.template_id, s.user_id, s.filename, s.status, s.total_rows, s.applied_rows, s.flagged_rows, s.orders_data, s.created_at, t.name AS template_name 
       FROM import_sessions s 
       LEFT JOIN import_templates t ON s.template_id = t.id 
       ORDER BY s.created_at DESC 
       LIMIT 5`
    );

    return c.json({
      total_products: totalProducts,
      low_stock_count: lowStockCount,
      pending_review_count: pendingReviewCount,
      ambiguous_count: ambiguousCount,
      recent_reviews: recentReviews,
      recent_imports: recentImports
    });

  } catch (err) {
    console.error("Dashboard stats retrieval error:", err);
    return c.json({ message: 'Failed to retrieve dashboard statistics' }, 500);
  }
});

export default dashboard;
