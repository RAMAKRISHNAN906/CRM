import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireManagerOrAdmin } from '../middleware/rbac.middleware';
import {
  getWorkflows, getWorkflow, createWorkflow, updateWorkflow,
  toggleWorkflow, deleteWorkflow, getWorkflowLogs,
} from '../controllers/automation.controller';

const router = Router();
router.use(authenticate, requireManagerOrAdmin);

router.get('/', getWorkflows);
router.post('/', createWorkflow);
router.get('/:id', getWorkflow);
router.put('/:id', updateWorkflow);
router.patch('/:id/toggle', toggleWorkflow);
router.delete('/:id', deleteWorkflow);
router.get('/:id/logs', getWorkflowLogs);

export default router;
