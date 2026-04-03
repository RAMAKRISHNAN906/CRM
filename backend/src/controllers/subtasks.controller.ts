import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { z } from 'zod';

const subTaskSchema = z.object({
  title: z.string().min(1),
  isCompleted: z.boolean().default(false),
  order: z.number().int().default(0),
});

// GET /tasks/:taskId/subtasks
export const getSubTasks = async (req: Request, res: Response) => {
  try {
    const subTasks = await prisma.subTask.findMany({
      where: { taskId: req.params.taskId },
      orderBy: { order: 'asc' },
    });
    res.json({ data: subTasks });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// POST /tasks/:taskId/subtasks
export const createSubTask = async (req: Request, res: Response) => {
  try {
    const body = subTaskSchema.parse(req.body);
    const subTask = await prisma.subTask.create({
      data: { ...body, taskId: req.params.taskId },
    });
    await recalcProgress(req.params.taskId);
    res.status(201).json({ data: subTask });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// PUT /tasks/:taskId/subtasks/:id
export const updateSubTask = async (req: Request, res: Response) => {
  try {
    const body = subTaskSchema.partial().parse(req.body);
    const subTask = await prisma.subTask.update({
      where: { id: req.params.id },
      data: body,
    });
    await recalcProgress(req.params.taskId);
    res.json({ data: subTask });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE /tasks/:taskId/subtasks/:id
export const deleteSubTask = async (req: Request, res: Response) => {
  try {
    await prisma.subTask.delete({ where: { id: req.params.id } });
    await recalcProgress(req.params.taskId);
    res.json({ data: { success: true } });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// Recompute completionPct on Task whenever subtasks change
async function recalcProgress(taskId: string): Promise<void> {
  const all = await prisma.subTask.findMany({ where: { taskId } });
  if (!all.length) return;
  const done = all.filter((s) => s.isCompleted).length;
  const pct = Math.round((done / all.length) * 100);
  await prisma.task.update({
    where: { id: taskId },
    data: { completionPct: pct },
  });
}
