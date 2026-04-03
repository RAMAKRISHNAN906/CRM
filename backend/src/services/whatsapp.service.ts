/**
 * WhatsApp Sending Service
 *
 * Supports two providers (auto-detected from .env):
 *  1. Meta WhatsApp Cloud API  — set WHATSAPP_TOKEN + WHATSAPP_PHONE_ID
 *  2. Twilio WhatsApp          — set TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WHATSAPP_FROM
 *
 * Phone numbers must include country code, e.g. +919876543210
 */

import https from 'https';

function httpPost(url: string, headers: Record<string, string>, body: object): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), ...headers },
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode ?? 0, data: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode ?? 0, data: raw }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ── Meta Cloud API ────────────────────────────────────────────────────────────
async function sendViaMeta(to: string, message: string): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN!;
  const phoneId = process.env.WHATSAPP_PHONE_ID!;

  // Normalize phone: remove spaces/dashes, ensure +
  const phone = to.replace(/[\s\-]/g, '').replace(/^00/, '+');

  const res = await httpPost(
    `https://graph.facebook.com/v19.0/${phoneId}/messages`,
    { Authorization: `Bearer ${token}` },
    {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body: message },
    }
  );

  if (res.status !== 200) {
    const err = res.data?.error?.message ?? JSON.stringify(res.data);
    throw new Error(`Meta API error (${res.status}): ${err}`);
  }
}

// ── Twilio ────────────────────────────────────────────────────────────────────
function httpPostFormTwilio(url: string, auth: string, body: Record<string, string>): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const payload = Object.entries(body).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
        Authorization: `Basic ${Buffer.from(auth).toString('base64')}`,
      },
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode ?? 0, data: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode ?? 0, data: raw }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function sendViaTwilio(to: string, message: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_WHATSAPP_FROM!; // e.g. whatsapp:+14155238886

  const phone = to.replace(/[\s\-]/g, '').replace(/^00/, '+');
  const toNumber = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;

  const res = await httpPostFormTwilio(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    `${sid}:${token}`,
    { From: from, To: toNumber, Body: message }
  );

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Twilio error (${res.status}): ${res.data?.message ?? JSON.stringify(res.data)}`);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function sendWhatsApp(to: string, message: string): Promise<void> {
  if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) {
    return sendViaMeta(to, message);
  }
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM) {
    return sendViaTwilio(to, message);
  }
  throw new Error('WhatsApp not configured. Add WHATSAPP_TOKEN + WHATSAPP_PHONE_ID (Meta) or TWILIO_* (Twilio) to .env');
}

export function isWhatsAppConfigured(): boolean {
  return !!(
    (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) ||
    (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM)
  );
}

export function whatsAppProvider(): string {
  if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) return 'meta';
  if (process.env.TWILIO_ACCOUNT_SID) return 'twilio';
  return 'none';
}
