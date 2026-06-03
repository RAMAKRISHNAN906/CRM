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

const productInputSchema = z.object({
  name: z.string().trim().min(1),
  value: z.coerce.number().optional().default(0),
});

const productGroupSchema = z.object({
  name: z.string().trim().min(1),
  products: z.array(productInputSchema).default([]),
});

const productCategorySchema = z.object({
  name: z.string().trim().min(1),
  groups: z.array(productGroupSchema).default([]),
});

const productCatalogSchema = z.object({
  categories: z.array(productCategorySchema).default([]),
});

type ProductCatalogRow = Awaited<ReturnType<typeof prisma.productConfig.findMany>>[number];

const normalizeText = (value: string | null | undefined): string => String(value ?? '').trim();

const buildProductCatalogPayload = (rows: ProductCatalogRow[]) => {
  const categoriesMap = new Map<string, Map<string, Array<{
    id: number;
    name: string;
    value: number;
  }>>>();

  const flatProducts = rows.map((row) => ({
    id: row.id,
    category: row.category,
    group: row.groupName,
    name: row.productName,
    value: Number(row.value || 0),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

  for (const row of rows) {
    const categoryName = normalizeText(row.category);
    const groupName = normalizeText(row.groupName);
    const productName = normalizeText(row.productName);
    if (!categoryName || !groupName || !productName) continue;

    if (!categoriesMap.has(categoryName)) {
      categoriesMap.set(categoryName, new Map());
    }
    const groups = categoriesMap.get(categoryName)!;
    if (!groups.has(groupName)) {
      groups.set(groupName, []);
    }
    groups.get(groupName)!.push({
      id: row.id,
      name: productName,
      value: Number(row.value || 0),
    });
  }

  const categories = Array.from(categoriesMap.entries()).map(([categoryName, groups]) => ({
    name: categoryName,
    groups: Array.from(groups.entries()).map(([groupName, products]) => ({
      name: groupName,
      products,
    })),
  }));

  return { categories, products: flatProducts };
};

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

// ── POST /settings/email/send ─────────────────────────────────────────────────
export const sendCompanyEmail = async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      to:      z.string().email(),
      subject: z.string().min(1),
      body:    z.string().min(1),
      cc:      z.string().optional(),
      bcc:     z.string().optional(),
    });
    const { to, subject, body, cc, bcc } = schema.parse(req.body);

    // Fetch company settings for "from" display name
    const company = await prisma.companySettings.findFirst();
    const fromName = company?.companyName ?? 'NexusCRM';

    // Import email service dynamically to avoid circular deps
    const { sendEmail, isEmailConfigured } = await import('../services/email.service');
    if (!isEmailConfigured()) {
      return res.status(503).json({ success: false, error: 'SMTP not configured. Add SMTP credentials in backend/.env' });
    }

    await sendEmail({ to, subject, body, fromName });

    // Log to Communications
    const userId = (req as any).user?.id;
    if (userId) {
      await prisma.communication.create({
        data: {
          channel:   'EMAIL',
          subject,
          body,
          direction: 'outbound',
          status:    'sent',
          sentAt:    new Date(),
          userId,
          metadata:  { to, cc: cc ?? null, bcc: bcc ?? null, fromName },
        },
      });
    }

    res.json({ success: true, message: `Email sent to ${to}` });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// ── GET /settings/email/sent ──────────────────────────────────────────────────
export const getSentEmails = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const emails = await prisma.communication.findMany({
      where:   { channel: 'EMAIL', direction: 'outbound', ...(userId ? { userId } : {}) },
      orderBy: { sentAt: 'desc' },
      take:    50,
    });
    res.json({ success: true, data: emails });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /settings/products
export const getProductSettings = async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.productConfig.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { groupName: 'asc' },
        { productName: 'asc' },
      ],
    });

    res.json({ success: true, data: buildProductCatalogPayload(rows) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /settings/products
export const upsertProductSettings = async (req: Request, res: Response) => {
  try {
    const payload = productCatalogSchema.parse(req.body);
    const nextRows = payload.categories.flatMap((category) => {
      const categoryName = normalizeText(category.name);
      if (!categoryName) return [];

      return category.groups.flatMap((group) => {
        const groupName = normalizeText(group.name);
        if (!groupName) return [];

        return group.products
          .map((product) => {
            const productName = normalizeText(product.name);
            if (!productName) return null;
            return {
              category: categoryName,
              groupName,
              productName,
              value: Number.isFinite(Number(product.value)) ? Number(product.value) : 0,
              isActive: true,
            };
          })
          .filter((item): item is {
            category: string;
            groupName: string;
            productName: string;
            value: number;
            isActive: boolean;
          } => item !== null);
      });
    });

    await prisma.$transaction(async (tx) => {
      await tx.productConfig.deleteMany({});
      if (nextRows.length > 0) {
        await tx.productConfig.createMany({ data: nextRows });
      }
    });

    const rows = await prisma.productConfig.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { groupName: 'asc' },
        { productName: 'asc' },
      ],
    });

    res.json({ success: true, data: buildProductCatalogPayload(rows) });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};
