import { query } from "./_generated/server";
import { v } from "convex/values";

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    const totalProducts = products.length;

    const lowStockCount = products.filter(
      (p) => p.current_stock <= p.low_stock_threshold
    ).length;

    const orders = await ctx.db.query("orders").collect();
    const pendingReviewCount = orders.filter(
      (o) => o.system_status === "needs_review"
    ).length;

    const orderItems = await ctx.db.query("order_items").collect();
    const ambiguousCount = orderItems.filter((oi) => !oi.is_confirmed).length;

    // Get 5 recent reviews (needs_review)
    const recentReviews = orders
      .filter((o) => o.system_status === "needs_review")
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 5)
      .map((o) => ({
        id: o._id,
        order_id: o.order_id,
        product_name_raw: o.product_name_raw,
        quantity: o.quantity,
        expedition: o.expedition,
      }));

    // Get 5 recent imports
    const imports = await ctx.db.query("import_sessions").collect();
    imports.sort((a, b) => b.created_at.localeCompare(a.created_at));
    const recentImports = [];
    for (const s of imports.slice(0, 5)) {
      let templateName = null;
      if (s.template_id) {
        const t = await ctx.db.get(s.template_id);
        if (t) templateName = t.name;
      }
      recentImports.push({
        id: s._id,
        template_id: s.template_id,
        user_id: s.user_id,
        filename: s.filename,
        status: s.status,
        total_rows: s.total_rows,
        applied_rows: s.applied_rows,
        flagged_rows: s.flagged_rows,
        orders_data: s.orders_data,
        created_at: s.created_at,
        template_name: templateName,
      });
    }

    return {
      total_products: totalProducts,
      low_stock_count: lowStockCount,
      pending_review_count: pendingReviewCount,
      ambiguous_count: ambiguousCount,
      recent_reviews: recentReviews,
      recent_imports: recentImports,
    };
  },
});
