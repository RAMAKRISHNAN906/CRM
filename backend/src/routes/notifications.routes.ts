import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getNotifications, markAsRead, deleteNotification } from '../controllers/notifications.controller';

const router = Router();
router.use(authenticate);

router.get('/', getNotifications);
router.post('/read', markAsRead);
router.delete('/:id', deleteNotification);

export default router;
