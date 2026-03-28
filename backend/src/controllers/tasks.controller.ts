import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { TaskInput } from '../utils/validation';

export const getTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = '1', limit = '20', search, sortBy = 'createdAt', sortOrder = 'desc', status, priority } = req.query as any;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { userId: req.user!.userId };
    if (search) where.title = { contains: search, mode: 'insensitive' };
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({ where, skip, take: limitNum, orderBy: { [sortBy]: sortOrder } }),
      prisma.task.count({ where }),
    ]);

    sendPaginated(res, tasks, total, pageNum, limitNum, 'Tasks retrieved');
  } catch (error) { next(error); }
};

export const getTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const task = await prisma.task.findFirst({ where: { id: req.params.id, userId: req.user!.userId } });
    if (!task) { sendError(res, 'Task not found', 404); return; }
    sendSuccess(res, task, 'Task retrieved');
  } catch (error) { next(error); }
};

export const createTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dueDate, tags, ...rest }: TaskInput = req.body;
    const task = await prisma.task.create({
      data: {
        ...rest,
        tags: tags ? JSON.stringify(tags) : '[]',
        userId: req.user!.userId,
        ...(dueDate && { dueDate: new Date(dueDate) }),
      } as any,
    });
    await prisma.activityLog.create({
      data: { action: 'TASK_CREATED', entity: 'Task', entityId: task.id, userId: req.user!.userId, details: { title: rest.title } },
    });
    sendSuccess(res, task, 'Task created', 201);
  } catch (error) { next(error); }
};

export const updateTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.task.findFirst({ where: { id: req.params.id, userId: req.user!.userId } });
    if (!existing) { sendError(res, 'Task not found', 404); return; }
    const { dueDate, tags, ...rest }: Partial<TaskInput> = req.body;
    const completedAt = rest.status === 'COMPLETED' && existing.status !== 'COMPLETED' ? new Date() : undefined;
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(tags && { tags: JSON.stringify(tags) }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(completedAt && { completedAt }),
      } as any,
    });
    sendSuccess(res, task, 'Task updated');
  } catch (error) { next(error); }
};

export const deleteTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.task.findFirst({ where: { id: req.params.id, userId: req.user!.userId } });
    if (!existing) { sendError(res, 'Task not found', 404); return; }
    await prisma.task.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 'Task deleted');
  } catch (error) { next(error); }
};
