import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';

const dashboard = new Hono();

// Apply requireAuth to all dashboard routes
dashboard.use('*', requireAuth);

dashboard.get('/stats', async (c) => {
  try {
    const productsList = await db.products.list();
    const ordersList = await db.orders.list();
    const orderItemsList = await db.orderItems.list();
    const sessionsList = await db.sessions.list();
    const templatesList = await db.templates.list();

    const templateMap = new Map(templatesList.map(t => [t.id, t]));

    // 1. Total products count
    const totalProducts = productsList.length;

    // 2. Low stock count
    const lowStockCount = productsList.filter(p => p.current_stock <= p.low_stock_threshold).length;

    // 3. Pending reviews count (flagged orders)
    const pendingReviewCount = ordersList.filter(o => o.system_status === 'needs_review').length;

    // 4. Ambiguous items count (unconfirmed splits)
    const ambiguousCount = orderItemsList.filter(oi => oi.is_confirmed === 0).length;

    // 5. Recent reviews (last 5 flagged orders)
    const recentReviews = ordersList
      .filter(o => o.system_status === 'needs_review')
      .map(o => ({
        id: o.id,
        order_id: o.order_id,
        product_name_raw: o.product_name_raw,
        quantity: o.quantity,
        expedition: o.expedition
      }));
    recentReviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const recentReviewsLimited = recentReviews.slice(0, 5);

    // 6. Recent imports (last 5 sessions)
    const recentImports = sessionsList.map(s => {
      const template = templateMap.get(s.template_id);
      return {
        ...s,
        template_name: template ? template.name : null
      };
    });
    recentImports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const recentImportsLimited = recentImports.slice(0, 5);

    return c.json({
      total_products: totalProducts,
      low_stock_count: lowStockCount,
      pending_review_count: pendingReviewCount,
      ambiguous_count: ambiguousCount,
      recent_reviews: recentReviewsLimited,
      recent_imports: recentImportsLimited
    });

  } catch (err) {
    console.error("Dashboard stats retrieval error:", err);
    return c.json({ message: 'Failed to retrieve dashboard statistics' }, 500);
  }
});

export default dashboard;
