import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getFestivals, getFestivalStats, getSendLogs,
  createFestival, updateFestival, deleteFestival,
  addMessage, updateMessage, deleteMessage,
  previewGreeting, sendFestivalGreetings,
  getCustomers, addCustomer, deleteCustomer,
  sendToRecipientsNow, scheduleFestival,
} from '../controllers/festivals.controller';

const router = Router();
router.use(authenticate);

// Stats (before /:id)
router.get('/stats', getFestivalStats);

// Global customers
router.get('/customers', getCustomers);
router.post('/customers', addCustomer);
router.delete('/customers/:customerId', deleteCustomer);

// Festivals CRUD
router.get('/', getFestivals);
router.post('/', createFestival);
router.put('/:id', updateFestival);
router.delete('/:id', deleteFestival);

// Logs
router.get('/:id/logs', getSendLogs);

// Message templates
router.post('/:id/messages', addMessage);
router.put('/messages/:msgId', updateMessage);
router.delete('/messages/:msgId', deleteMessage);

// Send
router.post('/:id/preview', previewGreeting);
router.post('/:id/send', sendFestivalGreetings);
router.post('/:id/send-now', sendToRecipientsNow);
router.post('/:id/schedule', scheduleFestival);

export default router;
