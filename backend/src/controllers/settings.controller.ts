import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { z } from 'zod';

const settingsSchema = z.object({
  companyName:        z.string().min(1),
  logoUrl:            z.string().optional(),   // base64 data URL
  footerAddress:      z.string().optional(),
  address:            z.string().optional(),
  city:               z.string().optional(),
  state:              z.string().optional(),
  zipCode:            z.string().optional(),
  country:            z.string().default('IN'),
  currency:           z.string().default('INR'),
  taxNumber:          z.string().optional(),
  phone:              z.string().optional(),
  email:              z.string().optional(),
  website:            z.string().optional(),
  financialYearStart: z.string().default('04'),
});

// GET /settings/company
export const getCompanySettings = async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.companySettings.findFirst();
    res.json({ success: true, data: settings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /settings/company
export const upsertCompanySettings = async (req: Request, res: Response) => {
  try {
    const body = settingsSchema.parse(req.body);
    const existing = await prisma.companySettings.findFirst();
    const settings = existing
      ? await prisma.companySettings.update({ where: { id: existing.id }, data: body })
      : await prisma.companySettings.create({ data: body as any });
    res.json({ success: true, data: settings });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// POST /settings/company/logo  — receives base64 string in body
export const uploadLogo = async (req: Request, res: Response) => {
  try {
    const { logoBase64 } = req.body as { logoBase64: string };
    if (!logoBase64 || !logoBase64.startsWith('data:image/')) {
      return res.status(400).json({ success: false, error: 'Invalid image data' });
    }
    const existing = await prisma.companySettings.findFirst();
    const settings = existing
      ? await prisma.companySettings.update({ where: { id: existing.id }, data: { logoUrl: logoBase64 } })
      : await prisma.companySettings.create({ data: { companyName: 'My Company', logoUrl: logoBase64 } as any });
    res.json({ success: true, data: { logoUrl: settings.logoUrl } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /settings/languages
export const getLanguages = async (_req: Request, res: Response) => {
  try {
    const langs = await prisma.language.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: langs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /settings/languages
export const createLanguage = async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      code:      z.string().min(2).max(5),
      name:      z.string(),
      direction: z.enum(['ltr', 'rtl']).default('ltr'),
      isActive:  z.boolean().default(true),
    });
    const body = schema.parse(req.body);
    const lang = await prisma.language.upsert({
      where:  { code: body.code },
      create: body,
      update: body,
    });
    res.status(201).json({ success: true, data: lang });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};
