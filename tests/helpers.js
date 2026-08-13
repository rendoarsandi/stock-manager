import { signJwt as cryptoSignJwt } from '../src/utils/crypto.js';
import { initDatabase, seedIfNeeded } from '../src/db/connection.js';
import { storageContext } from '../src/db/context.js';
import { getLocalStore } from '../src/db/local_kv.js';
import { auth } from '../src/utils/auth.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

export function signJwt(payload, secret = JWT_SECRET) {
  return cryptoSignJwt(payload, secret);
}

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

export function assertArrayLength(value, expected, message) {
  assert(Array.isArray(value), `${message}: expected an array`);
  assertEqual(value.length, expected, message);
}

export async function assertStatus(response, expected, label) {
  if (response.status !== expected) {
    const body = await response.text().catch(() => '');
    throw new Error(`${label}: expected status ${expected}, got ${response.status}${body ? `; body=${body}` : ''}`);
  }
}

export async function json(response) {
  return await response.json();
}

export function jsonHeaders(extra = {}) {
  return { 'Content-Type': 'application/json', ...extra };
}

export async function apiRequest(appInstance, path, {
  method = 'GET',
  cookie,
  body,
  headers = {}
} = {}) {
  const finalHeaders = { ...headers };
  if (cookie) finalHeaders.Cookie = cookie;
  if (body !== undefined && !finalHeaders['Content-Type']) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  return appInstance.request(path, {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

export async function loginUser(appInstance, username, password) {
  const store = storageContext.getStore();
  const storage = store ? store.storage : getLocalStore();

  const email = `${username}@example.com`;
  const role = username === 'admin' ? 'admin' : 'staff';
  const userId = username === 'admin' ? 'admin_test_user_id' : 'staff_test_user_id';
  const token = `test_sess_${username}`;
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 86400 * 30;

  try {
    await storage.execute(
      "INSERT OR IGNORE INTO user (id, name, email, emailVerified, createdAt, updatedAt, username, displayUsername, role) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?)",
      [userId, username.toUpperCase(), email, now, now, username, username, role]
    );
    await storage.execute(
      "UPDATE user SET role = ? WHERE id = ?",
      [role, userId]
    );
    await storage.execute(
      "INSERT OR REPLACE INTO session (id, expiresAt, token, createdAt, updatedAt, ipAddress, userAgent, userId) VALUES (?, ?, ?, ?, ?, '', '', ?)",
      [`sess_${username}`, expiresAt, token, now, now, userId]
    );
    await storage.execute(
      "UPDATE users SET password_hash = ? WHERE username = ?",
      [userId, username]
    );
  } catch (e) {}

  return `better-auth.session_token=${token}`;
}

export async function getAdminCookie(appInstance) {
  return loginUser(appInstance, 'admin', 'admin123');
}

export async function getStaffCookie(appInstance) {
  return loginUser(appInstance, 'staff', 'staff123');
}

export async function withSeededStorage(callback) {
  const store = {
    type: 'local',
    storage: getLocalStore()
  };

  return storageContext.run(store, async () => {
    await initDatabase();
    await seedIfNeeded(store.storage);
    return callback(store);
  });
}

export async function runTest(name, callback) {
  try {
    console.log(`\n--- ${name} ---`);
    await callback();
    console.log(`✅ ${name} passed`);
    process.exit(0);
  } catch (err) {
    console.error(`❌ ${name} failed:`, err);
    process.exit(1);
  }
}
