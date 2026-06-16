import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const list = await ctx.db.query("import_templates").collect();
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list.map((t) => ({
      ...t,
      column_mapping: JSON.parse(t.column_mapping),
    }));
  },
});

export const get = query({
  args: { id: v.id("import_templates") },
  handler: async (ctx, args) => {
    const t = await ctx.db.get(args.id);
    if (!t) return null;
    return {
      ...t,
      column_mapping: JSON.parse(t.column_mapping),
    };
  },
});

export const save = mutation({
  args: {
    id: v.optional(v.id("import_templates")),
    name: v.string(),
    column_mapping: v.string(), // JSON string
  },
  handler: async (ctx, args) => {
    if (args.id) {
      await ctx.db.patch(args.id, {
        name: args.name,
        column_mapping: args.column_mapping,
      });
      return args.id;
    } else {
      const existing = await ctx.db
        .query("import_templates")
        .withIndex("by_name", (q) => q.eq("name", args.name))
        .first();
      if (existing) {
        throw new Error("Template name already exists");
      }
      const newId = await ctx.db.insert("import_templates", {
        name: args.name,
        column_mapping: args.column_mapping,
        created_at: new Date().toISOString(),
      });
      return newId;
    }
  },
});

export const remove = mutation({
  args: { id: v.id("import_templates") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Template not found");
    }
    await ctx.db.delete(args.id);
    return true;
  },
});
