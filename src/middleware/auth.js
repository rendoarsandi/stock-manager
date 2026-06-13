import { getCookie, deleteCookie } from 'hono/cookie';
import { verify } from 'hono/jwt';
import { getAuth } from '@clerk/hono';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

export async function requireAuth(c, next) {
  if (process.env.NODE_ENV === 'test') {
    const token = getCookie(c, 'token');
    if (!token) {
      return c.json({ message: 'Unauthorized. Please log in.' }, 401);
    }

    try {
      const payload = await verify(token, JWT_SECRET, 'HS256');
      c.set('user', payload);
      await next();
      return;
    } catch (err) {
      deleteCookie(c, 'token');
      return c.json({ message: 'Unauthorized. Session expired.' }, 401);
    }
  }

  const auth = getAuth(c);
  if (!auth || !auth.userId) {
    return c.json({ message: 'Unauthorized' }, 401);
  }

  const id = auth.userId;
  let username = auth.sessionClaims?.username;
  let role = 'staff';

  if (!username) {
    try {
      const clerkClient = c.get('clerk');
      const user = await clerkClient.users.getUser(id);
      username = user.username || user.firstName || 'user';
      role = user.publicMetadata?.role || 'staff';
    } catch (e) {
      username = 'user';
      role = 'staff';
    }
  } else {
    try {
      const clerkClient = c.get('clerk');
      const user = await clerkClient.users.getUser(id);
      role = user.publicMetadata?.role || 'staff';
    } catch (e) {
      role = auth.sessionClaims?.metadata?.role || auth.sessionClaims?.publicMetadata?.role || 'staff';
    }
  }

  c.set('user', { id, username, role });
  await next();
}
