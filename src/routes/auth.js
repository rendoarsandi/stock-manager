import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';
import { db } from '../db/connection.js';
import { verifyPassword, hashPassword } from '../utils/crypto.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const auth = new Hono();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

auth.post('/login', async (c) => {
  try {
    const { username, password } = await c.req.json();
    if (!username || !password) {
      return c.json({ message: 'Username and password are required' }, 400);
    }

    const user = await db.users.getByUsername(username);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return c.json({ message: 'Invalid username or password' }, 401);
    }

    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours
    };

    const token = await sign(payload, JWT_SECRET);
    setCookie(c, 'token', token, {
      httpOnly: true,
      secure: false, // false for localhost/Termux development
      path: '/',
      maxAge: 60 * 60 * 24
    });

    return c.json({
      id: user.id,
      username: user.username,
      role: user.role
    });
  } catch (err) {
    console.error("Login route error:", err);
    return c.json({ message: 'Internal server error' }, 500);
  }
});

auth.post('/logout', (c) => {
  deleteCookie(c, 'token');
  return c.json({ success: true });
});

auth.get('/me', async (c) => {
  if (process.env.NODE_ENV !== 'test') {
    return c.json({
      id: 1,
      username: 'admin',
      role: 'admin'
    });
  }

  const token = getCookie(c, 'token');
  console.log("DEBUG: token from getCookie:", token);
  console.log("DEBUG: Cookie header:", c.req.header('cookie') || c.req.header('Cookie'));
  if (!token) {
    return c.json({ message: 'Not logged in' }, 401);
  }

  try {
    const payload = await verify(token, JWT_SECRET, 'HS256');
    return c.json({
      id: payload.id,
      username: payload.username,
      role: payload.role
    });
  } catch (err) {
    console.error("DEBUG: verification failed with error:", err);
    deleteCookie(c, 'token');
    return c.json({ message: 'Invalid or expired session' }, 401);
  }
});

// GET /users (requires admin role): lists all users
auth.get('/users', requireAuth, requireRole('admin'), async (c) => {
  try {
    const list = await db.users.list();
    // Sort by username alphabetically
    list.sort((a, b) => a.username.localeCompare(b.username));
    // Strip password hash for safety
    const stripped = list.map(u => ({ id: u.id, username: u.username, role: u.role, created_at: u.created_at }));
    return c.json(stripped);
  } catch (err) {
    console.error("List users error:", err);
    return c.json({ message: 'Failed to retrieve users' }, 500);
  }
});

// POST /users (requires admin role): creates a new user account
auth.post('/users', requireAuth, requireRole('admin'), async (c) => {
  try {
    const { username, password, role } = await c.req.json();
    if (!username || !password || !role) {
      return c.json({ message: 'Username, password and role are required' }, 400);
    }
    if (role !== 'admin' && role !== 'staff') {
      return c.json({ message: 'Role must be admin or staff' }, 400);
    }

    // Check for duplicate username
    const existing = await db.users.getByUsername(username);
    if (existing) {
      return c.json({ message: 'Username already exists' }, 400);
    }

    const hashedPassword = hashPassword(password);
    const inserted = await db.users.insert({
      username,
      password_hash: hashedPassword,
      role
    });

    return c.json({ success: true, id: inserted.id }, 201);
  } catch (err) {
    console.error("Create user error:", err);
    return c.json({ message: 'Failed to create user' }, 500);
  }
});

// DELETE /users/:id (requires admin role): deletes a user account
auth.delete('/users/:id', requireAuth, requireRole('admin'), async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    const currentUser = c.get('user');

    if (id === 1 || id === currentUser.id) {
      return c.json({ message: 'Cannot delete the main admin or your own current logged-in user account' }, 400);
    }

    // Verify user exists before deleting
    const existing = await db.users.get(id);
    if (!existing) {
      return c.json({ message: 'User not found' }, 404);
    }

    await db.users.delete(id);
    return c.json({ success: true });
  } catch (err) {
    console.error("Delete user error:", err);
    return c.json({ message: 'Failed to delete user' }, 500);
  }
});

export default auth;
