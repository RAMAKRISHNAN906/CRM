import PDFDocument from 'pdfkit';
import { prisma } from '../config/prisma';

// PDFKit built-in fonts don't support ₹ — use Rs. prefix
function fmt(n: number, currency = 'INR'): string {
  const sym: Record<string, string> = { INR: 'Rs. ', USD: '$ ', EUR: 'EUR ', GBP: 'GBP ', AED: 'AED ' };
  return (sym[currency] ?? currency + ' ') + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d?: string | Date | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export async function generateInvoicePdf(invoiceId: string): Promise<Buffer> {
  const [invoice, settings] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id: invoiceId, deletedAt: null },
      include: {
        lineItems: true,
        payments: true,
        createdBy: { select: { name: true, email: true } },
        deal: { select: { title: true } },
      },
    }),
    prisma.companySettings.findFirst(),
  ]);

  if (!invoice) throw new Error('Invoice not found');

  const currency = invoice.currency ?? 'INR';
  const paid = invoice.payments?.reduce((s, p) => s + (p.status === 'COMPLETED' ? p.amount : 0), 0) ?? 0;
  const due = Math.max(0, invoice.total - paid);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const PW  = doc.page.width;   // 595.28
    const L   = 50;               // left margin
    const R   = PW - 50;          // right margin = 545.28
    const W   = R - L;            // usable width = 495.28

    const green:  [number,number,number] = [22, 163, 74];
    const dark:   [number,number,number] = [15, 15, 25];
    const mid:    [number,number,number] = [100, 100, 120];
    const light:  [number,number,number] = [200, 200, 210];
    const white:  [number,number,number] = [255, 255, 255];
    const body:   [number,number,number] = [40, 40, 60];
    const red:    [number,number,number] = [239, 68, 68];

    // ── Header band ──────────────────────────────────────────────────────────
    doc.rect(0, 0, PW, 90).fill(dark);

    doc.fillColor(white).fontSize(22).font('Helvetica-Bold')
      .text(settings?.companyName ?? 'NexusCRM', L, 22);
    doc.font('Helvetica').fontSize(9).fillColor(light)
      .text(settings?.footerAddress ?? '', L, 48, { width: 260 });

    // Invoice badge (top-right)
    doc.roundedRect(PW - 185, 18, 135, 54, 6).fill(green);
    doc.fillColor(white).fontSize(12).font('Helvetica-Bold')
      .text('INVOICE', PW - 180, 26, { width: 125, align: 'center' });
    doc.fontSize(9).font('Helvetica')
      .text(invoice.invoiceNumber, PW - 180, 46, { width: 125, align: 'center' });

    let y = 105;

    // ── Status pill ──────────────────────────────────────────────────────────
    const statusColors: Record<string, [number,number,number]> = {
      DRAFT: [107,114,128], SENT: [59,130,246], PAID: [22,163,74],
      OVERDUE: [239,68,68], CANCELLED: [107,114,128],
    };
    const sc = statusColors[invoice.status] ?? [107,114,128];
    doc.roundedRect(L, y, 62, 18, 4).fill(sc);
    doc.fillColor(white).fontSize(8).font('Helvetica-Bold')
      .text(invoice.status, L, y + 4, { width: 62, align: 'center' });
    y += 28;

    // ── Dates row ────────────────────────────────────────────────────────────
    doc.fillColor(mid).fontSize(8).font('Helvetica').text('Issue Date', L, y);
    doc.fillColor(body).fontSize(10).font('Helvetica-Bold').text(fmtDate(invoice.createdAt), L, y + 13);

    doc.fillColor(mid).fontSize(8).font('Helvetica').text('Due Date', L + 160, y);
    const dueDateColor: [number,number,number] =
      invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== 'PAID'
        ? red : body;
    doc.fillColor(dueDateColor).fontSize(10).font('Helvetica-Bold')
      .text(fmtDate(invoice.dueDate), L + 160, y + 13);

    if (invoice.deal?.title) {
      doc.fillColor(mid).fontSize(8).font('Helvetica').text('Project', L + 330, y);
      doc.fillColor(body).fontSize(10).font('Helvetica-Bold')
        .text(invoice.deal.title, L + 330, y + 13, { width: W - 330 });
    }
    y += 46;

    // ── Line items table ─────────────────────────────────────────────────────
    // Column x positions (all relative to L=50)
    const COL = {
      desc:      L,           // Description starts at 50
      qty:       L + 290,     // Qty
      price:     L + 350,     // Unit Price
      amount:    L + 435,     // Amount (right-aligned to R=545)
    };
    const ROW_H = 24;

    // Header row
    doc.rect(L, y, W, ROW_H).fill([30, 30, 50]);
    doc.fillColor(white).fontSize(8).font('Helvetica-Bold');
    doc.text('DESCRIPTION', COL.desc + 6, y + 8, { width: 280 });
    doc.text('QTY',         COL.qty,       y + 8, { width: 55, align: 'center' });
    doc.text('UNIT PRICE',  COL.price,     y + 8, { width: 75, align: 'right' });
    doc.text('AMOUNT',      COL.amount,    y + 8, { width: R - COL.amount, align: 'right' });
    y += ROW_H + 2;

    // Data rows
    invoice.lineItems.forEach((item, i) => {
      if (i % 2 === 1) doc.rect(L, y, W, ROW_H).fill([245, 245, 250]);
      doc.fillColor(body).fontSize(9).font('Helvetica');
      doc.text(item.description,              COL.desc + 6, y + 7, { width: 278 });
      doc.text(String(item.quantity),         COL.qty,      y + 7, { width: 55, align: 'center' });
      doc.text(fmt(item.unitPrice, currency), COL.price,    y + 7, { width: 75, align: 'right' });
      doc.text(fmt(item.total, currency),     COL.amount,   y + 7, { width: R - COL.amount, align: 'right' });
      y += ROW_H;
    });

    y += 14;

    // ── Totals block ─────────────────────────────────────────────────────────
    const TLABEL = L + 260;    // label column start
    const TVAL   = L + 390;    // value column start
    const TVAL_W = R - TVAL;   // value column width

    const addRow = (
      label: string, value: string,
      bold = false,
      color: [number,number,number] = mid,
    ) => {
      doc.fillColor(mid).fontSize(9).font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(label, TLABEL, y, { width: 120 });
      doc.fillColor(color).fontSize(9).font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(value, TVAL, y, { width: TVAL_W, align: 'right' });
      y += 18;
    };

    addRow('Subtotal', fmt(invoice.subtotal, currency));
    if (invoice.discount > 0)
      addRow('Discount', `-${fmt(invoice.discount, currency)}`, false, red);
    if (invoice.tax > 0)
      addRow('Tax / GST', `+${fmt(invoice.tax, currency)}`, false, green);

    y += 4;

    // Total band
    doc.rect(TLABEL, y, R - TLABEL, 30).fill(green);
    doc.fillColor(white).fontSize(11).font('Helvetica-Bold')
      .text('TOTAL', TLABEL + 8, y + 9, { width: 110 });
    doc.text(fmt(invoice.total, currency), TVAL, y + 9, { width: TVAL_W, align: 'right' });
    y += 40;

    // Balance due band
    if (due > 0 && invoice.status !== 'PAID') {
      doc.rect(L, y, W, 30).fill(red);
      doc.fillColor(white).fontSize(11).font('Helvetica-Bold')
        .text('BALANCE DUE', L + 8, y + 9, { width: W / 2 });
      doc.text(fmt(due, currency), L + W / 2, y + 9, { width: W / 2, align: 'right' });
      y += 40;
    }

    // ── Payment history (if any) ──────────────────────────────────────────────
    const completedPayments = invoice.payments?.filter(p => p.status === 'COMPLETED') ?? [];
    if (completedPayments.length > 0) {
      y += 8;
      doc.fillColor(mid).fontSize(8).font('Helvetica-Bold').text('PAYMENTS RECEIVED', L, y);
      y += 14;
      completedPayments.forEach(p => {
        doc.fillColor(mid).fontSize(8).font('Helvetica')
          .text(`${fmtDate(p.paidAt)}  ${p.method ?? ''}`, L, y, { width: W - 120 });
        doc.fillColor(green).text(fmt(p.amount, currency), L, y, { width: W, align: 'right' });
        y += 14;
      });
    }

    // ── Footer (inline, flows after content — no absolute positioning) ────────
    y += 28;
    doc.rect(0, y, PW, 50).fill(dark);
    doc.fillColor(light).fontSize(8).font('Helvetica')
      .text(settings?.companyName ?? 'NexusCRM', L, y + 8, { width: W / 3 });
    if (settings?.email) {
      doc.text(settings.email, L, y + 20, { width: W / 3 });
    }
    doc.fillColor([80, 80, 100])
      .text(`Generated by NexusCRM  |  ${new Date().toLocaleDateString('en-IN')}`, L, y + 8, { width: W, align: 'right' });

    doc.end();
  });
}
