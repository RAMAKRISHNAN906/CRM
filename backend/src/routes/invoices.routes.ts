import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getInvoices, getInvoice, createInvoice, updateInvoiceStatus,
  recordPayment, deleteInvoice,
} from '../controllers/invoices.controller';

const router = Router();
router.use(authenticate);

router.get('/', getInvoices);
router.post('/', createInvoice);
router.get('/:id', getInvoice);
router.patch('/:id/status', updateInvoiceStatus);
router.post('/:id/payments', recordPayment);
router.delete('/:id', deleteInvoice);

export default router;
