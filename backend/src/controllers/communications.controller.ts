import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';

export const getCommunications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      page = '1', limit = '20', channel, leadId, contactId, dealId, ticketId
    } = req.query as any;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (channel) where.channel = channel;
    if (leadId) where.leadId = leadId;
    if (contactId) where.contactId = contactId;
    if (dealId) where.dealId = dealId;
    if (ticketId) where.ticketId = ticketId;

    // Non-admins only see their own communications
    if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(req.user!.role)) {
      where.userId = req.user!.userId;
    }

    const [communications, total] = await Promise.all([
      prisma.communication.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, avatar: true } },
          attachments: true,
        },
      }),
      prisma.communication.count({ where }),
    ]);

    sendPaginated(res, communications, total, pageNum, limitNum, 'Communications retrieved');
  } catch (error) { next(error); }
};

export const createCommunication = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { channel, subject, body, direction, leadId, contactId, dealId, ticketId, metadata } = req.body;

    const communication = await prisma.communication.create({
      data: {
        channel, subject, body,
        direction: direction || 'outbound',
        sentAt: new Date(),
        metadata: metadata || {},
        userId: req.user!.userId,
        leadId, contactId, dealId, ticketId,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Log activity for the linked entity
    const entityType = leadId ? 'Lead' : contactId ? 'Contact' : dealId ? 'Deal' : 'Ticket';
    const entityId = leadId || contactId || dealId || ticketId;
    if (entityId) {
      await prisma.activityLog.create({
        data: {
          action: `${channel}_LOGGED`,
          entity: entityType,
          entityId,
          userId: req.user!.userId,
          details: { subject, channel },
        },
      });
    }

    sendSuccess(res, communication, 'Communication logged', 201);
  } catch (error) { next(error); }
};

export const getEmailTemplates = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const templates = await prisma.emailTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    sendSuccess(res, templates, 'Templates retrieved');
  } catch (error) { next(error); }
};

export const createEmailTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const template = await prisma.emailTemplate.create({ data: req.body });
    sendSuccess(res, template, 'Template created', 201);
  } catch (error) { next(error); }
};

export const updateEmailTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const template = await prisma.emailTemplate.update({
      where: { id: req.params.id },
      data: req.body,
    });
    sendSuccess(res, template, 'Template updated');
  } catch (error) { next(error); }
};

export const deleteEmailTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.emailTemplate.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    sendSuccess(res, null, 'Template deleted');
  } catch (error) { next(error); }
};
