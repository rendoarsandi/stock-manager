import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const list = await ctx.db.query("products").collect();
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  },
});

export const get = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});

export const insert = mutation({
  args: {
    name: v.string(),
    model: v.string(),
    master_sku: v.optional(v.string()),
    description: v.optional(v.string()),
    initial_stock: v.number(),
    low_stock_threshold: v.number(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("products")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    if (existing) {
      throw new Error("Product name already exists");
    }

    const now = new Date().toISOString();
    const productId = await ctx.db.insert("products", {
      name: args.name,
      model: args.model,
      master_sku: args.master_sku,
      description: args.description,
      current_stock: args.initial_stock,
      low_stock_threshold: args.low_stock_threshold,
      created_at: now,
      updated_at: now,
    });

    if (args.initial_stock !== 0) {
      await ctx.db.insert("stock_movements", {
        product_id: productId,
        quantity_change: args.initial_stock,
        movement_type: "initial",
        reference: "Initial product creation stock",
        user_id: args.userId,
        created_at: now,
      });
    }

    return productId;
  },
});

export const update = mutation({
  args: {
    id: v.id("products"),
    name: v.string(),
    model: v.string(),
    master_sku: v.optional(v.string()),
    description: v.optional(v.string()),
    low_stock_threshold: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("products")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    if (existing && existing._id !== args.id) {
      throw new Error("Product name already exists");
    }

    await ctx.db.patch(args.id, {
      name: args.name,
      model: args.model,
      master_sku: args.master_sku,
      description: args.description,
      low_stock_threshold: args.low_stock_threshold,
      updated_at: new Date().toISOString(),
    });
    return true;
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new Error("Product not found");
    }

    // Delete aliases
    const aliases = await ctx.db
      .query("product_aliases")
      .withIndex("by_clean_text")
      .filter((q) => q.eq(q.field("product_id"), args.id))
      .collect();
    for (const a of aliases) {
      await ctx.db.delete(a._id);
    }

    // Delete stock movements
    const movements = await ctx.db
      .query("stock_movements")
      .withIndex("by_product_id", (q) => q.eq("product_id", args.id))
      .collect();
    for (const m of movements) {
      await ctx.db.delete(m._id);
    }

    // Delete stock opname items
    const opnameItems = await ctx.db
      .query("stock_opname_items")
      .withIndex("by_product_id", (q) => q.eq("product_id", args.id))
      .collect();
    for (const oi of opnameItems) {
      await ctx.db.delete(oi._id);
    }

    // Delete order items
    const orderItems = await ctx.db
      .query("order_items")
      .withIndex("by_product_id", (q) => q.eq("product_id", args.id))
      .collect();
    for (const oi of orderItems) {
      await ctx.db.delete(oi._id);
    }

    // Delete SKU mappings
    const mappings = await ctx.db
      .query("sku_mappings")
      .withIndex("by_product_id", (q) => q.eq("product_id", args.id))
      .collect();
    for (const m of mappings) {
      await ctx.db.delete(m._id);
    }

    await ctx.db.delete(args.id);
    return true;
  },
});

export const adjustStock = mutation({
  args: {
    id: v.id("products"),
    quantity_change: v.number(),
    movement_type: v.string(),
    reference: v.string(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new Error("Product not found");
    }

    const now = new Date().toISOString();
    await ctx.db.insert("stock_movements", {
      product_id: args.id,
      quantity_change: args.quantity_change,
      movement_type: args.movement_type as any,
      reference: args.reference,
      user_id: args.userId,
      created_at: now,
    });

    const newStock = product.current_stock + args.quantity_change;
    await ctx.db.patch(args.id, {
      current_stock: newStock,
      updated_at: now,
    });

    return newStock;
  },
});
