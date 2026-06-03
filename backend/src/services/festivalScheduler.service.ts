/**
 * Festival Scheduler
 *
 * Checks every minute for:
 * 1. Festivals with scheduledAt <= now AND isSent = false
 *    → sends Email + WhatsApp to each FestivalRecipient
 *
 * 2. Festivals with isAutoSend = true (existing tag-based contact send)
 *    → fires on triggerDate = festivalDate - sendDaysBefore (daily check)
 */

import { prisma } from '../config/prisma';
import { sendEmail, isEmailConfigured } from './email.service';
import { sendWhatsApp, isWhatsAppConfigured } from './whatsapp.service';
import { executeFestivalSend } from '../controllers/festivals.controller';

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

async function getSystemUserId(): Promise<string> {
  const admin = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!admin) throw new Error('No admin user found');
  return admin.id;
}

// ── Direct recipient send (scheduledAt) ──────────────────────────────────────
async function runScheduledSend(): Promise<void> {
  const now = new Date();

  const due = await prisma.festival.findMany({
    where: { scheduledAt: { lte: now }, isSent: false },
    include: { recipients: true },
  });

  for (const festival of due) {
    // Mark as sent IMMEDIATELY before sending to prevent re-fires if process is slow
    await prisma.festival.update({ where: { id: festival.id }, data: { isSent: true } });
    console.log(`[FestivalScheduler] Sending "${festival.name}" to ${festival.recipients.length} recipient(s)`);

    let emailSentCount = 0, whatsappSentCount = 0, failedCount = 0;

    const defaultEmailSubject = `${festival.emoji} Happy ${festival.name}!`;
    const defaultEmailBody = `Dear {name},\n\nWishing you a wonderful ${festival.name}! ${festival.emoji}\n\nWarm regards,\nNexusCRM Team`;
    const defaultWhatsApp = `Happy ${festival.name} ${festival.emoji}, dear {name}! Wishing you joy and happiness. 🎊`;

    const emailBody = festival.emailMessage ?? defaultEmailBody;
    const emailSubject = festival.emailSubject ?? defaultEmailSubject;
    const whatsappBody = festival.whatsappMessage ?? defaultWhatsApp;

    // Use global customer list
    const allCustomers = await prisma.festivalCustomer.findMany({ orderBy: { createdAt: 'asc' } });
    if (allCustomers.length === 0) {
      console.log(`[FestivalScheduler] "${festival.name}" — no customers, marking sent`);
      await prisma.festival.update({ where: { id: festival.id }, data: { isSent: true } });
      continue;
    }

    for (const recipient of allCustomers) {
      const vars = { name: recipient.name, festival: festival.name, emoji: festival.emoji };

      // ── Email ──────────────────────────────────────────────────────────────
      if (recipient.email && isEmailConfigured()) {
        try {
          await sendEmail({
            to: recipient.email,
            subject: renderTemplate(emailSubject, vars),
            body: renderTemplate(emailBody, vars),
          });
          emailSentCount++;
        } catch (err: any) {
          failedCount++;
          console.error(`[FestivalScheduler] Email failed for ${recipient.email}:`, err.message);
        }
      }

      // ── WhatsApp ───────────────────────────────────────────────────────────
      if (recipient.phone && isWhatsAppConfigured()) {
        try {
          await sendWhatsApp(recipient.phone, renderTemplate(whatsappBody, vars));
          whatsappSentCount++;
        } catch (err: any) {
          failedCount++;
          console.error(`[FestivalScheduler] WhatsApp failed for ${recipient.phone}:`, err.message);
        }
      }
    }

    // Mark festival as sent — MUST happen regardless of per-recipient errors
    await prisma.festival.update({ where: { id: festival.id }, data: { isSent: true } });

    // Notify admins
    const summary = `Email: ${emailSentCount} sent, WhatsApp: ${whatsappSentCount} sent, ${failedCount} failed.`;
    console.log(`[FestivalScheduler] "${festival.name}" done — ${summary}`);

    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true },
      select: { id: true },
    });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'AUTOMATION',
          title: `${festival.emoji} Festival sent: ${festival.name}`,
          body: summary,
          link: '/festivals',
        },
      });
    }
  }
}

// ── Legacy tag-based auto-send (daily) ───────────────────────────────────────
let lastDailyCheck = 0;

async function runDailyAutoSend(): Promise<void> {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const festivals = await prisma.festival.findMany({ where: { isAutoSend: true } });

  for (const festival of festivals) {
    const festDate = new Date(festival.date);
    let targetDate = new Date(festDate);

    if (festival.isRecurring) {
      targetDate.setFullYear(now.getFullYear());
      if (targetDate < now) targetDate.setFullYear(now.getFullYear() + 1);
    }

    const triggerDate = new Date(targetDate);
    triggerDate.setDate(triggerDate.getDate() - festival.sendDaysBefore);
    const triggerStr = `${triggerDate.getFullYear()}-${String(triggerDate.getMonth() + 1).padStart(2, '0')}-${String(triggerDate.getDate()).padStart(2, '0')}`;

    if (triggerStr !== todayStr) continue;

    console.log(`[FestivalScheduler] Auto-send "${festival.name}" (tag-based, trigger: ${triggerStr})`);

    try {
      const userId = await getSystemUserId();
      const result = await executeFestivalSend(festival.id, userId);
      console.log(`[FestivalScheduler] "${festival.name}" — sent:${result.sent} skipped:${result.skipped} failed:${result.failed}`);

      const admins = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true },
        select: { id: true },
      });
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'AUTOMATION',
            title: `${festival.emoji} Festival greetings sent: ${festival.name}`,
            body: `Sent ${result.sent}, skipped ${result.skipped}, failed ${result.failed}.`,
            link: '/festivals',
          },
        });
      }
    } catch (err) {
      console.error(`[FestivalScheduler] Error in auto-send "${festival.name}":`, err);
    }
  }
}

// ── Main tick (every minute) ──────────────────────────────────────────────────
async function tick(): Promise<void> {
  await runScheduledSend().catch((e) => console.error('[FestivalScheduler] runScheduledSend error:', e));

  // Run daily auto-send once per hour (not every minute)
  const hourMs = 3600000;
  if (Date.now() - lastDailyCheck > hourMs) {
    lastDailyCheck = Date.now();
    await runDailyAutoSend().catch((e) => console.error('[FestivalScheduler] runDailyAutoSend error:', e));
  }
}

export function startFestivalScheduler(_intervalHours = 24): NodeJS.Timeout {
  console.log('[FestivalScheduler] Started — checking every 60 seconds for scheduled sends');
  tick(); // run immediately on startup
  return setInterval(tick, 60_000); // every minute
}
