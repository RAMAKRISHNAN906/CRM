/**
 * Reminder Engine — runs on a cron schedule (setInterval)
 * Covers:
 *   1. Task reminders   — 1d and 3d before due date
 *   2. Meeting reminders — 1d and 3d before scheduledAt
 *
 * Each reminder creates:
 *   - An in-app Notification record
 *   - A simulated Email Communication record
 *   - A simulated SMS Communication record
 *
 * Production: replace setInterval with node-cron or BullMQ,
 *             and plug in real SendGrid / Twilio clients.
 */

import { prisma } from '../config/prisma';

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

async function sendReminder(opts: {
  userId: string;
  userName: string;
  notifType: 'TASK_DUE' | 'SYSTEM';
  title: string;
  body: string;
  dedupKey: string;
  contactId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
}) {
  // Guard: skip if already sent
  if (await reminderAlreadySent(opts.userId, opts.dedupKey)) return;

  // 1. In-app notification
  await prisma.notification.create({
    data: {
      userId:  opts.userId,
      type:    opts.notifType,
      title:   opts.title,
      body:    opts.body,
      link:    opts.dedupKey,
    },
  });

  // 2. Simulated Email notification (logged as Communication)
  await prisma.communication.create({
    data: {
      channel:   'EMAIL',
      subject:   `[Reminder] ${opts.title}`,
      body:      opts.body,
      direction: 'outbound',
      status:    'sent',
      sentAt:    new Date(),
      activityStatus: 'completed',
      metadata:  { isSystemReminder: true, dedupKey: opts.dedupKey },
      userId:    opts.userId,
      contactId: opts.contactId ?? undefined,
      dealId:    opts.dealId ?? undefined,
      leadId:    opts.leadId ?? undefined,
    },
  });

  // 3. Simulated SMS notification
  await prisma.communication.create({
    data: {
      channel:   'SMS',
      subject:   `Reminder: ${opts.title}`,
      body:      `Hi ${opts.userName}, ${opts.body}`,
      direction: 'outbound',
      status:    'sent',
      sentAt:    new Date(),
      activityStatus: 'completed',
      metadata:  { isSystemReminder: true, dedupKey: opts.dedupKey },
      userId:    opts.userId,
      contactId: opts.contactId ?? undefined,
      dealId:    opts.dealId ?? undefined,
      leadId:    opts.leadId ?? undefined,
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
        owner:    { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    for (const task of tasks) {
      const recipients = [task.owner, task.assignee]
        .filter(Boolean)
        .filter((r, i, arr) => arr.findIndex((x) => x!.id === r!.id) === i) as { id: string; name: string }[];

      for (const user of recipients) {
        await sendReminder({
          userId:    user.id,
          userName:  user.name,
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
        user:    { select: { id: true, name: true } },
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

// ── Mark overdue meetings ─────────────────────────────────────────────────────

async function markOverdueMeetings(now: Date) {
  // Meetings that passed >2 hours ago and are still "scheduled" → mark no_show
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
    markOverdueMeetings(now),
  ]);
}

export function startReminderEngine(intervalMinutes = 60): NodeJS.Timeout {
  console.log(`[ReminderEngine] Started — interval ${intervalMinutes}min | Tasks + Meetings`);
  runChecks().catch((e) => console.error('[ReminderEngine]', e));
  return setInterval(
    () => runChecks().catch((e) => console.error('[ReminderEngine]', e)),
    intervalMinutes * 60 * 1000
  );
}
