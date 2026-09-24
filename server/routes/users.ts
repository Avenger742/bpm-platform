import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';

export const usersRouter = Router();

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'OPERATOR', 'GENERAL_USER']),
});

const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'OPERATOR', 'GENERAL_USER']).optional(),
  password: z.string().min(8).optional(),
});

// GET /api/users — Admin only
usersRouter.get('/', authenticateToken, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
});

// POST /api/users — Admin only
usersRouter.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role } = createUserSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { res.status(409).json({ error: 'Email already in use' }); return; }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    await prisma.auditLog.create({
      data: { userId: req.user!.userId, action: 'USER_CREATED', details: `Created user: ${email} (${role})`, ipAddress: req.ip },
    });
    res.status(201).json(user);
  } catch (e) {
    if (e instanceof z.ZodError) { res.status(400).json({ error: 'Validation error', details: e.errors }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/users/:id — Admin only
usersRouter.patch('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const data = updateUserSchema.parse(req.body);
    const updateData: Record<string, unknown> = { ...data };
    if (data.password) {
      updateData['passwordHash'] = await bcrypt.hash(data.password, 10);
      delete updateData['password'];
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    res.json(user);
  } catch (e) {
    if (e instanceof z.ZodError) { res.status(400).json({ error: 'Validation error', details: e.errors }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/users/:id — Admin only
usersRouter.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  if (req.params.id === req.user!.userId) {
    res.status(400).json({ error: 'Cannot delete your own account' });
    return;
  }
  await prisma.user.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
