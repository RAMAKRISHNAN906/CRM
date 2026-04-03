import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { z } from 'zod';

const competitorSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  website: z.string().optional(),
  strengths: z.string().optional(),
  weaknesses: z.string().optional(),
  notes: z.string().optional(),
  dealId: z.string().optional(),
});

// GET /competitors?dealId=xxx
export const getCompetitors = async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.query.dealId) where.dealId = req.query.dealId;
    const data = await prisma.competitor.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { deal: { select: { title: true } } },
    });
    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// POST /competitors
export const createCompetitor = async (req: Request, res: Response) => {
  try {
    const body = competitorSchema.parse(req.body);
    const competitor = await prisma.competitor.create({ data: body });
    res.status(201).json({ data: competitor });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// PUT /competitors/:id
export const updateCompetitor = async (req: Request, res: Response) => {
  try {
    const body = competitorSchema.partial().parse(req.body);
    const competitor = await prisma.competitor.update({
      where: { id: req.params.id },
      data: body,
    });
    res.json({ data: competitor });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE /competitors/:id
export const deleteCompetitor = async (req: Request, res: Response) => {
  try {
    await prisma.competitor.delete({ where: { id: req.params.id } });
    res.json({ data: { success: true } });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
