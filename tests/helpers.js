import { signJwt as cryptoSignJwt } from '../src/utils/crypto.js';
import { initDatabase, seedIfNeeded } from '../src/db/connection.js';
import { storageContext } from '../src/db/context.js';
import { getLocalStore } from '../src/db/local_kv.js';

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
  const res = await appInstance.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${username}: ${res.status}`);
  }
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error(`No Set-Cookie header for ${username}`);
  }
  return setCookie.split(';')[0];
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
