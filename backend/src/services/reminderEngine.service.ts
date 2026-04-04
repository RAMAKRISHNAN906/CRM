/**
 * Reminder Engine — runs on a cron schedule (setInterval)
 * Covers:
 *   1. Task reminders        — 1d and 3d before dueDate
 *   2. Meeting reminders     — 1d and 3d before scheduledAt
 *   3. Lead follow-up        — 1d and 3d before followUpDate  ← NEW
 *   4. Opportunity follow-up — 1d and 3d before followUpDate  ← NEW
 *
 * Each reminder creates:
 *   - An in-app Notification record
 *   - A real Email (via email.service) if SMTP configured, else logged
 *   - A real WhatsApp (via whatsapp.service) if provider configured, else logged
 */

import { prisma } from '../config/prisma';
import { sendEmail, isEmailConfigured } from './email.service';
import { sendWhatsApp, whatsAppProvider } from './whatsapp.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WINDOW_MS  = 15 * 60 * 1000;   // 15-min matching window

// ── Helpers ───────────────────────────────────────────────────────────────────

function dateRange(daysAhead: number, now: Date) {
  const target = now.getTime() + daysAhead * MS_PER_DAY;
  return { from: new Date(target - WINDOW_MS), to: new Date(target + WINDOW_MS) };
}

async function reminderAlreadySent(userId: string, key: string): Promise<boolean> {
  const existing = await prisma.notification.findFirst({
    where: { userId, link: key },
  });
  return !!existing;
}

// ── Core send (in-app + real email + real WhatsApp) ───────────────────────────

async function sendReminder(opts: {
  userId: string;
  userName: string;
  userEmail?: string | null;
  userPhone?: string | null;    // WhatsApp number
  notifType: 'TASK_DUE' | 'SYSTEM';
  title: string;
  body: string;
  dedupKey: string;
  contactId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
}) {
  if (await reminderAlreadySent(opts.userId, opts.dedupKey)) return;

  // 1. In-app notification
  await prisma.notification.create({
    data: {
      userId: opts.userId,
      type:   opts.notifType,
      title:  opts.title,
      body:   opts.body,
      link:   opts.dedupKey,
    },
  });

  // 2. Real Email (falls back to simulated log if SMTP not configured)
  const emailSent = isEmailConfigured() && opts.userEmail;
  if (emailSent) {
    try {
      await sendEmail({
        to:      opts.userEmail!,
        subject: `[Reminder] ${opts.title}`,
        body:    `Hi ${opts.userName},\n\n${opts.body}\n\n— NexusCRM`,
      });
    } catch (e) {
      console.error('[ReminderEngine] Email send failed:', e);
    }
  }
  await prisma.communication.create({
    data: {
      channel:        'EMAIL',
      subject:        `[Reminder] ${opts.title}`,
      body:           `Hi ${opts.userName}, ${opts.body}`,
      direction:      'outbound',
      status:         emailSent ? 'sent' : 'pending',
      sentAt:         emailSent ? new Date() : undefined,
      activityStatus: 'completed',
      metadata:       { isSystemReminder: true, dedupKey: opts.dedupKey, realSend: !!emailSent },
      userId:         opts.userId,
      contactId:      opts.contactId    ?? undefined,
      dealId:         opts.dealId       ?? undefined,
      leadId:         opts.leadId       ?? undefined,
      // opportunityId not on Communication model — tracked via dedupKey link
    },
  });

  // 3. Real WhatsApp (falls back to simulated log if not configured)
  const waProvider = whatsAppProvider();
  const waNumber   = opts.userPhone;
  const waSent     = waProvider !== 'none' && !!waNumber;
  if (waSent) {
    try {
      await sendWhatsApp(waNumber!, `*[Reminder] ${opts.title}*\n${opts.body}`);
    } catch (e) {
      console.error('[ReminderEngine] WhatsApp send failed:', e);
    }
  }
  await prisma.communication.create({
    data: {
      channel:        'WHATSAPP',
      subject:        `Reminder: ${opts.title}`,
      body:           `Hi ${opts.userName}, ${opts.body}`,
      direction:      'outbound',
      status:         waSent ? 'sent' : 'pending',
      sentAt:         waSent ? new Date() : undefined,
      activityStatus: 'completed',
      metadata:       { isSystemReminder: true, dedupKey: opts.dedupKey, realSend: waSent },
      userId:         opts.userId,
      contactId:      opts.contactId    ?? undefined,
      dealId:         opts.dealId       ?? undefined,
      leadId:         opts.leadId       ?? undefined,
      // opportunityId not on Communication model — tracked via dedupKey link
    },
  });
}

// ── Task reminders ────────────────────────────────────────────────────────────

async function checkTaskReminders(now: Date) {
  for (const daysAhead of [1, 3]) {
    const { from, to } = dateRange(daysAhead, now);

    const tasks = await prisma.task.findMany({
      where: {
        dueDate:   { gte: from, lte: to },
        status:    { in: ['TODO', 'IN_PROGRESS'] },
        deletedAt: null,
      },
      include: {
        owner:    { select: { id: true, name: true, email: true, phone: true } },
        assignee: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    for (const task of tasks) {
      const recipients = [task.owner, task.assignee]
        .filter(Boolean)
        .filter((r, i, arr) => arr.findIndex((x) => x!.id === r!.id) === i) as { id: string; name: string; email: string; phone: string | null }[];

      for (const user of recipients) {
        await sendReminder({
          userId:    user.id,
          userName:  user.name,
          userEmail: user.email,
          userPhone: user.phone,
          notifType: 'TASK_DUE',
          title:     `Task due in ${daysAhead} day${daysAhead > 1 ? 's' : ''}`,
          body:      `"${task.title}" is due on ${task.dueDate?.toDateString()}.`,
          dedupKey:  `task-reminder-${task.id}-${daysAhead}d`,
          leadId:    task.leadId,
          contactId: task.contactId,
          dealId:    task.dealId,
        });
      }
    }
  }
}

// ── Meeting reminders ─────────────────────────────────────────────────────────

async function checkMeetingReminders(now: Date) {
  for (const daysAhead of [1, 3]) {
    const { from, to } = dateRange(daysAhead, now);

    const meetings = await prisma.communication.findMany({
      where: {
        channel:        'MEETING',
        scheduledAt:    { gte: from, lte: to },
        activityStatus: { notIn: ['cancelled', 'completed', 'no_show'] },
      },
      include: {
        user:    { select: { id: true, name: true, email: true, phone: true } },
        contact: { select: { firstName: true, lastName: true } },
      },
    });

    for (const meeting of meetings) {
      const attendee = meeting.user;
      if (!attendee) continue;

      const contactName = meeting.contact
        ? `${meeting.contact.firstName} ${meeting.contact.lastName}`
        : null;

      const when = meeting.scheduledAt
        ? meeting.scheduledAt.toLocaleString('en-IN', {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })
        : 'scheduled time';

      await sendReminder({
        userId:    attendee.id,
        userName:  attendee.name,
        userEmail: attendee.email,
        userPhone: attendee.phone,
        notifType: 'SYSTEM',
        title:     `Meeting in ${daysAhead} day${daysAhead > 1 ? 's' : ''}: ${meeting.subject}`,
        body:      `You have a meeting "${meeting.subject}"${contactName ? ` with ${contactName}` : ''} at ${when}.${meeting.meetingLink ? ` Link: ${meeting.meetingLink}` : ''}`,
        dedupKey:  `meeting-reminder-${meeting.id}-${daysAhead}d`,
        contactId: meeting.contactId,
        dealId:    meeting.dealId,
        leadId:    meeting.leadId,
      });
    }
  }
}

// ── Lead follow-up reminders ──────────────────────────────────────────────────

async function checkLeadFollowUpReminders(now: Date) {
  for (const daysAhead of [1, 3]) {
    const { from, to } = dateRange(daysAhead, now);

    const leads = await (prisma as any).lead.findMany({
      where: {
        followUpDate: { gte: from, lte: to },
        status:       { notIn: ['WON', 'LOST'] },
        deletedAt:    null,
      },
      include: {
        owner:    { select: { id: true, name: true, email: true, phone: true } },
        assignee: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    for (const lead of leads) {
      const recipients = [lead.owner, lead.assignee]
        .filter(Boolean)
        .filter((r: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === r.id) === i);

      for (const user of recipients) {
        const due = new Date(lead.followUpDate).toDateString();
        await sendReminder({
          userId:    user.id,
          userName:  user.name,
          userEmail: user.email,
          userPhone: lead.whatsappNumber || user.phone,
          notifType: 'SYSTEM',
          title:     `Follow-up due in ${daysAhead} day${daysAhead > 1 ? 's' : ''}: ${lead.firstName} ${lead.lastName}`,
          body:      `Follow up with ${lead.firstName} ${lead.lastName}${lead.company ? ` (${lead.company})` : ''} on ${due}.${lead.phone ? ` Phone: ${lead.phone}` : ''}`,
          dedupKey:  `lead-followup-${lead.id}-${daysAhead}d`,
          leadId:    lead.id,
        });
      }
    }
  }
}

// ── Opportunity follow-up reminders ──────────────────────────────────────────

async function checkOpportunityFollowUpReminders(now: Date) {
  for (const daysAhead of [1, 3]) {
    const { from, to } = dateRange(daysAhead, now);

    const opps = await (prisma as any).opportunity.findMany({
      where: {
        followUpDate: { gte: from, lte: to },
        stage:        { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
        deletedAt:    null,
      },
      include: {
        owner:    { select: { id: true, name: true, email: true, phone: true } },
        assignee: { select: { id: true, name: true, email: true, phone: true } },
        contact:  { select: { phone: true } },
      },
    });

    for (const opp of opps) {
      const recipients = [opp.owner, opp.assignee]
        .filter(Boolean)
        .filter((r: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === r.id) === i);

      for (const user of recipients) {
        const due = new Date(opp.followUpDate).toDateString();
        await sendReminder({
          userId:        user.id,
          userName:      user.name,
          userEmail:     user.email,
          userPhone:     opp.contact?.phone || user.phone,
          notifType:     'SYSTEM',
          title:         `Opportunity follow-up in ${daysAhead} day${daysAhead > 1 ? 's' : ''}: ${opp.title}`,
          body:          `Follow up on opportunity "${opp.title}" (${opp.stage.replace(/_/g, ' ')}) on ${due}. Value: ${opp.currency} ${opp.value?.toLocaleString()}.`,
          dedupKey:  `opp-followup-${opp.id}-${daysAhead}d`,
          contactId: opp.contactId,
        });
      }
    }
  }
}

// ── Mark overdue meetings ─────────────────────────────────────────────────────

async function markOverdueMeetings(now: Date) {
  const cutoff = new Date(now.getTime() - 2 * 3600000);
  await prisma.communication.updateMany({
    where: {
      channel:        'MEETING',
      scheduledAt:    { lt: cutoff },
      activityStatus: 'scheduled',
    },
    data: { activityStatus: 'no_show' },
  });
}

// ── Main check loop ───────────────────────────────────────────────────────────

async function runChecks(): Promise<void> {
  const now = new Date();
  await Promise.allSettled([
    checkTaskReminders(now),
    checkMeetingReminders(now),
    checkLeadFollowUpReminders(now),
    checkOpportunityFollowUpReminders(now),
    markOverdueMeetings(now),
  ]);
}

export function startReminderEngine(intervalMinutes = 60): NodeJS.Timeout {
  console.log(`[ReminderEngine] Started — interval ${intervalMinutes}min | Tasks + Meetings + Follow-ups`);
  runChecks().catch((e) => console.error('[ReminderEngine]', e));
  return setInterval(
    () => runChecks().catch((e) => console.error('[ReminderEngine]', e)),
    intervalMinutes * 60 * 1000
  );
}
