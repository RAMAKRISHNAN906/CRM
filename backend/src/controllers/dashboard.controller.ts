import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess } from '../utils/response';

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalLeads, newLeadsThisMonth, newLeadsLastMonth,
      totalContacts,
      totalDeals, wonDealsValue, wonDealsThisMonth,
      totalTasks, overdueTasks, completedTasksThisMonth,
      recentActivity,
    ] = await Promise.all([
      prisma.lead.count({ where: { userId } }),
      prisma.lead.count({ where: { userId, createdAt: { gte: startOfMonth } } }),
      prisma.lead.count({ where: { userId, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      prisma.contact.count({ where: { userId } }),
      prisma.deal.count({ where: { userId } }),
      prisma.deal.aggregate({ where: { userId, stage: 'CLOSED_WON' }, _sum: { value: true } }),
      prisma.deal.count({ where: { userId, stage: 'CLOSED_WON', updatedAt: { gte: startOfMonth } } }),
      prisma.task.count({ where: { userId } }),
      prisma.task.count({ where: { userId, dueDate: { lt: now }, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
      prisma.task.count({ where: { userId, status: 'COMPLETED', updatedAt: { gte: startOfMonth } } }),
      prisma.activityLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);

    // Pipeline value by stage
    const pipelineByStage = await prisma.deal.groupBy({
      by: ['stage'],
      where: { userId },
      _sum: { value: true },
      _count: true,
    });

    // Monthly revenue (last 6 months)
    const monthlyRevenue = await Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        return prisma.deal.aggregate({
          where: { userId, stage: 'CLOSED_WON', updatedAt: { gte: month, lt: nextMonth } },
          _sum: { value: true },
        }).then(result => ({
          month: month.toLocaleString('default', { month: 'short', year: '2-digit' }),
          revenue: result._sum.value || 0,
        }));
      })
    );

    const leadsGrowth = newLeadsLastMonth > 0
      ? Math.round(((newLeadsThisMonth - newLeadsLastMonth) / newLeadsLastMonth) * 100)
      : newLeadsThisMonth > 0 ? 100 : 0;

    sendSuccess(res, {
      stats: {
        leads: { total: totalLeads, thisMonth: newLeadsThisMonth, growth: leadsGrowth },
        contacts: { total: totalContacts },
        deals: { total: totalDeals, wonValue: wonDealsValue._sum.value || 0, wonThisMonth: wonDealsThisMonth },
        tasks: { total: totalTasks, overdue: overdueTasks, completedThisMonth: completedTasksThisMonth },
      },
      pipelineByStage,
      monthlyRevenue: monthlyRevenue.reverse(),
      recentActivity,
    }, 'Dashboard data retrieved');
  } catch (error) { next(error); }
};

export const getActivityLog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = '1', limit = '20' } = req.query as any;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.activityLog.count({ where: { userId: req.user!.userId } }),
    ]);

    sendSuccess(res, { logs, meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } }, 'Activity log retrieved');
  } catch (error) { next(error); }
};
