import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';

export const getCountryTargets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const targets = await prisma.countryTarget.findMany({ orderBy: { country: 'asc' } });
    sendSuccess(res, targets, 'Country targets retrieved');
  } catch (error) { next(error); }
};

export const createCountryTarget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { country, countryCode, region, targetRevenue, targetDeals, priority, notes, isActive } = req.body;
    if (!country) { sendError(res, 'Country name is required', 400); return; }
    const existing = await prisma.countryTarget.findUnique({ where: { country } });
    if (existing) { sendError(res, 'Country already exists', 409); return; }
    const target = await prisma.countryTarget.create({
      data: { country, countryCode, region, targetRevenue: targetRevenue ?? 0, targetDeals: targetDeals ?? 0, priority: priority ?? 'MEDIUM', notes, isActive: isActive ?? true },
    });
    sendSuccess(res, target, 'Country target created', 201);
  } catch (error) { next(error); }
};

export const updateCountryTarget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { country, countryCode, region, targetRevenue, targetDeals, priority, notes, isActive } = req.body;
    const target = await prisma.countryTarget.update({
      where: { id: req.params.id },
      data: { country, countryCode, region, targetRevenue, targetDeals, priority, notes, isActive },
    });
    sendSuccess(res, target, 'Country target updated');
  } catch (error) { next(error); }
};

export const deleteCountryTarget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.countryTarget.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 'Country target deleted');
  } catch (error) { next(error); }
};
