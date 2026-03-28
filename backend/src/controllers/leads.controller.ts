import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { LeadInput } from '../utils/validation';

export const getLeads = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = '1', limit = '20', search, sortBy = 'createdAt', sortOrder = 'desc', status } = req.query as any;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { userId: req.user!.userId };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({ where, skip, take: limitNum, orderBy: { [sortBy]: sortOrder } }),
      prisma.lead.count({ where }),
    ]);

    sendPaginated(res, leads, total, pageNum, limitNum, 'Leads retrieved');
  } catch (error) { next(error); }
};

export const getLead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const lead = await prisma.lead.findFirst({ where: { id: req.params.id, userId: req.user!.userId } });
    if (!lead) { sendError(res, 'Lead not found', 404); return; }
    sendSuccess(res, lead, 'Lead retrieved');
  } catch (error) { next(error); }
};

export const createLead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data: LeadInput = req.body;
    const lead = await prisma.lead.create({
      data: { ...data, tags: data.tags ? JSON.stringify(data.tags) : '[]', userId: req.user!.userId } as any,
    });
    await prisma.activityLog.create({
      data: { action: 'LEAD_CREATED', entity: 'Lead', entityId: lead.id, userId: req.user!.userId, details: { name: `${data.firstName} ${data.lastName}` } },
    });
    sendSuccess(res, lead, 'Lead created', 201);
  } catch (error) { next(error); }
};

export const updateLead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.lead.findFirst({ where: { id: req.params.id, userId: req.user!.userId } });
    if (!existing) { sendError(res, 'Lead not found', 404); return; }
    const data: Partial<LeadInput> = req.body;
    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: { ...data, tags: data.tags ? JSON.stringify(data.tags) : undefined } as any,
    });
    await prisma.activityLog.create({
      data: { action: 'LEAD_UPDATED', entity: 'Lead', entityId: lead.id, userId: req.user!.userId, details: { changes: data } },
    });
    sendSuccess(res, lead, 'Lead updated');
  } catch (error) { next(error); }
};

export const deleteLead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.lead.findFirst({ where: { id: req.params.id, userId: req.user!.userId } });
    if (!existing) { sendError(res, 'Lead not found', 404); return; }
    await prisma.lead.delete({ where: { id: req.params.id } });
    await prisma.activityLog.create({
      data: { action: 'LEAD_DELETED', entity: 'Lead', entityId: req.params.id, userId: req.user!.userId, details: {} },
    });
    sendSuccess(res, null, 'Lead deleted');
  } catch (error) { next(error); }
};
