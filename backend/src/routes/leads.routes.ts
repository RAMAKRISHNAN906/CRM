import { Router } from 'express';
import { getLeads, getLead, createLead, updateLead, deleteLead } from '../controllers/leads.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { leadSchema } from '../utils/validation';

const router = Router();
router.use(authenticate);

router.get('/', getLeads);
router.get('/:id', getLead);
router.post('/', validate(leadSchema), createLead);
router.put('/:id', validate(leadSchema.partial()), updateLead);
router.delete('/:id', deleteLead);

export default router;
