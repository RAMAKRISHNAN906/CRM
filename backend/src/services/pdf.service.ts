import PDFDocument from 'pdfkit';
import { prisma } from '../config/prisma';

// ── Type labels & colors ─────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  SQ: 'SALES QUOTATION',
  SO: 'SALES ORDER',
  SI: 'SALES INVOICE',
  SCR: 'CREDIT MEMO',
};

const TYPE_RGB: Record<string, [number, number, number]> = {
  SQ: [59, 130, 246],
  SO: [139, 92, 246],
  SI: [22, 163, 74],
  SCR: [245, 158, 11],
};

const STATUS_RGB: Record<string, [number, number, number]> = {
  DRAFT:     [107, 114, 128],
  SENT:      [59, 130, 246],
  ACCEPTED:  [22, 163, 74],
  REJECTED:  [239, 68, 68],
  EXPIRED:   [245, 158, 11],
  CONVERTED: [139, 92, 246],
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d?: string | Date | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtCurrency(amount: number, currency = 'INR'): string {
  const symbols: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ' };
  const sym = symbols[currency] ?? currency + ' ';
  return `${sym}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Main generator ────────────────────────────────────────────────────────────
export async function generateQuotePdf(quoteId: string): Promise<Buffer> {
  const [quote, settings] = await Promise.all([
    prisma.quote.findFirst({
      where: { id: quoteId, deletedAt: null },
      include: {
        lineItems: true,
        contact: true,
        deal: { select: { title: true } },
        createdBy: { select: { name: true, email: true } },
        paymentTerm: true,
      },
    }),
    prisma.companySettings.findFirst(),
  ]);

  if (!quote) throw new Error('Quote not found');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = 595;   // A4 width
    const ML = 50;   // left margin
    const MR = 50;   // right margin
    const BODY_W = W - ML - MR;   // 495
    const typeColor = TYPE_RGB[quote.type] ?? [30, 30, 30];

    // ── HEADER BACKGROUND ──────────────────────────────────────────────────
    doc.rect(0, 0, W, 130).fill('#F8FAFC');

    // ── COMPANY LOGO ───────────────────────────────────────────────────────
    let logoBottomY = 50;
    if (settings?.logoUrl?.startsWith('data:')) {
      try {
        const base64 = settings.logoUrl.split(',')[1];
        const buf = Buffer.from(base64, 'base64');
        doc.image(buf, ML, 22, { fit: [110, 55] });
        logoBottomY = 82;
      } catch {
        logoBottomY = 50;
      }
    }

    // ── COMPANY INFO (left) ────────────────────────────────────────────────
    let cy = logoBottomY;
    const companyName = settings?.companyName ?? 'Your Company';
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#1E293B')
      .text(companyName, ML, cy, { width: 260 });
    cy = doc.y + 3;

    const addrLines = [
      settings?.footerAddress,
      settings?.taxNumber ? `GST/Tax: ${settings.taxNumber}` : null,
      settings?.phone ? `Ph: ${settings.phone}` : null,
      settings?.email,
      settings?.website,
    ].filter(Boolean) as string[];

    doc.font('Helvetica').fontSize(8).fillColor('#64748B');
    addrLines.forEach((line) => {
      doc.text(line, ML, cy, { width: 260 });
      cy = doc.y + 1;
    });

    // ── DOCUMENT TYPE BADGE (right) ────────────────────────────────────────
    const badgeX = W - MR - 180;
    const badgeY = 22;
    doc.rect(badgeX, badgeY, 180, 24).fill(`rgb(${typeColor.join(',')})`);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#FFFFFF')
      .text(TYPE_LABELS[quote.type] ?? quote.type, badgeX, badgeY + 7, { width: 180, align: 'center' });

    // Quote number, dates
    let infoY = badgeY + 32;
    const infoX = badgeX;
    const infoW = 180;

    const infoRows: [string, string][] = [
      ['Number', quote.quoteNumber],
      ['Date', fmtDate(quote.createdAt)],
    ];
    if (quote.validUntil) infoRows.push(['Valid Until', fmtDate(quote.validUntil)]);
    if (quote.financialYear) infoRows.push(['FY', quote.financialYear]);

    infoRows.forEach(([label, value]) => {
      doc.font('Helvetica').fontSize(8).fillColor('#94A3B8')
        .text(label, infoX, infoY, { width: 65, continued: false });
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#1E293B')
        .text(value, infoX + 65, infoY, { width: 115 });
      infoY += 13;
    });

    // Status pill
    const statusRgb = STATUS_RGB[quote.status] ?? [100, 100, 100];
    doc.rect(infoX, infoY + 3, 70, 14).fill(`rgb(${statusRgb.join(',')})`).opacity(0.15);
    doc.opacity(1);
    doc.rect(infoX, infoY + 3, 70, 14).stroke(`rgb(${statusRgb.join(',')})`);
    doc.font('Helvetica-Bold').fontSize(7).fillColor(`rgb(${statusRgb.join(',')})`)
      .text(quote.status, infoX, infoY + 7, { width: 70, align: 'center' });

    // ── DIVIDER ────────────────────────────────────────────────────────────
    const divY = 135;
    doc.moveTo(ML, divY).lineTo(W - MR, divY).lineWidth(1).stroke('#E2E8F0');

    // ── BILL TO ────────────────────────────────────────────────────────────
    let y = divY + 15;
    doc.font('Helvetica').fontSize(7).fillColor('#94A3B8')
      .text('BILL TO', ML, y);
    y += 12;

    if (quote.contact) {
      const contactName = `${quote.contact.firstName} ${quote.contact.lastName}`;
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1E293B').text(contactName, ML, y);
      y = doc.y + 2;
      if (quote.contact.company) {
        doc.font('Helvetica').fontSize(9).fillColor('#64748B').text(quote.contact.company, ML, y);
        y = doc.y + 2;
      }
      if ((quote.contact as any).email) {
        doc.font('Helvetica').fontSize(8).fillColor('#94A3B8').text((quote.contact as any).email, ML, y);
        y = doc.y + 1;
      }
    } else {
      doc.font('Helvetica').fontSize(10).fillColor('#94A3B8').text('—', ML, y);
      y = doc.y;
    }

    if (quote.deal) {
      y += 4;
      doc.font('Helvetica').fontSize(8).fillColor('#94A3B8')
        .text(`Deal: ${quote.deal.title}`, ML, y);
      y = doc.y;
    }

    // ── LINE ITEMS TABLE ───────────────────────────────────────────────────
    y += 18;
    const COL = {
      num:   { x: ML,       w: 22 },
      desc:  { x: ML + 22,  w: 195 },
      qty:   { x: ML + 217, w: 38 },
      rate:  { x: ML + 255, w: 72 },
      disc:  { x: ML + 327, w: 38 },
      tax:   { x: ML + 365, w: 38 },
      total: { x: ML + 403, w: 92 },
    };

    // Table header bg
    doc.rect(ML, y, BODY_W, 18).fill('#1E293B');
    const headers = [
      ['#', COL.num],
      ['DESCRIPTION', COL.desc],
      ['QTY', COL.qty],
      ['RATE', COL.rate],
      ['DISC%', COL.disc],
      ['TAX%', COL.tax],
      ['AMOUNT', COL.total],
    ] as [string, { x: number; w: number }][];

    headers.forEach(([label, col]) => {
      const hAlign = label === 'AMOUNT' ? 'right' : ('left' as const);
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#CBD5E1')
        .text(label, col.x + 3, y + 6, { width: col.w - 3, align: hAlign });
    });
    y += 18;

    // Line item rows
    quote.lineItems.forEach((item, idx) => {
      const rowH = 18;
      const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      doc.rect(ML, y, BODY_W, rowH).fill(bg);

      doc.font('Helvetica').fontSize(8).fillColor('#374151');
      doc.text(String(idx + 1), COL.num.x + 3, y + 5, { width: COL.num.w });
      doc.text(item.description, COL.desc.x + 3, y + 5, { width: COL.desc.w - 6, ellipsis: true });
      doc.text(String(item.quantity), COL.qty.x + 3, y + 5, { width: COL.qty.w - 3, align: 'center' });
      doc.text(fmtCurrency(item.unitPrice, quote.currency), COL.rate.x + 3, y + 5, { width: COL.rate.w - 3, align: 'right' });
      doc.text(item.discount ? `${item.discount}%` : '—', COL.disc.x + 3, y + 5, { width: COL.disc.w - 3, align: 'center' });
      doc.text(item.tax ? `${item.tax}%` : '—', COL.tax.x + 3, y + 5, { width: COL.tax.w - 3, align: 'center' });
      doc.font('Helvetica-Bold').text(fmtCurrency(item.total, quote.currency), COL.total.x + 3, y + 5, { width: COL.total.w - 6, align: 'right' });

      y += rowH;
    });

    // Bottom border of table
    doc.moveTo(ML, y).lineTo(W - MR, y).lineWidth(0.5).stroke('#E2E8F0');

    // ── TOTALS ─────────────────────────────────────────────────────────────
    y += 12;
    const totX = ML + BODY_W - 200;
    const totW = 200;

    const totRows: [string, number, boolean][] = [
      ['Subtotal', quote.subtotal, false],
      ['Discount', -quote.discount, false],
      ['Tax', quote.tax, false],
    ];

    totRows.forEach(([label, val, _]) => {
      doc.font('Helvetica').fontSize(9).fillColor('#64748B').text(label, totX, y, { width: 100 });
      doc.font('Helvetica').fontSize(9).fillColor(val < 0 ? '#EF4444' : '#374151')
        .text(fmtCurrency(Math.abs(val), quote.currency), totX + 100, y, { width: 100, align: 'right' });
      y += 16;
    });

    // Total line
    doc.moveTo(totX, y).lineTo(totX + totW, y).lineWidth(1).stroke('#CBD5E1');
    y += 6;
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#1E293B')
      .text('TOTAL', totX, y, { width: 100 });
    doc.font('Helvetica-Bold').fontSize(12)
      .fillColor(`rgb(${typeColor.join(',')})`)
      .text(fmtCurrency(quote.total, quote.currency), totX + 100, y, { width: 100, align: 'right' });
    y += 24;

    // ── PAYMENT TERMS ──────────────────────────────────────────────────────
    if (quote.paymentTerm) {
      doc.moveTo(ML, y).lineTo(W - MR, y).lineWidth(0.5).stroke('#E2E8F0');
      y += 12;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#94A3B8')
        .text('PAYMENT TERMS', ML, y);
      y += 12;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#1E293B')
        .text(quote.paymentTerm.name, ML, y);
      y = doc.y + 4;
      doc.font('Helvetica').fontSize(8).fillColor('#374151')
        .text(quote.paymentTerm.content, ML, y, { width: BODY_W });
      y = doc.y + 10;
    }

    // ── NOTES ──────────────────────────────────────────────────────────────
    if (quote.notes) {
      doc.moveTo(ML, y).lineTo(W - MR, y).lineWidth(0.5).stroke('#E2E8F0');
      y += 12;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#94A3B8').text('NOTES', ML, y);
      y += 12;
      doc.font('Helvetica').fontSize(9).fillColor('#374151')
        .text(quote.notes, ML, y, { width: BODY_W });
      y = doc.y + 10;
    }

    // ── FOOTER ─────────────────────────────────────────────────────────────
    const footerY = 800;
    doc.moveTo(ML, footerY).lineTo(W - MR, footerY).lineWidth(0.5).stroke('#E2E8F0');
    doc.font('Helvetica').fontSize(8).fillColor('#94A3B8')
      .text(
        `Generated by NexusCRM  |  ${quote.quoteNumber}  |  ${fmtDate(new Date())}`,
        ML, footerY + 8, { width: BODY_W, align: 'center' }
      );

    doc.end();
  });
}
