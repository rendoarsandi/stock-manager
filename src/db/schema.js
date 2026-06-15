import { sqliteTable, integer, text, real, primaryKey, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull(),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  role: text('role').notNull(), // CHECK(role IN ('admin', 'staff'))
  username: text('username').notNull().unique(),
  requiresPasswordReset: integer('requires_password_reset', { mode: 'boolean' }).default(false).notNull(),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  model: text('model').notNull(),
  master_sku: text('master_sku'),
  description: text('description'),
  current_stock: integer('current_stock').default(0),
  low_stock_threshold: integer('low_stock_threshold').default(10),
  created_at: text('created_at').default(sql`(datetime('now', 'localtime'))`),
  updated_at: text('updated_at').default(sql`(datetime('now', 'localtime'))`),
});

export const productAliases = sqliteTable('product_aliases', {
  clean_text: text('clean_text').primaryKey(),
  product_id: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
}, (t) => {
  return [
    index('product_aliases_product_id_idx').on(t.product_id)
  ];
});

export const importTemplates = sqliteTable('import_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  column_mapping: text('column_mapping').notNull(), // JSON string
  created_at: text('created_at').default(sql`(datetime('now', 'localtime'))`),
});

export const importSessions = sqliteTable('import_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  template_id: integer('template_id').references(() => importTemplates.id),
  user_id: text('user_id').references(() => users.id),
  filename: text('filename').notNull(),
  status: text('status').notNull(), // CHECK(status IN ('pending', 'previewing', 'applied', 'cancelled'))
  total_rows: integer('total_rows').default(0),
  applied_rows: integer('applied_rows').default(0),
  flagged_rows: integer('flagged_rows').default(0),
  orders_data: text('orders_data'),
  created_at: text('created_at').default(sql`(datetime('now', 'localtime'))`),
}, (t) => {
  return [
    index('import_sessions_template_id_idx').on(t.template_id),
    index('import_sessions_user_id_idx').on(t.user_id)
  ];
});

export const orders = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  import_session_id: integer('import_session_id').notNull().references(() => importSessions.id),
  order_id: text('order_id').notNull(),
  resi_number: text('resi_number'),
  product_name_raw: text('product_name_raw').notNull(),
  quantity: integer('quantity').notNull(),
  order_status: text('order_status').notNull(),
  customer_name: text('customer_name'),
  expedition: text('expedition'),
  order_date: text('order_date'),
  price: real('price').default(0),
  system_status: text('system_status').notNull(), // CHECK(system_status IN ('normal', 'needs_review', 'resolved'))
  resolution: text('resolution'), // CHECK(resolution IN ('returned', 'lost', 'investigating'))
  resolution_notes: text('resolution_notes'),
  resolved_at: text('resolved_at'),
  created_at: text('created_at').default(sql`(datetime('now', 'localtime'))`),
}, (t) => {
  return [
    index('orders_import_session_id_idx').on(t.import_session_id),
    index('orders_order_id_idx').on(t.order_id)
  ];
});

export const orderItems = sqliteTable('order_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  order_id: integer('order_id').notNull().references(() => orders.id),
  product_id: integer('product_id').references(() => products.id),
  quantity: integer('quantity').notNull(),
  parse_source: text('parse_source').notNull(), // CHECK(parse_source IN ('direct', 'auto_split'))
  original_text: text('original_text'),
  is_confirmed: integer('is_confirmed').default(1),
}, (t) => {
  return [
    index('order_items_order_id_idx').on(t.order_id),
    index('order_items_product_id_idx').on(t.product_id)
  ];
});

export const stockMovements = sqliteTable('stock_movements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  product_id: integer('product_id').notNull().references(() => products.id),
  quantity_change: integer('quantity_change').notNull(),
  movement_type: text('movement_type').notNull(), // CHECK(movement_type IN ('sale', 'return', 'write_off', 'manual_adjust', 'initial'))
  reference: text('reference'),
  user_id: text('user_id').references(() => users.id),
  created_at: text('created_at').default(sql`(datetime('now', 'localtime'))`),
}, (t) => {
  return [
    index('stock_movements_product_id_idx').on(t.product_id),
    index('stock_movements_user_id_idx').on(t.user_id)
  ];
});

export const stockOpnames = sqliteTable('stock_opnames', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: text('user_id').notNull().references(() => users.id),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now', 'localtime'))`),
}, (t) => {
  return [
    index('stock_opnames_user_id_idx').on(t.user_id)
  ];
});

export const stockOpnameItems = sqliteTable('stock_opname_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  opname_id: integer('opname_id').notNull().references(() => stockOpnames.id, { onDelete: 'cascade' }),
  product_id: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  system_stock: integer('system_stock').notNull(),
  physical_stock: integer('physical_stock').notNull(),
  variance: integer('variance').notNull(),
}, (t) => {
  return [
    index('stock_opname_items_opname_id_idx').on(t.opname_id),
    index('stock_opname_items_product_id_idx').on(t.product_id)
  ];
});

export const skuMappings = sqliteTable('sku_mappings', {
  sku_code: text('sku_code').notNull(),
  product_id: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull(),
}, (t) => {
  return [
    primaryKey({ columns: [t.sku_code, t.product_id] }),
    index('sku_mappings_product_id_idx').on(t.product_id)
  ];
});

export const chatMessages = sqliteTable('chat_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sender_id: text('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  receiver_id: text('receiver_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),
  product_id: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
  created_at: text('created_at').default(sql`(datetime('now', 'localtime'))`),
  is_read: integer('is_read').default(0),
}, (t) => {
  return [
    index('chat_messages_sender_id_idx').on(t.sender_id),
    index('chat_messages_receiver_id_idx').on(t.receiver_id),
    index('chat_messages_product_id_idx').on(t.product_id)
  ];
});

