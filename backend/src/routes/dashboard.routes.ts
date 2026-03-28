import { Router } from 'express';
import { getDashboardStats, getActivityLog } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/stats', getDashboardStats);
router.get('/activity', getActivityLog);

export default router;
