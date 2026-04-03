import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { z } from 'zod';

const stageSchema = z.object({
  name: z.string().min(1),
  order: z.number().int().min(0),
  pipelineType: z.string().default('sales'),
  color: z.string().default('#6366f1'),
  isActive: z.boolean().default(true),
  description: z.string().optional(),
  defaultProbability: z.number().int().min(0).max(100).default(10),
  isWon: z.boolean().default(false),
  isLost: z.boolean().default(false),
  expectedDays: z.number().int().positive().optional(),
});

// ── Stage CRUD ────────────────────────────────────────────────────────────────

// GET /pipeline/stages
export const getStages = async (req: Request, res: Response) => {
  try {
    const stages = await prisma.pipelineStage.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: { _count: { select: { deals: { where: { deletedAt: null } } } } },
    });
    res.json({ data: stages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// POST /pipeline/stages
export const createStage = async (req: Request, res: Response) => {
  try {
    const body = stageSchema.parse(req.body);
    const stage = await prisma.pipelineStage.create({ data: body });
    res.status(201).json({ data: stage });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// PUT /pipeline/stages/:id
export const updateStage = async (req: Request, res: Response) => {
  try {
    const body = stageSchema.partial().parse(req.body);
    const stage = await prisma.pipelineStage.update({
      where: { id: req.params.id },
      data: body,
    });
    res.json({ data: stage });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE /pipeline/stages/:id
export const deleteStage = async (req: Request, res: Response) => {
  try {
    await prisma.deal.updateMany({
      where: { stageId: req.params.id },
      data: { stageId: null, stageEnteredAt: null },
    });
    await prisma.pipelineStage.delete({ where: { id: req.params.id } });
    res.json({ data: { success: true } });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// PUT /pipeline/stages/reorder  — body: { stages: [{ id, order }] }
export const reorderStages = async (req: Request, res: Response) => {
  try {
    const updates: { id: string; order: number }[] = req.body.stages;
    await Promise.all(
      updates.map((s) =>
        prisma.pipelineStage.update({ where: { id: s.id }, data: { order: s.order } })
      )
    );
    res.json({ data: { success: true } });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// ── Board ─────────────────────────────────────────────────────────────────────

// GET /pipeline/board
export const getBoard = async (req: Request, res: Response) => {
  try {
    const stages = await prisma.pipelineStage.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });

    const columns = await Promise.all(
      stages.map(async (stage) => {
        const deals = await prisma.deal.findMany({
          where: { stageId: stage.id, deletedAt: null },
          include: {
            contact: { select: { id: true, firstName: true, lastName: true, company: true } },
            owner: { select: { id: true, name: true, avatar: true } },
            assignee: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { updatedAt: 'desc' },
        });
        const totalValue = deals.reduce((s, d) => s + d.value, 0);
        const now = Date.now();
        const dealsWithAge = deals.map((d) => ({
          ...d,
          stageAgeDays: d.stageEnteredAt
            ? Math.floor((now - new Date(d.stageEnteredAt).getTime()) / 86400000)
            : null,
          isOverdue: stage.expectedDays && d.stageEnteredAt
            ? Math.floor((now - new Date(d.stageEnteredAt).getTime()) / 86400000) > stage.expectedDays
            : false,
        }));
        return { stage, deals: dealsWithAge, count: deals.length, totalValue };
      })
    );

    res.json({ data: columns });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ── Move Deal ─────────────────────────────────────────────────────────────────

// POST /pipeline/deals/:dealId/move  — body: { stageId }
export const moveDeal = async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  try {
    const { stageId } = z.object({ stageId: z.string() }).parse(req.body);
    const dealId = req.params.dealId;

    const [deal, newStage] = await Promise.all([
      prisma.deal.findUnique({ where: { id: dealId } }),
      prisma.pipelineStage.findUnique({ where: { id: stageId } }),
    ]);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    if (!newStage) return res.status(404).json({ error: 'Stage not found' });

    const now = new Date();

    // Close current transition if deal was already in a stage
    if (deal.stageId && deal.stageEnteredAt) {
      const durationHours =
        (now.getTime() - new Date(deal.stageEnteredAt).getTime()) / 3600000;
      await prisma.pipelineDealTransition.updateMany({
        where: { dealId, exitedAt: null },
        data: { exitedAt: now, durationHours },
      });
    }

    // Create new transition
    await prisma.pipelineDealTransition.create({
      data: {
        dealId,
        fromStageId: deal.stageId ?? null,
        toStageId: stageId,
        enteredAt: now,
        changedById: userId ?? null,
      },
    });

    // Update deal
    const updated = await prisma.deal.update({
      where: { id: dealId },
      data: {
        stageId,
        stageEnteredAt: now,
        probability: newStage.defaultProbability,
        actualClose: newStage.isWon || newStage.isLost ? now : undefined,
      },
      include: {
        pipelineStage: true,
        contact: { select: { id: true, firstName: true, lastName: true, company: true } },
      },
    });

    res.json({ data: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// ── Deal Timeline ─────────────────────────────────────────────────────────────

// GET /pipeline/deals/:dealId/timeline
export const getDealTimeline = async (req: Request, res: Response) => {
  try {
    const transitions = await prisma.pipelineDealTransition.findMany({
      where: { dealId: req.params.dealId },
      include: {
        toStage: true,
        fromStage: true,
        changedBy: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { enteredAt: 'asc' },
    });
    res.json({ data: transitions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ── Funnel ────────────────────────────────────────────────────────────────────

// GET /pipeline/funnel
export const getFunnel = async (req: Request, res: Response) => {
  try {
    const stages = await prisma.pipelineStage.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });

    const funnelData = await Promise.all(
      stages.map(async (stage, idx) => {
        const [count, agg] = await Promise.all([
          prisma.deal.count({ where: { stageId: stage.id, deletedAt: null } }),
          prisma.deal.aggregate({
            where: { stageId: stage.id, deletedAt: null },
            _sum: { value: true },
          }),
        ]);

        // Avg time spent in this stage (from transitions)
        const avgAgg = await prisma.pipelineDealTransition.aggregate({
          where: { toStageId: stage.id, exitedAt: { not: null } },
          _avg: { durationHours: true },
        });

        return {
          stage,
          count,
          totalValue: agg._sum.value ?? 0,
          avgDurationHours: avgAgg._avg.durationHours ?? null,
        };
      })
    );

    // Add conversion rates between adjacent stages
    const withConversion = funnelData.map((row, idx) => ({
      ...row,
      conversionRate:
        idx === 0 || funnelData[idx - 1].count === 0
          ? null
          : Math.round((row.count / funnelData[idx - 1].count) * 100),
    }));

    res.json({ data: withConversion });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ── Analytics ─────────────────────────────────────────────────────────────────

// GET /pipeline/analytics
export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const stages = await prisma.pipelineStage.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });

    // Total pipeline value
    const totalAgg = await prisma.deal.aggregate({
      where: { deletedAt: null, stageId: { not: null } },
      _sum: { value: true },
      _count: true,
    });

    // Won deals
    const wonStageIds = stages.filter((s) => s.isWon).map((s) => s.id);
    const lostStageIds = stages.filter((s) => s.isLost).map((s) => s.id);

    const [wonAgg, lostCount] = await Promise.all([
      prisma.deal.aggregate({
        where: { stageId: { in: wonStageIds }, deletedAt: null },
        _sum: { value: true },
        _count: true,
      }),
      prisma.deal.count({
        where: { stageId: { in: lostStageIds }, deletedAt: null },
      }),
    ]);

    const totalDeals = totalAgg._count;
    const winRate =
      totalDeals > 0 ? Math.round((wonAgg._count / totalDeals) * 100) : 0;

    // Avg deal cycle (from first transition to won)
    const avgCycleAgg = await prisma.pipelineDealTransition.aggregate({
      where: { toStageId: { in: wonStageIds } },
      _avg: { durationHours: true },
    });

    // Per-stage avg duration
    const stageStats = await Promise.all(
      stages.map(async (stage) => {
        const agg = await prisma.pipelineDealTransition.aggregate({
          where: { toStageId: stage.id, exitedAt: { not: null } },
          _avg: { durationHours: true },
          _count: true,
        });
        return {
          stageId: stage.id,
          stageName: stage.name,
          stageColor: stage.color,
          avgDurationHours: agg._avg.durationHours ?? 0,
          transitionCount: agg._count,
          isWon: stage.isWon,
          isLost: stage.isLost,
          expectedDays: stage.expectedDays,
        };
      })
    );

    res.json({
      data: {
        totalDeals,
        totalValue: totalAgg._sum.value ?? 0,
        wonValue: wonAgg._sum.value ?? 0,
        wonCount: wonAgg._count,
        lostCount,
        winRate,
        avgCycleDays: avgCycleAgg._avg.durationHours
          ? Math.round(avgCycleAgg._avg.durationHours / 24)
          : null,
        stageStats,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ── Demo Details ──────────────────────────────────────────────────────────────

// GET /pipeline/demo/:dealId
export const getDemoDetail = async (req: Request, res: Response) => {
  try {
    const demo = await prisma.demoDetail.findUnique({ where: { dealId: req.params.dealId } });
    res.json({ data: demo });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /pipeline/demo/:dealId
export const upsertDemoDetail = async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      demoDate: z.string().optional(),
      meetingLink: z.string().optional(),
      demoStatus: z.enum(['Scheduled', 'Completed', 'Cancelled']).optional(),
      demoSummary: z.string().optional(),
      nextAction: z.string().optional(),
    });
    const body = schema.parse(req.body);
    const demo = await prisma.demoDetail.upsert({
      where: { dealId: req.params.dealId },
      create: { dealId: req.params.dealId, ...body },
      update: body,
    });
    res.json({ data: demo });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
