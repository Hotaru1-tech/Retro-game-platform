import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { verifyClerkToken } from '../lib/clerk';

export type UserRole = 'PLAYER' | 'DEVELOPER' | 'ADMIN';

export interface AuthPayload {
  userId?: string;
  clerkId: string;
  role?: UserRole;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

async function verifyRequestToken(req: AuthRequest): Promise<{ clerkId: string } | null> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  const verifiedToken = await verifyClerkToken(token);
  const clerkId = verifiedToken.sub;
  if (!clerkId) {
    return null;
  }

  return { clerkId };
}

async function resolveAuth(req: AuthRequest): Promise<AuthPayload | null> {
  const verified = await verifyRequestToken(req);
  if (!verified) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: verified.clerkId },
    select: { id: true, role: true },
  });

  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    clerkId: verified.clerkId,
    role: user.role as UserRole,
  };
}

export async function clerkAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const verified = await verifyRequestToken(req);
    if (!verified) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    req.user = {
      clerkId: verified.clerkId,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = await resolveAuth(req);
    if (!auth) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    req.user = auth;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role as UserRole)) {
      res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
      return;
    }
    next();
  };
}

export const requireDeveloper = requireRole('DEVELOPER', 'ADMIN');
export const requireAdmin = requireRole('ADMIN');

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    req.user = await resolveAuth(req) || undefined;
  } catch {
    req.user = undefined;
  }
  next();
}
