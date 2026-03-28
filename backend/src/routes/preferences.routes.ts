import { Router } from 'express';
import { getPreferences, updatePreferences } from '../controllers/preferences.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { preferenceSchema } from '../utils/validation';

const router = Router();
router.use(authenticate);

router.get('/', getPreferences);
router.put('/', validate(preferenceSchema), updatePreferences);

export default router;
