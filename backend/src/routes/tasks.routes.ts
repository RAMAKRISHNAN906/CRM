import { Router } from 'express';
import { getTasks, getTask, createTask, updateTask, deleteTask } from '../controllers/tasks.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { taskSchema } from '../utils/validation';

const router = Router();
router.use(authenticate);

router.get('/', getTasks);
router.get('/:id', getTask);
router.post('/', validate(taskSchema), createTask);
router.put('/:id', validate(taskSchema.partial()), updateTask);
router.delete('/:id', deleteTask);

export default router;
