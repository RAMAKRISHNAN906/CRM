import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { z } from 'zod';

const settingsSchema = z.object({
  companyName: z.string().min(1),
  logoUrl: z.string().optional(),
  footerAddress: z.string().optional(),
  country: z.string().default('IN'),
  currency: z.string().default('INR'),
  taxNumber: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
});

// GET /settings/company
export const getCompanySettings = async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.companySettings.findFirst();
    res.json({ data: settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /settings/company  (upsert — there's only one company settings record)
export const upsertCompanySettings = async (req: Request, res: Response) => {
  try {
    const body = settingsSchema.parse(req.body);
    const existing = await prisma.companySettings.findFirst();

    const settings = existing
      ? await prisma.companySettings.update({ where: { id: existing.id }, data: body })
      : await prisma.companySettings.create({ data: body });

    res.json({ data: settings });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// GET /settings/languages
export const getLanguages = async (_req: Request, res: Response) => {
  try {
    const langs = await prisma.language.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json({ data: langs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// POST /settings/languages
export const createLanguage = async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      code: z.string().min(2).max(5),
      name: z.string(),
      direction: z.enum(['ltr', 'rtl']).default('ltr'),
      isActive: z.boolean().default(true),
    });
    const body = schema.parse(req.body);
    const lang = await prisma.language.upsert({
      where: { code: body.code },
      create: body,
      update: body,
    });
    res.status(201).json({ data: lang });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
