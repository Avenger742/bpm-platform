import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';

export const tariffsRouter = Router();

const tariffSchema = z.object({
  name: z.string().min(1),
  peakRate: z.number().positive(),
  offPeakRate: z.number().positive(),
  shoulderRate: z.number().positive(),
  demandChargeKw: z.number().positive(),
  effectiveFrom: z.string().datetime(),
});

// GET /api/tariffs
tariffsRouter.get('/', authenticateToken, async (_req, res) => {
  const tariffs = await prisma.utilityTariff.findMany({ orderBy: { effectiveFrom: 'desc' } });
  res.json(tariffs);
});

// POST /api/tariffs — Admin only
tariffsRouter.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const data = tariffSchema.parse(req.body);
    const tariff = await prisma.utilityTariff.create({
      data: { ...data, effectiveFrom: new Date(data.effectiveFrom) },
    });
    await prisma.auditLog.create({
      data: { userId: req.user!.userId, action: 'TARIFF_CREATED', details: `Created tariff: ${data.name}`, ipAddress: req.ip },
    });
    res.status(201).json(tariff);
  } catch (e) {
    if (e instanceof z.ZodError) { res.status(400).json({ error: 'Validation error', details: e.errors }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/tariffs/:id — Admin only
tariffsRouter.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const data = tariffSchema.partial().parse(req.body);
    const tariff = await prisma.utilityTariff.update({
      where: { id: req.params.id },
      data: { ...data, ...(data.effectiveFrom ? { effectiveFrom: new Date(data.effectiveFrom) } : {}) },
    });
    res.json(tariff);
  } catch (e) {
    if (e instanceof z.ZodError) { res.status(400).json({ error: 'Validation error', details: e.errors }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/tariffs/:id — Admin only
tariffsRouter.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  await prisma.utilityTariff.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
