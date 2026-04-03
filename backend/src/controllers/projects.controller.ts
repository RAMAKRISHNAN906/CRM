import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';

const projectInclude = {
  createdBy: { select: { id: true, name: true, avatar: true } },
  members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
  _count: { select: { tasks: true, members: true } },
};

// ── Projects CRUD ────────────────────────────────────────────────────────────

export const getProjects = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = '1', limit = '20', status, priority, search } = req.query as any;
    const pageNum  = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const where: any = { deletedAt: null };
    if (status)   where.status   = status;
    if (priority) where.priority = priority;
    if (search)   where.name     = { contains: search, mode: 'insensitive' };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where, skip: (pageNum - 1) * limitNum, take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: projectInclude,
      }),
      prisma.project.count({ where }),
    ]);

    sendPaginated(res, projects, total, pageNum, limitNum, 'Projects retrieved');
  } catch (error) { next(error); }
};

export const getProject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        ...projectInclude,
        tasks: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          include: { assignee: { select: { id: true, name: true, avatar: true } } },
        },
      },
    });
    if (!project) { sendError(res, 'Project not found', 404); return; }
    sendSuccess(res, project, 'Project retrieved');
  } catch (error) { next(error); }
};

export const createProject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, status, priority, startDate, endDate, budget, tags, memberIds } = req.body;
    const project = await prisma.project.create({
      data: {
        name, description, status, priority, budget,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate:   endDate   ? new Date(endDate)   : undefined,
        tags:      tags ?? [],
        createdById: req.user!.userId,
        members: memberIds?.length
          ? { create: memberIds.map((uid: string) => ({ userId: uid, role: 'member' })) }
          : undefined,
      },
      include: projectInclude,
    });
    sendSuccess(res, project, 'Project created', 201);
  } catch (error) { next(error); }
};

export const updateProject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, status, priority, startDate, endDate, budget, tags } = req.body;
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        name, description, status, priority, budget, tags,
        startDate: startDate ? new Date(startDate) : null,
        endDate:   endDate   ? new Date(endDate)   : null,
      },
      include: projectInclude,
    });
    sendSuccess(res, project, 'Project updated');
  } catch (error) { next(error); }
};

export const deleteProject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.project.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    sendSuccess(res, null, 'Project deleted');
  } catch (error) { next(error); }
};

// ── Members ──────────────────────────────────────────────────────────────────

export const addMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, role = 'member' } = req.body;
    const member = await prisma.projectMember.create({
      data: { projectId: req.params.id, userId, role },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
    sendSuccess(res, member, 'Member added', 201);
  } catch (error) { next(error); }
};

export const removeMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.projectMember.deleteMany({ where: { projectId: req.params.id, userId: req.params.userId } });
    sendSuccess(res, null, 'Member removed');
  } catch (error) { next(error); }
};

// ── Tasks ────────────────────────────────────────────────────────────────────

export const getProjectTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tasks = await prisma.projectTask.findMany({
      where: { projectId: req.params.id },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: { assignee: { select: { id: true, name: true, avatar: true } } },
    });
    sendSuccess(res, tasks, 'Tasks retrieved');
  } catch (error) { next(error); }
};

export const createProjectTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, description, status, priority, dueDate, assigneeId } = req.body;
    const count = await prisma.projectTask.count({ where: { projectId: req.params.id } });
    const task = await prisma.projectTask.create({
      data: {
        title, description, status, priority,
        assigneeId: assigneeId || undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        order: count,
        projectId: req.params.id,
      },
      include: { assignee: { select: { id: true, name: true, avatar: true } } },
    });
    sendSuccess(res, task, 'Task created', 201);
  } catch (error) { next(error); }
};

export const updateProjectTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, description, status, priority, dueDate, assigneeId, order } = req.body;
    const task = await prisma.projectTask.update({
      where: { id: req.params.taskId },
      data: {
        title, description, status, priority, order,
        assigneeId:  assigneeId || null,
        dueDate:     dueDate ? new Date(dueDate) : null,
        completedAt: status === 'DONE' ? new Date() : null,
      },
      include: { assignee: { select: { id: true, name: true, avatar: true } } },
    });
    sendSuccess(res, task, 'Task updated');
  } catch (error) { next(error); }
};

export const deleteProjectTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.projectTask.delete({ where: { id: req.params.taskId } });
    sendSuccess(res, null, 'Task deleted');
  } catch (error) { next(error); }
};

// ── Stats ────────────────────────────────────────────────────────────────────

export const getProjectStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [total, byStatus, activeTasks] = await Promise.all([
      prisma.project.count({ where: { deletedAt: null } }),
      prisma.project.groupBy({ by: ['status'], where: { deletedAt: null }, _count: true }),
      prisma.projectTask.count({ where: { status: { not: 'DONE' }, project: { deletedAt: null } } }),
    ]);
    sendSuccess(res, { total, byStatus, activeTasks }, 'Stats retrieved');
  } catch (error) { next(error); }
};
