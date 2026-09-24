import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';

export const thresholdsRouter = Router();

const thresholdUpdateSchema = z.object({
  warningMin: z.number().nullable().optional(),
  warningMax: z.number().nullable().optional(),
  criticalMin: z.number().nullable().optional(),
  criticalMax: z.number().nullable().optional(),
  unit: z.string().optional(),
  description: z.string().optional(),
});

// GET /api/thresholds
thresholdsRouter.get('/', authenticateToken, async (_req, res) => {
  const thresholds = await prisma.systemThreshold.findMany({ orderBy: { parameterName: 'asc' } });
  res.json(thresholds);
});

// PUT /api/thresholds/:id — Admin only
thresholdsRouter.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const data = thresholdUpdateSchema.parse(req.body);
    const threshold = await prisma.systemThreshold.update({ where: { id: req.params.id }, data });
    await prisma.auditLog.create({
      data: { userId: req.user!.userId, action: 'THRESHOLD_UPDATED', details: `Updated threshold: ${threshold.parameterName}`, ipAddress: req.ip },
    });
    res.json(threshold);
  } catch (e) {
    if (e instanceof z.ZodError) { res.status(400).json({ error: 'Validation error', details: e.errors }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});
