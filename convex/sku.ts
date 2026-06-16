import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const list = await ctx.db.query("sku_mappings").collect();
    const joined = [];
    for (const item of list) {
      const prod = await ctx.db.get(item.product_id);
      joined.push({
        ...item,
        product_name: prod ? prod.name : null,
        product_model: prod ? prod.model : null,
      });
    }
    return joined;
  },
});

export const getBySku = query({
  args: { sku_code: v.string() },
  handler: async (ctx, args) => {
    const list = await ctx.db
      .query("sku_mappings")
      .withIndex("by_sku_code", (q) => q.eq("sku_code", args.sku_code.toLowerCase()))
      .collect();
    const joined = [];
    for (const item of list) {
      const prod = await ctx.db.get(item.product_id);
      joined.push({
        ...item,
        product_name: prod ? prod.name : null,
        product_model: prod ? prod.model : null,
      });
    }
    return joined;
  },
});

export const insert = mutation({
  args: {
    sku_code: v.string(),
    product_id: v.id("products"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const skuCode = args.sku_code.toLowerCase();
    const existing = await ctx.db
      .query("sku_mappings")
      .withIndex("by_sku_and_product", (q) =>
        q.eq("sku_code", skuCode).eq("product_id", args.product_id)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { quantity: args.quantity });
      return existing._id;
    } else {
      const newId = await ctx.db.insert("sku_mappings", {
        sku_code: skuCode,
        product_id: args.product_id,
        quantity: args.quantity,
      });
      return newId;
    }
  },
});

export const remove = mutation({
  args: { sku_code: v.string(), product_id: v.id("products") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sku_mappings")
      .withIndex("by_sku_and_product", (q) =>
        q.eq("sku_code", args.sku_code.toLowerCase()).eq("product_id", args.product_id)
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }
    return false;
  },
});
