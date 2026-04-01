import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireManagerOrAdmin } from '../middleware/rbac.middleware';
import {
  getCommunications, createCommunication,
  getEmailTemplates, createEmailTemplate, updateEmailTemplate, deleteEmailTemplate,
} from '../controllers/communications.controller';

const router = Router();
router.use(authenticate);

router.get('/', getCommunications);
router.post('/', createCommunication);

// Email templates
router.get('/templates', getEmailTemplates);
router.post('/templates', requireManagerOrAdmin, createEmailTemplate);
router.put('/templates/:id', requireManagerOrAdmin, updateEmailTemplate);
router.delete('/templates/:id', requireManagerOrAdmin, deleteEmailTemplate);

export default router;
