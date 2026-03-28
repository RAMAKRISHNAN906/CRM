import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { DealInput } from '../utils/validation';

export const getDeals = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = '1', limit = '20', search, sortBy = 'createdAt', sortOrder = 'desc', stage } = req.query as any;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { userId: req.user!.userId };
    if (search) where.title = { contains: search, mode: 'insensitive' };
    if (stage) where.stage = stage;

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where, skip, take: limitNum, orderBy: { [sortBy]: sortOrder },
        include: { contact: { select: { id: true, firstName: true, lastName: true, company: true } } },
      }),
      prisma.deal.count({ where }),
    ]);

    sendPaginated(res, deals, total, pageNum, limitNum, 'Deals retrieved');
  } catch (error) { next(error); }
};

export const getDeal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deal = await prisma.deal.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
      include: { contact: true },
    });
    if (!deal) { sendError(res, 'Deal not found', 404); return; }
    sendSuccess(res, deal, 'Deal retrieved');
  } catch (error) { next(error); }
};

export const createDeal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { expectedClose, contactId, tags, ...rest }: DealInput = req.body;
    const deal = await prisma.deal.create({
      data: {
        ...rest,
        tags: tags ? JSON.stringify(tags) : '[]',
        userId: req.user!.userId,
        ...(expectedClose && { expectedClose: new Date(expectedClose) }),
        ...(contactId && { contactId }),
      } as any,
      include: { contact: { select: { id: true, firstName: true, lastName: true } } },
    });
    await prisma.activityLog.create({
      data: { action: 'DEAL_CREATED', entity: 'Deal', entityId: deal.id, userId: req.user!.userId, details: { title: rest.title, value: rest.value } },
    });
    sendSuccess(res, deal, 'Deal created', 201);
  } catch (error) { next(error); }
};

export const updateDeal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.deal.findFirst({ where: { id: req.params.id, userId: req.user!.userId } });
    if (!existing) { sendError(res, 'Deal not found', 404); return; }
    const { expectedClose, contactId, tags, ...rest }: Partial<DealInput> = req.body;
    const deal = await prisma.deal.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(tags && { tags: JSON.stringify(tags) }),
        ...(expectedClose && { expectedClose: new Date(expectedClose) }),
        ...(contactId !== undefined && { contactId: contactId || null }),
      } as any,
      include: { contact: { select: { id: true, firstName: true, lastName: true } } },
    });
    sendSuccess(res, deal, 'Deal updated');
  } catch (error) { next(error); }
};

export const deleteDeal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.deal.findFirst({ where: { id: req.params.id, userId: req.user!.userId } });
    if (!existing) { sendError(res, 'Deal not found', 404); return; }
    await prisma.deal.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 'Deal deleted');
  } catch (error) { next(error); }
};

export const getPipeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stages = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
    const pipeline = await Promise.all(
      stages.map(async (stage) => {
        const deals = await prisma.deal.findMany({
          where: { userId: req.user!.userId, stage: stage as any },
          include: { contact: { select: { firstName: true, lastName: true, company: true } } },
          orderBy: { createdAt: 'desc' },
        });
        const totalValue = deals.reduce((sum, d) => sum + d.value, 0);
        return { stage, deals, count: deals.length, totalValue };
      })
    );
    sendSuccess(res, pipeline, 'Pipeline retrieved');
  } catch (error) { next(error); }
};
