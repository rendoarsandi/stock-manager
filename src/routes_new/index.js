import { createClerkClient } from '@clerk/backend';
import crypto from 'crypto';
import { db, seedIfNeeded } from '../db/connection.js';
import { verifyPassword, hashPassword } from '../utils/crypto.js';
import { parseExcel } from '../services/excel-parser.js';
import { parseAmbiguousDescription, extractSameProductPromo, extractPackMultiplier, resolvePromoProductToBaseItems } from '../services/ambiguous-parser.js';
import { getActiveStorage, getActiveEnv, storageContext } from '../db/context.js';
import { getLocalStore } from '../db/local_sqlite.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

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

// Custom JWT Sign/Verify
function signJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${encodedHeader}.${encodedPayload}`).digest('base64url');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyJwt(token, secret) {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const [headerB64, payloadB64, signature] = parts;
    if (!headerB64 || !payloadB64 || !signature) {
      return null;
    }
    const expectedSignature = crypto.createHmac('sha256', secret).update(`${headerB64}.${payloadB64}`).digest('base64url');
    
    const sigBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    
    if (sigBuffer.length !== expectedBuffer.length) {
      return null;
    }
    
    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }
    
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    
    if (payload.exp && typeof payload.exp === 'number') {
      if (Math.floor(Date.now() / 1000) > payload.exp) {
        return null;
      }
    }
    
    return payload;
  } catch (e) {
    return null;
  }
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
  if (clerkClientInstance) return clerkClientInstance;

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
  if (!secretKey) {
    secretKey = 'sk_test_' + 'abcde12345'.repeat(8);
  }

  clerkClientInstance = createClerkClient({
    publishableKey,
    secretKey
  });
  return clerkClientInstance;
}

// Authentication check
async function getAuthUser(request) {
  if (process.env.NODE_ENV === 'test') {
    const token = getCookie(request, 'token');
    if (!token) return null;
    return verifyJwt(token, JWT_SECRET);
  }

  try {
    const clerk = getClerkClient();
    const requestState = await clerk.authenticateRequest(request);
    if (requestState.status === 'unknown' || requestState.status === 'signed-out') {
      return null;
    }

    const authData = requestState.toAuth();
    if (!authData || !authData.userId) return null;

    let username = authData.sessionClaims?.username;
    if (!username) {
      username = authData.userId;
    }
    const role = authData.sessionClaims?.metadata?.role || authData.sessionClaims?.publicMetadata?.role || 'staff';

    let localId = null;
    let localUsername = username;
    let needsRegistration = false;
    try {
      const storage = getActiveStorage();
      // 1. Search by Clerk ID in password_hash
      let existing = await storage.query("SELECT id, username FROM users WHERE password_hash = ?", [authData.userId]);
      
      // 2. Fallback: Search by Clerk ID in username column (for migrating older accounts)
      if (!existing || existing.length === 0) {
        existing = await storage.query("SELECT id, username FROM users WHERE username = ?", [authData.userId]);
        if (existing && existing.length > 0) {
          localId = existing[0].id;
          localUsername = existing[0].username;
          // Migrate old user row to store Clerk ID in password_hash
          await storage.execute("UPDATE users SET password_hash = ?, role = ? WHERE id = ?", [authData.userId, role, localId]);
        } else {
          needsRegistration = true;
        }
      } else {
        localId = existing[0].id;
        localUsername = existing[0].username;
        await storage.execute("UPDATE users SET role = ? WHERE id = ?", [role, localId]);
      }
    } catch (dbErr) {
      console.error("Failed to check Clerk user in local DB:", dbErr);
      localId = Math.abs(authData.userId.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)) % 1000000;
    }

    if (needsRegistration) {
      return { id: null, username: localUsername, role, needsRegistration: true, clerkId: authData.userId };
    }

    return { id: localId, username: localUsername, role };
  } catch (e) {
    console.error("Clerk auth failed with error:", e);
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
    const { username, password } = await readJson(req);
    if (!username || !password) {
      return json({ message: 'Username and password are required' }, 400);
    }

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

    const token = signJwt(payload, JWT_SECRET);
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
  return json({ id: user.id, username: user.username, role: user.role, needsRegistration: user.needsRegistration || false });
}

async function handleRegister(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return json({ message: 'Unauthorized. Please log in.' }, 401);
    }
    if (!user.needsRegistration) {
      return json({ message: 'Already registered' }, 400);
    }

    const body = await readJson(req).catch(() => ({}));
    const username = body.username?.trim();

    if (!username) {
      return json({ message: 'Username is required' }, 400);
    }

    const storage = getActiveStorage();
    const existing = await storage.query("SELECT id FROM users WHERE username = ?", [username]);
    if (existing && existing.length > 0) {
      return json({ message: 'Username is already taken' }, 400);
    }

    const clerkId = user.clerkId || user.username || 'clerk_external';
    const role = user.role || 'staff';

    const result = await storage.execute(
      "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, datetime('now', 'localtime'))",
      [username, clerkId, role]
    );

    return json({ success: true, id: result.lastInsertRowid, username, role }, 201);
  } catch (err) {
    console.error("Register error:", err);
    return json({ message: 'Failed to register' }, 500);
  }
}

async function handleListUsers(req) {
  try {
    const list = await db.users.list();
    list.sort((a, b) => a.username.localeCompare(b.username));
    const stripped = list.map(u => ({ id: u.id, username: u.username, role: u.role, created_at: u.created_at }));
    return json(stripped);
  } catch (err) {
    console.error("List users error:", err);
    return json({ message: 'Failed to retrieve users' }, 500);
  }
}

async function handleCreateUser(req) {
  try {
    const { username, password, role } = await readJson(req);
    if (!username || !password || !role) {
      return json({ message: 'Username, password and role are required' }, 400);
    }
    if (role !== 'admin' && role !== 'staff') {
      return json({ message: 'Role must be admin or staff' }, 400);
    }

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
    list.sort((a, b) => a.name.localeCompare(b.name));
    return json(list);
  } catch (err) {
    console.error("List products error:", err);
    return json({ message: 'Failed to retrieve products' }, 500);
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
    const { name, model, master_sku, description, initial_stock, low_stock_threshold } = await readJson(req);
    
    if (!name || !model) {
      return json({ message: 'Product name and model are required' }, 400);
    }

    const user = req.user;
    const threshold = low_stock_threshold !== undefined ? parseInt(low_stock_threshold, 10) : 10;
    const stock = initial_stock !== undefined ? parseInt(initial_stock, 10) : 0;

    const existing = await db.products.getByName(name);
    if (existing) {
      return json({ message: 'Product name already exists' }, 400);
    }

    const inserted = await db.products.insert({
      name,
      model,
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
        user_id: user.id
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
    const { quantity_change, movement_type, reference } = await readJson(req);

    if (quantity_change === undefined || isNaN(parseInt(quantity_change, 10))) {
      return json({ message: 'Valid quantity change is required' }, 400);
    }

    const change = parseInt(quantity_change, 10);
    const type = movement_type || 'manual_adjust';
    const ref = reference || 'Manual stock adjustment';
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
    const { name, model, master_sku, description, low_stock_threshold } = await readJson(req);

    if (!name || !model) {
      return json({ message: 'Product name and model are required' }, 400);
    }

    const existing = await db.products.getByName(name);
    if (existing && existing.id !== id) {
      return json({ message: 'Product name already exists' }, 400);
    }

    const threshold = low_stock_threshold !== undefined ? parseInt(low_stock_threshold, 10) : 10;

    await db.products.update(id, {
      name,
      model,
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
    result.sort((a, b) => a.name.localeCompare(b.name));
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

async function handleUploadExcel(req) {
  try {
    const formData = await req.clone().formData();
    const file = formData.get('file');
    const templateId = parseInt(formData.get('template_id'), 10);

    if (!file || typeof file.arrayBuffer !== 'function' || !templateId || isNaN(templateId)) {
      return json({ message: 'Excel file and template selection are required' }, 400);
    }

    const template = await db.templates.get(templateId);
    if (!template) {
      return json({ message: 'Template not found' }, 404);
    }
    const mapping = JSON.parse(template.column_mapping);

    const catalog = await db.products.list();
    const skuMappings = await db.skuMappings.list();

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parsedRows = await parseExcel(buffer, mapping);
    
    const previewOrders = [];
    let flaggedRowsCount = 0;

    for (const row of parsedRows) {
      if (!row.order_id) continue;

      const existingOrder = await db.orders.getByOrderId(row.order_id);
      const isDuplicate = !!existingOrder;

      const orderStatusNorm = String(row.order_status).toLowerCase();
      const needsReview = orderStatusNorm.includes('batal') || orderStatusNorm.includes('cancel');
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
        const matchedProduct = catalog.find(p => p.model.toLowerCase() === refSku);
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
        const aliasProductId = await db.aliases.get(cleanedText);
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

      previewOrders.push({
        order_id: row.order_id,
        resi_number: row.resi_number || '',
        product_name_raw: row.product_name_raw,
        sku_ref: row.sku_ref || '',
        quantity: row.quantity,
        order_status: row.order_status,
        customer_name: row.customer_name || '',
        expedition: row.expedition || '',
        order_date: row.order_date || '',
        price: row.price || 0,
        system_status: systemStatus,
        is_duplicate: isDuplicate,
        has_ambiguous: hasAmbiguous,
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
      filename: file.name,
      status: 'previewing',
      total_rows: previewOrders.length,
      flagged_rows: flaggedRowsCount,
      orders_data: JSON.stringify(previewOrders)
    });

    return json({
      session_id: insertedSession.id,
      filename: file.name,
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

    const queries = [];

    for (const order of orders) {
      queries.push({
        sql: "INSERT INTO orders (import_session_id, order_id, resi_number, product_name_raw, quantity, order_status, customer_name, expedition, order_date, price, system_status, resolution, resolution_notes, resolved_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))",
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
          order.resolved_at || null
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

    const activeStorage = getActiveStorage();
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
    const { notes, items } = await readJson(req);
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
      notes: notes || ''
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
        user_id: user.id
      });
    }

    return json({ success: true, id: opnameId }, 201);
  } catch (err) {
    console.error("Create stock opname error:", err);
    return json({ message: err.message || 'Failed to create stock opname' }, 500);
  }
}

export function withAuthOrRole(handler, options = {}) {
  return async ({ request, params }) => {
    const runHandler = async () => {
      let reqObj = request;
      if (options.auth || options.role) {
        const user = await getAuthUser(request);
        if (!user) {
          return json({ message: 'Unauthorized. Please log in.' }, 401);
        }

        if (user.needsRegistration && !options.allowUnregistered) {
          return json({ message: 'Registration required.', needsRegistration: true }, 403);
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
      return handler(reqObj, paramArray);
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

export {
  handleHealth,
  handleWsPlaceholder,
  handleLogin,
  handleLogout,
  handleMe,
  handleRegister,
  handleListUsers,
  handleCreateUser,
  handleDeleteUser,
  handleListProducts,
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
  handleResolveReviewOrder,
  handleReviewAmbiguous,
  handleConfirmSplit,
  handleDashboardStats,
  handleListOpname,
  handleGetOpnameDetails,
  handleCreateOpname
};
