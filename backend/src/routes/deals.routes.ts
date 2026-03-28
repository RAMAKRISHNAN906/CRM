import { Router } from 'express';
import { getDeals, getDeal, createDeal, updateDeal, deleteDeal, getPipeline } from '../controllers/deals.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { dealSchema } from '../utils/validation';

const router = Router();
router.use(authenticate);

router.get('/pipeline', getPipeline);
router.get('/', getDeals);
router.get('/:id', getDeal);
router.post('/', validate(dealSchema), createDeal);
router.put('/:id', validate(dealSchema.partial()), updateDeal);
router.delete('/:id', deleteDeal);

export default router;
