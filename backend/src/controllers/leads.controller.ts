import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { LeadInput } from '../utils/validation';
import { runAutomation } from '../services/automation.service';
import { updateLeadScore } from '../services/leadScoring.service';
import { coerceLeadStatus, toPersistedLeadStatus, toPersistedLeadStatusFilter } from '../utils/leadStatus';

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
    if (status) {
      const statusFilter = toPersistedLeadStatusFilter(status);
      if (statusFilter?.length === 1) where.status = statusFilter[0];
      else if (statusFilter?.length) where.status = { in: statusFilter };
    }
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

    sendPaginated(
      res,
      leads.map((lead) => ({ ...lead, status: coerceLeadStatus(lead.status) })),
      total,
      pageNum,
      limitNum,
      'Leads retrieved',
    );
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
    sendSuccess(res, { ...lead, status: coerceLeadStatus(lead.status) }, 'Lead retrieved');
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
        status: toPersistedLeadStatus(data.status),
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

    sendSuccess(res, { ...lead, status: coerceLeadStatus(lead.status) }, 'Lead created', 201);
  } catch (error) { next(error); }
};

export const updateLead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.lead.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) { sendError(res, 'Lead not found', 404); return; }

    const data: Partial<LeadInput> & { assigneeId?: string; accountId?: string } = req.body;

    const updateData = {
      ...data,
      ...(data.status !== undefined ? { status: toPersistedLeadStatus(data.status) } : {}),
      tags: data.tags ? JSON.stringify(data.tags) : undefined,
    };

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: updateData as any,
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
          changes: data.status !== undefined && coerceLeadStatus(data.status) !== coerceLeadStatus(existing.status)
            ? { status: { from: coerceLeadStatus(existing.status), to: coerceLeadStatus(data.status) } }
            : {},
          details: {},
        },
      }),
      updateLeadScore(lead.id),
    ];

    if (data.status !== undefined && coerceLeadStatus(data.status) !== coerceLeadStatus(existing.status)) {
      promises.push(runAutomation({
        trigger: 'LEAD_STATUS_CHANGED',
        entityId: lead.id,
        entityType: 'Lead',
        data: { ...lead, previousStatus: coerceLeadStatus(existing.status) },
        userId: req.user!.userId,
      }));
    }

    Promise.all(promises).catch(() => {});

    sendSuccess(res, { ...lead, status: coerceLeadStatus(lead.status) }, 'Lead updated');
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

// ── Convert Lead → Opportunity ────────────────────────────────────────────────
export const convertToOpportunity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!lead) { sendError(res, 'Lead not found', 404); return; }
    if (lead.convertedToOpportunityId) {
      sendError(res, 'Lead already converted to opportunity', 409); return;
    }

    const { title, value, closeDate, probability, notes } = req.body;

    const now = new Date();
    const opp = await (prisma as any).opportunity.create({
      data: {
        title:               title || `${lead.firstName} ${lead.lastName} — ${lead.company || 'Opportunity'}`,
        description:         lead.notes || undefined,
        stage:               'OPPORTUNITY',
        type:                'NEW_BUSINESS',
        priority:            'MEDIUM',
        value:               value ?? lead.value ?? 0,
        currency:            lead.currency ?? 'INR',
        probability:         probability ?? 20,
        closeDate:           closeDate ? new Date(closeDate) : undefined,
        source:              lead.source,
        notes:               notes || undefined,
        tags:                [],
        country:             (lead as any).country || undefined,
        decisionMakerName:   (lead as any).decisionMakerName || undefined,
        decisionMakerDesignation: (lead as any).decisionMakerDesignation || undefined,
        convertedFromLeadId: lead.id,
        stageEnteredAt:      { OPPORTUNITY: now.toISOString() },
        ownerId:             req.user!.userId,
      },
      include: {
        owner:   { select: { id: true, name: true, avatar: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Mark lead as converted
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: toPersistedLeadStatus('CONVERTED'),
        convertedAt: now,
        convertedToOpportunityId: opp.id,
      } as any,
    });

    await prisma.activityLog.create({
      data: {
        action: 'LEAD_CONVERTED_OPPORTUNITY', entity: 'Lead', entityId: lead.id,
        userId: req.user!.userId, details: { opportunityId: opp.id, title: opp.title },
      },
    });

    sendSuccess(res, { opportunity: opp, leadId: lead.id }, 'Lead converted to opportunity', 201);
  } catch (error) { next(error); }
};

// ── Convert Lead → Contact (existing) ────────────────────────────────────────
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
        status: toPersistedLeadStatus('CONVERTED'),
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
