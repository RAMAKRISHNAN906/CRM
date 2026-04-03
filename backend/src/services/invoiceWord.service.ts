import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, WidthType, AlignmentType, BorderStyle, ShadingType,
  HeadingLevel, VerticalAlign, TableLayoutType, PageBreak,
} from 'docx';
import { prisma } from '../config/prisma';

// Use Rs. prefix — universally supported in Word fonts
function fmt(n: number, currency = 'INR'): string {
  const sym: Record<string, string> = { INR: 'Rs. ', USD: '$ ', EUR: 'EUR ', GBP: 'GBP ', AED: 'AED ' };
  return (sym[currency] ?? currency + ' ') + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d?: string | Date | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const NONE_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = { top: NONE_BORDER, bottom: NONE_BORDER, left: NONE_BORDER, right: NONE_BORDER };

// Header cell (dark background, white bold text)
function hCell(text: string, width: number, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.SOLID, color: '1e1e32', fill: '1e1e32' },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 18 })],
    })],
  });
}

// Data cell
function dCell(
  text: string, width: number,
  align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT,
  shade = false, bold = false, color = '2a2a42',
): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: shade ? { type: ShadingType.SOLID, color: 'F5F5FA', fill: 'F5F5FA' } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 70, bottom: 70, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text, bold, size: 19, color })],
    })],
  });
}

// Colored band cell (total / balance due)
function bandCell(text: string, width: number, bgColor: string, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.SOLID, color: bgColor, fill: bgColor },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text, bold: true, size: 22, color: 'FFFFFF' })],
    })],
  });
}

// Simple label/value row for totals section
function totalRow(label: string, value: string, bold = false, valueColor = '606080'): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 5800, type: WidthType.DXA },
        borders: NO_BORDERS,
        margins: { top: 60, bottom: 60, right: 100 },
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: label, size: 19, color: '888888' })],
        })],
      }),
      new TableCell({
        width: { size: 3200, type: WidthType.DXA },
        borders: NO_BORDERS,
        margins: { top: 60, bottom: 60, right: 0 },
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: value, bold, size: 19, color: valueColor })],
        })],
      }),
    ],
  });
}

export async function generateInvoiceDocx(invoiceId: string): Promise<Buffer> {
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
  const companyName = settings?.companyName ?? 'NexusCRM';

  const sections: any[] = [];

  // ── Company name + address ─────────────────────────────────────────────────
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: companyName, bold: true, size: 48, color: '1e1e32' })],
      spacing: { after: 60 },
    }),
  );
  if (settings?.footerAddress) {
    sections.push(new Paragraph({
      children: [new TextRun({ text: settings.footerAddress, size: 17, color: '888888' })],
      spacing: { after: 200 },
    }));
  }

  // ── Invoice title + number ─────────────────────────────────────────────────
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: `INVOICE`, bold: true, size: 38, color: '166340' })],
    }),
    new Paragraph({
      children: [new TextRun({ text: invoice.invoiceNumber, size: 22, color: '444466' })],
      spacing: { after: 240 },
    }),
  );

  // ── Status + dates (borderless table for alignment) ────────────────────────
  sections.push(
    new Table({
      layout: TableLayoutType.FIXED,
      width: { size: 9000, type: WidthType.DXA },
      borders: {
        top: NONE_BORDER, bottom: NONE_BORDER,
        left: NONE_BORDER, right: NONE_BORDER,
        insideHorizontal: NONE_BORDER, insideVertical: NONE_BORDER,
      },
      rows: [
        new TableRow({ children: [
          // Status pill (shaded)
          new TableCell({
            width: { size: 1600, type: WidthType.DXA },
            shading: { type: ShadingType.SOLID, color: '444466', fill: '444466' },
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: invoice.status, bold: true, size: 18, color: 'FFFFFF' })],
            })],
          }),
          dCell('', 200),  // spacer
          new TableCell({
            width: { size: 2400, type: WidthType.DXA },
            borders: NO_BORDERS,
            children: [
              new Paragraph({ children: [new TextRun({ text: 'Issue Date', size: 16, color: '999999' })] }),
              new Paragraph({ children: [new TextRun({ text: fmtDate(invoice.createdAt), bold: true, size: 20, color: '282840' })] }),
            ],
          }),
          new TableCell({
            width: { size: 2400, type: WidthType.DXA },
            borders: NO_BORDERS,
            children: [
              new Paragraph({ children: [new TextRun({ text: 'Due Date', size: 16, color: '999999' })] }),
              new Paragraph({ children: [new TextRun({ text: fmtDate(invoice.dueDate), bold: true, size: 20, color: '282840' })] }),
            ],
          }),
          new TableCell({
            width: { size: 2400, type: WidthType.DXA },
            borders: NO_BORDERS,
            children: [
              new Paragraph({ children: [new TextRun({ text: invoice.deal?.title ? 'Project' : '', size: 16, color: '999999' })] }),
              new Paragraph({ children: [new TextRun({ text: invoice.deal?.title ?? '', bold: true, size: 20, color: '282840' })] }),
            ],
          }),
        ]}),
      ],
    }),
    new Paragraph({ spacing: { after: 320 } }),
  );

  // ── Line items table ───────────────────────────────────────────────────────
  // Total usable DXA width = 9000
  // Description=4600, Qty=900, Unit Price=1700, Amount=1800
  const lineRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        hCell('DESCRIPTION', 4600, AlignmentType.LEFT),
        hCell('QTY',         900,  AlignmentType.CENTER),
        hCell('UNIT PRICE',  1700, AlignmentType.RIGHT),
        hCell('AMOUNT',      1800, AlignmentType.RIGHT),
      ],
    }),
    ...invoice.lineItems.map((item, i) =>
      new TableRow({ children: [
        dCell(item.description,              4600, AlignmentType.LEFT,   i % 2 === 1),
        dCell(String(item.quantity),         900,  AlignmentType.CENTER, i % 2 === 1),
        dCell(fmt(item.unitPrice, currency), 1700, AlignmentType.RIGHT,  i % 2 === 1),
        dCell(fmt(item.total, currency),     1800, AlignmentType.RIGHT,  i % 2 === 1, true),
      ]}),
    ),
  ];

  sections.push(
    new Table({
      layout: TableLayoutType.FIXED,
      width: { size: 9000, type: WidthType.DXA },
      rows: lineRows,
    }),
    new Paragraph({ spacing: { after: 240 } }),
  );

  // ── Totals block ───────────────────────────────────────────────────────────
  const tRows: TableRow[] = [];
  tRows.push(totalRow('Subtotal', fmt(invoice.subtotal, currency)));
  if (invoice.discount > 0)
    tRows.push(totalRow('Discount', `-${fmt(invoice.discount, currency)}`, false, 'EF4444'));
  if (invoice.tax > 0)
    tRows.push(totalRow('Tax / GST', `+${fmt(invoice.tax, currency)}`, false, '16A34A'));

  // Total band row
  tRows.push(new TableRow({ children: [
    bandCell('TOTAL', 5800, '166340', AlignmentType.LEFT),
    bandCell(fmt(invoice.total, currency), 3200, '166340', AlignmentType.RIGHT),
  ]}));

  // Balance due row
  if (due > 0 && invoice.status !== 'PAID') {
    tRows.push(new TableRow({ children: [
      bandCell('BALANCE DUE', 5800, 'EF4444', AlignmentType.LEFT),
      bandCell(fmt(due, currency), 3200, 'EF4444', AlignmentType.RIGHT),
    ]}));
  }

  sections.push(
    new Table({
      layout: TableLayoutType.FIXED,
      width: { size: 9000, type: WidthType.DXA },
      rows: tRows,
    }),
    new Paragraph({ spacing: { after: 400 } }),
  );

  // ── Payment history ────────────────────────────────────────────────────────
  const completedPayments = invoice.payments?.filter(p => p.status === 'COMPLETED') ?? [];
  if (completedPayments.length > 0) {
    sections.push(new Paragraph({
      children: [new TextRun({ text: 'PAYMENTS RECEIVED', bold: true, size: 18, color: '444466' })],
      spacing: { after: 100 },
    }));
    completedPayments.forEach(p => {
      sections.push(new Paragraph({
        children: [
          new TextRun({ text: `${fmtDate(p.paidAt)}  ${p.method ?? ''}`, size: 17, color: '666688' }),
          new TextRun({ text: `   ${fmt(p.amount, currency)}`, bold: true, size: 17, color: '16A34A' }),
        ],
        spacing: { after: 60 },
      }));
    });
    sections.push(new Paragraph({ spacing: { after: 200 } }));
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  if (invoice.notes) {
    sections.push(
      new Paragraph({ children: [new TextRun({ text: 'Notes', bold: true, size: 18, color: '444466' })], spacing: { after: 60 } }),
      new Paragraph({ children: [new TextRun({ text: invoice.notes, size: 17, color: '666688' })], spacing: { after: 300 } }),
    );
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: `Generated by NexusCRM  |  ${new Date().toLocaleDateString('en-IN')}`, size: 15, color: 'BBBBCC' })],
    }),
  );

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 20 } },
      },
    },
    sections: [{ children: sections }],
  });

  return Packer.toBuffer(doc);
}
