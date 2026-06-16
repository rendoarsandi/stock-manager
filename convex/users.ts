import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";

export const getByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
  },
});

export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const list = await ctx.db.query("users").collect();
    list.sort((a, b) => a.username.localeCompare(b.username));
    return list;
  },
});

export const register = mutation({
  args: {
    username: v.string(),
    password_hash: v.string(),
    role: v.union(v.literal("admin"), v.literal("staff")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
    if (existing) {
      throw new Error("Username already exists");
    }
    const userId = await ctx.db.insert("users", {
      username: args.username,
      password_hash: args.password_hash,
      role: args.role,
      created_at: new Date().toISOString(),
    });
    return userId;
  },
});

export const remove = mutation({
  args: { id: v.id("users"), currentUserId: v.id("users") },
  handler: async (ctx, args) => {
    if (args.id === args.currentUserId) {
      throw new Error("Cannot delete your own user account");
    }
    const user = await ctx.db.get(args.id);
    if (!user) {
      throw new Error("User not found");
    }

    // Re-assign stock movements and opnames to null or fallback user
    const movements = await ctx.db
      .query("stock_movements")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.id))
      .collect();
    for (const m of movements) {
      await ctx.db.patch(m._id, { user_id: undefined });
    }

    const opnames = await ctx.db
      .query("stock_opnames")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.id))
      .collect();
    for (const o of opnames) {
      await ctx.db.patch(o._id, { user_id: args.currentUserId });
    }

    await ctx.db.delete(args.id);
    return true;
  },
});
