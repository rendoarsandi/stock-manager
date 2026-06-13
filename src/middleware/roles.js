export function requireRole(role) {
  return async (c, next) => {
    const user = c.get('user');
    if (!user || user.role !== role) {
      return c.json({ message: 'Forbidden. Insufficient permissions.' }, 403);
    }
    await next();
  };
}
