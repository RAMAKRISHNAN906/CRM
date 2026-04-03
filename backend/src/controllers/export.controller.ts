import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

// ── CSV helper ─────────────────────────────────────────────────────────────
function toCSV(rows: Record<string, any>[], columns: string[]): string {
  const header = columns.join(',');
  const lines = rows.map((row) =>
    columns
      .map((col) => {
        const val = row[col] ?? '';
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
      })
      .join(',')
  );
  return [header, ...lines].join('\n');
}

// GET /export/leads?format=csv|json
export const exportLeads = async (req: Request, res: Response) => {
  try {
    const fmt = (req.query.format as string) || 'csv';
    const role = (req as any).user.role;
    const userId = (req as any).user.id;

    const isManager = ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(role);
    const where: any = { deletedAt: null };
    if (!isManager) where.OR = [{ ownerId: userId }, { assigneeId: userId }];

    const leads = await prisma.lead.findMany({
      where,
      include: { owner: { select: { name: true } }, assignee: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const rows = leads.map((l) => ({
      id: l.id,
      firstName: l.firstName,
      lastName: l.lastName,
      email: l.email ?? '',
      phone: l.phone ?? '',
      company: l.company ?? '',
      status: l.status,
      source: l.source,
      score: l.score,
      value: l.value ?? 0,
      owner: l.owner?.name ?? '',
      assignee: l.assignee?.name ?? '',
      createdAt: l.createdAt.toISOString(),
    }));

    if (fmt === 'json') {
      res.setHeader('Content-Disposition', 'attachment; filename="leads.json"');
      return res.json(rows);
    }

    const csv = toCSV(rows, [
      'id', 'firstName', 'lastName', 'email', 'phone', 'company',
      'status', 'source', 'score', 'value', 'owner', 'assignee', 'createdAt',
    ]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /export/deals?format=csv|json
export const exportDeals = async (req: Request, res: Response) => {
  try {
    const fmt = (req.query.format as string) || 'csv';
    const role = (req as any).user.role;
    const userId = (req as any).user.id;

    const isManager = ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(role);
    const where: any = { deletedAt: null };
    if (!isManager) where.OR = [{ ownerId: userId }, { assigneeId: userId }];

    const deals = await prisma.deal.findMany({
      where,
      include: {
        owner: { select: { name: true } },
        contact: { select: { firstName: true, lastName: true } },
        pipelineStage: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = deals.map((d) => ({
      id: d.id,
      title: d.title,
      stage: d.pipelineStage?.name ?? d.stage,
      value: d.value,
      currency: d.currency,
      probability: d.probability,
      contact: d.contact ? `${d.contact.firstName} ${d.contact.lastName}` : '',
      owner: d.owner?.name ?? '',
      expectedClose: d.expectedClose?.toISOString() ?? '',
      createdAt: d.createdAt.toISOString(),
    }));

    if (fmt === 'json') {
      res.setHeader('Content-Disposition', 'attachment; filename="deals.json"');
      return res.json(rows);
    }

    const csv = toCSV(rows, [
      'id', 'title', 'stage', 'value', 'currency', 'probability',
      'contact', 'owner', 'expectedClose', 'createdAt',
    ]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="deals.csv"');
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /export/reports/country?format=csv|json
export const exportCountryReport = async (req: Request, res: Response) => {
  try {
    const fmt = (req.query.format as string) || 'csv';

    const leads = await prisma.lead.groupBy({
      by: ['company'],
      _count: true,
      where: { deletedAt: null },
    });

    // Deals by contact country
    const contacts = await prisma.contact.findMany({
      where: { deletedAt: null },
      select: { country: true, deals: { select: { value: true } } },
    });

    const countryMap: Record<string, { leads: number; deals: number; revenue: number }> = {};
    contacts.forEach((c) => {
      const key = c.country ?? 'Unknown';
      if (!countryMap[key]) countryMap[key] = { leads: 0, deals: 0, revenue: 0 };
      countryMap[key].deals += c.deals.length;
      countryMap[key].revenue += c.deals.reduce((s, d) => s + d.value, 0);
    });

    const rows = Object.entries(countryMap).map(([country, data]) => ({
      country,
      ...data,
    }));

    if (fmt === 'json') {
      res.setHeader('Content-Disposition', 'attachment; filename="country-report.json"');
      return res.json(rows);
    }

    const csv = toCSV(rows, ['country', 'leads', 'deals', 'revenue']);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="country-report.csv"');
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
