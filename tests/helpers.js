import { signJwt as cryptoSignJwt } from '../src/utils/crypto.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

export function signJwt(payload, secret = JWT_SECRET) {
  return cryptoSignJwt(payload, secret);
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
