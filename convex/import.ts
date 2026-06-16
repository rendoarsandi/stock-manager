import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import {
  parseAmbiguousDescription,
  extractSameProductPromo,
  extractPackMultiplier,
  resolvePromoProductToBaseItems,
} from "./ambiguousParser";

// Mutation to cancel any existing previewing session
export const cancelAllPreviewing = mutation({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query("import_sessions").collect();
    for (const s of sessions) {
      if (s.status === "previewing") {
        await ctx.db.patch(s._id, { status: "cancelled", orders_data: undefined });
      }
    }
  },
});

// Mutation to create a preview session
export const createPreviewSession = mutation({
  args: {
    templateId: v.id("import_templates"),
    userId: v.optional(v.id("users")),
    filename: v.string(),
    totalRows: v.number(),
    flaggedRows: v.number(),
    ordersData: v.string(), // JSON string
  },
  handler: async (ctx, args) => {
    // Cancel any older preview sessions first
    const sessions = await ctx.db.query("import_sessions").collect();
    for (const s of sessions) {
      if (s.status === "previewing") {
        await ctx.db.patch(s._id, { status: "cancelled", orders_data: undefined });
      }
    }

    const sessionId = await ctx.db.insert("import_sessions", {
      template_id: args.templateId,
      user_id: args.userId,
      filename: args.filename,
      status: "previewing",
      total_rows: args.totalRows,
      applied_rows: 0,
      flagged_rows: args.flaggedRows,
      orders_data: args.ordersData,
      created_at: new Date().toISOString(),
    });
    return sessionId;
  },
});

// Action to parse Excel file, run fuzzy parsing, and save preview session
export const uploadExcel = action({
  args: {
    templateId: v.id("import_templates"),
    filename: v.string(),
    fileBase64: v.string(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args): Promise<any> => {
    const XLSX = await import("xlsx");
    const buffer = Buffer.from(args.fileBase64, "base64");

    const template: any = await ctx.runQuery(api.templates.get, { id: args.templateId });
    if (!template) {
      throw new Error("Template not found");
    }
    const mapping = template.column_mapping;

    // Read workbook
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    const catalog: any[] = await ctx.runQuery(api.products.list);
    const dbMappings: any[] = await ctx.runQuery(api.sku.list);

    const previewOrders: any[] = [];
    let flaggedRowsCount = 0;

    for (let index = 0; index < rawRows.length; index++) {
      const row = rawRows[index];
      const mappedRow: any = {};

      for (const [systemKey, excelHeader] of Object.entries(mapping)) {
        const rawValue = row[excelHeader as string];
        if (excelHeader && rawValue !== undefined && rawValue !== null) {
          let value = String(rawValue).trim();
          if (systemKey === "quantity") {
            mappedRow[systemKey] = parseInt(value, 10) || 1;
          } else if (systemKey === "price") {
            let cleanPrice = value.replace(/Rp\.?|rp\.?|\s+/g, "");
            if (cleanPrice.includes(",") && cleanPrice.includes(".")) {
              cleanPrice = cleanPrice.replace(/\./g, "").replace(/,/g, ".");
            } else if (cleanPrice.includes(",")) {
              if (cleanPrice.split(",")[1].length === 3) {
                cleanPrice = cleanPrice.replace(/,/g, "");
              } else {
                cleanPrice = cleanPrice.replace(/,/g, ".");
              }
            } else if (cleanPrice.includes(".")) {
              if (cleanPrice.split(".")[1].length === 3) {
                cleanPrice = cleanPrice.replace(/\./g, "");
              }
            }
            mappedRow[systemKey] = parseFloat(cleanPrice) || 0;
          } else {
            mappedRow[systemKey] = value;
          }
        } else {
          if (systemKey === "quantity") mappedRow[systemKey] = 1;
          else if (systemKey === "price") mappedRow[systemKey] = 0;
          else mappedRow[systemKey] = "";
        }
      }

      if (!mappedRow.order_id) continue;

      // Check duplicates
      const existingOrder = await ctx.runQuery(api.import.getOrderByOrderId, {
        orderId: mappedRow.order_id,
      });
      const isDuplicate = !!existingOrder;

      const orderStatusNorm = String(mappedRow.order_status).toLowerCase();
      const needsReview = orderStatusNorm.includes("batal") || orderStatusNorm.includes("cancel");
      const systemStatus = needsReview ? "needs_review" : "normal";

      if (needsReview) {
        flaggedRowsCount++;
      }

      const promoRes = extractSameProductPromo(mappedRow.product_name_raw);
      const packRes = extractPackMultiplier(promoRes.cleanText);
      const cleanedText = packRes.cleanText;
      const baseMultiplier = promoRes.promoMultiplier * packRes.packMultiplier;
      const totalQuantity = mappedRow.quantity * baseMultiplier;

      let suggestedSplits: any[] = [];
      let resolvedDirectly = false;

      // 1. Promo splits
      const promoSplits = resolvePromoProductToBaseItems(
        mappedRow.sku_ref,
        mappedRow.product_name_raw,
        mappedRow.quantity,
        catalog,
        dbMappings
      );
      if (promoSplits) {
        suggestedSplits = promoSplits;
        resolvedDirectly = true;
      }

      // 2. SKU model matches
      if (!resolvedDirectly && mappedRow.sku_ref && String(mappedRow.sku_ref).trim() !== "") {
        const refSku = String(mappedRow.sku_ref).trim().toLowerCase();
        const matchedProduct = catalog.find((p) => p.model.toLowerCase() === refSku);
        if (matchedProduct) {
          suggestedSplits.push({
            product_id: matchedProduct._id,
            product_name: matchedProduct.name,
            model: matchedProduct.model,
            quantity: totalQuantity,
            parse_source: "direct",
            original_text: mappedRow.product_name_raw,
          });
          resolvedDirectly = true;
        }
      }

      // 3. Aliases
      if (!resolvedDirectly) {
        const aliasProductId: any = await ctx.runQuery(api.import.getAliasProductId, {
          cleanText: cleanedText,
        });
        if (aliasProductId) {
          const matchedProduct = catalog.find((p) => p._id === aliasProductId);
          if (matchedProduct) {
            suggestedSplits.push({
              product_id: matchedProduct._id,
              product_name: matchedProduct.name,
              model: matchedProduct.model,
              quantity: totalQuantity,
              parse_source: "alias",
              original_text: mappedRow.product_name_raw,
            });
            resolvedDirectly = true;
          }
        }
      }

      // 4. Ambiguous parser fallback
      if (!resolvedDirectly) {
        suggestedSplits = parseAmbiguousDescription(mappedRow.product_name_raw, mappedRow.quantity, catalog);
      }

      const hasAmbiguous = suggestedSplits.some((s) => s.product_id === null) || suggestedSplits.length > 1;

      previewOrders.push({
        order_id: mappedRow.order_id,
        resi_number: mappedRow.resi_number || "",
        product_name_raw: mappedRow.product_name_raw,
        sku_ref: mappedRow.sku_ref || "",
        quantity: mappedRow.quantity,
        order_status: mappedRow.order_status,
        customer_name: mappedRow.customer_name || "",
        expedition: mappedRow.expedition || "",
        order_date: mappedRow.order_date || "",
        price: mappedRow.price || 0,
        system_status: systemStatus,
        is_duplicate: isDuplicate,
        has_ambiguous: hasAmbiguous,
        splits: suggestedSplits,
      });
    }

    if (previewOrders.length === 0) {
      throw new Error("No valid orders found in the uploaded file");
    }

    const sessionId: any = await ctx.runMutation(api.import.createPreviewSession, {
      templateId: args.templateId,
      userId: args.userId,
      filename: args.filename,
      totalRows: previewOrders.length,
      flaggedRows: flaggedRowsCount,
      ordersData: JSON.stringify(previewOrders),
    });

    return {
      session_id: sessionId,
      filename: args.filename,
      total_rows: previewOrders.length,
      flagged_rows: flaggedRowsCount,
      orders: previewOrders,
    };
  },
});

export const getAliasProductId = query({
  args: { cleanText: v.string() },
  handler: async (ctx, args) => {
    const alias = await ctx.db
      .query("product_aliases")
      .withIndex("by_clean_text", (q) => q.eq("clean_text", args.cleanText.toLowerCase()))
      .first();
    return alias ? alias.product_id : null;
  },
});

export const getOrderByOrderId = query({
  args: { orderId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_order_id", (q) => q.eq("order_id", args.orderId))
      .first();
  },
});

export const confirmImport = mutation({
  args: {
    session_id: v.id("import_sessions"),
    orders: v.array(v.any()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.session_id);
    if (!session || session.status !== "previewing") {
      throw new Error("Invalid or expired import session");
    }

    const now = new Date().toISOString();
    let appliedCount = 0;
    let flaggedCount = 0;

    for (const order of args.orders) {
      const orderId = await ctx.db.insert("orders", {
        import_session_id: args.session_id,
        order_id: order.order_id,
        resi_number: order.resi_number || undefined,
        product_name_raw: order.product_name_raw,
        quantity: order.quantity,
        order_status: order.order_status,
        customer_name: order.customer_name || undefined,
        expedition: order.expedition || undefined,
        order_date: order.order_date || undefined,
        price: order.price,
        system_status: order.system_status,
        resolution: order.resolution || undefined,
        resolution_notes: order.resolution_notes || undefined,
        resolved_at: order.resolved_at || undefined,
        created_at: now,
      });

      if (order.system_status === "needs_review") {
        flaggedCount++;
      }

      if (order.splits && Array.isArray(order.splits)) {
        for (const split of order.splits) {
          await ctx.db.insert("order_items", {
            order_id: orderId,
            product_id: split.product_id || undefined,
            quantity: split.quantity,
            parse_source: split.parse_source || "direct",
            original_text: split.original_text || order.product_name_raw,
            is_confirmed: !!split.product_id,
          });

          // Insert or replace product alias if manually resolved
          if (split.parse_source === "manual" && split.product_id && split.original_text) {
            const promoRes = extractSameProductPromo(split.original_text);
            const packRes = extractPackMultiplier(promoRes.cleanText);
            const cleanText = packRes.cleanText.toLowerCase();

            const existingAlias = await ctx.db
              .query("product_aliases")
              .withIndex("by_clean_text", (q) => q.eq("clean_text", cleanText))
              .first();
            if (existingAlias) {
              await ctx.db.patch(existingAlias._id, { product_id: split.product_id });
            } else {
              await ctx.db.insert("product_aliases", {
                clean_text: cleanText,
                product_id: split.product_id,
              });
            }
          }

          // Stock movements adjustment
          if (order.system_status === "normal" && split.product_id) {
            await ctx.db.insert("stock_movements", {
              product_id: split.product_id,
              quantity_change: -split.quantity,
              movement_type: "sale",
              reference: `Order ID: ${order.order_id}`,
              user_id: args.userId,
              created_at: now,
            });

            const product = await ctx.db.get(split.product_id);
            if (product) {
              await ctx.db.patch(split.product_id, {
                current_stock: product.current_stock - split.quantity,
                updated_at: now,
              });
            }
          }
        }
      }

      appliedCount++;
    }

    await ctx.db.patch(args.session_id, {
      status: "applied",
      applied_rows: appliedCount,
      flagged_rows: flaggedCount,
      orders_data: undefined, // Clear large JSON preview data
    });

    return { success: true, applied_rows: appliedCount, flagged_rows: flaggedCount };
  },
});

export const cancelImport = mutation({
  args: { session_id: v.id("import_sessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.session_id, {
      status: "cancelled",
      orders_data: undefined,
    });
    return true;
  },
});

export const getActiveSession = query({
  args: {},
  handler: async (ctx) => {
    const active = await ctx.db
      .query("import_sessions")
      .filter((q) => q.eq(q.field("status"), "previewing"))
      .first();
    if (active) {
      return {
        session_id: active._id,
        filename: active.filename,
        total_rows: active.total_rows,
        flagged_rows: active.flagged_rows,
        orders: JSON.parse(active.orders_data || "[]"),
      };
    }
    return null;
  },
});

export const syncActiveSession = mutation({
  args: { session_id: v.id("import_sessions"), orders: v.array(v.any()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.session_id, {
      orders_data: JSON.stringify(args.orders),
    });
    return true;
  },
});

export const listSessions = query({
  args: {},
  handler: async (ctx) => {
    const list = await ctx.db.query("import_sessions").collect();
    const joined = [];
    for (const s of list) {
      const template = s.template_id ? await ctx.db.get(s.template_id) : null;
      const user = s.user_id ? await ctx.db.get(s.user_id) : null;
      joined.push({
        ...s,
        id: s._id,
        template_name: template ? template.name : null,
        username: user ? user.username : null,
      });
    }
    // Sort descending by created_at
    joined.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return joined;
  },
});
