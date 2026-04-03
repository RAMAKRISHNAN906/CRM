import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getActivities, getUpcoming, getStats,
  getActivity, createActivity, updateActivity, deleteActivity,
} from '../controllers/activities.controller';

const router = Router();
router.use(authenticate);

router.get('/upcoming', getUpcoming);
router.get('/stats', getStats);
router.get('/', getActivities);
router.post('/', createActivity);
router.get('/:id', getActivity);
router.put('/:id', updateActivity);
router.delete('/:id', deleteActivity);

export default router;
