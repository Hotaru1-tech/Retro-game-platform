import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export type UserRole = 'PLAYER' | 'DEVELOPER' | 'ADMIN';

export interface AuthPayload {
  userId: string;
  username: string;
  role?: UserRole;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Fetch role from DB if not in token
    if (!req.user.role) {
      try {
        const { prisma } = await import('../lib/prisma');
        const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { role: true } });
        if (user) req.user.role = user.role as UserRole;
      } catch {
        res.status(500).json({ error: 'Failed to verify role' });
        return;
      }
    }

    if (!req.user.role || !roles.includes(req.user.role)) {
      res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
      return;
    }
    next();
  };
}

export const requireDeveloper = requireRole('DEVELOPER', 'ADMIN');
export const requireAdmin = requireRole('ADMIN');

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as AuthPayload;
      req.user = decoded;
    } catch {
      // Token invalid, continue without auth
    }
  }
  next();
}
