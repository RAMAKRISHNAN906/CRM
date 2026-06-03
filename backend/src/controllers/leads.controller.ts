import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { LeadInput } from '../utils/validation';
import { runAutomation } from '../services/automation.service';
import { updateLeadScore } from '../services/leadScoring.service';
import { coerceLeadStatus, toPersistedLeadStatusFilter } from '../utils/leadStatus';

let cachedLeadStatusLabels: Set<string> | null = null;

const getLiveLeadStatusLabels = async () => {
  if (cachedLeadStatusLabels) return cachedLeadStatusLabels;
  try {
    const rows = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'LeadStatus'
    `;
    cachedLeadStatusLabels = new Set(rows.map((row) => String(row.enumlabel).toUpperCase()));
  } catch {
    cachedLeadStatusLabels = new Set(['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST']);
  }
  return cachedLeadStatusLabels;
};

const toLivePersistedLeadStatus = async (value?: unknown, fallback: any = 'COLD') => {
  const desired = coerceLeadStatus(value, fallback);
  const liveLabels = await getLiveLeadStatusLabels();
  const preferredMap: Record<string, string[]> = {
    COLD: ['COLD', 'NEW'],
    WARM: ['WARM', 'CONTACTED'],
    HOT: ['HOT', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION'],
    CONVERTED: ['CONVERTED', 'WON'],
    LOST: ['LOST', 'DISQUALIFIED'],
  };
  const candidate = preferredMap[desired].find((label) => liveLabels.has(label));
  return (candidate || desired) as any;
};

const getSelectedProductsFromCustomFields = (lead: any): any[] => {
  const customFields = lead?.customFields;
  if (!customFields || typeof customFields !== 'object') return [];
  const selectedProducts = (customFields as any).selectedProducts;
  return Array.isArray(selectedProducts) ? selectedProducts : [];
};

const attachSelectedProducts = (lead: any) => ({
  ...lead,
  selectedProducts: getSelectedProductsFromCustomFields(lead),
});

const splitLeadProductPayload = (data: any) => {
  const { productIds, selectedProducts, ...rest } = data || {};
  const customFields =
    rest.customFields && typeof rest.customFields === 'object'
      ? { ...rest.customFields }
      : {};

  if (Array.isArray(selectedProducts)) {
    (customFields as any).selectedProducts = selectedProducts;
  } else if (Array.isArray(productIds)) {
    (customFields as any).productIds = productIds;
  }

  const payload: any = { ...rest };
  if (Object.keys(customFields).length > 0) {
    payload.customFields = customFields;
  }
  return payload;
};

const cleanLeadWriteData = (data: any) => {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(data || {})) {
    if (value === '' || value === null || value === undefined) continue;
    cleaned[key] = value;
  }
  return cleaned;
};

const buildLeadPrismaData = async (data: any, ownerId: string) => {
  const base = cleanLeadWriteData(splitLeadProductPayload(data));
  const payload: any = {
    firstName: String(base.firstName || '').trim(),
    lastName: String(base.lastName || '').trim(),
    email: base.email ? String(base.email).trim() : undefined,
    phone: base.phone ? String(base.phone).trim() : undefined,
    company: base.company ? String(base.company).trim() : undefined,
    jobTitle: base.jobTitle ? String(base.jobTitle).trim() : undefined,
    status: await toLivePersistedLeadStatus(base.status),
    source: base.source || 'OTHER',
    value: Number.isFinite(Number(base.value)) ? Number(base.value) : 0,
    currency: base.currency || 'INR',
    notes: base.notes ? String(base.notes) : undefined,
    tags: Array.isArray(base.tags) ? JSON.stringify(base.tags) : '[]',
    ownerId,
  };

  if (base.country) payload.country = String(base.country);
  if (base.decisionMakerName) payload.decisionMakerName = String(base.decisionMakerName);
  if (base.decisionMakerDesignation) payload.decisionMakerDesignation = String(base.decisionMakerDesignation);
  if (base.whatsappNumber) payload.whatsappNumber = String(base.whatsappNumber);
  if (base.followUpDate) payload.followUpDate = new Date(base.followUpDate);
  if (base.assigneeId) payload.assigneeId = String(base.assigneeId);
  if (base.accountId) payload.accountId = String(base.accountId);
  if (base.customFields && typeof base.customFields === 'object') payload.customFields = base.customFields;

  return payload;
};

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
      leads.map((lead) => attachSelectedProducts({ ...lead, status: coerceLeadStatus(lead.status) })),
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
    sendSuccess(res, attachSelectedProducts({ ...lead, status: coerceLeadStatus(lead.status) }), 'Lead retrieved');
  } catch (error) { next(error); }
};

export const getProductSuggestions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = String(req.query.category || '').trim().toLowerCase();
    const group = String(req.query.group || '').trim().toLowerCase();
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '5'), 10) || 5, 1), 20);

    const rows = await prisma.productConfig.findMany({
      where: {
        isActive: true,
        ...(category ? { category: { equals: category, mode: 'insensitive' } } : {}),
        ...(group ? { groupName: { equals: group, mode: 'insensitive' } } : {}),
      } as any,
      orderBy: [
        { category: 'asc' },
        { groupName: 'asc' },
        { productName: 'asc' },
      ],
      take: limit,
    });

    sendSuccess(
      res,
      rows.map((row) => ({
        id: row.id,
        category: row.category,
        group: row.groupName,
        name: row.productName,
        value: Number(row.value || 0),
        usageCount: 0,
        averageExpectedAmount: Number(row.value || 0),
        lastUsedAt: null,
      })),
      'Product suggestions retrieved',
    );
  } catch (error) { next(error); }
};

export const createLead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data: LeadInput & { assigneeId?: string; accountId?: string } = req.body;
    const ownerId = req.user?.userId || (req.user as any)?.id;
    if (!ownerId) {
      sendError(res, 'Invalid user session', 401);
      return;
    }

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

    const leadPayload = await buildLeadPrismaData(data, ownerId);
    const lead = await prisma.lead.create({
      data: leadPayload as any,
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
        userId: ownerId,
      }),
      prisma.activityLog.create({
        data: {
          action: 'LEAD_CREATED', entity: 'Lead', entityId: lead.id,
          userId: ownerId, details: { name: `${data.firstName} ${data.lastName}` },
        },
      }),
    ]).catch(() => {});

    sendSuccess(res, attachSelectedProducts({ ...lead, status: coerceLeadStatus(lead.status) }), 'Lead created', 201);
  } catch (error) { next(error); }
};

export const updateLead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.lead.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) { sendError(res, 'Lead not found', 404); return; }
    const ownerId = req.user?.userId || (req.user as any)?.id;
    if (!ownerId) {
      sendError(res, 'Invalid user session', 401);
      return;
    }

    const data: Partial<LeadInput> & { assigneeId?: string; accountId?: string } = req.body;
    const leadPayload = await buildLeadPrismaData(data, ownerId);
    const updateData = { ...leadPayload };
    if (data.status === undefined) delete updateData.status;
    if (data.tags === undefined) delete updateData.tags;
    if (data.value === undefined) delete updateData.value;
    if (data.source === undefined) delete updateData.source;
    if (data.currency === undefined) delete updateData.currency;

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
          userId: ownerId,
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
        userId: ownerId,
      }));
    }

    Promise.all(promises).catch(() => {});

    sendSuccess(res, attachSelectedProducts({ ...lead, status: coerceLeadStatus(lead.status) }), 'Lead updated');
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
        status: await toLivePersistedLeadStatus('CONVERTED'),
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
        status: await toLivePersistedLeadStatus('CONVERTED'),
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
