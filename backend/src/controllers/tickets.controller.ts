import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';

export const getTickets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      page = '1', limit = '20', search, status, priority, assigneeId,
      sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query as any;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;

    // Support reps see only their tickets unless manager/admin
    if (req.user!.role === 'SUPPORT') {
      where.assigneeId = req.user!.userId;
    }

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          assignee: { select: { id: true, name: true, avatar: true } },
          reporter: { select: { id: true, name: true, avatar: true } },
          _count: { select: { communications: true } },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    sendPaginated(res, tickets, total, pageNum, limitNum, 'Tickets retrieved');
  } catch (error) { next(error); }
};

export const getTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        contact: true,
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        reporter: { select: { id: true, name: true, email: true, avatar: true } },
        communications: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, name: true, avatar: true } }, attachments: true },
        },
        statusHistory: { orderBy: { changedAt: 'asc' } },
      },
    });
    if (!ticket) { sendError(res, 'Ticket not found', 404); return; }
    sendSuccess(res, ticket, 'Ticket retrieved');
  } catch (error) { next(error); }
};

export const createTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { subject, description, priority, contactId, assigneeId, tags } = req.body;

    // Calculate SLA deadline based on priority
    const slaHours: Record<string, number> = { LOW: 72, MEDIUM: 24, HIGH: 8, CRITICAL: 2 };
    const slaDeadline = new Date(Date.now() + (slaHours[priority || 'MEDIUM'] * 60 * 60 * 1000));

    const ticket = await prisma.supportTicket.create({
      data: {
        subject, description, priority: priority || 'MEDIUM',
        contactId, assigneeId,
        reporterId: req.user!.userId,
        tags: tags || [],
        slaDeadline,
        statusHistory: {
          create: { toStatus: 'OPEN', changedById: req.user!.userId },
        },
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Notify assignee if assigned
    if (assigneeId) {
      await prisma.notification.create({
        data: {
          type: 'TICKET_ASSIGNED',
          title: 'New ticket assigned',
          body: `Ticket: "${subject}" has been assigned to you`,
          link: `/tickets/${ticket.id}`,
          userId: assigneeId,
        },
      });
    }

    await prisma.activityLog.create({
      data: {
        action: 'TICKET_CREATED', entity: 'SupportTicket', entityId: ticket.id,
        userId: req.user!.userId, details: { subject },
      },
    });

    sendSuccess(res, ticket, 'Ticket created', 201);
  } catch (error) { next(error); }
};

export const updateTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.supportTicket.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) { sendError(res, 'Ticket not found', 404); return; }

    const { status, assigneeId, ...rest } = req.body;
    const updateData: any = { ...rest };

    if (status && status !== existing.status) {
      updateData.status = status;
      if (status === 'RESOLVED') updateData.resolvedAt = new Date();
      if (status === 'CLOSED') updateData.closedAt = new Date();

      await prisma.ticketStatusHistory.create({
        data: {
          ticketId: req.params.id,
          fromStatus: existing.status,
          toStatus: status,
          changedById: req.user!.userId,
        },
      });
    }

    if (assigneeId !== undefined) {
      updateData.assigneeId = assigneeId;
      if (assigneeId && assigneeId !== existing.assigneeId) {
        await prisma.notification.create({
          data: {
            type: 'TICKET_ASSIGNED',
            title: 'Ticket assigned to you',
            body: `Ticket: "${existing.subject}"`,
            link: `/tickets/${existing.id}`,
            userId: assigneeId,
          },
        });
      }
    }

    const ticket = await prisma.supportTicket.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
      },
    });

    sendSuccess(res, ticket, 'Ticket updated');
  } catch (error) { next(error); }
};

export const deleteTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.supportTicket.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) { sendError(res, 'Ticket not found', 404); return; }
    await prisma.supportTicket.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    sendSuccess(res, null, 'Ticket deleted');
  } catch (error) { next(error); }
};

export const getTicketStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [open, inProgress, resolved, overdueSla] = await Promise.all([
      prisma.supportTicket.count({ where: { status: 'OPEN', deletedAt: null } }),
      prisma.supportTicket.count({ where: { status: 'IN_PROGRESS', deletedAt: null } }),
      prisma.supportTicket.count({ where: { status: 'RESOLVED', deletedAt: null } }),
      prisma.supportTicket.count({
        where: {
          deletedAt: null,
          status: { notIn: ['RESOLVED', 'CLOSED'] },
          slaDeadline: { lt: new Date() },
        },
      }),
    ]);

    sendSuccess(res, { open, inProgress, resolved, overdueSla }, 'Ticket stats retrieved');
  } catch (error) { next(error); }
};
