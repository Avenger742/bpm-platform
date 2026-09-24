import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';

export const auditLogRouter = Router();

// GET /api/audit — Admin only
auditLogRouter.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = '50', offset = '0', userId } = req.query as Record<string, string>;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: userId ? { userId } : {},
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { timestamp: 'desc' },
        take: Math.min(parseInt(limit), 200),
        skip: parseInt(offset),
      }),
      prisma.auditLog.count({ where: userId ? { userId } : {} }),
    ]);

    res.json({ data: logs, total });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
