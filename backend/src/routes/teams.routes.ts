import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireManagerOrAdmin } from '../middleware/rbac.middleware';
import { getTeams, getTeam, createTeam, updateTeam, deleteTeam } from '../controllers/teams.controller';

const router = Router();
router.use(authenticate);

router.get('/', getTeams);
router.get('/:id', getTeam);
router.post('/', requireManagerOrAdmin, createTeam);
router.put('/:id', requireManagerOrAdmin, updateTeam);
router.delete('/:id', requireManagerOrAdmin, deleteTeam);

export default router;
