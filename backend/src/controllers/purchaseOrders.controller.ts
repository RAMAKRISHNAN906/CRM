import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { z } from 'zod';

async function nextPONumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const last = await prisma.purchaseOrder.findFirst({
    where: { poNumber: { startsWith: prefix } },
    orderBy: { poNumber: 'desc' },
  });
  const seq = last ? parseInt(last.poNumber.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(5, '0')}`;
}

const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  total: z.number(),
});

const poSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'CONFIRMED', 'RECEIVED', 'CANCELLED']).default('DRAFT'),
  currency: z.string().default('INR'),
  subtotal: z.number().default(0),
  tax: z.number().default(0),
  total: z.number().default(0),
  notes: z.string().optional(),
  dealId: z.string().optional(),
  invoiceId: z.string().optional(),
  lineItems: z.array(lineItemSchema).default([]),
});

// GET /purchase-orders
export const getPurchaseOrders = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const { status, dealId } = req.query;
    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (dealId) where.dealId = dealId;

    const [data, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          deal: { select: { title: true } },
          invoice: { select: { invoiceNumber: true } },
          createdBy: { select: { name: true } },
          lineItems: true,
        },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    res.json({ data, meta: { total, page, limit } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /purchase-orders/:id
export const getPurchaseOrder = async (req: Request, res: Response) => {
  try {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        deal: true,
        invoice: true,
        createdBy: { select: { name: true, email: true } },
        lineItems: true,
      },
    });
    if (!po) return res.status(404).json({ error: 'Not found' });
    res.json({ data: po });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// POST /purchase-orders
export const createPurchaseOrder = async (req: Request, res: Response) => {
  try {
    const body = poSchema.parse(req.body);
    const userId = (req as any).user.id;
    const { lineItems, ...rest } = body;
    const poNumber = await nextPONumber();

    const po = await prisma.purchaseOrder.create({
      data: {
        ...rest,
        poNumber,
        createdById: userId,
        lineItems: { create: lineItems },
      },
      include: { lineItems: true },
    });

    res.status(201).json({ data: po });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// PUT /purchase-orders/:id
export const updatePurchaseOrder = async (req: Request, res: Response) => {
  try {
    const body = poSchema.partial().parse(req.body);
    const { lineItems, ...rest } = body;

    const updated = await prisma.$transaction(async (tx) => {
      if (lineItems) {
        await tx.pOLineItem.deleteMany({ where: { purchaseOrderId: req.params.id } });
        await tx.pOLineItem.createMany({
          data: lineItems.map((li) => ({ ...li, purchaseOrderId: req.params.id })),
        });
      }
      return tx.purchaseOrder.update({
        where: { id: req.params.id },
        data: rest,
        include: { lineItems: true },
      });
    });

    res.json({ data: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE /purchase-orders/:id (soft)
export const deletePurchaseOrder = async (req: Request, res: Response) => {
  try {
    await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    res.json({ data: { success: true } });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
