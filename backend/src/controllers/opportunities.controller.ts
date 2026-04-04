import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';

const include = {
  owner:       { select: { id: true, name: true, avatar: true } },
  assignee:    { select: { id: true, name: true, avatar: true } },
  contact:     { select: { id: true, firstName: true, lastName: true, email: true } },
  account:     { select: { id: true, name: true } },
  competitors: true,
};

// ── List ──────────────────────────────────────────────────────────────────────
export const getOpportunities = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = '1', limit = '50', stage, priority, type, search, assigneeId } = req.query as any;
    const pageNum  = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const where: any = { deletedAt: null };
    if (stage)      where.stage    = stage;
    if (priority)   where.priority = priority;
    if (type)       where.type     = type;
    if (assigneeId) where.assigneeId = assigneeId;
    if (search)     where.title    = { contains: search, mode: 'insensitive' };

    const [opportunities, total] = await Promise.all([
      prisma.opportunity.findMany({
        where, skip: (pageNum - 1) * limitNum, take: limitNum,
        orderBy: { createdAt: 'desc' },
        include,
      }),
      prisma.opportunity.count({ where }),
    ]);

    sendPaginated(res, opportunities, total, pageNum, limitNum, 'Opportunities retrieved');
  } catch (error) { next(error); }
};

// ── Single ────────────────────────────────────────────────────────────────────
export const getOpportunity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const opp = await prisma.opportunity.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include,
    });
    if (!opp) { sendError(res, 'Opportunity not found', 404); return; }
    sendSuccess(res, opp, 'Opportunity retrieved');
  } catch (error) { next(error); }
};

// ── Create ────────────────────────────────────────────────────────────────────
export const createOpportunity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      title, description, stage, type, priority, value, currency,
      probability, closeDate, followUpDate, source, tags, notes,
      country, decisionMakerName, decisionMakerDesignation,
      contactId, accountId, assigneeId,
    } = req.body;

    const opp = await prisma.opportunity.create({
      data: {
        title, description, stage, type,
        priority: priority ?? 'MEDIUM',
        value: value ?? 0,
        currency: currency ?? 'USD',
        probability: probability ?? 10,
        source, notes,
        tags: tags ?? [],
        closeDate:   closeDate   ? new Date(closeDate)   : undefined,
        followUpDate: followUpDate ? new Date(followUpDate) : undefined,
        country, decisionMakerName, decisionMakerDesignation,
        ownerId:    req.user!.userId,
        assigneeId: assigneeId || undefined,
        contactId:  contactId  || undefined,
        accountId:  accountId  || undefined,
      },
      include,
    });
    sendSuccess(res, opp, 'Opportunity created', 201);
  } catch (error) { next(error); }
};

// ── Update ────────────────────────────────────────────────────────────────────
export const updateOpportunity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      title, description, stage, type, priority, value, currency,
      probability, closeDate, followUpDate, source, tags, notes, lostReason,
      country, decisionMakerName, decisionMakerDesignation,
      contactId, accountId, assigneeId,
    } = req.body;

    const opp = await prisma.opportunity.update({
      where: { id: req.params.id },
      data: {
        title, description, stage, type, priority, value, currency,
        probability, source, notes, lostReason,
        tags: tags ?? undefined,
        closeDate:    closeDate    ? new Date(closeDate)    : null,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        country, decisionMakerName, decisionMakerDesignation,
        assigneeId: assigneeId || null,
        contactId:  contactId  || null,
        accountId:  accountId  || null,
      },
      include,
    });
    sendSuccess(res, opp, 'Opportunity updated');
  } catch (error) { next(error); }
};

// ── Stage change ──────────────────────────────────────────────────────────────
export const changeStage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { stage, lostReason } = req.body;
    const opp = await prisma.opportunity.update({
      where: { id: req.params.id },
      data: { stage, lostReason: lostReason || null },
      include,
    });
    sendSuccess(res, opp, 'Stage updated');
  } catch (error) { next(error); }
};

// ── Delete (soft) ─────────────────────────────────────────────────────────────
export const deleteOpportunity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.opportunity.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    sendSuccess(res, null, 'Opportunity deleted');
  } catch (error) { next(error); }
};

// ── Stats ─────────────────────────────────────────────────────────────────────
export const getOpportunityStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const base = { deletedAt: null };

    const [total, byStage, won, lost, valueAgg, wonValue] = await Promise.all([
      prisma.opportunity.count({ where: base }),
      prisma.opportunity.groupBy({ by: ['stage'], where: base, _count: true, _sum: { value: true } }),
      prisma.opportunity.count({ where: { ...base, stage: 'CLOSED_WON' } }),
      prisma.opportunity.count({ where: { ...base, stage: 'CLOSED_LOST' } }),
      prisma.opportunity.aggregate({ where: base, _sum: { value: true }, _avg: { value: true, probability: true } }),
      prisma.opportunity.aggregate({ where: { ...base, stage: 'CLOSED_WON' }, _sum: { value: true } }),
    ]);

    const closed = won + lost;
    const winRate = closed > 0 ? Math.round((won / closed) * 100) : 0;

    sendSuccess(res, {
      total,
      byStage,
      won,
      lost,
      winRate,
      totalPipelineValue: valueAgg._sum.value ?? 0,
      avgDealSize:        valueAgg._avg.value ?? 0,
      avgProbability:     Math.round(valueAgg._avg.probability ?? 0),
      wonValue:           wonValue._sum.value ?? 0,
    }, 'Stats retrieved');
  } catch (error) { next(error); }
};

// ── Kanban board ──────────────────────────────────────────────────────────────
export const getKanbanBoard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stages = [
      'PROSPECTING','QUALIFICATION','NEEDS_ANALYSIS','VALUE_PROPOSITION',
      'DECISION_MAKERS','PROPOSAL','NEGOTIATION','CLOSED_WON','CLOSED_LOST',
    ];

    const opportunities = await prisma.opportunity.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      include,
    });

    const board = stages.map((stage) => ({
      stage,
      opportunities: opportunities.filter((o) => o.stage === stage),
      totalValue: opportunities
        .filter((o) => o.stage === stage)
        .reduce((sum, o) => sum + o.value, 0),
    }));

    sendSuccess(res, board, 'Kanban board retrieved');
  } catch (error) { next(error); }
};
