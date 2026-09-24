import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from './auth';

type Role = 'ADMIN' | 'OPERATOR' | 'GENERAL_USER';

const ROLE_HIERARCHY: Record<Role, number> = {
  GENERAL_USER: 1,
  OPERATOR: 2,
  ADMIN: 3,
};

/**
 * Returns middleware that restricts access to users with the specified roles.
 * Roles are additive — specify multiple to allow any of them.
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as JwtPayload | undefined;

    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(user.role as Role)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: user.role,
      });
      return;
    }

    next();
  };
}

/**
 * Requires at least OPERATOR level access.
 */
export function requireOperator(req: Request, res: Response, next: NextFunction): void {
  const user = req.user as JwtPayload | undefined;
  if (!user) { res.status(401).json({ error: 'Authentication required' }); return; }
  const level = ROLE_HIERARCHY[user.role as Role] ?? 0;
  if (level < ROLE_HIERARCHY.OPERATOR) {
    res.status(403).json({ error: 'Operator or Admin access required' });
    return;
  }
  next();
}

/**
 * Requires ADMIN access.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = req.user as JwtPayload | undefined;
  if (!user) { res.status(401).json({ error: 'Authentication required' }); return; }
  if (user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
