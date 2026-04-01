import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getSalesFunnel, getRevenueAnalytics, getLeadSourcePerformance,
  getTeamPerformance, getConversionRates, getActivityReport,
} from '../controllers/reports.controller';

const router = Router();
router.use(authenticate);

router.get('/funnel', getSalesFunnel);
router.get('/revenue', getRevenueAnalytics);
router.get('/lead-sources', getLeadSourcePerformance);
router.get('/team-performance', getTeamPerformance);
router.get('/conversion', getConversionRates);
router.get('/activity', getActivityReport);

export default router;
