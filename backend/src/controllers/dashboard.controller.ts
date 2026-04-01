import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess } from '../utils/response';

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const isManager = ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(req.user!.role);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // For non-managers, scope to their own data
    const leadFilter = isManager ? { deletedAt: null } : { deletedAt: null, OR: [{ ownerId: userId }, { assigneeId: userId }] };
    const dealFilter = isManager ? { deletedAt: null } : { deletedAt: null, OR: [{ ownerId: userId }, { assigneeId: userId }] };
    const contactFilter = isManager ? { deletedAt: null } : { deletedAt: null, ownerId: userId };
    const taskFilter = isManager ? { deletedAt: null } : { deletedAt: null, OR: [{ ownerId: userId }, { assigneeId: userId }] };

    const [
      totalLeads, newLeadsThisMonth, newLeadsLastMonth,
      totalContacts,
      totalDeals, wonDealsValue, wonDealsThisMonth,
      totalTasks, overdueTasks, completedTasksThisMonth,
      openTickets,
      recentActivity,
    ] = await Promise.all([
      prisma.lead.count({ where: leadFilter }),
      prisma.lead.count({ where: { ...leadFilter, createdAt: { gte: startOfMonth } } }),
      prisma.lead.count({ where: { ...leadFilter, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      prisma.contact.count({ where: contactFilter }),
      prisma.deal.count({ where: dealFilter }),
      prisma.deal.aggregate({ where: { ...dealFilter, stage: 'CLOSED_WON' }, _sum: { value: true } }),
      prisma.deal.count({ where: { ...dealFilter, stage: 'CLOSED_WON', updatedAt: { gte: startOfMonth } } }),
      prisma.task.count({ where: taskFilter }),
      prisma.task.count({ where: { ...taskFilter, dueDate: { lt: now }, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
      prisma.task.count({ where: { ...taskFilter, status: 'COMPLETED', updatedAt: { gte: startOfMonth } } }),
      prisma.supportTicket.count({ where: { deletedAt: null, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.activityLog.findMany({
        where: isManager ? {} : { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { id: true, name: true, avatar: true } } },
      }),
    ]);

    // Pipeline value by stage
    const pipelineByStage = await prisma.deal.groupBy({
      by: ['stage'],
      where: dealFilter as any,
      _sum: { value: true },
      _count: true,
    });

    // Monthly revenue (last 6 months)
    const monthlyRevenue = await Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        return prisma.deal.aggregate({
          where: { ...dealFilter, stage: 'CLOSED_WON', updatedAt: { gte: month, lt: nextMonth } } as any,
          _sum: { value: true },
        }).then(result => ({
          month: month.toLocaleString('default', { month: 'short', year: '2-digit' }),
          revenue: result._sum?.value || 0,
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
        deals: { total: totalDeals, wonValue: wonDealsValue._sum?.value || 0, wonThisMonth: wonDealsThisMonth },
        tasks: { total: totalTasks, overdue: overdueTasks, completedThisMonth: completedTasksThisMonth },
        tickets: { open: openTickets },
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
    const isManager = ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(req.user!.role);

    const where = isManager ? {} : { userId: req.user!.userId };

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: { user: { select: { id: true, name: true, avatar: true } } },
      }),
      prisma.activityLog.count({ where }),
    ]);

    sendSuccess(res, {
      logs,
      meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    }, 'Activity log retrieved');
  } catch (error) { next(error); }
};
