import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { exportLeads, exportDeals, exportCountryReport } from '../controllers/export.controller';

const router = Router();
router.use(authenticate);

router.get('/leads', exportLeads);
router.get('/deals', exportDeals);
router.get('/reports/country', exportCountryReport);

export default router;
