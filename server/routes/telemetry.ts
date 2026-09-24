import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';

export const telemetryRouter = Router();

// GET /api/telemetry — Query historical telemetry with time-range filters
telemetryRouter.get('/', authenticateToken, async (req, res) => {
  try {
    const { from, to, limit = '100', offset = '0' } = req.query as Record<string, string>;

    const where: Record<string, unknown> = {};

    if (from || to) {
      where['timestamp'] = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const [records, total] = await Promise.all([
      prisma.telemetryRecord.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: Math.min(parseInt(limit), 1000),
        skip: parseInt(offset),
      }),
      prisma.telemetryRecord.count({ where }),
    ]);

    res.json({ data: records, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (e) {
    console.error('[telemetry/get]', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/telemetry/latest — Most recent record
telemetryRouter.get('/latest', authenticateToken, async (_req, res) => {
  try {
    const record = await prisma.telemetryRecord.findFirst({
      orderBy: { timestamp: 'desc' },
    });
    res.json(record ?? null);
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/telemetry/summary — Aggregated stats for dashboard overview
telemetryRouter.get('/summary', authenticateToken, async (req, res) => {
  try {
    const { period = '24h' } = req.query as Record<string, string>;

    const hours: Record<string, number> = { '24h': 24, '7d': 168, '30d': 720 };
    const cutoff = new Date(Date.now() - (hours[period] ?? 24) * 60 * 60 * 1000);

    const records = await prisma.telemetryRecord.findMany({
      where: { timestamp: { gte: cutoff } },
      orderBy: { timestamp: 'asc' },
    });

    if (!records.length) {
      res.json({ period, count: 0, averages: {}, totals: {} });
      return;
    }

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

    const summary = {
      period,
      count: records.length,
      averages: {
        solarKw: avg(records.map(r => r.solarKw)),
        bioenergyKw: avg(records.map(r => r.bioenergyKw)),
        loadKw: avg(records.map(r => r.loadKw)),
        gridImportKw: avg(records.map(r => r.gridImportKw)),
        gridExportKw: avg(records.map(r => r.gridExportKw)),
        batterySoc: avg(records.map(r => r.batterySoc)),
        batterySoh: avg(records.map(r => r.batterySoh)),
        pneumaticPressurePsi: avg(records.map(r => r.pneumaticPressurePsi)),
      },
      totals: {
        solarKwh: sum(records.map(r => r.solarKw)) / records.length * (hours[period] ?? 24),
        bioenergyKwh: sum(records.map(r => r.bioenergyKw)) / records.length * (hours[period] ?? 24),
        loadKwh: sum(records.map(r => r.loadKw)) / records.length * (hours[period] ?? 24),
        gridImportKwh: sum(records.map(r => r.gridImportKw)) / records.length * (hours[period] ?? 24),
        gridExportKwh: sum(records.map(r => r.gridExportKw)) / records.length * (hours[period] ?? 24),
      },
      latest: records[records.length - 1],
    };

    res.json(summary);
  } catch (e) {
    console.error('[telemetry/summary]', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});
