import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { generateInvoicePdf } from '../services/invoicePdf.service';
import { generateInvoiceDocx } from '../services/invoiceWord.service';

const generateInvoiceNumber = async (): Promise<string> => {
  const count = await prisma.invoice.count();
  const year = new Date().getFullYear();
  return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
};

export const getInvoices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = '1', limit = '20', status, dealId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query as any;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (dealId) where.dealId = dealId;
    if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(req.user!.role)) {
      where.createdById = req.user!.userId;
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where, skip: (pageNum - 1) * limitNum, take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        include: {
          createdBy: { select: { id: true, name: true } },
          deal: { select: { id: true, title: true } },
          _count: { select: { lineItems: true, payments: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    sendPaginated(res, invoices, total, pageNum, limitNum, 'Invoices retrieved');
  } catch (error) { next(error); }
};

export const getInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        lineItems: true,
        payments: true,
        createdBy: { select: { id: true, name: true, email: true } },
        deal: { select: { id: true, title: true } },
      },
    });
    if (!invoice) { sendError(res, 'Invoice not found', 404); return; }
    sendSuccess(res, invoice, 'Invoice retrieved');
  } catch (error) { next(error); }
};

export const createInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { lineItems, dealId, dueDate, notes, currency, tax = 0, discount = 0 } = req.body;
    const invoiceNumber = await generateInvoiceNumber();

    const subtotal = lineItems.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
    const total = subtotal + tax - discount;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber, currency: currency || 'INR',
        subtotal, tax, discount, total,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        notes, dealId,
        createdById: req.user!.userId,
        lineItems: {
          create: lineItems.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
      include: { lineItems: true },
    });

    sendSuccess(res, invoice, 'Invoice created', 201);
  } catch (error) { next(error); }
};

export const updateInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { lineItems, dueDate, notes, tax = 0, discount = 0 } = req.body;
    const subtotal = lineItems.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
    const total = subtotal + tax - discount;

    // Replace all line items
    await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: req.params.id } });

    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        subtotal, tax, discount, total,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes,
        lineItems: {
          create: lineItems.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
      include: { lineItems: true },
    });

    sendSuccess(res, invoice, 'Invoice updated');
  } catch (error) { next(error); }
};

export const updateInvoiceStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status } = req.body;
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status, paidAt: status === 'PAID' ? new Date() : undefined },
    });
    sendSuccess(res, invoice, 'Invoice updated');
  } catch (error) { next(error); }
};

export const recordPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { amount, method, transactionId, notes } = req.body;
    const payment = await prisma.payment.create({
      data: {
        invoiceId: req.params.id,
        amount, method, transactionId, notes,
        status: 'COMPLETED',
        paidAt: new Date(),
      },
    });

    // Check if invoice is fully paid
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { payments: true },
    });
    if (invoice) {
      const totalPaid = invoice.payments.reduce((sum, p) => sum + (p.status === 'COMPLETED' ? p.amount : 0), 0);
      if (totalPaid >= invoice.total) {
        await prisma.invoice.update({ where: { id: req.params.id }, data: { status: 'PAID', paidAt: new Date() } });
      }
    }

    sendSuccess(res, payment, 'Payment recorded', 201);
  } catch (error) { next(error); }
};

export const deleteInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.invoice.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    sendSuccess(res, null, 'Invoice deleted');
  } catch (error) { next(error); }
};

export const downloadInvoicePdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const buffer = await generateInvoicePdf(req.params.id);
    const invoice = await prisma.invoice.findFirst({ where: { id: req.params.id }, select: { invoiceNumber: true } });
    const filename = `Invoice-${invoice?.invoiceNumber ?? req.params.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.end(buffer);
  } catch (error) { next(error); }
};

export const downloadInvoiceDocx = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const buffer = await generateInvoiceDocx(req.params.id);
    const invoice = await prisma.invoice.findFirst({ where: { id: req.params.id }, select: { invoiceNumber: true } });
    const filename = `Invoice-${invoice?.invoiceNumber ?? req.params.id}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.end(buffer);
  } catch (error) { next(error); }
};
