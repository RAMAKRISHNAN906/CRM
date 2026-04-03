import nodemailer from 'nodemailer';

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_PORT === '465',
    auth: { user, pass },
  });
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
}): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) throw new Error('SMTP not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS to .env');

  const from = process.env.SMTP_FROM ?? `${opts.fromName ?? 'NexusCRM'} <${process.env.SMTP_USER}>`;

  await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    // Send as HTML if body contains tags, otherwise wrap as plain text in an HTML shell
    html: opts.body.includes('<') ? opts.body : opts.body.replace(/\n/g, '<br/>'),
    text: opts.body.replace(/<[^>]+>/g, ''),
  });
}

export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}
