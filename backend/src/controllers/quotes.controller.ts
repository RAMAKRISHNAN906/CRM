import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { z } from 'zod';
import { generateQuotePdf } from '../services/pdf.service';

// ── Financial year helpers ─────────────────────────────────────────────────
const FY_START: Record<string, number> = {
  IN: 4, // April
  AU: 7, // July
  US: 1, // January
  GB: 4,
  DEFAULT: 1,
};

function getFinancialYear(country: string): string {
  const fyMonth = FY_START[country] ?? FY_START.DEFAULT;
  const now = new Date();
  const year = now.getMonth() + 1 >= fyMonth ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${year + 1}`;
}

async function nextQuoteNumber(type: string, country: string): Promise<string> {
  const fy = getFinancialYear(country);
  const fyStart = fy.split('-')[0];
  const prefix = `${type}-${fyStart}-`;

  const last = await prisma.quote.findFirst({
    where: { quoteNumber: { startsWith: prefix } },
    orderBy: { quoteNumber: 'desc' },
  });

  let seq = 1;
  if (last) {
    const parts = last.quoteNumber.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(5, '0')}`;
}

// ── Schemas ────────────────────────────────────────────────────────────────
const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  discount: z.number().default(0),
  tax: z.number().default(0),
  total: z.number(),
});

const quoteSchema = z.object({
  type: z.enum(['SQ', 'SO', 'SI', 'SCR']).default('SQ'),
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED']).default('DRAFT'),
  currency: z.string().default('INR'),
  country: z.string().default('IN'),
  subtotal: z.number().default(0),
  tax: z.number().default(0),
  discount: z.number().default(0),
  total: z.number().default(0),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
  termsContent: z.string().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  paymentTermId: z.string().optional(),
  lineItems: z.array(lineItemSchema).default([]),
});

// GET /quotes
export const getQuotes = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const { type, status, search } = req.query;

    const where: any = { deletedAt: null };
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) where.quoteNumber = { contains: search as string, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          contact: { select: { firstName: true, lastName: true } },
          deal: { select: { title: true } },
          createdBy: { select: { name: true } },
          paymentTerm: { select: { name: true } },
          lineItems: true,
        },
      }),
      prisma.quote.count({ where }),
    ]);

    res.json({ data, meta: { total, page, limit } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /quotes/:id
export const getQuote = async (req: Request, res: Response) => {
  try {
    const quote = await prisma.quote.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        contact: true,
        deal: { select: { title: true, value: true } },
        createdBy: { select: { name: true, email: true } },
        paymentTerm: true,
        lineItems: true,
      },
    });
    if (!quote) return res.status(404).json({ error: 'Not found' });
    res.json({ data: quote });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// POST /quotes
export const createQuote = async (req: Request, res: Response) => {
  try {
    const body = quoteSchema.parse(req.body);
    const userId = (req as any).user?.userId ?? (req as any).user?.id;
    const { lineItems, ...rest } = body;

    const quoteNumber = await nextQuoteNumber(rest.type, rest.country);
    const fy = getFinancialYear(rest.country);

    const quote = await prisma.quote.create({
      data: {
        ...rest,
        quoteNumber,
        financialYear: fy,
        createdById: userId,
        validUntil: rest.validUntil ? new Date(rest.validUntil) : undefined,
        lineItems: { create: lineItems },
      },
      include: { lineItems: true, paymentTerm: true },
    });

    res.status(201).json({ data: quote });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// PUT /quotes/:id
export const updateQuote = async (req: Request, res: Response) => {
  try {
    const body = quoteSchema.partial().parse(req.body);
    const { lineItems, ...rest } = body;

    const updated = await prisma.$transaction(async (tx) => {
      if (lineItems) {
        await tx.quoteLineItem.deleteMany({ where: { quoteId: req.params.id } });
        await tx.quoteLineItem.createMany({
          data: lineItems.map((li) => ({ ...li, quoteId: req.params.id })),
        });
      }
      return tx.quote.update({
        where: { id: req.params.id },
        data: {
          ...rest,
          validUntil: rest.validUntil ? new Date(rest.validUntil) : undefined,
        },
        include: { lineItems: true, paymentTerm: true },
      });
    });

    res.json({ data: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE /quotes/:id  (soft)
export const deleteQuote = async (req: Request, res: Response) => {
  try {
    await prisma.quote.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    res.json({ data: { success: true } });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// POST /quotes/:id/convert  — SQ → SO → SI
export const convertQuote = async (req: Request, res: Response) => {
  try {
    const source = await prisma.quote.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: { lineItems: true },
    });
    if (!source) return res.status(404).json({ error: 'Quote not found' });

    const typeMap: Record<string, 'SO' | 'SI'> = { SQ: 'SO', SO: 'SI' };
    const nextType = typeMap[source.type];
    if (!nextType) return res.status(400).json({ error: 'Cannot convert this quote type' });

    const userId = (req as any).user?.userId ?? (req as any).user?.id;
    const quoteNumber = await nextQuoteNumber(nextType, source.country);

    const newQuote = await prisma.quote.create({
      data: {
        type: nextType,
        quoteNumber,
        status: 'DRAFT',
        currency: source.currency,
        country: source.country,
        financialYear: source.financialYear,
        subtotal: source.subtotal,
        tax: source.tax,
        discount: source.discount,
        total: source.total,
        notes: source.notes,
        termsContent: source.termsContent,
        contactId: source.contactId,
        dealId: source.dealId,
        paymentTermId: source.paymentTermId,
        createdById: userId,
        lineItems: {
          create: source.lineItems.map((li) => ({
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            discount: li.discount,
            tax: li.tax,
            total: li.total,
          })),
        },
      },
      include: { lineItems: true },
    });

    // Mark source as converted
    await prisma.quote.update({
      where: { id: source.id },
      data: { status: 'CONVERTED' },
    });

    res.status(201).json({ data: newQuote });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// GET/POST /quotes/payment-terms
export const getPaymentTerms = async (_req: Request, res: Response) => {
  try {
    const terms = await prisma.paymentTerm.findMany({ orderBy: { name: 'asc' } });
    res.json({ data: terms });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createPaymentTerm = async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      name: z.string(),
      description: z.string().optional(),
      content: z.string(),
      isDefault: z.boolean().default(false),
    });
    const body = schema.parse(req.body);
    if (body.isDefault) {
      await prisma.paymentTerm.updateMany({ data: { isDefault: false } });
    }
    const term = await prisma.paymentTerm.create({ data: body });
    res.status(201).json({ data: term });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const updatePaymentTerm = async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (body.isDefault) {
      await prisma.paymentTerm.updateMany({ data: { isDefault: false } });
    }
    const term = await prisma.paymentTerm.update({ where: { id: req.params.id }, data: body });
    res.json({ data: term });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const deletePaymentTerm = async (req: Request, res: Response) => {
  try {
    await prisma.paymentTerm.delete({ where: { id: req.params.id } });
    res.json({ data: { success: true } });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// GET /quotes/:id/pdf
export const downloadPdf = async (req: Request, res: Response) => {
  try {
    const pdfBuffer = await generateQuotePdf(req.params.id);
    // Fetch quote number for filename
    const quote = await prisma.quote.findUnique({ where: { id: req.params.id }, select: { quoteNumber: true } });
    const filename = quote ? `${quote.quoteNumber}.pdf` : 'quote.pdf';
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
