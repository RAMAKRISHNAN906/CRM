import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getTickets, getTicket, createTicket, updateTicket, deleteTicket, getTicketStats } from '../controllers/tickets.controller';

const router = Router();
router.use(authenticate);

router.get('/stats', getTicketStats);
router.get('/', getTickets);
router.post('/', createTicket);
router.get('/:id', getTicket);
router.put('/:id', updateTicket);
router.delete('/:id', deleteTicket);

export default router;
