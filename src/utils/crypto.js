import crypto from 'crypto';
import { hashPassword as betterHashPassword, verifyPassword as betterVerifyPassword } from 'better-auth/crypto';

export async function hashPassword(password) {
  return await betterHashPassword(password);
}

export async function verifyPassword(password, storedPassword) {
  if (!storedPassword) return false;
  
  // Try BetterAuth verification first
  try {
    const isValid = await betterVerifyPassword({ password, hash: storedPassword });
    if (isValid) return true;
  } catch (e) {}

  // Fallback to legacy pbkdf2 verification (just in case)
  if (storedPassword.includes(':')) {
    const [salt, hash] = storedPassword.split(':');
    if (salt && hash) {
      try {
        const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        if (hash === verifyHash) return true;
      } catch (e) {}
    }
  }

  return false;
}

export function signJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${encodedHeader}.${encodedPayload}`).digest('base64url');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyJwt(token, secret) {
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
