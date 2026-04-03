import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getSubTasks, createSubTask, updateSubTask, deleteSubTask } from '../controllers/subtasks.controller';

// Mounted at /tasks (merged with tasks router)
const router = Router({ mergeParams: true });
router.use(authenticate);

router.get('/:taskId/subtasks', getSubTasks);
router.post('/:taskId/subtasks', createSubTask);
router.put('/:taskId/subtasks/:id', updateSubTask);
router.delete('/:taskId/subtasks/:id', deleteSubTask);

export default router;
