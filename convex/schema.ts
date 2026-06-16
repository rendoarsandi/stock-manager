import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    password_hash: v.string(),
    role: v.union(v.literal("admin"), v.literal("staff")),
    created_at: v.string(),
  }).index("by_username", ["username"]),

  products: defineTable({
    name: v.string(),
    model: v.string(),
    master_sku: v.optional(v.string()),
    description: v.optional(v.string()),
    current_stock: v.number(),
    low_stock_threshold: v.number(),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index("by_name", ["name"])
    .index("by_model", ["model"]),

  product_aliases: defineTable({
    clean_text: v.string(),
    product_id: v.id("products"),
  }).index("by_clean_text", ["clean_text"]),

  import_templates: defineTable({
    name: v.string(),
    column_mapping: v.string(), // JSON string
    created_at: v.string(),
  }).index("by_name", ["name"]),

  import_sessions: defineTable({
    template_id: v.optional(v.id("import_templates")),
    user_id: v.optional(v.id("users")),
    filename: v.string(),
    status: v.union(v.literal("pending"), v.literal("previewing"), v.literal("applied"), v.literal("cancelled")),
    total_rows: v.number(),
    applied_rows: v.number(),
    flagged_rows: v.number(),
    orders_data: v.optional(v.string()), // JSON string
    created_at: v.string(),
  }),

  orders: defineTable({
    import_session_id: v.id("import_sessions"),
    order_id: v.string(),
    resi_number: v.optional(v.string()),
    product_name_raw: v.string(),
    quantity: v.number(),
    order_status: v.string(),
    customer_name: v.optional(v.string()),
    expedition: v.optional(v.string()),
    order_date: v.optional(v.string()),
    price: v.number(),
    system_status: v.union(v.literal("normal"), v.literal("needs_review"), v.literal("resolved")),
    resolution: v.optional(v.union(v.literal("returned"), v.literal("lost"), v.literal("investigating"))),
    resolution_notes: v.optional(v.string()),
    resolved_at: v.optional(v.string()),
    created_at: v.string(),
  })
    .index("by_import_session_id", ["import_session_id"])
    .index("by_order_id", ["order_id"]),

  order_items: defineTable({
    order_id: v.id("orders"),
    product_id: v.optional(v.id("products")),
    quantity: v.number(),
    parse_source: v.string(),
    original_text: v.optional(v.string()),
    is_confirmed: v.boolean(),
  })
    .index("by_order_id", ["order_id"])
    .index("by_product_id", ["product_id"]),

  stock_movements: defineTable({
    product_id: v.id("products"),
    quantity_change: v.number(),
    movement_type: v.union(v.literal("sale"), v.literal("return"), v.literal("write_off"), v.literal("manual_adjust"), v.literal("initial")),
    reference: v.optional(v.string()),
    user_id: v.optional(v.id("users")),
    created_at: v.string(),
  })
    .index("by_product_id", ["product_id"])
    .index("by_user_id", ["user_id"]),

  stock_opnames: defineTable({
    user_id: v.id("users"),
    notes: v.optional(v.string()),
    created_at: v.string(),
  }).index("by_user_id", ["user_id"]),

  stock_opname_items: defineTable({
    opname_id: v.id("stock_opnames"),
    product_id: v.id("products"),
    system_stock: v.number(),
    physical_stock: v.number(),
    variance: v.number(),
  })
    .index("by_opname_id", ["opname_id"])
    .index("by_product_id", ["product_id"]),

  sku_mappings: defineTable({
    sku_code: v.string(),
    product_id: v.id("products"),
    quantity: v.number(),
  })
    .index("by_sku_code", ["sku_code"])
    .index("by_product_id", ["product_id"])
    .index("by_sku_and_product", ["sku_code", "product_id"]),

  chat_messages: defineTable({
    sender_id: v.id("users"),
    receiver_id: v.id("users"),
    message: v.string(),
    product_id: v.optional(v.id("products")),
    created_at: v.string(),
    is_read: v.boolean(),
  })
    .index("by_sender_id", ["sender_id"])
    .index("by_receiver_id", ["receiver_id"])
    .index("by_product_id", ["product_id"]),
});
