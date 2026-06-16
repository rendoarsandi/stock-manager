import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listReviewOrders = query({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db
      .query("orders")
      .collect();

    const filtered = orders.filter((o) => o.system_status === "needs_review");
    
    // Sort descending by created_at
    filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));

    const joined = [];
    for (const o of filtered) {
      const items = await ctx.db
        .query("order_items")
        .withIndex("by_order_id", (q) => q.eq("order_id", o._id))
        .collect();

      const joinedItems = [];
      for (const item of items) {
        const prod = item.product_id ? await ctx.db.get(item.product_id) : null;
        joinedItems.push({
          id: item._id,
          product_id: item.product_id,
          quantity: item.quantity,
          is_confirmed: item.is_confirmed,
          product_name: prod ? prod.name : "Unmapped Product",
          product_model: prod ? prod.model : "",
        });
      }

      joined.push({
        ...o,
        id: o._id,
        items: joinedItems,
      });
    }

    return joined;
  },
});

export const listAmbiguousItems = query({
  args: {},
  handler: async (ctx) => {
    const allItems = await ctx.db.query("order_items").collect();
    const ambiguous = allItems.filter((oi) => !oi.is_confirmed);

    const joined = [];
    for (const oi of ambiguous) {
      const order = await ctx.db.get(oi.order_id);
      joined.push({
        ...oi,
        id: oi._id,
        order_id: order ? order.order_id : null,
        product_name_raw: order ? order.product_name_raw : null,
        order_qty: order ? order.quantity : null,
        customer_name: order ? order.customer_name : null,
        order_date: order ? order.order_date : null,
        created_at: order ? order.created_at : new Date().toISOString(),
      });
    }

    joined.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return joined;
  },
});

export const resolveReviewOrder = mutation({
  args: {
    order_id: v.id("orders"),
    resolution: v.union(v.literal("returned"), v.literal("lost"), v.literal("investigating")),
    resolution_notes: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.order_id);
    if (!order || order.system_status !== "needs_review") {
      throw new Error("Order not found or already resolved");
    }

    const now = new Date().toISOString();

    if (args.resolution === "investigating") {
      await ctx.db.patch(args.order_id, {
        resolution: "investigating",
        resolution_notes: args.resolution_notes || "",
      });
      return { success: true, status: "needs_review" };
    }

    const items = await ctx.db
      .query("order_items")
      .withIndex("by_order_id", (q) => q.eq("order_id", args.order_id))
      .collect();

    if (args.resolution === "lost") {
      for (const item of items) {
        if (item.product_id) {
          // record lost movement and deduct stock
          await ctx.db.insert("stock_movements", {
            product_id: item.product_id,
            quantity_change: -item.quantity,
            movement_type: "write_off",
            reference: `Lost Order ID: ${order.order_id}`,
            user_id: args.userId,
            created_at: now,
          });

          const prod = await ctx.db.get(item.product_id);
          if (prod) {
            await ctx.db.patch(item.product_id, {
              current_stock: prod.current_stock - item.quantity,
              updated_at: now,
            });
          }
        }
      }
    } else if (args.resolution === "returned") {
      for (const item of items) {
        if (item.product_id) {
          await ctx.db.insert("stock_movements", {
            product_id: item.product_id,
            quantity_change: 0,
            movement_type: "return",
            reference: `Returned Order ID: ${order.order_id} (No stock adjustment needed)`,
            user_id: args.userId,
            created_at: now,
          });
        }
      }
    }

    await ctx.db.patch(args.order_id, {
      system_status: "resolved",
      resolution: args.resolution,
      resolution_notes: args.resolution_notes || "",
      resolved_at: now,
    });

    return { success: true, status: "resolved" };
  },
});

export const confirmSplit = mutation({
  args: {
    item_id: v.id("order_items"),
    product_id: v.id("products"),
    quantity: v.number(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.item_id);
    if (!item || item.is_confirmed) {
      throw new Error("Item not found or already confirmed");
    }

    const order = await ctx.db.get(item.order_id);
    if (!order) {
      throw new Error("Order not found");
    }

    const product = await ctx.db.get(args.product_id);
    if (!product) {
      throw new Error("Product not found");
    }

    await ctx.db.patch(args.item_id, {
      product_id: args.product_id,
      quantity: args.quantity,
      is_confirmed: true,
    });

    if (order.system_status === "normal") {
      const now = new Date().toISOString();
      await ctx.db.insert("stock_movements", {
        product_id: args.product_id,
        quantity_change: -args.quantity,
        movement_type: "sale",
        reference: `Confirmed Split Order: ${order.order_id}`,
        user_id: args.userId,
        created_at: now,
      });

      await ctx.db.patch(args.product_id, {
        current_stock: product.current_stock - args.quantity,
        updated_at: now,
      });
    }

    return true;
  },
});
