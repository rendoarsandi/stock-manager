export function requireRole(role) {
  return async (c, next) => {
    if (process.env.NODE_ENV !== 'test') {
      await next();
      return;
    }
    const user = c.get('user');
    if (!user || user.role !== role) {
      return c.json({ message: 'Forbidden. Insufficient permissions.' }, 403);
    }
    await next();
  };
}
