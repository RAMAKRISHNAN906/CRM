import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireManagerOrAdmin } from '../middleware/rbac.middleware';
import {
  getWebhooks, createWebhook, updateWebhook, deleteWebhook,
  getWebhookLogs, rotateWebhookSecret,
} from '../controllers/webhooks.controller';

const router = Router();
router.use(authenticate, requireManagerOrAdmin);

router.get('/', getWebhooks);
router.post('/', createWebhook);
router.put('/:id', updateWebhook);
router.delete('/:id', deleteWebhook);
router.get('/:id/logs', getWebhookLogs);
router.post('/:id/rotate-secret', rotateWebhookSecret);

export default router;
