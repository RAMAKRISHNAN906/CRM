import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getCompetitors, createCompetitor, updateCompetitor, deleteCompetitor,
} from '../controllers/competitors.controller';

const router = Router();
router.use(authenticate);

router.get('/', getCompetitors);
router.post('/', createCompetitor);
router.put('/:id', updateCompetitor);
router.delete('/:id', deleteCompetitor);

export default router;
