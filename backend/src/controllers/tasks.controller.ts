import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { TaskInput } from '../utils/validation';

export const getTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      page = '1', limit = '20', search,
      sortBy = 'createdAt', sortOrder = 'desc',
      status, priority, assigneeId,
    } = req.query as any;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { deletedAt: null };

    if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(req.user!.role)) {
      where.OR = [{ ownerId: req.user!.userId }, { assigneeId: req.user!.userId }];
    }

    if (search) where.title = { contains: search, mode: 'insensitive' };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where, skip, take: limitNum, orderBy: { [sortBy]: sortOrder },
        include: {
          owner: { select: { id: true, name: true, avatar: true } },
          assignee: { select: { id: true, name: true, avatar: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

    sendPaginated(res, tasks, total, pageNum, limitNum, 'Tasks retrieved');
  } catch (error) { next(error); }
};

export const getTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
      },
    });
    if (!task) { sendError(res, 'Task not found', 404); return; }
    sendSuccess(res, task, 'Task retrieved');
  } catch (error) { next(error); }
};

export const createTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dueDate, tags, assigneeId, leadId, contactId, dealId, ...rest }: TaskInput & {
      assigneeId?: string; leadId?: string; contactId?: string; dealId?: string;
    } = req.body;
    const task = await prisma.task.create({
      data: {
        ...rest,
        tags: tags ? JSON.stringify(tags) : '[]',
        ownerId: req.user!.userId,
        assigneeId,
        leadId, contactId, dealId,
        ...(dueDate && { dueDate: new Date(dueDate) }),
      } as any,
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Notify assignee
    if (assigneeId && assigneeId !== req.user!.userId) {
      await prisma.notification.create({
        data: {
          type: 'TASK_DUE',
          title: 'Task assigned to you',
          body: task.title,
          link: `/tasks`,
          userId: assigneeId,
        },
      });
    }

    await prisma.activityLog.create({
      data: { action: 'TASK_CREATED', entity: 'Task', entityId: task.id, userId: req.user!.userId, details: { title: rest.title } },
    });
    sendSuccess(res, task, 'Task created', 201);
  } catch (error) { next(error); }
};

export const updateTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.task.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) { sendError(res, 'Task not found', 404); return; }
    const { dueDate, tags, ...rest }: Partial<TaskInput> & { assigneeId?: string } = req.body;
    const completedAt = rest.status === 'COMPLETED' && existing.status !== 'COMPLETED' ? new Date() : undefined;
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(tags && { tags: JSON.stringify(tags) }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(completedAt && { completedAt }),
      } as any,
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
      },
    });
    sendSuccess(res, task, 'Task updated');
  } catch (error) { next(error); }
};

export const deleteTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.task.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) { sendError(res, 'Task not found', 404); return; }
    await prisma.task.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    sendSuccess(res, null, 'Task deleted');
  } catch (error) { next(error); }
};
