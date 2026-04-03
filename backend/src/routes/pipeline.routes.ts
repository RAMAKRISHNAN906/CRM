import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getStages, createStage, updateStage, deleteStage, reorderStages,
  getBoard, moveDeal, getDealTimeline,
  getFunnel, getAnalytics,
  getDemoDetail, upsertDemoDetail,
} from '../controllers/pipeline.controller';

const router = Router();
router.use(authenticate);

// Stage CRUD
router.get('/stages', getStages);
router.post('/stages', createStage);
router.put('/stages/reorder', reorderStages);
router.put('/stages/:id', updateStage);
router.delete('/stages/:id', deleteStage);

// Board
router.get('/board', getBoard);

// Funnel & Analytics
router.get('/funnel', getFunnel);
router.get('/analytics', getAnalytics);

// Deal movement & timeline
router.post('/deals/:dealId/move', moveDeal);
router.get('/deals/:dealId/timeline', getDealTimeline);

// Demo details
router.get('/demo/:dealId', getDemoDetail);
router.put('/demo/:dealId', upsertDemoDetail);

export default router;
