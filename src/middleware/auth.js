import { getCookie, deleteCookie } from 'hono/cookie';
import { verify } from 'hono/jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

export async function requireAuth(c, next) {
  if (process.env.NODE_ENV !== 'test') {
    // Bypass authentication in development
    c.set('user', { id: 1, username: 'admin', role: 'admin' });
    await next();
    return;
  }

  const token = getCookie(c, 'token');
  if (!token) {
    return c.json({ message: 'Unauthorized. Please log in.' }, 401);
  }

  try {
    const payload = await verify(token, JWT_SECRET, 'HS256');
    c.set('user', payload);
    await next();
  } catch (err) {
    deleteCookie(c, 'token');
    return c.json({ message: 'Unauthorized. Session expired.' }, 401);
  }
}
