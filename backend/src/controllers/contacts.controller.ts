import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { ContactInput } from '../utils/validation';

export const getContacts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = '1', limit = '20', search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query as any;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { deletedAt: null };

    if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(req.user!.role)) {
      where.ownerId = req.user!.userId;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where, skip, take: limitNum, orderBy: { [sortBy]: sortOrder },
        include: {
          account: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true, avatar: true } },
        },
      }),
      prisma.contact.count({ where }),
    ]);

    sendPaginated(res, contacts, total, pageNum, limitNum, 'Contacts retrieved');
  } catch (error) { next(error); }
};

export const getContact = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const contact = await prisma.contact.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        deals: { where: { deletedAt: null }, select: { id: true, title: true, value: true, stage: true } },
        account: true,
        owner: { select: { id: true, name: true, avatar: true } },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
        tickets: { where: { deletedAt: null }, select: { id: true, subject: true, status: true, priority: true } },
      },
    });
    if (!contact) { sendError(res, 'Contact not found', 404); return; }
    sendSuccess(res, contact, 'Contact retrieved');
  } catch (error) { next(error); }
};

export const createContact = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data: ContactInput & { accountId?: string } = req.body;
    const contact = await prisma.contact.create({
      data: {
        ...data,
        tags: data.tags ? JSON.stringify(data.tags) : '[]',
        ownerId: req.user!.userId,
      } as any,
    });
    await prisma.activityLog.create({
      data: {
        action: 'CONTACT_CREATED', entity: 'Contact', entityId: contact.id,
        userId: req.user!.userId, details: { name: `${data.firstName} ${data.lastName}` },
      },
    });
    sendSuccess(res, contact, 'Contact created', 201);
  } catch (error) { next(error); }
};

export const updateContact = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.contact.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) { sendError(res, 'Contact not found', 404); return; }
    const data: Partial<ContactInput> & { accountId?: string } = req.body;
    const contact = await prisma.contact.update({
      where: { id: req.params.id },
      data: { ...data, tags: data.tags ? JSON.stringify(data.tags) : undefined } as any,
    });
    sendSuccess(res, contact, 'Contact updated');
  } catch (error) { next(error); }
};

export const deleteContact = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.contact.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) { sendError(res, 'Contact not found', 404); return; }
    // Soft delete
    await prisma.contact.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    sendSuccess(res, null, 'Contact deleted');
  } catch (error) { next(error); }
};
