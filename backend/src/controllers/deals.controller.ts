import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { DealInput } from '../utils/validation';
import { runAutomation } from '../services/automation.service';

export const getDeals = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      page = '1', limit = '20', search,
      sortBy = 'createdAt', sortOrder = 'desc',
      stage, assigneeId, contactId, accountId,
    } = req.query as any;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { deletedAt: null };

    if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(req.user!.role)) {
      where.OR = [{ ownerId: req.user!.userId }, { assigneeId: req.user!.userId }];
    }

    if (search) where.title = { contains: search, mode: 'insensitive' };
    if (stage) where.stage = stage;
    if (assigneeId) where.assigneeId = assigneeId;
    if (contactId) where.contactId = contactId;
    if (accountId) where.accountId = accountId;

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where, skip, take: limitNum, orderBy: { [sortBy]: sortOrder },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, company: true } },
          owner: { select: { id: true, name: true, avatar: true } },
          assignee: { select: { id: true, name: true, avatar: true } },
          account: { select: { id: true, name: true } },
        },
      }),
      prisma.deal.count({ where }),
    ]);

    sendPaginated(res, deals, total, pageNum, limitNum, 'Deals retrieved');
  } catch (error) { next(error); }
};

export const getDeal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deal = await prisma.deal.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        contact: true,
        owner: { select: { id: true, name: true, avatar: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
        account: true,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
        tasks: { where: { deletedAt: null }, orderBy: { dueDate: 'asc' } },
        documents: { where: { deletedAt: null } },
        stageHistory: { orderBy: { changedAt: 'asc' } },
      },
    });
    if (!deal) { sendError(res, 'Deal not found', 404); return; }
    sendSuccess(res, deal, 'Deal retrieved');
  } catch (error) { next(error); }
};

export const createDeal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { expectedClose, contactId, accountId, assigneeId, tags, ...rest }: DealInput & { accountId?: string; assigneeId?: string } = req.body;
    const deal = await prisma.deal.create({
      data: {
        ...rest,
        tags: tags ? JSON.stringify(tags) : '[]',
        ownerId: req.user!.userId,
        assigneeId,
        accountId,
        ...(expectedClose && { expectedClose: new Date(expectedClose) }),
        ...(contactId && { contactId }),
        stageHistory: { create: { toStage: rest.stage || 'PROSPECTING', changedById: req.user!.userId } },
      } as any,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        owner: { select: { id: true, name: true, avatar: true } },
      },
    });

    Promise.all([
      prisma.activityLog.create({
        data: { action: 'DEAL_CREATED', entity: 'Deal', entityId: deal.id, userId: req.user!.userId, details: { title: rest.title, value: rest.value } },
      }),
      runAutomation({
        trigger: 'DEAL_CREATED',
        entityId: deal.id,
        entityType: 'Deal',
        data: { ...deal },
        userId: req.user!.userId,
      }),
    ]).catch(() => {});

    sendSuccess(res, deal, 'Deal created', 201);
  } catch (error) { next(error); }
};

export const updateDeal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.deal.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) { sendError(res, 'Deal not found', 404); return; }

    const { expectedClose, contactId, accountId, assigneeId, tags, ...rest }: Partial<DealInput> & { accountId?: string; assigneeId?: string } = req.body;
    const deal = await prisma.deal.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(tags && { tags: JSON.stringify(tags) }),
        ...(expectedClose && { expectedClose: new Date(expectedClose) }),
        ...(contactId !== undefined && { contactId: contactId || null }),
        ...(accountId !== undefined && { accountId: accountId || null }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
        ...(rest.stage && rest.stage !== existing.stage && {
          actualClose: ['CLOSED_WON', 'CLOSED_LOST'].includes(rest.stage) ? new Date() : undefined,
          stageHistory: {
            create: { fromStage: existing.stage, toStage: rest.stage as any, changedById: req.user!.userId },
          },
        }),
      } as any,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        owner: { select: { id: true, name: true, avatar: true } },
      },
    });

    if (rest.stage && rest.stage !== existing.stage) {
      runAutomation({
        trigger: 'DEAL_STAGE_CHANGED',
        entityId: deal.id,
        entityType: 'Deal',
        data: { ...deal, previousStage: existing.stage, newStage: rest.stage },
        userId: req.user!.userId,
      }).catch(() => {});
    }

    sendSuccess(res, deal, 'Deal updated');
  } catch (error) { next(error); }
};

export const deleteDeal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.deal.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) { sendError(res, 'Deal not found', 404); return; }
    // Soft delete
    await prisma.deal.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    sendSuccess(res, null, 'Deal deleted');
  } catch (error) { next(error); }
};

export const getPipeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stages = ['PROSPECTING', 'QUALIFICATION', 'NEEDS_ANALYSIS', 'VALUE_PROPOSITION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];

    const where: any = { deletedAt: null };
    if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(req.user!.role)) {
      where.OR = [{ ownerId: req.user!.userId }, { assigneeId: req.user!.userId }];
    }

    const pipeline = await Promise.all(
      stages.map(async (stage) => {
        const deals = await prisma.deal.findMany({
          where: { ...where, stage: stage as any },
          include: {
            contact: { select: { firstName: true, lastName: true, company: true } },
            owner: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
        const totalValue = deals.reduce((sum, d) => sum + d.value, 0);
        return { stage, deals, count: deals.length, totalValue };
      })
    );
    sendSuccess(res, pipeline, 'Pipeline retrieved');
  } catch (error) { next(error); }
};

export const getForecasting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deals = await prisma.deal.findMany({
      where: {
        deletedAt: null,
        stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
      },
      select: { id: true, title: true, value: true, stage: true, probability: true, expectedClose: true, currency: true },
    });

    const totalPipeline = deals.reduce((sum, d) => sum + d.value, 0);
    const weightedForecast = deals.reduce((sum, d) => sum + (d.value * d.probability / 100), 0);

    // Group by month
    const byMonth: Record<string, { count: number; value: number; weighted: number }> = {};
    for (const deal of deals) {
      if (!deal.expectedClose) continue;
      const key = deal.expectedClose.toISOString().slice(0, 7);
      if (!byMonth[key]) byMonth[key] = { count: 0, value: 0, weighted: 0 };
      byMonth[key].count++;
      byMonth[key].value += deal.value;
      byMonth[key].weighted += deal.value * deal.probability / 100;
    }

    sendSuccess(res, { totalPipeline, weightedForecast, byMonth, deals }, 'Forecast retrieved');
  } catch (error) { next(error); }
};
