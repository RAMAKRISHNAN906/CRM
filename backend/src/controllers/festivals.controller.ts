import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { z } from 'zod';
import { sendEmail, isEmailConfigured } from '../services/email.service';
import { sendWhatsApp, isWhatsAppConfigured, whatsAppProvider } from '../services/whatsapp.service';

const festivalSchema = z.object({
  name: z.string().min(1),
  date: z.string(),
  country: z.string(),
  isRecurring: z.boolean().default(true),
  sendDaysBefore: z.number().int().min(0).max(30).default(0),
  isAutoSend: z.boolean().default(false),
  targetAll: z.boolean().default(true),
  targetTags: z.array(z.string()).default([]),
  emoji: z.string().default('🎉'),
  scheduledAt: z.string().optional().nullable(),
  whatsappMessage: z.string().optional().nullable(),
  emailSubject: z.string().optional().nullable(),
  emailMessage: z.string().optional().nullable(),
});

const messageSchema = z.object({
  language: z.string().default('en'),
  messageTemplate: z.string(),
  channel: z.enum(['EMAIL', 'SMS', 'WHATSAPP']).default('EMAIL'),
  isActive: z.boolean().default(true),
});

const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
});

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

function currentYear() { return new Date().getFullYear(); }

// ── Global Customers ──────────────────────────────────────────────────────────
export const getCustomers = async (_req: Request, res: Response) => {
  try {
    const data = await prisma.festivalCustomer.findMany({ orderBy: { createdAt: 'asc' } });
    res.json({ data });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

export const addCustomer = async (req: Request, res: Response) => {
  try {
    const body = customerSchema.parse(req.body);
    const customer = await prisma.festivalCustomer.create({ data: body as any });
    res.status(201).json({ data: customer });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    await prisma.festivalCustomer.delete({ where: { id: req.params.customerId } });
    res.json({ data: { success: true } });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
};

// ── GET /festivals ────────────────────────────────────────────────────────────
export const getFestivals = async (_req: Request, res: Response) => {
  try {
    const data = await prisma.festival.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        messages: true,
        _count: { select: { sendLogs: true } },
      },
    });
    res.json({ data });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

// ── GET /festivals/stats ──────────────────────────────────────────────────────
export const getFestivalStats = async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 86400000);

    const [total, upcoming, totalSent, autoEnabled, scheduledCount, customerCount] = await Promise.all([
      prisma.festival.count(),
      prisma.festival.count({ where: { date: { gte: now, lte: thirtyDays } } }),
      prisma.festivalSendLog.count(),
      prisma.festival.count({ where: { isAutoSend: true } }),
      prisma.festival.count({ where: { scheduledAt: { not: null }, isSent: false } }),
      prisma.festivalCustomer.count(),
    ]);

    const nextFestival = await prisma.festival.findFirst({
      where: { date: { gte: now } },
      orderBy: { date: 'asc' },
      select: { name: true, date: true, emoji: true },
    });

    res.json({
      data: {
        total, upcoming, totalSent, autoEnabled, scheduledCount, customerCount,
        nextFestival,
        emailConfigured: isEmailConfigured(),
        whatsappConfigured: isWhatsAppConfigured(),
        whatsappProvider: whatsAppProvider(),
      },
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

// ── GET /festivals/:id/logs ───────────────────────────────────────────────────
export const getSendLogs = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.festivalSendLog.findMany({
      where: { festivalId: req.params.id },
      orderBy: { sentAt: 'desc' },
      take: 100,
    });
    const contactIds = [...new Set(logs.map((l) => l.contactId))];
    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds } },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });
    const contactMap = Object.fromEntries(contacts.map((c) => [c.id, c]));
    const enriched = logs.map((l) => ({ ...l, contact: contactMap[l.contactId] ?? null }));
    res.json({ data: enriched });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

// ── POST /festivals ───────────────────────────────────────────────────────────
export const createFestival = async (req: Request, res: Response) => {
  try {
    const body = festivalSchema.parse(req.body);
    const festival = await prisma.festival.create({
      data: {
        ...body,
        date: new Date(body.date),
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        targetTags: body.targetTags,
      } as any,
      include: { messages: true, _count: { select: { sendLogs: true } } },
    });
    res.status(201).json({ data: festival });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
};

// ── PUT /festivals/:id ────────────────────────────────────────────────────────
export const updateFestival = async (req: Request, res: Response) => {
  try {
    const body = festivalSchema.partial().parse(req.body);
    const festival = await prisma.festival.update({
      where: { id: req.params.id },
      data: {
        ...body,
        date: body.date ? new Date(body.date) : undefined,
        scheduledAt: body.scheduledAt !== undefined ? (body.scheduledAt ? new Date(body.scheduledAt) : null) : undefined,
      } as any,
      include: { messages: true, _count: { select: { sendLogs: true } } },
    });
    res.json({ data: festival });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
};

// ── DELETE /festivals/:id ─────────────────────────────────────────────────────
export const deleteFestival = async (req: Request, res: Response) => {
  try {
    await prisma.festival.delete({ where: { id: req.params.id } });
    res.json({ data: { success: true } });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
};

// ── Message templates ─────────────────────────────────────────────────────────
export const addMessage = async (req: Request, res: Response) => {
  try {
    const body = messageSchema.parse(req.body);
    const msg = await prisma.festivalMessage.create({ data: { ...body, festivalId: req.params.id } as any });
    res.status(201).json({ data: msg });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
};

export const updateMessage = async (req: Request, res: Response) => {
  try {
    const body = messageSchema.partial().parse(req.body);
    const msg = await prisma.festivalMessage.update({ where: { id: req.params.msgId }, data: body });
    res.json({ data: msg });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
};

export const deleteMessage = async (req: Request, res: Response) => {
  try {
    await prisma.festivalMessage.delete({ where: { id: req.params.msgId } });
    res.json({ data: { success: true } });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
};

// ── POST /festivals/:id/preview ───────────────────────────────────────────────
export const previewGreeting = async (req: Request, res: Response) => {
  try {
    const { language = 'en', channel = 'EMAIL' } = req.body;
    const festival = await prisma.festival.findUnique({ where: { id: req.params.id }, include: { messages: true } });
    if (!festival) return res.status(404).json({ error: 'Festival not found' });

    const msg = festival.messages.find((m) => m.language === language && m.channel === channel)
      ?? festival.messages.find((m) => m.language === 'en' && m.channel === channel)
      ?? festival.messages[0];

    if (!msg) return res.status(404).json({ error: 'No template for this language/channel' });

    const preview = renderTemplate(msg.messageTemplate, { name: 'John Smith', festival: festival.name, company: 'Acme Corp' });
    res.json({ data: { preview, template: msg.messageTemplate } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

// ── Core: send greeting to a single customer ──────────────────────────────────
async function sendGreetingToCustomer(
  festival: { id: string; name: string; emoji: string; emailSubject: string | null; emailMessage: string | null; whatsappMessage: string | null },
  customer: { name: string; email?: string | null; phone?: string | null },
  customMessage: string | null,
): Promise<{ emailStatus: string; whatsappStatus: string; emailError: string | null; whatsappError: string | null }> {
  const vars = { name: customer.name, festival: festival.name, emoji: festival.emoji };

  const defaultMsg = `Dear {name},\n\nWishing you a wonderful ${festival.name}! ${festival.emoji}\n\nWarm regards,\nNexusCRM Team`;
  const defaultWhatsApp = `Happy ${festival.name} ${festival.emoji}, dear {name}! 🎊`;

  // Priority: customMessage typed by user > festival.emailMessage saved > default
  const emailBody = customMessage ?? festival.emailMessage ?? defaultMsg;
  const emailSubject = festival.emailSubject ?? `${festival.emoji} Happy ${festival.name}!`;
  const whatsappBody = customMessage ?? festival.whatsappMessage ?? defaultWhatsApp;

  let emailStatus = 'skipped', emailError: string | null = null;
  let whatsappStatus = 'skipped', whatsappError: string | null = null;

  if (customer.email) {
    if (!isEmailConfigured()) {
      emailStatus = 'failed'; emailError = 'SMTP not configured';
    } else {
      try {
        await sendEmail({ to: customer.email, subject: renderTemplate(emailSubject, vars), body: renderTemplate(emailBody, vars) });
        emailStatus = 'sent';
      } catch (e: any) { emailStatus = 'failed'; emailError = e.message; }
    }
  }

  if (customer.phone) {
    if (!isWhatsAppConfigured()) {
      whatsappStatus = 'skipped';
    } else {
      try {
        await sendWhatsApp(customer.phone, renderTemplate(whatsappBody, vars));
        whatsappStatus = 'sent';
      } catch (e: any) { whatsappStatus = 'failed'; whatsappError = e.message; }
    }
  }

  return { emailStatus, whatsappStatus, emailError, whatsappError };
}

// ── POST /festivals/:id/send-now ──────────────────────────────────────────────
// Body: { message?: string }  — optional override message (typed by user in UI)
export const sendToRecipientsNow = async (req: Request, res: Response) => {
  try {
    const festival = await prisma.festival.findUnique({ where: { id: req.params.id } });
    if (!festival) return res.status(404).json({ error: 'Festival not found' });

    const customers = await prisma.festivalCustomer.findMany({ orderBy: { createdAt: 'asc' } });
    if (customers.length === 0) return res.status(400).json({ error: 'No customers added yet. Add customers first.' });

    const customMessage: string | null = req.body?.message?.trim() || null;

    // If a custom message was provided, save it back to the festival for future reference
    if (customMessage) {
      await prisma.festival.update({
        where: { id: festival.id },
        data: { emailMessage: customMessage, whatsappMessage: customMessage } as any,
      });
    }

    let emailSent = 0, whatsappSent = 0, failed = 0;

    for (const customer of customers) {
      const result = await sendGreetingToCustomer(festival as any, customer, customMessage);
      if (result.emailStatus === 'sent') emailSent++;
      if (result.whatsappStatus === 'sent') whatsappSent++;
      if (result.emailStatus === 'failed' || result.whatsappStatus === 'failed') failed++;
    }

    await prisma.festival.update({ where: { id: festival.id }, data: { isSent: true } as any });

    // Admin notification
    const admins = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true }, select: { id: true } });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id, type: 'AUTOMATION',
          title: `${festival.emoji} Greetings sent: ${festival.name}`,
          body: `Email: ${emailSent} sent, WhatsApp: ${whatsappSent} sent to ${customers.length} customers.`,
          link: '/festivals',
        },
      });
    }

    res.json({ data: { emailSent, whatsappSent, failed, total: customers.length } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

// ── POST /festivals/:id/schedule ──────────────────────────────────────────────
// Body: { scheduledAt: string, message?: string }
export const scheduleFestival = async (req: Request, res: Response) => {
  try {
    const { scheduledAt, message } = req.body;
    if (!scheduledAt) return res.status(400).json({ error: 'scheduledAt is required' });

    const festival = await prisma.festival.update({
      where: { id: req.params.id },
      data: {
        scheduledAt: new Date(scheduledAt),
        isSent: false,
        ...(message?.trim() ? { emailMessage: message.trim(), whatsappMessage: message.trim() } : {}),
      } as any,
    });
    res.json({ data: festival });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
};

// ── Core send logic (tag-based, reused by auto-scheduler) ────────────────────
export async function executeFestivalSend(festivalId: string, triggeredByUserId: string): Promise<{ sent: number; skipped: number; failed: number }> {
  const festival = await prisma.festival.findUnique({
    where: { id: festivalId },
    include: { messages: { where: { isActive: true } } },
  });
  if (!festival) throw new Error('Festival not found');

  const year = currentYear();
  const targetTags = (festival.targetTags as string[]) ?? [];
  const contactWhere: any = { deletedAt: null };
  const contacts = await prisma.contact.findMany({
    where: contactWhere,
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, preferredLanguage: true, tags: true, company: true },
  });

  const filtered = festival.targetAll
    ? contacts
    : contacts.filter((c) => {
        const tags = (c.tags as string[]) ?? [];
        return targetTags.some((t) => tags.includes(t));
      });

  let sent = 0, skipped = 0, failed = 0;

  for (const contact of filtered) {
    const lang = contact.preferredLanguage ?? 'en';
    for (const msg of festival.messages) {
      const template = festival.messages.find((m) => m.language === lang && m.channel === msg.channel)
        ?? festival.messages.find((m) => m.language === 'en' && m.channel === msg.channel) ?? msg;

      const alreadySent = await prisma.festivalSendLog.findFirst({ where: { festivalId, contactId: contact.id, channel: msg.channel, year } });
      if (alreadySent) { skipped++; continue; }

      const body = renderTemplate(template.messageTemplate, {
        name: `${contact.firstName} ${contact.lastName}`, festival: festival.name, company: contact.company ?? '', emoji: festival.emoji,
      });

      try {
        await prisma.communication.create({
          data: {
            channel: msg.channel as any, subject: `${festival.emoji} Happy ${festival.name}!`, body,
            direction: 'outbound', status: 'sent', sentAt: new Date(), activityStatus: 'completed',
            metadata: { isFestivalGreeting: true, festivalId, year }, userId: triggeredByUserId, contactId: contact.id,
          },
        });
        await prisma.festivalSendLog.create({ data: { festivalId, contactId: contact.id, channel: msg.channel, messageBody: body, year, status: 'sent' } });
        sent++;
      } catch { failed++; }
      break;
    }
  }

  return { sent, skipped, failed };
}

// ── POST /festivals/:id/send — legacy manual trigger ─────────────────────────
export const sendFestivalGreetings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId ?? (req as any).user?.id;
    const result = await executeFestivalSend(req.params.id, userId);
    res.json({ data: result });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};
