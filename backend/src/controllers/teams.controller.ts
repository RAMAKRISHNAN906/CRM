import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';

export const getTeams = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        manager: { select: { id: true, name: true, email: true, avatar: true } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    sendSuccess(res, teams, 'Teams retrieved');
  } catch (error) { next(error); }
};

export const getTeam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: {
        manager: { select: { id: true, name: true, email: true, avatar: true, role: true } },
        members: { select: { id: true, name: true, email: true, avatar: true, role: true } },
      },
    });
    if (!team) { sendError(res, 'Team not found', 404); return; }
    sendSuccess(res, team, 'Team retrieved');
  } catch (error) { next(error); }
};

export const createTeam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, managerId, memberIds = [] } = req.body;
    const team = await prisma.team.create({
      data: {
        name, description, managerId,
        members: memberIds.length ? { connect: memberIds.map((id: string) => ({ id })) } : undefined,
      },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true } },
      },
    });
    sendSuccess(res, team, 'Team created', 201);
  } catch (error) { next(error); }
};

export const updateTeam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, managerId, memberIds } = req.body;
    const team = await prisma.team.update({
      where: { id: req.params.id },
      data: {
        name, description, managerId,
        ...(memberIds ? { members: { set: memberIds.map((id: string) => ({ id })) } } : {}),
      },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true } },
      },
    });
    sendSuccess(res, team, 'Team updated');
  } catch (error) { next(error); }
};

export const deleteTeam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.team.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 'Team deleted');
  } catch (error) { next(error); }
};
