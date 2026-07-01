import { createClerkClient } from '@clerk/backend';
import crypto from 'crypto';
import { db, seedIfNeeded } from '../db/connection.js';
import { verifyPassword, hashPassword, signJwt, verifyJwt } from '../utils/crypto.js';
import { parseExcel, mapRawRows } from '../services/excel-parser.js';
import { parseAmbiguousDescription, extractSameProductPromo, extractPackMultiplier, resolvePromoProductToBaseItems } from '../services/ambiguous-parser.js';
import { getActiveStorage, getActiveEnv, storageContext } from '../db/context.js';
import { getLocalStore } from '../db/local_sqlite.js';
import { broadcast } from '../ws/broker.js';
import { z } from 'zod';

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

const loginSchema = z.object({
  username: z.string().min(1, 'Username and password are required'),
  password: z.string().min(1, 'Username and password are required'),
});

const createUserSchema = z.object({
  username: z.string().min(1, 'Username, password and role are required'),
  password: z.string().min(1, 'Username, password and role are required'),
  role: z.enum(['admin', 'staff'], { errorMap: () => ({ message: 'Role must be admin or staff' }) }),
});

const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  model: z.string().optional().nullable(),
  master_sku: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  initial_stock: z.union([z.number(), z.string()]).transform(val => parseInt(val, 10)).pipe(z.number().int().min(0)).optional().default(0),
  low_stock_threshold: z.union([z.number(), z.string()]).transform(val => parseInt(val, 10)).pipe(z.number().int().min(0)).optional().default(10),
});

const updateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  model: z.string().optional().nullable(),
  master_sku: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  low_stock_threshold: z.union([z.number(), z.string()]).transform(val => parseInt(val, 10)).pipe(z.number().int().min(0)).optional().default(10),
});

const adjustStockSchema = z.object({
  quantity_change: z.union([z.number(), z.string()]).transform(val => parseInt(val, 10)).pipe(z.number().int({ message: 'Valid quantity change is required' })),
  movement_type: z.string().optional().default('manual_adjust'),
  reference: z.string().optional().default('Manual stock adjustment'),
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

let clerkClientInstance = null;
function getClerkClient() {
  const env = getActiveEnv();
  let publishableKey = process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey && env) {
    publishableKey = env.CLERK_PUBLISHABLE_KEY || env.VITE_CLERK_PUBLISHABLE_KEY;
  }
  if (!publishableKey) {
    publishableKey = 'pk_test_ZmFzdC1oZXJyaW5nLTE5LmNsZXJrLmFjY291bnRzLmRldiQ';
  }

  let secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey && env) {
    secretKey = env.CLERK_SECRET_KEY;
  }
  const isFallbackSecret = !secretKey;
  if (!secretKey) {
    secretKey = 'sk_test_' + 'abcde12345'.repeat(8);
  }

  console.log(`[Clerk Debug] getClerkClient - PublishableKey: ${publishableKey.substring(0, 20)}..., SecretKey length: ${secretKey.length}, isFallbackSecret: ${isFallbackSecret}`);

  // Re-create or return instance
  if (!clerkClientInstance) {
    clerkClientInstance = createClerkClient({
      publishableKey,
      secretKey
    });
  }
  return clerkClientInstance;
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

  try {
    const clerk = getClerkClient();
    const requestState = await clerk.authenticateRequest(request);
    
    console.log(`[Clerk Debug] authenticateRequest status: ${requestState.status}, reason: ${requestState.reason || 'none'}, message: ${requestState.message || 'none'}`);
    
    if (requestState.status === 'unknown' || requestState.status === 'signed-out') {
      if (isLocalDev) {
        console.log("[Clerk Debug] Local development fallback: Clerk auth is signed-out/unknown, falling back to admin user.");
        return { id: 1, username: 'admin', role: 'admin' };
      }
      return null;
    }

    const authData = requestState.toAuth();
    if (!authData || !authData.userId) {
      if (isLocalDev) {
        console.log("[Clerk Debug] Local development fallback: Clerk auth is missing userId, falling back to admin user.");
        return { id: 1, username: 'admin', role: 'admin' };
      }
      return null;
    }

    let username = authData.sessionClaims?.username;
    if (!username) {
      username = authData.userId;
    }
    let role = 'admin';

    let localId = null;
    let localUsername = username;
    try {
      const storage = getActiveStorage();
      // 1. Search by Clerk ID in password_hash
      let existing = await storage.query("SELECT id, username, role FROM users WHERE password_hash = ?", [authData.userId]);
      
      // 2. Fallback: Search by Clerk ID in username column (for migrating older accounts)
      if (!existing || existing.length === 0) {
        existing = await storage.query("SELECT id, username, role FROM users WHERE username = ?", [authData.userId]);
        if (existing && existing.length > 0) {
          localId = existing[0].id;
          localUsername = existing[0].username;
          // Migrate old user row to store Clerk ID in password_hash
          await storage.execute("UPDATE users SET password_hash = ?, role = ? WHERE id = ?", [authData.userId, role, localId]);
        } else {
          // 3. Auto-register using Clerk profile info
          let clerkUser = null;
          try {
            clerkUser = await clerk.users.getUser(authData.userId);
          } catch (err) {
            console.error("Failed to fetch Clerk user info:", err);
          }
          
          let chosenUsername = '';
          if (clerkUser) {
            chosenUsername = clerkUser.username;
            if (!chosenUsername) {
              chosenUsername = clerkUser.firstName || '';
              if (clerkUser.lastName) {
                chosenUsername = (chosenUsername + clerkUser.lastName).trim();
              }
            }
            if (!chosenUsername && clerkUser.emailAddresses && clerkUser.emailAddresses.length > 0) {
              chosenUsername = clerkUser.emailAddresses[0].emailAddress.split('@')[0];
            }
          }
          chosenUsername = chosenUsername.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
          if (!chosenUsername) {
            chosenUsername = authData.userId;
          }

          let finalUsername = chosenUsername;
          let checkExisting = await storage.query("SELECT id FROM users WHERE username = ?", [finalUsername]);
          let counter = 1;
          while (checkExisting && checkExisting.length > 0) {
            finalUsername = `${chosenUsername}${counter}`;
            checkExisting = await storage.query("SELECT id FROM users WHERE username = ?", [finalUsername]);
            counter++;
          }

          try {
            const result = await storage.execute(
              "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, datetime('now', 'localtime'))",
              [finalUsername, authData.userId, role]
            );
            localId = result.lastInsertRowid;
            localUsername = finalUsername;
          } catch (insertErr) {
            if (insertErr.message && insertErr.message.includes('UNIQUE constraint')) {
              let existingUser = await storage.query("SELECT id, username, role FROM users WHERE password_hash = ?", [authData.userId]);
              if (existingUser && existingUser.length > 0) {
                localId = existingUser[0].id;
                localUsername = existingUser[0].username;
              } else {
                throw insertErr;
              }
            } else {
              throw insertErr;
            }
          }
        }
      } else {
        localId = existing[0].id;
        localUsername = existing[0].username;
        const claimUsername = authData.sessionClaims?.username;
        const localRole = existing[0].role;
        if (claimUsername && claimUsername !== localUsername) {
          let conflict = await storage.query("SELECT id FROM users WHERE username = ? AND password_hash != ?", [claimUsername, authData.userId]);
          if (!conflict || conflict.length === 0) {
            await storage.execute("UPDATE users SET username = ?, role = ? WHERE id = ?", [claimUsername, role, localId]);
            localUsername = claimUsername;
          } else if (localRole !== role) {
            await storage.execute("UPDATE users SET role = ? WHERE id = ?", [role, localId]);
          }
        } else if (localRole !== role) {
          await storage.execute("UPDATE users SET role = ? WHERE id = ?", [role, localId]);
        }
      }
    } catch (dbErr) {
      console.error("Failed to check Clerk user in local DB:", dbErr);
      localId = Math.abs(authData.userId.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)) % 1000000;
    }

    return { id: localId, username: localUsername, role };
  } catch (e) {
    console.error("Clerk auth failed with error:", e);
    if (isLocalDev) {
      console.log("[Clerk Debug] Local development fallback (from catch block): Clerk auth failed, falling back to admin user.");
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
async function handleHealth(req) {
  return json({ status: 'ok', time: new Date().toISOString() });
}

async function handleWsPlaceholder(req) {
  return new Response('WebSocket endpoint. Use a WebSocket client to connect.', { status: 400 });
}

async function handleLogin(req) {
  try {
    const body = await readJson(req);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return json({ message: parsed.error.errors[0].message }, 400);
    }
    const { username, password } = parsed.data;

    const user = await db.users.getByUsername(username);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return json({ message: 'Invalid username or password' }, 401);
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

    return new Response(JSON.stringify({
      id: user.id,
      username: user.username,
      role: user.role
    }), {
      status: 200,
      headers
    });
  } catch (err) {
    console.error("Login route error:", err);
    return json({ message: 'Internal server error' }, 500);
  }
}

async function handleLogout(req) {
  const headers = new Headers();
  headers.append('Set-Cookie', 'token=; Path=/; HttpOnly; Max-Age=0');
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers
  });
}

async function handleMe(req) {
  const user = await getAuthUser(req);
  if (!user) {
    return json({ message: 'Not logged in' }, 401);
  }
  return json({ id: user.id, username: user.username, role: user.role });
}

async function handleListUsers(req) {
  try {
    if (process.env.NODE_ENV !== 'test') {
      try {
        const clerk = getClerkClient();
        const clerkUsers = await clerk.users.getUserList({ limit: 100 });
        if (clerkUsers) {
          const list = clerkUsers.data || clerkUsers;
          const userArray = Array.isArray(list) ? list : [];
          const storage = getActiveStorage();
          for (const cu of userArray) {
            let existing = await storage.query("SELECT id FROM users WHERE password_hash = ?", [cu.id]);
            if (!existing || existing.length === 0) {
              let chosenUsername = cu.username || cu.firstName || '';
              if (cu.lastName) {
                chosenUsername = (chosenUsername + cu.lastName).trim();
              }
              if (!chosenUsername && cu.emailAddresses && cu.emailAddresses.length > 0) {
                chosenUsername = cu.emailAddresses[0].emailAddress.split('@')[0];
              }
              chosenUsername = chosenUsername.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
              if (!chosenUsername) {
                chosenUsername = cu.id;
              }

              let finalUsername = chosenUsername;
              let checkExisting = await storage.query("SELECT id FROM users WHERE username = ?", [finalUsername]);
              let counter = 1;
              while (checkExisting && checkExisting.length > 0) {
                finalUsername = `${chosenUsername}${counter}`;
                checkExisting = await storage.query("SELECT id FROM users WHERE username = ?", [finalUsername]);
                counter++;
              }

              const role = cu.publicMetadata?.role || cu.metadata?.role || 'staff';
              try {
                await storage.execute(
                  "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, datetime('now', 'localtime'))",
                  [finalUsername, cu.id, role]
                );
              } catch (insertErr) {
                if (insertErr.message && insertErr.message.includes('UNIQUE constraint')) {
                  console.log(`User ${finalUsername} already concurrently registered, skipping.`);
                } else {
                  throw insertErr;
                }
              }
            }
          }
        }
      } catch (clerkErr) {
        console.error("Failed to sync users from Clerk:", clerkErr);
      }
    }

    const list = await db.users.list();
    list.sort((a, b) => (a.username || '').localeCompare(b.username || ''));
    const stripped = list.map(u => ({ id: u.id, username: u.username, role: u.role, created_at: u.created_at }));
    return json(stripped);
  } catch (err) {
    console.error("List users error:", err);
    return json({ message: 'Failed to retrieve users' }, 500);
  }
}

async function handleCreateUser(req) {
  try {
    const body = await readJson(req);
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return json({ message: parsed.error.errors[0].message }, 400);
    }
    const { username, password, role } = parsed.data;

    const existing = await db.users.getByUsername(username);
    if (existing) {
      return json({ message: 'Username already exists' }, 400);
    }

    const hashedPassword = hashPassword(password);
    const inserted = await db.users.insert({
      username,
      password_hash: hashedPassword,
      role
    });

    return json({ success: true, id: inserted.id }, 201);
  } catch (err) {
    console.error("Create user error:", err);
    return json({ message: 'Failed to create user' }, 500);
  }
}

async function handleDeleteUser(req, params) {
  try {
    const id = parseInt(params[0], 10);
    if (isNaN(id)) return json({ message: "Invalid user ID" }, 400);
    const currentUser = req.user; // populated by routing wrapper

    if (id === 1 || String(id) === String(currentUser?.id)) {
      return json({ message: 'Cannot delete the main admin or your own current logged-in user account' }, 400);
    }

    const existing = await db.users.get(id);
    if (!existing) {
      return json({ message: 'User not found' }, 404);
    }

    const storage = getActiveStorage();
    const fallbackUserId = currentUser?.id || 1;
    await storage.execute("UPDATE stock_movements SET user_id = NULL WHERE user_id = ?", [id]);
    await storage.execute("UPDATE stock_opnames SET user_id = ? WHERE user_id = ?", [fallbackUserId, id]);

    await db.users.delete(id);
    return json({ success: true });
  } catch (err) {
    console.error("Delete user error:", err);
    return json({ message: 'Failed to delete user' }, 500);
  }
}

async function handleListProducts(req) {
  try {
    const list = await db.products.list();
    const activeStorage = getActiveStorage();
    const lastOpnames = await activeStorage.query(`
      SELECT soi.product_id, MAX(so.created_at) as last_opname_at
      FROM stock_opname_items soi
      JOIN stock_opnames so ON soi.opname_id = so.id
      GROUP BY soi.product_id
    `);

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
    return json(listWithOpname);
  } catch (err) {
    console.error("List products error:", err);
    return json({ message: 'Failed to retrieve products' }, 500);
  }
}

async function handleListOrders(req) {
  try {
    const list = await db.orders.listDetailed();
    return json(list);
  } catch (err) {
    console.error("Failed to list orders:", err);
    return json({ message: "Failed to list orders" }, 500);
  }
}

async function handleListLedger(req) {
  try {
    const movements = await db.movements.list();
    const productsList = await db.products.list();
    const usersList = await db.users.list();

    const productMap = new Map(productsList.map(p => [p.id, p]));
    const userMap = new Map(usersList.map(u => [u.id, u]));

    const joined = movements.map(m => {
      const prod = productMap.get(m.product_id);
      const user = m.user_id ? userMap.get(m.user_id) : null;
      return {
        ...m,
        name: prod ? prod.name : null,
        model: prod ? prod.model : null,
        username: user ? user.username : null
      };
    });

    joined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return json(joined);
  } catch (err) {
    console.error("List ledger error:", err);
    return json({ message: 'Failed to retrieve stock ledger' }, 500);
  }
}

async function handleCreateProduct(req) {
  try {
    const body = await readJson(req);
    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) {
      return json({ message: parsed.error.errors[0].message }, 400);
    }
    const { name, model, master_sku, description, initial_stock, low_stock_threshold } = parsed.data;

    const user = req.user;
    const threshold = low_stock_threshold;
    const stock = initial_stock;

    const existing = await db.products.getByName(name);
    if (existing) {
      return json({ message: 'Product name already exists' }, 400);
    }

    const inserted = await db.products.insert({
      name,
      model: model || null,
      master_sku: master_sku || null,
      description: description || '',
      current_stock: stock,
      low_stock_threshold: threshold
    });

    if (stock !== 0) {
      await db.movements.insert({
        product_id: inserted.id,
        quantity_change: stock,
        movement_type: 'initial',
        reference: 'Initial product creation stock',
        user_id: user.id,
        created_at: '2026-06-01 00:00:00'
      });
    }

    return json({ success: true, id: inserted.id }, 201);
  } catch (err) {
    console.error("Add product error:", err);
    return json({ message: 'Failed to create product' }, 500);
  }
}

async function handleProductLedger(req, params) {
  try {
    const id = parseInt(params[0], 10);
    if (isNaN(id)) return json({ message: "Invalid product ID" }, 400);
    const activeStorage = getActiveStorage();

    const movements = await activeStorage.query(
      `SELECT * FROM stock_movements WHERE product_id = ? ORDER BY created_at ASC`,
      [id]
    );

    if (!movements || movements.length === 0) {
      return json([]);
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
        const orderRows = await activeStorage.query(
          `SELECT o.order_id, t.name AS platform_name
           FROM orders o
           JOIN import_sessions s ON o.import_session_id = s.id
           JOIN import_templates t ON s.template_id = t.id
           WHERE o.order_id IN (${placeholders})`,
          chunk
        );
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

    return json(result);
  } catch (err) {
    console.error("Get product ledger history error:", err);
    return json({ message: 'Failed to retrieve product ledger history' }, 500);
  }
}

async function handleAdjustStock(req, params) {
  try {
    const id = parseInt(params[0], 10);
    if (isNaN(id)) return json({ message: "Invalid product ID" }, 400);
    const body = await readJson(req);
    const parsed = adjustStockSchema.safeParse(body);
    if (!parsed.success) {
      return json({ message: parsed.error.errors[0].message }, 400);
    }
    const { quantity_change, movement_type, reference } = parsed.data;

    const change = quantity_change;
    const type = movement_type;
    const ref = reference;
    const user = req.user;

    const product = await db.products.get(id);
    if (!product) {
      return json({ message: 'Product not found' }, 404);
    }

    await db.movements.insert({
      product_id: id,
      quantity_change: change,
      movement_type: type,
      reference: ref,
      user_id: user.id
    });

    const newStock = product.current_stock + change;
    await db.products.update(id, {
      current_stock: newStock
    });

    return json({ success: true, current_stock: newStock });
  } catch (err) {
    console.error("Adjust stock error:", err);
    return json({ message: 'Failed to adjust stock' }, 500);
  }
}

async function handleUpdateProduct(req, params) {
  try {
    const id = parseInt(params[0], 10);
    if (isNaN(id)) return json({ message: "Invalid product ID" }, 400);
    const body = await readJson(req);
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return json({ message: parsed.error.errors[0].message }, 400);
    }
    const { name, model, master_sku, description, low_stock_threshold } = parsed.data;

    const existing = await db.products.getByName(name);
    if (existing && existing.id !== id) {
      return json({ message: 'Product name already exists' }, 400);
    }

    const threshold = low_stock_threshold;

    await db.products.update(id, {
      name,
      model: model || null,
      master_sku: master_sku || null,
      description: description || '',
      low_stock_threshold: threshold
    });

    return json({ success: true });
  } catch (err) {
    console.error("Edit product error:", err);
    return json({ message: 'Failed to update product' }, 500);
  }
}

async function handleDeleteProduct(req, params) {
  try {
    const id = parseInt(params[0], 10);
    if (isNaN(id)) return json({ message: "Invalid product ID" }, 400);
    
    const product = await db.products.get(id);
    if (!product) {
      return json({ message: 'Product not found' }, 404);
    }

    await db.products.delete(id);
    return json({ success: true });
  } catch (err) {
    console.error("Delete product error:", err);
    return json({ message: 'Failed to delete product' }, 500);
  }
}

async function handleListTemplates(req) {
  try {
    const templates = await db.templates.list();
    const result = templates.map(t => ({
      ...t,
      column_mapping: JSON.parse(t.column_mapping)
    }));
    result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return json(result);
  } catch (err) {
    console.error("List templates error:", err);
    return json({ message: 'Failed to retrieve templates' }, 500);
  }
}

async function handleSaveTemplate(req) {
  try {
    const { id, name, column_mapping } = await readJson(req);
    if (!name || !column_mapping) {
      return json({ message: 'Template name and column mapping are required' }, 400);
    }

    const mappingStr = JSON.stringify(column_mapping);

    if (id) {
      await db.templates.update(parseInt(id, 10), {
        name,
        column_mapping: mappingStr
      });
      return json({ success: true, id: parseInt(id, 10) });
    } else {
      const existing = await db.templates.getByName(name);
      if (existing) {
        return json({ message: 'Template name already exists' }, 400);
      }

      const inserted = await db.templates.insert({
        name,
        column_mapping: mappingStr
      });

      return json({ success: true, id: inserted.id }, 201);
    }
  } catch (err) {
    console.error("Save template error:", err);
    return json({ message: 'Failed to save template' }, 500);
  }
}

async function handleDeleteTemplate(req, params) {
  try {
    const id = parseInt(params[0], 10);
    if (isNaN(id)) return json({ message: "Invalid template ID" }, 400);
    const existing = await db.templates.get(id);
    if (!existing) {
      return json({ message: 'Template not found' }, 404);
    }

    await db.templates.delete(id);
    return json({ success: true });
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
    'pengembalian': 'Returned',
    'batal/cancel': 'Cancelled',
    'kembali': 'Returned',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'shipped': 'Shipped',
    'unpaid': 'Unpaid',
    'returned': 'Returned',
    'to ship': 'To Ship'
  };
  
  for (const [key, val] of Object.entries(translations)) {
    if (clean.includes(key)) return val;
  }
  
  // Return capitalized default
  return status.charAt(0).toUpperCase() + status.slice(1);
}


async function handleUploadExcel(req) {
  try {
    let templateId;
    let filename;
    let parsedRows;

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await readJson(req);
      templateId = parseInt(body.template_id, 10);
      filename = body.filename || 'upload.xlsx';

      if (!templateId || isNaN(templateId)) {
        return json({ message: 'Template selection is required' }, 400);
      }

      const rawRows = body.raw_rows;
      if (!rawRows || !Array.isArray(rawRows)) {
        return json({ message: 'raw_rows must be a valid array' }, 400);
      }

      const template = await db.templates.get(templateId);
      if (!template) {
        return json({ message: 'Template not found' }, 404);
      }
      const mapping = JSON.parse(template.column_mapping);
      parsedRows = mapRawRows(rawRows, mapping);
    } else {
      const formData = await req.clone().formData();
      const file = formData.get('file');
      templateId = parseInt(formData.get('template_id'), 10);
      filename = file ? file.name : 'upload.xlsx';

      if (!file || typeof file.arrayBuffer !== 'function' || !templateId || isNaN(templateId)) {
        return json({ message: 'Excel file and template selection are required' }, 400);
      }

      const template = await db.templates.get(templateId);
      if (!template) {
        return json({ message: 'Template not found' }, 404);
      }
      const mapping = JSON.parse(template.column_mapping);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      parsedRows = await parseExcel(buffer, mapping);
    }

    const catalog = await db.products.list();
    const skuMappings = await db.skuMappings.list();

    const activeStorage = getActiveStorage();
    const lastOpnames = await activeStorage.query(`
      SELECT soi.product_id, MAX(so.created_at) as last_opname_at
      FROM stock_opname_items soi
      JOIN stock_opnames so ON soi.opname_id = so.id
      GROUP BY soi.product_id
    `);

    const lastOpnameMap = new Map();
    if (lastOpnames && Array.isArray(lastOpnames)) {
      for (const row of lastOpnames) {
        lastOpnameMap.set(row.product_id, row.last_opname_at);
      }
    }

    // Bulk fetch existing order IDs to check duplicates
    const incomingOrderIds = parsedRows.map(r => r.order_id).filter(Boolean);
    const existingOrderIdsList = await db.orders.checkExistingOrderIds(incomingOrderIds);
    const existingOrderIdsSet = new Set(existingOrderIdsList);

    // Bulk fetch all aliases to do in-memory lookups
    const allAliases = await db.aliases.listAll();
    const aliasMap = new Map(allAliases.map(a => [a.clean_text.toLowerCase(), a.product_id]));

    const previewOrders = [];
    let flaggedRowsCount = 0;

    for (const row of parsedRows) {
      if (!row.order_id) continue;

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
            original_text: row.product_name_raw
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
              original_text: row.product_name_raw
            });
            resolvedDirectly = true;
          }
        }
      }

      if (!resolvedDirectly) {
        suggestedSplits = parseAmbiguousDescription(row.product_name_raw, row.quantity, catalog);
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
      return json({ message: 'No valid orders found in the uploaded file' }, 400);
    }

    const user = req.user;

    const oldSessions = await db.sessions.list();
    for (const s of oldSessions) {
      if (s.status === 'previewing') {
        await db.sessions.update(s.id, { status: 'cancelled', orders_data: null });
      }
    }
    
    const insertedSession = await db.sessions.insert({
      template_id: templateId,
      user_id: user.id,
      filename: filename,
      status: 'previewing',
      total_rows: previewOrders.length,
      flagged_rows: flaggedRowsCount,
      orders_data: JSON.stringify(previewOrders)
    });

    return json({
      session_id: insertedSession.id,
      filename: filename,
      total_rows: previewOrders.length,
      flagged_rows: flaggedRowsCount,
      orders: previewOrders
    });

  } catch (err) {
    console.error("Excel upload error:", err);
    return json({ message: 'Failed to process Excel file' }, 500);
  }
}

async function handleConfirmImport(req) {
  try {
    const { session_id, orders } = await readJson(req);

    const sessionIdNum = parseInt(session_id, 10);
    if (isNaN(sessionIdNum) || sessionIdNum <= 0) {
      return json({ message: 'Invalid Session ID parameter value' }, 400);
    }

    if (!orders || !Array.isArray(orders)) {
      return json({ message: 'Invalid or missing orders list' }, 400);
    }

    const session = await db.sessions.get(sessionIdNum);
    if (!session || session.status !== 'previewing') {
      return json({ message: 'Invalid or expired import session' }, 404);
    }

    const user = req.user;
    let appliedCount = 0;
    let flaggedCount = 0;

    const activeStorage = getActiveStorage();
    const lastOpnames = await activeStorage.query(`
      SELECT soi.product_id, MAX(so.created_at) as last_opname_at
      FROM stock_opname_items soi
      JOIN stock_opnames so ON soi.opname_id = so.id
      GROUP BY soi.product_id
    `);

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

    await activeStorage.executeTransaction(queries);

    const { broadcast } = await import('../ws/broker.js');
    const updatedSession = await db.sessions.get(sessionIdNum);
    if (updatedSession) {
      broadcast({ type: 'SESSION_UPDATED', payload: updatedSession });
    }

    return json({ success: true, applied_rows: appliedCount, flagged_rows: flaggedCount });

  } catch (err) {
    console.error("Confirm import error:", err);
    return json({ message: 'Failed to apply import changes' }, 500);
  }
}

async function handleCancelImport(req) {
  try {
    const { session_id } = await readJson(req);
    if (!session_id) {
      return json({ message: 'Session ID is required' }, 400);
    }

    await db.sessions.update(parseInt(session_id, 10), {
      status: 'cancelled',
      orders_data: null
    });
    return json({ success: true });
  } catch (err) {
    console.error("Cancel import error:", err);
    return json({ message: 'Failed to cancel session' }, 500);
  }
}

async function handleGetActiveSession(req) {
  try {
    const sessionsList = await db.sessions.list();
    const active = sessionsList.find(s => s.status === 'previewing');
    if (active) {
      return json({
        session_id: active.id,
        filename: active.filename,
        total_rows: active.total_rows,
        flagged_rows: active.flagged_rows,
        orders: JSON.parse(active.orders_data || '[]')
      });
    }
    return json(null);
  } catch (err) {
    console.error("Get active session error:", err);
    return json({ message: 'Failed to retrieve active session' }, 500);
  }
}

async function handleSyncActiveSession(req) {
  try {
    const { session_id, orders } = await readJson(req);
    if (!session_id || !orders) {
      return json({ message: 'Session ID and orders are required' }, 400);
    }
    await db.sessions.update(parseInt(session_id, 10), {
      orders_data: JSON.stringify(orders)
    });
    return json({ success: true });
  } catch (err) {
    console.error("Sync active session error:", err);
    return json({ message: 'Failed to sync session data' }, 500);
  }
}

async function handleGetSessions(req) {
  try {
    const sessionsList = await db.sessions.list();
    const templatesList = await db.templates.list();
    const usersList = await db.users.list();

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
    return json(limited);
  } catch (err) {
    console.error("Get sessions error:", err);
    return json({ message: 'Failed to retrieve sessions history' }, 500);
  }
}

async function handleListSkuMappings(req) {
  try {
    const list = await db.skuMappings.list();
    return json(list);
  } catch (err) {
    console.error("Get sku mappings error:", err);
    return json({ message: 'Failed to retrieve SKU mappings' }, 500);
  }
}

async function handleSaveSkuMapping(req) {
  try {
    const { sku_code, product_id, quantity } = await readJson(req);
    if (!sku_code || !product_id || !quantity) {
      return json({ message: 'sku_code, product_id, and quantity are required' }, 400);
    }
    await db.skuMappings.insert({ sku_code, product_id, quantity });
    return json({ success: true });
  } catch (err) {
    console.error("Save sku mapping error:", err);
    return json({ message: 'Failed to save SKU mapping' }, 500);
  }
}

async function handleDeleteSkuMapping(req) {
  try {
    const { sku_code, product_id } = await readJson(req);
    if (!sku_code || !product_id) {
      return json({ message: 'sku_code and product_id are required' }, 400);
    }
    await db.skuMappings.delete(sku_code, product_id);
    return json({ success: true });
  } catch (err) {
    console.error("Delete sku mapping error:", err);
    return json({ message: 'Failed to delete SKU mapping' }, 500);
  }
}

async function handleReviewOrders(req) {
  try {
    const ordersList = await db.orders.list();
    const orderItemsList = await db.orderItems.list();
    const productsList = await db.products.list();

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
    return json(filtered);
  } catch (err) {
    console.error("Get review orders error:", err);
    return json({ message: 'Failed to retrieve orders needing review' }, 500);
  }
}

async function handleReturnedOrders(req) {
  try {
    const ordersList = await db.orders.list();
    const orderItemsList = await db.orderItems.list();
    const productsList = await db.products.list();
    const sessionsList = await db.sessions.list();
    const templatesList = await db.templates.list();

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
    return json(filtered);
  } catch (err) {
    console.error("Get returned orders error:", err);
    return json({ message: 'Failed to retrieve returned orders' }, 500);
  }
}

async function handleResolveReviewOrder(req) {
  try {
    const { order_id, resolution, resolution_notes } = await readJson(req);
    if (!order_id || !resolution) {
      return json({ message: 'Order ID and resolution selection are required' }, 400);
    }

    if (!['returned', 'lost', 'investigating'].includes(resolution)) {
      return json({ message: 'Invalid resolution option' }, 400);
    }

    const orderIdNum = parseInt(order_id, 10);
    const order = await db.orders.get(orderIdNum);

    if (!order || order.system_status !== 'needs_review') {
      return json({ message: 'Order not found or already resolved' }, 404);
    }

    const user = req.user;

    if (resolution === 'investigating') {
      await db.orders.update(orderIdNum, {
        resolution: 'investigating',
        resolution_notes: resolution_notes || ''
      });
      return json({ success: true, status: 'needs_review' });
    }

    const items = await db.orderItems.getByOrderId(orderIdNum);

    if (resolution === 'lost') {
      for (const item of items) {
        if (item.product_id) {
          await db.movements.insert({
            product_id: item.product_id,
            quantity_change: -item.quantity,
            movement_type: 'write_off',
            reference: `Lost Order ID: ${order.order_id}`,
            user_id: user.id
          });

          const prod = await db.products.get(item.product_id);
          if (prod) {
            await db.products.update(item.product_id, {
              current_stock: prod.current_stock - item.quantity
            });
          }
        }
      }
    } else if (resolution === 'returned') {
      for (const item of items) {
        if (item.product_id) {
          await db.movements.insert({
            product_id: item.product_id,
            quantity_change: 0,
            movement_type: 'return',
            reference: `Returned Order ID: ${order.order_id} (No stock adjustment needed)`,
            user_id: user.id
          });
        }
      }
    }

    await db.orders.update(orderIdNum, {
      system_status: 'resolved',
      resolution,
      resolution_notes: resolution_notes || '',
      resolved_at: new Date().toISOString()
    });

    return json({ success: true, status: 'resolved' });
  } catch (err) {
    console.error("Resolve order error:", err);
    return json({ message: 'Failed to resolve order' }, 500);
  }
}

async function handleReviewAmbiguous(req) {
  try {
    const orderItemsList = await db.orderItems.list();
    const ordersList = await db.orders.list();

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
    return json(filtered);
  } catch (err) {
    console.error("Get ambiguous items error:", err);
    return json({ message: 'Failed to retrieve ambiguous items' }, 500);
  }
}

async function handleConfirmSplit(req) {
  try {
    const { item_id, product_id, quantity } = await readJson(req);
    if (!item_id || !product_id || !quantity) {
      return json({ message: 'Item ID, product selection, and quantity are required' }, 400);
    }

    const itemIdNum = parseInt(item_id, 10);
    const productIdNum = parseInt(product_id, 10);
    const qty = parseInt(quantity, 10);

    if (isNaN(itemIdNum) || isNaN(productIdNum) || isNaN(qty) || itemIdNum <= 0 || productIdNum <= 0 || qty <= 0) {
      return json({ message: 'Invalid item ID, product ID, or quantity parameter values' }, 400);
    }

    const item = await db.orderItems.get(itemIdNum);
    if (!item || item.is_confirmed === 1) {
      return json({ message: 'Item not found or already confirmed' }, 404);
    }

    const order = await db.orders.get(item.order_id);
    if (!order) {
      return json({ message: 'Order not found' }, 404);
    }

    const product = await db.products.get(productIdNum);
    if (!product) {
      return json({ message: 'Product not found' }, 404);
    }

    const user = req.user;

    await db.orderItems.update(itemIdNum, {
      product_id: productIdNum,
      quantity: qty,
      is_confirmed: 1
    });

    if (order.system_status === 'normal') {
      await db.movements.insert({
        product_id: productIdNum,
        quantity_change: -qty,
        movement_type: 'sale',
        reference: `Confirmed Split Order: ${order.order_id}`,
        user_id: user.id
      });

      const prod = await db.products.get(productIdNum);
      if (prod) {
        await db.products.update(productIdNum, {
          current_stock: prod.current_stock - qty
        });
      }
    }

    return json({ success: true });
  } catch (err) {
    console.error("Confirm split error:", err);
    return json({ message: 'Failed to confirm split mapping' }, 500);
  }
}

async function handleDashboardStats(req) {
  try {
    const storage = getActiveStorage();

    const totalProductsRes = await storage.query("SELECT COUNT(*) AS count FROM products");
    const totalProducts = totalProductsRes[0]?.count || 0;

    const lowStockRes = await storage.query("SELECT COUNT(*) AS count FROM products WHERE current_stock <= low_stock_threshold");
    const lowStockCount = lowStockRes[0]?.count || 0;

    const pendingReviewRes = await storage.query("SELECT COUNT(*) AS count FROM orders WHERE system_status = 'needs_review'");
    const pendingReviewCount = pendingReviewRes[0]?.count || 0;

    const ambiguousRes = await storage.query("SELECT COUNT(*) AS count FROM order_items WHERE is_confirmed = 0");
    const ambiguousCount = ambiguousRes[0]?.count || 0;

    const recentReviews = await storage.query(
      `SELECT id, order_id, product_name_raw, quantity, expedition 
       FROM orders 
       WHERE system_status = 'needs_review' 
       ORDER BY created_at DESC 
       LIMIT 5`
    );

    const recentImports = await storage.query(
      `SELECT s.id, s.template_id, s.user_id, s.filename, s.status, s.total_rows, s.applied_rows, s.flagged_rows, s.orders_data, s.created_at, t.name AS template_name 
       FROM import_sessions s 
       LEFT JOIN import_templates t ON s.template_id = t.id 
       ORDER BY s.created_at DESC 
       LIMIT 5`
    );

    return json({
      total_products: totalProducts,
      low_stock_count: lowStockCount,
      pending_review_count: pendingReviewCount,
      ambiguous_count: ambiguousCount,
      recent_reviews: recentReviews,
      recent_imports: recentImports
    });
  } catch (err) {
    console.error("Dashboard stats retrieval error:", err);
    return json({ message: 'Failed to retrieve dashboard statistics' }, 500);
  }
}

async function handleListOpname(req) {
  try {
    const opnamesList = await db.opnames.list();
    const usersList = await db.users.list();
    const itemsList = await db.opnameItems.list();

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
    return json(joined);
  } catch (err) {
    console.error("List stock opnames error:", err);
    return json({ message: 'Failed to retrieve stock opnames' }, 500);
  }
}

async function handleGetOpnameDetails(req, params) {
  try {
    const id = parseInt(params[0], 10);
    if (isNaN(id)) {
      return json({ message: 'Invalid opname ID' }, 400);
    }

    const report = await db.opnames.get(id);
    if (!report) {
      return json({ message: 'Stock opname report not found' }, 404);
    }

    const user = await db.users.get(report.user_id);
    const opnameItemsList = await db.opnameItems.getByOpnameId(id);
    const productsList = await db.products.list();
    const productMap = new Map(productsList.map(p => [p.id, p]));

    const joinedItems = opnameItemsList.map(soi => {
      const prod = productMap.get(soi.product_id);
      return {
        ...soi,
        name: prod ? prod.name : null,
        model: prod ? prod.model : null
      };
    });

    return json({
      ...report,
      username: user ? user.username : null,
      items: joinedItems
    });
  } catch (err) {
    console.error("Get stock opname report error:", err);
    return json({ message: 'Failed to retrieve stock opname report' }, 500);
  }
}

async function handleCreateOpname(req) {
  try {
    const { notes, items, created_at } = await readJson(req);
    const user = req.user;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return json({ message: 'Items are required' }, 400);
    }

    for (const item of items) {
      const { product_id, physical_stock } = item;
      const prodId = parseInt(product_id, 10);
      const physStock = parseInt(physical_stock, 10);

      if (isNaN(prodId) || isNaN(physStock) || physStock < 0 || prodId <= 0) {
        return json({ message: 'Invalid product_id or physical_stock' }, 400);
      }

      const product = await db.products.get(prodId);
      if (!product) {
        return json({ message: `Product not found with ID ${prodId}` }, 404);
      }
    }

    const newOpname = await db.opnames.insert({
      user_id: user.id,
      notes: notes || '',
      created_at: created_at || undefined
    });

    const opnameId = newOpname.id;

    for (const item of items) {
      const { product_id, physical_stock } = item;
      const prodId = parseInt(product_id, 10);
      const physStock = parseInt(physical_stock, 10);

      const product = await db.products.get(prodId);
      if (!product) {
        throw new Error(`Product not found with ID ${prodId}`);
      }

      const systemStock = product.current_stock;
      const variance = physStock - systemStock;

      await db.opnameItems.insert({
        opname_id: opnameId,
        product_id: prodId,
        system_stock: systemStock,
        physical_stock: physStock,
        variance
      });

      await db.products.update(prodId, {
        current_stock: physStock
      });

      await db.movements.insert({
        product_id: prodId,
        quantity_change: variance,
        movement_type: 'manual_adjust',
        reference: `Stock Opname #${opnameId}`,
        user_id: user.id,
        created_at: newOpname.created_at
      });
    }

    return json({ success: true, id: opnameId }, 201);
  } catch (err) {
    console.error("Create stock opname error:", err);
    return json({ message: err.message || 'Failed to create stock opname' }, 500);
  }
}

async function handleGetChatMessages(req) {
  try {
    const user = req.user;
    if (!user) return json({ message: 'Unauthorized' }, 401);
    
    const url = new URL(req.url);
    const otherUserId = parseInt(url.searchParams.get('other_user_id'), 10);
    if (isNaN(otherUserId)) {
      return json({ message: 'Missing other_user_id' }, 400);
    }

    const messages = await db.chatMessages.listMessages(user.id, otherUserId);
    return json(messages);
  } catch (err) {
    console.error("Get chat messages error:", err);
    return json({ message: 'Failed to retrieve messages' }, 500);
  }
}

async function handleGetChatContacts(req) {
  try {
    const user = req.user;
    if (!user) return json({ message: 'Unauthorized' }, 401);

    const contacts = await db.chatMessages.getContacts(user.id);
    return json(contacts);
  } catch (err) {
    console.error("Get chat contacts error:", err);
    return json({ message: 'Failed to retrieve contacts' }, 500);
  }
}

async function handleSendChatMessage(req) {
  try {
    const user = req.user;
    if (!user) return json({ message: 'Unauthorized' }, 401);

    const { receiver_id, message, product_id } = await readJson(req);
    if (!receiver_id || !message) {
      return json({ message: 'Receiver and message content are required' }, 400);
    }

    const recId = parseInt(receiver_id, 10);
    if (isNaN(recId)) {
      return json({ message: 'Invalid receiver ID' }, 400);
    }

    const receiverExists = await db.users.get(recId);
    if (!receiverExists) {
      return json({ message: 'Receiver user not found' }, 404);
    }

    let prodId = null;
    if (product_id !== undefined && product_id !== null) {
      prodId = parseInt(product_id, 10);
      if (isNaN(prodId)) {
        return json({ message: 'Invalid product ID' }, 400);
      }
      const productExists = await db.products.get(prodId);
      if (!productExists) {
        return json({ message: 'Product not found' }, 404);
      }
    }

    const newMsg = await db.chatMessages.insert({
      sender_id: user.id,
      receiver_id: recId,
      message,
      product_id: prodId
    });

    let product = null;
    if (newMsg.product_id) {
      product = await db.products.get(newMsg.product_id);
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

    return json(newMsg, 201);
  } catch (err) {
    console.error("Send chat message error:", err);
    return json({ message: 'Failed to send message' }, 500);
  }
}

async function handleMarkChatRead(req) {
  try {
    const user = req.user;
    if (!user) return json({ message: 'Unauthorized' }, 401);

    const { sender_id } = await readJson(req);
    if (!sender_id) {
      return json({ message: 'Sender ID is required' }, 400);
    }

    const sndId = parseInt(sender_id, 10);
    if (isNaN(sndId)) {
      return json({ message: 'Invalid sender ID' }, 400);
    }

    await db.chatMessages.markAsRead(sndId, user.id);
    return json({ success: true });
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

async function handleClerkWebhook({ request }) {
  try {
    const env = getActiveEnv();
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || (env && env.CLERK_WEBHOOK_SECRET);
    
    if (webhookSecret) {
      const isValid = await verifyClerkWebhook(request, webhookSecret);
      if (!isValid) {
        return json({ message: 'Invalid signature' }, 401);
      }
    } else {
      console.warn("CLERK_WEBHOOK_SECRET is not configured. Webhook signature verification is skipped.");
    }

    const body = await readJson(request);
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
      
      let existing = await storage.query("SELECT id, username FROM users WHERE password_hash = ?", [clerkId]);
      if (existing && existing.length > 0) {
        const localId = existing[0].id;
        const localUsername = existing[0].username;
        
        if (localUsername !== chosenUsername) {
          let conflict = await storage.query("SELECT id FROM users WHERE username = ? AND password_hash != ?", [chosenUsername, clerkId]);
          if (conflict && conflict.length > 0) {
            let finalUsername = chosenUsername;
            let counter = 1;
            let checkExisting = await storage.query("SELECT id FROM users WHERE username = ?", [finalUsername]);
            while (checkExisting && checkExisting.length > 0) {
              finalUsername = `${chosenUsername}${counter}`;
              checkExisting = await storage.query("SELECT id FROM users WHERE username = ?", [finalUsername]);
              counter++;
            }
            chosenUsername = finalUsername;
          }
          await storage.execute("UPDATE users SET username = ?, role = ? WHERE id = ?", [chosenUsername, role, localId]);
        } else {
          await storage.execute("UPDATE users SET role = ? WHERE id = ?", [role, localId]);
        }
      } else {
        let finalUsername = chosenUsername;
        let counter = 1;
        let checkExisting = await storage.query("SELECT id FROM users WHERE username = ?", [finalUsername]);
        while (checkExisting && checkExisting.length > 0) {
          finalUsername = `${chosenUsername}${counter}`;
          checkExisting = await storage.query("SELECT id FROM users WHERE username = ?", [finalUsername]);
          counter++;
        }
        await storage.execute(
          "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, datetime('now', 'localtime'))",
          [finalUsername, clerkId, role]
        );
      }
    }

    return json({ success: true });
  } catch (err) {
    console.error("Clerk Webhook processing error:", err);
    return json({ message: 'Internal server error' }, 500);
  }
}

async function handleUpdateMovement(req, params) {
  try {
    const id = parseInt(params[0], 10);
    if (isNaN(id)) return json({ message: "Invalid movement ID" }, 400);

    const body = await readJson(req);
    const { created_at, reference, movement_type, quantity_change } = body;

    const movement = await db.movements.get(id);
    if (!movement) {
      return json({ message: 'Movement not found' }, 404);
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
        return json({ message: 'Invalid date format. Use DD/MM/YYYY or YYYY-MM-DD.' }, 400);
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
        return json({ message: 'Invalid movement type' }, 400);
      }
      fields.movement_type = movement_type;
    }

    if (quantity_change !== undefined) {
      const newQty = parseInt(quantity_change, 10);
      if (isNaN(newQty)) {
        return json({ message: 'Invalid quantity change' }, 400);
      }
      fields.quantity_change = newQty;

      // Update the product's current stock
      const product = await db.products.get(movement.product_id);
      if (product) {
        const diff = newQty - movement.quantity_change;
        const newStock = product.current_stock + diff;
        await db.products.update(movement.product_id, {
          current_stock: newStock
        });
      }
    }

    const updated = await db.movements.update(id, fields);
    return json({ success: true, movement: updated });
  } catch (err) {
    console.error("Update movement error:", err);
    return json({ message: 'Failed to update movement' }, 500);
  }
}

export {
  handleUpdateMovement,
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
  handleGetChatMessages,
  handleGetChatContacts,
  handleSendChatMessage,
  handleMarkChatRead,
  handleClerkWebhook
};
