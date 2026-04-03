import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getCountryTargets, createCountryTarget, updateCountryTarget, deleteCountryTarget } from '../controllers/countryTargets.controller';

const router = Router();
router.use(authenticate);

router.get('/',     getCountryTargets);
router.post('/',    createCountryTarget);
router.put('/:id',  updateCountryTarget);
router.delete('/:id', deleteCountryTarget);

export default router;
