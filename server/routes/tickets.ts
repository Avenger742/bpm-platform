import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { requireOperator, requireAdmin } from '../middleware/rbac';

export const ticketsRouter = Router();

const ticketCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  subsystem: z.string().min(1),
  assignedToId: z.string().optional(),
  telemetrySnapshotJson: z.string().optional(),
});

const ticketUpdateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['NEW', 'IN_PROGRESS', 'RESOLVED']).optional(),
  subsystem: z.string().optional(),
  resolutionNotes: z.string().optional(),
  assignedToId: z.string().nullable().optional(),
});

function generateTicketCode(): string {
  return `BPM-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

// GET /api/tickets
ticketsRouter.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, severity, subsystem } = req.query as Record<string, string>;
    const tickets = await prisma.maintenanceTicket.findMany({
      where: {
        ...(status ? { status: status as 'NEW' | 'IN_PROGRESS' | 'RESOLVED' } : {}),
        ...(severity ? { severity: severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' } : {}),
        ...(subsystem ? { subsystem } : {}),
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: [{ status: 'asc' }, { severity: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(tickets);
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tickets/:id
ticketsRouter.get('/:id', authenticateToken, async (req, res) => {
  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id: req.params.id },
    include: {
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      assignedTo: { select: { id: true, name: true, email: true, role: true } },
    },
  });
  if (!ticket) { res.status(404).json({ error: 'Ticket not found' }); return; }
  res.json(ticket);
});

// POST /api/tickets — Operator+
ticketsRouter.post('/', authenticateToken, requireOperator, async (req, res) => {
  try {
    const data = ticketCreateSchema.parse(req.body);
    const ticket = await prisma.maintenanceTicket.create({
      data: {
        ...data,
        ticketCode: generateTicketCode(),
        createdById: req.user!.userId,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    await prisma.auditLog.create({
      data: { userId: req.user!.userId, action: 'TICKET_CREATED', details: `Created ${ticket.ticketCode}: ${data.title}`, ipAddress: req.ip },
    });
    res.status(201).json(ticket);
  } catch (e) {
    if (e instanceof z.ZodError) { res.status(400).json({ error: 'Validation error', details: e.errors }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/tickets/:id — Operator+
ticketsRouter.patch('/:id', authenticateToken, requireOperator, async (req, res) => {
  try {
    const data = ticketUpdateSchema.parse(req.body);
    const ticket = await prisma.maintenanceTicket.update({
      where: { id: req.params.id },
      data,
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    await prisma.auditLog.create({
      data: { userId: req.user!.userId, action: 'TICKET_UPDATED', details: `Updated ${ticket.ticketCode}`, ipAddress: req.ip },
    });
    res.json(ticket);
  } catch (e) {
    if (e instanceof z.ZodError) { res.status(400).json({ error: 'Validation error', details: e.errors }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/tickets/:id — Admin only
ticketsRouter.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  await prisma.maintenanceTicket.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
