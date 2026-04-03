import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getCompanySettings, upsertCompanySettings, getLanguages, createLanguage,
} from '../controllers/settings.controller';

const router = Router();
router.use(authenticate);

router.get('/company', getCompanySettings);
router.put('/company', upsertCompanySettings);

router.get('/languages', getLanguages);
router.post('/languages', createLanguage);

export default router;
