import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import crypto from 'crypto';

export const getWebhooks = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const webhooks = await prisma.webhook.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { logs: true } } },
    });
    // Never expose the secret
    const safeWebhooks = webhooks.map(({ secret: _, ...w }) => w);
    sendSuccess(res, safeWebhooks, 'Webhooks retrieved');
  } catch (error) { next(error); }
};

export const createWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, url, events } = req.body;
    const secret = crypto.randomBytes(32).toString('hex');
    const webhook = await prisma.webhook.create({
      data: { name, url, secret, events: events || [] },
    });
    // Return secret only on creation
    sendSuccess(res, { ...webhook }, 'Webhook created — save the secret, it will not be shown again', 201);
  } catch (error) { next(error); }
};

export const updateWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, url, events, isActive } = req.body;
    const webhook = await prisma.webhook.update({
      where: { id: req.params.id },
      data: { name, url, events, isActive },
    });
    const { secret: _, ...safe } = webhook;
    sendSuccess(res, safe, 'Webhook updated');
  } catch (error) { next(error); }
};

export const deleteWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.webhook.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 'Webhook deleted');
  } catch (error) { next(error); }
};

export const getWebhookLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const logs = await prisma.webhookLog.findMany({
      where: { webhookId: req.params.id },
      orderBy: { sentAt: 'desc' },
      take: 50,
    });
    sendSuccess(res, logs, 'Webhook logs retrieved');
  } catch (error) { next(error); }
};

export const rotateWebhookSecret = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.webhook.findUnique({ where: { id: req.params.id } });
    if (!existing) { sendError(res, 'Webhook not found', 404); return; }
    const newSecret = crypto.randomBytes(32).toString('hex');
    const webhook = await prisma.webhook.update({
      where: { id: req.params.id },
      data: { secret: newSecret },
    });
    sendSuccess(res, { id: webhook.id, secret: newSecret }, 'Secret rotated — save the new secret');
  } catch (error) { next(error); }
};
