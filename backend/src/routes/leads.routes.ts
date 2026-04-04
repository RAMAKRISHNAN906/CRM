import { Router } from 'express';
import {
  getLeads, getLead, createLead, updateLead, deleteLead,
  convertLead, convertToOpportunity, bulkAssign,
} from '../controllers/leads.controller';
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
router.post('/:id/convert', convertLead);
router.post('/:id/convert-to-opportunity', convertToOpportunity);
router.post('/bulk-assign', bulkAssign);

export default router;
