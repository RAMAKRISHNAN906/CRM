import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getOpportunities, getOpportunity, createOpportunity,
  updateOpportunity, changeStage, deleteOpportunity,
  getOpportunityStats, getKanbanBoard,
} from '../controllers/opportunities.controller';

const router = Router();
router.use(authenticate);

router.get('/stats',        getOpportunityStats);
router.get('/kanban',       getKanbanBoard);
router.get('/',             getOpportunities);
router.post('/',            createOpportunity);
router.get('/:id',          getOpportunity);
router.put('/:id',          updateOpportunity);
router.patch('/:id/stage',  changeStage);
router.delete('/:id',       deleteOpportunity);

export default router;
