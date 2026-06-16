import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listLedger = query({
  args: {},
  handler: async (ctx) => {
    const movements = await ctx.db.query("stock_movements").collect();
    const joined = [];
    for (const m of movements) {
      const prod = await ctx.db.get(m.product_id);
      const user = m.user_id ? await ctx.db.get(m.user_id) : null;
      joined.push({
        ...m,
        id: m._id,
        name: prod ? prod.name : null,
        model: prod ? prod.model : null,
        username: user ? user.username : null,
      });
    }

    // Sort descending by created_at or id
    joined.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return joined;
  },
});

export const listProductLedger = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const movements = await ctx.db
      .query("stock_movements")
      .withIndex("by_product_id", (q) => q.eq("product_id", args.productId))
      .collect();

    // Map platform name from order history
    const joined = [];
    for (const m of movements) {
      let platform_name = null;
      if (m.reference) {
        const match = m.reference.match(/Order ID:\s*([^\s,]+)/i);
        if (match) {
          const orderId = match[1];
          const order = await ctx.db
            .query("orders")
            .withIndex("by_order_id", (q) => q.eq("order_id", orderId))
            .first();
          if (order) {
            const session = await ctx.db.get(order.import_session_id);
            if (session && session.template_id) {
              const template = await ctx.db.get(session.template_id);
              if (template) {
                platform_name = template.name;
              }
            }
          }
        }
      }
      joined.push({
        ...m,
        id: m._id,
        platform_name,
      });
    }

    joined.sort((a, b) => a.created_at.localeCompare(b.created_at));
    return joined;
  },
});

export const listOpnames = query({
  args: {},
  handler: async (ctx) => {
    const list = await ctx.db.query("stock_opnames").collect();
    const joined = [];
    for (const o of list) {
      const user = await ctx.db.get(o.user_id);
      joined.push({
        ...o,
        id: o._id,
        username: user ? user.username : null,
      });
    }
    // Sort by created_at descending
    joined.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return joined;
  },
});

export const getOpnameDetails = query({
  args: { opnameId: v.id("stock_opnames") },
  handler: async (ctx, args) => {
    const opname = await ctx.db.get(args.opnameId);
    if (!opname) return null;

    const items = await ctx.db
      .query("stock_opname_items")
      .withIndex("by_opname_id", (q) => q.eq("opname_id", args.opnameId))
      .collect();

    const joinedItems = [];
    for (const oi of items) {
      const prod = await ctx.db.get(oi.product_id);
      joinedItems.push({
        ...oi,
        product_name: prod ? prod.name : null,
        product_model: prod ? prod.model : null,
      });
    }

    const user = await ctx.db.get(opname.user_id);

    return {
      ...opname,
      id: opname._id,
      username: user ? user.username : null,
      items: joinedItems,
    };
  },
});

export const createOpname = mutation({
  args: {
    userId: v.id("users"),
    notes: v.optional(v.string()),
    items: v.array(
      v.object({
        product_id: v.id("products"),
        physical_stock: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const opnameId = await ctx.db.insert("stock_opnames", {
      user_id: args.userId,
      notes: args.notes,
      created_at: now,
    });

    for (const item of args.items) {
      const product = await ctx.db.get(item.product_id);
      if (!product) continue;

      const systemStock = product.current_stock;
      const variance = item.physical_stock - systemStock;

      await ctx.db.insert("stock_opname_items", {
        opname_id: opnameId,
        product_id: item.product_id,
        system_stock: systemStock,
        physical_stock: item.physical_stock,
        variance,
      });

      // Update actual product stock and record movement
      if (variance !== 0) {
        await ctx.db.insert("stock_movements", {
          product_id: item.product_id,
          quantity_change: variance,
          movement_type: "manual_adjust",
          reference: `Stock opname adjustment (Opname ID: ${opnameId})`,
          user_id: args.userId,
          created_at: now,
        });

        await ctx.db.patch(item.product_id, {
          current_stock: item.physical_stock,
          updated_at: now,
        });
      }
    }

    return opnameId;
  },
});
