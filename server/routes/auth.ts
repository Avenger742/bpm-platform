import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );

    // Set httpOnly cookie for web clients
    res.cookie('bpm_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Log login
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        details: `User ${user.email} logged in`,
        ipAddress: req.ip,
      },
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: e.errors });
      return;
    }
    console.error('[auth/login]', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', authenticateToken, async (req, res) => {
  res.clearCookie('bpm_token');

  if (req.user) {
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'USER_LOGOUT',
        details: `User ${req.user.email} logged out`,
        ipAddress: req.ip,
      },
    }).catch(() => {});
  }

  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
authRouter.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
