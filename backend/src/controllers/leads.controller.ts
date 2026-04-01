import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { LeadInput } from '../utils/validation';
import { runAutomation } from '../services/automation.service';
import { updateLeadScore } from '../services/leadScoring.service';

export const getLeads = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      page = '1', limit = '20', search,
      sortBy = 'createdAt', sortOrder = 'desc',
      status, source, assigneeId, minScore, maxScore,
    } = req.query as any;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { deletedAt: null };

    // Non-admins see only their own or assigned leads
    if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(req.user!.role)) {
      where.OR = [{ ownerId: req.user!.userId }, { assigneeId: req.user!.userId }];
    }

    if (search) {
      where.AND = [{
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } },
        ],
      }];
    }
    if (status) where.status = status;
    if (source) where.source = source;
    if (assigneeId) where.assigneeId = assigneeId;
    if (minScore) where.score = { ...where.score, gte: parseInt(minScore) };
    if (maxScore) where.score = { ...where.score, lte: parseInt(maxScore) };

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        include: {
          owner: { select: { id: true, name: true, avatar: true } },
          assignee: { select: { id: true, name: true, avatar: true } },
          account: { select: { id: true, name: true } },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    sendPaginated(res, leads, total, pageNum, limitNum, 'Leads retrieved');
  } catch (error) { next(error); }
};

export const getLead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
        account: true,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
        tasks: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
        scoreHistory: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!lead) { sendError(res, 'Lead not found', 404); return; }
    sendSuccess(res, lead, 'Lead retrieved');
  } catch (error) { next(error); }
};

export const createLead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data: LeadInput & { assigneeId?: string; accountId?: string } = req.body;

    // Duplicate detection: same email within same tenant
    if (data.email) {
      const existing = await prisma.lead.findFirst({
        where: { email: data.email, deletedAt: null },
      });
      if (existing) {
        sendError(res, `Duplicate: A lead with email ${data.email} already exists (ID: ${existing.id})`, 409);
        return;
      }
    }

    const lead = await prisma.lead.create({
      data: {
        ...data,
        tags: data.tags ? JSON.stringify(data.tags) : '[]',
        ownerId: req.user!.userId,
      } as any,
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Async: score + automation (don't block response)
    Promise.all([
      updateLeadScore(lead.id),
      runAutomation({
        trigger: 'LEAD_CREATED',
        entityId: lead.id,
        entityType: 'Lead',
        data: { ...lead, status: lead.status, source: lead.source },
        userId: req.user!.userId,
      }),
      prisma.activityLog.create({
        data: {
          action: 'LEAD_CREATED', entity: 'Lead', entityId: lead.id,
          userId: req.user!.userId, details: { name: `${data.firstName} ${data.lastName}` },
        },
      }),
    ]).catch(() => {});

    sendSuccess(res, lead, 'Lead created', 201);
  } catch (error) { next(error); }
};

export const updateLead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.lead.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) { sendError(res, 'Lead not found', 404); return; }

    const data: Partial<LeadInput> & { assigneeId?: string; accountId?: string } = req.body;

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: { ...data, tags: data.tags ? JSON.stringify(data.tags) : undefined } as any,
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Trigger automations on status change
    const promises: Promise<any>[] = [
      prisma.activityLog.create({
        data: {
          action: 'LEAD_UPDATED', entity: 'Lead', entityId: lead.id,
          userId: req.user!.userId,
          changes: data.status !== existing.status
            ? { status: { from: existing.status, to: data.status } }
            : {},
          details: {},
        },
      }),
      updateLeadScore(lead.id),
    ];

    if (data.status && data.status !== existing.status) {
      promises.push(runAutomation({
        trigger: 'LEAD_STATUS_CHANGED',
        entityId: lead.id,
        entityType: 'Lead',
        data: { ...lead, previousStatus: existing.status },
        userId: req.user!.userId,
      }));
    }

    Promise.all(promises).catch(() => {});

    sendSuccess(res, lead, 'Lead updated');
  } catch (error) { next(error); }
};

export const deleteLead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.lead.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) { sendError(res, 'Lead not found', 404); return; }

    // Soft delete
    await prisma.lead.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });

    await prisma.activityLog.create({
      data: {
        action: 'LEAD_DELETED', entity: 'Lead', entityId: req.params.id,
        userId: req.user!.userId, details: {},
      },
    });

    sendSuccess(res, null, 'Lead deleted');
  } catch (error) { next(error); }
};

export const convertLead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!lead) { sendError(res, 'Lead not found', 404); return; }

    // Create contact from lead
    const contact = await prisma.contact.create({
      data: {
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email || undefined,
        phone: lead.phone || undefined,
        company: lead.company || undefined,
        jobTitle: lead.jobTitle || undefined,
        notes: lead.notes || undefined,
        tags: lead.tags as any,
        customFields: lead.customFields as any,
        ownerId: req.user!.userId,
      },
    });

    // Mark lead as converted
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: 'WON',
        convertedAt: new Date(),
        convertedToContactId: contact.id,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'LEAD_CONVERTED', entity: 'Lead', entityId: lead.id,
        userId: req.user!.userId, details: { contactId: contact.id },
      },
    });

    sendSuccess(res, { lead: { id: lead.id }, contact }, 'Lead converted to contact', 201);
  } catch (error) { next(error); }
};

export const bulkAssign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ids, assigneeId } = req.body;
    if (!ids || !ids.length) { sendError(res, 'No lead IDs provided', 400); return; }

    await prisma.lead.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { assigneeId },
    });

    sendSuccess(res, { updated: ids.length }, `${ids.length} leads assigned`);
  } catch (error) { next(error); }
};
