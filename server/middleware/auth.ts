import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  role: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const cookieToken = req.cookies?.['bpm_token'];
  const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null) || cookieToken;

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const cookieToken = req.cookies?.['bpm_token'];
  const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null) || cookieToken;

  if (token) {
    try {
      const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
      req.user = jwt.verify(token, secret) as JwtPayload;
    } catch {
      // Silently ignore invalid optional token
    }
  }
  next();
}
