import * as Schema from 'effect/Schema';
import { auth } from '../utils/auth.js';
import crypto from 'crypto';
import { db, seedIfNeeded } from '../db/connection.js';
import { verifyPassword, hashPassword, signJwt, verifyJwt } from '../utils/crypto.js';
import { parseExcel, mapRawRows } from '../services/excel-parser.js';
import { extractSameProductPromo, extractPackMultiplier, resolvePromoProductToBaseItems } from '../services/ambiguous-parser.js';
import { getActiveStorage, getActiveEnv, storageContext } from '../db/context.js';
import { getLocalStore } from '../db/local_sqlite.js';
import { broadcast } from '../ws/broker.js';
import { Effect, Either } from 'effect';

function getJwtSecret() {
  const secret = globalThis.MINIMAL_CLOUDFLARE_ENV?.JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production' && process.env.npm_lifecycle_event !== 'build') {
      if (!globalThis.MINIMAL_CLOUDFLARE_ENV) {
        throw new Error("JWT_SECRET env variable is required in production.");
      }
    }
    return 'dev_secret_key';
  }
  return secret;
}

const loginSchema = Schema.Struct({
  username: Schema.String.pipe(Schema.minLength(1)),
  password: Schema.String.pipe(Schema.minLength(1)),
});

const createUserSchema = Schema.Struct({
  username: Schema.String.pipe(Schema.minLength(1)),
  password: Schema.String.pipe(Schema.minLength(1)),
  role: Schema.Literal('admin', 'staff'),
});

const ParseIntTransform = Schema.transform(
  Schema.Union(Schema.Number, Schema.String),
  Schema.Number,
  {
    decode: (val) => typeof val === "string" ? parseInt(val, 10) : val,
    encode: (val) => val
  }
);

const createProductSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1)),
  model: Schema.optional(Schema.NullOr(Schema.String)),
  master_sku: Schema.optional(Schema.NullOr(Schema.String)),
  description: Schema.optional(Schema.NullOr(Schema.String)),
  initial_stock: Schema.optional(ParseIntTransform),
  low_stock_threshold: Schema.optional(ParseIntTransform),
});

const updateProductSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1)),
  model: Schema.optional(Schema.NullOr(Schema.String)),
  master_sku: Schema.optional(Schema.NullOr(Schema.String)),
  description: Schema.optional(Schema.NullOr(Schema.String)),
  low_stock_threshold: Schema.optional(ParseIntTransform),
});

const adjustStockSchema = Schema.Struct({
  quantity_change: ParseIntTransform,
  movement_type: Schema.optional(Schema.String),
  reference: Schema.optional(Schema.String),
  created_at: Schema.optional(Schema.String),
});

// Helper for parsing cookies
function getCookie(request, name) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const parts = cookie.trim().split('=');
    const key = parts[0];
    const val = parts.slice(1).join('=');
    if (key) {
      try {
        acc[key] = decodeURIComponent(val || '');
      } catch (e) {
        acc[key] = val || '';
      }
    }
    return acc;
  }, {});
  return cookies[name];
}

// BadRequestError for input validation
export class BadRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BadRequestError';
    this.status = 400;
  }
}

export async function readJson(request) {
  try {
    return await request.clone().json();
  } catch (err) {
    throw new BadRequestError('Invalid JSON payload');
  }
}

// Authentication check
async function getAuthUser(request) {
  const cfEnv = globalThis.MINIMAL_CLOUDFLARE_ENV;
  const nodeEnv = cfEnv?.NODE_ENV || (typeof process !== 'undefined' && process.env ? process.env.NODE_ENV : 'undefined');
  console.log(`[getAuthUser Debug] getAuthUser called. URL: ${request.url}, NODE_ENV: ${nodeEnv}`);

  if (nodeEnv === 'test') {
    const token = getCookie(request, 'token');
    if (!token) return null;
    return verifyJwt(token, getJwtSecret());
  }

  const url = new URL(request.url);
  const hostname = url.hostname.toLowerCase();
  const isLocalDev = 
    hostname === 'localhost' || 
    hostname === '127.0.0.1' || 
    hostname === '[::1]' || 
    hostname === '::1' || 
    hostname === '0.0.0.0' ||
    (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') ||
    (globalThis.MINIMAL_CLOUDFLARE_ENV && globalThis.MINIMAL_CLOUDFLARE_ENV.NODE_ENV === 'development');

  const isLoggedOut = getCookie(request, 'logged_out') === 'true';

  try {
    const sessionData = await auth.api.getSession({ headers: request.headers });
    if (!sessionData || !sessionData.user) {
      if (isLocalDev && !isLoggedOut) {
        console.log("[Better Auth Debug] Local development fallback: no session, falling back to admin user.");
        return { id: 1, username: 'admin', role: 'admin' };
      }
      return null;
    }

    const authUser = sessionData.user;
    let username = authUser.username || authUser.name || authUser.email.split('@')[0];
    let role = authUser.role || 'staff';

    let localId = null;
    let localUsername = username;
    try {
      const storage = getActiveStorage();
      let existing = await storage.query("SELECT id, username, role FROM users WHERE password_hash = ?", [authUser.id]);
      if (!existing || existing.length === 0) {
        let chosenUsername = username.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
        let finalUsername = chosenUsername;
        let checkExisting = await storage.query("SELECT id FROM users WHERE username = ?", [finalUsername]);
        let counter = 1;
        while (checkExisting && checkExisting.length > 0) {
          finalUsername = `${chosenUsername}${counter}`;
          checkExisting = await storage.query("SELECT id FROM users WHERE username = ?", [finalUsername]);
          counter++;
        }

        const result = await storage.execute(
          "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, datetime('now', 'localtime'))",
          [finalUsername, authUser.id, role]
        );
        localId = result.lastInsertRowid;
        localUsername = finalUsername;
      } else {
        localId = existing[0].id;
        localUsername = existing[0].username;
        const localRole = existing[0].role;
        if (localRole !== role) {
          await storage.execute("UPDATE users SET role = ? WHERE id = ?", [role, localId]);
        }
      }
    } catch (dbErr) {
      console.error("Failed to check Better Auth user in local DB:", dbErr);
      localId = Math.abs(authUser.id.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)) % 1000000;
    }

    return { id: localId, username: localUsername, role };
  } catch (e) {
    console.error("Better Auth validation failed with error:", e);
    if (isLocalDev) {
      console.log("[Better Auth Debug] Local development fallback (from catch block): Better Auth failed, falling back to admin user.");
      return { id: 1, username: 'admin', role: 'admin' };
    }
    return null;
  }
}


// Helper to return JSON Response
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}

// Handlers
export function handleHealthEffect(req) {
  return Effect.gen(function* () {
    return { status: 'ok', time: new Date().toISOString() };
  });
}

async function handleHealth(req) {
  try {
    const res = await Effect.runPromise(handleHealthEffect(req));
    return json(res);
  } catch (err) {
    return json({ message: "Health check failed" }, 500);
  }
}

async function handleWsPlaceholder(req) {
  return new Response('WebSocket endpoint. Use a WebSocket client to connect.', { status: 400 });
}

export function handleLoginEffect(req) {
  return Effect.gen(function* () {
    const body = yield* Effect.tryPromise({
      try: () => readJson(req),
      catch: (error) => new Error(`Invalid request JSON: ${error.message}`)
    });

    const decodeResult = Schema.decodeEither(loginSchema)(body);
    if (Either.isLeft(decodeResult)) {
      return yield* Effect.fail({ status: 400, message: 'Username and password are required' });
    }
    const { username, password } = decodeResult.right;

    const user = yield* Effect.tryPromise({
      try: () => db.users.getByUsername(username),
      catch: (error) => new Error(`Database fetch user failed: ${error.message}`)
    });

    if (!user || !verifyPassword(password, user.password_hash)) {
      return yield* Effect.fail({ status: 401, message: 'Invalid username or password' });
    }

    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours
    };

    const token = signJwt(payload, getJwtSecret());
    const headers = new Headers();
    headers.append('Set-Cookie', `token=${token}; Path=/; HttpOnly; Max-Age=86400`);
    headers.append('Set-Cookie', 'logged_out=; Path=/; Max-Age=0');

    return new Response(JSON.stringify({
      id: user.id,
      username: user.username,
      role: user.role
    }), {
      status: 200,
      headers
    });
  });
}

async function handleLogin(req) {
  try {
    const result = await Effect.runPromise(Effect.either(handleLoginEffect(req)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Internal server error' }, 500);
    }
    return result.right;
  } catch (err) {
    console.error("Login route error:", err);
    return json({ message: 'Internal server error' }, 500);
  }
}

export function handleLogoutEffect(req) {
  return Effect.gen(function* () {
    const headers = new Headers();
    headers.append('Set-Cookie', 'token=; Path=/; HttpOnly; Max-Age=0');
    headers.append('Set-Cookie', 'logged_out=true; Path=/; Max-Age=31536000');
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers
    });
  });
}

async function handleLogout(req) {
  try {
    return await Effect.runPromise(handleLogoutEffect(req));
  } catch (err) {
    console.error("Logout route error:", err);
    return json({ message: 'Internal server error' }, 500);
  }
}

export function handleMeEffect(req) {
  return Effect.gen(function* () {
    const user = yield* Effect.tryPromise({
      try: () => getAuthUser(req),
      catch: (error) => new Error(`Authentication error: ${error.message}`)
    });
    if (!user) {
      return yield* Effect.fail({ status: 401, message: 'Not logged in' });
    }
    return { id: user.id, username: user.username, role: user.role };
  });
}

async function handleMe(req) {
  try {
    const result = await Effect.runPromise(Effect.either(handleMeEffect(req)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Internal server error' }, 500);
    }
    return json(result.right);
  } catch (err) {
    console.error("Me route error:", err);
    return json({ message: 'Internal server error' }, 500);
  }
}

export function handleListUsersEffect(req) {
  return Effect.gen(function* () {
    const list = yield* Effect.tryPromise({
      try: () => db.users.list(),
      catch: (error) => new Error(`Failed to list users from database: ${error.message}`)
    });

    const sortedList = [...list].sort((a, b) => (a.username || '').localeCompare(b.username || ''));
    const stripped = sortedList.map(u => ({ id: u.id, username: u.username, role: u.role, created_at: u.created_at }));
    return stripped;
  });
}

async function handleListUsers(req) {
  try {
    const list = await Effect.runPromise(handleListUsersEffect(req));
    return json(list);
  } catch (err) {
    console.error("List users error:", err);
    return json({ message: err.message || 'Failed to retrieve users' }, 500);
  }
}

export function handleCreateUserEffect(req) {
  return Effect.gen(function* () {
    const body = yield* Effect.tryPromise({
      try: () => readJson(req),
      catch: (error) => new Error(`Invalid request JSON: ${error.message}`)
    });

    const decodeResult = Schema.decodeEither(createUserSchema)(body);
    if (Either.isLeft(decodeResult)) {
      return yield* Effect.fail({ status: 400, message: 'Username, password and role are required' });
    }
    const { username, password, role } = decodeResult.right;

    const existing = yield* Effect.tryPromise({
      try: () => db.users.getByUsername(username),
      catch: (error) => new Error(`Database query user failed: ${error.message}`)
    });

    if (existing) {
      return yield* Effect.fail({ status: 400, message: 'Username already exists' });
    }

    const hashedPassword = hashPassword(password);
    const inserted = yield* Effect.tryPromise({
      try: () => db.users.insert({
        username,
        password_hash: hashedPassword,
        role
      }),
      catch: (error) => new Error(`Database user insert failed: ${error.message}`)
    });

    return { success: true, id: inserted.id };
  });
}

async function handleCreateUser(req) {
  try {
    const result = await Effect.runPromise(Effect.either(handleCreateUserEffect(req)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Internal server error' }, 500);
    }
    return json(result.right, 201);
  } catch (err) {
    console.error("Create user error:", err);
    return json({ message: 'Failed to create user' }, 500);
  }
}

export function handleDeleteUserEffect(req, params) {
  return Effect.gen(function* () {
    const id = parseInt(params[0], 10);
    if (isNaN(id)) return yield* Effect.fail({ status: 400, message: "Invalid user ID" });
    const currentUser = req.user;

    if (id === 1 || String(id) === String(currentUser?.id)) {
      return yield* Effect.fail({ status: 400, message: 'Cannot delete the main admin or your own current logged-in user account' });
    }

    const existing = yield* Effect.tryPromise({
      try: () => db.users.get(id),
      catch: (error) => new Error(`Database query user failed: ${error.message}`)
    });

    if (!existing) {
      return yield* Effect.fail({ status: 404, message: 'User not found' });
    }

    const storage = getActiveStorage();
    const fallbackUserId = currentUser?.id || 1;

    yield* Effect.tryPromise({
      try: async () => {
        await storage.execute("UPDATE stock_movements SET user_id = NULL WHERE user_id = ?", [id]);
        await storage.execute("UPDATE stock_opnames SET user_id = ? WHERE user_id = ?", [fallbackUserId, id]);
        await db.users.delete(id);
      },
      catch: (error) => new Error(`Database operation failed: ${error.message}`)
    });

    return { success: true };
  });
}

async function handleDeleteUser(req, params) {
  try {
    const result = await Effect.runPromise(Effect.either(handleDeleteUserEffect(req, params)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Internal server error' }, 500);
    }
    return json(result.right);
  } catch (err) {
    console.error("Delete user error:", err);
    return json({ message: 'Failed to delete user' }, 500);
  }
}

export function handleListProductsEffect(req) {
  return Effect.gen(function* () {
    const list = yield* Effect.tryPromise({
      try: () => db.products.list(),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    const activeStorage = getActiveStorage();
    const lastOpnames = yield* Effect.tryPromise({
      try: () => activeStorage.query(`
        SELECT soi.product_id, MAX(so.created_at) as last_opname_at
        FROM stock_opname_items soi
        JOIN stock_opnames so ON soi.opname_id = so.id
        GROUP BY soi.product_id
      `),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });

    const lastOpnameMap = new Map();
    if (lastOpnames && Array.isArray(lastOpnames)) {
      for (const row of lastOpnames) {
        lastOpnameMap.set(row.product_id, row.last_opname_at);
      }
    }

    const listWithOpname = list.map(p => ({
      ...p,
      last_opname_at: lastOpnameMap.get(p.id) || null
    }));

    listWithOpname.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return listWithOpname;
  });
}

async function handleListProducts(req) {
  try {
    const list = await Effect.runPromise(handleListProductsEffect(req));
    return json(list);
  } catch (err) {
    console.error("List products error:", err);
    return json({ message: err.message || 'Failed to retrieve products' }, 500);
  }
}

export function handleListOrdersEffect(req) {
  return Effect.gen(function* () {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || 'all';
    const systemStatus = url.searchParams.get('system_status') || 'all';

    const list = yield* Effect.tryPromise({
      try: () => db.orders.listDetailed({
        page,
        limit,
        search,
        status,
        systemStatus
      }),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });

    return list;
  });
}

async function handleListOrders(req) {
  try {
    const list = await Effect.runPromise(handleListOrdersEffect(req));
    return json(list);
  } catch (err) {
    console.error("Failed to list orders:", err);
    return json({ message: "Failed to list orders" }, 500);
  }
}

export function handleListLedgerEffect(req) {
  return Effect.gen(function* () {
    const url = new URL(req.url);
    const search = url.searchParams.get('search') || '';
    const activeStorage = getActiveStorage();

    let sql = `
      SELECT 
        m.id,
        m.product_id,
        m.quantity_change,
        m.movement_type,
        m.reference,
        m.user_id,
        m.created_at,
        p.name AS name,
        p.model AS model,
        u.username AS username
      FROM stock_movements m
      JOIN products p ON m.product_id = p.id
      LEFT JOIN users u ON m.user_id = u.id
    `;
    
    let params = [];
    if (search.trim()) {
      const wildcard = `%${search.trim()}%`;
      sql += `
        WHERE p.name LIKE ? 
           OR p.model LIKE ? 
           OR m.reference LIKE ? 
           OR m.movement_type LIKE ?
      `;
      params = [wildcard, wildcard, wildcard, wildcard];
    }
    
    sql += ` ORDER BY m.created_at DESC, m.id DESC LIMIT 100`;

    const joined = yield* Effect.tryPromise({
      try: () => activeStorage.query(sql, params),
      catch: (error) => new Error(`DB query failed: ${error.message}`)
    });

    return joined;
  });
}

async function handleListLedger(req) {
  try {
    const result = await Effect.runPromise(handleListLedgerEffect(req));
    return json(result);
  } catch (err) {
    console.error("List ledger error:", err);
    return json({ message: err.message || 'Failed to retrieve stock ledger' }, 500);
  }
}

export function handleCreateProductEffect(req) {
  return Effect.gen(function* () {
    const body = yield* Effect.tryPromise({
      try: () => readJson(req),
      catch: (error) => new Error(`Invalid request JSON: ${error.message}`)
    });
    const decodeResult = Schema.decodeEither(createProductSchema)(body);
    if (Either.isLeft(decodeResult)) {
      return yield* Effect.fail({ status: 400, message: String(decodeResult.left) });
    }
    const { name, model, master_sku, description, initial_stock = 0, low_stock_threshold = 10 } = decodeResult.right;

    const user = req.user;
    const threshold = low_stock_threshold;
    const stock = initial_stock;

    const existing = yield* Effect.tryPromise({
      try: () => db.products.getByName(name),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    if (existing) {
      return yield* Effect.fail({ status: 400, message: 'Product name already exists' });
    }

    const inserted = yield* Effect.tryPromise({
      try: () => db.products.insert({
        name,
        model: model || null,
        master_sku: master_sku || null,
        description: description || '',
        current_stock: stock,
        low_stock_threshold: threshold
      }),
      catch: (error) => new Error(`Database product insert failed: ${error.message}`)
    });

    if (stock !== 0) {
      yield* Effect.tryPromise({
        try: () => db.movements.insert({
          product_id: inserted.id,
          quantity_change: stock,
          movement_type: 'initial',
          reference: 'Initial product creation stock',
          user_id: user.id,
          created_at: '2026-06-01 00:00:00'
        }),
        catch: (error) => new Error(`Database movement insert failed: ${error.message}`)
      });
    }

    return { success: true, id: inserted.id };
  });
}

async function handleCreateProduct(req) {
  try {
    const result = await Effect.runPromise(Effect.either(handleCreateProductEffect(req)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Failed to create product' }, 500);
    }
    return json(result.right, 201);
  } catch (err) {
    console.error("Add product error:", err);
    return json({ message: 'Failed to create product' }, 500);
  }
}

export function handleProductLedgerEffect(req, params) {
  return Effect.gen(function* () {
    const id = parseInt(params[0], 10);
    if (isNaN(id)) {
      return yield* Effect.fail(new Error("Invalid product ID"));
    }
    const activeStorage = getActiveStorage();

    const movements = yield* Effect.tryPromise({
      try: () => activeStorage.query(
        `SELECT * FROM stock_movements WHERE product_id = ? ORDER BY created_at ASC`,
        [id]
      ),
      catch: (error) => new Error(`DB query for product movements failed: ${error.message}`)
    });

    if (!movements || movements.length === 0) {
      return [];
    }

    const orderIdSet = new Set();
    for (const m of movements) {
      if (m.reference) {
        const match = m.reference.match(/Order ID:\s*([^\s,]+)/i);
        if (match) orderIdSet.add(match[1]);
      }
    }

    const platformMap = new Map();
    if (orderIdSet.size > 0) {
      const orderIds = Array.from(orderIdSet);
      const CHUNK_SIZE = 999;
      for (let i = 0; i < orderIds.length; i += CHUNK_SIZE) {
        const chunk = orderIds.slice(i, i + CHUNK_SIZE);
        const placeholders = chunk.map(() => '?').join(',');
        
        const orderRows = yield* Effect.tryPromise({
          try: () => activeStorage.query(
            `SELECT o.order_id, t.name AS platform_name
             FROM orders o
             JOIN import_sessions s ON o.import_session_id = s.id
             JOIN import_templates t ON s.template_id = t.id
             WHERE o.order_id IN (${placeholders})`,
            chunk
          ),
          catch: (error) => new Error(`DB query for orders chunk failed: ${error.message}`)
        });

        for (const row of orderRows) {
          platformMap.set(row.order_id, row.platform_name);
        }
      }
    }

    const result = movements.map((m) => {
      let platform_name = null;
      if (m.reference) {
        const match = m.reference.match(/Order ID:\s*([^\s,]+)/i);
        if (match) platform_name = platformMap.get(match[1]) || null;
      }
      return { ...m, platform_name };
    });

    return result;
  });
}

async function handleProductLedger(req, params) {
  try {
    const result = await Effect.runPromise(handleProductLedgerEffect(req, params));
    return json(result);
  } catch (err) {
    console.error("Get product ledger history error:", err);
    return json({ message: err.message || 'Failed to retrieve product ledger history' }, 500);
  }
}

export function handleAdjustStockEffect(req, params) {
  return Effect.gen(function* () {
    const id = parseInt(params[0], 10);
    if (isNaN(id)) return yield* Effect.fail({ status: 400, message: "Invalid product ID" });
    const body = yield* Effect.tryPromise({
      try: () => readJson(req),
      catch: (error) => new Error(`Invalid request JSON: ${error.message}`)
    });
    const decodeResult = Schema.decodeEither(adjustStockSchema)(body);
    if (Either.isLeft(decodeResult)) {
      return yield* Effect.fail({ status: 400, message: String(decodeResult.left) });
    }
    const { quantity_change, movement_type = 'manual_adjust', reference = 'Manual stock adjustment', created_at } = decodeResult.right;

    const change = quantity_change;
    const type = movement_type;
    const ref = reference;
    const user = req.user;

    let insertCreatedAt = undefined;
    if (created_at !== undefined && created_at !== '') {
      let parsedDate = null;
      const cleanStr = String(created_at).trim();
      
      const ddMMyyyyMatch = cleanStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2}):(\d{2}))?$/);
      if (ddMMyyyyMatch) {
        const day = parseInt(ddMMyyyyMatch[1], 10);
        const month = parseInt(ddMMyyyyMatch[2], 10) - 1;
        const year = parseInt(ddMMyyyyMatch[3], 10);
        const hour = ddMMyyyyMatch[4] ? parseInt(ddMMyyyyMatch[4], 10) : 0;
        const minute = ddMMyyyyMatch[5] ? parseInt(ddMMyyyyMatch[5], 10) : 0;
        const second = ddMMyyyyMatch[6] ? parseInt(ddMMyyyyMatch[6], 10) : 0;
        parsedDate = new Date(year, month, day, hour, minute, second);
      } else {
        parsedDate = new Date(cleanStr);
      }

      if (isNaN(parsedDate.getTime())) {
        return yield* Effect.fail({ status: 400, message: 'Invalid date format. Use DD/MM/YYYY or YYYY-MM-DD.' });
      }

      const y = parsedDate.getFullYear();
      const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const d = String(parsedDate.getDate()).padStart(2, '0');
      const hr = String(parsedDate.getHours()).padStart(2, '0');
      const min = String(parsedDate.getMinutes()).padStart(2, '0');
      const sec = String(parsedDate.getSeconds()).padStart(2, '0');
      
      insertCreatedAt = `${y}-${m}-${d} ${hr}:${min}:${sec}`;
    }

    const product = yield* Effect.tryPromise({
      try: () => db.products.get(id),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    if (!product) {
      return yield* Effect.fail({ status: 404, message: 'Product not found' });
    }

    yield* Effect.tryPromise({
      try: () => db.movements.insert({
        product_id: id,
        quantity_change: change,
        movement_type: type,
        reference: ref,
        user_id: user.id,
        created_at: insertCreatedAt
      }),
      catch: (error) => new Error(`Database insert failed: ${error.message}`)
    });

    const newStock = product.current_stock + change;
    yield* Effect.tryPromise({
      try: () => db.products.update(id, { current_stock: newStock }),
      catch: (error) => new Error(`Database update failed: ${error.message}`)
    });

    return { success: true, current_stock: newStock };
  });
}

async function handleAdjustStock(req, params) {
  try {
    const result = await Effect.runPromise(Effect.either(handleAdjustStockEffect(req, params)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Failed to adjust stock' }, 500);
    }
    return json(result.right);
  } catch (err) {
    console.error("Adjust stock error:", err);
    return json({ message: 'Failed to adjust stock' }, 500);
  }
}

export function handleUpdateProductEffect(req, params) {
  return Effect.gen(function* () {
    const id = parseInt(params[0], 10);
    if (isNaN(id)) return yield* Effect.fail({ status: 400, message: "Invalid product ID" });
    const body = yield* Effect.tryPromise({
      try: () => readJson(req),
      catch: (error) => new Error(`Invalid request JSON: ${error.message}`)
    });
    const decodeResult = Schema.decodeEither(updateProductSchema)(body);
    if (Either.isLeft(decodeResult)) {
      return yield* Effect.fail({ status: 400, message: String(decodeResult.left) });
    }
    const { name, model, master_sku, description, low_stock_threshold = 10 } = decodeResult.right;

    const existing = yield* Effect.tryPromise({
      try: () => db.products.getByName(name),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    if (existing && existing.id !== id) {
      return yield* Effect.fail({ status: 400, message: 'Product name already exists' });
    }

    const threshold = low_stock_threshold;

    yield* Effect.tryPromise({
      try: () => db.products.update(id, {
        name,
        model: model || null,
        master_sku: master_sku || null,
        description: description || '',
        low_stock_threshold: threshold
      }),
      catch: (error) => new Error(`Database update failed: ${error.message}`)
    });

    return { success: true };
  });
}

async function handleUpdateProduct(req, params) {
  try {
    const result = await Effect.runPromise(Effect.either(handleUpdateProductEffect(req, params)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Failed to update product' }, 500);
    }
    return json(result.right);
  } catch (err) {
    console.error("Edit product error:", err);
    return json({ message: 'Failed to update product' }, 500);
  }
}

export function handleDeleteProductEffect(req, params) {
  return Effect.gen(function* () {
    const id = parseInt(params[0], 10);
    if (isNaN(id)) return yield* Effect.fail({ status: 400, message: "Invalid product ID" });
    
    const product = yield* Effect.tryPromise({
      try: () => db.products.get(id),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    if (!product) {
      return yield* Effect.fail({ status: 404, message: 'Product not found' });
    }

    yield* Effect.tryPromise({
      try: () => db.products.delete(id),
      catch: (error) => new Error(`Database delete failed: ${error.message}`)
    });
    return { success: true };
  });
}

async function handleDeleteProduct(req, params) {
  try {
    const result = await Effect.runPromise(Effect.either(handleDeleteProductEffect(req, params)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Failed to delete product' }, 500);
    }
    return json(result.right);
  } catch (err) {
    console.error("Delete product error:", err);
    return json({ message: 'Failed to delete product' }, 500);
  }
}

export function handleListTemplatesEffect(req) {
  return Effect.gen(function* () {
    const templates = yield* Effect.tryPromise({
      try: () => db.templates.list(),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    const result = templates.map(t => ({
      ...t,
      column_mapping: JSON.parse(t.column_mapping)
    }));
    result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return result;
  });
}

async function handleListTemplates(req) {
  try {
    const list = await Effect.runPromise(handleListTemplatesEffect(req));
    return json(list);
  } catch (err) {
    console.error("List templates error:", err);
    return json({ message: err.message || 'Failed to retrieve templates' }, 500);
  }
}

export function handleSaveTemplateEffect(req) {
  return Effect.gen(function* () {
    const body = yield* Effect.tryPromise({
      try: () => readJson(req),
      catch: (error) => new Error(`Invalid request JSON: ${error.message}`)
    });
    const { id, name, column_mapping } = body;
    if (!name || !column_mapping) {
      return yield* Effect.fail({ status: 400, message: 'Template name and column mapping are required' });
    }

    const mappingStr = JSON.stringify(column_mapping);

    if (id) {
      yield* Effect.tryPromise({
        try: () => db.templates.update(parseInt(id, 10), {
          name,
          column_mapping: mappingStr
        }),
        catch: (error) => new Error(`Database update failed: ${error.message}`)
      });
      return { success: true, id: parseInt(id, 10), created: false };
    } else {
      const existing = yield* Effect.tryPromise({
        try: () => db.templates.getByName(name),
        catch: (error) => new Error(`Database query failed: ${error.message}`)
      });
      if (existing) {
        return yield* Effect.fail({ status: 400, message: 'Template name already exists' });
      }

      const inserted = yield* Effect.tryPromise({
        try: () => db.templates.insert({
          name,
          column_mapping: mappingStr
        }),
        catch: (error) => new Error(`Database insert failed: ${error.message}`)
      });

      return { success: true, id: inserted.id, created: true };
    }
  });
}

async function handleSaveTemplate(req) {
  try {
    const result = await Effect.runPromise(Effect.either(handleSaveTemplateEffect(req)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Failed to save template' }, 500);
    }
    const { success, id, created } = result.right;
    return json({ success, id }, created ? 201 : 200);
  } catch (err) {
    console.error("Save template error:", err);
    return json({ message: 'Failed to save template' }, 500);
  }
}

export function handleDeleteTemplateEffect(req, params) {
  return Effect.gen(function* () {
    const id = parseInt(params[0], 10);
    if (isNaN(id)) return yield* Effect.fail({ status: 400, message: "Invalid template ID" });
    const existing = yield* Effect.tryPromise({
      try: () => db.templates.get(id),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    if (!existing) {
      return yield* Effect.fail({ status: 404, message: 'Template not found' });
    }

    yield* Effect.tryPromise({
      try: () => db.templates.delete(id),
      catch: (error) => new Error(`Database delete failed: ${error.message}`)
    });
    return { success: true };
  });
}

async function handleDeleteTemplate(req, params) {
  try {
    const result = await Effect.runPromise(Effect.either(handleDeleteTemplateEffect(req, params)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Failed to delete template' }, 500);
    }
    return json(result.right);
  } catch (err) {
    console.error("Delete template error:", err);
    return json({ message: 'Failed to delete template' }, 500);
  }
}

// Helper to parse order dates from various e-commerce formats
function parseOrderDate(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (s === '') return null;

  // If it's already a standard timestamp/ISO format, e.g. YYYY-MM-DD...
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    try {
      const parts = s.split(/[- :]/);
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const hour = parts[3] ? parseInt(parts[3], 10) : 0;
      const minute = parts[4] ? parseInt(parts[4], 10) : 0;
      const second = parts[5] ? parseInt(parts[5], 10) : 0;
      return new Date(year, month, day, hour, minute, second);
    } catch (e) {
      return null;
    }
  }

  // If it is DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dmyMatch) {
    const [_, day, month, year, hour = '00', minute = '00', second = '00'] = dmyMatch;
    return new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(minute, 10),
      parseInt(second, 10)
    );
  }

  // Handle wordy Indonesian formats, e.g. "07 Jun 2026 08:30"
  const months = {
    jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, jun: 5,
    jul: 6, agu: 7, sep: 8, okt: 9, nov: 10, des: 11,
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
  };

  const wordMatch = s.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (wordMatch) {
    const [_, day, monthWord, year, hour = '00', minute = '00', second = '00'] = wordMatch;
    const month = months[monthWord.toLowerCase().substring(0, 3)] || 0;
    return new Date(
      parseInt(year, 10),
      month,
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(minute, 10),
      parseInt(second, 10)
    );
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function parseOpnameDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split(/[- :]/);
  if (parts.length >= 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const hour = parts[3] ? parseInt(parts[3], 10) : 0;
    const minute = parts[4] ? parseInt(parts[4], 10) : 0;
    const second = parts[5] ? parseInt(parts[5], 10) : 0;
    return new Date(year, month, day, hour, minute, second);
  }
  return null;
}

function translateOrderStatus(status) {
  if (!status) return 'Unknown';
  const clean = String(status).trim().toLowerCase();
  
  const translations = {
    'selesai': 'Completed',
    'batal': 'Cancelled',
    'perlu dikirim': 'To Ship',
    'dikirim': 'Shipped',
    'belum bayar': 'Unpaid',
    'pesanan diterima': 'Completed',
    'pengembalian': 'Returned',
    'batal/cancel': 'Cancelled',
    'kembali': 'Returned',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'shipped': 'Shipped',
    'unpaid': 'Unpaid',
    'returned': 'Returned',
    'to ship': 'To Ship',
    'cancel': 'Cancelled'
  };
  
  for (const [key, val] of Object.entries(translations)) {
    if (clean.includes(key)) return val;
  }
  
  // Return capitalized default
  return status.charAt(0).toUpperCase() + status.slice(1);
}


export function handleUploadExcelEffect(req) {
  return Effect.gen(function* () {
    let templateId;
    let filename;
    let parsedRows;

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = yield* Effect.tryPromise({
        try: () => readJson(req),
        catch: (error) => new Error(`Invalid request JSON: ${error.message}`)
      });
      templateId = parseInt(body.template_id, 10);
      filename = body.filename || 'upload.xlsx';

      if (!templateId || isNaN(templateId)) {
        return yield* Effect.fail({ status: 400, message: 'Template selection is required' });
      }

      const rawRows = body.raw_rows;
      if (!rawRows || !Array.isArray(rawRows)) {
        return yield* Effect.fail({ status: 400, message: 'raw_rows must be a valid array' });
      }

      const template = yield* Effect.tryPromise({
        try: () => db.templates.get(templateId),
        catch: (error) => new Error(`Database query failed: ${error.message}`)
      });
      if (!template) {
        return yield* Effect.fail({ status: 404, message: 'Template not found' });
      }
      const mapping = JSON.parse(template.column_mapping);
      parsedRows = mapRawRows(rawRows, mapping);
    } else {
      const formData = yield* Effect.tryPromise({
        try: () => req.clone().formData(),
        catch: (error) => new Error(`Invalid form data: ${error.message}`)
      });
      const file = formData.get('file');
      templateId = parseInt(formData.get('template_id'), 10);
      filename = file ? file.name : 'upload.xlsx';

      if (!file || typeof file.arrayBuffer !== 'function' || !templateId || isNaN(templateId)) {
        return yield* Effect.fail({ status: 400, message: 'Excel file and template selection are required' });
      }

      const template = yield* Effect.tryPromise({
        try: () => db.templates.get(templateId),
        catch: (error) => new Error(`Database query failed: ${error.message}`)
      });
      if (!template) {
        return yield* Effect.fail({ status: 404, message: 'Template not found' });
      }
      const mapping = JSON.parse(template.column_mapping);

      const arrayBuffer = yield* Effect.tryPromise({
        try: () => file.arrayBuffer(),
        catch: (error) => new Error(`Failed to read file array buffer: ${error.message}`)
      });
      const buffer = Buffer.from(arrayBuffer);
      parsedRows = yield* Effect.tryPromise({
        try: () => parseExcel(buffer, mapping),
        catch: (error) => new Error(`Failed to parse Excel: ${error.message}`)
      });
    }

    const catalog = yield* Effect.tryPromise({
      try: () => db.products.list(),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    const skuMappings = yield* Effect.tryPromise({
      try: () => db.skuMappings.list(),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });

    const activeStorage = getActiveStorage();
    const lastOpnames = yield* Effect.tryPromise({
      try: () => activeStorage.query(`
        SELECT soi.product_id, MAX(so.created_at) as last_opname_at
        FROM stock_opname_items soi
        JOIN stock_opnames so ON soi.opname_id = so.id
        GROUP BY soi.product_id
      `),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });

    const lastOpnameMap = new Map();
    if (lastOpnames && Array.isArray(lastOpnames)) {
      for (const row of lastOpnames) {
        lastOpnameMap.set(row.product_id, row.last_opname_at);
      }
    }

    // Bulk fetch existing order IDs to check duplicates
    const incomingOrderIds = parsedRows.map(r => r.order_id).filter(Boolean);
    const existingOrderIdsList = yield* Effect.tryPromise({
      try: () => db.orders.checkExistingOrderIds(incomingOrderIds),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    const existingOrderIdsSet = new Set(existingOrderIdsList);

    // Bulk fetch all aliases to do in-memory lookups
    const allAliases = yield* Effect.tryPromise({
      try: () => db.aliases.listAll(),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    const aliasMap = new Map(allAliases.map(a => [a.clean_text.toLowerCase(), a.product_id]));

    const previewOrders = [];
    let flaggedRowsCount = 0;

    for (const row of parsedRows) {
      if (!row.order_id) continue;
      if (row.product_name_raw && String(row.product_name_raw).toLowerCase().includes('[free gift]')) {
        continue;
      }

      const isDuplicate = existingOrderIdsSet.has(row.order_id);

      const translatedStatus = translateOrderStatus(row.order_status);
      const orderStatusNorm = translatedStatus.toLowerCase();
      const needsReview = orderStatusNorm.includes('batal') || orderStatusNorm.includes('cancel') || orderStatusNorm.includes('returned') || orderStatusNorm.includes('pengembalian');
      const systemStatus = needsReview ? 'needs_review' : 'normal';

      if (needsReview) {
        flaggedRowsCount++;
      }

      const promoRes = extractSameProductPromo(row.product_name_raw);
      const packRes = extractPackMultiplier(promoRes.cleanText);
      const cleanedText = packRes.cleanText;
      const baseMultiplier = promoRes.promoMultiplier * packRes.packMultiplier;
      const totalQuantity = row.quantity * baseMultiplier;

      let suggestedSplits = [];
      let resolvedDirectly = false;

      const promoSplits = resolvePromoProductToBaseItems(row.sku_ref, row.product_name_raw, row.quantity, catalog, skuMappings);
      if (promoSplits) {
        suggestedSplits = promoSplits;
        resolvedDirectly = true;
      }

      if (!resolvedDirectly && row.sku_ref && String(row.sku_ref).trim() !== '') {
        const refSku = String(row.sku_ref).trim().toLowerCase();
        const matchedProduct = catalog.find(p => (p.model || '').toLowerCase() === refSku);
        if (matchedProduct) {
          suggestedSplits.push({
            product_id: matchedProduct.id,
            product_name: matchedProduct.name,
            model: matchedProduct.model,
            quantity: totalQuantity,
            parse_source: 'direct',
            original_text: row.product_name_raw,
            is_confirmed: true
          });
          resolvedDirectly = true;
        }
      }

      if (!resolvedDirectly) {
        const aliasProductId = aliasMap.get(cleanedText.toLowerCase());
        if (aliasProductId) {
          const matchedProduct = catalog.find(p => p.id === aliasProductId);
          if (matchedProduct) {
            suggestedSplits.push({
              product_id: matchedProduct.id,
              product_name: matchedProduct.name,
              model: matchedProduct.model,
              quantity: totalQuantity,
              parse_source: 'alias',
              original_text: row.product_name_raw,
              is_confirmed: true
            });
            resolvedDirectly = true;
          }
        }
      }

      if (!resolvedDirectly) {
        suggestedSplits = [{
          product_id: null,
          product_name: 'Unknown Product (Awaiting Selection)',
          model: '',
          quantity: totalQuantity,
          parse_source: 'direct',
          original_text: row.product_name_raw,
          is_confirmed: false
        }];
      }

      const hasAmbiguous = suggestedSplits.some(s => s.product_id === null) || suggestedSplits.length > 1;

      for (const split of suggestedSplits) {
        if (split.product_id) {
          const lastOpnameAt = lastOpnameMap.get(split.product_id);
          if (lastOpnameAt && row.order_date) {
            const oDate = parseOrderDate(row.order_date);
            const opDate = parseOpnameDate(lastOpnameAt);
            if (oDate && opDate && oDate <= opDate) {
              split.skip_deduction = true;
            }
          }
        }
      }

      previewOrders.push({
        order_id: row.order_id,
        resi_number: row.resi_number || '',
        product_name_raw: row.product_name_raw,
        sku_ref: row.sku_ref || '',
        quantity: row.quantity,
        order_status: translatedStatus,
        customer_name: row.customer_name || '',
        expedition: row.expedition || '',
        order_date: row.order_date || '',
        price: row.price || 0,
        system_status: systemStatus,
        is_duplicate: isDuplicate,
        has_ambiguous: hasAmbiguous,
        cancellation_reason: row.cancellation_reason || '',
        cancel_return_status: row.cancel_return_status || '',
        parent_sku: row.parent_sku || '',
        splits: suggestedSplits
      });
    }

    if (previewOrders.length === 0) {
      return yield* Effect.fail({ status: 400, message: 'No valid orders found in the uploaded file' });
    }

    const user = req.user;

    const oldSessions = yield* Effect.tryPromise({
      try: () => db.sessions.list(),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    for (const s of oldSessions) {
      if (s.status === 'previewing') {
        yield* Effect.tryPromise({
          try: () => db.sessions.update(s.id, { status: 'cancelled', orders_data: null }),
          catch: (error) => new Error(`Database update failed: ${error.message}`)
        });
      }
    }
    
    const insertedSession = yield* Effect.tryPromise({
      try: () => db.sessions.insert({
        template_id: templateId,
        user_id: user.id,
        filename: filename,
        status: 'previewing',
        total_rows: previewOrders.length,
        flagged_rows: flaggedRowsCount,
        orders_data: JSON.stringify(previewOrders)
      }),
      catch: (error) => new Error(`Database insert failed: ${error.message}`)
    });

    return {
      session_id: insertedSession.id,
      filename: filename,
      total_rows: previewOrders.length,
      flagged_rows: flaggedRowsCount,
      orders: previewOrders
    };
  });
}

async function handleUploadExcel(req) {
  try {
    const result = await Effect.runPromise(Effect.either(handleUploadExcelEffect(req)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Failed to process Excel file' }, 500);
    }
    return json(result.right);
  } catch (err) {
    console.error("Excel upload error:", err);
    return json({ message: 'Failed to process Excel file' }, 500);
  }
}

export function handleConfirmImportEffect(req) {
  return Effect.gen(function* () {
    const body = yield* Effect.tryPromise({
      try: () => readJson(req),
      catch: (error) => new Error(`Invalid request JSON: ${error.message}`)
    });
    const { session_id, orders } = body;

    const sessionIdNum = parseInt(session_id, 10);
    if (isNaN(sessionIdNum) || sessionIdNum <= 0) {
      return yield* Effect.fail({ status: 400, message: 'Invalid Session ID parameter value' });
    }

    if (!orders || !Array.isArray(orders)) {
      return yield* Effect.fail({ status: 400, message: 'Invalid or missing orders list' });
    }

    const session = yield* Effect.tryPromise({
      try: () => db.sessions.get(sessionIdNum),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    if (!session || session.status !== 'previewing') {
      return yield* Effect.fail({ status: 404, message: 'Invalid or expired import session' });
    }

    const user = req.user;
    let appliedCount = 0;
    let flaggedCount = 0;

    const activeStorage = getActiveStorage();
    const lastOpnames = yield* Effect.tryPromise({
      try: () => activeStorage.query(`
        SELECT soi.product_id, MAX(so.created_at) as last_opname_at
        FROM stock_opname_items soi
        JOIN stock_opnames so ON soi.opname_id = so.id
        GROUP BY soi.product_id
      `),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });

    const lastOpnameMap = new Map();
    if (lastOpnames && Array.isArray(lastOpnames)) {
      for (const row of lastOpnames) {
        lastOpnameMap.set(row.product_id, row.last_opname_at);
      }
    }

    const queries = [];

    for (const order of orders) {
      queries.push({
        sql: "INSERT INTO orders (import_session_id, order_id, resi_number, product_name_raw, quantity, order_status, customer_name, expedition, order_date, price, system_status, resolution, resolution_notes, resolved_at, cancellation_reason, cancel_return_status, parent_sku, sku_ref, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))",
        params: [
          sessionIdNum,
          order.order_id,
          order.resi_number || null,
          order.product_name_raw,
          parseInt(order.quantity, 10),
          order.order_status,
          order.customer_name || null,
          order.expedition || null,
          order.order_date || null,
          parseFloat(order.price) || 0,
          order.system_status || 'normal',
          order.resolution || null,
          order.resolution_notes || null,
          order.resolved_at || null,
          order.cancellation_reason || null,
          order.cancel_return_status || null,
          order.parent_sku || null,
          order.sku_ref || null
        ]
      });

      if (order.system_status === 'needs_review') {
        flaggedCount++;
      }

      if (order.splits && Array.isArray(order.splits)) {
        for (const split of order.splits) {
          queries.push({
            sql: "INSERT INTO order_items (order_id, product_id, quantity, parse_source, original_text, is_confirmed) VALUES ((SELECT id FROM orders WHERE order_id = ? AND import_session_id = ?), ?, ?, ?, ?, ?)",
            params: [
              order.order_id,
              sessionIdNum,
              split.product_id ? parseInt(split.product_id, 10) : null,
              parseInt(split.quantity, 10),
              split.parse_source || 'direct',
              split.original_text || order.product_name_raw,
              split.product_id ? 1 : 0
            ]
          });

          if (split.parse_source === 'manual' && split.product_id && split.original_text) {
            const promoRes = extractSameProductPromo(split.original_text);
            const packRes = extractPackMultiplier(promoRes.cleanText);
            queries.push({
              sql: "INSERT OR REPLACE INTO product_aliases (clean_text, product_id) VALUES (?, ?)",
              params: [
                packRes.cleanText.toLowerCase(),
                parseInt(split.product_id, 10)
              ]
            });
          }

          if (order.system_status === 'normal' && split.product_id) {
            let isSkipped = false;
            const lastOpnameAt = lastOpnameMap.get(parseInt(split.product_id, 10));
            if (lastOpnameAt && order.order_date) {
              const oDate = parseOrderDate(order.order_date);
              const opDate = parseOpnameDate(lastOpnameAt);
              if (oDate && opDate && oDate <= opDate) {
                isSkipped = true;
              }
            }

            if (!isSkipped) {
              queries.push({
                sql: "INSERT INTO stock_movements (product_id, quantity_change, movement_type, reference, user_id, created_at) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))",
                params: [
                  parseInt(split.product_id, 10),
                  -parseInt(split.quantity, 10),
                  'sale',
                  `Order ID: ${order.order_id}`,
                  user.id
                ]
              });

              queries.push({
                sql: "UPDATE products SET current_stock = current_stock - ?, updated_at = datetime('now', 'localtime') WHERE id = ?",
                params: [
                  parseInt(split.quantity, 10),
                  parseInt(split.product_id, 10)
                ]
              });
            }
          }
        }
      }

      appliedCount++;
    }

    queries.push({
      sql: "UPDATE import_sessions SET template_id = ?, user_id = ?, filename = ?, status = ?, total_rows = ?, applied_rows = ?, flagged_rows = ?, orders_data = ? WHERE id = ?",
      params: [
        session.template_id ? parseInt(session.template_id, 10) : null,
        session.user_id ? parseInt(session.user_id, 10) : null,
        session.filename,
        'applied',
        parseInt(session.total_rows, 10) || 0,
        appliedCount,
        flaggedCount,
        null,
        sessionIdNum
      ]
    });

    yield* Effect.tryPromise({
      try: () => activeStorage.executeTransaction(queries),
      catch: (error) => new Error(`Database transaction failed: ${error.message}`)
    });

    const { broadcast } = yield* Effect.tryPromise({
      try: () => import('../ws/broker.js'),
      catch: (error) => new Error(`Websocket broker load failed: ${error.message}`)
    });
    const updatedSession = yield* Effect.tryPromise({
      try: () => db.sessions.get(sessionIdNum),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    if (updatedSession) {
      broadcast({ type: 'SESSION_UPDATED', payload: updatedSession });
    }

    return { success: true, applied_rows: appliedCount, flagged_rows: flaggedCount };
  });
}

async function handleConfirmImport(req) {
  try {
    const result = await Effect.runPromise(Effect.either(handleConfirmImportEffect(req)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Failed to apply import changes' }, 500);
    }
    return json(result.right);
  } catch (err) {
    console.error("Confirm import error:", err);
    return json({ message: 'Failed to apply import changes' }, 500);
  }
}

export function handleCancelImportEffect(req) {
  return Effect.gen(function* () {
    const body = yield* Effect.tryPromise({
      try: () => readJson(req),
      catch: (error) => new Error(`Invalid request JSON: ${error.message}`)
    });
    const { session_id } = body;
    if (!session_id) {
      return yield* Effect.fail({ status: 400, message: 'Session ID is required' });
    }

    yield* Effect.tryPromise({
      try: () => db.sessions.update(parseInt(session_id, 10), {
        status: 'cancelled',
        orders_data: null
      }),
      catch: (error) => new Error(`Database update failed: ${error.message}`)
    });
    return { success: true };
  });
}

async function handleCancelImport(req) {
  try {
    const result = await Effect.runPromise(Effect.either(handleCancelImportEffect(req)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Failed to cancel session' }, 500);
    }
    return json(result.right);
  } catch (err) {
    console.error("Cancel import error:", err);
    return json({ message: 'Failed to cancel session' }, 500);
  }
}

export function handleGetActiveSessionEffect(req) {
  return Effect.gen(function* () {
    const sessionsList = yield* Effect.tryPromise({
      try: () => db.sessions.list(),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    const active = sessionsList.find(s => s.status === 'previewing');
    if (active) {
      return {
        session_id: active.id,
        filename: active.filename,
        total_rows: active.total_rows,
        flagged_rows: active.flagged_rows,
        orders: JSON.parse(active.orders_data || '[]')
      };
    }
    return null;
  });
}

async function handleGetActiveSession(req) {
  try {
    const result = await Effect.runPromise(handleGetActiveSessionEffect(req));
    return json(result);
  } catch (err) {
    console.error("Get active session error:", err);
    return json({ message: 'Failed to retrieve active session' }, 500);
  }
}

export function handleSyncActiveSessionEffect(req) {
  return Effect.gen(function* () {
    const body = yield* Effect.tryPromise({
      try: () => readJson(req),
      catch: (error) => new Error(`Invalid request JSON: ${error.message}`)
    });
    const { session_id, orders } = body;
    if (!session_id || !orders) {
      return yield* Effect.fail({ status: 400, message: 'Session ID and orders are required' });
    }
    yield* Effect.tryPromise({
      try: () => db.sessions.update(parseInt(session_id, 10), {
        orders_data: JSON.stringify(orders)
      }),
      catch: (error) => new Error(`Database update failed: ${error.message}`)
    });
    return { success: true };
  });
}

async function handleSyncActiveSession(req) {
  try {
    const result = await Effect.runPromise(Effect.either(handleSyncActiveSessionEffect(req)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Failed to sync session data' }, 500);
    }
    return json(result.right);
  } catch (err) {
    console.error("Sync active session error:", err);
    return json({ message: 'Failed to sync session data' }, 500);
  }
}

export function handleGetSessionsEffect(req) {
  return Effect.gen(function* () {
    const sessionsList = yield* Effect.tryPromise({
      try: () => db.sessions.list(),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    const templatesList = yield* Effect.tryPromise({
      try: () => db.templates.list(),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    const usersList = yield* Effect.tryPromise({
      try: () => db.users.list(),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });

    const templateMap = new Map(templatesList.map(t => [t.id, t]));
    const userMap = new Map(usersList.map(u => [u.id, u]));

    const joined = sessionsList.map(s => {
      const template = templateMap.get(s.template_id);
      const user = userMap.get(s.user_id);
      return {
        ...s,
        template_name: template ? template.name : null,
        username: user ? user.username : null
      };
    });

    joined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const limited = joined.slice(0, 10);
    return limited;
  });
}

async function handleGetSessions(req) {
  try {
    const result = await Effect.runPromise(handleGetSessionsEffect(req));
    return json(result);
  } catch (err) {
    console.error("Get sessions error:", err);
    return json({ message: 'Failed to retrieve sessions history' }, 500);
  }
}

export function handleListSkuMappingsEffect(req) {
  return Effect.gen(function* () {
    const list = yield* Effect.tryPromise({
      try: () => db.skuMappings.list(),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    return list;
  });
}

async function handleListSkuMappings(req) {
  try {
    const result = await Effect.runPromise(handleListSkuMappingsEffect(req));
    return json(result);
  } catch (err) {
    console.error("Get sku mappings error:", err);
    return json({ message: err.message || 'Failed to retrieve SKU mappings' }, 500);
  }
}

export function handleSaveSkuMappingEffect(req) {
  return Effect.gen(function* () {
    const body = yield* Effect.tryPromise({
      try: () => readJson(req),
      catch: (error) => new Error(`Invalid request JSON: ${error.message}`)
    });
    const { sku_code, product_id, quantity } = body;
    if (!sku_code || !product_id || !quantity) {
      return yield* Effect.fail({ status: 400, message: 'sku_code, product_id, and quantity are required' });
    }
    yield* Effect.tryPromise({
      try: () => db.skuMappings.insert({ sku_code, product_id, quantity }),
      catch: (error) => new Error(`Database insert failed: ${error.message}`)
    });
    return { success: true };
  });
}

async function handleSaveSkuMapping(req) {
  try {
    const result = await Effect.runPromise(Effect.either(handleSaveSkuMappingEffect(req)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Failed to save SKU mapping' }, 500);
    }
    return json(result.right);
  } catch (err) {
    console.error("Save sku mapping error:", err);
    return json({ message: 'Failed to save SKU mapping' }, 500);
  }
}

export function handleDeleteSkuMappingEffect(req) {
  return Effect.gen(function* () {
    const body = yield* Effect.tryPromise({
      try: () => readJson(req),
      catch: (error) => new Error(`Invalid request JSON: ${error.message}`)
    });
    const { sku_code, product_id } = body;
    if (!sku_code || !product_id) {
      return yield* Effect.fail({ status: 400, message: 'sku_code and product_id are required' });
    }
    yield* Effect.tryPromise({
      try: () => db.skuMappings.delete(sku_code, product_id),
      catch: (error) => new Error(`Database delete failed: ${error.message}`)
    });
    return { success: true };
  });
}

async function handleDeleteSkuMapping(req) {
  try {
    const result = await Effect.runPromise(Effect.either(handleDeleteSkuMappingEffect(req)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Failed to delete SKU mapping' }, 500);
    }
    return json(result.right);
  } catch (err) {
    console.error("Delete sku mapping error:", err);
    return json({ message: 'Failed to delete SKU mapping' }, 500);
  }
}

export function handleReviewOrdersEffect(req) {
  return Effect.gen(function* () {
    const ordersList = yield* Effect.tryPromise({
      try: () => db.orders.list(),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    const orderItemsList = yield* Effect.tryPromise({
      try: () => db.orderItems.list(),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    const productsList = yield* Effect.tryPromise({
      try: () => db.products.list(),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });

    const productMap = new Map(productsList.map(p => [p.id, p]));
    
    const itemsByOrder = new Map();
    for (const item of orderItemsList) {
      if (!itemsByOrder.has(item.order_id)) {
        itemsByOrder.set(item.order_id, []);
      }
      const prod = item.product_id ? productMap.get(item.product_id) : null;
      itemsByOrder.get(item.order_id).push({
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        is_confirmed: item.is_confirmed,
        product_name: prod ? prod.name : 'Unmapped Product',
        product_model: prod ? prod.model : ''
      });
    }

    const filtered = ordersList
      .filter(o => o.system_status === 'needs_review')
      .map(o => ({
        ...o,
        items: itemsByOrder.get(o.id) || []
      }));

    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return filtered;
  });
}

async function handleReviewOrders(req) {
  try {
    const result = await Effect.runPromise(handleReviewOrdersEffect(req));
    return json(result);
  } catch (err) {
    console.error("Get review orders error:", err);
    return json({ message: 'Failed to retrieve orders needing review' }, 500);
  }
}

export function handleReturnedOrdersEffect(req) {
  return Effect.gen(function* () {
    const ordersList = yield* Effect.tryPromise({
      try: () => db.orders.list(),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    const orderItemsList = yield* Effect.tryPromise({
      try: () => db.orderItems.list(),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    const productsList = yield* Effect.tryPromise({
      try: () => db.products.list(),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    const sessionsList = yield* Effect.tryPromise({
      try: () => db.sessions.list(),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    const templatesList = yield* Effect.tryPromise({
      try: () => db.templates.list(),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });

    const productMap = new Map(productsList.map(p => [p.id, p]));
    const templateMap = new Map(templatesList.map(t => [t.id, t]));
    const sessionMap = new Map(sessionsList.map(s => [s.id, s]));
    
    const itemsByOrder = new Map();
    for (const item of orderItemsList) {
      if (!itemsByOrder.has(item.order_id)) {
        itemsByOrder.set(item.order_id, []);
      }
      const prod = item.product_id ? productMap.get(item.product_id) : null;
      itemsByOrder.get(item.order_id).push({
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        is_confirmed: item.is_confirmed,
        product_name: prod ? prod.name : 'Unmapped Product',
        product_model: prod ? prod.model : ''
      });
    }

    const filtered = ordersList
      .filter(o => o.system_status === 'resolved' && o.resolution === 'returned')
      .map(o => {
        const session = o.import_session_id ? sessionMap.get(o.import_session_id) : null;
        const template = session && session.template_id ? templateMap.get(session.template_id) : null;
        return {
          ...o,
          channel_mp: template ? template.name : 'Unknown',
          items: itemsByOrder.get(o.id) || []
        };
      });

    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return filtered;
  });
}

async function handleReturnedOrders(req) {
  try {
    const result = await Effect.runPromise(handleReturnedOrdersEffect(req));
    return json(result);
  } catch (err) {
    console.error("Get returned orders error:", err);
    return json({ message: 'Failed to retrieve returned orders' }, 500);
  }
}

export function handleResolveReviewOrderEffect(req) {
  return Effect.gen(function* () {
    const body = yield* Effect.tryPromise({
      try: () => readJson(req),
      catch: (error) => new Error(`Invalid request JSON: ${error.message}`)
    });
    const { order_id, resolution, resolution_notes } = body;
    if (!order_id || !resolution) {
      return yield* Effect.fail({ status: 400, message: 'Order ID and resolution selection are required' });
    }

    if (!['returned', 'lost', 'investigating'].includes(resolution)) {
      return yield* Effect.fail({ status: 400, message: 'Invalid resolution option' });
    }

    const orderIdNum = parseInt(order_id, 10);
    const order = yield* Effect.tryPromise({
      try: () => db.orders.get(orderIdNum),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });

    if (!order || order.system_status !== 'needs_review') {
      return yield* Effect.fail({ status: 404, message: 'Order not found or already resolved' });
    }

    const user = req.user;

    if (resolution === 'investigating') {
      yield* Effect.tryPromise({
        try: () => db.orders.update(orderIdNum, {
          resolution: 'investigating',
          resolution_notes: resolution_notes || ''
        }),
        catch: (error) => new Error(`Database update failed: ${error.message}`)
      });
      return { success: true, status: 'needs_review' };
    }

    const items = yield* Effect.tryPromise({
      try: () => db.orderItems.getByOrderId(orderIdNum),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });

    if (resolution === 'lost') {
      for (const item of items) {
        if (item.product_id) {
          yield* Effect.tryPromise({
            try: () => db.movements.insert({
              product_id: item.product_id,
              quantity_change: -item.quantity,
              movement_type: 'write_off',
              reference: `Lost Order ID: ${order.order_id}`,
              user_id: user.id
            }),
            catch: (error) => new Error(`Database insert failed: ${error.message}`)
          });

          const prod = yield* Effect.tryPromise({
            try: () => db.products.get(item.product_id),
            catch: (error) => new Error(`Database query failed: ${error.message}`)
          });
          if (prod) {
            yield* Effect.tryPromise({
              try: () => db.products.update(item.product_id, {
                current_stock: prod.current_stock - item.quantity
              }),
              catch: (error) => new Error(`Database update failed: ${error.message}`)
            });
          }
        }
      }
    } else if (resolution === 'returned') {
      for (const item of items) {
        if (item.product_id) {
          yield* Effect.tryPromise({
            try: () => db.movements.insert({
              product_id: item.product_id,
              quantity_change: 0,
              movement_type: 'return',
              reference: `Returned Order ID: ${order.order_id} (No stock adjustment needed)`,
              user_id: user.id
            }),
            catch: (error) => new Error(`Database insert failed: ${error.message}`)
          });
        }
      }
    }

    yield* Effect.tryPromise({
      try: () => db.orders.update(orderIdNum, {
        system_status: 'resolved',
        resolution,
        resolution_notes: resolution_notes || '',
        resolved_at: new Date().toISOString()
      }),
      catch: (error) => new Error(`Database update failed: ${error.message}`)
    });

    return { success: true, status: 'resolved' };
  });
}

async function handleResolveReviewOrder(req) {
  try {
    const result = await Effect.runPromise(Effect.either(handleResolveReviewOrderEffect(req)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Failed to resolve order' }, 500);
    }
    return json(result.right);
  } catch (err) {
    console.error("Resolve order error:", err);
    return json({ message: 'Failed to resolve order' }, 500);
  }
}

export function handleReviewAmbiguousEffect(req) {
  return Effect.gen(function* () {
    const orderItemsList = yield* Effect.tryPromise({
      try: () => db.orderItems.list(),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    const ordersList = yield* Effect.tryPromise({
      try: () => db.orders.list(),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });

    const orderMap = new Map(ordersList.map(o => [o.id, o]));

    const filtered = orderItemsList
      .filter(oi => oi.is_confirmed === 0)
      .map(oi => {
        const order = orderMap.get(oi.order_id);
        return {
          ...oi,
          order_id: order ? order.order_id : null,
          product_name_raw: order ? order.product_name_raw : null,
          order_qty: order ? order.quantity : null,
          customer_name: order ? order.customer_name : null,
          order_date: order ? order.order_date : null,
          created_at: order ? order.created_at : oi.created_at
        };
      });

    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return filtered;
  });
}

async function handleReviewAmbiguous(req) {
  try {
    const result = await Effect.runPromise(handleReviewAmbiguousEffect(req));
    return json(result);
  } catch (err) {
    console.error("Get ambiguous items error:", err);
    return json({ message: 'Failed to retrieve ambiguous items' }, 500);
  }
}

export function handleConfirmSplitEffect(req) {
  return Effect.gen(function* () {
    const body = yield* Effect.tryPromise({
      try: () => readJson(req),
      catch: (error) => new Error(`Invalid request JSON: ${error.message}`)
    });
    const { item_id, product_id, quantity } = body;
    if (!item_id || !product_id || !quantity) {
      return yield* Effect.fail({ status: 400, message: 'Item ID, product selection, and quantity are required' });
    }

    const itemIdNum = parseInt(item_id, 10);
    const productIdNum = parseInt(product_id, 10);
    const qty = parseInt(quantity, 10);

    if (isNaN(itemIdNum) || isNaN(productIdNum) || isNaN(qty) || itemIdNum <= 0 || productIdNum <= 0 || qty <= 0) {
      return yield* Effect.fail({ status: 400, message: 'Invalid item ID, product ID, or quantity parameter values' });
    }

    const item = yield* Effect.tryPromise({
      try: () => db.orderItems.get(itemIdNum),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    if (!item || item.is_confirmed === 1) {
      return yield* Effect.fail({ status: 404, message: 'Item not found or already confirmed' });
    }

    const order = yield* Effect.tryPromise({
      try: () => db.orders.get(item.order_id),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    if (!order) {
      return yield* Effect.fail({ status: 404, message: 'Order not found' });
    }

    const product = yield* Effect.tryPromise({
      try: () => db.products.get(productIdNum),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    if (!product) {
      return yield* Effect.fail({ status: 404, message: 'Product not found' });
    }

    const user = req.user;

    yield* Effect.tryPromise({
      try: () => db.orderItems.update(itemIdNum, {
        product_id: productIdNum,
        quantity: qty,
        is_confirmed: 1
      }),
      catch: (error) => new Error(`Database update failed: ${error.message}`)
    });

    if (order.system_status === 'normal') {
      yield* Effect.tryPromise({
        try: () => db.movements.insert({
          product_id: productIdNum,
          quantity_change: -qty,
          movement_type: 'sale',
          reference: `Confirmed Split Order: ${order.order_id}`,
          user_id: user.id
        }),
        catch: (error) => new Error(`Database insert failed: ${error.message}`)
      });

      const prod = yield* Effect.tryPromise({
        try: () => db.products.get(productIdNum),
        catch: (error) => new Error(`Database query failed: ${error.message}`)
      });
      if (prod) {
        yield* Effect.tryPromise({
          try: () => db.products.update(productIdNum, {
            current_stock: prod.current_stock - qty
          }),
          catch: (error) => new Error(`Database update failed: ${error.message}`)
        });
      }
    }

    return { success: true };
  });
}

async function handleConfirmSplit(req) {
  try {
    const result = await Effect.runPromise(Effect.either(handleConfirmSplitEffect(req)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Failed to confirm split mapping' }, 500);
    }
    return json(result.right);
  } catch (err) {
    console.error("Confirm split error:", err);
    return json({ message: 'Failed to confirm split mapping' }, 500);
  }
}

export function handleDashboardStatsEffect(req) {
  return Effect.gen(function* () {
    const storage = getActiveStorage();

    const totalProductsRes = yield* Effect.tryPromise({
      try: () => storage.query("SELECT COUNT(*) AS count FROM products"),
      catch: (err) => new Error(`totalProducts query failed: ${err.message}`)
    });
    const totalProducts = totalProductsRes[0]?.count || 0;

    const lowStockRes = yield* Effect.tryPromise({
      try: () => storage.query("SELECT COUNT(*) AS count FROM products WHERE current_stock <= low_stock_threshold"),
      catch: (err) => new Error(`lowStock query failed: ${err.message}`)
    });
    const lowStockCount = lowStockRes[0]?.count || 0;

    const pendingReviewRes = yield* Effect.tryPromise({
      try: () => storage.query("SELECT COUNT(*) AS count FROM orders WHERE system_status = 'needs_review'"),
      catch: (err) => new Error(`pendingReview query failed: ${err.message}`)
    });
    const pendingReviewCount = pendingReviewRes[0]?.count || 0;

    const ambiguousRes = yield* Effect.tryPromise({
      try: () => storage.query("SELECT COUNT(*) AS count FROM order_items WHERE is_confirmed = 0"),
      catch: (err) => new Error(`ambiguous query failed: ${err.message}`)
    });
    const ambiguousCount = ambiguousRes[0]?.count || 0;

    const recentReviews = yield* Effect.tryPromise({
      try: () => storage.query(
        `SELECT id, order_id, product_name_raw, quantity, expedition 
         FROM orders 
         WHERE system_status = 'needs_review' 
         ORDER BY created_at DESC 
         LIMIT 5`
      ),
      catch: (err) => new Error(`recentReviews query failed: ${err.message}`)
    });

    const recentImports = yield* Effect.tryPromise({
      try: () => storage.query(
        `SELECT s.id, s.template_id, s.user_id, s.filename, s.status, s.total_rows, s.applied_rows, s.flagged_rows, s.orders_data, s.created_at, t.name AS template_name 
         FROM import_sessions s 
         LEFT JOIN import_templates t ON s.template_id = t.id 
         ORDER BY s.created_at DESC 
         LIMIT 5`
      ),
      catch: (err) => new Error(`recentImports query failed: ${err.message}`)
    });

    return {
      total_products: totalProducts,
      low_stock_count: lowStockCount,
      pending_review_count: pendingReviewCount,
      ambiguous_count: ambiguousCount,
      recent_reviews: recentReviews,
      recent_imports: recentImports
    };
  });
}

async function handleDashboardStats(req) {
  try {
    const result = await Effect.runPromise(Effect.either(handleDashboardStatsEffect(req)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Failed to retrieve dashboard statistics' }, 500);
    }
    return json(result.right);
  } catch (err) {
    console.error("Dashboard stats retrieval error:", err);
    return json({ message: 'Failed to retrieve dashboard statistics' }, 500);
  }
}

export function handleListOpnameEffect(req) {
  return Effect.gen(function* () {
    const opnamesList = yield* Effect.tryPromise({
      try: () => db.opnames.list(),
      catch: (err) => new Error(`db.opnames.list failed: ${err.message}`)
    });
    const usersList = yield* Effect.tryPromise({
      try: () => db.users.list(),
      catch: (err) => new Error(`db.users.list failed: ${err.message}`)
    });
    const itemsList = yield* Effect.tryPromise({
      try: () => db.opnameItems.list(),
      catch: (err) => new Error(`db.opnameItems.list failed: ${err.message}`)
    });

    const userMap = new Map(usersList.map(u => [u.id, u]));

    const countMap = new Map();
    for (const item of itemsList) {
      countMap.set(item.opname_id, (countMap.get(item.opname_id) || 0) + 1);
    }

    const joined = opnamesList.map(so => {
      const user = userMap.get(so.user_id);
      return {
        ...so,
        username: user ? user.username : null,
        items_count: countMap.get(so.id) || 0
      };
    });

    joined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return joined;
  });
}

async function handleListOpname(req) {
  try {
    const result = await Effect.runPromise(Effect.either(handleListOpnameEffect(req)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Failed to retrieve stock opnames' }, 500);
    }
    return json(result.right);
  } catch (err) {
    console.error("List stock opnames error:", err);
    return json({ message: 'Failed to retrieve stock opnames' }, 500);
  }
}

export function handleGetOpnameDetailsEffect(req, params) {
  return Effect.gen(function* () {
    const id = parseInt(params[0], 10);
    if (isNaN(id)) {
      return yield* Effect.fail({ status: 400, message: 'Invalid opname ID' });
    }

    const report = yield* Effect.tryPromise({
      try: () => db.opnames.get(id),
      catch: (err) => new Error(`db.opnames.get failed: ${err.message}`)
    });
    if (!report) {
      return yield* Effect.fail({ status: 404, message: 'Stock opname report not found' });
    }

    const user = yield* Effect.tryPromise({
      try: () => db.users.get(report.user_id),
      catch: (err) => new Error(`db.users.get failed: ${err.message}`)
    });
    const opnameItemsList = yield* Effect.tryPromise({
      try: () => db.opnameItems.getByOpnameId(id),
      catch: (err) => new Error(`db.opnameItems.getByOpnameId failed: ${err.message}`)
    });
    const productsList = yield* Effect.tryPromise({
      try: () => db.products.list(),
      catch: (err) => new Error(`db.products.list failed: ${err.message}`)
    });
    const productMap = new Map(productsList.map(p => [p.id, p]));

    const joinedItems = opnameItemsList.map(soi => {
      const prod = productMap.get(soi.product_id);
      return {
        ...soi,
        name: prod ? prod.name : null,
        model: prod ? prod.model : null
      };
    });

    return {
      ...report,
      username: user ? user.username : null,
      items: joinedItems
    };
  });
}

async function handleGetOpnameDetails(req, params) {
  try {
    const result = await Effect.runPromise(Effect.either(handleGetOpnameDetailsEffect(req, params)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Failed to retrieve stock opname report' }, 500);
    }
    return json(result.right);
  } catch (err) {
    console.error("Get stock opname report error:", err);
    return json({ message: 'Failed to retrieve stock opname report' }, 500);
  }
}

export function handleCreateOpnameEffect(req) {
  return Effect.gen(function* () {
    const body = yield* Effect.tryPromise({
      try: () => readJson(req),
      catch: (err) => new Error(`Invalid request JSON: ${err.message}`)
    });
    const { notes, items, created_at } = body;
    const user = req.user;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return yield* Effect.fail({ status: 400, message: 'Items are required' });
    }

    for (const item of items) {
      const { product_id, physical_stock } = item;
      const prodId = parseInt(product_id, 10);
      const physStock = parseInt(physical_stock, 10);

      if (isNaN(prodId) || isNaN(physStock) || physStock < 0 || prodId <= 0) {
        return yield* Effect.fail({ status: 400, message: 'Invalid product_id or physical_stock' });
      }

      const product = yield* Effect.tryPromise({
        try: () => db.products.get(prodId),
        catch: (err) => new Error(`db.products.get failed: ${err.message}`)
      });
      if (!product) {
        return yield* Effect.fail({ status: 404, message: `Product not found with ID ${prodId}` });
      }
    }

    const newOpname = yield* Effect.tryPromise({
      try: () => db.opnames.insert({
        user_id: user.id,
        notes: notes || '',
        created_at: created_at || undefined
      }),
      catch: (err) => new Error(`db.opnames.insert failed: ${err.message}`)
    });

    const opnameId = newOpname.id;

    for (const item of items) {
      const { product_id, physical_stock } = item;
      const prodId = parseInt(product_id, 10);
      const physStock = parseInt(physical_stock, 10);

      const product = yield* Effect.tryPromise({
        try: () => db.products.get(prodId),
        catch: (err) => new Error(`db.products.get failed: ${err.message}`)
      });
      if (!product) {
        return yield* Effect.fail({ status: 500, message: `Product not found with ID ${prodId}` });
      }

      const systemStock = product.current_stock;
      const variance = physStock - systemStock;

      yield* Effect.tryPromise({
        try: () => db.opnameItems.insert({
          opname_id: opnameId,
          product_id: prodId,
          system_stock: systemStock,
          physical_stock: physStock,
          variance
        }),
        catch: (err) => new Error(`db.opnameItems.insert failed: ${err.message}`)
      });

      yield* Effect.tryPromise({
        try: () => db.products.update(prodId, {
          current_stock: physStock
        }),
        catch: (err) => new Error(`db.products.update failed: ${err.message}`)
      });

      yield* Effect.tryPromise({
        try: () => db.movements.insert({
          product_id: prodId,
          quantity_change: variance,
          movement_type: 'manual_adjust',
          reference: `Stock Opname #${opnameId}`,
          user_id: user.id,
          created_at: newOpname.created_at
        }),
        catch: (err) => new Error(`db.movements.insert failed: ${err.message}`)
      });
    }

    return { success: true, id: opnameId };
  });
}

async function handleCreateOpname(req) {
  try {
    const result = await Effect.runPromise(Effect.either(handleCreateOpnameEffect(req)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Failed to create stock opname' }, 500);
    }
    return json(result.right, 201);
  } catch (err) {
    console.error("Create stock opname error:", err);
    return json({ message: 'Failed to create stock opname' }, 500);
  }
}

export function handleDeleteOpnameEffect(req, params) {
  return Effect.gen(function* () {
    const id = parseInt(params[0], 10);
    if (isNaN(id)) return yield* Effect.fail({ status: 400, message: "Invalid opname ID" });

    const report = yield* Effect.tryPromise({
      try: () => db.opnames.get(id),
      catch: (err) => new Error(`db.opnames.get failed: ${err.message}`)
    });
    if (!report) {
      return yield* Effect.fail({ status: 404, message: 'Stock opname report not found' });
    }

    const opnameItemsList = yield* Effect.tryPromise({
      try: () => db.opnameItems.getByOpnameId(id),
      catch: (err) => new Error(`db.opnameItems.getByOpnameId failed: ${err.message}`)
    });

    // Revert stock adjustments for each product
    for (const item of opnameItemsList) {
      const product = yield* Effect.tryPromise({
        try: () => db.products.get(item.product_id),
        catch: (err) => new Error(`db.products.get failed: ${err.message}`)
      });
      if (product) {
        const revertedStock = product.current_stock - item.variance;
        yield* Effect.tryPromise({
          try: () => db.products.update(item.product_id, {
            current_stock: revertedStock
          }),
          catch: (err) => new Error(`db.products.update failed: ${err.message}`)
        });
      }
    }

    // Delete associated stock movements
    const activeStorage = getActiveStorage();
    yield* Effect.tryPromise({
      try: () => activeStorage.execute(
        `DELETE FROM stock_movements WHERE reference = ?`,
        [`Stock Opname #${id}`]
      ),
      catch: (err) => new Error(`activeStorage.execute failed: ${err.message}`)
    });

    // Delete opname report (cascades to items)
    yield* Effect.tryPromise({
      try: () => db.opnames.delete(id),
      catch: (err) => new Error(`db.opnames.delete failed: ${err.message}`)
    });

    return { success: true };
  });
}

async function handleDeleteOpname(req, params) {
  try {
    const result = await Effect.runPromise(Effect.either(handleDeleteOpnameEffect(req, params)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Failed to delete stock opname' }, 500);
    }
    return json(result.right);
  } catch (err) {
    console.error("Delete stock opname error:", err);
    return json({ message: 'Failed to delete stock opname' }, 500);
  }
}

export function handleUpdateOpnameEffect(req, params) {
  return Effect.gen(function* () {
    const id = parseInt(params[0], 10);
    if (isNaN(id)) return yield* Effect.fail({ status: 400, message: "Invalid opname ID" });

    const report = yield* Effect.tryPromise({
      try: () => db.opnames.get(id),
      catch: (err) => new Error(`db.opnames.get failed: ${err.message}`)
    });
    if (!report) {
      return yield* Effect.fail({ status: 404, message: 'Stock opname report not found' });
    }

    const body = yield* Effect.tryPromise({
      try: () => readJson(req),
      catch: (err) => new Error(`Invalid request JSON: ${err.message}`)
    });
    const { notes, items, created_at } = body;
    const activeStorage = getActiveStorage();

    // 1. Update notes and date
    const fieldsToUpdate = {};
    if (notes !== undefined) fieldsToUpdate.notes = notes;
    if (created_at !== undefined) {
      let parsedDate = null;
      const cleanStr = String(created_at).trim();
      
      const ddMMyyyyMatch = cleanStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2}):(\d{2}))?$/);
      if (ddMMyyyyMatch) {
        const day = parseInt(ddMMyyyyMatch[1], 10);
        const month = parseInt(ddMMyyyyMatch[2], 10) - 1;
        const year = parseInt(ddMMyyyyMatch[3], 10);
        const hour = ddMMyyyyMatch[4] ? parseInt(ddMMyyyyMatch[4], 10) : 0;
        const minute = ddMMyyyyMatch[5] ? parseInt(ddMMyyyyMatch[5], 10) : 0;
        const second = ddMMyyyyMatch[6] ? parseInt(ddMMyyyyMatch[6], 10) : 0;
        parsedDate = new Date(year, month, day, hour, minute, second);
      } else {
        parsedDate = new Date(cleanStr);
      }

      if (!isNaN(parsedDate.getTime())) {
        const y = parsedDate.getFullYear();
        const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const d = String(parsedDate.getDate()).padStart(2, '0');
        const hr = String(parsedDate.getHours()).padStart(2, '0');
        const min = String(parsedDate.getMinutes()).padStart(2, '0');
        const sec = String(parsedDate.getSeconds()).padStart(2, '0');
        fieldsToUpdate.created_at = `${y}-${m}-${d} ${hr}:${min}:${sec}`;
      }
    }

    yield* Effect.tryPromise({
      try: () => db.opnames.update(id, fieldsToUpdate),
      catch: (err) => new Error(`db.opnames.update failed: ${err.message}`)
    });
    const newCreatedAt = fieldsToUpdate.created_at || report.created_at;

    // 2. Update stock movements' dates
    if (fieldsToUpdate.created_at) {
      yield* Effect.tryPromise({
        try: () => activeStorage.execute(
          `UPDATE stock_movements SET created_at = ? WHERE reference = ?`,
          [newCreatedAt, `Stock Opname #${id}`]
        ),
        catch: (err) => new Error(`activeStorage.execute failed: ${err.message}`)
      });
    }

    // 3. Update physical stock counts and adjust product stocks/movements if provided
    if (items && Array.isArray(items)) {
      const oldItems = yield* Effect.tryPromise({
        try: () => db.opnameItems.getByOpnameId(id),
        catch: (err) => new Error(`db.opnameItems.getByOpnameId failed: ${err.message}`)
      });
      const oldItemMap = new Map(oldItems.map(item => [item.product_id, item]));

      for (const item of items) {
        const prodId = parseInt(item.product_id, 10);
        const newPhysStock = parseInt(item.physical_stock, 10);
        if (isNaN(prodId) || isNaN(newPhysStock)) continue;

        const oldItem = oldItemMap.get(prodId);
        if (oldItem && oldItem.physical_stock !== newPhysStock) {
          const systemStock = oldItem.system_stock;
          const newVariance = newPhysStock - systemStock;
          const oldVariance = oldItem.variance;
          const diff = newVariance - oldVariance;

          // Update stock opname item
          yield* Effect.tryPromise({
            try: () => activeStorage.execute(
              `UPDATE stock_opname_items SET physical_stock = ?, variance = ? WHERE id = ?`,
              [newPhysStock, newVariance, oldItem.id]
            ),
            catch: (err) => new Error(`activeStorage.execute failed: ${err.message}`)
          });

          // Adjust product stock
          const product = yield* Effect.tryPromise({
            try: () => db.products.get(prodId),
            catch: (err) => new Error(`db.products.get failed: ${err.message}`)
          });
          if (product) {
            yield* Effect.tryPromise({
              try: () => db.products.update(prodId, {
                current_stock: product.current_stock + diff
              }),
              catch: (err) => new Error(`db.products.update failed: ${err.message}`)
            });
          }

          // Update or insert stock movement
          const movementRows = yield* Effect.tryPromise({
            try: () => activeStorage.query(
              `SELECT id FROM stock_movements WHERE reference = ? AND product_id = ?`,
              [`Stock Opname #${id}`, prodId]
            ),
            catch: (err) => new Error(`activeStorage.query failed: ${err.message}`)
          });
          if (movementRows && movementRows.length > 0) {
            yield* Effect.tryPromise({
              try: () => activeStorage.execute(
                `UPDATE stock_movements SET quantity_change = ?, created_at = ? WHERE id = ?`,
                [newVariance, newCreatedAt, movementRows[0].id]
              ),
              catch: (err) => new Error(`activeStorage.execute failed: ${err.message}`)
            });
          } else {
            yield* Effect.tryPromise({
              try: () => db.movements.insert({
                product_id: prodId,
                quantity_change: newVariance,
                movement_type: 'manual_adjust',
                reference: `Stock Opname #${id}`,
                user_id: report.user_id,
                created_at: newCreatedAt
              }),
              catch: (err) => new Error(`db.movements.insert failed: ${err.message}`)
            });
          }
        }
      }
    }

    return { success: true };
  });
}

async function handleUpdateOpname(req, params) {
  try {
    const result = await Effect.runPromise(Effect.either(handleUpdateOpnameEffect(req, params)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Failed to update stock opname' }, 500);
    }
    return json(result.right);
  } catch (err) {
    console.error("Update stock opname error:", err);
    return json({ message: 'Failed to update stock opname' }, 500);
  }
}

export function handleGetChatMessagesEffect(req) {
  return Effect.gen(function* () {
    const user = req.user;
    if (!user) return yield* Effect.fail({ status: 401, message: 'Unauthorized' });

    const url = new URL(req.url);
    const otherUserId = parseInt(url.searchParams.get('other_user_id'), 10);
    if (isNaN(otherUserId)) {
      return yield* Effect.fail({ status: 400, message: 'Missing other_user_id' });
    }

    const messages = yield* Effect.tryPromise({
      try: () => db.chatMessages.listMessages(user.id, otherUserId),
      catch: (err) => new Error(`db.chatMessages.listMessages failed: ${err.message}`)
    });
    return messages;
  });
}

async function handleGetChatMessages(req) {
  try {
    const result = await Effect.runPromise(Effect.either(handleGetChatMessagesEffect(req)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Failed to retrieve messages' }, 500);
    }
    return json(result.right);
  } catch (err) {
    console.error("Get chat messages error:", err);
    return json({ message: 'Failed to retrieve messages' }, 500);
  }
}

export function handleGetChatContactsEffect(req) {
  return Effect.gen(function* () {
    const user = req.user;
    if (!user) return yield* Effect.fail({ status: 401, message: 'Unauthorized' });

    const contacts = yield* Effect.tryPromise({
      try: () => db.chatMessages.getContacts(user.id),
      catch: (err) => new Error(`db.chatMessages.getContacts failed: ${err.message}`)
    });
    return contacts;
  });
}

async function handleGetChatContacts(req) {
  try {
    const result = await Effect.runPromise(Effect.either(handleGetChatContactsEffect(req)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Failed to retrieve contacts' }, 500);
    }
    return json(result.right);
  } catch (err) {
    console.error("Get chat contacts error:", err);
    return json({ message: 'Failed to retrieve contacts' }, 500);
  }
}

export function handleSendChatMessageEffect(req) {
  return Effect.gen(function* () {
    const user = req.user;
    if (!user) return yield* Effect.fail({ status: 401, message: 'Unauthorized' });

    const body = yield* Effect.tryPromise({
      try: () => readJson(req),
      catch: (err) => new Error(`Invalid request JSON: ${err.message}`)
    });
    const { receiver_id, message, product_id } = body;
    if (!receiver_id || !message) {
      return yield* Effect.fail({ status: 400, message: 'Receiver and message content are required' });
    }

    const recId = parseInt(receiver_id, 10);
    if (isNaN(recId)) {
      return yield* Effect.fail({ status: 400, message: 'Invalid receiver ID' });
    }

    const receiverExists = yield* Effect.tryPromise({
      try: () => db.users.get(recId),
      catch: (err) => new Error(`db.users.get failed: ${err.message}`)
    });
    if (!receiverExists) {
      return yield* Effect.fail({ status: 404, message: 'Receiver user not found' });
    }

    let prodId = null;
    if (product_id !== undefined && product_id !== null) {
      prodId = parseInt(product_id, 10);
      if (isNaN(prodId)) {
        return yield* Effect.fail({ status: 400, message: 'Invalid product ID' });
      }
      const productExists = yield* Effect.tryPromise({
        try: () => db.products.get(prodId),
        catch: (err) => new Error(`db.products.get failed: ${err.message}`)
      });
      if (!productExists) {
        return yield* Effect.fail({ status: 404, message: 'Product not found' });
      }
    }

    const newMsg = yield* Effect.tryPromise({
      try: () => db.chatMessages.insert({
        sender_id: user.id,
        receiver_id: recId,
        message,
        product_id: prodId
      }),
      catch: (err) => new Error(`db.chatMessages.insert failed: ${err.message}`)
    });

    let product = null;
    if (newMsg.product_id) {
      product = yield* Effect.tryPromise({
        try: () => db.products.get(newMsg.product_id),
        catch: (err) => new Error(`db.products.get failed: ${err.message}`)
      });
    }

    broadcast({
      type: 'CHAT_MESSAGE',
      id: newMsg.id,
      sender_id: newMsg.sender_id,
      sender_username: user.username,
      receiver_id: newMsg.receiver_id,
      message: newMsg.message,
      product_id: newMsg.product_id,
      created_at: newMsg.created_at,
      is_read: newMsg.is_read,
      product: product ? {
        name: product.name,
        model: product.model,
        current_stock: product.current_stock
      } : null
    });

    return newMsg;
  });
}

async function handleSendChatMessage(req) {
  try {
    const result = await Effect.runPromise(Effect.either(handleSendChatMessageEffect(req)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Failed to send message' }, 500);
    }
    return json(result.right, 201);
  } catch (err) {
    console.error("Send chat message error:", err);
    return json({ message: 'Failed to send message' }, 500);
  }
}

export function handleMarkChatReadEffect(req) {
  return Effect.gen(function* () {
    const user = req.user;
    if (!user) return yield* Effect.fail({ status: 401, message: 'Unauthorized' });

    const body = yield* Effect.tryPromise({
      try: () => readJson(req),
      catch: (err) => new Error(`Invalid request JSON: ${err.message}`)
    });
    const { sender_id } = body;
    if (!sender_id) {
      return yield* Effect.fail({ status: 400, message: 'Sender ID is required' });
    }

    const sndId = parseInt(sender_id, 10);
    if (isNaN(sndId)) {
      return yield* Effect.fail({ status: 400, message: 'Invalid sender ID' });
    }

    yield* Effect.tryPromise({
      try: () => db.chatMessages.markAsRead(sndId, user.id),
      catch: (err) => new Error(`db.chatMessages.markAsRead failed: ${err.message}`)
    });
    return { success: true };
  });
}

async function handleMarkChatRead(req) {
  try {
    const result = await Effect.runPromise(Effect.either(handleMarkChatReadEffect(req)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Failed to mark messages as read' }, 500);
    }
    return json(result.right);
  } catch (err) {
    console.error("Mark chat read error:", err);
    return json({ message: 'Failed to mark messages as read' }, 500);
  }
}

export function withAuthOrRole(handler, options = {}) {
  return async ({ request, params }) => {
    const runHandler = async () => {
      try {
        let reqObj = request;
        if (options.auth || options.role) {
          const user = await getAuthUser(request);
          if (!user) {
            return json({ message: 'Unauthorized. Please log in.' }, 401);
          }

          if (options.role && user.role !== options.role) {
            return json({ message: 'Forbidden. Insufficient permissions.' }, 403);
          }

          // We wrap request to be able to attach properties dynamically (e.g. user)
          const reqProxy = new Proxy(request, {
            get(target, prop) {
              if (prop === 'user') {
                return user;
              }
              const val = Reflect.get(target, prop);
              if (typeof val === 'function') {
                return val.bind(target);
              }
              return val;
            }
          });
          reqObj = reqProxy;
        }

        const paramArray = params && params.id ? [params.id] : [];
        return await handler(reqObj, paramArray);
      } catch (err) {
        console.error("API handler error:", err);
        return json({
          message: 'Internal Server Error',
          error: err.message,
          stack: err.stack
        }, 500);
      }
    };

    if (storageContext.getStore()) {
      return runHandler();
    }

    const env = globalThis.MINIMAL_CLOUDFLARE_ENV || process.env;
    let store;
    let isCloudflare = false;
    try {
      if (env && env.STOCK_ROOM) {
        isCloudflare = true;
      }
    } catch (e) {}

    if (isCloudflare) {
      const id = env.STOCK_ROOM.idFromName('global');
      const stub = env.STOCK_ROOM.get(id);
      store = {
        type: 'cloudflare',
        storage: {
          async query(sql, params) { return await stub.query(sql, params); },
          async queryValues(sql, params) { return await stub.queryValues(sql, params); },
          async execute(sql, params) { return await stub.execute(sql, params); },
          async executeTransaction(queries) { return await stub.executeTransaction(queries); }
        },
        env: env
      };
    } else {
      store = {
        type: 'local',
        storage: getLocalStore(),
        env: env
      };
    }

    try {
      store.requestUrl = new URL(request.url);
    } catch (e) {}

    return storageContext.run(store, async () => {
      if (process.env.NODE_ENV === 'test') {
        await seedIfNeeded(store.storage);
      } else {
        if (!globalThis.seedingPromise) {
          globalThis.seedingPromise = seedIfNeeded(store.storage).catch(err => {
            globalThis.seedingPromise = null;
            throw err;
          });
        }
        await globalThis.seedingPromise;
      }
      return runHandler();
    });
  };
}

async function verifyClerkWebhook(req, webhookSecret) {
  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return false;
  }

  const payload = await req.clone().text();
  const toSign = `${svixId}.${svixTimestamp}.${payload}`;
  
  const secretKey = webhookSecret.startsWith('whsec_') 
    ? webhookSecret.slice(6) 
    : webhookSecret;
  
  const secretBytes = Buffer.from(secretKey, 'base64');
  
  const signatures = svixSignature.split(' ');
  for (const sig of signatures) {
    const parts = sig.split(',');
    if (parts.length < 2) continue;
    const version = parts[0];
    const rawSig = parts[1];
    
    if (version === 'v1') {
      const hmac = crypto.createHmac('sha256', secretBytes);
      hmac.update(toSign);
      const expectedSignature = hmac.digest('base64');
      if (expectedSignature === rawSig) {
        return true;
      }
    }
  }
  return false;
}

export function handleClerkWebhookEffect({ request }) {
  return Effect.gen(function* () {
    const env = getActiveEnv();
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || (env && env.CLERK_WEBHOOK_SECRET);
    
    if (webhookSecret) {
      const isValid = yield* Effect.tryPromise({
        try: () => verifyClerkWebhook(request, webhookSecret),
        catch: (err) => new Error(`verifyClerkWebhook failed: ${err.message}`)
      });
      if (!isValid) {
        return yield* Effect.fail({ status: 401, message: 'Invalid signature' });
      }
    } else {
      console.warn("CLERK_WEBHOOK_SECRET is not configured. Webhook signature verification is skipped.");
    }

    const body = yield* Effect.tryPromise({
      try: () => readJson(request),
      catch: (err) => new Error(`Invalid request JSON: ${err.message}`)
    });
    const eventType = body.type;
    const data = body.data;

    if (eventType === 'user.created' || eventType === 'user.updated') {
      const clerkId = data.id;
      const role = 'admin';
      
      let chosenUsername = data.username;
      if (!chosenUsername) {
        chosenUsername = data.first_name || '';
        if (data.last_name) {
          chosenUsername = (chosenUsername + data.last_name).trim();
        }
      }
      if (!chosenUsername && data.email_addresses && data.email_addresses.length > 0) {
        chosenUsername = data.email_addresses[0].email_address.split('@')[0];
      }
      chosenUsername = chosenUsername ? chosenUsername.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() : clerkId;

      const storage = getActiveStorage();
      
      let existing = yield* Effect.tryPromise({
        try: () => storage.query("SELECT id, username FROM users WHERE password_hash = ?", [clerkId]),
        catch: (err) => new Error(`storage.query failed: ${err.message}`)
      });
      if (existing && existing.length > 0) {
        const localId = existing[0].id;
        const localUsername = existing[0].username;
        
        if (localUsername !== chosenUsername) {
          let conflict = yield* Effect.tryPromise({
            try: () => storage.query("SELECT id FROM users WHERE username = ? AND password_hash != ?", [chosenUsername, clerkId]),
            catch: (err) => new Error(`storage.query failed: ${err.message}`)
          });
          if (conflict && conflict.length > 0) {
            let finalUsername = chosenUsername;
            let counter = 1;
            let checkExisting = yield* Effect.tryPromise({
              try: () => storage.query("SELECT id FROM users WHERE username = ?", [finalUsername]),
              catch: (err) => new Error(`storage.query failed: ${err.message}`)
            });
            while (checkExisting && checkExisting.length > 0) {
              finalUsername = `${chosenUsername}${counter}`;
              checkExisting = yield* Effect.tryPromise({
                try: () => storage.query("SELECT id FROM users WHERE username = ?", [finalUsername]),
                catch: (err) => new Error(`storage.query failed: ${err.message}`)
              });
              counter++;
            }
            chosenUsername = finalUsername;
          }
          yield* Effect.tryPromise({
            try: () => storage.execute("UPDATE users SET username = ?, role = ? WHERE id = ?", [chosenUsername, role, localId]),
            catch: (err) => new Error(`storage.execute failed: ${err.message}`)
          });
        } else {
          yield* Effect.tryPromise({
            try: () => storage.execute("UPDATE users SET role = ? WHERE id = ?", [role, localId]),
            catch: (err) => new Error(`storage.execute failed: ${err.message}`)
          });
        }
      } else {
        let finalUsername = chosenUsername;
        let counter = 1;
        let checkExisting = yield* Effect.tryPromise({
          try: () => storage.query("SELECT id FROM users WHERE username = ?", [finalUsername]),
          catch: (err) => new Error(`storage.query failed: ${err.message}`)
        });
        while (checkExisting && checkExisting.length > 0) {
          finalUsername = `${chosenUsername}${counter}`;
          checkExisting = yield* Effect.tryPromise({
            try: () => storage.query("SELECT id FROM users WHERE username = ?", [finalUsername]),
            catch: (err) => new Error(`storage.query failed: ${err.message}`)
          });
          counter++;
        }
        yield* Effect.tryPromise({
          try: () => storage.execute(
            "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, datetime('now', 'localtime'))",
            [finalUsername, clerkId, role]
          ),
          catch: (err) => new Error(`storage.execute failed: ${err.message}`)
        });
      }
    }

    return { success: true };
  });
}

async function handleClerkWebhook({ request }) {
  try {
    const result = await Effect.runPromise(Effect.either(handleClerkWebhookEffect({ request })));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Internal server error' }, 500);
    }
    return json(result.right);
  } catch (err) {
    console.error("Clerk Webhook processing error:", err);
    return json({ message: 'Internal server error' }, 500);
  }
}

export function handleUpdateMovementEffect(req, params) {
  return Effect.gen(function* () {
    const id = parseInt(params[0], 10);
    if (isNaN(id)) return yield* Effect.fail({ status: 400, message: "Invalid movement ID" });

    const body = yield* Effect.tryPromise({
      try: () => readJson(req),
      catch: (error) => new Error(`Invalid request JSON: ${error.message}`)
    });
    const { created_at, reference, movement_type, quantity_change } = body;

    const movement = yield* Effect.tryPromise({
      try: () => db.movements.get(id),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    if (!movement) {
      return yield* Effect.fail({ status: 404, message: 'Movement not found' });
    }

    const fields = {};
    if (created_at !== undefined) {
      let parsedDate = null;
      const cleanStr = String(created_at).trim();
      
      const ddMMyyyyMatch = cleanStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2}):(\d{2}))?$/);
      if (ddMMyyyyMatch) {
        const day = parseInt(ddMMyyyyMatch[1], 10);
        const month = parseInt(ddMMyyyyMatch[2], 10) - 1;
        const year = parseInt(ddMMyyyyMatch[3], 10);
        const hour = ddMMyyyyMatch[4] ? parseInt(ddMMyyyyMatch[4], 10) : 0;
        const minute = ddMMyyyyMatch[5] ? parseInt(ddMMyyyyMatch[5], 10) : 0;
        const second = ddMMyyyyMatch[6] ? parseInt(ddMMyyyyMatch[6], 10) : 0;
        parsedDate = new Date(year, month, day, hour, minute, second);
      } else {
        parsedDate = new Date(cleanStr);
      }

      if (isNaN(parsedDate.getTime())) {
        return yield* Effect.fail({ status: 400, message: 'Invalid date format. Use DD/MM/YYYY or YYYY-MM-DD.' });
      }

      const year = parsedDate.getFullYear();
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const day = String(parsedDate.getDate()).padStart(2, '0');
      const hour = String(parsedDate.getHours()).padStart(2, '0');
      const minute = String(parsedDate.getMinutes()).padStart(2, '0');
      const second = String(parsedDate.getSeconds()).padStart(2, '0');
      
      fields.created_at = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    }

    if (reference !== undefined) {
      fields.reference = reference;
    }

    if (movement_type !== undefined) {
      if (!['sale', 'return', 'write_off', 'manual_adjust', 'initial'].includes(movement_type)) {
        return yield* Effect.fail({ status: 400, message: 'Invalid movement type' });
      }
      fields.movement_type = movement_type;
    }

    if (quantity_change !== undefined) {
      const newQty = parseInt(quantity_change, 10);
      if (isNaN(newQty)) {
        return yield* Effect.fail({ status: 400, message: 'Invalid quantity change' });
      }
      fields.quantity_change = newQty;

      // Update the product's current stock
      const product = yield* Effect.tryPromise({
        try: () => db.products.get(movement.product_id),
        catch: (error) => new Error(`Database query failed: ${error.message}`)
      });
      if (product) {
        const diff = newQty - movement.quantity_change;
        const newStock = product.current_stock + diff;
        yield* Effect.tryPromise({
          try: () => db.products.update(movement.product_id, { current_stock: newStock }),
          catch: (error) => new Error(`Database update failed: ${error.message}`)
        });
      }
    }

    const updated = yield* Effect.tryPromise({
      try: () => db.movements.update(id, fields),
      catch: (error) => new Error(`Database update failed: ${error.message}`)
    });
    return { success: true, movement: updated };
  });
}

async function handleUpdateMovement(req, params) {
  try {
    const result = await Effect.runPromise(Effect.either(handleUpdateMovementEffect(req, params)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Failed to update movement' }, 500);
    }
    return json(result.right);
  } catch (err) {
    console.error("Update movement error:", err);
    return json({ message: 'Failed to update movement' }, 500);
  }
}

export function handleDeleteMovementEffect(req, params) {
  return Effect.gen(function* () {
    const id = parseInt(params[0], 10);
    if (isNaN(id)) return yield* Effect.fail({ status: 400, message: "Invalid movement ID" });

    const movement = yield* Effect.tryPromise({
      try: () => db.movements.get(id),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    if (!movement) {
      return yield* Effect.fail({ status: 404, message: 'Movement not found' });
    }

    const product = yield* Effect.tryPromise({
      try: () => db.products.get(movement.product_id),
      catch: (error) => new Error(`Database query failed: ${error.message}`)
    });
    if (product) {
      const newStock = product.current_stock - movement.quantity_change;
      yield* Effect.tryPromise({
        try: () => db.products.update(movement.product_id, { current_stock: newStock }),
        catch: (error) => new Error(`Database update failed: ${error.message}`)
      });
    }

    yield* Effect.tryPromise({
      try: () => db.movements.delete(id),
      catch: (error) => new Error(`Database delete failed: ${error.message}`)
    });
    return { success: true };
  });
}

async function handleDeleteMovement(req, params) {
  try {
    const result = await Effect.runPromise(Effect.either(handleDeleteMovementEffect(req, params)));
    if (Either.isLeft(result)) {
      const err = result.left;
      if (err && typeof err === 'object' && 'status' in err) {
        return json({ message: err.message }, err.status);
      }
      return json({ message: err.message || 'Failed to delete movement' }, 500);
    }
    return json(result.right);
  } catch (err) {
    console.error("Delete movement error:", err);
    return json({ message: 'Failed to delete movement' }, 500);
  }
}

export {
  handleUpdateMovement,
  handleDeleteMovement,
  handleHealth,
  handleWsPlaceholder,
  handleLogin,
  handleLogout,
  handleMe,
  handleListUsers,
  handleCreateUser,
  handleDeleteUser,
  handleListProducts,
  handleListOrders,
  handleListLedger,
  handleCreateProduct,
  handleProductLedger,
  handleAdjustStock,
  handleUpdateProduct,
  handleDeleteProduct,
  handleListTemplates,
  handleSaveTemplate,
  handleDeleteTemplate,
  handleUploadExcel,
  handleConfirmImport,
  handleCancelImport,
  handleGetActiveSession,
  handleSyncActiveSession,
  handleGetSessions,
  handleListSkuMappings,
  handleSaveSkuMapping,
  handleDeleteSkuMapping,
  handleReviewOrders,
  handleReturnedOrders,
  handleResolveReviewOrder,
  handleReviewAmbiguous,
  handleConfirmSplit,
  handleDashboardStats,
  handleListOpname,
  handleGetOpnameDetails,
  handleCreateOpname,
  handleDeleteOpname,
  handleUpdateOpname,
  handleGetChatMessages,
  handleGetChatContacts,
  handleSendChatMessage,
  handleMarkChatRead,
  handleClerkWebhook
};
