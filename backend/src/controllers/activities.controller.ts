import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { z } from 'zod';

const activitySchema = z.object({
  channel: z.enum(['EMAIL', 'PHONE', 'WHATSAPP', 'SMS', 'MEETING', 'NOTE']),
  subject: z.string().min(1),
  body: z.string().optional(),
  direction: z.enum(['inbound', 'outbound']).default('outbound'),
  scheduledAt: z.string().optional(),
  duration: z.number().int().positive().optional(),
  meetingLink: z.string().optional(),
  meetingSummary: z.string().optional(),
  nextAction: z.string().optional(),
  activityStatus: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']).optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  leadId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const INCLUDE = {
  user: { select: { id: true, name: true, avatar: true } },
  contact: { select: { id: true, firstName: true, lastName: true, company: true } },
  deal: { select: { id: true, title: true } },
  lead: { select: { id: true, firstName: true, lastName: true, company: true } },
};

// ── GET /activities ───────────────────────────────────────────────────────────
export const getActivities = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const {
      page = '1', limit = '30',
      channel, activityStatus, contactId, dealId, leadId,
      from, to, search,
    } = req.query as Record<string, string>;

    const where: any = {};
    if (channel) where.channel = channel;
    if (activityStatus) where.activityStatus = activityStatus;
    if (contactId) where.contactId = contactId;
    if (dealId) where.dealId = dealId;
    if (leadId) where.leadId = leadId;
    if (search) where.subject = { contains: search, mode: 'insensitive' };
    if (from || to) {
      where.scheduledAt = {};
      if (from) where.scheduledAt.gte = new Date(from);
      if (to) where.scheduledAt.lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      prisma.communication.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: [{ scheduledAt: 'desc' }, { createdAt: 'desc' }],
        include: INCLUDE,
      }),
      prisma.communication.count({ where }),
    ]);

    res.json({ data, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET /activities/upcoming ──────────────────────────────────────────────────
export const getUpcoming = async (req: Request, res: Response) => {
  try {
    const days = parseInt((req.query.days as string) || '7');
    const now = new Date();
    const end = new Date(now.getTime() + days * 86400000);

    const data = await prisma.communication.findMany({
      where: {
        channel: 'MEETING',
        scheduledAt: { gte: now, lte: end },
        activityStatus: { notIn: ['cancelled', 'completed'] },
      },
      orderBy: { scheduledAt: 'asc' },
      include: INCLUDE,
    });

    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET /activities/stats ─────────────────────────────────────────────────────
export const getStats = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);
    const weekEnd = new Date(now.getTime() + 7 * 86400000);

    const [upcomingMeetings, completedToday, pendingActions, thisWeekTotal, overdueCount] = await Promise.all([
      prisma.communication.count({
        where: { channel: 'MEETING', scheduledAt: { gte: now, lte: weekEnd }, activityStatus: { notIn: ['cancelled', 'completed'] } },
      }),
      prisma.communication.count({
        where: { activityStatus: 'completed', updatedAt: { gte: todayStart, lt: todayEnd } },
      }),
      prisma.communication.count({
        where: { nextAction: { not: null }, activityStatus: { notIn: ['completed', 'cancelled'] } },
      }),
      prisma.communication.count({
        where: { scheduledAt: { gte: todayStart, lte: weekEnd } },
      }),
      prisma.communication.count({
        where: {
          channel: 'MEETING',
          scheduledAt: { lt: now },
          activityStatus: { notIn: ['completed', 'cancelled', 'no_show'] },
        },
      }),
    ]);

    res.json({ data: { upcomingMeetings, completedToday, pendingActions, thisWeekTotal, overdueCount } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET /activities/:id ───────────────────────────────────────────────────────
export const getActivity = async (req: Request, res: Response) => {
  try {
    const activity = await prisma.communication.findUnique({
      where: { id: req.params.id },
      include: { ...INCLUDE, attachments: true },
    });
    if (!activity) return res.status(404).json({ error: 'Not found' });
    res.json({ data: activity });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ── POST /activities ──────────────────────────────────────────────────────────
export const createActivity = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const body = activitySchema.parse(req.body);

    const isMeeting = body.channel === 'MEETING';
    const activity = await prisma.communication.create({
      data: {
        channel: body.channel,
        subject: body.subject,
        body: body.body,
        direction: body.direction,
        status: isMeeting ? 'scheduled' : 'sent',
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : isMeeting ? undefined : new Date(),
        sentAt: isMeeting ? undefined : new Date(),
        duration: body.duration,
        meetingLink: body.meetingLink,
        meetingSummary: body.meetingSummary,
        nextAction: body.nextAction,
        activityStatus: body.activityStatus ?? (isMeeting ? 'scheduled' : 'completed'),
        metadata: body.metadata ?? {},
        userId,
        contactId: body.contactId,
        dealId: body.dealId,
        leadId: body.leadId,
      },
      include: INCLUDE,
    });

    // Activity log
    const entityId = body.contactId || body.dealId || body.leadId;
    const entityType = body.contactId ? 'Contact' : body.dealId ? 'Deal' : body.leadId ? 'Lead' : null;
    if (entityId && entityType) {
      await prisma.activityLog.create({
        data: {
          action: `${body.channel}_LOGGED`,
          entity: entityType,
          entityId,
          userId,
          details: { subject: body.subject, channel: body.channel },
        },
      });
    }

    res.status(201).json({ data: activity });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// ── PUT /activities/:id ───────────────────────────────────────────────────────
export const updateActivity = async (req: Request, res: Response) => {
  try {
    const body = activitySchema.partial().parse(req.body);

    const updated = await prisma.communication.update({
      where: { id: req.params.id },
      data: {
        subject: body.subject,
        body: body.body,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        duration: body.duration,
        meetingLink: body.meetingLink,
        meetingSummary: body.meetingSummary,
        nextAction: body.nextAction,
        activityStatus: body.activityStatus,
        contactId: body.contactId,
        dealId: body.dealId,
        leadId: body.leadId,
      },
      include: INCLUDE,
    });

    res.json({ data: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// ── DELETE /activities/:id (soft — mark cancelled) ────────────────────────────
export const deleteActivity = async (req: Request, res: Response) => {
  try {
    await prisma.communication.update({
      where: { id: req.params.id },
      data: { activityStatus: 'cancelled' },
    });
    res.json({ data: { success: true } });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
