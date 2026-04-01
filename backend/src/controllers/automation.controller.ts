import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';

export const getWorkflows = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workflows = await prisma.workflow.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { logs: true } } },
    });
    sendSuccess(res, workflows, 'Workflows retrieved');
  } catch (error) { next(error); }
};

export const getWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workflow = await prisma.workflow.findUnique({
      where: { id: req.params.id },
      include: {
        logs: {
          orderBy: { executedAt: 'desc' },
          take: 20,
          include: { triggeredBy: { select: { id: true, name: true } } },
        },
      },
    });
    if (!workflow) { sendError(res, 'Workflow not found', 404); return; }
    sendSuccess(res, workflow, 'Workflow retrieved');
  } catch (error) { next(error); }
};

export const createWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, trigger, conditions, actions } = req.body;
    const workflow = await prisma.workflow.create({
      data: { name, description, trigger, conditions: conditions || [], actions: actions || [] },
    });
    sendSuccess(res, workflow, 'Workflow created', 201);
  } catch (error) { next(error); }
};

export const updateWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workflow = await prisma.workflow.update({
      where: { id: req.params.id },
      data: req.body,
    });
    sendSuccess(res, workflow, 'Workflow updated');
  } catch (error) { next(error); }
};

export const toggleWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.workflow.findUnique({ where: { id: req.params.id } });
    if (!existing) { sendError(res, 'Workflow not found', 404); return; }
    const workflow = await prisma.workflow.update({
      where: { id: req.params.id },
      data: { isActive: !existing.isActive },
    });
    sendSuccess(res, workflow, `Workflow ${workflow.isActive ? 'activated' : 'deactivated'}`);
  } catch (error) { next(error); }
};

export const deleteWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.workflow.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 'Workflow deleted');
  } catch (error) { next(error); }
};

export const getWorkflowLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = '1', limit = '20' } = req.query as any;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const logs = await prisma.automationLog.findMany({
      where: { workflowId: req.params.id },
      orderBy: { executedAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });
    const total = await prisma.automationLog.count({ where: { workflowId: req.params.id } });
    sendSuccess(res, { logs, total, page: pageNum, limit: limitNum }, 'Logs retrieved');
  } catch (error) { next(error); }
};
