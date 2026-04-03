import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getProjects, getProject, createProject, updateProject, deleteProject,
  addMember, removeMember,
  getProjectTasks, createProjectTask, updateProjectTask, deleteProjectTask,
  getProjectStats,
} from '../controllers/projects.controller';

const router = Router();
router.use(authenticate);

router.get('/stats',              getProjectStats);
router.get('/',                   getProjects);
router.post('/',                  createProject);
router.get('/:id',                getProject);
router.put('/:id',                updateProject);
router.delete('/:id',             deleteProject);

router.post('/:id/members',                    addMember);
router.delete('/:id/members/:userId',          removeMember);

router.get('/:id/tasks',                       getProjectTasks);
router.post('/:id/tasks',                      createProjectTask);
router.put('/:id/tasks/:taskId',               updateProjectTask);
router.delete('/:id/tasks/:taskId',            deleteProjectTask);

export default router;
