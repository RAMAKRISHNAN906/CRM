import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess } from '../utils/response';
import { formatLeadStatusLabel, LEAD_STATUS_FLOW_ORDER, coerceLeadStatus } from '../utils/leadStatus';

// Helper: date range filter
const dateRange = (from?: string, to?: string) => {
  const filter: any = {};
  if (from) filter.gte = new Date(from);
  if (to) filter.lte = new Date(to);
  return Object.keys(filter).length ? filter : undefined;
};

export const getSalesFunnel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { from, to } = req.query as any;
    const createdAt = dateRange(from, to);

    const [leadsByStatus, dealsByStage] = await Promise.all([
      prisma.lead.groupBy({
        by: ['status'],
        _count: { status: true },
        where: { deletedAt: null, ...(createdAt ? { createdAt } : {}) },
      }),
      prisma.deal.groupBy({
        by: ['stage'],
        _count: { stage: true },
        _sum: { value: true },
        where: { deletedAt: null, ...(createdAt ? { createdAt } : {}) },
      }),
    ]);

    sendSuccess(res, {
      leadsByStatus: leadsByStatus
        .map((entry: any) => ({
          ...entry,
          status: coerceLeadStatus(entry.status),
          label: formatLeadStatusLabel(entry.status),
          flowOrder: LEAD_STATUS_FLOW_ORDER[coerceLeadStatus(entry.status)],
        }))
        .sort((left, right) => left.flowOrder - right.flowOrder),
      dealsByStage,
    }, 'Sales funnel data retrieved');
  } catch (error) { next(error); }
};

export const getRevenueAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { from, to, groupBy = 'month' } = req.query as any;

    // Monthly revenue from closed won deals
    const deals = await prisma.deal.findMany({
      where: {
        stage: 'CLOSED_WON',
        deletedAt: null,
        actualClose: dateRange(from, to) || { not: null },
      },
      select: { value: true, currency: true, actualClose: true },
      orderBy: { actualClose: 'asc' },
    });

    // Group by month
    const revenueByPeriod: Record<string, number> = {};
    for (const deal of deals) {
      if (!deal.actualClose) continue;
      const d = new Date(deal.actualClose);
      const key = groupBy === 'month'
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        : `${d.getFullYear()}-W${Math.ceil(d.getDate() / 7)}`;
      revenueByPeriod[key] = (revenueByPeriod[key] || 0) + deal.value;
    }

    const totalRevenue = deals.reduce((sum, d) => sum + d.value, 0);
    const avgDealValue = deals.length ? totalRevenue / deals.length : 0;

    sendSuccess(res, {
      revenueByPeriod,
      totalRevenue,
      avgDealValue,
      totalDeals: deals.length,
    }, 'Revenue analytics retrieved');
  } catch (error) { next(error); }
};

export const getLeadSourcePerformance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { from, to } = req.query as any;
    const createdAt = dateRange(from, to);

    const sources = await prisma.lead.groupBy({
      by: ['source', 'status'],
      _count: { source: true },
      _sum: { value: true },
      where: { deletedAt: null, ...(createdAt ? { createdAt } : {}) },
    });

    sendSuccess(res, sources, 'Lead source performance retrieved');
  } catch (error) { next(error); }
};

export const getTeamPerformance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { from, to } = req.query as any;
    const createdAt = dateRange(from, to);
    const filter = { deletedAt: null, ...(createdAt ? { createdAt } : {}) };

    const users = await prisma.user.findMany({
      where: { isActive: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        avatar: true,
        role: true,
        ownedLeads: {
          where: filter,
          select: { id: true, status: true, value: true },
        },
        ownedDeals: {
          where: filter,
          select: { id: true, stage: true, value: true },
        },
        assignedTasks: {
          where: { deletedAt: null, status: 'COMPLETED', ...(createdAt ? { completedAt: createdAt } : {}) },
          select: { id: true },
        },
      },
    });

    const performance = users.map(u => ({
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      role: u.role,
      leads: u.ownedLeads.length,
      wonDeals: u.ownedDeals.filter(d => d.stage === 'CLOSED_WON').length,
      revenue: u.ownedDeals.filter(d => d.stage === 'CLOSED_WON').reduce((s, d) => s + d.value, 0),
      tasksCompleted: u.assignedTasks.length,
    }));

    sendSuccess(res, performance, 'Team performance retrieved');
  } catch (error) { next(error); }
};

export const getConversionRates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { from, to } = req.query as any;
    const createdAt = dateRange(from, to);
    const filter = { deletedAt: null, ...(createdAt ? { createdAt } : {}) };

    const [totalLeads, wonLeads, totalDeals, wonDeals] = await Promise.all([
      prisma.lead.count({ where: filter }),
      prisma.lead.count({ where: { ...filter, status: { in: ['CONVERTED'] } } }),
      prisma.deal.count({ where: filter }),
      prisma.deal.count({ where: { ...filter, stage: 'CLOSED_WON' } }),
    ]);

    sendSuccess(res, {
      leadConversionRate: totalLeads ? Math.round((wonLeads / totalLeads) * 100) : 0,
      dealWinRate: totalDeals ? Math.round((wonDeals / totalDeals) * 100) : 0,
      totalLeads, wonLeads, totalDeals, wonDeals,
    }, 'Conversion rates retrieved');
  } catch (error) { next(error); }
};

export const getActivityReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { from, to, entity } = req.query as any;
    const createdAt = dateRange(from, to);

    const where: any = {};
    if (createdAt) where.createdAt = createdAt;
    if (entity) where.entity = entity;

    const [byAction, byEntity, byUser] = await Promise.all([
      prisma.activityLog.groupBy({ by: ['action'], _count: { action: true }, where }),
      prisma.activityLog.groupBy({ by: ['entity'], _count: { entity: true }, where }),
      prisma.activityLog.groupBy({
        by: ['userId'], _count: { userId: true }, where,
        orderBy: { _count: { userId: 'desc' } }, take: 10,
      }),
    ]);

    sendSuccess(res, { byAction, byEntity, byUser }, 'Activity report retrieved');
  } catch (error) { next(error); }
};
