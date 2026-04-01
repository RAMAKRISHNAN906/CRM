import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';

export const getAccounts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = '1', limit = '20', search, sortBy = 'createdAt', sortOrder = 'desc', industry } = req.query as any;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { domain: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (industry) where.industry = industry;

    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: { select: { contacts: true, deals: true, leads: true } },
        },
      }),
      prisma.account.count({ where }),
    ]);

    sendPaginated(res, accounts, total, pageNum, limitNum, 'Accounts retrieved');
  } catch (error) { next(error); }
};

export const getAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const account = await prisma.account.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        contacts: { where: { deletedAt: null }, take: 10, orderBy: { createdAt: 'desc' } },
        deals: { where: { deletedAt: null }, take: 10, orderBy: { createdAt: 'desc' } },
        leads: { where: { deletedAt: null }, take: 10, orderBy: { createdAt: 'desc' } },
        _count: { select: { contacts: true, deals: true, leads: true } },
      },
    });
    if (!account) { sendError(res, 'Account not found', 404); return; }
    sendSuccess(res, account, 'Account retrieved');
  } catch (error) { next(error); }
};

export const createAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const account = await prisma.account.create({ data: req.body });
    await prisma.activityLog.create({
      data: {
        action: 'ACCOUNT_CREATED', entity: 'Account', entityId: account.id,
        userId: req.user!.userId, details: { name: account.name },
      },
    });
    sendSuccess(res, account, 'Account created', 201);
  } catch (error) { next(error); }
};

export const updateAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.account.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) { sendError(res, 'Account not found', 404); return; }
    const account = await prisma.account.update({ where: { id: req.params.id }, data: req.body });
    await prisma.activityLog.create({
      data: {
        action: 'ACCOUNT_UPDATED', entity: 'Account', entityId: account.id,
        userId: req.user!.userId, details: { changes: req.body },
      },
    });
    sendSuccess(res, account, 'Account updated');
  } catch (error) { next(error); }
};

export const deleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.account.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) { sendError(res, 'Account not found', 404); return; }
    await prisma.account.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    await prisma.activityLog.create({
      data: {
        action: 'ACCOUNT_DELETED', entity: 'Account', entityId: req.params.id,
        userId: req.user!.userId, details: {},
      },
    });
    sendSuccess(res, null, 'Account deleted');
  } catch (error) { next(error); }
};
